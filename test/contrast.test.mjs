// WCAG 2 contrast across every theme file in tokens/daisyui/. Two kinds of
// check live here:
//
// - Guarantees, which fail the suite: the pairs whose colors daicn derives
//   itself (muted-foreground on background and muted, input on
//   background). The remap script solves these to their floor, so a miss
//   means a hand edit or a script regression.
// - A report, which never fails: the wider grid of fill/foreground pairs
//   and fill-as-text uses, most of them copied unchanged from daisyUI.
//   Their misses are daisyUI's own pairings, kept for fidelity, and are
//   printed so they stay visible.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { contrastRatio } from "../scripts/contrast.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const themesDir = path.join(repoRoot, "tokens", "daisyui");

const TEXT = 4.5;
const NON_TEXT = 3;

// [foreground token, ground token, floor]
const GUARANTEES = [
  ["muted-foreground", "background", TEXT],
  ["muted-foreground", "muted", TEXT],
  ["input", "background", NON_TEXT],
];

// [column label, foreground token (or a literal color), ground token, floor]
const WHITE = "oklch(100% 0 0)";
const REPORT = [
  ["fg/bg", "foreground", "background", TEXT],
  ["mfg/bg", "muted-foreground", "background", TEXT],
  ["mfg/mut", "muted-foreground", "muted", TEXT],
  ["pfg/p", "primary-foreground", "primary", TEXT],
  ["sfg/s", "secondary-foreground", "secondary", TEXT],
  ["afg/a", "accent-foreground", "accent", TEXT],
  ["dfg/d", "destructive-foreground", "destructive", TEXT],
  ["ifg/i", "info-foreground", "info", TEXT],
  ["sufg/su", "success-foreground", "success", TEXT],
  ["wfg/w", "warning-foreground", "warning", TEXT],
  ["p-text", "primary", "background", TEXT],
  ["d-text", "destructive", "background", TEXT],
  ["white/d", WHITE, "destructive", TEXT],
  ["input", "input", "background", NON_TEXT],
  ["border", "border", "background", NON_TEXT],
  ["ring", "ring", "background", NON_TEXT],
  ["chart2-5", ["chart-2", "chart-3", "chart-4", "chart-5"], "background", NON_TEXT],
];

function loadTheme(file) {
  return JSON.parse(readFileSync(path.join(themesDir, file), "utf8"));
}

// Follows {alias} references down to a literal value.
function resolve(tokens, key, seen = []) {
  if (seen.includes(key)) throw new Error(`Alias cycle: ${[...seen, key].join(" -> ")}`);
  const value = tokens[key]?.$value;
  if (value === undefined) throw new Error(`Unknown token "${key}"`);
  const alias = value.match(/^\{(.+)\}$/);
  return alias ? resolve(tokens, alias[1], [...seen, key]) : value;
}

const themeFiles = readdirSync(themesDir).filter((f) => f.endsWith(".json")).sort();

for (const file of themeFiles) {
  const themeName = file.replace(/\.json$/, "");

  test(`${themeName}: daicn-derived colors meet their contrast floors`, () => {
    const tokens = loadTheme(file);
    for (const [foreground, ground, floor] of GUARANTEES) {
      const ratio = contrastRatio(resolve(tokens, foreground), resolve(tokens, ground));
      assert.ok(
        ratio >= floor,
        `${themeName}: ${foreground} on ${ground} is ${ratio.toFixed(2)}:1, under the ${floor}:1 floor`,
      );
    }
  });
}

test("contrast report (pairs marked ✗ are under their floor; never fails)", (t) => {
  const ratioFor = (tokens, foreground, ground) => {
    const groundValue = resolve(tokens, ground);
    const colorFor = (key) => (key.startsWith("oklch(") ? key : resolve(tokens, key));
    // A list (the chart series) reports its weakest member.
    return Math.min(...[foreground].flat().map((key) => contrastRatio(colorFor(key), groundValue)));
  };

  const underCounts = REPORT.map(() => 0);
  t.diagnostic(`${"theme".padEnd(13)}${REPORT.map(([label]) => label.padStart(9)).join("")}`);
  for (const file of themeFiles) {
    const tokens = loadTheme(file);
    const cells = REPORT.map(([, foreground, ground, floor], i) => {
      const ratio = ratioFor(tokens, foreground, ground);
      if (ratio < floor) underCounts[i]++;
      return `${ratio < floor ? "✗" : " "}${ratio.toFixed(1)}`.padStart(9);
    });
    t.diagnostic(`${file.replace(/\.json$/, "").padEnd(13)}${cells.join("")}`);
  }
  t.diagnostic(`${"under floor".padEnd(13)}${underCounts.map((n) => String(n).padStart(9)).join("")}`);
});
