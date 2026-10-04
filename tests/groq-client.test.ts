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

    const callArgs = mockFetch.mock.calls[0];
    const parsedBody = JSON.parse(callArgs[1].body);
    expect(parsedBody.model).toBe('llama-3.3-70b-versatile');
    expect(parsedBody.messages).toEqual([
      { role: 'system', content: 'system instruction' },
      { role: 'user', content: 'user idea' },
    ]);
  });

  it('should use default model llama-3.3-70b-versatile if model not specified', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: 'Default model response' } }],
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new GroqClient('gsk_test_key');
    await client.generatePrompt('sys', 'user');

    const callArgs = mockFetch.mock.calls[0];
    const parsedBody = JSON.parse(callArgs[1].body);
    expect(parsedBody.model).toBe('llama-3.3-70b-versatile');
  });

  it('should throw error when API key is missing', async () => {
    const client = new GroqClient('');
    await expect(client.generatePrompt('system', 'user')).rejects.toThrow(
      /API key is missing for Groq/i
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

  it('should handle streaming SSE response when onChunk callback is passed', async () => {
    const chunks = [
      'data: {"choices":[{"delta":{"content":"First chunk "}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"and second chunk."}}]}\n\n',
      'data: [DONE]\n\n',
    ];

    const stream = new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(new TextEncoder().encode(chunk));
        }
        controller.close();
      },
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: stream,
    });
    vi.stubGlobal('fetch', mockFetch);

    const onChunk = vi.fn();
    const client = new GroqClient('gsk_test_key');
    const result = await client.generatePrompt('system', 'user', onChunk);

    expect(result).toBe('First chunk and second chunk.');
    expect(onChunk).toHaveBeenCalledWith('First chunk ');
    expect(onChunk).toHaveBeenCalledWith('and second chunk.');
  });

  it('should handle HTTP 401 unauthorized error', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        error: { message: 'Invalid API Key' },
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new GroqClient('invalid_key');
    await expect(client.generatePrompt('system', 'user')).rejects.toThrow(/401.*Invalid API Key/i);
  });

  it('should handle HTTP 500 server error', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({
        error: { message: 'Internal Server Error' },
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new GroqClient('gsk_test_key');
    await expect(client.generatePrompt('system', 'user')).rejects.toThrow(/500.*Internal Server Error/i);
  });

  it('should flush trailing SSE buffer when stream ends without trailing newline', async () => {
    const chunks = [
      'data: {"choices":[{"delta":{"content":"Start "}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"End"}}]}',
    ];

    const stream = new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(new TextEncoder().encode(chunk));
        }
        controller.close();
      },
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: stream,
    });
    vi.stubGlobal('fetch', mockFetch);

    const onChunk = vi.fn();
    const client = new GroqClient('gsk_test_key');
    const result = await client.generatePrompt('system', 'user', onChunk);

    expect(result).toBe('Start End');
    expect(onChunk).toHaveBeenCalledWith('Start ');
    expect(onChunk).toHaveBeenCalledWith('End');
  });
});
