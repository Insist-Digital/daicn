## Why

A shared, versioned, publicly-reusable source of truth for color and radius design tokens, consumable by any project regardless of framework — proven against a first real non-React, non-shadcn consumer (an Astro app using Tailwind CSS directly) — rather than every consuming project re-authoring or copy-pasting its own token values, which drifts silently over time.

## What Changes

- Ship color tokens for a catalog of themes as DTCG-format JSON — the authoritative source for every other output this package produces.
- Ship a single base radius value per theme (not a derived scale).
- Build two CSS outputs from that same JSON source, both via a Style Dictionary build this package runs itself:
  - A framework-agnostic **base layer** — plain CSS custom properties, one file per theme — that requires no build tool or framework to consume.
  - A **Tailwind v4 adapter layer** — additive on top of the base layer, wiring the same variables into Tailwind's `@theme inline` namespace and deriving the full radius scale from the single base value using shadcn's current 7-step multiplicative formula.
- Generate both outputs fresh at install time, via this package's own npm `prepare` lifecycle script, rather than committing generated CSS to the repository.
- Make theme selection a matter of which base-layer file a consumer imports — no manifest, config option, or selection API.

## Capabilities

### New Capabilities
- `token-package`: The requirements this package's build and distribution mechanism must satisfy — DTCG JSON as the primary artifact, install-time (non-committed) CSS generation, the base-layer/Tailwind-adapter output split, file-import-based theme selection, and the constraint that this package ships values only, never component or framework-logic code.

### Modified Capabilities
_None — this is the first change in this repository; there are no existing specs to modify._

## Impact

- New: `tokens/` (DTCG JSON source), `package.json` (Style Dictionary as a dependency, a `prepare` build script), the Style Dictionary configuration producing the base and Tailwind-adapter layers, `.gitignore`d `dist/`.
- Initial token *values* are seeded from an existing, separate, private application's token contract (color palette and radius decision already made there) — this proposal defines this package's own shape and guarantees, not that source application's own migration, which is out of scope here entirely.
- No existing consumers yet; the Astro app referenced in Why is the first intended consumer, verified as part of this change's own tasks, not a dependency this change waits on.
