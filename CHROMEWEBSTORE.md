# Chrome Web Store Listing — PromptForge AI

> Last Updated: 2026-10-04

This document is the single source of truth for publishing PromptForge AI to the Chrome Web Store. Use the exact text and metadata below when filling out the Chrome Developer Dashboard.

---

## 1. Store Listing Metadata

**Extension Name**
```text
PromptForge AI - Professional Coding Prompt Generator
```
*(53 characters. Allowed: up to 75 characters. Matches manifest.json)*

**Short Description**
```text
Turn casual ideas into professional, high-precision technical prompts and specs for AI coding tools like ChatGPT, Claude, and Cursor.
```
*(131 characters. Allowed: up to 132 characters. Specific about function and benefit).*

**Detailed Description**
*(Copy and paste the exact text below into the Detailed Description box. Note: The Chrome Web Store review system prefers plain line breaks over markdown asterisks).*

```text
PromptForge AI transforms casual, vague programming thoughts into production-ready, highly structured technical prompts and architectural specifications for AI coding tools like ChatGPT, Claude, Cursor, and GitHub Copilot.

Stop getting generic boilerplate and missing edge cases from AI coding models. PromptForge AI acts as your senior technical lead and prompt compiler, automatically injecting architectural constraints, data validation schemas, error handling boundaries, testing requirements, and modern design patterns into every prompt.

KEY FEATURES

• Zero-Key Instant Generation: Works immediately upon installation without requiring personal API keys, powered by fast 120-billion parameter reasoning models.
• Smart In-Page Floating Wand: Appears seamlessly inside prompt inputs on ChatGPT, Claude, Gemini, and GitHub, allowing you to enhance drafts with a single click.
• Native Side Panel Studio: Lives right beside your active code editor or browser tabs for distraction-free prompting and iterative spec refinement.
• Four Specialized Engineering Presets: Switch between Coding Agent (Cursor/Claude Code), RFC Architecture Spec, Bug Investigation & Root Cause Diagnosis, and Strict IDE Rules (.cursorrules).
• Automatic Multi-Model Redundancy: Cascades through ultra-fast cloud reasoning engines and includes an offline synthesizer so your workflow is never interrupted by rate limits or offline status.
• 100% Privacy-First Architecture: Your prompts and optional private API keys are saved strictly in your local browser storage. We run zero tracking scripts, collect zero personal telemetry, and never sell user data.

HOW TO USE IT

1. Click the PromptForge AI icon in your toolbar to open the Side Panel, or use the floating magic wand directly inside ChatGPT, Claude, Gemini, or GitHub.
2. Type or paste your casual idea (for example: "python app for sorting shopping list and prices").
3. Select your target tech stack chips (e.g. Python, React, FastAPI, Docker) and choose a compiler preset.
4. Click Enhance Prompt (or press Ctrl + Enter).
5. Copy the compiled technical specification directly into your AI coding tool.

SUPPORT & PRIVACY

PromptForge AI is an open-source, privacy-first developer utility. All settings, custom keys, and prompt histories remain strictly on your local device. For issues, source code, and feature requests, visit our project repository at https://github.com/JISHU-GHOSH/prompt-generator.
```

**Category**
```text
Developer Tools
```

**Single Purpose**
```text
Transforms casual coding ideas into structured, professional technical prompts and architecture specifications for AI coding tools.
```

**Primary Language**
```text
English
```

---

## 2. Graphics & Store Assets

| Asset | Dimensions | Status | Location / Notes |
| :--- | :--- | :--- | :--- |
| **Store Icon** [REQUIRED] | 128×128 PNG | ✅ Ready | `public/icons/icon-128.png` |
| **Screenshot 1** [REQUIRED] | 1280×800 PNG | 🟡 Prepare | Side Panel Studio showing a compiled prompt with tech stack chips and model badge |
| **Screenshot 2** [RECOMMENDED] | 1280×800 PNG | 🟡 Prepare | In-page Floating Magic Wand enhancing a prompt inside ChatGPT / Claude |
| **Screenshot 3** [RECOMMENDED] | 1280×800 PNG | 🟡 Prepare | Settings Tab showing zero-key auto-failover and optional BYOK configuration |
| **Small Promo Tile** [RECOMMENDED] | 440×280 PNG | 🟡 Optional | Extension logo with tagline on dark background |
| **Marquee Promo Tile** | 1400×560 PNG | 🟡 Optional | Hero banner for featured store placements |

