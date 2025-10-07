# SafeDose

**A visual, AI-assisted dose calculator for injectable medications.**  
Created by **SafeLab**, SafeDose transforms confusing math and manual conversions into clear, visual dosing guidance.

Whether you're working with mg/ml, reconstituted peptides, or insulin units, SafeDose helps you calculate and visualize your exact syringe draw.

---

## 🔮 VisionOS Vision

SafeDose today works in two steps:

1. **Specify Dose**: The user first specifies their prescribed dose (e.g., "2.5 mg Semaglutide")
2. **Photo & Guidance**: They then take a photo of their supplies. The app identifies the syringe and vial from that capture and guides them step by step to prepare the correct dose

This mobile design is deliberate. It ensures SafeDose knows the intended dose before analyzing supplies, and it uses a guided flow because continuous recognition isn't reliable enough yet for dosing safety.

**The longer-term vision is a glasses-native workflow:**

1. **Specify Dose**: The user enters their drug + dose (e.g., "2.5 mg Semaglutide")

2. **Automatic Identification**: SafeDose labels the syringe type and confirms the vial in the user's field of view

3. **Guided Drawing**: As the plunger moves, overlays show where to stop, confirm when correct, and flag any overdraw

4. **Confirmation**: The correct dose is confirmed in real time, with optional logging for tracking

The current mobile flow is scaffolding. The end-state is an **eyes-up, real-time system** that recognizes tools directly in front of the user and provides immediate, unambiguous guidance.

---

## ⚠️ Disclaimer

> **This tool is a research preview and educational utility.**
>
> SafeDose is not a medical device and is not intended to diagnose, treat, or prescribe. It should not be used as a substitute for professional medical judgment. All results must be independently verified by a licensed medical professional.
>
> Use at your own risk. SafeLab and contributors assume no responsibility for misuse.
>
> Always consult a healthcare professional before administering any medication.

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

Create a .env file in the root:

OPENAI_API_KEY=your-openai-key-here



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
│   ├── exported-data/   # Captured user interaction data
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

