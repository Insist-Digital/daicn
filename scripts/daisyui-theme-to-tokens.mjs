#!/usr/bin/env node
// Usage: node scripts/daisyui-theme-to-tokens.mjs <path-to-theme-block.txt> [outputDir]
//    or: cat theme.txt | node scripts/daisyui-theme-to-tokens.mjs
//
// Parses one daisyUI `@plugin "daisyui/theme" { ... }` block — the exact
// format daisyui.com/theme-generator and daisyUI's own built-in theme
// source files use — and emits a tokens/daisyui/<name>.json file following
// this package's established remap rules: values only, never the daisyUI
// plugin mechanism itself.
//
//   base-100/200/300      -> background/muted/border   (direct copy)
//   base-content           -> foreground                 (direct copy)
//   primary/primary-content -> primary/primary-foreground (direct copy)
//   secondary/accent       -> re-derived to shadcn's subtle tonal role:
//                             hue from the source, lightness pinned to
//                             muted's own lightness, a small fixed chroma
//                             — not daisyUI's bold fill
//   info/success/warning/error (+content) -> direct copy, including
//                             whatever foreground pairing the theme itself
//                             chose (do not assume white/black)
//   card/popover/sidebar    -> alias {background}; input -> alias {border};
//                             ring/chart-1/sidebar-primary -> alias {primary}
//   chart-2                 -> the theme's own bold accent value (direct),
//                             not the re-derived subtle {accent} above
//   radius                  -> the theme's own --radius-box value (a
//                             deliberate single-anchor compromise — this
//                             package keeps shadcn's one-scale radius
//                             model rather than daisyUI's three independent
//                             roles; see design.md for the full reasoning).
//                             If --radius-selector or --radius-field
//                             diverge notably from --radius-box (more than
//                             1.5x in either direction), that's noted in
//                             the generated $description so the compromise
//                             stays visible per-theme, not just in a doc.
//   neutral/neutral-content, size/border-width/depth/noise -> skipped,
//                             no shadcn token slot for these (colors only)
//
// This script only authors the token JSON source file — it does not decide
// which themes to add, and does not touch any build config or app code.
// Those remain deliberate, reviewed steps.
//
// Output formatting deliberately matches this package's existing
// hand-authored token files (one compact line per token, blank lines
// between groups) rather than a generic JSON.stringify — these files are
// meant to be read and reviewed by people, not just machines.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

export const SUBTLE_SECONDARY_CHROMA = 0.03;
export const SUBTLE_ACCENT_CHROMA = 0.02;
export const MUTED_FOREGROUND_LIGHT_LIGHTNESS = "55%";
export const MUTED_FOREGROUND_DARK_LIGHTNESS = "65%";
const RADIUS_DIVERGENCE_THRESHOLD = 1.5;

function readInput() {
  const filePath = process.argv[2];
  if (filePath) return readFileSync(filePath, "utf8");
  return readFileSync(0, "utf8"); // stdin
}

export function parseThemeBlock(text) {
  const nameMatch = text.match(/\bname:\s*"?([\w-]+)"?\s*;/);
  const schemeMatch = text.match(/\bcolor-scheme:\s*"?(light|dark)"?\s*;/);
  if (!nameMatch) throw new Error('Could not find a `name: "...";` line in the input.');
  if (!schemeMatch) throw new Error('Could not find a `color-scheme: "light"|"dark";` line in the input.');

  const colors = {};
  const colorRe = /--color-([\w-]+):\s*([^;]+);/g;
  let m;
  while ((m = colorRe.exec(text))) {
    colors[m[1]] = m[2].trim();
  }

  const radii = {};
  const radiusRe = /--radius-([\w-]+):\s*([^;]+);/g;
  while ((m = radiusRe.exec(text))) {
    radii[m[1]] = m[2].trim();
  }

  const required = [
    "base-100", "base-200", "base-300", "base-content",
    "primary", "primary-content", "secondary", "accent",
    "info", "info-content", "success", "success-content",
    "warning", "warning-content", "error", "error-content",
  ];
  const missing = required.filter((k) => !colors[k]);
  if (missing.length > 0) {
    throw new Error(`Missing required --color-* keys: ${missing.join(", ")}`);
  }
  if (!radii["box"]) {
    throw new Error("Missing required --radius-box value.");
  }

  return { name: nameMatch[1], scheme: schemeMatch[1], colors, radii };
}

