## Context

`scripts/daisyui-theme-to-tokens.mjs` turns one daisyUI theme block into a token file. Most values are copied directly; a few are daicn's own derivations (`secondary`, `accent`, `muted-foreground`, and the aliases). `muted-foreground` today is `oklch(<55% | 65%> 0.02 <foreground hue>)`, chosen by color scheme alone; `input` is the alias `{border}`, and `border` is daisyUI's `base-300`, a surface tier rather than a line color. See proposal.md for the failures this causes.

The 35 theme files were produced by the script (cupcake is pinned by a golden test that reruns it on cupcake's real daisyUI source), but the raw daisyUI sources for the other 34 are not stored in the repository, so the script can't simply be rerun over them.

## Goals / Non-Goals

**Goals:**
- One solver, used by both the script and the one-off migration, so the two cannot disagree.
- The smallest visual change that meets each floor: themes that already pass keep today's value, and failing ones move only as far as needed.

**Non-Goals:**
- Changing any value copied from daisyUI, including the pairs that fail (`primary-foreground`, `destructive-foreground`, the status pairs). They are reported only.
- New tokens beyond giving `input` its own value (no text-safe `destructive` or `primary` variants).
- `muted-foreground`'s chroma: it stays 0.02, including the faint red tint it gets from hue 0 in themes with a neutral foreground (acid, autumn, black). That quirk predates this change.
- Contrast of `input` on `muted`, or of `border` on anything.
- Re-fetching daisyUI sources or adding daisyUI as a dependency.

## Decisions

**1. A small contrast module, `scripts/contrast.mjs`, shared by the script and the tests.** It parses a plain `oklch(L% C H)` string, converts it to linear sRGB with Björn Ottosson's OKLab matrices, clamps to gamut, and computes WCAG 2 relative luminance and the contrast ratio. It also exports the lightness solver (Decision 2).
- Alternative: a color library (culori, colorjs.io). Rejected: one new dependency for about 30 lines of math, and writing the conversion is part of what this project is for.
- Because the tests use the same module, a bug in it would fool both. A unit test pins it to known ratios (white on black = 21, a color on itself = 1, and one or two hand-checked OKLCH pairs).

**2. Lightness is solved by stepping in whole percents, away from `background`.** Direction: darker when `background`'s lightness is 50% or more, lighter otherwise. `muted-foreground` starts at today's default (55% or 65%) and checks that value first, so passing themes don't change. `input` starts at the first whole percent beyond `background`'s lightness. Each step tests the floor against every required ground; the first value that passes wins. If 0% or 100% is reached without passing, the solver throws, naming the theme.
- Alternative: bisect to a fractional lightness. Rejected: whole percents read cleanly in the JSON (`oklch(52% 0.02 285.885)`), match the existing `55%`/`65%` style, and overshoot the floor by under 1% of lightness.
- Alternative: derive the direction from the daisyUI `color-scheme`. Rejected for the solver, because the migration only has the JSON. Background lightness gives the same answer for all 35 themes (checked: every theme with a 55% default has a background at 50% or more, every 65% one below); the script still uses `color-scheme` to pick the default starting value, as today.

**3. `input` = `oklch(<solved>% min(fg chroma, 0.02) <fg hue>)`.** Taking `foreground`'s hue keeps the edge in the theme's ink family; capping chroma at 0.02 keeps strongly colored foregrounds (valentine, 0.223) from drawing saturated lines and leaves neutral ones (chroma 0) truly neutral.
- Alternative: mix `foreground` into `background` at a percentage (daisyUI-style `color-mix`). Rejected: a mix percentage doesn't guarantee a ratio, and the token format wants a literal value.
- Alternative: darken `base-300` until it passes. Rejected: `base-300`'s hue is a surface tint, often far from the ink, and the result would no longer be `base-300`, which is the point of keeping `border` as it is.

**4. A one-off migration rewrites at most two lines per file.** It reads each `tokens/daisyui/*.json`, computes the two values with the same exported functions, and replaces only the `muted-foreground` `$value` and the whole `input` line (now with a `$description` saying how it was derived), leaving every other line, description and blank line as it is. Light and dark keep their hand-written descriptions. It runs once and is not committed: the lasting checks are the cupcake golden test (script and migration agree) and the contrast test (every file passes its floors and matches the formulas).
- Alternative: regenerate all 35 files from re-fetched daisyUI sources. Rejected (see Non-Goals); it would also overwrite light and dark's hand-written descriptions.

**5. `test/contrast.test.mjs` enforces two guarantees and reports the rest.** It globs `tokens/daisyui/*.json` so new themes are covered automatically, resolves aliases, and asserts `muted-foreground` ≥ 4.5:1 on `background` and `muted` and `input` ≥ 3:1 on `background`, with messages naming theme, pair and ratio. It also asserts both values equal what the remap script's formulas produce for that theme, so an edit that still clears the floor is caught too; this is what keeps the 34 themes other than cupcake (which the golden test pins) on the formula. A separate test prints a fixed grid (the 16 pairs from the audit plus `input`) with `t.diagnostic`, marking pairs under their floor, and never fails.

## Risks / Trade-offs

- [Input edges get much more visible in every theme: from about 1.1:1 to 3:1] → That is the point of the change, and shadcn's focus ring still sets focus apart. If a theme looks too heavy, 3:1 is the WCAG minimum, so there's no lower floor to fall back to.
- [The golden test now pins script behavior that was first produced by the migration] → Both call the same exported solver, and cupcake's real daisyUI source is in the test, so a mismatch fails loudly rather than drifting.
- [Gamut clamping could make a computed ratio differ slightly from what a browser renders] → A dry run over all 35 themes found every solved value inside sRGB, so clamping never kicks in for the two derived tokens.
- [`dist/` CSS changes for every theme on the next install] → Expected. The dry run: `input` lands between 47% and 67% lightness in every theme; `muted-foreground` moves in 21 themes, by 1 to 8 points (garden 55% → 47% and aqua 65% → 73% are the largest), and stays as it is in the other 14, light and dark included.

## Migration Plan

1. Land the contrast module, its unit test, and the script changes.
2. Run the migration once over `tokens/daisyui/`, review the diff (two changed lines in the 21 themes whose `muted-foreground` moves, only `input` in the other 14), and delete the migration file.
3. `npm test` (golden test, contrast test, existing tests) and `npm run build`.
4. Rollback: revert the commit. Nothing outside this repository depends on the derived values.
