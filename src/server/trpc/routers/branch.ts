import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

// ============================================
// Input Schemas
// ============================================

const branchCreateInputSchema = z.object({
  workItemId: z.string().min(1, "Work item ID is required"),
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  forkedFromId: z.string().optional(),
  forkPointMessageId: z.string().optional(),
});

const branchUpdateInputSchema = z.object({
  name: z.string().min(1).max(100),
});

// ============================================
// Output Schemas
// ============================================

const userSummarySchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  avatarUrl: z.string().nullable(),
});

const messageRoleEnum = z.enum(["USER", "ASSISTANT", "TOOL", "SYSTEM"]);

const messageSchema = z.object({
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

const branchSummarySchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  isDefault: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
  workItemId: z.string(),
  forkedFromId: z.string().nullable(),
  forkPointMessageId: z.string().nullable(),
});

const branchWithCountsSchema = branchSummarySchema.extend({
  forkedFrom: z.object({
    id: z.string(),
    name: z.string().nullable(),
  }).nullable(),
  _count: z.object({
    messages: z.number(),
    artifacts: z.number(),
    forks: z.number(),
  }),
});

// ============================================
// Router
// ============================================

export const branchRouter = createTRPCRouter({
  /**
   * List all branches for a work item
   */
  list: publicProcedure
    .input(z.object({ 
      workItemId: z.string(),
      includeDeleted: z.boolean().optional().default(false),
    }))
    .query(async ({ ctx, input }) => {
      const branches = await ctx.db.branch.findMany({
        where: {
          workItemId: input.workItemId,
          deletedAt: input.includeDeleted ? undefined : null,
        },
        include: {
          forkedFrom: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              messages: true,
              artifacts: true,
              forks: true,
            },
          },
        },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      });

      return { branches };
    }),

  /**
   * Get all branches for a work item (legacy alias)
   */
  getByWorkItem: publicProcedure
    .input(z.object({ workItemId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.branch.findMany({
        where: {
          workItemId: input.workItemId,
          deletedAt: null,
        },
        include: {
          forkedFrom: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              messages: true,
              artifacts: true,
              forks: true,
            },
          },
        },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      });
    }),

  /**
   * Get a single branch by ID with messages
   */
  get: publicProcedure
    .input(z.object({
      id: z.string(),
      includeMessages: z.boolean().optional().default(true),
      messageLimit: z.number().min(1).max(100).optional().default(50),
    }))
    .query(async ({ ctx, input }) => {
      const branch = await ctx.db.branch.findUnique({
        where: { id: input.id },
        include: {
          workItem: {
            select: {
              id: true,
              type: true,
              title: true,
              projectId: true,
              status: true,
            },
          },
          forkedFrom: {
            select: {
              id: true,
              name: true,
              isDefault: true,
            },
          },
          forks: {
            where: { deletedAt: null },
            select: {
              id: true,
              name: true,
              createdAt: true,
            },
          },
          messages: input.includeMessages ? {
            where: { deletedAt: null },
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
            take: input.messageLimit,
          } : false,
          artifacts: {
            where: { deletedAt: null },
            orderBy: { createdAt: "desc" },
            take: 10,
          },
          _count: {
            select: {
              messages: true,
              artifacts: true,
              forks: true,
            },
          },
        },
      });

      if (!branch) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Branch not found",
        });
      }

      return branch;
    }),

  /**
   * Get a single branch by ID (legacy alias)
   */
  getById: publicProcedure
    .input(z.object({
      id: z.string(),
      includeMessages: z.boolean().optional().default(true),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.branch.findUnique({
        where: { id: input.id },
        include: {
          workItem: {
            select: {
              id: true,
              type: true,
              title: true,
              projectId: true,
            },
          },
          forkedFrom: true,
          messages: input.includeMessages ? {
            where: { deletedAt: null },
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
          } : false,
          artifacts: {
            where: { deletedAt: null },
            orderBy: { createdAt: "desc" },
          },
        },
      });
    }),

  /**
   * Create a new branch on a work item
   */
  create: publicProcedure
    .input(branchCreateInputSchema)
    .mutation(async ({ ctx, input }) => {
      // Validate work item exists
      const workItem = await ctx.db.workItem.findUnique({
        where: { id: input.workItemId },
      });

      if (!workItem) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Work item not found",
        });
      }

      // If forking, validate the source branch
      if (input.forkedFromId) {
        const sourceBranch = await ctx.db.branch.findUnique({
          where: { id: input.forkedFromId },
        });

        if (!sourceBranch) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Source branch not found",
          });
        }

        if (sourceBranch.workItemId !== input.workItemId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Source branch must belong to the same work item",
          });
        }
      }

      const branch = await ctx.db.branch.create({
        data: {
          name: input.name,
          isDefault: false,
          workItemId: input.workItemId,
          forkedFromId: input.forkedFromId,
          forkPointMessageId: input.forkPointMessageId,
        },
        include: {
          workItem: {
            select: {
              id: true,
              type: true,
              title: true,
            },
          },
          forkedFrom: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              messages: true,
              artifacts: true,
              forks: true,
            },
          },
        },
      });

      return branch;
    }),

  /**
   * Fork a branch from a specific message
   * Creates a new branch that starts from the conversation state at that message
   */
  forkFromMessage: publicProcedure
    .input(z.object({
      messageId: z.string().min(1, "Message ID is required"),
      name: z.string().min(1, "Name is required").max(100, "Name is too long"),
      copyMessagesUpToForkPoint: z.boolean().optional().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get the message and its branch
      const message = await ctx.db.message.findUnique({
        where: { id: input.messageId },
        include: {
          branch: {
            select: {
              id: true,
              name: true,
              workItemId: true,
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

      // Create the new branch
      const newBranch = await ctx.db.branch.create({
        data: {
          name: input.name,
          isDefault: false,
          workItemId: message.branch.workItemId,
          forkedFromId: message.branchId,
          forkPointMessageId: input.messageId,
        },
      });

      // Optionally copy messages up to (and including) the fork point
      if (input.copyMessagesUpToForkPoint) {
        const messagesToCopy = await ctx.db.message.findMany({
          where: {
            branchId: message.branchId,
            deletedAt: null,
            createdAt: { lte: message.createdAt },
          },
          orderBy: { createdAt: "asc" },
        });

        if (messagesToCopy.length > 0) {
          await ctx.db.message.createMany({
            data: messagesToCopy.map((msg) => ({
              role: msg.role,
              content: msg.content,
              metadata: msg.metadata,
              branchId: newBranch.id,
              userId: msg.userId,
            })),
          });
        }
      }

      // Return the new branch with details
      return ctx.db.branch.findUnique({
        where: { id: newBranch.id },
        include: {
          workItem: {
            select: {
              id: true,
              type: true,
              title: true,
              projectId: true,
            },
          },
          forkedFrom: {
            select: {
              id: true,
              name: true,
            },
          },
          messages: {
            where: { deletedAt: null },
            orderBy: { createdAt: "asc" },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  avatarUrl: true,
                },
              },
            },
          },
          _count: {
            select: {
              messages: true,
              artifacts: true,
              forks: true,
            },
          },
        },
      });
    }),

  /**
   * Update branch name
   */
  update: publicProcedure
    .input(z.object({
      id: z.string(),
      data: branchUpdateInputSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.branch.update({
        where: { id: input.id },
        data: { name: input.data.name },
        include: {
          _count: {
            select: {
              messages: true,
              artifacts: true,
              forks: true,
            },
          },
        },
      });
    }),

  /**
   * Set a branch as the default for its work item
   */
  setDefault: publicProcedure
    .input(z.object({
      id: z.string(),
      workItemId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Remove default from all branches of this work item
      await ctx.db.branch.updateMany({
        where: { workItemId: input.workItemId },
        data: { isDefault: false },
      });

      // Set the new default
      return ctx.db.branch.update({
        where: { id: input.id },
        data: { isDefault: true },
        include: {
          _count: {
            select: {
              messages: true,
              artifacts: true,
              forks: true,
            },
          },
        },
      });
    }),

  /**
   * Soft delete a branch
   */
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Prevent deleting the default branch
      const branch = await ctx.db.branch.findUnique({
        where: { id: input.id },
      });

      if (!branch) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Branch not found",
        });
      }

      if (branch.isDefault) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete the default branch. Set another branch as default first.",
        });
      }

      return ctx.db.branch.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      });
    }),

  /**
   * Restore a soft-deleted branch
   */
  restore: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.branch.update({
        where: { id: input.id },
        data: { deletedAt: null },
      });
    }),
});
