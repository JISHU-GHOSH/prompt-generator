# PromptForge AI 🚀
### Professional Coding Prompt Generator & Technical Spec Compiler (Chrome Extension)

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-brightgreen.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![React 18](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8.svg)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-2-yellow.svg)](https://vitest.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

**PromptForge AI** is a privacy-first, developer-focused Google Chrome extension (Manifest V3) that turns casual, vague coding ideas into production-grade, highly structured technical prompts and architecture specifications for AI coding tools like ChatGPT, Claude, Gemini, Cursor, Copilot, and GitHub.

---

## 🌟 Why PromptForge AI?

Vague prompts lead to hallucinated logic, missing edge cases, and incomplete boilerplate when prompting modern LLMs. **PromptForge AI** bridges this gap by acting as an intelligent prompt compilation and refinement layer:

- **Structure & Precision**: Enforces architectural context, technical stack constraints, edge cases, error handling, security considerations, and concrete acceptance criteria.
- **Side Panel Workflow**: Lives right alongside your code editors and browser tabs using Chrome's native Side Panel API (`chrome.sidePanel`).
- **In-Page Magic Wand**: Seamlessly detects prompt inputs on ChatGPT, Claude, Gemini, and GitHub, enhancing drafts in-place with a single click.
- **100% Privacy & BYOK**: Zero third-party proxy servers. Your API keys and prompts are stored locally in your browser (`chrome.storage`) and communicate directly with official provider endpoints.

---

## ✨ Features

### 1. 🎛️ Side Panel Studio (`chrome.sidePanel`)
- **Interactive Prompt Studio**: Input casual ideas, specify target tech stacks (e.g. Next.js, Node.js, FastAPI, Rust, Go, Python), select LLM targets, and adjust detail level.
- **Template Library**: Curated, battle-tested prompt templates:
  - *Full-Stack Feature Specification*
  - *System Architecture & API Design*
  - *Unit & Integration Test Suite*
  - *Database Schema & Migration*
  - *Bug Investigation & Root Cause Analysis*
  - *Refactoring & Code Modernization*
- **Local Prompt History**: Searchable, timestamped history saved in `chrome.storage.local` with one-click copy and instant reload into the editor.
- **Copy & Export**: Instant Markdown copy to clipboard with visual toast confirmations.

### 2. 🪄 In-Page Magic Wand
- Automatically attaches an interactive magic wand button to text inputs on:
  - **ChatGPT** (`https://chatgpt.com/*`)
  - **Claude** (`https://claude.ai/*`)
  - **Google Gemini** (`https://gemini.google.com/*`)
  - **GitHub Discussions / Issues / PRs** (`https://github.com/*`)
- Click the wand to compile your rough thought into an exhaustive technical prompt without ever leaving the page.

### 3. 🔑 Bring Your Own Key (BYOK)
- Connect directly to:
  - **Google Gemini** (Gemini 1.5 Flash / Gemini 1.5 Pro) — *Generous Free Tier available!*
  - **OpenAI** (GPT-4o, GPT-4o-mini)
  - **Anthropic** (Claude 3.5 Sonnet, Claude 3.5 Haiku)
- Direct HTTPS calls from the extension background service worker with zero middleman or telemetry.

---

## 🚀 Quick Start Guide (Load Unpacked in Chrome)

Follow these steps to build and load the extension in developer mode on Google Chrome, Brave, Arc, or Microsoft Edge:

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or later recommended)
- `npm` (bundled with Node.js)

### Step 1: Clone and Install Dependencies
```bash
git clone https://github.com/JISHU-GHOSH/prompt-generator.git
cd prompt-generator
npm install
```

### Step 2: Build the Extension
```bash
npm run build
```
This runs TypeScript validation (`tsc --noEmit`) and builds all extension bundles via Vite into the `dist/` directory.

### Step 3: Load into Chrome
1. Open Google Chrome and navigate to:
   ```text
   chrome://extensions
   ```
2. In the top-right corner, toggle **Developer mode** to **ON**.
3. In the top-left corner, click the **Load unpacked** button.
4. In the file picker dialog, navigate to your repository and select the **`dist`** directory (e.g. `c:\Users\...\prompt-generator\dist`).
5. Click **Select Folder**.
6. PromptForge AI is now loaded! You will see **PromptForge AI - Professional Coding Prompt Generator** in your extensions list.

### Step 4: Pin and Open PromptForge AI
1. Click the puzzle icon (Extensions menu) in the Chrome toolbar.
2. Find **PromptForge AI** and click the **Pin** icon.
3. Click the PromptForge AI icon to immediately open the Side Panel Studio, or open any supported AI web app (ChatGPT, Claude, Gemini, GitHub) to use the in-page Magic Wand.