// Extracts the lightness (leading token, kept as-authored, e.g. "88.272%")
// and hue (third token) out of a value like "oklch(88.272% 0.049 91.774)".
export function parseOklch(value) {
  const match = value.match(/oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)\s*\)/);
  if (!match) throw new Error(`Not a plain oklch(L C H) value: "${value}"`);
  const [, lightness, chroma, hue] = match;
  return { lightness, chroma, hue };
}

function subtleTone(sourceValue, mutedValue, chroma) {
  const { lightness: mutedLightness } = parseOklch(mutedValue);
  const { hue } = parseOklch(sourceValue);
  return `oklch(${mutedLightness} ${chroma} ${hue})`;
}

// e.g. "1rem" -> 1, "0.25rem" -> 0.25 — every daisyUI radius role is a
// plain rem value, never a calc() or a unitless number.
export function remToNumber(value) {
  const match = value.match(/^([\d.]+)rem$/);
  if (!match) throw new Error(`Not a plain rem value: "${value}"`);
  return parseFloat(match[1]);
}

export function radiusDescription(name, radii) {
  const box = remToNumber(radii["box"]);
  const base = `daisyUI '${name}' theme's own --radius-box value. See design.md for why box is the single anchor used.`;

  const divergent = ["selector", "field"].filter((role) => {
    if (!radii[role]) return false;
    const value = remToNumber(radii[role]);
    // Ratio-based comparison breaks down at box === 0 (any nonzero value
    // is "infinitely" larger, any multiplier of 0 is still 0). Treat a
    // flat 0rem-vs-0rem as no divergence, and any nonzero role against a
    // 0rem box as divergent regardless of the ratio.
    if (box === 0) return value !== 0;
    return value >= box * RADIUS_DIVERGENCE_THRESHOLD || value <= box / RADIUS_DIVERGENCE_THRESHOLD;
  });
  if (divergent.length === 0) return base;

  const notes = divergent
    .map((role) => `this theme's own --radius-${role} is ${radii[role]}, notably ${remToNumber(radii[role]) > box ? "larger" : "smaller"} than box`)
    .join("; ");
  return `daisyUI '${name}' theme's own --radius-box value. Note: ${notes} — the box anchor ${divergent.some((r) => remToNumber(radii[r]) > box) ? "undershoots" : "overshoots"} this theme's ${divergent.join("/")} roundness. See design.md for the box-anchor compromise.`;
}

function jsonString(value) {
  return JSON.stringify(value);
}

function entryLine(key, value, description) {
  const parts = [`"$type": "color"`, `"$value": ${jsonString(value)}`];
  if (description) parts.push(`"$description": ${jsonString(description)}`);
  return `  ${jsonString(key)}: { ${parts.join(", ")} }`;
}

