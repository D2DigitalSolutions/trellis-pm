import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { extractWork } from "@/server/ai/extract-work";
import { extractWorkInputSchema, extractWorkResponseSchema } from "@/server/ai/schemas";
import { getAIProvider, getProviderStatus } from "@/server/ai";
import { AIProviderError, StructuredOutputError } from "@/server/ai/types";

// ============================================
// Router
// ============================================

export const aiRouter = createTRPCRouter({
  /**
   * Get AI provider status
   */
  status: publicProcedure
    .output(z.object({
      configured: z.string().nullable(),
      available: z.array(z.string()),
      details: z.record(z.object({
        available: z.boolean(),
        reason: z.string().optional(),
      })),
    }))
    .query(() => {
      return getProviderStatus();
    }),

  /**
   * Extract work items from user text
   */
  extractWork: publicProcedure
    .input(extractWorkInputSchema)
    .output(z.object({
      data: extractWorkResponseSchema,
      metadata: z.object({
        provider: z.string(),
        model: z.string(),
        tokenUsage: z.object({
          prompt: z.number(),
          completion: z.number(),
          total: z.number(),
        }).optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      try {
        const result = await extractWork(input.branchId, input.userText, {
          includeContext: input.options?.includeContext ?? true,
          maxWorkItems: input.options?.maxWorkItems ?? 10,
          preferredTypes: input.options?.preferredTypes,
        });

        return {
          data: result.data,
          metadata: {
            provider: result.provider,
            model: result.model,
            tokenUsage: result.tokenUsage,
          },
        };
      } catch (error) {
        if (error instanceof StructuredOutputError) {
          throw new TRPCError({
            code: "UNPROCESSABLE_CONTENT",
            message: "Failed to parse AI response into valid structure",
            cause: error,
          });
        }

        if (error instanceof AIProviderError) {
          if (error.code === "NO_PROVIDER") {
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message: error.message,
              cause: error,
            });
          }
          throw new TRPCError({
            code: "BAD_GATEWAY",
            message: `AI provider error: ${error.message}`,
            cause: error,
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Unknown error",
          cause: error,
        });
      }
    }),

  /**
   * Simple text generation (for testing/debugging)
   */
  generateText: publicProcedure
    .input(z.object({
      prompt: z.string().min(1),
      model: z.string().optional(),
      temperature: z.number().min(0).max(2).optional(),
      maxTokens: z.number().min(1).max(4096).optional(),
    }))
    .output(z.object({
      text: z.string(),
      provider: z.string(),
      model: z.string(),
      usage: z.object({
        promptTokens: z.number(),
        completionTokens: z.number(),
        totalTokens: z.number(),
      }).optional(),
    }))
    .mutation(async ({ input }) => {
      const provider = getAIProvider();

      if (!provider) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "No AI provider configured",
        });
      }

      try {
        const result = await provider.generateText({
          messages: [{ role: "user", content: input.prompt }],
          model: input.model,
          temperature: input.temperature ?? 0.7,
          maxTokens: input.maxTokens ?? 1024,
        });

        return {
          text: result.text,
          provider: result.provider,
          model: result.model,
          usage: result.usage,
        };
      } catch (error) {
        if (error instanceof AIProviderError) {
          throw new TRPCError({
            code: "BAD_GATEWAY",
            message: `AI provider error: ${error.message}`,
            cause: error,
          });
        }
        throw error;
      }
    }),
});

