#!/usr/bin/env node
// Runs `style-dictionary build --config <file>` for every style-dictionary/
// config.*.json file (adding a new theme never requires editing this script
// or package.json by hand), then copies the static Tailwind adapter
// template into dist/css/tailwind/theme.css. Runs automatically on install
// via package.json's "prepare" script — dist/ is never committed, so this
// is the only place generated CSS ever comes from.

import { execFileSync } from "node:child_process";
import { readdirSync, mkdirSync, copyFileSync } from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const configDir = path.join(repoRoot, "style-dictionary");
const styleDictionaryBin = path.join(repoRoot, "node_modules", ".bin", "style-dictionary");

const configs = readdirSync(configDir)
  .filter((f) => /^config\..+\.json$/.test(f))
  .sort()
  .map((f) => path.join("style-dictionary", f));

if (configs.length === 0) {
  console.error("No style-dictionary/config.*.json files found.");
  process.exit(1);
}

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
