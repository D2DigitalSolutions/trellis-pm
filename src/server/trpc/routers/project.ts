import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";

const projectCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  ownerId: z.string(),
});

const projectUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  status: z.enum(["ACTIVE", "ARCHIVED", "COMPLETED"]).optional(),
});

export const projectRouter = createTRPCRouter({
  /**
   * Get all projects
   */
  getAll: publicProcedure
    .input(z.object({
      includeDeleted: z.boolean().optional().default(false),
    }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.db.project.findMany({
        where: {
          deletedAt: input?.includeDeleted ? undefined : null,
        },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          _count: {
            select: {
              workItems: true,
              members: true,
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      });
    }),

  /**
   * Get a single project by ID
   */
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.project.findUnique({
        where: { id: input.id },
        include: {
          owner: true,
          members: {
            where: { deletedAt: null },
            include: {
              user: true,
            },
          },
          _count: {
            select: {
              workItems: true,
            },
          },
        },
      });
    }),

  /**
   * Get a project by slug
   */
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.project.findUnique({
        where: { slug: input.slug },
        include: {
          owner: true,
          members: {
            where: { deletedAt: null },
            include: {
              user: true,
            },
          },
        },
      });
    }),

  /**
   * Create a new project
   */
  create: publicProcedure
    .input(projectCreateSchema)
    .mutation(async ({ ctx, input }) => {
      // Generate slug from name
      const slug = input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      // Make slug unique by appending a random suffix if needed
      const existingProject = await ctx.db.project.findUnique({
        where: { slug },
      });

      const finalSlug = existingProject
        ? `${slug}-${Math.random().toString(36).substring(2, 8)}`
        : slug;

      return ctx.db.project.create({
        data: {
          name: input.name,
          description: input.description,
          slug: finalSlug,
          ownerId: input.ownerId,
          members: {
            create: {
              userId: input.ownerId,
              role: "OWNER",
            },
          },
        },
      });
    }),

  /**
   * Update a project
   */
  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        data: projectUpdateSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.project.update({
        where: { id: input.id },
        data: input.data,
      });
    }),

  /**
   * Soft delete a project
   */
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.project.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      });
    }),

  /**
   * Restore a soft-deleted project
   */
  restore: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.project.update({
        where: { id: input.id },
        data: { deletedAt: null },
      });
    }),

  /**
   * Add a member to a project
   */
  addMember: publicProcedure
    .input(z.object({
      projectId: z.string(),
      userId: z.string(),
      role: z.enum(["ADMIN", "MEMBER", "VIEWER"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.projectMember.create({
        data: {
          projectId: input.projectId,
          userId: input.userId,
          role: input.role ?? "MEMBER",
        },
      });
    }),

  /**
   * Remove a member from a project
   */
  removeMember: publicProcedure
    .input(z.object({
      projectId: z.string(),
      userId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.projectMember.update({
        where: {
          projectId_userId: {
            projectId: input.projectId,
            userId: input.userId,
          },
        },
        data: { deletedAt: new Date() },
      });
    }),
});
