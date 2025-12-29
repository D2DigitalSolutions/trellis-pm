import { z } from "zod";
import { BaseProvider } from "./base";
import type {
  GenerateTextOptions,
  GenerateStructuredOptions,
  TextGenerationResult,
  StructuredGenerationResult,
  ProviderConfig,
  StreamTextOptions,
} from "../types";
import { AIProviderError, StructuredOutputError } from "../types";

interface OllamaConfig extends ProviderConfig {
  baseUrl?: string;
}

interface OllamaMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

/**
 * Ollama Provider for local LLM inference
 * Uses best-effort JSON mode with validation and retry
 */
export class OllamaProvider extends BaseProvider {
  readonly name = "ollama";
  readonly supportsStructuredOutput = false;

  private baseUrl: string;

  constructor(config: OllamaConfig = {}) {
    super(config);
    this.baseUrl = config.baseUrl ?? process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
  }

  async generateText(options: GenerateTextOptions): Promise<TextGenerationResult> {
    const model = options.model ?? this.config.defaultModel ?? "llama3.2";
    const temperature = options.temperature ?? this.config.defaultTemperature ?? 0.7;

    const messages: OllamaMessage[] = options.messages.map((msg) => ({
      role: msg.role === "tool" ? "user" : msg.role,
      content: msg.content,
    }));

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          stream: false,
          options: {
            temperature,
            num_predict: options.maxTokens ?? this.config.defaultMaxTokens,
            stop: options.stopSequences,
          },
        }),
        signal: AbortSignal.timeout(this.config.timeout ?? 120000), // Ollama can be slow
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new AIProviderError(
          `Ollama API error: ${response.status} ${response.statusText} - ${errorBody}`,
          this.name,
          "API_ERROR",
          response.status
        );
      }

      const data: OllamaChatResponse = await response.json();

      return {
        text: data.message.content,
        finishReason: "stop",
        usage: data.eval_count
          ? {
              promptTokens: data.prompt_eval_count ?? 0,
              completionTokens: data.eval_count,
              totalTokens: (data.prompt_eval_count ?? 0) + data.eval_count,
            }
          : undefined,
        model: data.model,
        provider: this.name,
      };
    } catch (error) {
      if (error instanceof AIProviderError) throw error;

      // Check if Ollama is running
      if ((error as Error).message?.includes("fetch failed") || 
          (error as Error).message?.includes("ECONNREFUSED")) {
        throw new AIProviderError(
          `Ollama is not running or not accessible at ${this.baseUrl}. Start Ollama with 'ollama serve'`,
          this.name,
          "CONNECTION_FAILED",
          undefined,
          error as Error
        );
      }

      throw new AIProviderError(
        `Ollama request failed: ${(error as Error).message}`,
        this.name,
        "REQUEST_FAILED",
        undefined,
        error as Error
      );
    }
  }

  /**
   * Structured output with JSON mode + validation + retry
   * Ollama supports a basic JSON mode via format: "json"
   */
  async generateStructured<T extends z.ZodType>(
    options: GenerateStructuredOptions<T>
  ): Promise<StructuredGenerationResult<z.infer<T>>> {
    const { schema, schemaName, schemaDescription, ...textOptions } = options;
    const model = options.model ?? this.config.defaultModel ?? "llama3.2";
    const temperature = options.temperature ?? this.config.defaultTemperature ?? 0.7;

    // Build JSON schema and instruction
    const jsonSchema = this.zodToJsonSchema(schema);
    const systemMessage = this.buildJsonSystemMessage(jsonSchema, schemaName, schemaDescription);

    // Prepare messages with JSON instruction
    const messages: OllamaMessage[] = [...options.messages].map((msg) => ({
      role: msg.role === "tool" ? "user" : msg.role,
      content: msg.content,
    }));

    // Add or update system message
    const existingSystemIndex = messages.findIndex((m) => m.role === "system");
    if (existingSystemIndex >= 0) {
      messages[existingSystemIndex] = {
        ...messages[existingSystemIndex],
        content: `${messages[existingSystemIndex].content}\n\n${systemMessage}`,
      };
    } else {
      messages.unshift({ role: "system", content: systemMessage });
    }

    const maxRetries = this.config.maxRetries ?? 3;
    let lastError: Error | undefined;
    let rawText = "";

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/api/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages,
            stream: false,
            format: "json", // Enable JSON mode
            options: {
              temperature,
              num_predict: options.maxTokens ?? this.config.defaultMaxTokens,
            },
          }),
          signal: AbortSignal.timeout(this.config.timeout ?? 120000),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new AIProviderError(
            `Ollama API error: ${response.status} - ${errorBody}`,
            this.name,
            "API_ERROR",
            response.status
          );
        }

        const data: OllamaChatResponse = await response.json();
        rawText = data.message.content;

        // Extract and parse JSON
        const jsonStr = this.extractJson(rawText);
        const parsed = JSON.parse(jsonStr);
        const validated = schema.parse(parsed);

        return {
          data: validated,
          rawText,
          finishReason: "stop",
          usage: data.eval_count
            ? {
                promptTokens: data.prompt_eval_count ?? 0,
                completionTokens: data.eval_count,
                totalTokens: (data.prompt_eval_count ?? 0) + data.eval_count,
              }
            : undefined,
          model: data.model,
          provider: this.name,
        };
      } catch (error) {
        lastError = error as Error;

        // If it's a validation error, add context for retry
        if (error instanceof z.ZodError && attempt < maxRetries - 1) {
          messages.push({
            role: "assistant",
            content: rawText,
          });
          messages.push({
            role: "user",
            content: `The JSON you provided was invalid. Validation errors:\n${error.errors
              .map((e) => `- ${e.path.join(".")}: ${e.message}`)
              .join("\n")}\n\nPlease provide a corrected JSON response.`,
          });
        } else if (!(error instanceof z.ZodError) && !(error instanceof SyntaxError)) {
          // Re-throw non-validation errors immediately
          throw error;
        }
      }
    }

    // All retries exhausted
    if (lastError instanceof z.ZodError) {
      throw new StructuredOutputError(
        `Failed to generate valid structured output after ${maxRetries} attempts`,
        this.name,
        rawText,
        lastError
      );
    }

    throw new AIProviderError(
      `Failed to parse structured output: ${lastError?.message}`,
      this.name,
      "PARSE_ERROR",
      undefined,
      lastError
    );
  }

  async *streamText(options: StreamTextOptions): AsyncIterable<string> {
    const model = options.model ?? this.config.defaultModel ?? "llama3.2";
    const temperature = options.temperature ?? this.config.defaultTemperature ?? 0.7;

    const messages: OllamaMessage[] = options.messages.map((msg) => ({
      role: msg.role === "tool" ? "user" : msg.role,
      content: msg.content,
    }));

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        options: {
          temperature,
          num_predict: options.maxTokens ?? this.config.defaultMaxTokens,
          stop: options.stopSequences,
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new AIProviderError(
        `Ollama API error: ${response.status} ${response.statusText} - ${errorBody}`,
        this.name,
        "API_ERROR",
        response.status
      );
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new AIProviderError("No response body", this.name, "NO_BODY");
    }

    const decoder = new TextDecoder();
    let fullText = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((line) => line.trim());

        for (const line of lines) {
          try {
            const parsed: OllamaChatResponse = JSON.parse(line);
            const content = parsed.message?.content;
            if (content) {
              fullText += content;
              options.onToken?.(content);
              yield content;
            }
          } catch {
            // Skip invalid JSON chunks
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    options.onComplete?.(fullText);
  }

  /**
   * Check if Ollama is running and the model is available
   */
  async checkModel(modelName?: string): Promise<boolean> {
    const model = modelName ?? this.config.defaultModel ?? "llama3.2";
    
    try {
      const response = await fetch(`${this.baseUrl}/api/show`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: model }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) return [];
      
      const data = await response.json();
      return (data.models ?? []).map((m: { name: string }) => m.name);
    } catch {
      return [];
    }
  }
}

/**
 * Create Ollama provider from environment variables
 */
export function createOllamaProvider(): OllamaProvider | null {
  // Ollama doesn't require an API key, just check if it should be enabled
  const enabled = process.env.OLLAMA_ENABLED === "true" || 
                  process.env.OLLAMA_BASE_URL !== undefined;
  
  if (!enabled && process.env.AI_PROVIDER !== "ollama") {
    return null;
  }

  return new OllamaProvider({
    baseUrl: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
    defaultModel: process.env.OLLAMA_DEFAULT_MODEL ?? "llama3.2",
    timeout: parseInt(process.env.OLLAMA_TIMEOUT ?? "120000", 10),
  });
}

