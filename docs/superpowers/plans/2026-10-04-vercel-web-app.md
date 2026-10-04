# PromptForge AI Vercel Web App Implementation Plan

A responsive, dual-pane web application deployed to Vercel that allows anyone to generate production-grade prompts and technical specifications using Groq's 120B reasoning model without needing an extension installed or an API key.

## User Review Checkpoint
> [!NOTE]
> Review the bite-sized tasks below. Once approved or confirmed, implementation will execute step-by-step with testing and verification.

---

## Proposed Changes

### 1. Storage & Environment Adaptation
- Enhance `src/services/storage.ts` so `storageService` checks `window.localStorage` when `chrome.storage.local` is undefined (web environment).
- Keep in-memory store as fallback for headless test runners.

### 2. Vercel Serverless Backend API
- Create `api/generate.ts`:
  - Serverless handler compatible with Vercel Edge / Node.js runtimes.
  - Receives `systemPrompt`, `userPrompt`, and optional `stream`.
  - Connects to Groq Cloud using `process.env.GROQ_API_KEY`.
  - Cascades `openai/gpt-oss-120b` ➔ `qwen/qwen3.8-27b` ➔ `llama-3.3-70b-versatile`.
  - Supports CORS and streaming responses.

### 3. Responsive Web Studio UI
- Create `index.html` (web root entry point).
- Create `src/web/main.tsx`: React root initialization and stylesheet mounting.
- Create `src/web/WebApp.tsx`:
  - Top Navigation Bar: PromptForge AI branding, `⚡ GPT-OSS 120B Powered` badge, GitHub star link, and prominent `Install Chrome Extension` CTA.
  - Left Studio Column: Multi-line prompt input, tech stack badge selector, preset selector, and Enhance button (`Ctrl + Enter` shortcut).
  - Right Spec Viewer: Streaming real-time response viewer, 1-click Markdown copy, download `.md` file, word/token counter.

### 4. Build & Deployment Configuration
- Create `vercel.json` configuring Vercel build output and API route rewrites.
- Create `vite.config.web.ts` (or dual-mode Vite config) generating `dist-web/` containing static web assets.
- Update `package.json` with scripts:
  - `"dev:web": "vite --config vite.config.web.ts"`
  - `"build:web": "vite build --config vite.config.web.ts"`

### 5. Verification & GitHub Sync
- Ensure all 143+ unit tests continue to pass (`npm test`).
- Verify production web build succeeds (`npm run build:web`).
- Verify extension build continues to succeed (`npm run build`).
- Update `README.md` with Vercel 1-Click Deploy button and instructions.
- Commit and push to GitHub `origin master`.

---

## Tasks

### Task 1: Universal Web Storage Layer
- Modify `src/services/storage.ts` to inspect `window.localStorage` when `chrome.storage` is undefined.
- Add unit tests in `tests/storage.test.ts` verifying `localStorage` persistence when `chrome` is undefined.
- Run tests: `npx vitest run tests/storage.test.ts`.

### Task 2: Vercel Serverless Endpoint (`api/generate.ts`)
- Implement `api/generate.ts` supporting POST requests with CORS headers, Groq model cascading, and streaming.
- Write unit tests in `tests/vercel-api.test.ts` mocking Groq API responses.
- Run tests: `npx vitest run tests/vercel-api.test.ts`.

### Task 3: Dual-Pane Web Studio UI
- Create `index.html` referencing `/src/web/main.tsx`.
- Create `src/web/main.tsx` and `src/web/WebApp.tsx`.
- Implement responsive layout with Tailwind CSS.
- Connect API service to `/api/generate` when running in web mode, with fallback to local synthesizer if offline.

### Task 4: Vite Web Build & Vercel Configuration
- Create `vite.config.web.ts` and `vercel.json`.
- Add `build:web` and `dev:web` to `package.json`.
- Test web build: `npm run build:web`.

### Task 5: End-to-End Build & Git Sync
- Run full test suite: `npm test`.
- Run extension build: `npm run build`.
- Update `README.md` with Vercel deployment instructions.
- Commit all changes and push to `origin master`.
