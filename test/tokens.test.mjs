// Static validation of tokens/**/*.json — no build required. Catches a
// malformed or incomplete theme file before it ever reaches Style
// Dictionary.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const themesDir = path.join(repoRoot, "tokens", "daisyui");

const REQUIRED_COLOR_KEYS = [
  "background", "foreground", "card", "card-foreground", "popover", "popover-foreground",
  "primary", "primary-foreground", "secondary", "secondary-foreground",
  "muted", "muted-foreground", "accent", "accent-foreground",
  "destructive", "destructive-foreground",
  "info", "info-foreground", "success", "success-foreground", "warning", "warning-foreground",
  "border", "input", "ring",
  "chart-1", "chart-2", "chart-3", "chart-4", "chart-5",
  "sidebar", "sidebar-foreground", "sidebar-primary", "sidebar-primary-foreground",
  "sidebar-accent", "sidebar-accent-foreground", "sidebar-border", "sidebar-ring",
];

const themeFiles = readdirSync(themesDir).filter((f) => f.endsWith(".json"));

test("at least one theme file exists", () => {
  assert.ok(themeFiles.length > 0, "tokens/daisyui/ has no theme files");
});

for (const file of themeFiles) {
  const themeName = file.replace(/\.json$/, "");

  test(`${themeName}: valid JSON`, () => {
    assert.doesNotThrow(() => JSON.parse(readFileSync(path.join(themesDir, file), "utf8")));
  });

  test(`${themeName}: has every required color token`, () => {
    const data = JSON.parse(readFileSync(path.join(themesDir, file), "utf8"));
    for (const key of REQUIRED_COLOR_KEYS) {
      assert.ok(key in data, `missing "${key}"`);
      assert.equal(data[key].$type, "color", `"${key}" should be $type "color"`);
      assert.ok(typeof data[key].$value === "string" && data[key].$value.length > 0, `"${key}" has no $value`);
    }
  });

  test(`${themeName}: has its own radius token`, () => {
    const data = JSON.parse(readFileSync(path.join(themesDir, file), "utf8"));
    assert.ok("radius" in data, "missing \"radius\" — every theme must carry its own value, not share a global one");
    assert.equal(data.radius.$type, "dimension");
    assert.match(data.radius.$value, /^\d+(\.\d+)?rem$/, `radius value "${data.radius.$value}" doesn't look like a rem dimension`);
  });
}
