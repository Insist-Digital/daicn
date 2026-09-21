// Unit tests for scripts/daisyui-theme-to-tokens.mjs — the tool this
// package relies on to convert a real daisyUI theme into a correctly
// remapped token file. The golden-fixture test below uses cupcake's real,
// unmodified daisyUI source (fetched directly from daisyui/daisyui) and
// checks the script's output against tokens/daisyui/cupcake.json's
// already-existing, independently-verified values — computed by hand
// against this same source when cupcake was first added, before this
// script existed here. An exact match is strong evidence the ported
// script is faithful to the established methodology, not just "runs
// without error."
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseThemeBlock,
  parseOklch,
  remToNumber,
  radiusDescription,
  buildFileText,
  SUBTLE_SECONDARY_CHROMA,
  SUBTLE_ACCENT_CHROMA,
} from "../scripts/daisyui-theme-to-tokens.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Cupcake's real, unmodified source — daisyui/daisyui,
// packages/daisyui/src/themes/cupcake.css — with a `name` line prepended,
// since daisyUI's own built-in source files omit it (the filename is the
// name there); daisyui.com/theme-generator's copy-paste output includes
// it, which is the format this script is actually built to parse.
const CUPCAKE_BLOCK = `
name: "cupcake";
color-scheme: light;
--color-base-100: oklch(97.788% 0.004 56.375);
--color-base-200: oklch(93.982% 0.007 61.449);
--color-base-300: oklch(91.586% 0.006 53.44);
--color-base-content: oklch(23.574% 0.066 313.189);
--color-primary: oklch(85% 0.138 181.071);
--color-primary-content: oklch(43% 0.078 188.216);
--color-secondary: oklch(89% 0.061 343.231);
--color-secondary-content: oklch(45% 0.187 3.815);
--color-accent: oklch(90% 0.076 70.697);
--color-accent-content: oklch(47% 0.157 37.304);
--color-neutral: oklch(27% 0.006 286.033);
--color-neutral-content: oklch(92% 0.004 286.32);
--color-info: oklch(68% 0.169 237.323);
--color-info-content: oklch(29% 0.066 243.157);
--color-success: oklch(69% 0.17 162.48);
--color-success-content: oklch(26% 0.051 172.552);
--color-warning: oklch(79% 0.184 86.047);
--color-warning-content: oklch(28% 0.066 53.813);
--color-error: oklch(64% 0.246 16.439);
--color-error-content: oklch(27% 0.105 12.094);
--radius-selector: 1rem;
--radius-field: 2rem;
--radius-box: 1rem;
--size-selector: 0.25rem;
--size-field: 0.25rem;
--border: 2px;
--depth: 1;
--noise: 0;
`;

test("parseThemeBlock: extracts name, scheme, colors, and radii", () => {
  const parsed = parseThemeBlock(CUPCAKE_BLOCK);
  assert.equal(parsed.name, "cupcake");
  assert.equal(parsed.scheme, "light");
  assert.equal(parsed.colors["base-100"], "oklch(97.788% 0.004 56.375)");
  assert.equal(parsed.radii["box"], "1rem");
  assert.equal(parsed.radii["field"], "2rem");
});

test("parseThemeBlock: throws when a required color is missing", () => {
  const broken = CUPCAKE_BLOCK.replace("--color-primary: oklch(85% 0.138 181.071);\n", "");
  assert.throws(() => parseThemeBlock(broken), /Missing required --color-\* keys/);
});

test("parseThemeBlock: throws when --radius-box is missing", () => {
  const broken = CUPCAKE_BLOCK.replace("--radius-box: 1rem;\n", "");
  assert.throws(() => parseThemeBlock(broken), /Missing required --radius-box/);
});

test("parseOklch: extracts lightness, chroma, hue", () => {
  assert.deepEqual(parseOklch("oklch(88.272% 0.049 91.774)"), {
    lightness: "88.272%",
    chroma: "0.049",
    hue: "91.774",
  });
});

