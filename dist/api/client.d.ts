/**
 * HTTP Client for Teamleader Focus API
 *
 * All Teamleader API endpoints use POST with JSON body.
 * Base URL: https://api.focus.teamleader.eu
 */
import { TeamleaderAuth } from "./auth.js";
export interface ApiRequestOptions {
    /** Endpoint path, e.g. "contacts.list" */
    endpoint: string;
    /** JSON body to send */
    body?: Record<string, unknown>;
}
export declare class TeamleaderClient {
    private auth;
    constructor(auth: TeamleaderAuth);
    /**
     * Make an authenticated POST request to the Teamleader Focus API.
     */
    request<T = unknown>(options: ApiRequestOptions): Promise<T>;
}
//# sourceMappingURL=client.d.ts.map