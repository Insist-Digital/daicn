# daicn

A small, framework-agnostic design-token package: color and radius values, authored once as [DTCG-format](https://tr.designtokens.org/) JSON and built with [Style Dictionary](https://styledictionary.com/) into ready-to-use CSS.

## What this is

- A single source of truth for a catalog of color themes plus a base radius value — not tied to any one framework or component library.
- Distributed as JSON source, with CSS generated automatically at install time (see below) rather than committed to this repository.
- Two output layers:
  - **Base layer** — plain CSS custom properties, one file per theme. Works anywhere a stylesheet can be imported, no build tool required.
  - **Tailwind adapter** — a thin, additive layer on top of the base layer that wires the same values into [Tailwind CSS v4](https://tailwindcss.com/)'s `@theme inline` convention, for projects that want Tailwind utility classes (`bg-background`, `rounded-lg`, etc.) generated from these tokens.

## Status

This repository was just created and is being scoped via [OpenSpec](https://github.com/openspec-tools/openspec) — see `openspec/changes/` for the active proposal describing what ships in the first version.

## License

MIT — see [LICENSE](./LICENSE).