---

## 🔑 Getting & Configuring API Keys

PromptForge AI allows you to use your preferred LLM provider. We recommend **Google Gemini** because Google provides a high-quota **free tier** that does not require entering a credit card.

### 1. Google Gemini (Recommended & Free)
1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google account.
3. Click **Get API key** in the left sidebar or top toolbar.
4. Click **Create API key** (choose any existing Google Cloud project or create a default one).
5. Copy your new Gemini API key.
6. Open the PromptForge AI Side Panel, switch to the **Settings** tab.
7. Select **Google Gemini** under AI Provider, paste your key, and click **Save Settings**.
> **Free Tier Quota**: Google Gemini 1.5 Flash provides up to 15 Requests Per Minute (RPM), 1,000,000 Tokens Per Minute (TPM), and 1,500 Requests Per Day for free.

### 2. OpenAI (GPT-4o)
1. Go to the [OpenAI Platform API Keys](https://platform.openai.com/api-keys).
2. Sign in and click **Create new secret key**.
3. Copy the key (`sk-...`).
4. In PromptForge AI Settings, choose **OpenAI**, paste your API key, and click **Save Settings**.

### 3. Anthropic (Claude 3.5 Sonnet)
1. Go to the [Anthropic Console](https://console.anthropic.com/).
2. Navigate to **API Keys** and generate a new key (`sk-ant-...`).
3. In PromptForge AI Settings, choose **Anthropic**, paste your API key, and click **Save Settings**.

---

## 🛠️ Development & Testing

### Available Commands

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Vite development server |
| `npm run build` | Compiles TypeScript and packages extension to `dist/` |
| `npm test` | Runs the full Vitest automated test suite |
| `npm run generate-icons` | Generates official PNG icon set in `public/icons/` |

### Running the Test Suite
```bash
npm test
```
Runs 95+ unit and component tests verifying:
- Manifest V3 configuration and asset integrity
- Local and sync storage management
- Meta-prompt compiler logic and token limits
- Gemini, OpenAI, and Anthropic API clients and error handlers
- Background Service Worker message passing and life cycle
- Side Panel React components, tabs, history, and template selection
- In-Page Content Script DOM injection, observers, and textarea synchronization

---

### 📁 Project Structure

```text
prompt-generator/
├── manifest.json              # Extension Manifest V3 configuration
├── vite.config.ts             # Vite multi-page build configuration
├── tailwind.config.js         # Tailwind CSS styling configuration
├── public/
│   └── icons/                 # Extension PNG icons (16px, 48px, 128px)
├── src/
│   ├── background/
│   │   └── service-worker.ts  # Background worker, API router & sidepanel opener
│   ├── content/
│   │   ├── content-script.ts  # In-page magic wand overlay & site adapters
│   │   └── content.css        # Animations & styles for floating wand
│   ├── sidepanel/
│   │   ├── index.html         # HTML entry point for Chrome Side Panel
│   │   ├── main.tsx           # React root mount
│   │   ├── App.tsx            # Main application UI with tabs & state
│   │   ├── components/        # Studio, Templates, History, Settings views
│   │   └── index.css          # Tailwind CSS styles
│   └── services/
│       ├── ai/                # BYOK clients for Gemini, OpenAI & Anthropic
│       ├── prompt-engine/     # Meta-prompt compilation & template engine
│       └── storage.ts         # Chrome storage wrapper (chrome.storage.local)
├── tests/                     # Comprehensive Vitest test suite
│   ├── ai-client.test.ts
│   ├── content-script.test.ts
│   ├── manifest.test.ts
│   ├── prompt-compiler.test.ts
│   ├── service-worker.test.ts
│   ├── sidepanel.test.tsx
│   └── storage.test.ts
└── dist/                      # Production-ready loadable extension package
    ├── manifest.json
    ├── src/
    │   ├── background/service-worker.js
    │   ├── content/content-script.js
    │   ├── content/content.css
    │   └── sidepanel/index.html
    ├── assets/
    └── icons/
```

---

## 🔒 Security & Privacy

- **No Third-Party Backend**: PromptForge AI operates entirely on-device and communicates directly with official LLM endpoints.
- **Secure Key Storage**: API keys are stored in `chrome.storage.local` within your browser's encrypted profile directory.
- **Scoped Permissions**: Requests only `sidePanel`, `storage`, and `activeTab` permissions, plus explicitly defined host permissions for LLM provider APIs.

---

## 📄 License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.
