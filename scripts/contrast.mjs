// WCAG 2 contrast for plain `oklch(L% C H)` values, plus the lightness
// solver daicn uses for the color tokens it derives itself
// (`muted-foreground`, `input`). Shared by the remap script and the test
// suite, so the values written and the values checked come from the same
// math. No color library: the conversion is Björn Ottosson's OKLab
// matrices, then the WCAG 2 relative-luminance and contrast formulas.

// Unlike the remap script's parseOklch (which keeps each token as-authored
// so it can be copied into a file verbatim), this returns numbers, with
// lightness always on the 0-100 percent scale: a unitless lightness
// (CSS's 0-1 form, e.g. "oklch(0.97 0.014 343.198)") is scaled up.
export function parseOklchNumbers(value) {
  const match = value.match(/^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)\s*\)$/);
  if (!match) throw new Error(`Not a plain oklch(L C H) value: "${value}"`);
  const l = parseFloat(match[1]);
  return { l: match[2] ? l : l * 100, c: parseFloat(match[3]), h: parseFloat(match[4]) };
}

// OKLCH -> OKLab -> linear sRGB, each channel clamped to [0, 1]. Linear
// sRGB is what WCAG's luminance formula weights, so no gamma step is
// needed in between.
export function oklchToLinearSrgb({ l, c, h }) {
  const hueRadians = (h * Math.PI) / 180;
  const L = l / 100;
  const a = c * Math.cos(hueRadians);
  const b = c * Math.sin(hueRadians);

  const lCone = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mCone = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const sCone = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;

  return [
    4.0767416621 * lCone - 3.3077115913 * mCone + 0.2309699292 * sCone,
    -1.2684380046 * lCone + 2.6097574011 * mCone - 0.3413193965 * sCone,
    -0.0041960863 * lCone - 0.7034186147 * mCone + 1.707614701 * sCone,
  ].map((channel) => Math.min(1, Math.max(0, channel)));
}

export function relativeLuminance(value) {
  const [r, g, b] = oklchToLinearSrgb(parseOklchNumbers(value));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(first, second) {
  const a = relativeLuminance(first);
  const b = relativeLuminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

// Steps lightness in whole percents, away from `background` (darker when
// its lightness is 50% or more, lighter otherwise), and returns the first
// lightness whose color reaches `floor` against every one of `grounds`.
// `start` is checked first, so a value that already passes comes back
// unchanged; without one, stepping starts at the first whole percent
// beyond `background`'s own lightness. Throws when 0% or 100% is reached
// without passing. Returns a number, e.g. 52 for "52%".
export function solveLightness({ chroma, hue, background, grounds = [background], floor, start, label = "color" }) {
  if (start !== undefined && !Number.isInteger(start)) {
    throw new Error(`${label}: start lightness must be a whole percent, got ${start}.`);
  }
  const backgroundLightness = parseOklchNumbers(background).l;
  const step = backgroundLightness >= 50 ? -1 : 1;
  let lightness = start ?? (step < 0 ? Math.ceil(backgroundLightness) - 1 : Math.floor(backgroundLightness) + 1);

  for (; lightness >= 0 && lightness <= 100; lightness += step) {
    const candidate = `oklch(${lightness}% ${chroma} ${hue})`;
    if (grounds.every((ground) => contrastRatio(candidate, ground) >= floor)) return lightness;
  }
  throw new Error(`${label}: no lightness reaches ${floor}:1 against ${grounds.join(", ")} before ${step < 0 ? "0%" : "100%"}.`);
}
