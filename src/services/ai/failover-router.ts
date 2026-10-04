import { AIClient } from './types';
import { GroqClient, RateLimitError } from './groq';
import { GeminiClient, GeminiRateLimitError } from './gemini';

/**
 * Fallback reason patterns and classification for automatic failover.
 */
export function isFailoverError(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof RateLimitError || error instanceof GeminiRateLimitError) {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  const patterns = [
    '429',
    '500',
    '502',
    '503',
    'rate limit',
    'resourceexhausted',
    'failed to fetch',
    'networkerror',
    'network error',
    'api key is missing',
    'missing api key',
    'unauthorized',
    'quota',
    'service unavailable',
    'service error',
  ];
  const lower = message.toLowerCase();
  return patterns.some((p) => lower.includes(p.toLowerCase()));
}

/**
 * Deterministic offline prompt synthesizer that operates client-side with 0ms latency
 * and requires zero network requests or API keys.
 */
export class LocalSynthesizer implements AIClient {
  async generatePrompt(
    _systemPrompt: string,
    userPrompt: string,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    const output = this.synthesize(userPrompt);
    if (onChunk) {
      onChunk(output);
    }
    return output;
  }

  private synthesize(userPrompt: string): string {
    const rawMatch = userPrompt.match(/## Raw User Request\s*([\s\S]*?)(?=##|$)/i);
    const rawInput = (rawMatch ? rawMatch[1] : userPrompt).trim() || 'Execute the requested software engineering task';

    const stackMatch = userPrompt.match(/## Target Tech Stack\s*([\s\S]*?)(?=##|$)/i);
    const techStack = stackMatch
      ? stackMatch[1]
          .split('\n')
          .map((s) => s.replace(/^-\s*/, '').trim())
          .filter(Boolean)
          .join(', ')
      : '';

    const contextMatch = userPrompt.match(/## Additional Project Context\s*([\s\S]*?)(?=##|$)/i);
    const additionalContext = contextMatch ? contextMatch[1].trim() : '';

    const role = techStack
      ? `senior software engineer and technical lead specializing in ${techStack}`
      : 'senior software engineer and technical architect';

    const p1 = `You are a ${role} acting as technical lead. I need you to provide a comprehensive, formal breakdown of every task, decision, and implementation detail required to execute the following objective: "${rawInput}", with thorough justification for each technical approach chosen.`;

    const p2 = `For each component, workflow, and architectural decision you cover, explicitly explain why you selected this specific methodology, framework, or pattern over alternatives, and critically evaluate whether a superior approach exists that you are not employing—addressing the trade-offs, constraints, maintainability, scalability, and security posture that informed your choice.${
      additionalContext ? ` Integrate the following project context and constraints: ${additionalContext}.` : ''
    } Consider edge cases, data validation, and graceful error handling throughout.`;

    const p3 = `Structure your guidance around clear implementation phases: foundational architecture and schema design, core business logic and modular service layers, API endpoint scaffolding with appropriate routing and error boundaries, and comprehensive unit and integration test verification. Throughout, maintain a formal, precise, and authoritative tone appropriate for technical documentation and engineering execution, ensuring that an engineer can both execute successfully and understand the deeper architectural principles governing each decision.`;

    return `${p1}\n\n${p2}\n\n${p3}`;
  }
}

export interface FailoverRouterOptions {
  groqClient?: AIClient;
  gemini38Client?: AIClient;
  gemini25Client?: AIClient;
  localSynthesizer?: AIClient;
  apiKeyGroq?: string;
  apiKeyGemini?: string;
  temperature?: number;
  onModelSwitch?: (modelName: string, reason: string) => void;
}

interface ModelCandidate {
  name: string;
  client: AIClient;
}

/**
 * Resilient Multi-Model Failover Router cascading across:
 * 1. Groq (llama-3.3-70b-versatile)
 * 2. Gemini (gemini-3.8-flash)
 * 3. Gemini (gemini-2.5-flash)
 * 4. Local Deterministic Synthesizer (offline safeguard)
 */
export class FailoverRouter implements AIClient {
  private readonly groqClient: AIClient;
  private readonly gemini38Client: AIClient;
  private readonly gemini25Client: AIClient;
  private readonly localSynthesizer: AIClient;
  private readonly onModelSwitch?: (modelName: string, reason: string) => void;
  private activeModelUsed: string = 'llama-3.3-70b-versatile';

  constructor(options: FailoverRouterOptions = {}) {
    const temperature = typeof options.temperature === 'number' ? options.temperature : 0.4;
    this.groqClient =
      options.groqClient ??
      new GroqClient(options.apiKeyGroq || '', 'llama-3.3-70b-versatile', temperature);
    this.gemini38Client =
      options.gemini38Client ??
      new GeminiClient(options.apiKeyGemini || '', 'gemini-3.8-flash', temperature);
    this.gemini25Client =
      options.gemini25Client ??
      new GeminiClient(options.apiKeyGemini || '', 'gemini-2.5-flash', temperature);
    this.localSynthesizer = options.localSynthesizer ?? new LocalSynthesizer();
    this.onModelSwitch = options.onModelSwitch;
  }

  /**
   * Returns the identifier of the model that successfully satisfied the generation
   * (or was last attempted).
   */
  getActiveModelUsed(): string {
    return this.activeModelUsed;
  }

  async generatePrompt(
    systemPrompt: string,
    userPrompt: string,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    const candidates: ModelCandidate[] = [
      { name: 'llama-3.3-70b-versatile', client: this.groqClient },
      { name: 'gemini-3.8-flash', client: this.gemini38Client },
      { name: 'gemini-2.5-flash', client: this.gemini25Client },
      { name: 'local-synthesizer', client: this.localSynthesizer },
    ];

    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      this.activeModelUsed = candidate.name;

      try {
        const result = await candidate.client.generatePrompt(systemPrompt, userPrompt, onChunk);
        return result;
      } catch (err: unknown) {
        if (!isFailoverError(err)) {
          throw err;
        }

        const errMsg = err instanceof Error ? err.message : String(err);
        console.warn(`[FailoverRouter] Model ${candidate.name} failed: ${errMsg}`);

        const nextCandidate = candidates[i + 1];
        if (nextCandidate) {
          if (this.onModelSwitch) {
            this.onModelSwitch(nextCandidate.name, errMsg);
          }
        } else {
          // All candidates exhausted, rethrow
          throw err;
        }
      }
    }

    throw new Error('All failover candidates failed to generate prompt');
  }
}
