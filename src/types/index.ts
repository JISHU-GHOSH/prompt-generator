/**
 * PromptForge AI - Core Domain Types
 */

export type PresetType = 'coding-agent' | 'rfc-spec' | 'bugfix' | 'cursorrules';

export type ProviderType = 'gemini' | 'openai' | 'anthropic' | 'groq' | 'auto';

export interface AppSettings {
  provider: ProviderType;
  apiKeyGemini: string;
  apiKeyOpenAI: string;
  apiKeyAnthropic: string;
  apiKeyGroq?: string;
  modelGemini: string;       // Default: "gemini-1.5-flash"
  modelOpenAI: string;       // Default: "gpt-4o-mini"
  modelAnthropic: string;    // Default: "claude-3-5-sonnet-20241022"
  modelGroq?: string;        // Default: "llama-3.3-70b-versatile"
  temperature: number;       // Default: 0.4
  defaultPreset: PresetType;
  defaultTechStack: string[];
}

export interface PromptHistoryItem {
  id: string;
  timestamp: number;
  rawInput: string;
  enhancedPrompt: string;
  preset: PresetType;
  techStack: string[];
  isFavorite: boolean;
  activeModelUsed?: string;
}

export interface PresetConfig {
  id: PresetType;
  name: string;
  description: string;
  icon: string;
  systemPrompt: string;
}

export interface CompilePromptOptions {
  rawInput: string;
  preset: PresetType;
  techStack?: string[];
  additionalContext?: string;
}

export interface CompiledPrompt {
  systemPrompt: string;
  userPrompt: string;
}

export interface ExtensionMessage<T = unknown> {
  type: string;
  payload?: T;
  error?: string;
}
