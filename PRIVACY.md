# Privacy Policy for PromptForge AI

> Last Updated: October 4, 2026

PromptForge AI ("we", "our", or "the extension") is a privacy-first developer productivity tool designed to help developers compile casual ideas into structured technical prompts and architecture specifications.

We are firmly committed to user privacy. This policy explains what information is processed by PromptForge AI and how it is handled.

---

### 1. Information We Do NOT Collect

- We do **not** collect or store personally identifiable information (PII) such as your name, email address, physical address, or phone number.
- We do **not** use tracking cookies, analytics SDKs, session recording tools, or third-party fingerprinting scripts.
- We do **not** sell, rent, or monetize your prompt data or personal information under any circumstances.

---

### 2. Information Processed Locally

All user preferences, custom configurations, and prompt history items are stored **exclusively within your local browser profile** using Chrome's native storage API (`chrome.storage.local` / `window.localStorage`):
- Selected compiler presets (e.g. Coding Agent, RFC Spec, Bug Fix, Cursor Rules)
- Configured target tech stacks (e.g. Python, React, TypeScript, FastAPI)
- Optional user-provided API keys (stored locally in encrypted browser profile storage)
- Local prompt history records (can be viewed, cleared, or deleted by you at any time)

---

### 3. AI Service Communication

When you choose to enhance a prompt:
- Your raw prompt text and selected compiler parameters are transmitted directly to the configured AI API provider (such as Groq Cloud, Google Generative AI, OpenAI, or Anthropic) or via our zero-key serverless relay endpoint solely to generate the compiled technical specification in real time.
- No prompt inputs are permanently logged or retained by PromptForge AI servers.
- When using the Offline Engine (`local-synthesizer`), all processing happens 100% on your local device with zero network communication.

---

### 4. Permissions Used

PromptForge AI requests only the minimal permissions required to deliver its core features:
- `sidePanel`: Displays the dedicated Studio interface inside Chrome's native side panel.
- `storage`: Persists your selected preferences and local history on your device.
- `activeTab`: Allows the in-page floating magic wand to detect prompt input fields on supported AI tools (ChatGPT, Claude, Gemini, GitHub) and insert enhanced prompts upon your explicit click.

---

### 5. Open Source Transparency

PromptForge AI is fully open source under the MIT License. The entire source code is publicly auditable on GitHub at:
[https://github.com/JISHU-GHOSH/prompt-generator](https://github.com/JISHU-GHOSH/prompt-generator)

---

### 6. Contact & Questions

If you have questions, feedback, or concerns regarding this privacy policy, please open an issue on our GitHub repository:
[https://github.com/JISHU-GHOSH/prompt-generator/issues](https://github.com/JISHU-GHOSH/prompt-generator/issues)
