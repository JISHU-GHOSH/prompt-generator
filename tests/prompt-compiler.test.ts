import { describe, it, expect } from 'vitest';
import { compileMetaPrompt } from '../src/services/prompt-engine/compiler';
import { PRESETS, getPreset } from '../src/services/prompt-engine/presets';

describe('Meta-Prompt Compiler', () => {
  it('should compile a coding agent prompt with Promptify AI structure and tech stack', () => {
    const result = compileMetaPrompt({
      rawInput: 'add dark mode toggle',
      preset: 'coding-agent',
      techStack: ['Next.js', 'Tailwind CSS'],
    });

    expect(result.systemPrompt).toContain('Promptify AI');
    expect(result.userPrompt).toContain('add dark mode toggle');
    expect(result.userPrompt).toContain('Next.js');
    expect(result.userPrompt).toContain('Tailwind CSS');
    expect(result.systemPrompt).toContain('PARAGRAPH 1');
    expect(result.systemPrompt).toContain('PARAGRAPH 2');
    expect(result.systemPrompt).toContain('PARAGRAPH 3');
  });

  it('should compile an RFC spec prompt with requirements sections', () => {
    const result = compileMetaPrompt({
      rawInput: 'payment gateway integration with stripe',
      preset: 'rfc-spec',
      techStack: ['Node.js', 'Stripe API'],
    });

    expect(result.systemPrompt).toContain('Technical Specification');
    expect(result.userPrompt).toContain('payment gateway integration with stripe');
    expect(result.systemPrompt).toContain('System Overview');
    expect(result.systemPrompt).toContain('Architectural Design');
  });

  it('should compile a bugfix prompt with defect diagnosis and reproduction steps', () => {
    const result = compileMetaPrompt({
      rawInput: 'login button clicks do not submit the form on safari',
      preset: 'bugfix',
      techStack: ['React', 'Safari iOS'],
    });

    expect(result.systemPrompt).toContain('Defect Diagnosis');
    expect(result.userPrompt).toContain('login button clicks do not submit the form on safari');
    expect(result.systemPrompt).toContain('Reproduction Steps');
    expect(result.systemPrompt).toContain('Root Cause Hypothesis');
  });

  it('should compile a cursorrules prompt with style guidelines and conventions', () => {
    const result = compileMetaPrompt({
      rawInput: 'fullstack typescript monorepo with strict linting',
      preset: 'cursorrules',
      techStack: ['Turborepo', 'TypeScript', 'Tailwind'],
    });

    expect(result.systemPrompt).toContain('.cursorrules');
    expect(result.userPrompt).toContain('fullstack typescript monorepo with strict linting');
    expect(result.systemPrompt).toContain('Coding Style Guidelines');
  });

  it('should include additional context when provided', () => {
    const result = compileMetaPrompt({
      rawInput: 'refactor auth flow',
      preset: 'coding-agent',
      additionalContext: 'Target existing Auth0 v2 SDK in src/auth',
    });

    expect(result.userPrompt).toContain('refactor auth flow');
    expect(result.userPrompt).toContain('Target existing Auth0 v2 SDK in src/auth');
  });

  it('should handle undefined or empty techStack gracefully', () => {
    const result = compileMetaPrompt({
      rawInput: 'generic algorithm optimization',
      preset: 'coding-agent',
    });

    expect(result.userPrompt).toContain('generic algorithm optimization');
    expect(result.userPrompt).not.toContain('undefined');
  });
});

describe('Presets Registry', () => {
  it('should define all 4 required presets with valid configs', () => {
    expect(Object.keys(PRESETS)).toEqual(
      expect.arrayContaining(['coding-agent', 'rfc-spec', 'bugfix', 'cursorrules'])
    );

    const codingAgent = getPreset('coding-agent');
    expect(codingAgent.id).toBe('coding-agent');
    expect(codingAgent.name).toBeDefined();
    expect(codingAgent.description).toBeDefined();
    expect(codingAgent.systemPrompt).toContain('Promptify AI');

    const rfc = getPreset('rfc-spec');
    expect(rfc.id).toBe('rfc-spec');
    expect(rfc.name).toBeDefined();

    const bugfix = getPreset('bugfix');
    expect(bugfix.id).toBe('bugfix');

    const cursorrules = getPreset('cursorrules');
    expect(cursorrules.id).toBe('cursorrules');
  });

  it('should throw or fallback gracefully for unknown preset', () => {
    expect(() => getPreset('unknown' as any)).toThrow(/Unknown preset/i);
  });
});
