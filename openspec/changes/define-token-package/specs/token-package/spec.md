## ADDED Requirements

### Requirement: DTCG JSON token source is the package's primary artifact
This package SHALL distribute color and radius tokens as DTCG-format JSON source files, treated as the authoritative artifact — every other output this package produces SHALL be a mechanical Style Dictionary build of this source, never hand-authored independently of it.

#### Scenario: A new platform target is added later
- **WHEN** a future need arises for an output format this package doesn't yet produce (for example, an iOS or Android platform target)
- **THEN** it is added as one more Style Dictionary build configuration reading the existing JSON source, with no change to the JSON source's own structure

### Requirement: CSS output is generated at install time, never committed to source control
This package SHALL generate its CSS output (both the base layer and the Tailwind adapter layer) via its own npm `prepare` lifecycle script at install time, and SHALL NOT commit generated CSS files to its git repository.

#### Scenario: A consumer installs the package
- **WHEN** a consuming project installs this package as a git-URL dependency
- **THEN** npm runs this package's own `prepare` script automatically, which builds the CSS output into the consumer's local `node_modules/` copy of the package using Style Dictionary as this package's own dependency, without requiring the consumer to run any build step itself

#### Scenario: Generated output cannot go stale relative to source
- **WHEN** the JSON token source is edited and a new version is tagged
- **THEN** there is no previously-committed generated CSS anywhere in the repository that could disagree with the new source, because generated output is never persisted between installs

### Requirement: Output splits into a framework-agnostic base layer and an optional Tailwind adapter layer
This package SHALL produce a base layer of plain CSS custom properties, one file per theme, that requires no build tool or framework beyond a CSS import to consume, and SHALL separately produce a Tailwind-specific adapter layer that wraps the same base-layer variables into Tailwind v4's `@theme inline` namespace. The adapter layer SHALL be additive only — nothing in the base layer SHALL require the adapter layer to function.

#### Scenario: A non-Tailwind consumer uses only the base layer
- **WHEN** a consumer imports only the base-layer CSS files for the themes it wants
- **THEN** every token value in those files resolves and is usable as a plain CSS custom property, with no Tailwind involvement required

#### Scenario: A Tailwind consumer adds the adapter layer on top
- **WHEN** a Tailwind v4 consumer imports the base-layer CSS files and additionally imports the Tailwind adapter file
- **THEN** the consumer gets working Tailwind utility classes (for example `bg-background`, `rounded-lg`) derived from the same token values, including a radius scale matching shadcn's current 7-step multiplicative `calc()` formula

### Requirement: Theme selection requires no dedicated selection mechanism
This package SHALL make each theme's base-layer CSS available as its own separately importable file, with theme selection determined entirely by which files a consumer chooses to `@import` — this package SHALL NOT require a manifest, configuration option, or selection API to pick a subset of themes.

#### Scenario: A consumer uses only some of the available themes
- **WHEN** a consumer imports the base-layer files for 2 of the themes this package ships
- **THEN** only those 2 themes' CSS is included in the consumer's build, with no reference to the unused themes anywhere in the consumer's output

### Requirement: No component or framework-specific logic code ships from this package
This package SHALL contain only token values and their build configuration — it SHALL NOT contain component source code, a CVA (or equivalent) variant contract, or any other framework-specific logic layer.

#### Scenario: A consumer needs shared component behavior
- **WHEN** a consumer wants shared component behavior (a `size`/`variant` contract or similar) alongside this package's tokens
- **THEN** it obtains that behavior through its own framework's own mechanism (for example shadcn's copy-in CLI), not as part of installing this package

### Requirement: No internal-process, client-identifying, or infrastructure content may appear in this repository
This package's source, history, and documentation SHALL NOT contain any client or brand name, internal decision-log or design-document reference, or deployment-infrastructure detail belonging to any application this package's token values were sourced from.

#### Scenario: Token files are added from a source application
- **WHEN** token files are added to this repository based on values from a separate source application
- **THEN** only the specific files needed are added — never a directory copied wholesale — and each added file's own comments/descriptions are reviewed to confirm they're self-contained, with no reference to the source application's internal documents
