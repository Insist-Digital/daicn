## 1. Package skeleton

- [x] 1.1 Author `package.json`: name `daicn`, MIT license, Style Dictionary as a dependency, a `prepare` script that runs the Style Dictionary build.
- [x] 1.2 Add `dist/` to `.gitignore` (generated output is never committed).

## 2. Token source

- [x] 2.1 Add `tokens/daisyui/*.json` (DTCG-format), seeded from the source application's existing color palette — one file per theme. (Path is `tokens/daisyui/`, not `tokens/color/` — grouped by provenance rather than category, decided during implementation.)
- [x] 2.2 Add a `radius` token to each theme file, one real value per theme. (Corrected mid-implementation: the original plan put one shared value in a standalone `tokens/radius.json`, sourced only into the light theme's config — meaning every theme, including dark mode, silently shared one radius with zero variation. Fixed by pulling each theme's actual `--radius-box` value from daisyUI's own published source (`saadeghi/daisyui`) and moving radius into each theme's own `tokens/daisyui/<theme>.json` file; `tokens/radius.json` is deleted. See design.md decision 6 for the box-vs-field/selector anchor trade-off this involves.)
- [x] 2.3 Review every added file's `$description`/comment content to confirm nothing references the source application's internal documents, decision logs, or client identity. (Rewrote `design.md decision 11` references in `light.json`/`dark.json`, and generalized the 15 demo themes' top-level descriptions, which referenced the source application's own change name and script path.)

## 3. Build configuration

- [x] 3.1 Author the Style Dictionary configuration producing the base layer: one plain-CSS-custom-property file per theme (`:root`/`.dark`/`[data-theme="x"]` as appropriate).
- [x] 3.2 Author the Style Dictionary configuration (or hand-authored static file, since its content doesn't vary per theme) producing the Tailwind adapter layer: the `@theme inline` bridge plus the 7-step multiplicative radius scale derived from the single base radius value.

## 4. Verify

- [x] 4.1 Install this package as a git-URL dependency in a fresh test project; confirm the `prepare` script generates CSS output automatically on install with no manual build step. (Verified: `npm install git+file://.../daicn` in a scratch project froze/cloned the repo, ran `prepare` automatically, and generated all 17 theme files plus the Tailwind adapter fresh inside the consumer's own `node_modules/daicn/dist/`.)
- [x] 4.2 Install into the Astro app (Tailwind, no shadcn): import base-layer CSS only for at least one theme; confirm token values render correctly with no Tailwind adapter installed. (Verified against `spysters-auto-website` — installed via Yarn Berry as a real `github:Insist-Digital/daicn#implement-token-package` dependency. Compiled output confirms `:root{--radius:.25rem}` and `.dark{--radius:.5rem}` resolving from the base layer alone.)
- [x] 4.3 In the same Astro app, add the Tailwind adapter import; confirm Tailwind utility classes (including radius utilities) work as expected. (Verified: compiled CSS contains `.bg-background{background-color:var(--background)}`, `.text-primary{color:var(--primary)}`, and `.rounded-2xl{border-radius:calc(var(--radius) * 1.8)}` — the correct 7-step multiplicative formula, generated correctly by Tailwind's own build from the adapter layer.)

## 5. Publish

- [x] 5.1 Re-run a content check across every file in this repository for client name, internal document references, or infrastructure details before tagging a first version. (Grepped every added file for the client name and nyati-web-specific references — clean. Only hit was the README's own reference to this repo's own `openspec/changes/`, which is correct and not a leak.)
- [ ] 5.2 Tag and push a first version (for example `v0.1.0`). **Not done** — held pending 4.2/4.3 (unverified against the real Astro consumer) and explicit confirmation, since tagging/pushing a public release is a real, externally-visible action.
