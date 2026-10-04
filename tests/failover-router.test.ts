import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FailoverRouter, LocalSynthesizer, isFailoverError } from '../src/services/ai/failover-router';
import { GroqClient, RateLimitError } from '../src/services/ai/groq';
import { GeminiRateLimitError } from '../src/services/ai/gemini';
import { getAIClient } from '../src/services/ai/client-factory';
import { DEFAULT_SETTINGS } from '../src/services/storage';

describe('FailoverRouter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should use LLaMA 3.3 70B when primary succeeds', async () => {
    const mockGroq = {
      generatePrompt: vi.fn().mockResolvedValue('LLaMA 3.3 output prompt'),
    };
    const mockG38 = {
      generatePrompt: vi.fn().mockResolvedValue('Gemini 3.8 output prompt'),
    };
    const mockG25 = {
      generatePrompt: vi.fn().mockResolvedValue('Gemini 2.5 output prompt'),
    };

    const router = new FailoverRouter({
      groqClient: mockGroq as any,
      gemini38Client: mockG38 as any,
      gemini25Client: mockG25 as any,
    });

    const result = await router.generatePrompt('system instruction', 'user idea');

    expect(result).toBe('LLaMA 3.3 output prompt');
    expect(mockGroq.generatePrompt).toHaveBeenCalledWith('system instruction', 'user idea', undefined);
    expect(mockG38.generatePrompt).not.toHaveBeenCalled();
    expect(mockG25.generatePrompt).not.toHaveBeenCalled();
    expect(router.getActiveModelUsed()).toBe('llama-3.3-70b-versatile');
  });

  it('should failover to Gemini 3.8 if LLaMA hits RateLimitError (429)', async () => {
    const mockGroq = {
      generatePrompt: vi.fn().mockRejectedValue(new RateLimitError('Rate limit reached for model llama-3.3-70b-versatile')),
    };
    const mockG38 = {
      generatePrompt: vi.fn().mockResolvedValue('Gemini 3.8 output prompt'),
    };
    const mockG25 = {
      generatePrompt: vi.fn().mockResolvedValue('Gemini 2.5 output prompt'),
    };

    const onModelSwitch = vi.fn();
    const router = new FailoverRouter({
      groqClient: mockGroq as any,
      gemini38Client: mockG38 as any,
      gemini25Client: mockG25 as any,
      onModelSwitch,
    });

    const result = await router.generatePrompt('system', 'user');

    expect(result).toBe('Gemini 3.8 output prompt');
    expect(mockGroq.generatePrompt).toHaveBeenCalled();
    expect(mockG38.generatePrompt).toHaveBeenCalled();
    expect(mockG25.generatePrompt).not.toHaveBeenCalled();
    expect(router.getActiveModelUsed()).toBe('gemini-3.8-flash');
    expect(onModelSwitch).toHaveBeenCalledWith('gemini-3.8-flash', expect.stringContaining('Rate limit reached'));
  });

  it('should failover to Gemini 2.5 if LLaMA and Gemini 3.8 both hit rate limits', async () => {
    const mockGroq = {
      generatePrompt: vi.fn().mockRejectedValue(new RateLimitError('Rate limit 429')),
    };
    const mockG38 = {
      generatePrompt: vi.fn().mockRejectedValue(new GeminiRateLimitError('Gemini 3.8 rate limit 429')),
    };
    const mockG25 = {
      generatePrompt: vi.fn().mockResolvedValue('Gemini 2.5 output prompt'),
    };

    const onModelSwitch = vi.fn();
    const router = new FailoverRouter({
      groqClient: mockGroq as any,
      gemini38Client: mockG38 as any,
      gemini25Client: mockG25 as any,
      onModelSwitch,
    });

    const result = await router.generatePrompt('system', 'user');

    expect(result).toBe('Gemini 2.5 output prompt');
    expect(mockGroq.generatePrompt).toHaveBeenCalled();
    expect(mockG38.generatePrompt).toHaveBeenCalled();
    expect(mockG25.generatePrompt).toHaveBeenCalled();
    expect(router.getActiveModelUsed()).toBe('gemini-2.5-flash');
    expect(onModelSwitch).toHaveBeenCalledWith('gemini-3.8-flash', expect.any(String));
    expect(onModelSwitch).toHaveBeenCalledWith('gemini-2.5-flash', expect.any(String));
  });

  it('should fall back to local synthesizer if all cloud models fail (offline safeguard)', async () => {
    const mockGroq = {
      generatePrompt: vi.fn().mockRejectedValue(new RateLimitError('Groq 429')),
    };
    const mockG38 = {
      generatePrompt: vi.fn().mockRejectedValue(new GeminiRateLimitError('Gemini 3.8 429')),
    };
    const mockG25 = {
      generatePrompt: vi.fn().mockRejectedValue(new Error('503 Service Unavailable')),
    };

    const onModelSwitch = vi.fn();
    const router = new FailoverRouter({
      groqClient: mockGroq as any,
      gemini38Client: mockG38 as any,
      gemini25Client: mockG25 as any,
      onModelSwitch,
    });

    const userPrompt = '## Raw User Request\nBuild a responsive navbar in React\n\n## Target Tech Stack\n- React\n- TypeScript';
    const result = await router.generatePrompt('system', userPrompt);

    expect(router.getActiveModelUsed()).toBe('local-synthesizer');
    expect(onModelSwitch).toHaveBeenCalledWith('local-synthesizer', expect.any(String));
    expect(result).toContain('<context>');
    expect(result).toContain('<objective>');
    expect(result).toContain('<technical_specification>');
    expect(result).toContain('<implementation_steps>');
    expect(result).toContain('<verification>');
    expect(result).toContain('Build a responsive navbar in React');
  });

  it('should stream chunks cleanly when onChunk is provided and primary succeeds', async () => {
    const mockGroq = {
      generatePrompt: vi.fn().mockImplementation(async (_sys, _user, onChunk) => {
        if (onChunk) {
          onChunk('Chunk 1 ');
          onChunk('Chunk 2');
        }
        return 'Chunk 1 Chunk 2';
      }),
    };
    const mockG38 = { generatePrompt: vi.fn() };
    const mockG25 = { generatePrompt: vi.fn() };

    const router = new FailoverRouter({
      groqClient: mockGroq as any,
      gemini38Client: mockG38 as any,
      gemini25Client: mockG25 as any,
    });

    const chunks: string[] = [];
    const result = await router.generatePrompt('sys', 'user', (chunk) => chunks.push(chunk));

    expect(result).toBe('Chunk 1 Chunk 2');
    expect(chunks).toEqual(['Chunk 1 ', 'Chunk 2']);
    expect(router.getActiveModelUsed()).toBe('llama-3.3-70b-versatile');
  });

  it('should stream chunks from fallback model when primary fails', async () => {
    const mockGroq = {
      generatePrompt: vi.fn().mockRejectedValue(new RateLimitError('Rate limit')),
    };
    const mockG38 = {
      generatePrompt: vi.fn().mockImplementation(async (_sys, _user, onChunk) => {
        if (onChunk) {
          onChunk('Fallback Part 1 ');
          onChunk('Fallback Part 2');
        }
        return 'Fallback Part 1 Fallback Part 2';
      }),
    };
    const mockG25 = { generatePrompt: vi.fn() };

    const router = new FailoverRouter({
      groqClient: mockGroq as any,
      gemini38Client: mockG38 as any,
      gemini25Client: mockG25 as any,
    });

    const chunks: string[] = [];
    const result = await router.generatePrompt('sys', 'user', (c) => chunks.push(c));

    expect(result).toBe('Fallback Part 1 Fallback Part 2');
    expect(chunks).toEqual(['Fallback Part 1 ', 'Fallback Part 2']);
    expect(router.getActiveModelUsed()).toBe('gemini-3.8-flash');
  });

  it('should failover when errors contain 500, 502, 503, ResourceExhausted, or NetworkError', async () => {
    const mockGroq = {
      generatePrompt: vi.fn().mockRejectedValue(new Error('HTTP 502 Bad Gateway')),
    };
    const mockG38 = {
      generatePrompt: vi.fn().mockRejectedValue(new Error('ResourceExhausted: Quota reached')),
    };
    const mockG25 = {
      generatePrompt: vi.fn().mockResolvedValue('Gemini 2.5 recovered'),
    };

    const router = new FailoverRouter({
      groqClient: mockGroq as any,
      gemini38Client: mockG38 as any,
      gemini25Client: mockG25 as any,
    });

    const result = await router.generatePrompt('sys', 'user');
    expect(result).toBe('Gemini 2.5 recovered');
    expect(router.getActiveModelUsed()).toBe('gemini-2.5-flash');
  });

  it('should failover when API key is missing for primary', async () => {
    const mockGroq = {
      generatePrompt: vi.fn().mockRejectedValue(new Error('API key is missing for Groq.')),
    };
    const mockG38 = {
      generatePrompt: vi.fn().mockResolvedValue('Gemini 3.8 recovered'),
    };
    const mockG25 = { generatePrompt: vi.fn() };

    const router = new FailoverRouter({
      groqClient: mockGroq as any,
      gemini38Client: mockG38 as any,
      gemini25Client: mockG25 as any,
    });

    const result = await router.generatePrompt('sys', 'user');
    expect(result).toBe('Gemini 3.8 recovered');
    expect(router.getActiveModelUsed()).toBe('gemini-3.8-flash');
  });

  it('should support custom localSynthesizer injection', async () => {
    const mockGroq = { generatePrompt: vi.fn().mockRejectedValue(new Error('429')) };
    const mockG38 = { generatePrompt: vi.fn().mockRejectedValue(new Error('429')) };
    const mockG25 = { generatePrompt: vi.fn().mockRejectedValue(new Error('429')) };
    const mockLocal = { generatePrompt: vi.fn().mockResolvedValue('Custom local output') };

    const router = new FailoverRouter({
      groqClient: mockGroq as any,
      gemini38Client: mockG38 as any,
      gemini25Client: mockG25 as any,
      localSynthesizer: mockLocal as any,
    });

    const result = await router.generatePrompt('sys', 'user');
    expect(result).toBe('Custom local output');
    expect(mockLocal.generatePrompt).toHaveBeenCalled();
    expect(router.getActiveModelUsed()).toBe('local-synthesizer');
  });

  it('should NOT failover on non-failover errors (e.g. invalid JSON or TypeError) and rethrow immediately', async () => {
    const mockGroq = {
      generatePrompt: vi.fn().mockRejectedValue(new Error('Invalid JSON structure')),
    };
    const mockG38 = { generatePrompt: vi.fn() };
    const mockG25 = { generatePrompt: vi.fn() };

    const router = new FailoverRouter({
      groqClient: mockGroq as any,
      gemini38Client: mockG38 as any,
      gemini25Client: mockG25 as any,
    });

    await expect(router.generatePrompt('sys', 'user')).rejects.toThrow('Invalid JSON structure');
    expect(mockGroq.generatePrompt).toHaveBeenCalled();
    expect(mockG38.generatePrompt).not.toHaveBeenCalled();
    expect(mockG25.generatePrompt).not.toHaveBeenCalled();
  });

  it('should NOT failover on TypeError and rethrow immediately', async () => {
    const mockGroq = {
      generatePrompt: vi.fn().mockRejectedValue(new TypeError('Cannot read properties of undefined')),
    };
    const mockG38 = { generatePrompt: vi.fn() };
    const mockG25 = { generatePrompt: vi.fn() };

    const router = new FailoverRouter({
      groqClient: mockGroq as any,
      gemini38Client: mockG38 as any,
      gemini25Client: mockG25 as any,
    });

    await expect(router.generatePrompt('sys', 'user')).rejects.toThrow(TypeError);
    expect(mockG38.generatePrompt).not.toHaveBeenCalled();
  });
});

