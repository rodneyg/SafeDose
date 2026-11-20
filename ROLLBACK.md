# Rollback

SafeDose production lives on Vercel (https://safedose.rodneygainous.com, fallback https://safe-dose.vercel.app/). Every merge to `main` gets a semver tag and a GitHub Release. Use a tag to put that exact build back on production.

## Command

```bash
npm run rollback -- v1.0.0
```

From a clone with Vercel CLI access to the `rodneygs-projects` team (the default scope in the script):

1. Resolve the tag to its commit.
2. Find a Ready Vercel production deployment for that commit.
3. Run `vercel promote` so that deployment becomes current production.

If no production deployment exists for the tag, the script checks out the commit and runs `vercel deploy --prod`.

Preview the actions without changing production:

```bash
npm run rollback -- v1.0.0 --dry-run
```

## Version tags

Merges to `main` create the next tag automatically (see `.github/workflows/release.yml`).

- Default bump: patch (`v1.0.0` to `v1.0.1`).
- Minor: add a `minor` or `semver:minor` label on the PR, or start the PR title with `feat:`.
- Major: add a `major`, `semver:major`, or `breaking` label, or use a breaking conventional-commit subject (`feat!:` or a `BREAKING CHANGE:` footer).

The existing changelog workflow still publishes `changelog/` and `lib/changelog.json` on merge. The tag job skips those changelog commits so you do not get two tags for one merge.

The first baseline tag is `v1.0.0`, on the `main` commit that included the 20 Nov 2026 pull request batch.
