import { AIClient } from './types';

export class GeminiClient implements AIClient {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly temperature: number;

  constructor(apiKey: string, model: string = 'gemini-2.5-flash', temperature: number = 0.4) {
    this.apiKey = apiKey?.trim() || '';
    this.model = model || 'gemini-2.5-flash';
    this.temperature = typeof temperature === 'number' ? temperature : 0.4;
  }

  async generatePrompt(
    systemPrompt: string,
    userPrompt: string,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error(
        'API key is missing for Gemini. Please configure your Gemini API key in extension settings.'
      );
    }

    const isStreaming = Boolean(onChunk);
    const action = isStreaming ? 'streamGenerateContent' : 'generateContent';
    const cleanModel = (this.model || 'gemini-2.5-flash').replace(/^models\//, '');
    let url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      cleanModel
    )}:${action}?key=${encodeURIComponent(this.apiKey)}`;

    if (isStreaming) {
      url += '&alt=sse';
    }

    const payload: Record<string, unknown> = {
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }],
        },
      ],
      generationConfig: {
        temperature: this.temperature,
      },
    };

    if (systemPrompt && systemPrompt.trim()) {
      payload.systemInstruction = {
        parts: [{ text: systemPrompt }],
      };
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Network error connecting to Gemini API: ${message}`);
    }

    if (!response.ok) {
      await this.handleError(response);
    }

    if (isStreaming && response.body && typeof response.body.getReader === 'function') {
      return this.readSSEStream(response.body, onChunk!);
    }

    // Fallback or non-streaming
    const data = await response.json();
    const text = this.extractTextFromCandidates(data);
    if (onChunk && text) {
      onChunk(text);
    }
    return text;
  }

  private extractTextFromCandidates(data: any): string {
    if (!data || !Array.isArray(data.candidates) || data.candidates.length === 0) {
      return '';
    }

    const candidate = data.candidates[0];
    const parts = candidate?.content?.parts;
    if (!Array.isArray(parts)) {
      return '';
    }

    return parts.map((part: any) => part?.text || '').join('');
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

          const jsonStr = trimmed.slice(5).trim();
          if (!jsonStr) continue;

          try {
            const parsed = JSON.parse(jsonStr);
            const chunkText = this.extractTextFromCandidates(parsed);
            if (chunkText) {
              accumulatedText += chunkText;
              onChunk(chunkText);
            }
          } catch {
            // Skip invalid JSON lines
          }
        }
      }

      if (buffer.trim().startsWith('data:')) {
        const jsonStr = buffer.trim().slice(5).trim();
        try {
          const parsed = JSON.parse(jsonStr);
          const chunkText = this.extractTextFromCandidates(parsed);
          if (chunkText) {
            accumulatedText += chunkText;
            onChunk(chunkText);
          }
        } catch {
          // Skip invalid JSON
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

    if (response.status === 400) {
      throw new Error(
        `Gemini API error (400): ${errorDetail || 'Invalid request payload or model configuration.'}`
      );
    }
    if (response.status === 404) {
      throw new Error(
        `Gemini API error (404): Model '${this.model}' not found or retired by Google. Please select 'gemini-2.5-flash' or 'gemini-2.0-flash' in Settings.`
      );
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        `Gemini API error (${response.status}): Invalid or unauthorized API key. Please check your Gemini API key in settings.`
      );
    }
    if (response.status === 429) {
      throw new Error(
        `Gemini API error (429): Rate limit exceeded or quota exhausted. ${errorDetail || 'Please check your Gemini account quota.'}`
      );
    }
    if (response.status >= 500) {
      throw new Error(
        `Gemini API error (${response.status}): Google service is currently unavailable. Please try again later.`
      );
    }

    throw new Error(
      `Gemini API error (${response.status}): ${errorDetail || response.statusText || 'Unknown error'}`
    );
  }
}
