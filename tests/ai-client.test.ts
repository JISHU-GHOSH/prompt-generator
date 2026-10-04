import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAIClient } from '../src/services/ai/client-factory';
import { GeminiClient } from '../src/services/ai/gemini';
import { OpenAIClient } from '../src/services/ai/openai';
import { AnthropicClient } from '../src/services/ai/anthropic';
import { DEFAULT_SETTINGS } from '../src/services/storage';
import { AppSettings } from '../src/types';

describe('AI Client Factory', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should throw an error if API key is missing for the selected provider', async () => {
    const client = getAIClient({ ...DEFAULT_SETTINGS, apiKeyGemini: '' });
    await expect(client.generatePrompt('system', 'user')).rejects.toThrow(/API key is missing/i);
  });

  it('should throw an error for unsupported provider', () => {
    expect(() =>
      getAIClient({ ...DEFAULT_SETTINGS, provider: 'unknown' as any })
    ).toThrow(/unsupported ai provider/i);
  });

  it('should instantiate GeminiClient when provider is gemini', () => {
    const client = getAIClient({ ...DEFAULT_SETTINGS, provider: 'gemini', apiKeyGemini: 'dummy' });
    expect(client).toBeInstanceOf(GeminiClient);
  });

  it('should instantiate OpenAIClient when provider is openai', () => {
    const client = getAIClient({ ...DEFAULT_SETTINGS, provider: 'openai', apiKeyOpenAI: 'dummy' });
    expect(client).toBeInstanceOf(OpenAIClient);
  });

  it('should instantiate AnthropicClient when provider is anthropic', () => {
    const client = getAIClient({ ...DEFAULT_SETTINGS, provider: 'anthropic', apiKeyAnthropic: 'dummy' });
    expect(client).toBeInstanceOf(AnthropicClient);
  });
});

describe('GeminiClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should throw error when API key is missing', async () => {
    const client = new GeminiClient('');
    await expect(client.generatePrompt('system', 'user')).rejects.toThrow(/API key is missing/i);
  });

  it('should make a direct call to Gemini endpoint with correct body and return prompt', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'Optimized technical prompt' }] } }],
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = getAIClient({
      ...DEFAULT_SETTINGS,
      provider: 'gemini',
      apiKeyGemini: 'dummy-gemini-key',
    });
    const response = await client.generatePrompt('You are a meta-prompt expert', 'create login form');

    expect(response).toBe('Optimized technical prompt');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=dummy-gemini-key'),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('create login form'),
      })
    );

    const callArgs = mockFetch.mock.calls[0];
    const parsedBody = JSON.parse(callArgs[1].body);
    expect(parsedBody.contents[0].parts[0].text).toBe('create login form');
    expect(parsedBody.systemInstruction.parts[0].text).toBe('You are a meta-prompt expert');
    expect(parsedBody.generationConfig.temperature).toBe(0.4);
  });

  it('should handle streaming SSE response from Gemini when onChunk is provided', async () => {
    const sseChunks = [
      'data: {"candidates":[{"content":{"parts":[{"text":"Part 1 "}]}}]}\n\n',
      'data: {"candidates":[{"content":{"parts":[{"text":"Part 2"}]}}]}\n\n',
    ];

    let chunkIndex = 0;
    const mockStream = {
      getReader: () => ({
        read: vi.fn().mockImplementation(async () => {
          if (chunkIndex < sseChunks.length) {
            const encoder = new TextEncoder();
            const chunk = encoder.encode(sseChunks[chunkIndex++]);
            return { done: false, value: chunk };
          }
          return { done: true, value: undefined };
        }),
      }),
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      body: mockStream,
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new GeminiClient('test-key', 'gemini-1.5-pro', 0.2);
    const chunks: string[] = [];
    const fullText = await client.generatePrompt('sys', 'user', (chunk) => chunks.push(chunk));

    expect(chunks).toEqual(['Part 1 ', 'Part 2']);
    expect(fullText).toBe('Part 1 Part 2');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(':streamGenerateContent'),
      expect.any(Object)
    );
  });

  it('should handle 401/403 unauthorized error', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: 'API_KEY_INVALID' } }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new GeminiClient('invalid-key');
    await expect(client.generatePrompt('sys', 'user')).rejects.toThrow(/invalid or unauthorized api key/i);
  });

  it('should handle 429 rate limit error', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: { message: 'RESOURCE_EXHAUSTED' } }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new GeminiClient('valid-key');
    await expect(client.generatePrompt('sys', 'user')).rejects.toThrow(/rate limit exceeded/i);
  });

  it('should handle 404 retired or not found model error with helpful message', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: { message: 'models/gemini-1.5-flash is not found' } }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new GeminiClient('valid-key', 'gemini-1.5-flash');
    await expect(client.generatePrompt('sys', 'user')).rejects.toThrow(/retired by Google/i);
  });

  it('should handle 500 service error', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: { message: 'Internal error' } }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new GeminiClient('valid-key');
    await expect(client.generatePrompt('sys', 'user')).rejects.toThrow(/service is currently unavailable/i);
  });
});

