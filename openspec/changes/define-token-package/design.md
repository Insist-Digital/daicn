## Context

This repository was just created to hold a small, standalone design-token package. Its initial color palette and radius decision are being seeded from an existing, separate, private application that had already built a Style Dictionary/DTCG-format token contract for its own use, including a specific remap of daisyUI's published theme values onto shadcn's CSS-variable naming convention (`background`/`foreground`/`card`/`popover`/`primary`/`secondary`/`muted`/`accent`/`destructive`/`border`/`input`/`ring`/`chart-1..5`/`sidebar-*`), with `secondary`/`accent` specifically re-derived to shadcn's subtle tonal convention rather than copied as daisyUI's own bold brand-fill values. That remap decision is treated here as a given, already-correct input, not something this change re-derives.

This repository is public and MIT-licensed from day one. The first intended consumer is an Astro application using Tailwind CSS directly, without any component framework layered on top — the first real test of whether these tokens work as plain values, independent of the ecosystem (shadcn/Radix) their naming convention happens to originate from.

## Goals / Non-Goals

**Goals:**
- Ship color and radius tokens that work standing alone, as plain CSS, with zero framework dependency.
- Also work for a Tailwind v4 consumer, via an additive adapter, without forcing every consumer through Tailwind.
- Make the package's own build reproducible and drift-proof: generated CSS is never committed, always rebuilt from source at install time.
- Verify the design actually holds by installing this package into a real, different-from-the-source-ecosystem consumer (the Astro app) before calling v1 done.

**Non-Goals:**
- Shadow, spacing, typography/font tokens. Color and radius only — see Decisions for why font in particular doesn't belong here.
- Any component or framework-logic code (a CVA-style variant contract or similar). This package ships values, never behavior.
- daisyUI's `--depth`/`--noise` flags, its 3-role radius system, or a `neutral` color — real, named gaps relative to daisyUI's own theme model, deliberately not closed in v1 (see Decisions).
- iOS, Android, or email/PDF platform outputs. Real future scope, not built now.
- A Bootstrap (or other framework) adapter beyond the Tailwind one.
- Making the source application a consumer of this package. Separate, unscheduled follow-up work outside this repository.

## Decisions

**1. Color and radius only — not the full 5-category set (color/spacing/radius/shadow/typography) the source application originally had.** Shadow and spacing were dropped at the source because they duplicated Tailwind v4's own default scales with no real customization; nothing about this package's own scope changes that. Font is excluded for a different, more fundamental reason: font is not a portable *value* the way color/radius are — it requires real, platform-specific asset delivery (web `@font-face`/hosted files, iOS bundled `.ttf` + `Info.plist` entries, Android XML font resources, and most email clients ignoring custom fonts regardless of what's specified). It's also not coupled to color-theme identity in the daisyUI ecosystem these themes are drawn from — daisyUI's own themes vary color/radius/depth but don't carry a typeface choice. Bundling font into a "theme" here would conflate two things that aren't actually coupled at the source.

**2. Two-layer output: a framework-agnostic base layer, plus an optional, additive Tailwind adapter.** Alternative considered: ship only Tailwind-flavored output (the `@theme inline` form), since the primary known consumer ecosystem so far has been Tailwind-based. Rejected — the Astro app (Tailwind, no shadcn) is exactly the case that proves this needs to be layered rather than Tailwind-first: a plain CSS custom-property layer works for *any* consumer, Tailwind-based or not, while the Tailwind-specific bridge (`@theme inline`, plus the radius-scale derivation) is real, Tailwind-only syntax that a non-Tailwind consumer has no use for and shouldn't be forced to load. The radius scale specifically (`--radius-sm` through `--radius-4xl`) is a Tailwind utility-naming convention, not a universal design-token concept — a plain-CSS consumer has no need for named radius steps at all, and just uses the single base `--radius` value directly wherever it wants. This split also generalizes cleanly to a future non-Tailwind-CSS adapter (a Bootstrap-flavored one, for example) without redesigning anything — not built now, but the shape doesn't foreclose it.

**3. CSS is generated at install time via this package's own `prepare` script, never committed.** Style Dictionary is a dependency of this package, not of any consumer. npm runs a git-URL dependency's `prepare` script automatically on install — building CSS output straight into the consumer's own `node_modules/daicn/dist/`, with zero manual build step on the consumer's side. Generated output is `.gitignore`d in this repository. This is deliberate, not an oversight: since nothing generated ever persists between installs, there is no state where a committed CSS file could silently disagree with the JSON source that's supposed to produce it — every install regenerates fresh from whatever source is at the pinned version tag.

**4. Theme selection is just file choice — no selection API.** A consumer picks a theme by importing that theme's specific base-layer file; nothing else is needed. Considered a manifest or config-driven selection mechanism; rejected as unnecessary machinery for a problem plain file imports already solve.

**5. Known daisyUI-fidelity gaps are named, not silently dropped, and deliberately not closed in v1.** `--depth`/`--noise` aren't portable token values at all — they're read exclusively by daisyUI's own bundled component CSS, which this package doesn't ship and isn't adopting (adopting it would mean shipping a second, competing component-styling mechanism alongside whatever the consumer already uses). The 3-role radius system (`--radius-selector`/`-field`/`-box`) and a `neutral`/`neutral-content` color are mechanically cheap to add later — Tailwind's `@theme` namespace is open-key, so defining them would produce real, working utility classes immediately — but nothing in this package's v1 scope actually needs them yet, so they're deferred rather than spec'd speculatively.

## Risks / Trade-offs

- **[Risk]** This package has no consumer with a track record yet — the Astro app is a first, unproven integration. → **Mitigation**: verifying against it is an explicit task in this change (see tasks.md), not deferred to a later, separate effort.
- **[Risk]** A public, MIT-licensed repository seeded from a private source application's token values carries real provenance risk (internal references, client identity, unrelated infrastructure accidentally included). → **Mitigation**: the seeded values themselves (a daisyUI-derived color/radius remap) carry no client-identifying information by construction — verified at the source before extraction — and only specific, individually-chosen files are ever added to this repository, never a directory copied wholesale.
- **[Risk]** Install-time CSS generation means a consumer's install step needs working network and Node tooling access (to clone this repo and run its `prepare` script) — a small but real new failure mode compared to a plain registry-published package. → **Mitigation**: this is standard behavior for any git-URL npm dependency, not a new requirement created by this package specifically; any environment already capable of `npm install`-ing a git dependency already satisfies it.

## Migration Plan

_Not applicable — this is the first change in a new repository, not a migration of existing behavior._
