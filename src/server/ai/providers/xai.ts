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
import { AIProviderError } from "../types";

interface XAIConfig extends ProviderConfig {
  apiKey: string;
  baseUrl?: string;
}

interface XAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface XAIChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
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
 * X.AI (Grok) Provider
 * Uses OpenAI-compatible API format
 */
export class XAIProvider extends BaseProvider {
  readonly name = "xai";
  readonly supportsStructuredOutput = false; // Grok doesn't have native structured output

  private apiKey: string;
  private baseUrl: string;

  constructor(config: XAIConfig) {
    super(config);
    
    if (!config.apiKey) {
      throw new AIProviderError(
        "XAI API key is required. Set XAI_API_KEY environment variable.",
        "xai",
        "MISSING_API_KEY"
      );
    }

    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? "https://api.x.ai/v1";
  }

  async generateText(options: GenerateTextOptions): Promise<TextGenerationResult> {
    const model = options.model ?? this.config.defaultModel ?? "grok-3-fast";
    const temperature = options.temperature ?? this.config.defaultTemperature ?? 0.7;
    const maxTokens = options.maxTokens ?? this.config.defaultMaxTokens ?? 4096;

    const messages: XAIMessage[] = options.messages.map((msg) => ({
      role: msg.role === "tool" ? "user" : msg.role,
      content: msg.content,
    }));

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
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
          `XAI API error: ${response.status} ${response.statusText} - ${errorBody}`,
          this.name,
          "API_ERROR",
          response.status
        );
      }

      const data: XAIChatResponse = await response.json();
      const choice = data.choices[0];

      if (!choice) {
        throw new AIProviderError(
          "XAI API returned no choices",
          this.name,
          "NO_CHOICES"
        );
      }

      return {
        text: choice.message.content,
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
        `XAI request failed: ${(error as Error).message}`,
        this.name,
        "REQUEST_FAILED",
        undefined,
        error as Error
      );
    }
  }

  async *streamText(options: StreamTextOptions): AsyncIterable<string> {
    const model = options.model ?? this.config.defaultModel ?? "grok-3-fast";
    const temperature = options.temperature ?? this.config.defaultTemperature ?? 0.7;
    const maxTokens = options.maxTokens ?? this.config.defaultMaxTokens ?? 4096;

    const messages: XAIMessage[] = options.messages.map((msg) => ({
      role: msg.role === "tool" ? "user" : msg.role,
      content: msg.content,
    }));

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
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
        `XAI API error: ${response.status} ${response.statusText} - ${errorBody}`,
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
 * Create XAI provider from environment variables
 */
export function createXAIProvider(): XAIProvider | null {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return null;

  return new XAIProvider({
    apiKey,
    baseUrl: process.env.XAI_BASE_URL,
    defaultModel: process.env.XAI_DEFAULT_MODEL ?? "grok-3-fast",
  });
}

