import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";

// ============================================
// Input Schemas
// ============================================

const projectCreateInputSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  description: z.string().max(500).optional(),
  ownerId: z.string().min(1, "Owner ID is required"),
  modeTemplateId: z.string().optional(),
});

const projectUpdateInputSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  status: z.enum(["ACTIVE", "ARCHIVED", "COMPLETED"]).optional(),
});

const projectListInputSchema = z.object({
  includeDeleted: z.boolean().optional().default(false),
  status: z.enum(["ACTIVE", "ARCHIVED", "COMPLETED"]).optional(),
  limit: z.number().min(1).max(100).optional().default(50),
  cursor: z.string().optional(),
}).optional();

// ============================================
// Output Schemas
// ============================================

const userSummarySchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string(),
  avatarUrl: z.string().nullable(),
});

const modeTemplateSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  defaultWorkItemTypes: z.array(z.enum(["EPIC", "SPRINT", "TASK", "BUG", "IDEA"])),
  defaultViews: z.array(z.string()),
}).nullable();

const projectSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  slug: z.string(),
  status: z.enum(["ACTIVE", "ARCHIVED", "COMPLETED"]),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
  ownerId: z.string(),
  modeTemplateId: z.string().nullable(),
  owner: userSummarySchema,
  modeTemplate: modeTemplateSummarySchema,
  _count: z.object({
    workItems: z.number(),
    members: z.number(),
  }),
});

const projectDetailSchema = projectSummarySchema.extend({
  members: z.array(z.object({
    id: z.string(),
    role: z.enum(["OWNER", "ADMIN", "MEMBER", "VIEWER"]),
    createdAt: z.date(),
    deletedAt: z.date().nullable(),
    userId: z.string(),
    projectId: z.string(),
    user: userSummarySchema.extend({ email: z.string() }),
  })),
});

const projectListOutputSchema = z.object({
  projects: z.array(projectSummarySchema),
  nextCursor: z.string().optional(),
});

// ============================================
// Router
// ============================================

export const projectRouter = createTRPCRouter({
  /**
   * List all projects with pagination
   */
  list: publicProcedure
    .input(projectListInputSchema)
    .output(projectListOutputSchema)
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 50;
      
      const projects = await ctx.db.project.findMany({
        where: {
          deletedAt: input?.includeDeleted ? undefined : null,
          status: input?.status,
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
          modeTemplate: {
            select: {
              id: true,
              name: true,
              slug: true,
              description: true,
              defaultWorkItemTypes: true,
              defaultViews: true,
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
        take: limit + 1,
        cursor: input?.cursor ? { id: input.cursor } : undefined,
      });

      let nextCursor: string | undefined;
      if (projects.length > limit) {
        const nextItem = projects.pop();
        nextCursor = nextItem?.id;
      }

      return {
        projects,
        nextCursor,
      };
    }),

  /**
   * Get all projects (alias for list without pagination)
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
          modeTemplate: {
            select: {
              id: true,
              name: true,
              slug: true,
              description: true,
              defaultWorkItemTypes: true,
              defaultViews: true,
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
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.project.findUnique({
        where: { id: input.id },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          members: {
            where: { deletedAt: null },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatarUrl: true,
                },
              },
            },
          },
          _count: {
            select: {
              workItems: true,
              members: true,
            },
          },
        },
      });

      if (!project) {
        throw new Error("Project not found");
      }

      return project;
    }),

  /**
   * Get a single project by ID (alias)
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
    .input(projectCreateInputSchema)
    .mutation(async ({ ctx, input }) => {
      // Generate slug from name
      const baseSlug = input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      // Make slug unique by appending a random suffix if needed
      const existingProject = await ctx.db.project.findUnique({
        where: { slug: baseSlug },
      });

      const slug = existingProject
        ? `${baseSlug}-${Math.random().toString(36).substring(2, 8)}`
        : baseSlug;

      const project = await ctx.db.project.create({
        data: {
          name: input.name,
          description: input.description,
          slug,
          ownerId: input.ownerId,
          modeTemplateId: input.modeTemplateId,
          members: {
            create: {
              userId: input.ownerId,
              role: "OWNER",
            },
          },
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
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatarUrl: true,
                },
              },
            },
          },
          _count: {
            select: {
              workItems: true,
              members: true,
            },
          },
        },
      });

      return project;
    }),

  /**
   * Update a project
   */
  update: publicProcedure
    .input(z.object({
      id: z.string(),
      data: projectUpdateInputSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.project.update({
        where: { id: input.id },
        data: input.data,
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
      });

      return project;
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
      role: z.enum(["ADMIN", "MEMBER", "VIEWER"]).optional().default("MEMBER"),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.projectMember.create({
        data: {
          projectId: input.projectId,
          userId: input.userId,
          role: input.role,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      });
    }),

  /**
   * Remove a member from a project (soft delete)
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

  /**
   * Update a member's role
   */
  updateMemberRole: publicProcedure
    .input(z.object({
      projectId: z.string(),
      userId: z.string(),
      role: z.enum(["ADMIN", "MEMBER", "VIEWER"]),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.projectMember.update({
        where: {
          projectId_userId: {
            projectId: input.projectId,
            userId: input.userId,
          },
        },
        data: { role: input.role },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      });
    }),
});
