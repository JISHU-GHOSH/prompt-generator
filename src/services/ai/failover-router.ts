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

    const lowerInput = rawInput.toLowerCase();

    // Domain 1: Weather / Telemetry / Monitoring
    if (lowerInput.includes('weather') || lowerInput.includes('climate') || (lowerInput.includes('monitor') && lowerInput.includes('temp'))) {
      const p1 = `You are a senior Python software engineer and distributed telemetry architect specializing in real-time environmental data pipelines. I need you to architect and implement a production-ready, asynchronous weather monitoring daemon in Python that continuously polls, parses, and aggregates meteorological telemetry—including ambient temperature, relative humidity, atmospheric barometric pressure, precipitation probability, wind velocity, and UV index—from reliable meteorological REST APIs (such as Open-Meteo or OpenWeatherMap).`;
      const p2 = `For each component in the pipeline, explicitly justify why you selected specific libraries (such as httpx with asyncio for non-blocking network I/O, Pydantic v2 for strict schema validation and serialization, and SQLite/TimescaleDB for localized time-series storage) over synchronous alternatives like standard urllib or unvalidated dictionaries. Address critical failure modes including API rate limiting, intermittent network dropouts, stale cached metrics, and corrupted JSON payloads by implementing exponential backoff with jitter and automated failover to secondary weather providers.${additionalContext ? ` Incorporate existing project constraints: ${additionalContext}.` : ''}`;
      const p3 = `Structure your implementation around modular engineering phases: foundational data models and type contracts, an asynchronous client service with connection pooling and token-bucket rate limiting, a background polling worker with configurable scheduling and anomaly threshold alerts, and a lightweight CLI/terminal dashboard using Rich to display real-time and historical trends. Throughout, maintain a formal, precise, and authoritative tone suitable for enterprise technical documentation, ensuring that another engineer can deploy and extend the daemon immediately.`;
      return `${p1}\n\n${p2}\n\n${p3}`;
    }

    // Domain 2: Authentication / Security / User Management
    if (lowerInput.includes('auth') || lowerInput.includes('login') || lowerInput.includes('signup') || lowerInput.includes('jwt') || lowerInput.includes('oauth')) {
      const p1 = `You are a principal security architect and senior full-stack engineer specializing in identity systems and modern access control. I need you to design and implement a bulletproof, production-grade authentication and authorization framework supporting secure credential management, multi-factor verification, and session persistence.${techStack ? ` Build this targeting ${techStack}.` : ''}`;
      const p2 = `For each security boundary and authentication flow, thoroughly explain why you selected specific cryptographic algorithms (such as Argon2id for password hashing, signed JWTs with short-lived access and sliding refresh tokens, and strict HTTP-only SameSite cookies) over less secure alternatives like basic sessions or local storage tokens. Address edge cases including brute-force credential stuffing, timing attacks, token revocation lists, CSRF vulnerabilities, and session race conditions with distributed invalidation.${additionalContext ? ` Project context: ${additionalContext}.` : ''}`;
      const p3 = `Structure your implementation around clear phases: core cryptographic primitives and user schema design, authentication middleware and route protection guards, user onboarding and recovery flows with defensive input validation, and exhaustive unit, integration, and security regression test suites. Throughout, maintain a formal, authoritative, and audit-compliant tone ensuring an engineering team can execute and audit every decision with confidence.`;
      return `${p1}\n\n${p2}\n\n${p3}`;
    }

    // Domain 3: Web Scraping / Data Extraction
    if (lowerInput.includes('scrap') || lowerInput.includes('crawl') || lowerInput.includes('spider') || lowerInput.includes('extract data')) {
      const p1 = `You are a staff data collection engineer and web scraping specialist. I need you to architect and build a high-performance, resilient data extraction pipeline capable of parsing complex, dynamically rendered web pages at scale while preserving data integrity and adhering to web etiquette.${techStack ? ` Implement using ${techStack}.` : ''}`;
      const p2 = `For each layer in the extraction architecture, explicitly justify your choice between lightweight HTTP clients (such as httpx/BeautifulSoup) versus headless browser automation (such as Playwright/Puppeteer), detailing how your pipeline manages dynamic JavaScript hydration, user-agent rotation, proxy pools, and rate limiting. Formulate robust extraction heuristics using resilient CSS/XPath selectors and DOM traversal patterns that remain durable against minor layout redesigns.`;
      const p3 = `Structure your guidance around modular phases: network request orchestration with exponential retry policies and anti-blocking measures, document parsing and strict schema normalization, persistent data serialization (JSON Lines, SQLite, or Parquet), and automated schema validation with error alerting. Maintain an objective, precise, and engineering-focused tone throughout.`;
      return `${p1}\n\n${p2}\n\n${p3}`;
    }

    // Domain 4: General High-Precision Decomposition
    const role = techStack
      ? `senior software engineer and technical lead specializing in ${techStack}`
      : 'senior software engineer and technical architect';

    const p1 = `You are a ${role} acting as technical lead. I need you to provide a comprehensive, formal breakdown of every task, architectural decision, and implementation detail required to design and build a production-grade system for: ${rawInput.replace(/^(make|build|create|write|develop|implement)\s+(an?|the)?\s*/i, '')}. Ensure every technical approach is thoroughly justified and aligned with modern industry best practices.`;

    const p2 = `For each component, workflow, and architectural decision you cover, explicitly explain why you selected this specific methodology, framework, or pattern over alternatives, and critically evaluate whether a superior approach exists that you are not employing—addressing the trade-offs, constraints, maintainability, scalability, and security posture that informed your choice.${
      additionalContext ? ` Integrate the following project context and constraints: ${additionalContext}.` : ''
    } Consider edge cases, data validation, and graceful error handling throughout.`;

    const p3 = `Structure your guidance around clear implementation phases: foundational architecture and schema design, core business logic and modular service layers, API endpoint scaffolding with appropriate routing and error boundaries, and comprehensive unit and integration test verification. Throughout, maintain a formal, precise, and authoritative tone appropriate for technical documentation and engineering execution, ensuring that an engineer can both execute successfully and understand the deeper architectural principles governing each decision.`;

    return `${p1}\n\n${p2}\n\n${p3}`;
  }
}

