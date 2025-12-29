import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import {
  ContextBuilder,
  SummarizationService,
  type ContextPack,
} from "@/server/services";

// ============================================
// Output Schemas
// ============================================

const contextPackSchema = z.object({
  project: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    summary: z.string().nullable(),
  }),
  workItem: z.object({
    id: z.string(),
    type: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    status: z.string(),
    priority: z.string(),
    acceptanceCriteria: z.string().nullable(),
    parentItems: z.array(z.object({
      id: z.string(),
      type: z.string(),
      title: z.string(),
    })),
  }),
  branch: z.object({
    id: z.string(),
    name: z.string().nullable(),
    summary: z.string().nullable(),
    messageCount: z.number(),
    isDefault: z.boolean(),
  }),
  messages: z.array(z.object({
    id: z.string(),
    role: z.string(),
    content: z.string(),
    createdAt: z.date(),
    userName: z.string().nullable(),
  })),
  artifacts: z.object({
    plan: z.object({
      id: z.string(),
      type: z.string(),
      title: z.string(),
      version: z.number(),
      content: z.unknown(),
      updatedAt: z.date(),
    }).nullable(),
    spec: z.object({
      id: z.string(),
      type: z.string(),
      title: z.string(),
      version: z.number(),
      content: z.unknown(),
      updatedAt: z.date(),
    }).nullable(),
    decision: z.object({
      id: z.string(),
      type: z.string(),
      title: z.string(),
      version: z.number(),
      content: z.unknown(),
      updatedAt: z.date(),
    }).nullable(),
    checklist: z.object({
      id: z.string(),
      type: z.string(),
      title: z.string(),
      version: z.number(),
      content: z.unknown(),
      updatedAt: z.date(),
    }).nullable(),
    all: z.array(z.object({
      id: z.string(),
      type: z.string(),
      title: z.string(),
      version: z.number(),
      content: z.unknown(),
      updatedAt: z.date(),
    })),
  }),
  metadata: z.object({
    generatedAt: z.date(),
    tokenEstimate: z.number(),
  }),
});

// ============================================
// Router
// ============================================

export const contextRouter = createTRPCRouter({
  /**
   * Build context pack for a branch
   */
  build: publicProcedure
    .input(z.object({
      branchId: z.string(),
      options: z.object({
        messageLimit: z.number().min(1).max(100).optional(),
        includeArtifacts: z.boolean().optional(),
        artifactTypes: z.array(z.enum(["PLAN", "SPEC", "DECISION", "CHECKLIST", "CODE", "NOTE"])).optional(),
        includeParentItems: z.boolean().optional(),
        includeBranchSummary: z.boolean().optional(),
      }).optional(),
    }))
    .output(contextPackSchema)
    .query(async ({ input }) => {
      const builder = new ContextBuilder(input.options);
      
      try {
        return await builder.buildContext(input.branchId);
      } catch (error) {
        if ((error as Error).message?.includes("not found")) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: (error as Error).message,
          });
        }
        throw error;
      }
    }),

  /**
   * Build context as formatted string for AI prompts
   */
  buildString: publicProcedure
    .input(z.object({
      branchId: z.string(),
      options: z.object({
        messageLimit: z.number().min(1).max(100).optional(),
        includeArtifacts: z.boolean().optional(),
      }).optional(),
    }))
    .output(z.object({
      context: z.string(),
      tokenEstimate: z.number(),
    }))
    .query(async ({ input }) => {
      const builder = new ContextBuilder(input.options);
      
      try {
        const pack = await builder.buildContext(input.branchId);
        const context = builder.formatContextAsString(pack);
        
        return {
          context,
          tokenEstimate: pack.metadata.tokenEstimate,
        };
      } catch (error) {
        if ((error as Error).message?.includes("not found")) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: (error as Error).message,
          });
        }
        throw error;
      }
    }),

  /**
   * Check if a branch needs summarization
   */
  needsSummary: publicProcedure
    .input(z.object({ branchId: z.string() }))
    .output(z.object({
      needsSummary: z.boolean(),
      currentMessageCount: z.number(),
      lastSummaryMessageCount: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const branch = await ctx.db.branch.findUnique({
        where: { id: input.branchId },
        select: {
          summaryMessageCount: true,
          _count: {
            select: { messages: true },
          },
        },
      });

      if (!branch) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Branch not found",
        });
      }

      const service = new SummarizationService();
      const needsSummary = await service.branchNeedsSummary(input.branchId);

      return {
        needsSummary,
        currentMessageCount: branch._count.messages,
        lastSummaryMessageCount: branch.summaryMessageCount,
      };
    }),

  /**
   * Generate/update summary for a branch
   */
  summarizeBranch: publicProcedure
    .input(z.object({
      branchId: z.string(),
      force: z.boolean().optional().default(false),
    }))
    .output(z.object({
      success: z.boolean(),
      summary: z.string().nullable(),
      skipped: z.boolean(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const service = new SummarizationService();

      // Check if summary is needed
      if (!input.force) {
        const needsSummary = await service.branchNeedsSummary(input.branchId);
        if (!needsSummary) {
          return {
            success: true,
            summary: null,
            skipped: true,
            reason: "Branch does not need summarization yet",
          };
        }
      }

      try {
        const result = await service.summarizeBranch(input.branchId);
        
        if (!result) {
          return {
            success: false,
            summary: null,
            skipped: true,
            reason: "No AI provider configured or not enough messages",
          };
        }

        // Format summary
        const summary = [
          result.summary,
          result.keyDecisions.length > 0 ? `\nKey Decisions:\n${result.keyDecisions.map(d => `• ${d}`).join("\n")}` : "",
          result.openQuestions.length > 0 ? `\nOpen Questions:\n${result.openQuestions.map(q => `• ${q}`).join("\n")}` : "",
          result.nextSteps.length > 0 ? `\nNext Steps:\n${result.nextSteps.map(s => `• ${s}`).join("\n")}` : "",
        ].filter(Boolean).join("\n");

        return {
          success: true,
          summary,
          skipped: false,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to summarize branch: ${(error as Error).message}`,
          cause: error,
        });
      }
    }),

  /**
   * Generate/update summary for a project
   */
  summarizeProject: publicProcedure
    .input(z.object({ projectId: z.string() }))
    .output(z.object({
      success: z.boolean(),
      summary: z.string().nullable(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const service = new SummarizationService();

      try {
        const result = await service.summarizeProject(input.projectId);
        
        if (!result) {
          return {
            success: false,
            summary: null,
            reason: "No AI provider configured",
          };
        }

        const summary = [
          result.summary,
          result.goals.length > 0 ? `\nGoals:\n${result.goals.map(g => `• ${g}`).join("\n")}` : "",
          result.currentFocus ? `\nCurrent Focus: ${result.currentFocus}` : "",
          result.recentProgress.length > 0 ? `\nRecent Progress:\n${result.recentProgress.map(p => `• ${p}`).join("\n")}` : "",
        ].filter(Boolean).join("\n");

        return {
          success: true,
          summary,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to summarize project: ${(error as Error).message}`,
          cause: error,
        });
      }
    }),

  /**
   * Run summarization job for all branches that need it
   */
  runSummarizationJob: publicProcedure
    .output(z.object({
      updated: z.array(z.string()),
      failed: z.array(z.string()),
      skipped: z.number(),
    }))
    .mutation(async () => {
      const service = new SummarizationService();
      const result = await service.updatePendingSummaries();

      return {
        ...result,
        skipped: 0, // Could be calculated if needed
      };
    }),
});

