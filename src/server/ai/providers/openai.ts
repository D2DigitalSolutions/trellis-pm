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

interface OpenAIConfig extends ProviderConfig {
  apiKey: string;
  baseUrl?: string;
  organization?: string;
}

interface OpenAIMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
}

interface OpenAIChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string | null;
      refusal?: string | null;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenAIStructuredResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string | null;
      parsed?: unknown;
      refusal?: string | null;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * OpenAI Provider with native structured output support
 */
export class OpenAIProvider extends BaseProvider {
  readonly name = "openai";
  readonly supportsStructuredOutput = true;

  private apiKey: string;
  private baseUrl: string;
  private organization?: string;

  constructor(config: OpenAIConfig) {
    super(config);

    if (!config.apiKey) {
      throw new AIProviderError(
        "OpenAI API key is required. Set OPENAI_API_KEY environment variable.",
        "openai",
        "MISSING_API_KEY"
      );
    }

    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? "https://api.openai.com/v1";
    this.organization = config.organization;
  }

  async generateText(options: GenerateTextOptions): Promise<TextGenerationResult> {
    const model = options.model ?? this.config.defaultModel ?? "gpt-4o-mini";
    const temperature = options.temperature ?? this.config.defaultTemperature ?? 0.7;
    const maxTokens = options.maxTokens ?? this.config.defaultMaxTokens ?? 4096;

    const messages: OpenAIMessage[] = options.messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
      name: msg.name,
    }));

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };

    if (this.organization) {
      headers["OpenAI-Organization"] = this.organization;
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          stop: options.stopSequences,
        }),
        signal: AbortSignal.timeout(this.config.timeout ?? 30000),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new AIProviderError(
          `OpenAI API error: ${response.status} ${response.statusText} - ${errorBody}`,
          this.name,
          "API_ERROR",
          response.status
        );
      }

      const data: OpenAIChatResponse = await response.json();
      const choice = data.choices[0];

      if (!choice) {
        throw new AIProviderError(
          "OpenAI API returned no choices",
          this.name,
          "NO_CHOICES"
        );
      }

      if (choice.message.refusal) {
        throw new AIProviderError(
          `OpenAI refused to respond: ${choice.message.refusal}`,
          this.name,
          "REFUSAL"
        );
      }

      return {
        text: choice.message.content ?? "",
        finishReason: this.mapFinishReason(choice.finish_reason),
        usage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens,
            }
          : undefined,
        model: data.model,
        provider: this.name,
      };
    } catch (error) {
      if (error instanceof AIProviderError) throw error;

      throw new AIProviderError(
        `OpenAI request failed: ${(error as Error).message}`,
        this.name,
        "REQUEST_FAILED",
        undefined,
        error as Error
      );
    }
  }

  /**
   * Generate structured output using OpenAI's native structured output feature
   */
  async generateStructured<T extends z.ZodType>(
    options: GenerateStructuredOptions<T>
  ): Promise<StructuredGenerationResult<z.infer<T>>> {
    const model = options.model ?? this.config.defaultModel ?? "gpt-4o-mini";
    const temperature = options.temperature ?? this.config.defaultTemperature ?? 0.7;
    const maxTokens = options.maxTokens ?? this.config.defaultMaxTokens ?? 4096;

    const messages: OpenAIMessage[] = options.messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Build JSON schema for response_format
    const jsonSchema = this.zodToJsonSchema(options.schema);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };

    if (this.organization) {
      headers["OpenAI-Organization"] = this.organization;
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: options.schemaName ?? "response",
              description: options.schemaDescription,
              schema: jsonSchema,
              strict: true,
            },
          },
        }),
        signal: AbortSignal.timeout(this.config.timeout ?? 60000),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        
        // Fall back to base implementation if structured outputs not supported
        if (response.status === 400 && errorBody.includes("response_format")) {
          return super.generateStructured(options);
        }

        throw new AIProviderError(
          `OpenAI API error: ${response.status} ${response.statusText} - ${errorBody}`,
          this.name,
          "API_ERROR",
          response.status
        );
      }

      const data: OpenAIStructuredResponse = await response.json();
      const choice = data.choices[0];

      if (!choice) {
        throw new AIProviderError(
          "OpenAI API returned no choices",
          this.name,
          "NO_CHOICES"
        );
      }

      if (choice.message.refusal) {
        throw new AIProviderError(
          `OpenAI refused to respond: ${choice.message.refusal}`,
          this.name,
          "REFUSAL"
        );
      }

      const rawText = choice.message.content ?? "";

      // Parse and validate
      let parsed: unknown;
      try {
        parsed = choice.message.parsed ?? JSON.parse(rawText);
      } catch (parseError) {
        throw new AIProviderError(
          `Failed to parse JSON response: ${(parseError as Error).message}`,
          this.name,
          "PARSE_ERROR",
          undefined,
          parseError as Error
        );
      }

      // Validate with Zod schema
      const validationResult = options.schema.safeParse(parsed);
      if (!validationResult.success) {
        throw new StructuredOutputError(
          "Structured output validation failed",
          this.name,
          rawText,
          validationResult.error
        );
      }

      return {
        data: validationResult.data,
        rawText,
        finishReason: this.mapFinishReason(choice.finish_reason),
        usage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens,
            }
          : undefined,
        model: data.model,
        provider: this.name,
      };
    } catch (error) {
      if (error instanceof AIProviderError) throw error;

      throw new AIProviderError(
        `OpenAI structured output request failed: ${(error as Error).message}`,
        this.name,
        "REQUEST_FAILED",
        undefined,
        error as Error
      );
    }
  }

  async *streamText(options: StreamTextOptions): AsyncIterable<string> {
    const model = options.model ?? this.config.defaultModel ?? "gpt-4o-mini";
    const temperature = options.temperature ?? this.config.defaultTemperature ?? 0.7;
    const maxTokens = options.maxTokens ?? this.config.defaultMaxTokens ?? 4096;

    const messages: OpenAIMessage[] = options.messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };

    if (this.organization) {
      headers["OpenAI-Organization"] = this.organization;
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stop: options.stopSequences,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new AIProviderError(
        `OpenAI API error: ${response.status} ${response.statusText} - ${errorBody}`,
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
        const lines = chunk.split("\n").filter((line) => line.trim().startsWith("data:"));

        for (const line of lines) {
          const data = line.replace(/^data:\s*/, "").trim();
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
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

  private mapFinishReason(
    reason: string
  ): "stop" | "length" | "content_filter" | "tool_calls" | "error" {
    switch (reason) {
      case "stop":
        return "stop";
      case "length":
        return "length";
      case "content_filter":
        return "content_filter";
      case "tool_calls":
      case "function_call":
        return "tool_calls";
      default:
        return "stop";
    }
  }
}

/**
 * Create OpenAI provider from environment variables
 */
export function createOpenAIProvider(): OpenAIProvider | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  return new OpenAIProvider({
    apiKey,
    baseUrl: process.env.OPENAI_BASE_URL,
    organization: process.env.OPENAI_ORGANIZATION,
    defaultModel: process.env.OPENAI_DEFAULT_MODEL ?? "gpt-4o-mini",
  });
}

