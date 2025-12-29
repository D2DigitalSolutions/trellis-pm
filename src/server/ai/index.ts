/**
 * AI Provider Module
 *
 * Provides a unified interface for multiple AI providers with support for:
 * - Text generation
 * - Structured output with Zod schema validation
 * - Streaming responses
 *
 * Supported providers:
 * - OpenAI (with native structured output support)
 * - X.AI / Grok
 * - Ollama (local inference)
 */

// Export types
export type {
  AIProvider,
  Message,
  MessageRole,
  GenerateTextOptions,
  GenerateStructuredOptions,
  StreamTextOptions,
  TextGenerationResult,
  StructuredGenerationResult,
  ProviderConfig,
} from "./types";

export { AIProviderError, StructuredOutputError } from "./types";

// Export providers
export {
  BaseProvider,
  XAIProvider,
  createXAIProvider,
  OpenAIProvider,
  createOpenAIProvider,
  OllamaProvider,
  createOllamaProvider,
} from "./providers";

// Export selector
export { getAIProvider, getAvailableProviders, type ProviderName } from "./selector";