export function buildFileText({ name, scheme, colors, radii }) {
  const mutedForegroundLightness =
    scheme === "dark" ? MUTED_FOREGROUND_DARK_LIGHTNESS : MUTED_FOREGROUND_LIGHT_LIGHTNESS;
  const { hue: foregroundHue } = parseOklch(colors["base-content"]);
  const src = (key) => `daisyUI '${name}' ${key}`;
  const ref = (name) => `{${name}}`;

  const secondaryValue = subtleTone(colors["secondary"], colors["base-200"], SUBTLE_SECONDARY_CHROMA);
  const accentValue = subtleTone(colors["accent"], colors["base-200"], SUBTLE_ACCENT_CHROMA);

  const topDescription = `daisyUI '${name}' theme, remapped to shadcn's CSS variable naming convention.`;

  const radiusLine = `  "radius": { "$type": "dimension", "$value": ${jsonString(radii["box"])}, "$description": ${jsonString(radiusDescription(name, radii))} }`;

  const groups = [
    [
      entryLine("background", colors["base-100"], src("base-100")),
      entryLine("foreground", colors["base-content"], src("base-content")),
    ],
    [
      entryLine("card", ref("background")),
      entryLine("card-foreground", ref("foreground")),
      entryLine("popover", ref("background")),
      entryLine("popover-foreground", ref("foreground")),
    ],
    [
      entryLine("primary", colors["primary"], src("primary")),
      entryLine("primary-foreground", colors["primary-content"], src("primary-content")),
    ],
    [
      entryLine("secondary", secondaryValue, `${src("secondary")} HUE, re-derived to shadcn's subtle-secondary tonal role at muted's own lightness`),
      entryLine("secondary-foreground", ref("foreground")),
    ],
    [
      entryLine("muted", colors["base-200"], src("base-200")),
      entryLine("muted-foreground", `oklch(${mutedForegroundLightness} 0.02 ${foregroundHue})`),
    ],
    [
      entryLine("accent", accentValue, `${src("accent")} HUE, re-derived to shadcn's subtle-accent tonal role at muted's own lightness`),
      entryLine("accent-foreground", ref("foreground")),
    ],
    [
      entryLine("destructive", colors["error"], src("error")),
      entryLine("destructive-foreground", colors["error-content"], src("error-content")),
    ],
    [
      entryLine("info", colors["info"], src("info")),
      entryLine("info-foreground", colors["info-content"], src("info-content")),
      entryLine("success", colors["success"], src("success")),
      entryLine("success-foreground", colors["success-content"], src("success-content")),
      entryLine("warning", colors["warning"], src("warning")),
      entryLine("warning-foreground", colors["warning-content"], src("warning-content")),
    ],
    [
      entryLine("border", colors["base-300"], src("base-300")),
      entryLine("input", ref("border")),
      entryLine("ring", ref("primary")),
    ],
    [
      entryLine("chart-1", ref("primary")),
      entryLine("chart-2", colors["accent"], `${src("accent")}, bold — used directly here since charts need contrast`),
      entryLine("chart-3", ref("info")),
      entryLine("chart-4", ref("success")),
      entryLine("chart-5", ref("warning")),
    ],
    [
      entryLine("sidebar", ref("background")),
      entryLine("sidebar-foreground", ref("foreground")),
      entryLine("sidebar-primary", ref("primary")),
      entryLine("sidebar-primary-foreground", ref("primary-foreground")),
      entryLine("sidebar-accent", ref("accent")),
      entryLine("sidebar-accent-foreground", ref("accent-foreground")),
      entryLine("sidebar-border", ref("border")),
      entryLine("sidebar-ring", ref("primary")),
    ],
  ];

  const allLines = groups.map((g) => g.join(",\n")).join(",\n\n");
  return `{\n  "$description": ${jsonString(topDescription)},\n${radiusLine},\n${allLines}\n}\n`;
}

// Only run the CLI when invoked directly (`node scripts/daisyui-theme-to-tokens.mjs`),
// not when imported by the test suite.
if (path.resolve(process.argv[1] ?? "") === path.resolve(new URL(import.meta.url).pathname)) {
  const input = readInput();
  const parsed = parseThemeBlock(input);
  const fileText = buildFileText(parsed);

  const outDir = process.argv[3] || "tokens/daisyui";
  const outPath = path.join(outDir, `${parsed.name}.json`);
  if (existsSync(outPath) && process.env.DAISYUI_TOKENS_FORCE !== "1") {
    console.error(`Refusing to overwrite existing file: ${outPath} (set DAISYUI_TOKENS_FORCE=1 to regenerate deliberately).`);
    process.exit(1);
  }
  writeFileSync(outPath, fileText);
  console.log(`Wrote ${outPath} (theme "${parsed.name}", ${parsed.scheme} color-scheme).`);
}
