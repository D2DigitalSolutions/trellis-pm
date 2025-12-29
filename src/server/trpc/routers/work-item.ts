import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";

// Zod schemas for work item operations
const workItemCreateSchema = z.object({
  type: z.enum(["EPIC", "SPRINT", "TASK", "BUG", "IDEA"]),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z.enum(["OPEN", "IN_PROGRESS", "IN_REVIEW", "BLOCKED", "DONE", "CANCELLED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  position: z.number().optional(),
  projectId: z.string(),
  creatorId: z.string(),
  assigneeId: z.string().optional(),
  parentId: z.string().optional(), // Will create a PARENT_CHILD edge
});

const workItemUpdateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z.enum(["OPEN", "IN_PROGRESS", "IN_REVIEW", "BLOCKED", "DONE", "CANCELLED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  position: z.number().optional(),
  assigneeId: z.string().nullable().optional(),
});

export const workItemRouter = createTRPCRouter({
  /**
   * Get all work items for a project
   */
  getByProject: publicProcedure
    .input(z.object({ 
      projectId: z.string(),
      type: z.enum(["EPIC", "SPRINT", "TASK", "BUG", "IDEA"]).optional(),
      includeDeleted: z.boolean().optional().default(false),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.workItem.findMany({
        where: { 
          projectId: input.projectId,
          type: input.type,
          deletedAt: input.includeDeleted ? undefined : null,
        },
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          creator: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
          _count: {
            select: {
              branches: true,
              artifacts: true,
              childEdges: true,
            },
          },
        },
        orderBy: [{ status: "asc" }, { position: "asc" }],
      });
    }),

  /**
   * Get a single work item by ID with full details
   */
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.workItem.findUnique({
        where: { id: input.id },
        include: {
          assignee: true,
          creator: true,
          branches: {
            where: { deletedAt: null },
            orderBy: { createdAt: "asc" },
          },
          artifacts: {
            where: { deletedAt: null },
            orderBy: { createdAt: "desc" },
          },
          parentEdges: {
            include: {
              parent: {
                select: {
                  id: true,
                  type: true,
                  title: true,
                  status: true,
                },
              },
            },
          },
          childEdges: {
            include: {
              child: {
                select: {
                  id: true,
                  type: true,
                  title: true,
                  status: true,
                },
              },
            },
          },
        },
      });
    }),

  /**
   * Create a new work item
   */
  create: publicProcedure
    .input(workItemCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const { parentId, ...workItemData } = input;

      const workItem = await ctx.db.workItem.create({
        data: workItemData,
        include: {
          assignee: true,
          creator: true,
        },
      });

      // Create parent-child edge if parentId provided
      if (parentId) {
        await ctx.db.workItemEdge.create({
          data: {
            parentId,
            childId: workItem.id,
            edgeType: "PARENT_CHILD",
          },
        });
      }

      // Create a default branch for the work item
      await ctx.db.branch.create({
        data: {
          name: "main",
          isDefault: true,
          workItemId: workItem.id,
        },
      });

      return workItem;
    }),

  /**
   * Update a work item
   */
  update: publicProcedure
    .input(z.object({
      id: z.string(),
      data: workItemUpdateSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.workItem.update({
        where: { id: input.id },
        data: input.data,
        include: {
          assignee: true,
          creator: true,
        },
      });
    }),

  /**
   * Soft delete a work item
   */
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.workItem.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      });
    }),

  /**
   * Restore a soft-deleted work item
   */
  restore: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.workItem.update({
        where: { id: input.id },
        data: { deletedAt: null },
      });
    }),

  /**
   * Add an edge between work items
   */
  addEdge: publicProcedure
    .input(z.object({
      parentId: z.string(),
      childId: z.string(),
      edgeType: z.enum(["PARENT_CHILD", "BLOCKS", "RELATES_TO", "DUPLICATES"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.workItemEdge.create({
        data: {
          parentId: input.parentId,
          childId: input.childId,
          edgeType: input.edgeType ?? "PARENT_CHILD",
        },
      });
    }),

  /**
   * Remove an edge between work items
   */
  removeEdge: publicProcedure
    .input(z.object({
      parentId: z.string(),
      childId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.workItemEdge.delete({
        where: {
          parentId_childId: {
            parentId: input.parentId,
            childId: input.childId,
          },
        },
      });
    }),

  /**
   * Reorder work items (update positions)
   */
  reorder: publicProcedure
    .input(z.object({
      items: z.array(z.object({
        id: z.string(),
        position: z.number(),
        status: z.enum(["OPEN", "IN_PROGRESS", "IN_REVIEW", "BLOCKED", "DONE", "CANCELLED"]).optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const updates = input.items.map((item) =>
        ctx.db.workItem.update({
          where: { id: item.id },
          data: {
            position: item.position,
            status: item.status,
          },
        })
      );

      return ctx.db.$transaction(updates);
    }),
});

