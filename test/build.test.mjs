// Runs the real build (scripts/build.mjs) once, then validates the actual
// dist/ output. This is the test that would have caught the bug a review
// found in an earlier version of this package: a theme's Style Dictionary
// config not sourcing radius, so its generated CSS silently had no
// --radius, breaking every Tailwind radius utility (calc(var(--radius) *
// N) is invalid with no --radius defined, so Tailwind drops the
// declaration and the radius utility falls back to nothing).
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distTokensDir = path.join(repoRoot, "dist", "css", "tokens");
const distTailwindDir = path.join(repoRoot, "dist", "css", "tailwind");
const themesDir = path.join(repoRoot, "tokens", "daisyui");

before(() => {
  execFileSync("node", ["scripts/build.mjs"], { cwd: repoRoot, stdio: "ignore" });
});

const themeNames = readdirSync(themesDir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(/\.json$/, ""));

test("build produces one CSS file per theme, plus the Tailwind adapter", () => {
  const generated = readdirSync(distTokensDir).filter((f) => f.endsWith(".css"));
  assert.equal(generated.length, themeNames.length, "dist/css/tokens/ file count doesn't match theme count");
  assert.ok(existsSync(path.join(distTailwindDir, "theme.css")), "dist/css/tailwind/theme.css is missing");
});

for (const theme of themeNames) {
  test(`${theme}.css: defines --radius`, () => {
    const css = readFileSync(path.join(distTokensDir, `${theme}.css`), "utf8");
    assert.match(css, /--radius:\s*[\d.]+rem;/, `${theme}.css has no --radius declaration — every theme must carry its own`);
  });

  test(`${theme}.css: defines every required color variable`, () => {
    const css = readFileSync(path.join(distTokensDir, `${theme}.css`), "utf8");
    for (const key of ["--background", "--foreground", "--primary", "--destructive", "--border"]) {
      assert.match(css, new RegExp(`${key}:\\s*oklch\\(`), `${theme}.css has no ${key} value`);
    }
  });
}

test("light.css uses :root as its selector", () => {
  const css = readFileSync(path.join(distTokensDir, "light.css"), "utf8");
  assert.match(css, /^:root\s*\{/m);
});

test("dark.css uses .dark as its selector (shadcn's own convention, not [data-theme])", () => {
  const css = readFileSync(path.join(distTokensDir, "dark.css"), "utf8");
  assert.match(css, /^\.dark\s*\{/m);
});

test("demo themes use [data-theme=\"name\"] as their selector", () => {
  const css = readFileSync(path.join(distTokensDir, "nord.css"), "utf8");
  assert.match(css, /^\[data-theme="nord"\]\s*\{/m);
});