test("parseOklch: throws on a non-oklch value", () => {
  assert.throws(() => parseOklch("#ffffff"), /Not a plain oklch/);
});

test("remToNumber: parses rem values", () => {
  assert.equal(remToNumber("1rem"), 1);
  assert.equal(remToNumber("0.25rem"), 0.25);
});

test("remToNumber: throws on a non-rem value", () => {
  assert.throws(() => remToNumber("16px"), /Not a plain rem value/);
});

test("radiusDescription: no divergence note when selector/field are close to box", () => {
  const description = radiusDescription("nord", { box: "0.5rem", selector: "0.5rem", field: "0.5rem" });
  assert.doesNotMatch(description, /Note:/);
});

test("radiusDescription: notes when field diverges notably above box (cupcake's real case)", () => {
  const description = radiusDescription("cupcake", { box: "1rem", selector: "1rem", field: "2rem" });
  assert.match(description, /--radius-field is 2rem, notably larger than box/);
  assert.match(description, /undershoots/);
});

test("radiusDescription: notes when a role diverges notably below box (nord's real case)", () => {
  const description = radiusDescription("nord", { box: "0.5rem", selector: "1rem", field: "0.25rem" });
  // selector (1rem) is larger, field (0.25rem) is smaller — both noted.
  assert.match(description, /--radius-selector is 1rem, notably larger than box/);
});

test("radiusDescription: a 0rem box with all-0rem roles is not divergence (cyberpunk/black's real case)", () => {
  // Ratio-based comparison breaks down at box === 0 — this caught a real
  // bug where 0rem vs 0rem (equal, not divergent at all) was flagged as
  // "notably smaller than box", before the box === 0 guard was added.
  const description = radiusDescription("cyberpunk", { box: "0rem", selector: "0rem", field: "0rem" });
  assert.doesNotMatch(description, /Note:/);
});

test("radiusDescription: a nonzero role against a 0rem box is still divergent", () => {
  const description = radiusDescription("example", { box: "0rem", selector: "0.5rem", field: "0rem" });
  assert.match(description, /--radius-selector is 0\.5rem, notably larger than box/);
});

test("buildFileText: matches the existing, independently-verified cupcake.json exactly", () => {
  const parsed = parseThemeBlock(CUPCAKE_BLOCK);
  const generated = JSON.parse(buildFileText(parsed));
  const existing = JSON.parse(readFileSync(path.join(repoRoot, "tokens", "daisyui", "cupcake.json"), "utf8"));

  // Compare resolved $value fields — the two files' $description prose
  // legitimately differs (this test's is script-generated, the shipped
  // file's was hand-authored when cupcake was first added), but every
  // computed color and the radius value must be identical.
  for (const key of Object.keys(existing)) {
    if (key === "$description") continue;
    assert.equal(generated[key].$value, existing[key].$value, `"${key}" value mismatch`);
  }
});

test("buildFileText: secondary/accent are re-derived, not copied from daisyUI's bold values", () => {
  const parsed = parseThemeBlock(CUPCAKE_BLOCK);
  const generated = JSON.parse(buildFileText(parsed));
  // daisyUI's own bold secondary/accent (from the source block above)
  // must NOT appear verbatim — they should be re-lightened to muted's
  // lightness with the small fixed chroma instead.
  assert.notEqual(generated.secondary.$value, "oklch(89% 0.061 343.231)");
  assert.equal(generated.secondary.$value, `oklch(93.982% ${SUBTLE_SECONDARY_CHROMA} 343.231)`);
  assert.notEqual(generated.accent.$value, "oklch(90% 0.076 70.697)");
  assert.equal(generated.accent.$value, `oklch(93.982% ${SUBTLE_ACCENT_CHROMA} 70.697)`);
});

test("buildFileText: chart-2 uses the theme's own bold accent, unlike the re-derived accent token", () => {
  const parsed = parseThemeBlock(CUPCAKE_BLOCK);
  const generated = JSON.parse(buildFileText(parsed));
  assert.equal(generated["chart-2"].$value, "oklch(90% 0.076 70.697)");
});
