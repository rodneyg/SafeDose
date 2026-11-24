# Rollback

SafeDose production lives on Vercel (https://safedose.rodneygainous.com, fallback https://safe-dose.vercel.app/). A push to `main` is eligible for a semver tag and GitHub Release after CI passes for that commit. Use a tag to put that exact build back on production.

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

The [release workflow](.github/workflows/release.yml) tags the commit that passed CI. It skips GitHub Actions bot commits and automated changelog publishes.

- Default bump: patch (`v1.0.0` to `v1.0.1`).
- Minor: add a `minor` or `semver:minor` label on the PR, or start the commit subject with `feat:` or a scoped equivalent such as `feat(scan):`.
- Major: add a `major`, `semver:major`, or `breaking` label, or use a breaking conventional-commit subject (`feat!:` or a `BREAKING CHANGE:` footer).

The existing changelog workflow still publishes `changelog/` and `lib/changelog.json` on merge. The tag job skips those changelog commits so you do not get two tags for one merge.

The first baseline tag is `v1.0.0`, on the `main` commit that included the 20 Nov 2026 pull request batch.
