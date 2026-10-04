import { describe, it, expect } from 'vitest';
import { detectPromptIntent, compileMetaPrompt, FOLLOWUP_SYSTEM_PROMPT } from '../src/services/prompt-engine/compiler';

describe('Smart Intent Auto-Detection', () => {
  describe('Kickoff vs Follow-Up Classification', () => {
    it('should classify brand new projects as kickoff', () => {
      expect(detectPromptIntent('make an python app to monitor weather')).toBe('kickoff');
      expect(detectPromptIntent('build a full-stack e-commerce system in React and Node')).toBe('kickoff');
      expect(detectPromptIntent('create an authentication service with OAuth2')).toBe('kickoff');
      expect(detectPromptIntent('design a high-performance database schema')).toBe('kickoff');
      expect(detectPromptIntent('RFC: Distributed cache system')).toBe('kickoff');
    });

    it('should classify conversational steers as followup', () => {
      expect(detectPromptIntent('make it faster')).toBe('followup');
      expect(detectPromptIntent('optimize this function for memory')).toBe('followup');
      expect(detectPromptIntent('now do step 2')).toBe('followup');
      expect(detectPromptIntent('proceed to the next step')).toBe('followup');
      expect(detectPromptIntent('add error handling for null values')).toBe('followup');
      expect(detectPromptIntent('it threw a TypeError on line 42')).toBe('followup');
      expect(detectPromptIntent('write unit tests with pytest')).toBe('followup');
      expect(detectPromptIntent('explain this logic line by line')).toBe('followup');
      expect(detectPromptIntent('why is this code failing?')).toBe('followup');
      expect(detectPromptIntent('convert this to typescript')).toBe('followup');
    });
  });

  describe('compileMetaPrompt with Auto-Intent', () => {
    it('should use FOLLOWUP_SYSTEM_PROMPT and include Follow-Up Mode when follow-up intent is detected', () => {
      const result = compileMetaPrompt({
        rawInput: 'make it faster and handle null pointer error',
        preset: 'coding-agent',
      });

      expect(result.intent).toBe('followup');
      expect(result.systemPrompt).toBe(FOLLOWUP_SYSTEM_PROMPT);
      expect(result.systemPrompt).toContain('DO NOT include any introductory persona boilerplate');
      expect(result.userPrompt).toContain('Follow-Up / Conversational Steer');
    });

    it('should use preset persona system prompt when kickoff intent is detected', () => {
      const result = compileMetaPrompt({
        rawInput: 'build an app to track crypto portfolio',
        preset: 'coding-agent',
      });

      expect(result.intent).toBe('kickoff');
      expect(result.systemPrompt).not.toBe(FOLLOWUP_SYSTEM_PROMPT);
      expect(result.userPrompt).toContain('Project Kickoff');
    });
  });
});