---

## 3. Permissions Justifications (CWS Review Team Compliance)

*Copy-paste these exact justifications into the Chrome Developer Dashboard under "Permissions Justifications". Vague justifications like "needed for app to work" will cause review rejection.*

| Permission | Type | Exact Justification for Reviewer |
| :--- | :--- | :--- |
| `sidePanel` | permissions | Enables the dedicated PromptForge AI Studio UI inside Chrome's native side panel so developers can craft and copy prompts without leaving their active tabs. |
| `storage` | permissions | Saves user preferences (active compiler preset, target tech stack selections) and local prompt history in encrypted browser storage (`chrome.storage.local`). |
| `activeTab` | permissions | Allows the in-page magic wand button to read the user's draft prompt from the active ChatGPT/Claude/Gemini/GitHub tab and insert the enhanced prompt upon explicit user click. |
| `https://api.groq.com/*` | host_permissions | Connects to the Groq Cloud API to run ultra-fast inference on open-weights reasoning models (`openai/gpt-oss-120b`, `llama-3.3-70b-versatile`) for prompt compilation. |
| `https://generativelanguage.googleapis.com/*` | host_permissions | Connects to Google Generative AI to provide seamless automatic failover via Gemini 3.8 and Gemini 2.5 Flash if rate limits or network errors occur. |
| `https://api.openai.com/*` | host_permissions | Optional BYOK endpoint allowing users to generate prompts using their personal OpenAI API keys and custom models if selected in Settings. |
| `https://api.anthropic.com/*` | host_permissions | Optional BYOK endpoint allowing users to generate prompts using their personal Anthropic Claude API keys and custom models if selected in Settings. |

---

## 4. Privacy & Data Use Declarations

Fill out the **Privacy Practices** tab in the Developer Dashboard as follows:

1. **Single Purpose Description:**
   > PromptForge AI compiles casual user ideas into structured, professional technical prompts and architecture specifications for AI coding tools.

2. **Data Collection Disclosures:**
   - **Personally Identifiable Information (PII):** `No` (None collected)
   - **Health Information:** `No`
   - **Financial and Payment Information:** `No`
   - **Authentication Information:** `No` (User API keys are stored strictly in local device storage and are never transmitted to our servers)
   - **Personal Communications:** `No`
   - **Location:** `No`
   - **Web History:** `No`
   - **User Activity:** `No` (No analytics or tracking SDKs included)
   - **Website Content:** `Yes` (User prompts are processed solely in real time to generate the requested technical specification and are never stored on external servers or sold)

3. **Privacy Policy URL:**
   Provide a live public URL (e.g. hosted on your GitHub Pages or Vercel site):
   ```text
   https://github.com/JISHU-GHOSH/prompt-generator/blob/master/PRIVACY.md
   ```

4. **Certifications:**
   - Check *"I certify that this extension complies with the Limited Use policy."*
   - Check *"I confirm that data is not sold to third parties."*
   - Check *"I confirm that data is not used for creditworthiness or lending decisions."*

---

## 5. How to Package the Extension for Upload

Run the automated packaging command in your terminal:

```powershell
npm run package:extension
```

This compiles TypeScript, optimizes assets, and packages `dist/` into a clean, store-compliant zip archive named:
`promptforge-ai-extension.zip`

---

## 6. Step-by-Step Chrome Developer Dashboard Submission

1. **Register as a Chrome Web Store Developer:**
   - Visit the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole).
   - Sign in with your Google account and pay the one-time **$5 registration fee** (charged by Google to deter spam).
2. **Create New Item:**
   - Click the **"New Item"** button in the top right.
   - Drag and drop `promptforge-ai-extension.zip`.
3. **Fill Out Store Listing Tab:**
   - Paste the **Extension Name**, **Short Description**, and **Detailed Description** from Section 1 above.
   - Select **Developer Tools** as the category.
   - Upload your 128×128 icon from `public/icons/icon-128.png`.
   - Upload at least one screenshot (1280×800).
4. **Fill Out Privacy Tab:**
   - Enter your Single Purpose and Privacy Policy URL from Section 4.
   - Copy-paste each permission justification from Section 3 into the review boxes.
   - Check the compliance certifications.
5. **Submit for Review:**
   - Click **"Submit for Review"**!
   - Review typically takes between **24 to 48 hours**. Once approved, your extension is officially live on the Google Chrome Web Store!
