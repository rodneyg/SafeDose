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

## ⚠️ AI Usage and Safety Protocols

**Assistive Technology Only:** This AI tool is designed to be an assistive technology. It is intended to support healthcare professionals in their decision-making process, not to replace their expertise or judgment.

**Embedded Safety Features:**
*   **Pre-Dose Review:** All AI-generated dosage recommendations undergo a mandatory review step by a qualified healthcare professional before administration. This ensures human oversight and allows for adjustments based on individual patient needs and clinical context.
*   **Hard Stops:** The system includes built-in hard stops for critical parameters. These are predefined limits and conditions that, if met or exceeded, will prevent the AI from making a recommendation or prompt immediate human intervention. This is designed to prevent egregious errors.

**Not a Replacement for Professional Medical Advice:** This tool is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition. Never disregard professional medical advice or delay in seeking it because of something you have read or interpreted from this tool.

**Open-Source Review Flow for Critical Logic:** The core logic and algorithms underpinning critical calculations (e.g., dosage calculations, risk assessments) are developed under an open-source model. This means the code is publicly available for review, scrutiny, and contribution by the broader medical and software engineering community. This transparent process invites independent verification and helps to identify and mitigate potential risks or biases in the AI's decision-making. We encourage peer review and contributions to ensure the highest standards of safety and efficacy.

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
