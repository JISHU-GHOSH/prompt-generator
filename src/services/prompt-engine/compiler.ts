/**
 * PromptForge AI - Meta-Prompt Compiler
 * 
 * Compiles raw user inputs, selected presets, tech stack specifications,
 * and additional context into system and user prompts ready for LLM consumption.
 */

import { CompilePromptOptions, CompiledPrompt, PromptIntent } from '../../types';
import { getPreset } from './presets';
import { IDEATION_SYSTEM_PROMPT } from './meta-prompts';

export type { CompilePromptOptions, CompiledPrompt, PromptIntent };

export const FOLLOWUP_SYSTEM_PROMPT = `You are an elite meta-prompting compiler and technical lead.
The user is providing a follow-up steering instruction for an ongoing coding conversation with an AI model.

CRITICAL INSTRUCTIONS FOR FOLLOW-UP PROMPTS:
1. DO NOT include any introductory persona boilerplate (e.g. "You are a senior software engineer acting as technical lead...").
2. DO NOT re-architect the entire project from scratch.
3. Generate a direct, highly surgical, high-leverage prompt that directly steers the AI model on the immediate task.
4. Clearly state:
   - The exact modification, debugging step, optimization, or test suite required.
   - Strict execution constraints (e.g. "Output complete, runnable code with all imports—do not omit code with placeholder comments like // ...rest of code").
   - Edge cases to guard against and verification criteria.
5. Provide ONLY the finalized prompt ready to be sent to the AI coding assistant.`;

/**
 * Automatically classifies a user request into:
 * - 'ideation': exploratory feature discovery, brainstorming, and roadmapping
 * - 'followup': conversational steer / mini-prompt for ongoing implementation
 * - 'kickoff': full project/architecture implementation spec
 */
export function detectPromptIntent(rawInput: string): PromptIntent {
  if (!rawInput || !rawInput.trim()) return 'kickoff';
  const text = rawInput.trim().toLowerCase();

  // 1. Explicit Ideation / Feature Discovery Patterns (HIGHEST PRIORITY when asking what to build or features)
  const ideationPatterns = [
    /\b(what features?|features? (can|should|to|could) (we|i|you) (add|have|build|include|consider))\b/i,
    /\b(what should (we|i|you) (do|build|make|add|include))\b/i,
    /\b(tell me what (to|features?|can|should))\b/i,
    /\b(brainstorm|brainstorming|ideate|ideation|ideas? for|feature ideas?)\b/i,
    /\b(suggest features?|suggest ideas?|product ideas?|feature roadmap|user requirements?)\b/i,
    /\b(what to build|what can (we|i) (make|build)|use cases? for|feature list)\b/i,
    /\b(explore ideas?|concept for|mvp scope|product discovery)\b/i,
  ];

  if (ideationPatterns.some((regex) => regex.test(text))) {
    return 'ideation';
  }

  // 2. Explicit Follow-Up Patterns (ALWAYS follow-up regardless of other words)
  const followUpExplicit = [
    // Error reports, stack traces, bug fixes
    /\b(error|exception|traceback|crashed|crashing|failing|failed|bug|broken|syntaxerror|typeerror|referenceerror|nullpointer)\b/i,
    // Iterative steering referencing prior state
    /\b(make it|change it|update it|now do|next step|step \d+|continue|proceed)\b/i,
    /\b(optimize|refactor|clean up|simplify|speed up|make faster|reduce memory)\b/i,
    /\b(add error|handle null|validate|add tests?|write tests?|pytest|vitest|jest|unit tests?)\b/i,
    // Contextual references to prior code/chat
    /\b(this|that|above|previous|the function|the class|the component|this code|this error)\b/i,
    // Questions about existing code
    /\b(why is|why does|how does this|explain this|walk me through|what is wrong)\b/i,
    // Transformations
    /\b(convert (this|it)|translate (this|it)|rewrite (this|it))\b/i,
  ];

  if (followUpExplicit.some((regex) => regex.test(text))) {
    return 'followup';
  }

  // 3. Explicit Kickoff Creation Verbs
  const kickoffVerbs = /^(make|build|create|write|develop|implement|design|architect|bootstrap|setup|construct)\b/i;
  if (kickoffVerbs.test(text)) {
    return 'kickoff';
  }

  // 4. System / App / Architecture Nouns
  if (/\b(app|application|system|service|platform|architecture|rfc|schema|database|dashboard|backend|frontend|cli|api|pipeline)\b/i.test(text)) {
    return 'kickoff';
  }

  // 5. Default: Short imperative commands without creation verbs are follow-ups
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= 4) {
    return 'followup';
  }

  return 'kickoff';
}

/**
 * Compiles a user prompt into a structured system and user prompt pair
 * tailored to the selected preset persona and target architecture.
 */
export function compileMetaPrompt(options: CompilePromptOptions): CompiledPrompt {
  const { rawInput, preset, techStack, additionalContext } = options;
  const intent = options.intent || (preset === 'ideation' ? 'ideation' : detectPromptIntent(rawInput));
  const effectivePreset = intent === 'ideation' && preset === 'coding-agent' ? 'ideation' : preset;
  const presetConfig = getPreset(effectivePreset);

  const sections: string[] = [];

  sections.push('## Raw User Request');
  sections.push(rawInput ? rawInput.trim() : '');

  sections.push('## Interaction Mode');
  if (intent === 'ideation') {
    sections.push(
      'Product Ideation & Feature Discovery (Generate an authoritative product roadmap & strategic feature breakdown; STRICTLY DO NOT generate code snippets)'
    );
  } else if (intent === 'followup') {
    sections.push(
      'Follow-Up / Conversational Steer (Generate a surgical, focused prompt with NO persona introduction)'
    );
  } else {
    sections.push(
      'Project Kickoff (Generate a comprehensive, formal architectural specification)'
    );
  }

  if (techStack && Array.isArray(techStack)) {
    const cleanStack = techStack
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter((item) => item.length > 0);

    if (cleanStack.length > 0) {
      sections.push('## Target Tech Stack');
      sections.push(cleanStack.map((tech) => `- ${tech}`).join('\n'));
    }
  }

  if (additionalContext && typeof additionalContext === 'string' && additionalContext.trim().length > 0) {
    sections.push('## Additional Project Context');
    sections.push(additionalContext.trim());
  }

  sections.push('## Instruction');
  if (intent === 'ideation') {
    sections.push(
      'Transform the above request into an authoritative Product Strategy & Feature Roadmap prompt. Direct the recipient AI to break down target personas, prioritize 5–7 high-impact features with clear user value propositions and differentiators, and establish an MVP boundary. Explicitly command the recipient AI to NOT generate code snippets or implementation boilerplate at this ideation stage.'
    );
  } else if (intent === 'followup') {
    sections.push(
      'Transform the above follow-up request into a direct, high-leverage surgical prompt for the existing coding conversation. Include explicit constraints against code truncation or missing imports. Provide ONLY the finalized prompt ready to be sent.'
    );
  } else {
    sections.push(
      'Please transform the above raw user request into a comprehensive, highly structured technical prompt or specification according to your persona and required format. Provide ONLY the finalized prompt ready to be executed.'
    );
  }

  let systemPrompt: string;
  if (intent === 'ideation') {
    systemPrompt = IDEATION_SYSTEM_PROMPT;
  } else if (intent === 'followup') {
    systemPrompt = FOLLOWUP_SYSTEM_PROMPT;
  } else {
    systemPrompt = presetConfig.systemPrompt;
  }

  return {
    systemPrompt,
    userPrompt: sections.join('\n\n'),
    intent,
  };
}