describe('isFailoverError', () => {
  it('should return true for RateLimitError instance', () => {
    expect(isFailoverError(new RateLimitError('Groq rate limited'))).toBe(true);
  });

  it('should return true for GeminiRateLimitError instance', () => {
    expect(isFailoverError(new GeminiRateLimitError('Gemini quota exhausted'))).toBe(true);
  });

  it('should return true for HTTP status error messages: 429, 500, 502, 503', () => {
    expect(isFailoverError(new Error('HTTP 429 Too Many Requests'))).toBe(true);
    expect(isFailoverError(new Error('500 Internal Server Error'))).toBe(true);
    expect(isFailoverError(new Error('502 Bad Gateway'))).toBe(true);
    expect(isFailoverError(new Error('503 Service Unavailable'))).toBe(true);
  });

  it('should return true for rate limit and quota keyword variations', () => {
    expect(isFailoverError(new Error('Rate limit exceeded for model'))).toBe(true);
    expect(isFailoverError(new Error('ResourceExhausted: Quota exceeded'))).toBe(true);
    expect(isFailoverError(new Error('User quota has been exceeded'))).toBe(true);
  });

  it('should return true for network connectivity and missing API key errors', () => {
    expect(isFailoverError(new Error('Failed to fetch'))).toBe(true);
    expect(isFailoverError(new Error('NetworkError when attempting to fetch resource'))).toBe(true);
    expect(isFailoverError(new Error('missing api key for provider'))).toBe(true);
    expect(isFailoverError(new Error('API key is missing for Groq.'))).toBe(true);
  });

  it('should return false for non-failover errors', () => {
    expect(isFailoverError(new Error('Invalid JSON structure'))).toBe(false);
    expect(isFailoverError(new TypeError('Cannot read properties of undefined'))).toBe(false);
    expect(isFailoverError(new SyntaxError('Unexpected token in JSON'))).toBe(false);
    expect(isFailoverError(new Error('Assertion failed'))).toBe(false);
    expect(isFailoverError(null)).toBe(false);
    expect(isFailoverError(undefined)).toBe(false);
    expect(isFailoverError('')).toBe(false);
  });
});

