// Automated version of the manual content-safety check this package's
// tasks.md records as a one-off step before each release. A manual grep
// only protects the repo the day someone remembers to run it — this test
// runs every time and fails the build if a source-application-specific
// reference (or the client name) ever gets written back into a commit,
// which already happened once, silently, in this package's own docs
// before an automated check existed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Git-tracked (or staged) files only — this test guards what actually gets
// published, not local scratch artifacts that were never committed.
const trackedFiles = execFileSync("git", ["ls-files"], { cwd: repoRoot, encoding: "utf8" })
  .split("\n")
  .filter(Boolean);

// Patterns specific enough not to false-positive on this repo's own,
// legitimate self-references (its own name "daicn", its own repo URL,
// "Insist Digital" as the LICENSE copyright holder — already public via
// the GitHub org itself).
const FORBIDDEN_PATTERNS = [
  { name: "client/brand name", pattern: /hybrid[\s-]?sports/i },
  { name: "source application name", pattern: /\bnyati-web\b/i },
  { name: "source app's internal decision-doc reference", pattern: /design\.md decision \d+ of the source|source application'?s design\.md/i },
  { name: "sibling repo name", pattern: /nyati-dashboard-refine/i },
  { name: "internal deployment infra", pattern: /promote-staging|gitops repo/i },
];

for (const file of trackedFiles) {
  test(`${file}: no forbidden references`, () => {
    const content = readFileSync(path.join(repoRoot, file), "utf8");
    for (const { name, pattern } of FORBIDDEN_PATTERNS) {
      assert.doesNotMatch(content, pattern, `${file} contains a ${name} — this is a public repository`);
    }
  });
}

test("no component or framework-logic source files exist", () => {
  const forbidden = trackedFiles.filter((f) => /\.(tsx|jsx|vue|svelte)$/.test(f));
  assert.deepEqual(forbidden, [], "this package ships token values only, never component/framework code");
});
