# LLaMA 3.3 70B Primary + Multi-Model Failover Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a zero-key multi-model AI engine for PromptForge AI with LLaMA 3.3 70B as primary, automatic self-healing failover to Gemini 3.8 Flash and Gemini 2.5 Flash on rate limits, and an offline local synthesizer fallback.

**Architecture:** A tiered failover router encapsulates model invocation. The primary client targets Groq Cloud (`llama-3.3-70b-versatile`). Upon encountering HTTP 429 (rate limit) or 5xx (server error), the router catches the exception in under 50ms and seamlessly delegates to Google AI Studio's `gemini-3.8-flash`, then `gemini-2.5-flash`, before falling back to a deterministic offline synthesizer. The Chrome Extension UI displays real-time model execution badges and removes all mandatory API key blockers.

**Tech Stack:** TypeScript (strict), React 18, Vite, Vitest, Tailwind CSS, Groq API, Google Generative Language API.

**Spec:** `docs/superpowers/specs/2026-10-04-llama-gemini-failover-engine-design.md`

## Global Constraints
- Platform: Google Chrome Extension Manifest V3.
- Language: TypeScript with strict type checking (`tsc --noEmit` must pass with 0 errors).
- Zero-Key Default: The extension must function immediately upon install without requiring the user to paste an API key.
- Safe Failover: Any HTTP 429, 500, 502, or 503 error from a provider must automatically advance to the next candidate model in the chain without failing the user request.
- Local Storage: Extension preferences persist in `chrome.storage.local`.

---

### Task 1: Domain Types & Groq LLaMA 3.3 Client

**Files:**
- Modify: `src/types/index.ts`
- Create: `src/services/ai/groq.ts`
- Test: `tests/groq-client.test.ts`

**Interfaces:**
- Consumes: `AIClient` from `src/services/ai/types.ts`.
- Produces: `GroqClient` implementing `AIClient`, supporting streaming SSE and 429 rate-limit error classification (`RateLimitError`).

- [ ] **Step 1: Write the failing test**

```typescript
// tests/groq-client.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GroqClient, RateLimitError } from '../src/services/ai/groq';

describe('GroqClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should call Groq chat completions API with llama-3.3-70b-versatile', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: 'Optimized LLaMA technical prompt',
            },
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new GroqClient('gsk_test_key', 'llama-3.3-70b-versatile');
    const result = await client.generatePrompt('system instruction', 'user idea');

    expect(result).toBe('Optimized LLaMA technical prompt');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.groq.com/openai/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer gsk_test_key',
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it('should throw RateLimitError when Groq returns HTTP 429', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({
        error: { message: 'Rate limit reached for model llama-3.3-70b-versatile' },
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new GroqClient('gsk_test_key');
    await expect(client.generatePrompt('system', 'user')).rejects.toThrow(RateLimitError);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/groq-client.test.ts`
Expected: FAIL with module `../src/services/ai/groq` not found.

- [ ] **Step 3: Implement domain types update and GroqClient**

In `src/types/index.ts`, add `'groq'` to `ProviderType` and add `modelGroq` and `apiKeyGroq` to `AppSettings`.
In `src/services/ai/groq.ts`, implement `RateLimitError` and `GroqClient` with OpenAI-compatible SSE parsing and non-streaming fallback.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/groq-client.test.ts`
Expected: PASS (all tests pass).

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts src/services/ai/groq.ts tests/groq-client.test.ts
git commit -m "feat: add GroqClient for LLaMA 3.3 70B with rate limit error handling"
```

---

### Task 2: Gemini 3.8 Support & Error Classification

**Files:**
- Modify: `src/services/ai/gemini.ts`
- Modify: `src/services/storage.ts`
- Modify: `tests/ai-client.test.ts`

**Interfaces:**
- Consumes: `gemini-3.8-flash` model identifier.
- Produces: `GeminiRateLimitError` on HTTP 429 for clean failover interception.

