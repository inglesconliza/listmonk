#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const dryRun = process.argv.includes("--dry-run");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: options.stdio ?? "inherit",
    encoding: "utf8",
    ...options
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  return result.stdout?.trim() ?? "";
}

function git(args, fallback) {
  const result = spawnSync("git", args, { encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : fallback;
}

const branch = git(["branch", "--show-current"], "unknown");
const commitHash = git(["rev-parse", "HEAD"], "unknown");
const deployedAt = new Date().toISOString();

const args = [
  "wrangler",
  "deploy",
  "--config",
  "wrangler.jsonc",
  "--var",
  `DEPLOY_BRANCH:${branch}`,
  "--var",
  `DEPLOY_COMMIT_HASH:${commitHash}`,
  "--var",
  `DEPLOYED_AT:${deployedAt}`,
  "--message",
  `${branch}@${commitHash}`
];

if (dryRun) {
  args.push("--dry-run");
}

run("npx", args);
