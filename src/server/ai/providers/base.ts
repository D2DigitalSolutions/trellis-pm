import { z } from "zod";
import { zodToJsonSchema as zodToJsonSchemaLib } from "zod-to-json-schema";
import type {
  AIProvider,
  ProviderConfig,
  GenerateTextOptions,
  GenerateStructuredOptions,
  TextGenerationResult,
  StructuredGenerationResult,
  StreamTextOptions,
} from "../types";
import { AIProviderError, StructuredOutputError } from "../types";

/**
 * Base class for AI providers with common functionality
 */
export abstract class BaseProvider implements AIProvider {
  abstract readonly name: string;
  abstract readonly supportsStructuredOutput: boolean;

  protected config: ProviderConfig;

  constructor(config: ProviderConfig = {}) {
    this.config = {
      defaultTemperature: 0.7,
      defaultMaxTokens: 4096,
      timeout: 30000,
      maxRetries: 3,
      ...config,
    };
  }

  abstract generateText(options: GenerateTextOptions): Promise<TextGenerationResult>;

  /**
   * Default implementation for structured output using JSON mode + validation
   * Providers with native structured output support should override this
   */
  async generateStructured<T extends z.ZodType>(
    options: GenerateStructuredOptions<T>
  ): Promise<StructuredGenerationResult<z.infer<T>>> {
    const { schema, schemaName, schemaDescription, ...textOptions } = options;

    // Build a system message that instructs JSON output
    const jsonSchema = this.zodToJsonSchema(schema);
    const systemMessage = this.buildJsonSystemMessage(jsonSchema, schemaName, schemaDescription);

    // Prepend or update system message
    const messages = [...options.messages];
    const existingSystemIndex = messages.findIndex((m) => m.role === "system");
    if (existingSystemIndex >= 0) {
      messages[existingSystemIndex] = {
        ...messages[existingSystemIndex],
        content: `${messages[existingSystemIndex].content}\n\n${systemMessage}`,
      };
    } else {
      messages.unshift({ role: "system", content: systemMessage });
    }

    // Generate with retries for validation
    const maxRetries = this.config.maxRetries ?? 3;
    let lastError: Error | undefined;
    let rawText = "";

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const result = await this.generateText({ ...textOptions, messages });
      rawText = result.text;

      try {
        // Extract JSON from response (handle markdown code blocks)
        const jsonStr = this.extractJson(rawText);
        const parsed = JSON.parse(jsonStr);
        const validated = schema.parse(parsed);

        return {
          data: validated,
          rawText,
          finishReason: result.finishReason,
          usage: result.usage,
          model: result.model,
          provider: result.provider,
        };
      } catch (error) {
        lastError = error as Error;

        // If it's a Zod validation error, add context for retry
        if (error instanceof z.ZodError && attempt < maxRetries - 1) {
          messages.push({
            role: "assistant",
            content: rawText,
          });
          messages.push({
            role: "user",
            content: `The JSON you provided was invalid. Validation errors:\n${error.issues
              .map((e) => `- ${e.path.join(".")}: ${e.message}`)
              .join("\n")}\n\nPlease provide a corrected JSON response.`,
          });
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

  /**
   * Extract JSON from a response that might contain markdown code blocks
   */
  protected extractJson(text: string): string {
    // Try to extract from markdown code block
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }

    // Try to find JSON object or array
    const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      return jsonMatch[1];
    }

    // Return as-is and let JSON.parse handle it
    return text.trim();
  }

  /**
   * Build a system message instructing JSON output
   */
  protected buildJsonSystemMessage(
    jsonSchema: object,
    schemaName?: string,
    schemaDescription?: string
  ): string {
    let message = "You must respond with valid JSON only. No additional text or explanation.";

    if (schemaName) {
      message += `\n\nOutput type: ${schemaName}`;
    }

    if (schemaDescription) {
      message += `\nDescription: ${schemaDescription}`;
    }

    message += `\n\nThe JSON must conform to this schema:\n\`\`\`json\n${JSON.stringify(jsonSchema, null, 2)}\n\`\`\``;

    return message;
  }

  /**
   * Convert Zod schema to JSON Schema using zod-to-json-schema library
   */
  protected zodToJsonSchema(schema: z.ZodType): object {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return zodToJsonSchemaLib(schema as any, { target: "jsonSchema7" });
    } catch {
      // Fallback to a simple description if conversion fails
      return {
        type: "object",
        description: "Schema conversion failed - please output valid JSON matching the description",
      };
    }
  }

  /**
   * Optional streaming implementation
   */
  async *streamText?(options: StreamTextOptions): AsyncIterable<string> {
    // Default implementation: just yield the full text at once
    const result = await this.generateText(options);
    yield result.text;
    options.onComplete?.(result.text);
  }
}
