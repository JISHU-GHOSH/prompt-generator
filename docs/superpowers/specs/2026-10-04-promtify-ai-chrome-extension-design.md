# Design Specification: Promtify AI (Chrome Extension Manifest V3)

**Date:** 2026-10-04  
**Project:** Promtify AI  
**Repository:** `calm-borg`  
**Target Platform:** Google Chrome Extension (Manifest V3)  

---

## 1. Executive Summary & Vision

**Promtify AI** is a productivity Chrome Extension designed for software developers, product managers, and builders. It takes rough, casual, or non-technical thoughts (e.g., *"build me a user profile page with avatar upload"*) and elevates them into structured, engineer-grade, professional technical prompts and specifications for AI coding tools and assistants (Cursor, Claude Code, GitHub Copilot, ChatGPT, Claude, and Gemini).

By automating the meta-prompting process—injecting architecture rules, constraints, edge cases, tech stack specifications, and acceptance criteria—Promtify AI bridges the communication gap between casual ideas and world-class AI execution.

---

## 2. Core Capabilities & User Journey

### 2.1 Side Panel Studio (Deep Refinement)
1. **Docked Workspace:** Lives alongside any open browser tab (GitHub, ChatGPT, documentation, issue trackers).
2. **Layman Input:** User inputs rough ideas in plain language into a fluid textarea.
3. **Tech Stack & Context Badges:** Selects relevant technology tags (e.g. `React`, `TypeScript`, `Next.js`, `FastAPI`, `PostgreSQL`, `Tailwind CSS`, `Docker`) with custom tag input.
4. **Target Presets:**
   - **Coding Agent (Cursor / Claude Code):** Formats prompts with files to touch, step-by-step implementation, architectural patterns, defensive programming, and verification commands.
   - **Architecture RFC / Technical Spec:** Detailed software requirements specifications (data models, API endpoints, component hierarchy, security).
   - **Bugfix & Root-Cause Prompt:** Error context, reproduction steps, expected vs. actual behavior, and debugging directives.
   - **Cursor Rules (`.cursorrules` / `.windsurfrules`):** Role definition, coding standards, and repository instructions.
5. **Streaming Output & Actions:** Live-rendered markdown output with syntax highlighting, 1-click clipboard copy, "Send to Active AI Tab", and saving to prompt library.

### 2.2 In-Page Quick Action (Magic Wand on AI Sites)
1. **Target Platforms:** `chatgpt.com`, `claude.ai`, `gemini.google.com`, `github.com`.
2. **Trigger:** Unobtrusive floating wand icon attached to chat inputs or keyboard shortcut (`Alt + P` / `Cmd + Shift + P`).
3. **Behavior:** Reads drafted text in the AI input box, enhances it using the active provider, replaces the input cleanly via synthetic input events, and offers 1-click undo.

### 2.3 Bring Your Own Key (BYOK)
- Fully private, client-side requests using personal API keys (Google Gemini, OpenAI, Anthropic).
- Zero subscription lock-in, zero external backend proxy, and zero telemetry tracking.

---

## 3. Architecture & File Layout

Built with **TypeScript, React, Tailwind CSS, and Vite**:

```
calm-borg/
├── docs/superpowers/specs/
│   └── 2026-10-04-promtify-ai-chrome-extension-design.md
├── manifest.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── package.json
├── public/
│   └── icons/
│       ├── icon-16.png
│       ├── icon-48.png
│       └── icon-128.png
└── src/
    ├── background/
    │   └── service-worker.ts      # Action listeners, sidepanel management, message routing
    ├── sidepanel/
    │   ├── index.html             # Side panel root HTML
    │   ├── main.tsx               # React entry point
    │   ├── App.tsx                # Tab navigation (Studio, Library, Settings)
    │   └── components/
    │       ├── Header.tsx         # Active provider indicator & status
    │       ├── StudioTab.tsx      # Input area, stack badges, preset selector, output view
    │       ├── LibraryTab.tsx     # Saved prompts & history with search
    │       ├── SettingsTab.tsx    # BYOK keys, model choices, temperature
    │       └── OutputViewer.tsx   # Markdown rendering, copy, and send buttons
    ├── content/
    │   ├── content-script.ts      # Detects inputs on AI sites, attaches wand button
    │   └── content.css            # Floating button & inline tooltip styles
    ├── services/
    │   ├── ai/
    │   │   ├── types.ts           # AI provider interfaces
    │   │   ├── gemini.ts          # Google Generative Language API client
    │   │   ├── openai.ts          # OpenAI Chat Completions API client
    │   │   ├── anthropic.ts       # Anthropic Messages API client
    │   │   └── client-factory.ts  # Returns active client based on user settings
    │   ├── prompt-engine/
    │   │   ├── meta-prompts.ts    # Engineering system rules & formatting logic
    │   │   ├── presets.ts         # Agent, RFC, Bugfix, and CursorRules configurations
    │   │   └── compiler.ts        # Assembles system + user context into AI payload
    │   └── storage.ts             # Type-safe chrome.storage.local wrapper
    └── types/
        └── index.ts               # Shared domain types (PromptItem, Settings, PresetType)
```

