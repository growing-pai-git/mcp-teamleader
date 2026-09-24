"use strict";
/**
 * HTTP Client for Teamleader Focus API
 *
 * All Teamleader API endpoints use POST with JSON body.
 * Base URL: https://api.focus.teamleader.eu
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamleaderClient = void 0;
const BASE_URL = "https://api.focus.teamleader.eu";
class TeamleaderClient {
    auth;
    constructor(auth) {
        this.auth = auth;
    }
    /**
     * Make an authenticated POST request to the Teamleader Focus API.
     */
    async request(options) {
        const accessToken = await this.auth.getAccessToken();
        const url = `${BASE_URL}/${options.endpoint}`;
        const response = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: options.body ? JSON.stringify(options.body) : undefined,
        });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Teamleader API error [${options.endpoint}]: ${response.status} ${response.statusText} - ${errorBody}`);
        }
        // Some endpoints return 204 No Content
        if (response.status === 204) {
            return {};
        }
        return (await response.json());
    }
}
exports.TeamleaderClient = TeamleaderClient;
//# sourceMappingURL=client.js.map