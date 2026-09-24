/**
 * OAuth2 Authentication for Teamleader Focus API
 *
 * Handles token refresh and rotation. Teamleader rotates refresh tokens on every
 * refresh, so the rotated token is cached on disk to survive restarts.
 *
 * The cache is keyed PER ACCOUNT (a hash of client_id + the configured refresh
 * token). This means:
 *   - Changing the configured user/token (e.g. in claude_desktop_config) uses a
 *     different cache file, so the server authenticates as the NEW user after a
 *     restart instead of reusing a previously cached identity.
 *   - Multiple integrations on the same machine no longer clobber each other's
 *     cache.
 *
 * Token endpoint: https://focus.teamleader.eu/oauth2/access_token
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import type { TeamleaderAuthConfig, TokenResponse } from "../types/index.js";

const TOKEN_URL = "https://focus.teamleader.eu/oauth2/access_token";
const TOKEN_BUFFER_MS = 60_000; // Refresh 60s before expiry
const HOME_DIR = process.env.APPDATA || process.env.HOME || "";

/**
 * Directory holding the token caches. Kept out of the bare home directory and
 * created private (0700) since the files inside contain a live refresh token.
 * (Mode bits are ignored on Windows, where APPDATA is already per-user.)
 */
const TOKEN_DIR = process.env.APPDATA
  ? path.join(process.env.APPDATA, "teamleader-mcp")
  : path.join(
      process.env.XDG_CONFIG_HOME || path.join(HOME_DIR, ".config"),
      "teamleader-mcp"
    );

/**
 * Stable identifier for the configured account. Derived from the client id and
 * the *configured* refresh token (the one from the environment, which does not
 * rotate — only the in-memory/cached copy does). Changing either produces a new
 * key, and therefore a fresh cache.
 */
export function accountKey(clientId: string, refreshToken: string): string {
  return crypto
    .createHash("sha256")
    .update(`${clientId}:${refreshToken}`)
    .digest("hex")
    .slice(0, 16);
}

export class TeamleaderAuth {
  private config: TeamleaderAuthConfig;
  /** Stable per-account key; also stored inside the cache file as `seed`. */
  private readonly seed: string;
  /** Per-account cache file path. */
  private readonly tokenFile: string;
  /** Legacy cache location (bare home dir, default permissions). */
  private readonly legacyTokenFile: string;

  constructor(config: TeamleaderAuthConfig) {
    this.config = { ...config };
    this.seed = accountKey(config.clientId, config.refreshToken);
    const fileName = `teamleader-mcp-token.${this.seed}.json`;
    this.tokenFile = path.join(TOKEN_DIR, fileName);
    this.legacyTokenFile = path.join(HOME_DIR, fileName);
    console.error(
      `[TeamleaderAuth] account ${this.seed} — token cache: ${this.tokenFile}`
    );
    this.loadTokenFromDisk();
  }

  /** Get a valid access token, refreshing if necessary. */
  async getAccessToken(): Promise<string> {
    if (this.isTokenValid()) {
      return this.config.accessToken!;
    }
    await this.refreshAccessToken();
    return this.config.accessToken!;
  }

  /** Get the current refresh token (may have been rotated). */
  getRefreshToken(): string {
    return this.config.refreshToken;
  }

  /** Path of the per-account cache file (for diagnostics). */
  getTokenFilePath(): string {
    return this.tokenFile;
  }

  private isTokenValid(): boolean {
    if (!this.config.accessToken || !this.config.tokenExpiresAt) {
      return false;
    }
    return Date.now() < this.config.tokenExpiresAt - TOKEN_BUFFER_MS;
  }

  private loadTokenFromDisk(): void {
    try {
      // Teamleader rotates refresh tokens, so the cached copy may be the only
      // valid one. Fall back to the legacy location and migrate it.
      const migrating =
        !fs.existsSync(this.tokenFile) && fs.existsSync(this.legacyTokenFile);
      const source = migrating ? this.legacyTokenFile : this.tokenFile;
      if (!fs.existsSync(source)) return;
      const saved = JSON.parse(fs.readFileSync(source, "utf-8"));

      // Only trust a cache that belongs to THIS account. This guards against a
      // stale file (e.g. reused filename) overriding a freshly configured token.
      if (saved.seed && saved.seed !== this.seed) {
        console.error(
          `[TeamleaderAuth] Ignoring token cache for a different account (seed mismatch).`
        );
        return;
      }

      if (saved.refreshToken) this.config.refreshToken = saved.refreshToken;
      if (saved.accessToken) this.config.accessToken = saved.accessToken;
      if (saved.tokenExpiresAt) this.config.tokenExpiresAt = saved.tokenExpiresAt;
      console.error(`[TeamleaderAuth] Loaded cached tokens for this account.`);

      if (migrating) {
        this.saveTokenToDisk();
        if (fs.existsSync(this.tokenFile)) fs.rmSync(this.legacyTokenFile, { force: true });
      }
    } catch (err) {
      console.error(`[TeamleaderAuth] Could not load tokens from disk: ${err}`);
    }
  }

  private saveTokenToDisk(): void {
    try {
      fs.mkdirSync(TOKEN_DIR, { recursive: true, mode: 0o700 });
      fs.writeFileSync(
        this.tokenFile,
        JSON.stringify({
          seed: this.seed,
          refreshToken: this.config.refreshToken,
          accessToken: this.config.accessToken,
          tokenExpiresAt: this.config.tokenExpiresAt,
        }),
        { encoding: "utf-8", mode: 0o600 }
      );
      // `mode` only applies when the file is created; tighten an existing one.
      fs.chmodSync(this.tokenFile, 0o600);
    } catch (err) {
      console.error(`[TeamleaderAuth] Could not save tokens to disk: ${err}`);
    }
  }

  private async refreshAccessToken(): Promise<void> {
    const body = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: this.config.refreshToken,
      grant_type: "refresh_token",
    });

    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to refresh Teamleader token: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data = (await response.json()) as TokenResponse;

    this.config.accessToken = data.access_token;
    this.config.tokenExpiresAt = Date.now() + data.expires_in * 1000;

    // Teamleader rotates refresh tokens — always keep the newest one.
    if (data.refresh_token) {
      this.config.refreshToken = data.refresh_token;
    }

    // Persist so restarts (for this same account) don't lose the rotated token.
    this.saveTokenToDisk();
  }
}
