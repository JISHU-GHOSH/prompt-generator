import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from '../api/generate';

describe('Vercel Serverless API (/api/generate)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.GROQ_API_KEY = 'gsk_test_vercel_key';
  });

  it('should handle OPTIONS preflight request', async () => {
    const req = new Request('https://example.com/api/generate', {
      method: 'OPTIONS',
    });
    const res = await handler(req);
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('should reject non-POST requests with 405', async () => {
    const req = new Request('https://example.com/api/generate', {
      method: 'GET',
    });
    const res = await handler(req);
    expect(res.status).toBe(405);
  });

  it('should reject missing userPrompt with 400', async () => {
    const req = new Request('https://example.com/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await handler(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('userPrompt is required');
  });

  it('should successfully return generated content from Groq', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: 'Generated professional prompt' } }],
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const req = new Request('https://example.com/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userPrompt: 'build a weather app',
      }),
    });

    const res = await handler(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.content).toBe('Generated professional prompt');
    expect(json.model).toBe('openai/gpt-oss-120b');
  });
});
