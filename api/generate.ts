// Vercel Serverless Function: POST /api/generate
// Zero-Key API Relay for PromptForge AI Web Studio

export const config = {
  runtime: 'edge',
};

const GROQ_CANDIDATE_MODELS = [
  'openai/gpt-oss-120b',
  'qwen/qwen3.8-27b',
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
];

export default async function handler(req: Request): Promise<Response> {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed. Use POST.' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  try {
    const apiKey =
      process.env.GROQ_API_KEY ||
      req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ||
      '';

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: 'GROQ_API_KEY is not configured on the server. Please set GROQ_API_KEY in Vercel settings.',
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const body = (await req.json()) as {
      systemPrompt?: string;
      userPrompt?: string;
      model?: string;
      temperature?: number;
      stream?: boolean;
    };

    const userPrompt = body.userPrompt?.trim();
    if (!userPrompt) {
      return new Response(JSON.stringify({ error: 'userPrompt is required.' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const systemPrompt =
      body.systemPrompt?.trim() ||
      'You are an elite meta-prompting compiler and technical architect specializing in generating production-grade prompts and technical specifications for AI coding tools.';

    const temperature = typeof body.temperature === 'number' ? body.temperature : 0.4;
    const isStreaming = Boolean(body.stream);

    const preferredModel = body.model || 'openai/gpt-oss-120b';
    const candidateModels = Array.from(new Set([preferredModel, ...GROQ_CANDIDATE_MODELS]));

    let lastError: Error | null = null;

    for (const modelToTry of candidateModels) {
      try {
        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: modelToTry,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature,
            stream: isStreaming,
          }),
        });

        if (!groqResponse.ok) {
          const errorJson = await groqResponse.json().catch(() => null);
          const errorMsg = errorJson?.error?.message || (await groqResponse.text().catch(() => ''));
          if (
            groqResponse.status === 404 ||
            errorMsg.includes('does not exist') ||
            errorMsg.includes('do not have access')
          ) {
            console.warn(`[Vercel API] Model ${modelToTry} unavailable (${errorMsg}), failing over...`);
            lastError = new Error(errorMsg);
            continue;
          }
          return new Response(
            JSON.stringify({ error: `Groq error (${groqResponse.status}): ${errorMsg}` }),
            {
              status: groqResponse.status,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              },
            }
          );
        }

        if (isStreaming && groqResponse.body) {
          return new Response(groqResponse.body, {
            status: 200,
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache, no-transform',
              Connection: 'keep-alive',
              'Access-Control-Allow-Origin': '*',
              'X-Model-Used': modelToTry,
            },
          });
        }

        const data = await groqResponse.json();
        const content = data?.choices?.[0]?.message?.content || '';

        return new Response(
          JSON.stringify({
            content,
            model: modelToTry,
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'X-Model-Used': modelToTry,
            },
          }
        );
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }

    return new Response(
      JSON.stringify({
        error: `All candidate models failed: ${lastError?.message || 'Unknown error'}`,
      }),
      {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: `Internal server error: ${message}` }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
