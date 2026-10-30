// Pins scripts/contrast.mjs to known ratios. The contrast test and the
// remap script both rely on this module, so a bug here would fool both;
// these cases are the independent check.
import { test } from "node:test";
import assert from "node:assert/strict";
import { contrastRatio, parseOklchNumbers, solveLightness } from "../scripts/contrast.mjs";

const WHITE = "oklch(100% 0 0)";
const BLACK = "oklch(0% 0 0)";

test("contrastRatio: white on black is 21:1, in either order", () => {
  assert.ok(Math.abs(contrastRatio(WHITE, BLACK) - 21) < 1e-6);
  assert.ok(Math.abs(contrastRatio(BLACK, WHITE) - 21) < 1e-6);
});

test("contrastRatio: a color on itself is 1:1", () => {
  const cupcakePrimary = "oklch(85% 0.138 181.071)";
  assert.ok(Math.abs(contrastRatio(cupcakePrimary, cupcakePrimary) - 1) < 1e-9);
});

test("contrastRatio: daicn light's foreground on background is 17.7:1", () => {
  // tokens/daisyui/light.json: foreground on background.
  assert.equal(contrastRatio("oklch(21% 0.006 285.885)", WHITE).toFixed(1), "17.7");
});

test("parseOklchNumbers: throws on a non-oklch value", () => {
  assert.throws(() => parseOklchNumbers("#ffffff"), /Not a plain oklch/);
});

test("solveLightness: a start value that already passes comes back unchanged", () => {
  // 40% neutral on white is well over 4.5:1.
  assert.equal(solveLightness({ chroma: 0, hue: 0, background: WHITE, floor: 4.5, start: 40 }), 40);
});

test("solveLightness: a failing start moves away from a light background (darker)", () => {
  const lightness = solveLightness({ chroma: 0, hue: 0, background: WHITE, floor: 4.5, start: 70 });
  assert.ok(lightness < 70);
  assert.ok(contrastRatio(`oklch(${lightness}% 0 0)`, WHITE) >= 4.5);
  assert.ok(contrastRatio(`oklch(${lightness + 1}% 0 0)`, WHITE) < 4.5, "should stop at the first passing step");
});

test("solveLightness: a failing start moves away from a dark background (lighter)", () => {
  const background = "oklch(25.33% 0.016 252.42)";
  const lightness = solveLightness({ chroma: 0, hue: 0, background, floor: 4.5, start: 30 });
  assert.ok(lightness > 30);
  assert.ok(contrastRatio(`oklch(${lightness}% 0 0)`, background) >= 4.5);
});

test("solveLightness: with no start, begins at the first whole percent beyond the background", () => {
  // A floor of 1 passes immediately, which exposes the starting value.
  assert.equal(solveLightness({ chroma: 0, hue: 0, background: "oklch(97.788% 0 0)", floor: 1 }), 97);
  assert.equal(solveLightness({ chroma: 0, hue: 0, background: WHITE, floor: 1 }), 99);
  assert.equal(solveLightness({ chroma: 0, hue: 0, background: "oklch(25.33% 0 0)", floor: 1 }), 26);
});

test("solveLightness: checks every ground", () => {
  const muted = "oklch(90% 0 0)";
  const onWhiteOnly = solveLightness({ chroma: 0, hue: 0, background: WHITE, floor: 4.5, start: 70 });
  const onBoth = solveLightness({ chroma: 0, hue: 0, background: WHITE, grounds: [WHITE, muted], floor: 4.5, start: 70 });
  assert.ok(onBoth < onWhiteOnly);
  assert.ok(contrastRatio(`oklch(${onBoth}% 0 0)`, muted) >= 4.5);
});

test("solveLightness: an impossible floor throws, naming the label", () => {
  assert.throws(
    () => solveLightness({ chroma: 0, hue: 0, background: "oklch(60% 0 0)", floor: 21, label: "example muted-foreground" }),
    /example muted-foreground: no lightness reaches 21:1/,
  );
});
