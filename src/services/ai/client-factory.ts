import { AppSettings } from '../../types';
import { AIClient } from './types';
import { GeminiClient } from './gemini';
import { OpenAIClient } from './openai';
import { AnthropicClient } from './anthropic';
import { GroqClient } from './groq';
import { FailoverRouter } from './failover-router';

/**
 * Returns an instantiated AIClient matching the provider configured in AppSettings.
 *
 * @param settings The application settings containing the chosen provider, keys, and model parameters
 * @returns AIClient instance ready to generate prompts
 */
export function getAIClient(settings: AppSettings): AIClient {
  switch (settings.provider) {
    case 'gemini':
      return new GeminiClient(
        settings.apiKeyGemini,
        settings.modelGemini,
        settings.temperature
      );
    case 'openai':
      return new OpenAIClient(
        settings.apiKeyOpenAI,
        settings.modelOpenAI,
        settings.temperature
      );
    case 'anthropic':
      return new AnthropicClient(
        settings.apiKeyAnthropic,
        settings.modelAnthropic,
        settings.temperature
      );
    case 'groq':
      return new GroqClient(
        settings.apiKeyGroq,
        settings.modelGroq,
        settings.temperature
      );
    case 'auto':
      return new FailoverRouter({
        apiKeyGroq: settings.apiKeyGroq,
        apiKeyGemini: settings.apiKeyGemini,
        temperature: settings.temperature,
      });
    default:
      throw new Error(`Unsupported AI provider: ${(settings as any)?.provider}`);
  }
}
