# Vercel build filtering

`vercel.json` runs `node scripts/vercel-ignore.mjs` before a build. Exit 0 skips
the build. Exit 1 lets it proceed.

## Preview builds

The preview rule applies to an explicit preview environment outside `main`.
The script fetches up to 100 commits of main, then compares the whole branch
with its merge base. This keeps earlier app changes visible when the latest
commit only edits docs.
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

## Production builds

On `main`, the production rule compares the current tree with the last
successful deployment, identified by `VERCEL_GIT_PREVIOUS_SHA`. It fetches the
previous commit if the checkout lacks it. A nonempty diff that contains only
preview-exempt files or published changelog files skips the build. A runtime
change anywhere in that diff starts a build.

A commit whose subject starts with `deploy:` starts a build. The
[scheduled workflow](../.github/workflows/deploy-changelog.yml) uses these
commits to ship pending changelog entries in batches. A regular production
build can ship them sooner. Missing environment metadata, an unavailable
comparison commit, and empty diffs allow the build to proceed.

## Verification

Run `npm run test:vercel-ignore`. The suite needs only Node and Git, tests the
actual command in isolated repositories, and retains fixtures in `.verify/`.

A rate-limit rejection can occur before the ignored build step runs.

See [Vercel's ignored-build guide](https://vercel.com/kb/guide/how-do-i-use-the-ignored-build-step-field-on-vercel)
and [system environment variables](https://vercel.com/docs/environment-variables/system-environment-variables#vercel_git_previous_sha).
