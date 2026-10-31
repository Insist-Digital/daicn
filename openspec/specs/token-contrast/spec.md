## Purpose

Defines the contrast guarantees daicn makes for the color tokens it derives itself, rather than copying from daisyUI, and how those guarantees are checked across every theme the package ships.

Terms used below:

- **Contrast ratio** is the WCAG 2 contrast ratio, computed as `scripts/contrast.mjs` does it: each `oklch()` value is converted to linear sRGB through OKLab (Björn Ottosson's matrices), each channel clamped to [0, 1], then weighted into WCAG relative luminance. Which whole-percent lightness passes first depends on this conversion, so derived values are reproducible only with it.
- **Light and dark themes**: when converting a daisyUI source, a theme is light or dark according to its `color-scheme`. The shipped theme files don't record `color-scheme`, so a theme file is light when its `background`'s lightness is 50% or more, and dark otherwise. The two rules agree for every shipped theme.

## Requirements

### Requirement: muted-foreground meets text contrast on its grounds
In every theme, `muted-foreground` SHALL reach a WCAG 2 contrast ratio of at least 4.5:1 against both `background` and `muted`.

#### Scenario: A theme whose default muted-foreground already passes
- **WHEN** a theme's default `muted-foreground` (55% lightness for a light theme, 65% for a dark one) already reaches 4.5:1 on both `background` and `muted`
- **THEN** that theme's `muted-foreground` keeps the default value unchanged

#### Scenario: A theme whose default muted-foreground fails
- **WHEN** a theme's default `muted-foreground` falls under 4.5:1 on `background` or on `muted`
- **THEN** its lightness moves away from `background` (darker when `background`'s lightness is 50% or more, lighter otherwise), in whole-percent steps, to the first value that reaches 4.5:1 on both, keeping its hue (from `foreground`) and its chroma (0.02)

#### Scenario: No lightness step satisfies both grounds
- **WHEN** no whole-percent lightness, moving away from `background`, reaches 4.5:1 on both `background` and `muted` before 0% or 100%
- **THEN** derivation fails with an error naming the theme, instead of writing a value under the floor

### Requirement: input meets the non-text contrast floor against background
In every theme, `input` SHALL be a color value of its own, not an alias of `border`, and SHALL reach a WCAG 2 contrast ratio of at least 3:1 against `background`.

#### Scenario: input is left as an alias of border
- **WHEN** a theme file's `input` `$value` is `{border}` rather than a derived color
- **THEN** the test suite fails, naming the theme and `input`

#### Scenario: Deriving input for a theme
- **WHEN** a theme's `input` is derived
- **THEN** it takes `foreground`'s hue, `foreground`'s chroma capped at 0.02, and as its lightness the first whole percent beyond `background`'s lightness, moving away from it (darker when `background`'s lightness is 50% or more, lighter otherwise), that reaches 3:1 against `background`

#### Scenario: A theme with a strongly colored foreground
- **WHEN** a theme's `foreground` chroma is above 0.02 (for example valentine's 0.223)
- **THEN** its `input` uses chroma 0.02, so the edge stays a tinted neutral rather than a saturated line

#### Scenario: border is unaffected
- **WHEN** `input` is derived for a theme
- **THEN** that theme's `border` keeps daisyUI's `base-300` value, with no contrast requirement of its own

### Requirement: New themes get the derived values automatically
Any theme file produced from a daisyUI theme source SHALL contain `muted-foreground` and `input` values derived as these requirements describe, with no manual step.

#### Scenario: A theme is added from daisyUI source
- **WHEN** a new daisyUI theme block is converted into a token file
- **THEN** its `muted-foreground` and `input` already satisfy the contrast requirements above

### Requirement: The derived contrast guarantees are tested in every theme
The package's test suite SHALL check both derived guarantees in every theme file present, and SHALL fail when any theme misses either one, naming the theme, the pair and the measured ratio. It SHALL also fail when a theme's `muted-foreground` or `input` differs from the value the derivation above produces for that theme.

#### Scenario: A theme file's derived value is edited below the floor
- **WHEN** a theme's `muted-foreground` or `input` is changed to a value under its floor
- **THEN** the test suite fails and its message names that theme, the failing pair and its ratio

#### Scenario: A theme file's derived value is edited but still passes its floor
- **WHEN** a theme's `muted-foreground` or `input` is changed to a value that still meets its floor but is not the derived value
- **THEN** the test suite fails and its message names that theme and token

#### Scenario: A new theme file is added
- **WHEN** a theme file is added to the token source directory
- **THEN** the contrast tests cover it without any change to the tests

### Requirement: Contrast of daisyUI's copied pairs is reported, not enforced
The test suite SHALL print the contrast ratio of a fixed list of fill/foreground pairs and fill-as-text uses (the `REPORT` list in `test/contrast.test.mjs`) in every theme, including pairs copied unchanged from daisyUI, without failing on them.

#### Scenario: A copied daisyUI pair falls under 4.5:1
- **WHEN** a theme's `primary-foreground` on `primary` (or another pair copied from daisyUI) is under 4.5:1
- **THEN** the report marks it as under the floor and the test suite still passes
