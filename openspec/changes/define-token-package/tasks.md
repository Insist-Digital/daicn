## 1. Package skeleton

- [ ] 1.1 Author `package.json`: name `daicn`, MIT license, Style Dictionary as a dependency, a `prepare` script that runs the Style Dictionary build.
- [ ] 1.2 Add `dist/` to `.gitignore` (generated output is never committed).

## 2. Token source

- [ ] 2.1 Add `tokens/color/*.json` (DTCG-format), seeded from the source application's existing color palette — one file per theme.
- [ ] 2.2 Add `tokens/radius.json` (DTCG-format), a single base radius value per theme.
- [ ] 2.3 Review every added file's `$description`/comment content to confirm nothing references the source application's internal documents, decision logs, or client identity.

## 3. Build configuration

- [ ] 3.1 Author the Style Dictionary configuration producing the base layer: one plain-CSS-custom-property file per theme (`:root`/`.dark`/`[data-theme="x"]` as appropriate).
- [ ] 3.2 Author the Style Dictionary configuration (or hand-authored static file, since its content doesn't vary per theme) producing the Tailwind adapter layer: the `@theme inline` bridge plus the 7-step multiplicative radius scale derived from the single base radius value.

## 4. Verify

- [ ] 4.1 Install this package as a git-URL dependency in a fresh test project; confirm the `prepare` script generates CSS output automatically on install with no manual build step.
- [ ] 4.2 Install into the Astro app (Tailwind, no shadcn): import base-layer CSS only for at least one theme; confirm token values render correctly with no Tailwind adapter installed.
- [ ] 4.3 In the same Astro app, add the Tailwind adapter import; confirm Tailwind utility classes (including radius utilities) work as expected.

## 5. Publish

- [ ] 5.1 Re-run a content check across every file in this repository for client name, internal document references, or infrastructure details before tagging a first version.
- [ ] 5.2 Tag and push a first version (for example `v0.1.0`).
