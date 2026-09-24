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
import type { TeamleaderAuthConfig } from "../types/index.js";
/**
 * Stable identifier for the configured account. Derived from the client id and
 * the *configured* refresh token (the one from the environment, which does not
 * rotate — only the in-memory/cached copy does). Changing either produces a new
 * key, and therefore a fresh cache.
 */
export declare function accountKey(clientId: string, refreshToken: string): string;
export declare class TeamleaderAuth {
    private config;
    /** Stable per-account key; also stored inside the cache file as `seed`. */
    private readonly seed;
    /** Per-account cache file path. */
    private readonly tokenFile;
    /** Legacy cache location (bare home dir, default permissions). */
    private readonly legacyTokenFile;
    constructor(config: TeamleaderAuthConfig);
    /** Get a valid access token, refreshing if necessary. */
    getAccessToken(): Promise<string>;
    /** Get the current refresh token (may have been rotated). */
    getRefreshToken(): string;
    /** Path of the per-account cache file (for diagnostics). */
    getTokenFilePath(): string;
    private isTokenValid;
    private loadTokenFromDisk;
    private saveTokenToDisk;
    private refreshAccessToken;
}
//# sourceMappingURL=auth.d.ts.map