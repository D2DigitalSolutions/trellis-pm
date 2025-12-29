import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

// ============================================
// Shared Enums
// ============================================

const workItemTypeEnum = z.enum(["EPIC", "SPRINT", "TASK", "BUG", "IDEA"]);
const workItemStatusEnum = z.enum(["OPEN", "IN_PROGRESS", "IN_REVIEW", "BLOCKED", "DONE", "CANCELLED"]);
const workItemPriorityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);
const edgeTypeEnum = z.enum(["PARENT_CHILD", "BLOCKS", "RELATES_TO", "DUPLICATES"]);

// ============================================
// Input Schemas
// ============================================

const workItemCreateInputSchema = z.object({
  type: workItemTypeEnum,
  title: z.string().min(1, "Title is required").max(255, "Title is too long"),
  description: z.string().max(10000).optional(),
  status: workItemStatusEnum.optional().default("OPEN"),
  priority: workItemPriorityEnum.optional().default("MEDIUM"),
  position: z.number().int().min(0).optional(),
  projectId: z.string().min(1, "Project ID is required"),
  creatorId: z.string().min(1, "Creator ID is required"),
  assigneeId: z.string().optional(),
  parentId: z.string().optional(), // Will create a PARENT_CHILD edge
});

const workItemUpdateInputSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(10000).optional(),
  status: workItemStatusEnum.optional(),
  priority: workItemPriorityEnum.optional(),
  position: z.number().int().min(0).optional(),
  assigneeId: z.string().nullable().optional(),
});

const workItemListInputSchema = z.object({
  projectId: z.string(),
  type: workItemTypeEnum.optional(),
  status: workItemStatusEnum.optional(),
  priority: workItemPriorityEnum.optional(),
  assigneeId: z.string().optional(),
  includeDeleted: z.boolean().optional().default(false),
  limit: z.number().min(1).max(100).optional().default(50),
  cursor: z.string().optional(),
});

// ============================================
// Output Schemas
// ============================================

const userSummarySchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().optional(),
  avatarUrl: z.string().nullable(),
});

const workItemSummarySchema = z.object({
  id: z.string(),
  type: workItemTypeEnum,
  title: z.string(),
  status: workItemStatusEnum,
});

const workItemEdgeSchema = z.object({
  id: z.string(),
  edgeType: edgeTypeEnum,
  createdAt: z.date(),
  parentId: z.string(),
  childId: z.string(),
});

const workItemOutputSchema = z.object({
  id: z.string(),
  type: workItemTypeEnum,
  title: z.string(),
  description: z.string().nullable(),
  status: workItemStatusEnum,
  priority: workItemPriorityEnum,
  position: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
  projectId: z.string(),
  creatorId: z.string(),
  assigneeId: z.string().nullable(),
  assignee: userSummarySchema.nullable(),
  creator: userSummarySchema,
});

const workItemListOutputSchema = z.object({
  items: z.array(workItemOutputSchema.extend({
    _count: z.object({
      branches: z.number(),
      artifacts: z.number(),
      childEdges: z.number(),
    }),
  })),
  nextCursor: z.string().optional(),
});

// ============================================
// Router
// ============================================

