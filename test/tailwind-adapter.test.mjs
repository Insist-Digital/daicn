// Guards the Tailwind adapter's radius formula specifically — this package
// exists partly because a previous project's copy of this exact formula
// had drifted to an older 4-step additive scale instead of shadcn's
// current real 7-step multiplicative one. This test fails loudly if that
// ever happens here.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const adapterPath = path.join(repoRoot, "style-dictionary", "tailwind-adapter.css");
const adapter = readFileSync(adapterPath, "utf8");

const EXPECTED_RADIUS_SCALE = {
  "--radius-sm": "calc(var(--radius) * 0.6)",
  "--radius-md": "calc(var(--radius) * 0.8)",
  "--radius-lg": "var(--radius)",
  "--radius-xl": "calc(var(--radius) * 1.4)",
  "--radius-2xl": "calc(var(--radius) * 1.8)",
  "--radius-3xl": "calc(var(--radius) * 2.2)",
  "--radius-4xl": "calc(var(--radius) * 2.6)",
};

for (const [name, value] of Object.entries(EXPECTED_RADIUS_SCALE)) {
  test(`radius scale: ${name} matches shadcn's current formula`, () => {
    const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(adapter, new RegExp(`${name}:\\s*${escaped};`));
  });
}

test("wires every base-layer color variable into Tailwind's @theme inline namespace", () => {
  for (const key of ["background", "foreground", "primary", "destructive", "border", "sidebar-ring"]) {
    assert.match(adapter, new RegExp(`--color-${key}:\\s*var\\(--${key}\\);`), `missing --color-${key} mapping`);
  }
});
