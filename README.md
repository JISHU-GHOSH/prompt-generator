# PromptForge AI 🚀
### Professional Coding Prompt Generator & Technical Spec Compiler (Chrome Extension)

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-brightgreen.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![React 18](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8.svg)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-2-yellow.svg)](https://vitest.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

**PromptForge AI** is a privacy-first, developer-focused Google Chrome extension (Manifest V3) that turns casual, vague coding ideas into production-grade, highly structured technical prompts and architecture specifications for AI coding tools like ChatGPT, Claude, Gemini, Cursor, Copilot, and GitHub.

Now featuring an **instant, zero-key multi-model failover engine**: PromptForge AI works right after installation with **no API keys required**, powered by **LLaMA 3.3 70B** with transparent self-healing failover to **Gemini 3.8 Flash**, **Gemini 2.5 Flash**, and an **Offline Deterministic Synthesizer**.

---

## 🌟 Why PromptForge AI?

Vague prompts lead to hallucinated logic, missing edge cases, and incomplete boilerplate when prompting modern LLMs. **PromptForge AI** bridges this gap by acting as an intelligent prompt compilation and refinement layer:

- **Zero-Key Out of the Box**: Start generating high-precision coding prompts immediately upon installation—no setup gates or required API keys.
- **Multi-Model Self-Healing Failover**: Cascades across high-speed cloud LLMs and an offline synthesizer so your workflow is never interrupted by rate limits or network dropouts.
- **Structure & Precision**: Enforces architectural context, technical stack constraints, edge cases, error handling, security considerations, and concrete acceptance criteria.
- **Side Panel Workflow**: Lives right alongside your code editors and browser tabs using Chrome's native Side Panel API (`chrome.sidePanel`).
- **In-Page Magic Wand**: Seamlessly detects prompt inputs on ChatGPT, Claude, Gemini, and GitHub, enhancing drafts in-place with a single click.
- **100% Privacy & Optional BYOK**: Zero third-party proxy servers. Your prompts and optional custom API keys are stored locally in your browser (`chrome.storage.local`) and communicate directly with official provider endpoints.

---

## ⚡ Zero-Key Multi-Model Failover Architecture

PromptForge AI features an autonomous, multi-tier cascade engine designed to maximize speed, quality, and reliability:

```
┌────────────────────────────────────────────────────────┐
│               User Prompt Enhancement Request          │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
      ┌───────────────────────────────────────────┐
      │  ⚡ Tier 1: LLaMA 3.3 70B (Groq Cloud)    │ ───► Success (Ultra-fast ~300ms)
      │  `llama-3.3-70b-versatile`                │
      └─────────────────────┬─────────────────────┘
                            │ (429 Rate Limit / 5xx Error)
                            ▼
      ┌───────────────────────────────────────────┐
      │  ✨ Tier 2: Gemini 3.8 Flash              │ ───► Success (Google AI Studio)
      │  `gemini-3.8-flash`                       │
      └─────────────────────┬─────────────────────┘
                            │ (429 Quota / 5xx Error)
                            ▼
      ┌───────────────────────────────────────────┐
      │  ✨ Tier 3: Gemini 2.5 Flash              │ ───► Success (High Quota Cloud)
      │  `gemini-2.5-flash`                       │
      └─────────────────────┬─────────────────────┘
                            │ (Network Offline / Service Error)
                            ▼
      ┌───────────────────────────────────────────┐
      │  🛡️ Tier 4: Offline Deterministic Engine  │ ───► Instant On-Device Spec
      │  Zero-network structural prompt compiler  │
      └───────────────────────────────────────────┘
```

1. ⚡ **LLaMA 3.3 70B** (`llama-3.3-70b-versatile` via Groq Cloud):
   - **Primary Engine**: Ultra-fast inference (~300 tokens/sec), uncensored developer prompt engineering, and deep technical instruction following.
2. ✨ **Gemini 3.8 Flash** (`gemini-3.8-flash` via Google Generative Language):
   - **First Automatic Fallback**: Advanced multimodal reasoning model that seamlessly picks up requests if Groq encounters rate limits (HTTP 429) or transient 5xx server errors in under 50ms.
3. ✨ **Gemini 2.5 Flash** (`gemini-2.5-flash`):
   - **Second Automatic Fallback**: Ultra-high quota model ensuring cloud generation redundancy under heavy traffic.
4. 🛡️ **Deterministic Offline Synthesizer**:
   - **Zero-Network Safeguard**: Generates comprehensive, production-grade technical specs fully on-device if you are offline or all cloud networks are unreachable.
5. 🏷️ **Real-Time Model Badges**:
   - The Studio output viewer displays dynamic badges (e.g. `⚡ LLaMA 3.3`, `✨ Gemini 3.8`, `✨ Gemini 2.5`, or `🛡️ Local Synthesizer`) so you always know which model fulfilled your request.

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
- **Local Prompt History**: Searchable, timestamped history saved in `chrome.storage.local` with one-click copy, active model metadata, and instant reload into the editor.
- **Copy & Export**: Instant Markdown copy to clipboard with visual toast confirmations.

### 2. 🪄 In-Page Magic Wand
- Automatically attaches an interactive magic wand button to text inputs on:
  - **ChatGPT** (`https://chatgpt.com/*`)
  - **Claude** (`https://claude.ai/*`)
  - **Google Gemini** (`https://gemini.google.com/*`)
  - **GitHub Discussions / Issues / PRs** (`https://github.com/*`)
- Click the wand to compile your rough thought into an exhaustive technical prompt without ever leaving the page.

### 3. 🔑 Bring Your Own Key (BYOK) — Optional Power Mode
- While PromptForge AI works out of the box with zero keys, power users can configure custom API keys in the **Settings** tab for direct access:
  - **Groq Cloud** (LLaMA 3.3 70B, LLaMA 3.1 8B)
  - **Google AI Studio** (Gemini 3.8 Flash, Gemini 2.5 Flash, Gemini 2.5 Pro)
  - **OpenAI** (GPT-4o, GPT-4o-mini)
  - **Anthropic** (Claude 3.5 Sonnet, Claude 3.5 Haiku)
- Direct HTTPS calls from the extension background service worker with zero middleman or telemetry.

---

## 🚀 Quick Start Guide (Load Unpacked in Chrome)

You can load and use PromptForge AI immediately in Google Chrome, Brave, Arc, or Microsoft Edge:

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
This runs TypeScript validation (`tsc --noEmit`) and compiles all extension bundles via Vite into the `dist/` directory.

### Step 3: Load into Chrome
1. Open Google Chrome and navigate to:
   ```text
   chrome://extensions
   ```
2. In the top-right corner, toggle **Developer mode** to **ON**.
3. In the top-left corner, click the **Load unpacked** button.
4. In the file picker dialog, select the **`dist`** directory (e.g. `c:\Users\...\prompt-generator\dist`).
5. Click **Select Folder**.
6. PromptForge AI is now loaded and ready! You will see **PromptForge AI - Professional Coding Prompt Generator** in your extensions list.

### Step 4: Pin and Open PromptForge AI
1. Click the puzzle icon (Extensions menu) in the Chrome toolbar.
2. Find **PromptForge AI** and click the **Pin** icon.
3. Click the PromptForge AI icon to open the Side Panel Studio.
4. Type any rough idea (e.g. *"JWT auth with refresh tokens in FastAPI"*) and click **⚡ Enhance with AI**.
5. **No API keys or configuration needed!** The multi-model engine will synthesize a complete technical specification in milliseconds.

---

## 🔑 Optional: Configuring Personal API Keys

If you have dedicated developer keys with higher rate limits, you can plug them into the **Settings** tab:

### 1. Groq Cloud (Free high-speed LLaMA 3.3 70B)
1. Go to [Groq Console](https://console.groq.com/keys).
2. Create and copy an API key (`gsk_...`).
3. In PromptForge AI **Settings**, expand **Custom API Keys**, select **Groq**, and paste your key.

### 2. Google AI Studio (Gemini 3.8 Flash / 2.5 Flash)
1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google account and click **Get API key**.
3. Copy your Gemini API key.
4. In PromptForge AI **Settings**, paste your key under **Google Gemini**.

### 3. OpenAI (GPT-4o)
1. Go to [OpenAI Platform API Keys](https://platform.openai.com/api-keys).
2. Generate a secret key (`sk-...`).
3. In PromptForge AI **Settings**, select **OpenAI**, paste your API key, and click **Save Settings**.

### 4. Anthropic (Claude 3.5 Sonnet)
1. Go to [Anthropic Console](https://console.anthropic.com/).
2. Generate a new key (`sk-ant-...`).
3. In PromptForge AI **Settings**, select **Anthropic**, paste your API key, and click **Save Settings**.

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
Runs 138+ automated unit and component tests verifying:
- **Failover Cascade**: Transparent switching from LLaMA 3.3 70B to Gemini 3.8, Gemini 2.5, and local synthesizer on rate limits or errors
- **Groq & Gemini Clients**: Streaming SSE parsing, model resolution, and status code classification
- **Manifest V3 Configuration**: Manifest validation and bundled asset integrity
- **Background Service Worker**: Message router, model tracking, and history persistence
- **Side Panel UI**: Zero-key studio workflow, model execution badges, templates, and history
- **In-Page Content Script**: Wand injection, site adapters (ChatGPT, Claude, Gemini, GitHub), and input synchronization
- **Storage Service**: Chrome storage wrapper, settings persistence, and history management

---

## 📁 Project Structure

```text
prompt-generator/
├── manifest.json              # Extension Manifest V3 configuration
├── vite.config.ts             # Vite multi-page build configuration
├── tailwind.config.js         # Tailwind CSS styling configuration
├── public/
│   └── icons/                 # Extension PNG icons (16px, 48px, 128px)
├── src/
│   ├── background/
│   │   └── service-worker.ts  # Background worker, failover router & sidepanel opener
│   ├── content/
│   │   ├── content-script.ts  # In-page magic wand overlay & site adapters
│   │   └── content.css        # Animations & styles for floating wand
│   ├── sidepanel/
│   │   ├── index.html         # HTML entry point for Chrome Side Panel
│   │   ├── main.tsx           # React root mount
│   │   ├── App.tsx            # Main application UI with tabs & state
│   │   ├── components/        # Studio, Templates, History, Settings, Badges
│   │   └── index.css          # Tailwind CSS styles
│   └── services/
│       ├── ai/                # FailoverRouter, Groq, Gemini, OpenAI & Anthropic clients
│       ├── prompt-engine/     # Meta-prompt compiler & template engine
│       └── storage.ts         # Chrome storage wrapper (chrome.storage.local)
├── tests/                     # 138+ automated Vitest tests
│   ├── ai-client.test.ts
│   ├── content-script.test.ts
│   ├── failover-router.test.ts
│   ├── groq-client.test.ts
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

- **No Third-Party Backend**: PromptForge AI operates directly from the browser to provider APIs with zero middleman proxy.
- **Secure Key Storage**: All settings and optional API keys are stored in `chrome.storage.local` within your browser's encrypted profile directory.
- **Zero-Key Privacy**: In default zero-key mode, prompt compilation requests flow directly to fast provider endpoints without storing any personal identifiers.
- **Scoped Permissions**: Requests only `sidePanel`, `storage`, and `activeTab` permissions, plus explicitly defined host permissions.

---

## 📄 License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.
