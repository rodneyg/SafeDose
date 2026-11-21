# SafeDose

[![CI](https://github.com/rodneyg/SafeDose/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/rodneyg/SafeDose/actions/workflows/ci.yml)

**A verification and calculation tool for administering injectable medications prescribed by your healthcare provider.**  
Created by **SafeLab**, SafeDose helps you verify medication materials, perform unit conversion calculations, and reduce math errors when executing your provider's prescription.

Whether you're working with mg/ml, reconstituted peptides, or insulin units, SafeDose helps you verify your materials match your prescription and calculate the volume to draw.

---

## 🔮 VisionOS Vision

SafeDose today works in two steps:

1. **Specify Dose**: The user enters their prescribed dose (e.g., "2.5 mg Semaglutide")
2. **Scan & Verify**: They scan their supplies. The app uses computer vision to identify the syringe and vial, which the user confirms. It then calculates the volume to draw based on the verified information.

This mobile design is deliberate. It ensures SafeDose knows the intended dose before analyzing supplies, and it uses a guided verification flow with user confirmation at each step.

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

Every merge to `main` creates a semver tag and a GitHub Release. The bump is a patch by default. Add a `minor` or `major` label on the PR, or start the title with `feat:` or `feat!:`, to bump those instead.

To put a previous tagged build back on production:

```bash
npm run rollback -- v1.0.0
```

Use `--dry-run` to print the Vercel promotion command without changing production. See [ROLLBACK.md](ROLLBACK.md) for details.


---

## 💻 Local Development

To run the open-source version locally:

### 1. Clone the repo
```bash
git clone https://github.com/your-org/rodneyg-safedose.git
cd rodneyg-safedose

2. Install dependencies

npm install

3. iOS (Xcode required)

npx pod-install
npx expo run:ios

4. Android (Android Studio required)

npx expo run:android

5. Web (experimental)

npx expo start --web

Note: The AI-powered scan feature calls a server route (`/api/analyze-scan`) that reads `OPENAI_API_KEY` on the server. Do not put this key in `app.config.js` extra or prefix it with `EXPO_PUBLIC_`.

⸻

🔧 Environment Setup

Create a `.env` file in the root for local API routes and the vision eval CLI:

```
# Server-side only — never exposed to the browser
OPENAI_API_KEY=your-openai-key-here
```

On Vercel, set `OPENAI_API_KEY` as a server Environment Variable for Production, Preview, and Development (not a client/`EXPO_PUBLIC_` variable).



⸻

📁 Directory Structure

rodneyg-safedose/
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
├── tsconfig.json        # TypeScript settings



⸻

📊 Model Improvement & Evaluation

SafeDose automatically captures user interactions to continuously improve AI accuracy:

- **Automatic Data Capture**: Every dose calculation and AI scan is saved locally
- **Quality Scoring**: Automatic filtering ensures only high-quality examples for training
- **Easy Export**: One-click export to training-ready format for model fine-tuning
- **Privacy-First**: Images stored locally only, no personal data transmitted

**Resources**:
- **Quick Start**: [docs/FINE_TUNING_QUICK_START.md](docs/FINE_TUNING_QUICK_START.md) - 5-minute guide
- **Complete Guide**: [docs/MODEL_FINE_TUNING_GUIDE.md](docs/MODEL_FINE_TUNING_GUIDE.md) - Full instructions
- **Evaluation Framework**: [Evals.md](Evals.md) - Testing and benchmarking

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

MIT License.
By using this project, you agree not to market it as a certified medical device without independent validation and regulatory approval.

⸻

Built by SafeLab — advancing open tools for human systems.


### Changelog updates
- `changelog/*.md` is the source of truth for public `/changelog`; entries use date, title, status, prs frontmatter and New/Improved/Fixed bullet groups.
- Run `npm run changelog:add` with authenticated GitHub CLI to draft merged PRs since the latest published date; same-day PRs are deduplicated by number.
- On merges to main, the Draft changelog Action uses only GITHUB_TOKEN to push a `changelog/pr-*` branch and open a draft PR, preferring a `## Changelog` section over the PR title.
- Review user-facing wording, discard internal-only drafts, set `status: published`, and run `npm run changelog:build` to refresh `lib/changelog.json`; web builds regenerate it too.
- If repository policy blocks token-created PRs, the pushed draft branch remains available for a manual PR. No secrets or setting changes are needed; changelog branches do not trigger more drafts.

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

The script checks welcome, onboarding, pricing (monthly and yearly Photo Check
plans), login, changelog, privacy, terms and support. Each route must render its
expected text without console errors, uncaught exceptions or HTTP 4xx/5xx
responses or HTML returned for scripts or styles. Each route uses fresh headless Chromium state with service workers
blocked. The browser loads public assets and Firebase configuration. Guest auth,
Firebase installation and analytics requests receive local fixture responses, so
the smoke creates no guest accounts and sends no analytics events.

The only live POST sends `{}` to `/api/analyze-scan` and expects a 4xx validation
response. No images, keys, sign-in, checkout or authenticated features are used.
`/api/health` is requested only when `api/health.js` exists in the locally fetched
`origin/main`; otherwise the script prints SKIP. Fetch main first to make that
check current. A missing main ref is a failure. Health currently follows draft
PR #450's `HTTP 200` and `ok: true` contract without adopting its code.

Checks print PASS/FAIL, with a nonzero exit code for any failure. Response bodies
and page contents are never printed. Browser exception diagnostics are sanitized. This limited smoke does
not establish that photo inference or checkout works. Test the smoke runner
against local HTTP fixtures with `node --test scripts/prod-smoke.test.mjs`.

### Web preview smoke in GitHub Actions

After this workflow is on the default branch, Vercel's successful Preview
deployment event starts one headless Chromium check. It checks `/api/health`
against the deployed commit, opens the app, and clicks **Try Now** to reach
the age step. The browser allows only same-origin reads and stops before
entering any data. The job uses no model calls or application credentials.

To run it on protected previews, create a Protection Bypass for Automation
secret in the SafeDose Vercel project and add it to GitHub Actions as
`VERCEL_AUTOMATION_BYPASS_SECRET`. The workflow skips before installing
dependencies if the secret is missing or the optional repository variable
`PREVIEW_SMOKE_ENABLED` is set to `false`. The reason appears in the run
summary. Production and skipped Vercel builds do not trigger this check.
