# SafeDose

**A visual, AI-assisted dose calculator for injectable medications.**  
Created by **SafeLab**, SafeDose transforms confusing math and manual conversions into clear, visual dosing guidance.

Whether you're working with mg/ml, reconstituted peptides, or insulin units, SafeDose helps you calculate and visualize your exact syringe draw.

---

## ⚠️ Disclaimer

> **This tool is a research preview and educational utility.**
>
> SafeDose is not a medical device and is not intended to diagnose, treat, or prescribe. It should not be used as a substitute for professional medical judgment. All results must be independently verified by a licensed medical professional.
>
> Use at your own risk. SafeLab and contributors assume no responsibility for misuse.

---

## ✨ Features

SafeDose offers a range of features to simplify medication dosing:

*   **Versatile Dose Calculations:**
    *   Calculate required dosage volume based on medication concentration.
    *   Determine dosage from the total amount of medication in a vial and the volume of solution added.
*   **Reconstitution Planner:**
    *   Plan how to reconstitute powdered medication to achieve a desired dose and injection volume.
*   **Supported Units:**
    *   **Dose Units:** mg, mcg, units, mL
    *   **Concentration Units:** mg/mL, mcg/mL, units/mL
*   **Syringe Compatibility:**
    *   Supports calculations for both Standard (mL) and Insulin (units) syringes.

---

## 🚀 Hosted Version

A hosted version of SafeDose: https://app.safedoseai.com/

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

Note: To use the AI-powered scan feature, you’ll need your own OpenAI API Key.

⸻

🔧 Environment Setup

Create a `.env` file in the root by copying `.env.example`:
```bash
cp .env.example .env
```

Then, populate the `.env` file with your specific keys and configurations:

# OpenAI API Key (for AI-powered scan feature)
OPENAI_API_KEY=your_openai_api_key

# Stripe Configuration (for premium features/subscriptions)
STRIPE_MODE=test # or 'live'
STRIPE_TEST_PUBLISHABLE_KEY=pk_test_...
STRIPE_TEST_SECRET_KEY=sk_test_...
STRIPE_TEST_PRICE_ID=price_...
STRIPE_LIVE_PUBLISHABLE_KEY=pk_live_...
STRIPE_LIVE_SECRET_KEY=sk_live_...
STRIPE_LIVE_PRICE_ID=price_...
# Legacy Stripe Keys (if applicable)
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Firebase Configuration (for backend services like auth and database)
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
FIREBASE_MEASUREMENT_ID=your_measurement_id # Optional

# Google OAuth Configuration (for Google Sign-In)
GOOGLE_WEB_CLIENT_ID=your_google_web_client_id.apps.googleusercontent.com
GOOGLE_ANDROID_CLIENT_ID=your_google_android_client_id.apps.googleusercontent.com
GOOGLE_IOS_CLIENT_ID=your_google_ios_client_id.apps.googleusercontent.com

Make sure to replace placeholder values with your actual credentials.



⸻

📁 Directory Structure

rodneyg-safedose/
├── app/                 # Screens and navigation
├── assets/              # Icons and images
├── components/          # Reusable UI components for building screens
├── docs/                # Documentation
│   └── auth-config.md   # Authentication configuration info
├── hooks/               # Camera + system hooks (distinct from lib/hooks)
├── ios/                 # iOS project files
├── lib/                 # Core logic, utilities, and hooks
│   ├── doseUtils.ts     # Contains core dose calculation logic
│   ├── hooks/           # Custom React hooks for app logic
│   │   ├── useDoseCalculator.ts    # Manages state and logic for the main dose calculation flow
│   │   └── useReconstitutionPlanner.ts # Manages state and logic for the reconstitution planning flow
├── android/             # Android project files
├── types/               # Global type definitions
├── package.json         # Dependencies
├── app.config.js        # Expo app configuration
├── tsconfig.json        # TypeScript settings



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

