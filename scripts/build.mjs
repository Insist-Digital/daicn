#!/usr/bin/env node
// Runs `style-dictionary build --config <file>` for every style-dictionary/
// config.*.json file (adding a new theme never requires editing this script
// or package.json by hand), then copies the static Tailwind adapter
// template into dist/css/tailwind/theme.css. Runs automatically on install
// via package.json's "prepare" script — dist/ is never committed, so this
// is the only place generated CSS ever comes from.

import { execFileSync } from "node:child_process";
import { readdirSync, mkdirSync, copyFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// fileURLToPath instead of import.meta.dirname: this package's own engines
// aren't pinned, and import.meta.dirname needs Node 20.11+/21.2+ — this
// works back to Node 12.20+, so an older consumer's install gets a real
// build instead of an opaque runtime error.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const configDir = path.join(repoRoot, "style-dictionary");
const styleDictionaryBin = path.join(
  repoRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "style-dictionary.cmd" : "style-dictionary"
);

const configs = readdirSync(configDir)
  .filter((f) => /^config\..+\.json$/.test(f))
  .sort()
  .map((f) => path.join("style-dictionary", f));

if (configs.length === 0) {
  console.error("No style-dictionary/config.*.json files found.");
  process.exit(1);
}

// Clean before rebuilding: if a theme config is ever removed or renamed,
// its stale dist/css/tokens/<theme>.css shouldn't linger from a previous
// local build (a fresh git-dependency install never has this problem,
// since dist/ never exists until this script creates it — but `npm run
// build` run repeatedly during local development does).
rmSync(path.join(repoRoot, "dist"), { recursive: true, force: true });

for (const config of configs) {
  console.log(`\n> style-dictionary build --config ${config}`);
  execFileSync(styleDictionaryBin, ["build", "--config", config], {
    stdio: "inherit",
    cwd: repoRoot,
  });
}

const tailwindDistDir = path.join(repoRoot, "dist", "css", "tailwind");
mkdirSync(tailwindDistDir, { recursive: true });
copyFileSync(
  path.join(repoRoot, "style-dictionary", "tailwind-adapter.css"),
  path.join(tailwindDistDir, "theme.css")
);
console.log("\n> copied style-dictionary/tailwind-adapter.css -> dist/css/tailwind/theme.css");
