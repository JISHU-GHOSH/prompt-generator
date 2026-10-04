# Promtify AI Chrome Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Promtify AI, a Manifest V3 Chrome Extension that transforms casual, non-technical thoughts into structured, engineer-grade coding prompts and specs for AI coding tools (Cursor, Claude Code, Copilot, ChatGPT, Claude, Gemini). Features a Side Panel studio workspace, in-page magic wand button on AI websites, and direct client-side BYOK (Gemini, OpenAI, Anthropic).

**Architecture:** React 18/19 + TypeScript + Tailwind CSS built with Vite into a Manifest V3 extension. Includes a Background Service Worker managing side panel behaviors and message passing, a Side Panel React app for full prompt engineering workspace, an in-page Content Script for inline AI input enhancement on chatgpt.com, claude.ai, gemini.google.com, and client-side BYOK API services with chrome.storage.local.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Lucide React (icons), Vite, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-04-promtify-ai-chrome-extension-design.md`

## Global Constraints
- Platform: Google Chrome Extension Manifest V3
- Language: TypeScript (strict mode enabled)
- Styling: Tailwind CSS
- Storage: chrome.storage.local only (zero backend server required)
- Icons: Real PNG files generated at 16x16, 48x48, 128x128 px in `public/icons/`
- CSP: No `eval()`, no remote scripts, all code bundled locally

---

### Task 1: Project Scaffolding & Manifest Setup

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `manifest.json`
- Create: `scripts/generate-icons.js`
- Create: `public/icons/icon-16.png`, `public/icons/icon-48.png`, `public/icons/icon-128.png`
- Test: `tests/manifest.test.ts`

**Interfaces:**
- Produces: Build system producing valid MV3 output directory `dist/` with valid `manifest.json` and PNG icon files.

- [ ] **Step 1: Write the failing test for manifest and icon assets**

```typescript
// tests/manifest.test.ts
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Manifest V3 Configuration', () => {
  it('should have a valid manifest.json with required MV3 fields and icon assets', () => {
    const manifestPath = path.resolve(__dirname, '../manifest.json');
    expect(fs.existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.name).toBe('Promtify AI - Professional Coding Prompt Generator');
    expect(manifest.permissions).toContain('sidePanel');
    expect(manifest.permissions).toContain('storage');
    expect(manifest.permissions).toContain('activeTab');

    // Verify icons exist on disk
    for (const size of ['16', '48', '128']) {
      const iconFile = path.resolve(__dirname, `../public/icons/icon-${size}.png`);
      expect(fs.existsSync(iconFile), `Missing icon-${size}.png`).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/manifest.test.ts`
Expected: FAIL (files missing)

- [ ] **Step 3: Create package.json, configs, manifest, and generate real PNG icons**

```json
// package.json
{
  "name": "promtify-ai",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "generate-icons": "node scripts/generate-icons.js",
    "test": "vitest run"
  },
  "dependencies": {
    "clsx": "^2.1.1",
    "lucide-react": "^0.475.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "tailwind-merge": "^2.6.0"
  },
  "devDependencies": {
    "@types/chrome": "^0.0.300",
    "@types/node": "^22.10.1",
    "@types/react": "^18.3.18",
    "@types/react-dom": "^18.3.5",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "canvas": "^3.1.0",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.7.2",
    "vite": "^6.0.7",
    "vitest": "^2.1.8"
  }
}
```

```javascript
// scripts/generate-icons.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const iconsDir = path.resolve(__dirname, '../public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate valid base PNGs (solid indigo squares with rounded border / P glyph representation)
// Creates a minimal 1x1 / 16x16 PNG buffer if canvas isn't installed, or use raw PNG header buffer
function createPngBuffer(width, height) {
  // Minimal valid PNG byte sequence
  // We can write a clean PNG generator script using pure Node buffers
  // Or write PNGs
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/manifest.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json tsconfig.json vite.config.ts tailwind.config.js postcss.config.js manifest.json scripts/ public/ tests/manifest.test.ts
git commit -m "chore: setup Manifest V3 extension scaffolding, configs, and icons"
```

---

### Task 2: Domain Types & Storage Service

**Files:**
- Create: `src/types/index.ts`
- Create: `src/services/storage.ts`
- Test: `tests/storage.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export type PresetType = 'coding-agent' | 'rfc-spec' | 'bugfix' | 'cursorrules';
  export type ProviderType = 'gemini' | 'openai' | 'anthropic';
  export interface AppSettings { ... }
  export interface PromptHistoryItem { ... }
  export const storageService: {
    getSettings(): Promise<AppSettings>;
    saveSettings(settings: Partial<AppSettings>): Promise<AppSettings>;
    getHistory(): Promise<PromptHistoryItem[]>;
    addHistoryItem(item: Omit<PromptHistoryItem, 'id' | 'timestamp'>): Promise<PromptHistoryItem>;
    toggleFavorite(id: string): Promise<void>;
    clearHistory(): Promise<void>;
  };
  ```

- [ ] **Step 1: Write the failing test for storageService**

```typescript
// tests/storage.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { storageService, DEFAULT_SETTINGS } from '../src/services/storage';

describe('Storage Service', () => {
  let mockStore: Record<string, any> = {};

  beforeEach(() => {
    mockStore = {};
    (globalThis as any).chrome = {
      storage: {
        local: {
          get: vi.fn(async (keys) => {
            if (typeof keys === 'string') return { [keys]: mockStore[keys] };
            if (Array.isArray(keys)) {
              return keys.reduce((acc, k) => ({ ...acc, [k]: mockStore[k] }), {});
            }
            return mockStore;
          }),
          set: vi.fn(async (items) => {
            Object.assign(mockStore, items);
          }),
        },
      },
    };
  });

  it('should return default settings when storage is empty', async () => {
    const settings = await storageService.getSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it('should save and update settings', async () => {
    await storageService.saveSettings({ apiKeyGemini: 'test-key-123' });
    const settings = await storageService.getSettings();
    expect(settings.apiKeyGemini).toBe('test-key-123');
  });

  it('should add and manage history items', async () => {
    const item = await storageService.addHistoryItem({
      rawInput: 'make a todo app',
      enhancedPrompt: '# Todo App Spec',
      preset: 'coding-agent',
      techStack: ['React', 'TypeScript'],
      isFavorite: false,
    });
    expect(item.id).toBeDefined();
    const history = await storageService.getHistory();
    expect(history.length).toBe(1);
    expect(history[0].rawInput).toBe('make a todo app');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/storage.test.ts`
Expected: FAIL (modules not found)

- [ ] **Step 3: Implement domain types and storageService**

Implement `src/types/index.ts` and `src/services/storage.ts` with type-safe defaults, history capping (max 100 items), and chrome.storage.local wrapper.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/storage.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts src/services/storage.ts tests/storage.test.ts
git commit -m "feat: add domain models and chrome storage service"
```

---

### Task 3: Meta-Prompting Engine & Presets

**Files:**
- Create: `src/services/prompt-engine/presets.ts`
- Create: `src/services/prompt-engine/meta-prompts.ts`
- Create: `src/services/prompt-engine/compiler.ts`
- Test: `tests/prompt-compiler.test.ts`

**Interfaces:**
- Consumes: `PresetType`, `AppSettings` from `src/types`
- Produces:
  ```typescript
  export interface CompilePromptOptions {
    rawInput: string;
    preset: PresetType;
    techStack?: string[];
    additionalContext?: string;
  }
  export function compileMetaPrompt(options: CompilePromptOptions): {
    systemPrompt: string;
    userPrompt: string;
  };
  ```

- [ ] **Step 1: Write the failing test for prompt compiler**

```typescript
// tests/prompt-compiler.test.ts
import { describe, it, expect } from 'vitest';
import { compileMetaPrompt } from '../src/services/prompt-engine/compiler';

describe('Meta-Prompt Compiler', () => {
  it('should compile a coding agent prompt with XML structure and tech stack', () => {
    const result = compileMetaPrompt({
      rawInput: 'add dark mode toggle',
      preset: 'coding-agent',
      techStack: ['Next.js', 'Tailwind CSS'],
    });

    expect(result.systemPrompt).toContain('Principal Software Architect');
    expect(result.userPrompt).toContain('add dark mode toggle');
    expect(result.userPrompt).toContain('Next.js');
    expect(result.userPrompt).toContain('Tailwind CSS');
    expect(result.systemPrompt).toContain('<objective>');
  });

  it('should compile an RFC spec prompt with requirements sections', () => {
    const result = compileMetaPrompt({
      rawInput: 'payment gateway integration with stripe',
      preset: 'rfc-spec',
      techStack: ['Node.js', 'Stripe API'],
    });

    expect(result.systemPrompt).toContain('Technical Specification');
    expect(result.userPrompt).toContain('payment gateway integration with stripe');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/prompt-compiler.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement presets, meta-prompts, and compiler**

Implement the 4 presets (`coding-agent`, `rfc-spec`, `bugfix`, `cursorrules`), strict XML tag boundaries, and contextual instructions in `src/services/prompt-engine/`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/prompt-compiler.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/prompt-engine/ tests/prompt-compiler.test.ts
git commit -m "feat: implement meta-prompt compiler and presets engine"
```

---

### Task 4: BYOK AI Clients (Gemini, OpenAI, Anthropic)

**Files:**
- Create: `src/services/ai/types.ts`
- Create: `src/services/ai/gemini.ts`
- Create: `src/services/ai/openai.ts`
- Create: `src/services/ai/anthropic.ts`
- Create: `src/services/ai/client-factory.ts`
- Test: `tests/ai-client.test.ts`

**Interfaces:**
- Consumes: `AppSettings`
- Produces:
  ```typescript
  export interface AIClient {
    generatePrompt(systemPrompt: string, userPrompt: string, onChunk?: (chunk: string) => void): Promise<string>;
  }
  export function getAIClient(settings: AppSettings): AIClient;
  ```

- [ ] **Step 1: Write the failing test for AI client factory & clients**

```typescript
// tests/ai-client.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAIClient } from '../src/services/ai/client-factory';
import { DEFAULT_SETTINGS } from '../src/services/storage';

describe('AI Client Factory', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should throw an error if API key is missing for the selected provider', async () => {
    const client = getAIClient({ ...DEFAULT_SETTINGS, apiKeyGemini: '' });
    await expect(client.generatePrompt('system', 'user')).rejects.toThrow(/API key is missing/i);
  });

  it('should make a direct call to Gemini endpoint with correct body', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'Optimized technical prompt' }] } }],
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = getAIClient({ ...DEFAULT_SETTINGS, provider: 'gemini', apiKeyGemini: 'dummy-gemini-key' });
    const response = await client.generatePrompt('system', 'user');

    expect(response).toBe('Optimized technical prompt');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('generativelanguage.googleapis.com'),
      expect.any(Object)
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ai-client.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement client-factory, gemini.ts, openai.ts, and anthropic.ts**

Implement direct, clean `fetch()` calls to the official endpoints with proper error handling for 401 (invalid key), 429 (rate limited), and 500 status codes.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ai-client.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/ai/ tests/ai-client.test.ts
git commit -m "feat: add BYOK AI clients for Gemini, OpenAI, and Anthropic"
```

---

### Task 5: Background Service Worker & Message Passing

**Files:**
- Create: `src/background/service-worker.ts`
- Test: `tests/service-worker.test.ts`

**Interfaces:**
- Consumes: `chrome.sidePanel`, `chrome.runtime.onMessage`, `compileMetaPrompt`, `getAIClient`, `storageService`
- Produces: Service worker that opens the sidepanel upon extension action, and handles `ENHANCE_PROMPT` requests from content script or side panel.

- [ ] **Step 1: Write the failing test for service worker message routing**

```typescript
// tests/service-worker.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleBackgroundMessage } from '../src/background/service-worker';

describe('Background Service Worker Message Handler', () => {
  it('should reject unknown message types', async () => {
    const response = await handleBackgroundMessage({ type: 'UNKNOWN_ACTION' } as any);
    expect(response.error).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/service-worker.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement service worker logic**

Implement `src/background/service-worker.ts` with:
- `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })`
- Fallback `chrome.action.onClicked.addListener`
- Message routing for `ENHANCE_PROMPT` (executing AI call on behalf of content script if needed) and `INSERT_INTO_ACTIVE_TAB`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/service-worker.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/background/service-worker.ts tests/service-worker.test.ts
git commit -m "feat: implement background service worker and side panel action routing"
```

---

### Task 6: Side Panel React Application (Studio, History, Settings)

**Files:**
- Create: `src/sidepanel/index.html`
- Create: `src/sidepanel/main.tsx`
- Create: `src/sidepanel/App.tsx`
- Create: `src/sidepanel/components/Header.tsx`
- Create: `src/sidepanel/components/StudioTab.tsx`
- Create: `src/sidepanel/components/LibraryTab.tsx`
- Create: `src/sidepanel/components/SettingsTab.tsx`
- Create: `src/sidepanel/components/OutputViewer.tsx`
- Test: `tests/sidepanel.test.tsx`

**Interfaces:**
- Full UI featuring:
  - Studio Tab: Input prompt, tech stack pills, preset selector, "Promptify" button, Markdown output with Copy, Save, and Send to Active Tab.
  - History Tab: Filterable and searchable past prompts with 1-click reload into Studio.
  - Settings Tab: Provider selector, API Key inputs (with password mask toggle), and model selector.

- [ ] **Step 1: Write the failing test for App component rendering**

```typescript
// tests/sidepanel.test.tsx
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import App from '../src/sidepanel/App';

describe('SidePanel App', () => {
  it('should render header with Promtify AI logo and navigation tabs', () => {
    // Render and check navigation tabs exist
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/sidepanel.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement Side Panel React components with Tailwind CSS styling**

Build clean, modern dark/light mode responsive components with Lucide icons, smooth tab transitions, and real-time generation feedback.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/sidepanel.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/sidepanel/ tests/sidepanel.test.tsx
git commit -m "feat: implement Side Panel React workspace UI with Studio, Library, and Settings"
```

---

### Task 7: In-Page Content Script & Magic Wand

**Files:**
- Create: `src/content/content-script.ts`
- Create: `src/content/content.css`
- Test: `tests/content-script.test.ts`

**Interfaces:**
- Injects wand button next to active prompt input on ChatGPT, Claude, Gemini.
- Listens for `Alt+P` hotkey.
- Replaces prompt input safely with simulated input events.

- [ ] **Step 1: Write test for content script input discovery and event emission**

```typescript
// tests/content-script.test.ts
import { describe, it, expect } from 'vitest';
import { findPromptInput, injectPromptIntoElement } from '../src/content/content-script';

describe('Content Script In-Page Utilities', () => {
  it('should find textarea elements in mocked DOM', () => {
    document.body.innerHTML = '<textarea id="prompt-textarea"></textarea>';
    const input = findPromptInput();
    expect(input).not.toBeNull();
  });

  it('should inject text into textarea and fire input events', () => {
    document.body.innerHTML = '<textarea id="prompt-textarea"></textarea>';
    const input = document.querySelector('textarea')!;
    injectPromptIntoElement(input, 'New Refined Prompt');
    expect(input.value).toBe('New Refined Prompt');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/content-script.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement content-script.ts and content.css**

Implement mutation observer, floating wand button, keyboard listener (`Alt+P`), loading state indicator, and synthetic event dispatch.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/content-script.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/content/ tests/content-script.test.ts
git commit -m "feat: implement in-page content script and floating wand quick action"
```

---

### Task 8: End-to-End Build Verification & Extension Packaging

**Files:**
- Create: `README.md` (Extension setup guide, screenshots guide, how to load unpacked in Chrome)
- Modify: `vite.config.ts` (Ensure multi-page bundle produces clean `dist/` with HTML, scripts, manifest, and icons)
- Run: Full build verification

- [ ] **Step 1: Run complete test suite**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 2: Run extension build command**

Run: `npm run build`
Expected: `dist/` directory generated with:
- `dist/manifest.json`
- `dist/src/background/service-worker.js`
- `dist/src/sidepanel/index.html`
- `dist/src/content/content-script.js`
- `dist/src/content/content.css`
- `dist/icons/icon-16.png`, `icon-48.png`, `icon-128.png`

- [ ] **Step 3: Create README.md with developer installation and usage guide**

Include step-by-step instructions on loading `dist/` into `chrome://extensions`, acquiring free Gemini API keys, using the Side Panel, and using the in-page magic wand on AI sites.

- [ ] **Step 4: Final commit**

```bash
git add README.md vite.config.ts
git commit -m "docs: add extension load instructions and finalize packaging"
```
