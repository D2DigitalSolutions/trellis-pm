import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const branchRouter = createTRPCRouter({
  /**
   * Get all branches for a work item
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
   * Create a new branch (fork from another)
   */
  create: publicProcedure
    .input(z.object({
      workItemId: z.string(),
      name: z.string().min(1).max(100),
      forkedFromId: z.string().optional(),
      forkPointMessageId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.branch.create({
        data: {
          name: input.name,
          isDefault: false,
          workItemId: input.workItemId,
          forkedFromId: input.forkedFromId,
          forkPointMessageId: input.forkPointMessageId,
        },
      });
    }),

  /**
   * Update branch name
   */
  update: publicProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).max(100),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.branch.update({
        where: { id: input.id },
        data: { name: input.name },
      });
    }),

  /**
   * Set a branch as default
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
      });
    }),

  /**
   * Soft delete a branch
   */
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.branch.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      });
    }),
});