---

## 4. Manifest V3 Configuration

```json
{
  "manifest_version": 3,
  "name": "Promtify AI - Professional Coding Prompt Generator",
  "version": "1.0.0",
  "description": "Turn casual ideas into professional, high-precision technical prompts and specs for AI coding tools.",
  "permissions": [
    "sidePanel",
    "storage",
    "activeTab"
  ],
  "host_permissions": [
    "https://generativelanguage.googleapis.com/*",
    "https://api.openai.com/*",
    "https://api.anthropic.com/*"
  ],
  "background": {
    "service_worker": "src/background/service-worker.ts",
    "type": "module"
  },
  "side_panel": {
    "default_path": "src/sidepanel/index.html"
  },
  "action": {
    "default_title": "Open Promtify AI Studio"
  },
  "content_scripts": [
    {
      "matches": [
        "https://chatgpt.com/*",
        "https://claude.ai/*",
        "https://gemini.google.com/*",
        "https://github.com/*"
      ],
      "js": ["src/content/content-script.ts"],
      "css": ["src/content/content.css"],
      "run_at": "document_idle"
    }
  ],
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
}
```

### 4.1 Side Panel Opening Mechanism
Following Manifest V3 standards:
```typescript
// src/background/service-worker.ts
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error("Error setting panel behavior:", error));
```

---

## 5. Meta-Prompting Engine Design

The engine takes 4 input parameters:
1. `rawInput`: User's casual thought.
2. `preset`: `coding-agent` | `rfc-spec` | `bugfix` | `cursorrules`.
3. `techStack`: Array of technology names (e.g. `["React", "TypeScript", "Tailwind CSS", "Zustand"]`).
4. `additionalInstructions`: Optional extra constraints or preferences.

### 5.1 System Persona & Rules
- Acts as a Principal Software Architect & Prompt Engineer.
- Translates vague requirements into deterministic constraints.
- Employs XML block demarcation (`<context>`, `<objective>`, `<technical_spec>`, `<implementation_steps>`, `<edge_cases>`, `<verification>`) which modern frontier models follow with high compliance.
- Prohibits superficial filler; mandates concrete types, error handling, state boundaries, and verification instructions.

---

## 6. Data Storage & Schema

Stored locally in `chrome.storage.local`:

```typescript
export interface AppSettings {
  provider: 'gemini' | 'openai' | 'anthropic';
  apiKeyGemini: string;
  apiKeyOpenAI: string;
  apiKeyAnthropic: string;
  modelGemini: string;       // Default: "gemini-1.5-flash"
  modelOpenAI: string;       // Default: "gpt-4o-mini"
  modelAnthropic: string;    // Default: "claude-3-5-sonnet-20241022"
  temperature: number;       // Default: 0.4 (focused & structured)
  defaultPreset: PresetType;
  defaultTechStack: string[];
}

export interface PromptHistoryItem {
  id: string;
  timestamp: number;
  rawInput: string;
  enhancedPrompt: string;
  preset: PresetType;
  techStack: string[];
  isFavorite: boolean;
}
```

---

## 7. In-Page Integration (Content Script)

1. **Target Input Discovery:**
   - Evaluates `document.querySelector('textarea, div[contenteditable="true"]')` across known AI platforms.
   - Monitors dynamic DOM mutations using `MutationObserver`.
2. **Synthetic Input Events:**
   - Modifies element value / `innerText`.
   - Dispatches `new InputEvent('input', { bubbles: true })` and `new Event('change', { bubbles: true })` to guarantee web framework state synchronization.
3. **Fallback:** If target input is detached or protected, automatically copies to clipboard and triggers a toast notification.

---

## 8. Verification & Testing Strategy

1. **Unit Tests (Vitest):**
   - Test prompt compiler with various presets and empty/full inputs.
   - Test storage adapter CRUD operations with mocked `chrome.storage`.
   - Test AI client request/response transformers.
2. **Build Verification:**
   - Execute `npm run build` (`tsc --noEmit && vite build`).
   - Validate that `dist/` contains valid `manifest.json`, bundled assets, and real icons (16, 48, 128 px).
3. **Manual Extension Load:**
   - Open `chrome://extensions` in Google Chrome.
   - Enable "Developer mode" and select "Load unpacked".
   - Verify Side Panel, Settings BYOK save, and in-page wand on test sites.
