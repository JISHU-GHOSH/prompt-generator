import { AIClient } from './types';

export class ProxyClient implements AIClient {
  private readonly proxyUrl: string;
  private activeModel: string = 'llama-3.3-70b-versatile';

  constructor(proxyUrl: string) {
    this.proxyUrl = proxyUrl?.trim() || '';
  }

  getActiveModelUsed(): string {
    return this.activeModel;
  }

  async generatePrompt(
    systemPrompt: string,
    userPrompt: string,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    if (!this.proxyUrl) {
      throw new Error('Proxy URL is not configured.');
    }

    const endpoint = this.proxyUrl.replace(/\/+$/, '') + '/api/generate';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemPrompt,
        userPrompt,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      throw new Error(`Proxy error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    if (!data.success || !data.prompt) {
      throw new Error(data.error || 'Proxy returned empty response.');
    }

    if (data.model) {
      this.activeModel = data.model;
    }

    if (onChunk) {
      onChunk(data.prompt);
    }

    return data.prompt;
  }
}
