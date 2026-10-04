import { AIClient } from './types';

export class AnthropicClient implements AIClient {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly temperature: number;

  constructor(
    apiKey: string,
    model: string = 'claude-3-5-sonnet-20241022',
    temperature: number = 0.4
  ) {
    this.apiKey = apiKey?.trim() || '';
    this.model = model || 'claude-3-5-sonnet-20241022';
    this.temperature = typeof temperature === 'number' ? temperature : 0.4;
  }

  async generatePrompt(
    systemPrompt: string,
    userPrompt: string,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error(
        'API key is missing for Anthropic. Please configure your Anthropic API key in extension settings.'
      );
    }

    const isStreaming = Boolean(onChunk);
    const payload: Record<string, unknown> = {
      model: this.model,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      temperature: this.temperature,
      stream: isStreaming,
    };

    if (systemPrompt && systemPrompt.trim()) {
      payload.system = systemPrompt;
    }

    let response: Response;
    try {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify(payload),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Network error connecting to Anthropic API: ${message}`);
    }

    if (!response.ok) {
      await this.handleError(response);
    }

    if (isStreaming && response.body && typeof response.body.getReader === 'function') {
      return this.readSSEStream(response.body, onChunk!);
    }

    const data = await response.json();
    const text = this.extractTextFromContent(data);
    if (onChunk && text) {
      onChunk(text);
    }
    return text;
  }

  private extractTextFromContent(data: any): string {
    if (!data || !Array.isArray(data.content)) {
      return '';
    }

    return data.content
      .filter((block: any) => block?.type === 'text' && typeof block?.text === 'string')
      .map((block: any) => block.text)
      .join('');
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
          if (!dataStr) continue;

          try {
            const parsed = JSON.parse(dataStr);
            if (
              parsed?.type === 'content_block_delta' &&
              parsed.delta?.type === 'text_delta' &&
              typeof parsed.delta?.text === 'string'
            ) {
              const textDelta = parsed.delta.text;
              accumulatedText += textDelta;
              onChunk(textDelta);
            }
          } catch {
            // Skip invalid JSON lines
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
      errorDetail = json?.error?.message || json?.message || '';
    } catch {
      try {
        errorDetail = await response.text();
      } catch {
        // Ignore fallback reading errors
      }
    }

    if (response.status === 401) {
      throw new Error(
        `Anthropic API error (401): Invalid API key or unauthorized. Please check your Anthropic API key in settings.`
      );
    }
    if (response.status === 429) {
      throw new Error(
        `Anthropic API error (429): Rate limit exceeded. ${errorDetail || 'Please try again later.'}`
      );
    }
    if (response.status >= 500) {
      throw new Error(
        `Anthropic API error (${response.status}): Anthropic service error. Please try again later.`
      );
    }

    throw new Error(
      `Anthropic API error (${response.status}): ${errorDetail || response.statusText || 'Unknown error'}`
    );
  }
}