import { ProxyClient } from './proxy-client';

export interface FailoverRouterOptions {
  proxyClient?: AIClient;
  proxyUrl?: string;
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
 * 1. Zero-Key Proxy (if proxyUrl is configured)
 * 2. Groq (llama-3.3-70b-versatile)
 * 3. Gemini (gemini-3.8-flash)
 * 4. Gemini (gemini-2.5-flash)
 * 5. Local Deterministic Synthesizer (offline safeguard)
 */
export class FailoverRouter implements AIClient {
  private readonly proxyClient?: AIClient;
  private readonly groqClient: AIClient;
  private readonly gemini38Client: AIClient;
  private readonly gemini25Client: AIClient;
  private readonly localSynthesizer: AIClient;
  private readonly onModelSwitch?: (modelName: string, reason: string) => void;
  private activeModelUsed: string = 'llama-3.3-70b-versatile';

  constructor(options: FailoverRouterOptions = {}) {
    const temperature = typeof options.temperature === 'number' ? options.temperature : 0.4;
    this.proxyClient =
      options.proxyClient ??
      (options.proxyUrl ? new ProxyClient(options.proxyUrl) : undefined);
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
    const candidates: ModelCandidate[] = [];

    if (this.proxyClient) {
      candidates.push({ name: 'llama-3.3-70b-versatile (Proxy)', client: this.proxyClient });
    }

    candidates.push(
      { name: 'llama-3.3-70b-versatile', client: this.groqClient },
      { name: 'gemini-3.8-flash', client: this.gemini38Client },
      { name: 'gemini-2.5-flash', client: this.gemini25Client },
      { name: 'local-synthesizer', client: this.localSynthesizer }
    );

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
