# SafeDose

[![CI](https://github.com/rodneyg/SafeDose/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/rodneyg/SafeDose/actions/workflows/ci.yml)

**A verification and calculation tool for injectable medications prescribed by your healthcare provider.**
Created by **SafeLab**, SafeDose calculates a draw volume from the dose and syringe details you enter or confirm. It uses the medication strength when converting a dose to volume. Compare those inputs and the result with your prescription before use.

## Screenshots

The hosted web app currently shows the welcome screen, an age-appropriate onboarding step, and public pricing. The calculator stays free; photo scans are optional.

![SafeDose welcome screen with the Try Now action](docs/screenshots/welcome.png)

![SafeDose onboarding asking for a birth date, with no information entered](docs/screenshots/onboarding-age.png)

![SafeDose public pricing for the optional Photo Scan plan](docs/screenshots/pricing.png)

---

## 🔮 VisionOS Vision

SafeDose's current dose workflow offers Manual entry and a Scan option. Manual
entry starts with the prescribed dose. Scan can start with photos of the vial
and syringe. Users review the scan results and confirm the fields in the manual
form before calculating the volume to draw. The Logs tab can export dose
history as CSV and show an estimate of doses left in the most recent vial.

**The longer-term vision is a glasses-native workflow:**

1. **Specify Dose**: The user enters their prescribed drug and dose (e.g., "2.5 mg Semaglutide")

2. **Automatic Recognition & User Verification**: SafeDose recognizes the syringe type and vial in the user's field of view, which the user confirms

3. **Guided Drawing with Verification**: As the plunger moves, overlays show where to stop based on the user's prescription. The user confirms when correct.

4. **Confirmation & Logging**: The user confirms the dose matches their prescription, with optional logging for tracking

The current mobile flow is scaffolding. The end-state is an **eyes-up, real-time verification system** that helps users confirm their materials and execute their provider's prescription accurately.

---

## ⚠️ Disclaimer

> **SafeDose is a verification and calculation tool, NOT a medical device.**
>
> SafeDose helps you administer medications prescribed by your healthcare provider. We do NOT provide medical advice, diagnose conditions, or recommend dosages. This tool performs unit conversion calculations on information YOU verify and should not be used as a substitute for professional medical judgment.
>
> Always follow your healthcare provider's prescription exactly. Confirm all calculations and materials match your prescription before proceeding. All results must be independently verified.
>
> Use at your own risk. SafeLab and contributors assume no responsibility for misuse.

---

## 🚀 Hosted Version

A hosted version of SafeDose: https://safedose.rodneygainous.com/ (fallback: https://safe-dose.vercel.app/)

### Versioning and rollback

The release workflow waits for CI to pass on a push to `main`. It creates a
semver tag and a GitHub Release for the commit that passed CI. It skips GitHub
Actions bot commits and automated changelog publishes. The bump is a patch by
default. Use the `minor` or `major` PR label, or a squash commit subject
starting with `feat:` or `feat!:`, to request a minor or major bump.

To put a previous tagged build back on production:

```bash
npm run rollback -- v1.0.0
```

Use `--dry-run` to print the Vercel promotion command without changing production. See [ROLLBACK.md](ROLLBACK.md) for details.


---

## 💻 Local Development

To run the repository locally:

### 1. Clone the repo and install dependencies

Use Node.js 22, as specified in `.nvmrc`.

```sh
git clone https://github.com/rodneyg/SafeDose.git
cd SafeDose
npm ci
```

### 2. Run a target

- iOS (Xcode required) runs with `npm run ios`.
- Android (Android Studio required) runs with `npm run android`.
- Web runs with `npm run web`. Run `npm run changelog:build` first if you have edited the changelog Markdown.

### Environment setup

See [`.env.example`](.env.example) for the configuration used by the app and
server. Photo analysis requires the server route `/api/analyze-scan` and a
server-side `OPENAI_API_KEY`. Keep this key out of Expo config and
`EXPO_PUBLIC_` variables. On Vercel, configure the key for the environments
that serve the scan API. The Expo web server only serves the app. To test
photo scans on web, serve the API routes on the same origin as the app,
as the Vercel deployment does. The native app sends scans to the production
API. The server uses the model pinned in [the scan request](lib/scan/request.js).

⸻

📁 Directory Structure

```text
SafeDose/
├── app/                 # Screens and navigation
├── hooks/               # Camera + system hooks
├── assets/              # Icons and images
├── android/             # Android project files
├── ios/                 # iOS project files
├── docs/                # Documentation
│   ├── auth-config.md   # Authentication configuration
│   ├── MODEL_FINE_TUNING_GUIDE.md  # Complete fine-tuning guide
│   └── FINE_TUNING_QUICK_START.md  # Quick start guide
├── evals/               # Evaluation framework
│   ├── test-sets/       # Evaluation test cases
│   ├── exported-data/   # Output from the sample evaluation exporter
│   └── README.md        # Evaluation documentation
├── types/               # Global type definitions
├── Evals.md             # Evaluation framework overview
├── package.json         # Dependencies
├── app.config.js        # Expo app configuration
└── tsconfig.json        # TypeScript settings
```


⸻

## Model evaluation and scan data

SafeDose can save scan and calculation evaluation records locally. These
records can include inputs, results, quality metadata, and the scan image. For signed-in
users, SafeDose can also send evaluation records to Firestore with image
metadata in place of the image itself.

The scan feature sends the photo to SafeDose's analysis API, which passes
it to OpenAI for analysis. See the [Privacy Policy](https://safedose.rodneygainous.com/privacy)
for details. See [the evaluation guide](Evals.md) for evaluation tools and
test data.

⸻

🤝 Contributing

We welcome contributions focused on safety, accessibility, and clarity.

Steps:
	•	Fork the repo
	•	Create a branch (git checkout -b your-feature)
	•	Commit your changes
	•	Submit a pull request

Please avoid introducing breaking changes or external dependencies unless necessary.

⸻

🛡 License

The project declares the MIT License. The full license text is currently absent from this repository.
By using this project, you agree not to market it as a certified medical device without independent validation and regulatory approval.

⸻

Built by SafeLab — advancing open tools for human systems.


### Changelog updates

- Published entries in `changelog/*.md` feed the public `/changelog` page.
  Each entry has `date`, `title`, and `status` frontmatter and bullets under
  New, Improved, or Fixed. Set `prs` to the PR numbers covered by the entry
  so manual backfills can skip them.
- When a non-bot PR from this repository merges into `main`, the Publish
  changelog Action uses the PR title for its entry, rebuilds
  `lib/changelog.json`, and commits both to `main`. The `skip-changelog`
  label skips this step. Fork PRs have read-only workflow tokens, so use the
  manual backfill steps below for recent fork merges. Author an entry directly
  if the merge predates the latest published UTC date.
- For manual backfills, run `npm run changelog:add` with an authenticated
  GitHub CLI. It drafts missing entries from the latest published UTC date
  onward, including that date, and deduplicates by PR number. It uses
  `## Changelog` bullets when present and otherwise uses the PR title.
- Review the wording, keep user-facing entries, set `status: published`,
  and run `npm run changelog:build` to refresh `lib/changelog.json`. Web
  builds regenerate it as well.
- Vercel can skip a production build when the diff from the last successful
  deployment contains only changelog entries or other non-runtime files. The
  scheduled workflow batches pending entries into a deploy commit after a
  15-minute quiet period or when the oldest pending entry reaches 60 minutes.
  A regular production build can ship those entries sooner.

### Read-only production smoke

```sh
npm install
npx playwright install chromium
git fetch origin main
npm run smoke:prod
```

The default target is `https://safedose.rodneygainous.com`. To check a local
fixture or another public deployment, pass a bare HTTP(S) origin:
`npm run smoke:prod -- http://127.0.0.1:3000`.

The script checks welcome, onboarding, pricing (monthly and yearly Photo Scan
plans), login, changelog, privacy, terms and support. Each route must render its
expected text without console errors, uncaught exceptions or HTTP 4xx/5xx
responses or HTML returned for scripts or styles. Each route uses fresh headless Chromium state with service workers
blocked. The browser loads public assets and Firebase configuration. Guest auth,
Firebase installation and supported analytics requests receive local fixture
responses. The Vercel analytics script is also stubbed. The smoke creates no
guest accounts and sends no analytics events.

The only live POST sends `{}` to `/api/analyze-scan` and expects a 4xx validation
response (HTTP 400). No images, keys, sign-in, checkout or authenticated
features are used.
The smoke runner checks `/api/health` for HTTP 200 and `ok: true` when
`api/health.js` exists on the locally fetched `origin/main`. It reports a
skip if the file is absent and a failure if the main ref is missing.

Checks print PASS/FAIL, with a nonzero exit code for any failure. Response bodies
and page contents are never printed. Browser exception diagnostics are sanitized. This limited smoke does
not establish that photo inference or checkout works. Test the smoke runner
against local HTTP fixtures with `node --test scripts/prod-smoke.test.mjs`.

### Check the deployed ping endpoint

```sh
curl --fail --silent --show-error -i https://safedose.rodneygainous.com/api/ping
```

Expect HTTP 200, `Cache-Control: no-store`, and the JSON body
`{"ok":true,"message":"pong"}`. Use the same path on a preview deployment
to check whether it responds.

### Web preview smoke in GitHub Actions

When Vercel reports a successful preview deployment, the workflow verifies
that the URL and commit match a successful GitHub deployment before starting
headless Chromium. The check verifies the commit reported by `/api/health`,
waits for the app to reach `/onboarding`, and clicks the primary button to
reach `/onboarding/age`. The browser allows only same-origin reads and stops
before entering any data. The job uses no model calls or application credentials.

To run it on protected previews, create a Protection Bypass for Automation
secret in the SafeDose Vercel project and add it to GitHub Actions as
`VERCEL_AUTOMATION_BYPASS_SECRET`. The workflow skips before installing
dependencies if the secret is missing or the optional repository variable
`PREVIEW_SMOKE_ENABLED` is set to `false`. The reason appears in the run
summary. Production and skipped Vercel builds do not trigger this check.
