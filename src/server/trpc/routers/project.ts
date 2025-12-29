import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { projectCreateSchema, projectUpdateSchema } from "@/lib/schemas/project";

export const projectRouter = createTRPCRouter({
  /**
   * Get all projects
   */
  getAll: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.project.findMany({
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
            tasks: true,
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
            include: {
              user: true,
            },
          },
          labels: true,
          _count: {
            select: {
              tasks: true,
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
            include: {
              user: true,
            },
          },
          labels: true,
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

      return ctx.db.project.create({
        data: {
          ...input,
          slug,
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
   * Delete a project
   */
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.project.delete({
        where: { id: input.id },
      });
    }),
});