- [ ] **Step 1: Write the failing test**

Add tests to `tests/ai-client.test.ts` verifying `gemini-3.8-flash` target endpoint and ensuring 429 responses throw `GeminiRateLimitError`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ai-client.test.ts`
Expected: FAIL with `GeminiRateLimitError` not defined or endpoint mismatch.

- [ ] **Step 3: Implement Gemini 3.8 support and GeminiRateLimitError**

In `src/services/ai/gemini.ts`:
- Export `GeminiRateLimitError extends Error`.
- On `response.status === 429`, throw `new GeminiRateLimitError(...)`.
- Support `gemini-3.8-flash` as a recognized default in constructor and settings.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ai-client.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/ai/gemini.ts src/services/storage.ts tests/ai-client.test.ts
git commit -m "feat: add Gemini 3.8 Flash model support and GeminiRateLimitError"
```

---

### Task 3: Resilient Multi-Model Failover Router

**Files:**
- Create: `src/services/ai/failover-router.ts`
- Modify: `src/services/ai/client-factory.ts`
- Create: `tests/failover-router.test.ts`

**Interfaces:**
- Consumes: `GroqClient`, `GeminiClient`, `AppSettings`.
- Produces: `FailoverRouter` implementing `AIClient`, cascading across LLaMA 3.3 70B ➔ Gemini 3.8 ➔ Gemini 2.5 ➔ Local Synthesizer with `activeModelUsed` notification.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/failover-router.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FailoverRouter } from '../src/services/ai/failover-router';
import { RateLimitError } from '../src/services/ai/groq';
import { GeminiRateLimitError } from '../src/services/ai/gemini';