describe('LocalSynthesizer', () => {
  it('should generate structured XML prompt from user input and tech stack', async () => {
    const synth = new LocalSynthesizer();
    const prompt = await synth.generatePrompt(
      'System persona instructions',
      '## Raw User Request\nCreate an authentication modal\n\n## Target Tech Stack\n- React\n- TypeScript\n- Tailwind CSS'
    );

    expect(prompt).toContain('<context>');
    expect(prompt).toContain('<objective>');
    expect(prompt).toContain('<technical_specification>');
    expect(prompt).toContain('<implementation_steps>');
    expect(prompt).toContain('<edge_cases>');
    expect(prompt).toContain('<verification>');
    expect(prompt).toContain('Create an authentication modal');
    expect(prompt).toContain('React');
    expect(prompt).toContain('TypeScript');
  });

  it('should invoke onChunk callback when provided', async () => {
    const synth = new LocalSynthesizer();
    const chunks: string[] = [];
    const prompt = await synth.generatePrompt('sys', 'Build a table component', (c) => chunks.push(c));

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.join('')).toBe(prompt);
  });
});

describe('client-factory with auto and groq', () => {
  it('should return FailoverRouter when provider is auto', () => {
    const client = getAIClient({
      ...DEFAULT_SETTINGS,
      provider: 'auto',
    });
    expect(client).toBeInstanceOf(FailoverRouter);
    expect((client as FailoverRouter).getActiveModelUsed()).toBe('llama-3.3-70b-versatile');
  });

  it('should return GroqClient when provider is groq', () => {
    const client = getAIClient({
      ...DEFAULT_SETTINGS,
      provider: 'groq',
      apiKeyGroq: 'test-groq-key',
    });
    expect(client).toBeInstanceOf(GroqClient);
  });
});
