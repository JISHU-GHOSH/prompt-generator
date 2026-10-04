/**
 * Promtify AI - Meta-Prompt Compiler
 * 
 * Compiles raw user inputs, selected presets, tech stack specifications,
 * and additional context into system and user prompts ready for LLM consumption.
 */

import { CompilePromptOptions, CompiledPrompt } from '../../types';
import { getPreset } from './presets';

export type { CompilePromptOptions, CompiledPrompt };

/**
 * Compiles a user prompt into a structured system and user prompt pair
 * tailored to the selected preset persona and target architecture.
 */
export function compileMetaPrompt(options: CompilePromptOptions): CompiledPrompt {
  const { rawInput, preset, techStack, additionalContext } = options;
  const presetConfig = getPreset(preset);

  const sections: string[] = [];

  sections.push('## Raw User Request');
  sections.push(rawInput ? rawInput.trim() : '');

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
  sections.push(
    'Please transform the above raw user request into a comprehensive, highly structured technical prompt or specification according to your persona and required format. Provide ONLY the finalized prompt ready to be executed.'
  );

  return {
    systemPrompt: presetConfig.systemPrompt,
    userPrompt: sections.join('\n\n'),
  };
}
