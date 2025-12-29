import { z } from "zod";
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
            content: `The JSON you provided was invalid. Validation errors:\n${error.errors
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
   * Convert Zod schema to JSON Schema (simplified)
   * For production, consider using zod-to-json-schema package
   */
  protected zodToJsonSchema(schema: z.ZodType): object {
    return this.zodTypeToJsonSchema(schema);
  }

  private zodTypeToJsonSchema(schema: z.ZodType): object {
    const def = schema._def;

    // Handle ZodObject
    if (def.typeName === "ZodObject") {
      const shape = (schema as z.ZodObject<z.ZodRawShape>).shape;
      const properties: Record<string, object> = {};
      const required: string[] = [];

      for (const [key, value] of Object.entries(shape)) {
        properties[key] = this.zodTypeToJsonSchema(value as z.ZodType);
        if (!this.isOptional(value as z.ZodType)) {
          required.push(key);
        }
      }

      return {
        type: "object",
        properties,
        required: required.length > 0 ? required : undefined,
      };
    }

    // Handle ZodArray
    if (def.typeName === "ZodArray") {
      return {
        type: "array",
        items: this.zodTypeToJsonSchema((def as z.ZodArrayDef).type),
      };
    }

    // Handle ZodString
    if (def.typeName === "ZodString") {
      return { type: "string" };
    }

    // Handle ZodNumber
    if (def.typeName === "ZodNumber") {
      return { type: "number" };
    }

    // Handle ZodBoolean
    if (def.typeName === "ZodBoolean") {
      return { type: "boolean" };
    }

    // Handle ZodEnum
    if (def.typeName === "ZodEnum") {
      return {
        type: "string",
        enum: (def as z.ZodEnumDef).values,
      };
    }

    // Handle ZodOptional
    if (def.typeName === "ZodOptional") {
      return this.zodTypeToJsonSchema((def as z.ZodOptionalDef).innerType);
    }

    // Handle ZodNullable
    if (def.typeName === "ZodNullable") {
      const inner = this.zodTypeToJsonSchema((def as z.ZodNullableDef).innerType);
      return { ...inner, nullable: true };
    }

    // Handle ZodDefault
    if (def.typeName === "ZodDefault") {
      return this.zodTypeToJsonSchema((def as z.ZodDefaultDef).innerType);
    }

    // Handle ZodLiteral
    if (def.typeName === "ZodLiteral") {
      return { const: (def as z.ZodLiteralDef).value };
    }

    // Handle ZodUnion
    if (def.typeName === "ZodUnion") {
      return {
        oneOf: (def as z.ZodUnionDef).options.map((opt: z.ZodType) =>
          this.zodTypeToJsonSchema(opt)
        ),
      };
    }

    // Handle ZodRecord
    if (def.typeName === "ZodRecord") {
      return {
        type: "object",
        additionalProperties: this.zodTypeToJsonSchema(
          (def as z.ZodRecordDef).valueType
        ),
      };
    }

    // Default fallback
    return { type: "string" };
  }

  private isOptional(schema: z.ZodType): boolean {
    return (
      schema._def.typeName === "ZodOptional" ||
      schema._def.typeName === "ZodDefault"
    );
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

