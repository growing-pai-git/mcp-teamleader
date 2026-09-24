"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamleaderAuth = void 0;
exports.accountKey = accountKey;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const TOKEN_URL = "https://focus.teamleader.eu/oauth2/access_token";
const TOKEN_BUFFER_MS = 60_000; // Refresh 60s before expiry
const TOKEN_DIR = process.env.APPDATA || process.env.HOME || "";
/**
 * Stable identifier for the configured account. Derived from the client id and
 * the *configured* refresh token (the one from the environment, which does not
 * rotate — only the in-memory/cached copy does). Changing either produces a new
 * key, and therefore a fresh cache.
 */
function accountKey(clientId, refreshToken) {
    return crypto_1.default
        .createHash("sha256")
        .update(`${clientId}:${refreshToken}`)
        .digest("hex")
        .slice(0, 16);
}
class TeamleaderAuth {
    config;
    /** Stable per-account key; also stored inside the cache file as `seed`. */
    seed;
    /** Per-account cache file path. */
    tokenFile;
    constructor(config) {
        this.config = { ...config };
        this.seed = accountKey(config.clientId, config.refreshToken);
        this.tokenFile = path_1.default.join(TOKEN_DIR, `teamleader-mcp-token.${this.seed}.json`);
        console.error(`[TeamleaderAuth] account ${this.seed} — token cache: ${this.tokenFile}`);
        this.loadTokenFromDisk();
    }
    /** Get a valid access token, refreshing if necessary. */
    async getAccessToken() {
        if (this.isTokenValid()) {
            return this.config.accessToken;
        }
        await this.refreshAccessToken();
        return this.config.accessToken;
    }
    /** Get the current refresh token (may have been rotated). */
    getRefreshToken() {
        return this.config.refreshToken;
    }
    /** Path of the per-account cache file (for diagnostics). */
    getTokenFilePath() {
        return this.tokenFile;
    }
    isTokenValid() {
        if (!this.config.accessToken || !this.config.tokenExpiresAt) {
            return false;
        }
        return Date.now() < this.config.tokenExpiresAt - TOKEN_BUFFER_MS;
    }
    loadTokenFromDisk() {
        try {
            if (!fs_1.default.existsSync(this.tokenFile))
                return;
            const saved = JSON.parse(fs_1.default.readFileSync(this.tokenFile, "utf-8"));
            // Only trust a cache that belongs to THIS account. This guards against a
            // stale file (e.g. reused filename) overriding a freshly configured token.
            if (saved.seed && saved.seed !== this.seed) {
                console.error(`[TeamleaderAuth] Ignoring token cache for a different account (seed mismatch).`);
                return;
            }
            if (saved.refreshToken)
                this.config.refreshToken = saved.refreshToken;
            if (saved.accessToken)
                this.config.accessToken = saved.accessToken;
            if (saved.tokenExpiresAt)
                this.config.tokenExpiresAt = saved.tokenExpiresAt;
            console.error(`[TeamleaderAuth] Loaded cached tokens for this account.`);
        }
        catch (err) {
            console.error(`[TeamleaderAuth] Could not load tokens from disk: ${err}`);
        }
    }
    saveTokenToDisk() {
        try {
            fs_1.default.writeFileSync(this.tokenFile, JSON.stringify({
                seed: this.seed,
                refreshToken: this.config.refreshToken,
                accessToken: this.config.accessToken,
                tokenExpiresAt: this.config.tokenExpiresAt,
            }), "utf-8");
        }
        catch (err) {
            console.error(`[TeamleaderAuth] Could not save tokens to disk: ${err}`);
        }
    }
    async refreshAccessToken() {
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
            throw new Error(`Failed to refresh Teamleader token: ${response.status} ${response.statusText} - ${errorText}`);
        }
        const data = (await response.json());
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
exports.TeamleaderAuth = TeamleaderAuth;
//# sourceMappingURL=auth.js.map