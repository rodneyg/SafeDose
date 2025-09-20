# SafeDose

**A visual, AI-assisted dose calculator for injectable medications.**  
Created by **SafeLab**, SafeDose transforms confusing math and manual conversions into clear, visual dosing guidance.

Whether you're working with mg/ml, reconstituted peptides, or insulin units, SafeDose helps you calculate and visualize your exact syringe draw.

---

## 🔮 VisionOS Vision

SafeDose today is a mobile-first product that guides users step by step in drawing safe and accurate doses from syringes and vials. This works by analyzing the initial camera capture and then moving the user through a structured flow, both because the accuracy of real-time continuous detection is not yet at the needed threshold, and because guidance (not replacement) is the safer paradigm for high-risk health tasks.

**The final vision, however, is a VisionOS-native experience:**

- **Smart Recognition**: Glasses identify the syringe type (e.g., 1 mL) and label it visually in the user's field of view.

- **Medication Verification**: Glasses identify the vial or ampule (e.g., insulin) and confirm the match.

- **Dynamic Guidance**: As the plunger is drawn, SafeDose overlays a dynamic guide: showing the exact target graduation, signaling when to stop, and highlighting overdrawn amounts with color and text cues.

- **Hands-Free Operation**: The user keeps their eyes up and hands on the tools, with no phone juggling, no guesswork, and no dependence on memory.

The goal is **user-led dosing**: visual proof at the moment that matters, in the same way WHOOP gives a live view of physiology or Function Health puts labs in your pocket.

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
│   └── auth-config.md   # Authentication configuration info
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

