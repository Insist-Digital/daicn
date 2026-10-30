## Why

A contrast audit of all 35 themes found that two of the tokens daicn derives itself, rather than copying from daisyUI, fail standard readability floors: `muted-foreground` misses 4.5:1 on `muted` in 18 themes and on `background` in 10, and `input` (an alias of `border`, which is daisyUI's `base-300` surface color) sits near 1.1:1 against `background` in all 35, so Input edges and the unchecked Switch track barely show. These are daicn's own formulas, so fixing them costs nothing in daisyUI fidelity, and a test keeps them fixed as themes are added.

## What Changes

- `muted-foreground`'s lightness is solved per theme: it starts at today's fixed value (55% light, 65% dark) and moves away from the background, 1% at a time, until it reaches 4.5:1 on both `background` and `muted`. Hue (from `foreground`) and chroma (0.02) stay as they are. Themes that already pass keep their current value.
- `input` becomes its own token instead of an alias of `{border}`: `foreground`'s hue, its chroma capped at 0.02, with lightness solved the same way to reach 3:1 against `background`. `border` stays daisyUI's `base-300`, faint, for dividers.
- The remap script (`scripts/daisyui-theme-to-tokens.mjs`) gains both formulas, so any theme it generates from now on gets them.
- All 35 existing `tokens/daisyui/*.json` files are updated once, by computing the new values from what each file already holds (`foreground`, `background`, `muted`, the current `muted-foreground`). The raw daisyUI theme sources aren't in the repository, so the script can't simply be rerun.
- A new `test/contrast.test.mjs` asserts the daicn-derived pairs pass in every theme and prints the full contrast grid (daisyUI's own pairs included) as a report that never fails.

## Capabilities

### New Capabilities
- `token-contrast`: The contrast guarantees daicn makes for the tokens it derives itself (`muted-foreground`, `input`), how they are derived, and how they are checked across every theme; plus the non-failing report of the pairs it copies from daisyUI unchanged.

### Modified Capabilities
_None. `token-package`'s requirements (DTCG source, install-time build, two output layers, file-based theme selection) are unchanged; no specs are archived under `openspec/specs/` yet._

## Impact

- `scripts/contrast.mjs` (new): OKLCH parsing, OKLab → linear sRGB, WCAG 2 relative luminance and contrast ratio, and the lightness solver.
- `scripts/daisyui-theme-to-tokens.mjs`: new derivation for `muted-foreground` and `input`, using the shared solver.
- `test/contrast-math.test.mjs` (new): pins the contrast module to known ratios and the solver to its stepping and throwing behavior.
- `tokens/daisyui/*.json` (all 35): `muted-foreground` values change where they failed; `input` changes from `{border}` to a literal value everywhere.
- `test/daisyui-theme-to-tokens.test.mjs`: the cupcake golden test keeps passing only if the script and the migration agree, which makes it the check that they do. `cupcake.json`'s expected values change intentionally.
- `test/contrast.test.mjs`: new.
- Generated CSS (`dist/`) changes accordingly on the next build. `style-dictionary/tailwind-adapter.css` is untouched: it already maps `--color-input`.
- Visual: inputs, checkboxes and unchecked switches get a visibly stronger edge in every theme; helper text gets slightly darker (light) or lighter (dark) in the themes that failed.
- Follow-up, out of scope: re-sync the daicn design system artifact's light and dark tokens.
