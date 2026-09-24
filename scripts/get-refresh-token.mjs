#!/usr/bin/env node
/**
 * Teamleader OAuth2 refresh-token helper.
 *
 * Runs the OAuth2 authorization-code flow on localhost and prints a refresh
 * token. Whichever Teamleader user is logged in in the browser when you approve
 * is the user the token will authenticate as.
 *
 * ── To mint a refresh token ────────────────────────────────────────────────
 *   1. In a browser, log in to Teamleader as the account you want this MCP
 *      server to act as (use a private/incognito window if that's not your
 *      own login).
 *   2. Make sure this integration has a redirect URI registered that matches
 *      the one printed below (default http://localhost:8123/oauth/callback).
 *      You add/edit redirect URIs in the Teamleader Marketplace → your
 *      integration → settings.
 *   3. Run:
 *        TEAMLEADER_CLIENT_ID=... TEAMLEADER_CLIENT_SECRET=... \
 *          node scripts/get-refresh-token.mjs
 *   4. Open the printed URL in that same browser, approve, and copy the
 *      TEAMLEADER_REFRESH_TOKEN it prints into your config.
 *
 * Env:
 *   TEAMLEADER_CLIENT_ID       (required)
 *   TEAMLEADER_CLIENT_SECRET   (required)
 *   TEAMLEADER_REDIRECT_URI    (optional; default http://localhost:<PORT>/oauth/callback)
 *   PORT                       (optional; default 8123)
 *   TEAMLEADER_OAUTH_BASE      (optional; default https://focus.teamleader.eu — override for testing)
 *   TEAMLEADER_OAUTH_STATE     (optional; fixed state, for automated testing only)
 */

import http from "node:http";
import crypto from "node:crypto";

const OAUTH_BASE =
  process.env.TEAMLEADER_OAUTH_BASE || "https://focus.teamleader.eu";
const PORT = Number(process.env.PORT || 8123);
const REDIRECT_URI =
  process.env.TEAMLEADER_REDIRECT_URI ||
  `http://localhost:${PORT}/oauth/callback`;

const CLIENT_ID = process.env.TEAMLEADER_CLIENT_ID;
const CLIENT_SECRET = process.env.TEAMLEADER_CLIENT_SECRET;

/** Exchange an authorization code for tokens. Exported for testing. */
export async function exchangeCodeForTokens({
  base = OAUTH_BASE,
  clientId,
  clientSecret,
  code,
  redirectUri,
}) {
  const res = await fetch(`${base}/oauth2/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }).toString(),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Token exchange failed: ${res.status} ${res.statusText} — ${text}`);
  }
  return JSON.parse(text);
}

export function buildAuthorizeUrl({ base = OAUTH_BASE, clientId, redirectUri, state }) {
  const u = new URL(`${base}/oauth2/authorize`);
  u.searchParams.set("client_id", clientId);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("state", state);
  return u.toString();
}

async function main() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error(
      "ERROR: set TEAMLEADER_CLIENT_ID and TEAMLEADER_CLIENT_SECRET in the environment."
    );
    process.exit(1);
  }

  const state = process.env.TEAMLEADER_OAUTH_STATE || crypto.randomBytes(16).toString("hex");
  const authorizeUrl = buildAuthorizeUrl({
    clientId: CLIENT_ID,
    redirectUri: REDIRECT_URI,
    state,
  });

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    if (url.pathname !== "/oauth/callback") {
      res.writeHead(404).end("Not found");
      return;
    }
    const returnedState = url.searchParams.get("state");
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");

    if (error) {
      res.writeHead(400).end(`Authorization error: ${error}`);
      console.error(`\n✗ Authorization denied: ${error}`);
      server.close(() => process.exit(1));
      return;
    }
    if (returnedState !== state) {
      res.writeHead(400).end("State mismatch — aborting.");
      console.error("\n✗ State mismatch (possible CSRF); aborting.");
      server.close(() => process.exit(1));
      return;
    }
    try {
      const tokens = await exchangeCodeForTokens({
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        code,
        redirectUri: REDIRECT_URI,
      });
      res
        .writeHead(200, { "Content-Type": "text/html" })
        .end("<h2>Done. You can close this tab and return to the terminal.</h2>");
      console.log("\n✓ Success. Copy this into your MCP config:\n");
      console.log(`TEAMLEADER_REFRESH_TOKEN=${tokens.refresh_token}\n`);
      console.log("(access token expires; the refresh token is what you store.)");
      server.close(() => process.exit(0));
    } catch (e) {
      res.writeHead(500).end(String(e));
      console.error(`\n✗ ${e instanceof Error ? e.message : e}`);
      server.close(() => process.exit(1));
    }
  });

  server.listen(PORT, () => {
    console.log(`\nListening on ${REDIRECT_URI}`);
    console.log(
      `\nMake sure this redirect URI is registered on your Teamleader integration.`
    );
    console.log(`\n1) Log in to Teamleader as the desired user in your browser.`);
    console.log(`2) Open this URL in that browser and approve:\n`);
    console.log(authorizeUrl + "\n");
  });
}

// Only run the interactive flow when executed directly (not when imported for tests).
import { fileURLToPath } from "node:url";
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
