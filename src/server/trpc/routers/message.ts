import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { triggerSummarizationIfNeeded } from "@/server/services/summarization";

// ============================================
// Enums & Shared Schemas
// ============================================

const messageRoleEnum = z.enum(["USER", "ASSISTANT", "TOOL", "SYSTEM"]);

// ============================================
// Input Schemas
// ============================================

const messageCreateInputSchema = z.object({
  branchId: z.string().min(1, "Branch ID is required"),
  role: messageRoleEnum,
  content: z.string().min(1, "Content is required"),
  userId: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

const messageUpdateInputSchema = z.object({
  content: z.string().min(1),
  metadata: z.record(z.string(), z.any()).optional(),
});

const messageListInputSchema = z.object({
  branchId: z.string(),
  limit: z.number().min(1).max(100).optional().default(50),
  cursor: z.string().optional(),
  order: z.enum(["asc", "desc"]).optional().default("asc"),
  includeDeleted: z.boolean().optional().default(false),
});

// ============================================
// Output Schemas
// ============================================

const userSummarySchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  avatarUrl: z.string().nullable(),
});

const messageOutputSchema = z.object({
  id: z.string(),
  role: messageRoleEnum,
  content: z.string(),
  metadata: z.unknown().nullable(),
  createdAt: z.date(),
  deletedAt: z.date().nullable(),
  branchId: z.string(),
  userId: z.string().nullable(),
  user: userSummarySchema.nullable(),
});

const messageListOutputSchema = z.object({
  messages: z.array(messageOutputSchema),
  nextCursor: z.string().optional(),
  totalCount: z.number().optional(),
});

// ============================================
// Router
// ============================================

export const messageRouter = createTRPCRouter({
  /**
   * List messages for a branch with pagination
   */
  list: publicProcedure
    .input(messageListInputSchema)
    .output(messageListOutputSchema)
    .query(async ({ ctx, input }) => {
      const limit = input.limit;

      // Get total count for the branch
      const totalCount = await ctx.db.message.count({
        where: {
          branchId: input.branchId,
          deletedAt: input.includeDeleted ? undefined : null,
        },
      });

      const messages = await ctx.db.message.findMany({
        where: {
          branchId: input.branchId,
          deletedAt: input.includeDeleted ? undefined : null,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: input.order },
        take: limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
      });

      let nextCursor: string | undefined;
      if (messages.length > limit) {
        const nextItem = messages.pop();
        nextCursor = nextItem?.id;
      }

      return {
        messages,
        nextCursor,
        totalCount,
      };
    }),

  /**
   * Get all messages for a branch (legacy alias)
   */
  getByBranch: publicProcedure
    .input(z.object({
      branchId: z.string(),
      limit: z.number().min(1).max(100).optional().default(50),
      cursor: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const limit = input.limit;

      const messages = await ctx.db.message.findMany({
        where: {
          branchId: input.branchId,
          deletedAt: null,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
        take: limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
      });

      let nextCursor: string | undefined;
      if (messages.length > limit) {
        const nextItem = messages.pop();
        nextCursor = nextItem?.id;
      }

      return {
        messages,
        nextCursor,
      };
    }),

  /**
   * Get a single message by ID
   */
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const message = await ctx.db.message.findUnique({
        where: { id: input.id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          branch: {
            select: {
              id: true,
              name: true,
              workItemId: true,
              isDefault: true,
            },
          },
        },
      });

      if (!message) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Message not found",
        });
      }

      return message;
    }),

  /**
   * Get a single message by ID (legacy alias)
   */
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.message.findUnique({
        where: { id: input.id },
        include: {
          user: true,
          branch: {
            select: {
              id: true,
              name: true,
              workItemId: true,
            },
          },
        },
      });
    }),

  /**
   * Append a new message to a branch
   */
  append: publicProcedure
    .input(messageCreateInputSchema)
    .mutation(async ({ ctx, input }) => {
      // Validate branch exists
      const branch = await ctx.db.branch.findUnique({
        where: { id: input.branchId },
      });

      if (!branch) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Branch not found",
        });
      }

      if (branch.deletedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot append to a deleted branch",
        });
      }

      // Validate user exists if userId provided
      if (input.userId) {
        const user = await ctx.db.user.findUnique({
          where: { id: input.userId },
        });

        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }
      }

      const message = await ctx.db.message.create({
        data: {
          branchId: input.branchId,
          role: input.role,
          content: input.content,
          userId: input.userId,
          metadata: input.metadata,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
          branch: {
            select: {
              id: true,
              name: true,
              workItemId: true,
            },
          },
        },
      });

      // Trigger background summarization if needed (fire-and-forget)
      // This won't block the response - runs in background with timeout
      triggerSummarizationIfNeeded(input.branchId);

      return message;
    }),

  /**
   * Create a new message (legacy alias for append)
   */
  create: publicProcedure
    .input(z.object({
      branchId: z.string(),
      role: messageRoleEnum,
      content: z.string(),
      userId: z.string().optional(),
      metadata: z.record(z.string(), z.any()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.message.create({
        data: {
          branchId: input.branchId,
          role: input.role,
          content: input.content,
          userId: input.userId,
          metadata: input.metadata,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
      });
    }),

  /**
   * Update a message (typically for streaming updates)
   */
  update: publicProcedure
    .input(z.object({
      id: z.string(),
      data: messageUpdateInputSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      const message = await ctx.db.message.update({
        where: { id: input.id },
        data: {
          content: input.data.content,
          metadata: input.data.metadata,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
      });

      return message;
    }),

  /**
   * Soft delete a message
   */
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.message.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      });
    }),

  /**
   * Restore a soft-deleted message
   */
  restore: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.message.update({
        where: { id: input.id },
        data: { deletedAt: null },
      });
    }),

  /**
   * Bulk append multiple messages to a branch (useful for importing conversations)
   */
  bulkAppend: publicProcedure
    .input(z.object({
      branchId: z.string(),
      messages: z.array(z.object({
        role: messageRoleEnum,
        content: z.string(),
        userId: z.string().optional(),
        metadata: z.record(z.string(), z.any()).optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      // Validate branch exists
      const branch = await ctx.db.branch.findUnique({
        where: { id: input.branchId },
      });

      if (!branch) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Branch not found",
        });
      }

      const created = await ctx.db.message.createMany({
        data: input.messages.map((msg) => ({
          branchId: input.branchId,
          role: msg.role,
          content: msg.content,
          userId: msg.userId,
          metadata: msg.metadata,
        })),
      });

      // Trigger background summarization if needed (fire-and-forget)
      triggerSummarizationIfNeeded(input.branchId);

      return { count: created.count };
    }),
});
