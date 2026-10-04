import { AIClient } from './types';

export class RateLimitError extends Error {
  constructor(message: string = 'Rate limit reached for Groq LLaMA model') {
    super(message);
    this.name = 'RateLimitError';
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

export class GroqClient implements AIClient {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly temperature: number;

  constructor(
    apiKey: string = '',
    model: string = 'llama-3.3-70b-versatile',
    temperature: number = 0.4
  ) {
    this.apiKey = apiKey?.trim() || '';
    this.model = model || 'llama-3.3-70b-versatile';
    this.temperature = typeof temperature === 'number' ? temperature : 0.4;
  }

  async generatePrompt(
    systemPrompt: string,
    userPrompt: string,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error(
        'API key is missing for Groq. Please configure your Groq API key in extension settings.'
      );
    }

    const isStreaming = Boolean(onChunk);
    const messages: Array<{ role: string; content: string }> = [];

    if (systemPrompt && systemPrompt.trim()) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: userPrompt });

    const payload: Record<string, unknown> = {
      model: this.model,
      messages,
      temperature: this.temperature,
      stream: isStreaming,
    };

    let response: Response;
    try {
      response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Network error connecting to Groq API: ${message}`);
    }

    if (!response.ok) {
      await this.handleError(response);
    }

    if (isStreaming && response.body && typeof response.body.getReader === 'function') {
      return this.readSSEStream(response.body, onChunk!);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || '';
    if (onChunk && content) {
      onChunk(content);
    }
    return content;
  }

  private async readSSEStream(
    body: ReadableStream<Uint8Array>,
    onChunk: (chunk: string) => void
  ): Promise<string> {
    const reader = body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let accumulatedText = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;

          const dataStr = trimmed.slice(5).trim();
          if (dataStr === '[DONE]') continue;
          if (!dataStr) continue;

          try {
            const parsed = JSON.parse(dataStr);
            const deltaContent = parsed?.choices?.[0]?.delta?.content;
            if (deltaContent) {
              accumulatedText += deltaContent;
              onChunk(deltaContent);
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }

      if (buffer.trim()) {
        const line = buffer.trim();
        if (line.startsWith('data: ') || line.startsWith('data:')) {
          const dataStr = (line.startsWith('data: ') ? line.slice(6) : line.slice(5)).trim();
          if (dataStr && dataStr !== '[DONE]') {
            try {
              const parsed = JSON.parse(dataStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                accumulatedText += content;
                onChunk(content);
              }
            } catch {
              // ignore parse errors on trailing partial buffer
            }
          }
        }
      }
    } finally {
      if (typeof reader.releaseLock === 'function') {
        reader.releaseLock();
      }
    }

    return accumulatedText;
  }

  private async handleError(response: Response): Promise<never> {
    let errorDetail = '';
    try {
      const json = await response.json();
      errorDetail = json?.error?.message || '';
    } catch {
      try {
        errorDetail = await response.text();
      } catch {
        // Ignore fallback reading errors
      }
    }

    if (response.status === 429) {
      throw new RateLimitError(
        errorDetail || `Rate limit reached for model ${this.model}`
      );
    }
    if (response.status === 401) {
      throw new Error(
        `Groq API error (401): Invalid API key or unauthorized. ${errorDetail || 'Please verify your Groq API key in settings.'}`
      );
    }
    if (response.status >= 500) {
      throw new Error(
        `Groq API error (${response.status}): Groq service error. ${errorDetail || 'Please try again later.'}`
      );
    }

    throw new Error(
      `Groq API error (${response.status}): ${errorDetail || response.statusText || 'Unknown error'}`
    );
  }
}