describe('OpenAIClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should throw error when API key is missing', async () => {
    const client = new OpenAIClient('');
    await expect(client.generatePrompt('system', 'user')).rejects.toThrow(/API key is missing/i);
  });

  it('should call chat completions endpoint with Authorization Bearer header', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Enhanced prompt from OpenAI' } }],
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new OpenAIClient('sk-openai-key', 'gpt-4o', 0.7);
    const response = await client.generatePrompt('system instruction', 'user text');

    expect(response).toBe('Enhanced prompt from OpenAI');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer sk-openai-key',
        },
      })
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.model).toBe('gpt-4o');
    expect(body.temperature).toBe(0.7);
    expect(body.messages).toEqual([
      { role: 'system', content: 'system instruction' },
      { role: 'user', content: 'user text' },
    ]);
  });

  it('should handle streaming SSE response from OpenAI when onChunk is provided', async () => {
    const sseChunks = [
      'data: {"choices":[{"delta":{"content":"Hello "}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"from OpenAI"}}]}\n\n',
      'data: [DONE]\n\n',
    ];

    let chunkIndex = 0;
    const mockStream = {
      getReader: () => ({
        read: vi.fn().mockImplementation(async () => {
          if (chunkIndex < sseChunks.length) {
            const encoder = new TextEncoder();
            const chunk = encoder.encode(sseChunks[chunkIndex++]);
            return { done: false, value: chunk };
          }
          return { done: true, value: undefined };
        }),
      }),
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      body: mockStream,
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new OpenAIClient('sk-key');
    const chunks: string[] = [];
    const fullText = await client.generatePrompt('sys', 'user', (c) => chunks.push(c));

    expect(chunks).toEqual(['Hello ', 'from OpenAI']);
    expect(fullText).toBe('Hello from OpenAI');
  });

  it('should handle 401 unauthorized error', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: 'Incorrect API key provided' } }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new OpenAIClient('invalid-key');
    await expect(client.generatePrompt('sys', 'user')).rejects.toThrow(/invalid api key or unauthorized/i);
  });

  it('should handle 429 rate limit error', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: { message: 'You exceeded your current quota' } }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new OpenAIClient('valid-key');
    await expect(client.generatePrompt('sys', 'user')).rejects.toThrow(/rate limit or quota exceeded/i);
  });
});

describe('AnthropicClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should throw error when API key is missing', async () => {
    const client = new AnthropicClient('');
    await expect(client.generatePrompt('system', 'user')).rejects.toThrow(/API key is missing/i);
  });

  it('should call messages endpoint with proper anthropic headers', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: 'Enhanced prompt from Claude' }],
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new AnthropicClient('sk-ant-key', 'claude-3-5-sonnet-20241022', 0.3);
    const response = await client.generatePrompt('system context', 'user input');

    expect(response).toBe('Enhanced prompt from Claude');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'sk-ant-key',
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
      })
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.model).toBe('claude-3-5-sonnet-20241022');
    expect(body.system).toBe('system context');
    expect(body.max_tokens).toBe(4096);
    expect(body.messages).toEqual([{ role: 'user', content: 'user input' }]);
  });

  it('should handle streaming SSE response from Anthropic when onChunk is provided', async () => {
    const sseChunks = [
      'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Claude "}}\n\n',
      'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"streamed"}}\n\n',
    ];

    let chunkIndex = 0;
    const mockStream = {
      getReader: () => ({
        read: vi.fn().mockImplementation(async () => {
          if (chunkIndex < sseChunks.length) {
            const encoder = new TextEncoder();
            const chunk = encoder.encode(sseChunks[chunkIndex++]);
            return { done: false, value: chunk };
          }
          return { done: true, value: undefined };
        }),
      }),
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      body: mockStream,
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new AnthropicClient('sk-ant-key');
    const chunks: string[] = [];
    const fullText = await client.generatePrompt('sys', 'user', (c) => chunks.push(c));

    expect(chunks).toEqual(['Claude ', 'streamed']);
    expect(fullText).toBe('Claude streamed');
  });

  it('should handle 401 unauthorized error', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { type: 'authentication_error', message: 'invalid x-api-key' } }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new AnthropicClient('invalid-key');
    await expect(client.generatePrompt('sys', 'user')).rejects.toThrow(/invalid api key or unauthorized/i);
  });

  it('should handle 429 rate limit error', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: { type: 'rate_limit_error', message: 'Rate limit exceeded' } }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new AnthropicClient('valid-key');
    await expect(client.generatePrompt('sys', 'user')).rejects.toThrow(/rate limit exceeded/i);
  });

  it('should handle 403 access forbidden error', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: { type: 'permission_error', message: 'Forbidden' } }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new AnthropicClient('valid-key');
    await expect(client.generatePrompt('sys', 'user')).rejects.toThrow(
      /Anthropic API Access Forbidden \(403\): Verify that your API key has appropriate permissions and credits\./i
    );
  });

  it('should flush trailing SSE buffer when stream ends without trailing newline', async () => {
    // Second chunk does NOT end with a newline
    const sseChunks = [
      'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Start "}}\n\n',
      'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"End"}}',
    ];

    let chunkIndex = 0;
    const mockStream = {
      getReader: () => ({
        read: vi.fn().mockImplementation(async () => {
          if (chunkIndex < sseChunks.length) {
            const encoder = new TextEncoder();
            const chunk = encoder.encode(sseChunks[chunkIndex++]);
            return { done: false, value: chunk };
          }
          return { done: true, value: undefined };
        }),
      }),
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      body: mockStream,
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new AnthropicClient('sk-ant-key');
    const chunks: string[] = [];
    const fullText = await client.generatePrompt('sys', 'user', (c) => chunks.push(c));

    expect(chunks).toEqual(['Start ', 'End']);
    expect(fullText).toBe('Start End');
  });
});
