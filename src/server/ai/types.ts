import { z } from "zod";

// ============================================
// Message Types
// ============================================

export type MessageRole = "system" | "user" | "assistant" | "tool";

export interface Message {
  role: MessageRole;
  content: string;
  name?: string; // For tool messages
}

// ============================================
// Provider Options
// ============================================

export interface GenerateTextOptions {
  messages: Message[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
}

export interface GenerateStructuredOptions<T extends z.ZodType> {
  messages: Message[];
  schema: T;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  schemaName?: string;
  schemaDescription?: string;
}

export interface StreamTextOptions extends GenerateTextOptions {
  onToken?: (token: string) => void;
  onComplete?: (fullText: string) => void;
}

// ============================================
// Provider Response Types
// ============================================

export interface TextGenerationResult {
  text: string;
  finishReason?: "stop" | "length" | "content_filter" | "tool_calls" | "error";
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  provider: string;
}

export interface StructuredGenerationResult<T> extends Omit<TextGenerationResult, "text"> {
  data: T;
  rawText: string;
}

// ============================================
// Provider Interface
// ============================================

export interface AIProvider {
  readonly name: string;
  readonly supportsStructuredOutput: boolean;

  /**
   * Generate text completion from messages
   */
  generateText(options: GenerateTextOptions): Promise<TextGenerationResult>;

  /**
   * Generate structured output using a Zod schema
   * Providers that don't natively support structured output will use JSON mode + validation
   */
  generateStructured<T extends z.ZodType>(
    options: GenerateStructuredOptions<T>
  ): Promise<StructuredGenerationResult<z.infer<T>>>;

  /**
   * Stream text completion (optional - not all providers may implement)
   */
  streamText?(options: StreamTextOptions): AsyncIterable<string>;
}

// ============================================
// Provider Configuration
// ============================================

export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
  timeout?: number;
  maxRetries?: number;
}

// ============================================
// Error Types
// ============================================

export class AIProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly code?: string,
    public readonly statusCode?: number,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = "AIProviderError";
  }
}

export class StructuredOutputError extends AIProviderError {
  constructor(
    message: string,
    provider: string,
    public readonly rawOutput: string,
    public readonly validationErrors: z.ZodError,
    cause?: Error
  ) {
    super(message, provider, "STRUCTURED_OUTPUT_ERROR", undefined, cause);
    this.name = "StructuredOutputError";
  }
}