export const workItemRouter = createTRPCRouter({
  /**
   * List work items for a project with filtering and pagination
   */
  list: publicProcedure
    .input(workItemListInputSchema)
    .output(workItemListOutputSchema)
    .query(async ({ ctx, input }) => {
      const limit = input.limit;
      
      const items = await ctx.db.workItem.findMany({
        where: {
          projectId: input.projectId,
          type: input.type,
          status: input.status,
          priority: input.priority,
          assigneeId: input.assigneeId,
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
        orderBy: [{ status: "asc" }, { position: "asc" }, { createdAt: "desc" }],
        take: limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
      });

      let nextCursor: string | undefined;
      if (items.length > limit) {
        const nextItem = items.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items,
        nextCursor,
      };
    }),

  /**
   * Get all work items for a project (legacy alias)
   */
  getByProject: publicProcedure
    .input(z.object({
      projectId: z.string(),
      type: workItemTypeEnum.optional(),
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
          parentEdges: {
            select: {
              id: true,
              parentId: true,
              edgeType: true,
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
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const workItem = await ctx.db.workItem.findUnique({
        where: { id: input.id },
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
              email: true,
              avatarUrl: true,
            },
          },
          project: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          branches: {
            where: { deletedAt: null },
            orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
            include: {
              _count: {
                select: {
                  messages: true,
                  artifacts: true,
                },
              },
            },
          },
          artifacts: {
            where: { deletedAt: null },
            orderBy: { createdAt: "desc" },
            take: 10,
          },
          parentEdges: {
            where: { deletedAt: null },
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
            where: { deletedAt: null },
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

      if (!workItem) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Work item not found",
        });
      }

      return workItem;
    }),

  /**
   * Get a single work item by ID (legacy alias)
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
    .input(workItemCreateInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { parentId, ...workItemData } = input;

      // Create the work item
      const workItem = await ctx.db.workItem.create({
        data: {
          ...workItemData,
          status: workItemData.status ?? "OPEN",
          priority: workItemData.priority ?? "MEDIUM",
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
              email: true,
              avatarUrl: true,
            },
          },
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
      data: workItemUpdateInputSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      const workItem = await ctx.db.workItem.update({
        where: { id: input.id },
        data: input.data,
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
              email: true,
              avatarUrl: true,
            },
          },
        },
      });

      return workItem;
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
      edgeType: edgeTypeEnum.optional().default("PARENT_CHILD"),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check for circular reference
      if (input.parentId === input.childId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot create edge to self",
        });
      }

      return ctx.db.workItemEdge.create({
        data: {
          parentId: input.parentId,
          childId: input.childId,
          edgeType: input.edgeType,
        },
        include: {
          parent: {
            select: {
              id: true,
              type: true,
              title: true,
            },
          },
          child: {
            select: {
              id: true,
              type: true,
              title: true,
            },
          },
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
      // Soft delete the edge
      const edge = await ctx.db.workItemEdge.findUnique({
        where: {
          parentId_childId: {
            parentId: input.parentId,
            childId: input.childId,
          },
        },
      });

      if (!edge) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Edge not found",
        });
      }

      return ctx.db.workItemEdge.update({
        where: { id: edge.id },
        data: { deletedAt: new Date() },
      });
    }),

  /**
   * Reparent a work item (move to a different parent)
   * This removes existing PARENT_CHILD edges and creates a new one
   */
  reparent: publicProcedure
    .input(z.object({
      workItemId: z.string().min(1, "Work item ID is required"),
      newParentId: z.string().nullable(), // null means remove parent (make root)
    }))
    .mutation(async ({ ctx, input }) => {
      // Validate work item exists
      const workItem = await ctx.db.workItem.findUnique({
        where: { id: input.workItemId },
        include: {
          parentEdges: {
            where: { 
              edgeType: "PARENT_CHILD",
              deletedAt: null,
            },
          },
        },
      });

      if (!workItem) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Work item not found",
        });
      }

      // Prevent circular reference
      if (input.newParentId === input.workItemId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot set work item as its own parent",
        });
      }

      // If new parent specified, validate it exists and check for circular refs
      if (input.newParentId) {
        const newParent = await ctx.db.workItem.findUnique({
          where: { id: input.newParentId },
        });

        if (!newParent) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "New parent work item not found",
          });
        }

        // Check if new parent is a descendant of this work item (would create cycle)
        const isDescendant = await checkIsDescendant(ctx.db, input.newParentId, input.workItemId);
        if (isDescendant) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot reparent: would create circular reference",
          });
        }
      }

      // Soft-delete existing parent edges
      if (workItem.parentEdges.length > 0) {
        await ctx.db.workItemEdge.updateMany({
          where: {
            childId: input.workItemId,
            edgeType: "PARENT_CHILD",
            deletedAt: null,
          },
          data: { deletedAt: new Date() },
        });
      }

      // Create new parent edge if newParentId provided
      if (input.newParentId) {
        await ctx.db.workItemEdge.create({
          data: {
            parentId: input.newParentId,
            childId: input.workItemId,
            edgeType: "PARENT_CHILD",
          },
        });
      }

      // Return updated work item with new parent info
      return ctx.db.workItem.findUnique({
        where: { id: input.workItemId },
        include: {
          parentEdges: {
            where: { deletedAt: null },
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
            where: { deletedAt: null },
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
   * Get the hierarchy tree for a work item (ancestors and descendants)
   */
  getHierarchy: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const workItem = await ctx.db.workItem.findUnique({
        where: { id: input.id },
        include: {
          parentEdges: {
            where: { edgeType: "PARENT_CHILD", deletedAt: null },
            include: {
              parent: {
                include: {
                  parentEdges: {
                    where: { edgeType: "PARENT_CHILD", deletedAt: null },
                    include: {
                      parent: true,
                    },
                  },
                },
              },
            },
          },
          childEdges: {
            where: { edgeType: "PARENT_CHILD", deletedAt: null },
            include: {
              child: {
                include: {
                  childEdges: {
                    where: { edgeType: "PARENT_CHILD", deletedAt: null },
                    include: {
                      child: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!workItem) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Work item not found",
        });
      }

      return workItem;
    }),

  /**
   * Reorder work items (update positions and optionally status)
   */
  reorder: publicProcedure
    .input(z.object({
      items: z.array(z.object({
        id: z.string(),
        position: z.number().int().min(0),
        status: workItemStatusEnum.optional(),
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

// Helper function to check if targetId is a descendant of ancestorId
async function checkIsDescendant(
  db: typeof import("@/server/db").db,
  targetId: string,
  ancestorId: string,
  visited: Set<string> = new Set()
): Promise<boolean> {
  if (visited.has(targetId)) return false;
  visited.add(targetId);

  const edges = await db.workItemEdge.findMany({
    where: {
      childId: targetId,
      edgeType: "PARENT_CHILD",
      deletedAt: null,
    },
  });

  for (const edge of edges) {
    if (edge.parentId === ancestorId) return true;
    if (await checkIsDescendant(db, edge.parentId, ancestorId, visited)) return true;
  }

  return false;
}
