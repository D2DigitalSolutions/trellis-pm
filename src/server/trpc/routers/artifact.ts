import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

// ============================================
// Enums & Shared Schemas
// ============================================

const artifactTypeEnum = z.enum(["PLAN", "SPEC", "CHECKLIST", "DECISION", "CODE", "NOTE"]);

// ============================================
// Input Schemas
// ============================================

const artifactCreateInputSchema = z.object({
  type: artifactTypeEnum,
  title: z.string().min(1, "Title is required").max(255, "Title is too long"),
  content: z.record(z.unknown()),
  workItemId: z.string().min(1, "Work item ID is required"),
  branchId: z.string().optional(),
});

const artifactUpdateInputSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.record(z.unknown()).optional(),
});

const artifactListInputSchema = z.object({
  workItemId: z.string(),
  type: artifactTypeEnum.optional(),
  branchId: z.string().optional(),
  includeDeleted: z.boolean().optional().default(false),
  limit: z.number().min(1).max(100).optional().default(50),
  cursor: z.string().optional(),
});

// ============================================
// Output Schemas
// ============================================

const branchSummarySchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
});

const workItemSummarySchema = z.object({
  id: z.string(),
  type: z.enum(["EPIC", "SPRINT", "TASK", "BUG", "IDEA"]),
  title: z.string(),
  projectId: z.string(),
});

const artifactOutputSchema = z.object({
  id: z.string(),
  type: artifactTypeEnum,
  title: z.string(),
  content: z.unknown(),
  version: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
  workItemId: z.string(),
  branchId: z.string().nullable(),
});

const artifactWithRelationsSchema = artifactOutputSchema.extend({
  branch: branchSummarySchema.nullable(),
  workItem: workItemSummarySchema.optional(),
});

const artifactListOutputSchema = z.object({
  artifacts: z.array(artifactWithRelationsSchema),
  nextCursor: z.string().optional(),
});

// ============================================
// Router
// ============================================

export const artifactRouter = createTRPCRouter({
  /**
   * List artifacts for a work item with optional filtering
   */
  list: publicProcedure
    .input(artifactListInputSchema)
    .output(artifactListOutputSchema)
    .query(async ({ ctx, input }) => {
      const limit = input.limit;

      const artifacts = await ctx.db.artifact.findMany({
        where: {
          workItemId: input.workItemId,
          type: input.type,
          branchId: input.branchId,
          deletedAt: input.includeDeleted ? undefined : null,
        },
        include: {
          branch: {
            select: {
              id: true,
              name: true,
            },
          },
          workItem: {
            select: {
              id: true,
              type: true,
              title: true,
              projectId: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
      });

      let nextCursor: string | undefined;
      if (artifacts.length > limit) {
        const nextItem = artifacts.pop();
        nextCursor = nextItem?.id;
      }

      return {
        artifacts,
        nextCursor,
      };
    }),

  /**
   * Get all artifacts for a work item (legacy alias)
   */
  getByWorkItem: publicProcedure
    .input(z.object({
      workItemId: z.string(),
      type: artifactTypeEnum.optional(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.artifact.findMany({
        where: {
          workItemId: input.workItemId,
          type: input.type,
          deletedAt: null,
        },
        include: {
          branch: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  /**
   * Get artifacts for a specific branch
   */
  getByBranch: publicProcedure
    .input(z.object({ branchId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.artifact.findMany({
        where: {
          branchId: input.branchId,
          deletedAt: null,
        },
        include: {
          workItem: {
            select: {
              id: true,
              type: true,
              title: true,
              projectId: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  /**
   * Get a single artifact by ID
   */
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const artifact = await ctx.db.artifact.findUnique({
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
          branch: {
            select: {
              id: true,
              name: true,
              isDefault: true,
            },
          },
        },
      });

      if (!artifact) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Artifact not found",
        });
      }

      return artifact;
    }),

  /**
   * Get a single artifact by ID (legacy alias)
   */
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.artifact.findUnique({
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
          branch: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    }),

  /**
   * Create a new artifact
   */
  create: publicProcedure
    .input(artifactCreateInputSchema)
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

      // Validate branch if provided
      if (input.branchId) {
        const branch = await ctx.db.branch.findUnique({
          where: { id: input.branchId },
        });

        if (!branch) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Branch not found",
          });
        }

        if (branch.workItemId !== input.workItemId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Branch must belong to the same work item",
          });
        }
      }

      const artifact = await ctx.db.artifact.create({
        data: {
          type: input.type,
          title: input.title,
          content: input.content,
          workItemId: input.workItemId,
          branchId: input.branchId,
          version: 1,
        },
        include: {
          workItem: {
            select: {
              id: true,
              type: true,
              title: true,
              projectId: true,
            },
          },
          branch: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return artifact;
    }),

  /**
   * Update an artifact (increments version)
   */
  update: publicProcedure
    .input(z.object({
      id: z.string(),
      data: artifactUpdateInputSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      // Get current artifact to increment version
      const current = await ctx.db.artifact.findUnique({
        where: { id: input.id },
      });

      if (!current) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Artifact not found",
        });
      }

      if (current.deletedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot update a deleted artifact",
        });
      }

      const artifact = await ctx.db.artifact.update({
        where: { id: input.id },
        data: {
          title: input.data.title,
          content: input.data.content,
          version: current.version + 1,
        },
        include: {
          workItem: {
            select: {
              id: true,
              type: true,
              title: true,
              projectId: true,
            },
          },
          branch: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return artifact;
    }),

  /**
   * Soft delete an artifact
   */
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.artifact.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      });
    }),

  /**
   * Restore a soft-deleted artifact
   */
  restore: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.artifact.update({
        where: { id: input.id },
        data: { deletedAt: null },
      });
    }),

  /**
   * Duplicate an artifact (creates a copy with version 1)
   */
  duplicate: publicProcedure
    .input(z.object({
      id: z.string(),
      newTitle: z.string().min(1).max(255).optional(),
      targetBranchId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const original = await ctx.db.artifact.findUnique({
        where: { id: input.id },
      });

      if (!original) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Artifact not found",
        });
      }

      const duplicate = await ctx.db.artifact.create({
        data: {
          type: original.type,
          title: input.newTitle ?? `${original.title} (copy)`,
          content: original.content as object,
          workItemId: original.workItemId,
          branchId: input.targetBranchId ?? original.branchId,
          version: 1,
        },
        include: {
          workItem: {
            select: {
              id: true,
              type: true,
              title: true,
              projectId: true,
            },
          },
          branch: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return duplicate;
    }),
});
