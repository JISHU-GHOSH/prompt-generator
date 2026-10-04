# Smart Intent Auto-Detection (Kickoff vs. Mini Follow-Up) Implementation Plan

Automatically classifies user requests into **Kickoff (Master Architecture Spec)** or **Follow-Up (Surgical Mini-Prompt)**, eliminating redundant persona boilerplate when continuing ongoing conversations.

## Proposed Changes

### 1. Types & Compiler (`src/types/index.ts`, `src/services/prompt-engine/compiler.ts`)
- Add `PromptIntent = 'kickoff' | 'followup'` to domain types.
- Implement robust intent classification heuristics in `detectPromptIntent(rawInput: string)`:
  - Follow-up triggers:
    - Conversational pronouns / references: `it`, `this`, `that`, `the previous`, `above`, `the function`, `the code`
    - Iterative steering verbs: `make it`, `add error`, `now do`, `step 2`, `next step`, `optimize`, `refactor`, `change`, `convert to`
    - Bug reports & stack traces: `error`, `exception`, `traceback`, `crashed`, `failed`, `typeerror`, `syntaxerror`
    - Unit test requests for existing code: `write tests`, `add tests`, `pytest`, `vitest`
    - Direct explanation requests: `explain this`, `why did`, `walk me through`
  - Kickoff triggers:
    - Creation verbs: `build a`, `create an`, `make a`, `design a`, `develop an`, `implement a new`
- Update `compileMetaPrompt()` to select the appropriate system persona and instruction set based on `intent`.

### 2. Offline Local Synthesizer (`src/services/ai/failover-router.ts`)
- Update `LocalSynthesizer` to branch based on `intent`:
  - If `intent === 'followup'`: generates a concise, surgical 1-2 paragraph mini-prompt tailored to the steering task (Error fix, Next step, Refactor, or Test generation) with **zero persona intro**.
  - If `intent === 'kickoff'`: generates the comprehensive 3-paragraph Master Architecture Spec.

### 3. UI Intent Badges (`src/sidepanel/components/OutputViewer.tsx`, `src/web/WebApp.tsx`)
- Display a clean intent indicator badge:
  - `🎯 Project Kickoff` (Indigo badge)
  - `⚡ Follow-Up Steer` (Amber/Purple badge)

### 4. Verification & Testing
- Unit tests in `tests/intent-detection.test.ts` testing kickoff vs follow-up detection.
- Tests in `tests/failover-router.test.ts` verifying `LocalSynthesizer` generates mini-prompts without persona intros when follow-up is detected.
- Build verification with `npm test`, `npm run build`, and `npm run build:web`.

---

## Task Steps

1. Update `src/types/index.ts` and `src/services/prompt-engine/compiler.ts` with `detectPromptIntent`.
2. Write unit tests in `tests/intent-detection.test.ts` and verify.
3. Update `LocalSynthesizer` in `src/services/ai/failover-router.ts` for follow-up mini-prompts.
4. Update UI badges in `OutputViewer.tsx` and `WebApp.tsx`.
5. Run full test suite and builds.
6. Commit and push to GitHub `origin master`.
