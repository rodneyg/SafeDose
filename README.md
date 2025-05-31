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

## 🚀 Hosted Version

A hosted version of SafeDose is **coming soon**.  
It will include:
- Built-in OCR for vials and syringes
- Secure cloud processing
- Instant dose visualization
- Preloaded medications and syringe presets

Stay tuned at [TBD)

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
│   └── components.md    # UI component documentation
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