describe('FailoverRouter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should use LLaMA 3.3 70B when primary succeeds', async () => {
    const mockGroq = { generatePrompt: vi.fn().mockResolvedValue('LLaMA output') };
    const mockG38 = { generatePrompt: vi.fn().mockResolvedValue('Gemini 3.8 output') };
    const mockG25 = { generatePrompt: vi.fn().mockResolvedValue('Gemini 2.5 output') };

    const router = new FailoverRouter({
      groqClient: mockGroq as any,
      gemini38Client: mockG38 as any,
      gemini25Client: mockG25 as any,
    });

    const result = await router.generatePrompt('sys', 'user');
    expect(result).toBe('LLaMA output');
    expect(mockGroq.generatePrompt).toHaveBeenCalled();
    expect(mockG38.generatePrompt).not.toHaveBeenCalled();
    expect(router.getActiveModelUsed()).toBe('llama-3.3-70b-versatile');
  });

  it('should failover to Gemini 3.8 if LLaMA hits RateLimitError (429)', async () => {
    const mockGroq = { generatePrompt: vi.fn().mockRejectedValue(new RateLimitError('Quota exceeded')) };
    const mockG38 = { generatePrompt: vi.fn().mockResolvedValue('Gemini 3.8 output') };
    const mockG25 = { generatePrompt: vi.fn().mockResolvedValue('Gemini 2.5 output') };

    const router = new FailoverRouter({
      groqClient: mockGroq as any,
      gemini38Client: mockG38 as any,
      gemini25Client: mockG25 as any,
    });

    const result = await router.generatePrompt('sys', 'user');
    expect(result).toBe('Gemini 3.8 output');
    expect(mockGroq.generatePrompt).toHaveBeenCalled();
    expect(mockG38.generatePrompt).toHaveBeenCalled();
    expect(router.getActiveModelUsed()).toBe('gemini-3.8-flash');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/failover-router.test.ts`
Expected: FAIL with module not found.

- [ ] **Step 3: Implement FailoverRouter and update client-factory**

In `src/services/ai/failover-router.ts`:
- Implement `FailoverRouter` coordinating `GroqClient` ➔ `GeminiClient(3.8)` ➔ `GeminiClient(2.5)` ➔ `LocalSynthesizer`.
- Track `activeModelUsed` and emit `onModelSwitch(modelName)`.
In `src/services/ai/client-factory.ts`:
- Update `getAIClient(settings)` to return `FailoverRouter` when `settings.provider === 'auto'` (default).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/failover-router.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/ai/failover-router.ts src/services/ai/client-factory.ts tests/failover-router.test.ts
git commit -m "feat: implement FailoverRouter with transparent cascade and model tracking"
```

---

### Task 4: Background Service Worker Integration & Model Tracking

**Files:**
- Modify: `src/background/service-worker.ts`
- Modify: `tests/service-worker.test.ts`

**Interfaces:**
- Consumes: `FailoverRouter` output and `activeModelUsed`.
- Produces: Enhanced response `{ success: true, prompt: string, id: string, activeModel: string }` saved to history.

- [ ] **Step 1: Write the failing test**

In `tests/service-worker.test.ts`, assert that `ENHANCE_PROMPT` message returns `activeModel` in response and stores it in the history record.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/service-worker.test.ts`
Expected: FAIL on missing `activeModel` field.

- [ ] **Step 3: Implement activeModel response in service worker**

Update `src/background/service-worker.ts` to capture `activeModel` from `FailoverRouter` or `AIClient` and include it in `storageService.addHistoryItem({ ..., activeModel })`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/service-worker.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/background/service-worker.ts tests/service-worker.test.ts
git commit -m "feat: record active model used during prompt enhancement in background worker"
```

---

### Task 5: Side Panel UI & In-Page Badge Updates

**Files:**
- Modify: `src/sidepanel/components/StudioTab.tsx`
- Modify: `src/sidepanel/components/OutputViewer.tsx`
- Modify: `src/sidepanel/components/SettingsTab.tsx`
- Modify: `src/sidepanel/App.tsx`
- Modify: `tests/sidepanel.test.tsx`

**Interfaces:**
- Consumes: Zero-key default mode, active model indicator (`⚡ LLaMA 3.3 70B` / `✨ Gemini 3.8 Flash`).
- Produces: Frictionless user experience with no setup gates.

- [ ] **Step 1: Write the failing test**

In `tests/sidepanel.test.tsx`, add tests verifying that the StudioTab allows enhancing immediately without missing-key banners, and displays the active model badge on the output.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/sidepanel.test.tsx`
Expected: FAIL with missing badge assertion or unexpected warning banner.

- [ ] **Step 3: Implement UI updates**

- In `OutputViewer.tsx`: Add a visual model badge (e.g. `⚡ LLaMA 3.3` or `✨ Gemini 3.8`).
- In `StudioTab.tsx`: Remove blocking "Configure API Key" warning; enable instant enhancement.
- In `SettingsTab.tsx`: Feature the **Auto-Failover Engine (LLaMA 3.3 + Gemini 3.8 + Gemini 2.5)** as the default recommended mode, with optional custom key inputs collapsed in an Advanced section.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/sidepanel.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/sidepanel/ tests/sidepanel.test.tsx
git commit -m "feat: update Side Panel UI with model badges and zero-key enhancement workflow"
```

---

### Task 6: End-to-End Build Verification & Documentation

**Files:**
- Modify: `README.md`
- Run: `npm test`
- Run: `npm run build`

**Interfaces:**
- Consumes: Entire codebase.
- Produces: Updated `dist/` extension bundle and updated user documentation.

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: All test suites pass.

- [ ] **Step 2: Run TypeScript compile and production build**

Run: `npm run build`
Expected: `tsc --noEmit && vite build` completes with 0 errors and generates `dist/`.

- [ ] **Step 3: Update README.md**

Document the LLaMA 3.3 70B primary engine, Gemini 3.8 Flash failover, and zero-key out-of-the-box experience in `README.md`.

- [ ] **Step 4: Commit and Push**

```bash
git add README.md
git commit -m "docs: document LLaMA 3.3 primary and Gemini 3.8 failover architecture"
git push origin master
```
