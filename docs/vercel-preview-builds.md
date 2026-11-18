# Preview build filtering

`vercel.json` runs `node scripts/vercel-ignore.mjs` before a build. Exit 0 skips;
exit 1 proceeds, following Vercel's ignored-build-step convention.

Only an explicit preview environment can skip. Production environments and main
always build. Missing environment metadata also builds. The script fetches up to
100 commits of main, then compares the whole branch with its merge base. This
keeps earlier app changes visible even when the latest commit only edits docs.
Each Git command has a 15-second timeout. Missing Git, fetch failure, missing
ancestry, and empty diffs all proceed with the build. Renames are inspected as
both removal and addition so a removed runtime file cannot be hidden in docs.

A nonempty diff skips only when every path is documentation, Markdown, tests or
test fixtures, GitHub workflow/action configuration, Jest configuration, dosing
or vision typecheck configuration, or evaluation test sets and vision fixtures,
labels or images. The exact allowlist lives in `isPreviewOnly`.

Runtime code, dependencies, deployment configuration and build scripts still
build. `changelog/` Markdown also builds because `scripts/changelog.js` reads it
to generate the public changelog. Files under `public/` and `assets/` always
build, including Markdown. Evaluation harnesses and thresholds still build.
If a skipped file becomes a runtime input, update the allowlist and its test.

Run `npm run test:vercel-ignore`. The suite needs only Node and Git, tests the
actual command in isolated repositories, and retains fixtures in `.verify/`.

This affects only branches containing the change. It does not repair old failed
checks or raise quotas. A rate-limit rejection before the ignored build step
runs cannot be prevented by this script. Hosted quota recovery is unverified.
No hosted project settings are changed by this PR.

References:
- https://vercel.com/docs/project-configuration/vercel-json#ignorecommand
- https://vercel.com/kb/guide/how-do-i-use-the-ignored-build-step-field-on-vercel
