/**
 * Common AI client interface for Bring-Your-Own-Key (BYOK) providers.
 */
export interface AIClient {
  /**
   * Generates or enhances a prompt using the configured AI provider.
   *
   * @param systemPrompt Instructions defining the persona and formatting constraints
   * @param userPrompt The user prompt context and specifications
   * @param onChunk Optional callback invoked when incremental text chunks are received
   * @returns The complete generated text prompt
   */
  generatePrompt(
    systemPrompt: string,
    userPrompt: string,
    onChunk?: (chunk: string) => void
  ): Promise<string>;
}
