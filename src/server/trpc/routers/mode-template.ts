import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

// ============================================
// Schemas
// ============================================

const workItemTypeSchema = z.enum(["EPIC", "SPRINT", "TASK", "BUG", "IDEA"]);

// ============================================
// Router
// ============================================

export const modeTemplateRouter = createTRPCRouter({
  /**
   * Get all mode templates
   */
  getAll: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.modeTemplate.findMany({
      orderBy: { name: "asc" },
    });
  }),

  /**
   * List mode templates (with optional filtering)
   */
  list: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).optional().default(50),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const templates = await ctx.db.modeTemplate.findMany({
        take: input?.limit ?? 50,
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          defaultWorkItemTypes: true,
          defaultViews: true,
          _count: {
            select: {
              projects: true,
            },
          },
        },
      });

      return templates;
    }),

  /**
   * Get a mode template by ID
   */
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const template = await ctx.db.modeTemplate.findUnique({
        where: { id: input.id },
        include: {
          _count: {
            select: {
              projects: true,
            },
          },
        },
      });

      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Mode template not found",
        });
      }

      return template;
    }),

  /**
   * Get a mode template by slug
   */
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const template = await ctx.db.modeTemplate.findUnique({
        where: { slug: input.slug },
        include: {
          _count: {
            select: {
              projects: true,
            },
          },
        },
      });

      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Mode template not found",
        });
      }

      return template;
    }),

  /**
   * Create a new mode template
   */
  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
        description: z.string().min(1).max(500),
        defaultWorkItemTypes: z.array(workItemTypeSchema),
        defaultViews: z.array(z.string()),
        aiSystemPrompt: z.string().min(1).max(5000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check for existing template with same name or slug
      const existing = await ctx.db.modeTemplate.findFirst({
        where: {
          OR: [{ name: input.name }, { slug: input.slug }],
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A mode template with this name or slug already exists",
        });
      }

      return ctx.db.modeTemplate.create({
        data: input,
      });
    }),

  /**
   * Update a mode template
   */
  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().min(1).max(500).optional(),
        defaultWorkItemTypes: z.array(workItemTypeSchema).optional(),
        defaultViews: z.array(z.string()).optional(),
        aiSystemPrompt: z.string().min(1).max(5000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const existing = await ctx.db.modeTemplate.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Mode template not found",
        });
      }

      return ctx.db.modeTemplate.update({
        where: { id },
        data,
      });
    }),

  /**
   * Delete a mode template
   */
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.modeTemplate.findUnique({
        where: { id: input.id },
        include: {
          _count: {
            select: {
              projects: true,
            },
          },
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Mode template not found",
        });
      }

      if (existing._count.projects > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Cannot delete template: ${existing._count.projects} projects are using it`,
        });
      }

      return ctx.db.modeTemplate.delete({
        where: { id: input.id },
      });
    }),
});

