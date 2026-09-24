#!/usr/bin/env node
/**
 * Builds growing-pai-teamleader.mcpb (Claude Desktop extension bundle).
 *
 * Stages the bundle layout in build/mcpb/:
 *   manifest.json            ← mcpb/manifest.json
 *   server/package.json      ← package.json
 *   server/dist/**.js        ← dist/ (compiled JS only, no maps/typings)
 *   server/node_modules/     ← production dependencies only
 * then packs it with the official mcpb CLI, which writes zip entries with
 * forward slashes on every platform.
 *
 * Usage (from the project root, after `npm ci`):
 *   npm run build
 *   node scripts/build-mcpb.mjs
 */

import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const stage = join(root, "build", "mcpb");
const server = join(stage, "server");
const output = join(root, "growing-pai-teamleader.mcpb");

if (!existsSync(join(root, "dist", "index.js"))) {
  console.error("dist/index.js not found — run  npm run build  first.");
  process.exit(1);
}

rmSync(stage, { recursive: true, force: true });
mkdirSync(server, { recursive: true });

cpSync(join(root, "mcpb", "manifest.json"), join(stage, "manifest.json"));
cpSync(join(root, "package.json"), join(server, "package.json"));
cpSync(join(root, "package-lock.json"), join(server, "package-lock.json"));
cpSync(join(root, "dist"), join(server, "dist"), {
  recursive: true,
  filter: (src) => !src.endsWith(".map") && !src.endsWith(".d.ts"),
});

const run = (cmd, cwd) => execSync(cmd, { cwd, stdio: "inherit" });

// --ignore-scripts: skip "prepare" (tsc), dist/ is already built.
run("npm ci --omit=dev --ignore-scripts --no-audit --no-fund", server);
rmSync(join(server, "package-lock.json"));

run(`npx -y @anthropic-ai/mcpb pack "${stage}" "${output}"`, root);

console.log(`\nBundle written to ${output}`);
