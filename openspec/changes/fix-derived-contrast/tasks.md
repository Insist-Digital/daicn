## 1. Contrast module

- [x] 1.1 Add `scripts/contrast.mjs`: parse a plain `oklch(L% C H)` string, convert OKLab → linear sRGB (Ottosson's matrices, clamped), WCAG 2 relative luminance and contrast ratio. Verify with a new `test/contrast-math.test.mjs`: white on black = 21, a color on itself = 1, and daicn light's `foreground` on `background` = 17.7 (to one decimal).
- [x] 1.2 Add the lightness solver to `scripts/contrast.mjs` (design.md Decision 2): step in whole percents away from the background (darker when its lightness ≥ 50%), return the first lightness meeting the floor on every given ground, throw when 0% or 100% is reached. Verify in the same test file: a passing start value is returned unchanged, a failing one moves the expected direction, and an impossible floor throws.

## 2. Script derivation

- [x] 2.1 In `scripts/daisyui-theme-to-tokens.mjs`, derive `muted-foreground` with the solver (start at 55% or 65% by color scheme, floor 4.5:1 on `base-100` and `base-200`) and emit `input` as `oklch(<solved>% min(fg chroma, 0.02) <fg hue>)` (floor 3:1 on `base-100`) with a `$description` saying how it's derived; update the header comment's remap table. Verify with new unit tests in `test/daisyui-theme-to-tokens.test.mjs`: the cupcake block's output meets both floors, and `input` is no longer `{border}`. (The golden test is expected to fail until 3.1.)

## 3. Migrate the 35 theme files

- [x] 3.1 Write a one-off migration (not committed) that, for each `tokens/daisyui/*.json`, recomputes `muted-foreground` from its current value and `input` from `foreground`/`background`, using the exported solver, and rewrites only those two lines. Run it, check that `git diff --stat` shows two changed lines in the 21 themes whose `muted-foreground` moves and only the `input` line in the other 14, then delete the migration. Verify: the cupcake golden test passes again (script and migration agree), and the diff matches the design's dry run (21 `muted-foreground` changes, light and dark only change `input`).

## 4. Contrast test

- [x] 4.1 Add `test/contrast.test.mjs`: glob every theme file, resolve aliases, assert `muted-foreground` ≥ 4.5:1 on `background` and `muted` and `input` ≥ 3:1 on `background`, with failure messages naming theme, pair and ratio. Also assert both values equal what the remap script's formulas produce, so a value that clears the floor but no longer matches the formula is caught. Verify it passes, then temporarily set one theme's `input` back to `{border}` and confirm it fails naming that theme, then restore.
- [x] 4.2 In the same file, add the non-failing report: the audit's 16 pairs plus the new `input` row (17 rows, a fixed list), printed with `t.diagnostic`, pairs under their floor marked. Verify `npm test` shows the grid and still passes.

## 5. Integration

- [x] 5.1 Run `npm test` and `npm run build`; verify every suite passes and `dist/css/tokens/light.css` shows `--input` as a literal value (not equal to `--border`).

## Workflow follow-up

- Done: re-synced the daicn design system artifact (`input` for light and dark in its `tokens.json`; contrast notes in its README and the Input, Switch and Checkbox guidelines).
- Archive the change once the work is merged.
