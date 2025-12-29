import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const artifactRouter = createTRPCRouter({
  /**
   * Get all artifacts for a work item
   */
  getByWorkItem: publicProcedure
    .input(z.object({ 
      workItemId: z.string(),
      type: z.enum(["PLAN", "SPEC", "CHECKLIST", "DECISION", "CODE", "NOTE"]).optional(),
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
        orderBy: { createdAt: "desc" },
      });
    }),

  /**
   * Get a single artifact by ID
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
    .input(z.object({
      type: z.enum(["PLAN", "SPEC", "CHECKLIST", "DECISION", "CODE", "NOTE"]),
      title: z.string().min(1).max(255),
      content: z.record(z.unknown()),
      workItemId: z.string(),
      branchId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.artifact.create({
        data: {
          type: input.type,
          title: input.title,
          content: input.content,
          workItemId: input.workItemId,
          branchId: input.branchId,
        },
      });
    }),

  /**
   * Update an artifact (creates a new version)
   */
  update: publicProcedure
    .input(z.object({
      id: z.string(),
      title: z.string().min(1).max(255).optional(),
      content: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get current artifact to increment version
      const current = await ctx.db.artifact.findUnique({
        where: { id: input.id },
      });

      if (!current) {
        throw new Error("Artifact not found");
      }

      return ctx.db.artifact.update({
        where: { id: input.id },
        data: {
          title: input.title,
          content: input.content,
          version: current.version + 1,
        },
      });
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
});

