/**
 * PromptForge AI - Zero-Key Serverless Failover Proxy
 * Cloudflare Worker implementation
 */

export interface Env {
  GROQ_API_KEY?: string;
  GEMINI_API_KEY?: string;
  DEFAULT_MODEL?: string;
  FALLBACK_MODEL?: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
      return new Response(
        JSON.stringify({
          status: 'ok',
          service: 'PromptForge AI Failover Proxy',
          hasGroqKey: Boolean(env.GROQ_API_KEY),
          hasGeminiKey: Boolean(env.GEMINI_API_KEY),
        }),
        {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        }
      );
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    try {
      const body = (await request.json()) as {
        systemPrompt?: string;
        userPrompt?: string;
        model?: string;
      };

      const systemPrompt =
        body.systemPrompt ||
        'You are a World-Class Meta-Prompt Engineer modeled after Promptify AI. Transform user requests into an articulate 3-paragraph prompt directive.';
      const userPrompt = body.userPrompt || '';

      if (!userPrompt.trim()) {
        return new Response(JSON.stringify({ error: 'userPrompt is required' }), {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      // Tier 1: Groq LLaMA 3.3 70B
      if (env.GROQ_API_KEY) {
        try {
          const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${env.GROQ_API_KEY.trim()}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: body.model || env.DEFAULT_MODEL || 'llama-3.3-70b-versatile',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
              ],
              temperature: 0.4,
            }),
          });

          if (groqRes.ok) {
            const data = (await groqRes.json()) as any;
            const content = data.choices?.[0]?.message?.content;
            if (content) {
              return new Response(
                JSON.stringify({
                  success: true,
                  prompt: content,
                  model: 'llama-3.3-70b-versatile',
                }),
                {
                  headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                }
              );
            }
          } else {
            console.warn(`[Proxy] Groq returned status ${groqRes.status}`);
          }
        } catch (groqErr) {
          console.warn('[Proxy] Groq invocation failed:', groqErr);
        }
      }

      // Tier 2: Gemini 3.8 Flash Fallback
      if (env.GEMINI_API_KEY) {
        try {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${encodeURIComponent(
            env.GEMINI_API_KEY.trim()
          )}`;

          const geminiRes = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
                },
              ],
              generationConfig: { temperature: 0.4 },
            }),
          });

          if (geminiRes.ok) {
            const data = (await geminiRes.json()) as any;
            const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (content) {
              return new Response(
                JSON.stringify({
                  success: true,
                  prompt: content,
                  model: 'gemini-3.8-flash',
                }),
                {
                  headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                }
              );
            }
          }
        } catch (geminiErr) {
          console.warn('[Proxy] Gemini invocation failed:', geminiErr);
        }
      }

      return new Response(
        JSON.stringify({
          success: false,
          error:
            'All upstream AI providers were unreachable or keys are unconfigured. Please configure GROQ_API_KEY in worker secrets.',
        }),
        {
          status: 503,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        }
      );
    } catch (err: any) {
      return new Response(
        JSON.stringify({ success: false, error: err?.message || 'Internal proxy error' }),
        {
          status: 500,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        }
      );
    }
  },
};
