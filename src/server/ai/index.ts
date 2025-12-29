/**
 * AI Provider Module
 *
 * Provides a unified interface for multiple AI providers with support for:
 * - Text generation
 * - Structured output with Zod schema validation
 * - Streaming responses
 * - Work item extraction from natural language
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
export { getAIProvider, getAvailableProviders, getProviderStatus, type ProviderName } from "./selector";

// Export schemas
export {
  extractWorkResponseSchema,
  extractWorkInputSchema,
  workItemToCreateSchema,
  artifactToCreateSchema,
  type ExtractWorkResponse,
  type ExtractWorkInput,
  type WorkItemToCreate,
  type ArtifactToCreate,
} from "./schemas";

// Export extract-work service
export {
  extractWork,
  validateExtractWorkResponse,
  repairExtractWorkJson,
  type ExtractWorkOptions,
  type ExtractWorkResult,
} from "./extract-work";
