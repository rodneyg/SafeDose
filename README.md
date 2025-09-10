# SafeDose

**An educational, AI-assisted dose calculation learning tool for injectable compounds.**  
Created by **SafeLab**, SafeDose transforms complex calculations into clear, visual educational demonstrations.

Whether you're learning about mg/ml conversions, reconstitution principles, or understanding syringe measurements, SafeDose helps you visualize and understand these educational concepts.

---

## ⚠️ Educational Tool Disclaimer

> **This is an educational calculation tool for informational purposes only.**
>
> SafeDose is an educational utility designed to help users understand injection dose calculations. It is NOT a medical device and is NOT intended to diagnose, treat, prescribe, or provide medical advice. This tool should NEVER be used as a substitute for professional medical judgment or consultation.
>
> **All calculations must be independently verified by qualified professionals before any use.** This educational tool is designed to supplement learning and understanding, not replace professional guidance.
>
> Use is strictly at your own risk. SafeLab and contributors assume no responsibility for misuse, and users acknowledge this is for educational purposes only.

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
By using this project, you agree not to market it as a medical device without independent validation and regulatory approval. This educational tool is designed for learning purposes only and all calculations must be verified by qualified professionals.

⸻

Built by SafeLab — advancing open tools for human systems.

