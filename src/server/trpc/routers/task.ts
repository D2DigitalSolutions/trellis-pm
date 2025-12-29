import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { taskCreateSchema, taskUpdateSchema } from "@/lib/schemas/task";

export const taskRouter = createTRPCRouter({
  /**
   * Get all tasks for a project
   */
  getByProject: publicProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.task.findMany({
        where: { projectId: input.projectId },
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          labels: true,
          _count: {
            select: {
              comments: true,
              subtasks: true,
            },
          },
        },
        orderBy: [{ status: "asc" }, { position: "asc" }],
      });
    }),

  /**
   * Get a single task by ID
   */
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.task.findUnique({
        where: { id: input.id },
        include: {
          assignee: true,
          creator: true,
          labels: true,
          comments: {
            include: {
              author: true,
            },
            orderBy: {
              createdAt: "desc",
            },
          },
          subtasks: {
            include: {
              assignee: true,
            },
          },
        },
      });
    }),

  /**
   * Create a new task
   */
  create: publicProcedure
    .input(taskCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const { labelIds, ...taskData } = input;

      return ctx.db.task.create({
        data: {
          ...taskData,
          labels: labelIds
            ? {
                connect: labelIds.map((id) => ({ id })),
              }
            : undefined,
        },
        include: {
          assignee: true,
          labels: true,
        },
      });
    }),

  /**
   * Update a task
   */
  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        data: taskUpdateSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { labelIds, ...updateData } = input.data;

      return ctx.db.task.update({
        where: { id: input.id },
        data: {
          ...updateData,
          labels: labelIds
            ? {
                set: labelIds.map((id) => ({ id })),
              }
            : undefined,
        },
        include: {
          assignee: true,
          labels: true,
        },
      });
    }),

  /**
   * Delete a task
   */
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.task.delete({
        where: { id: input.id },
      });
    }),

  /**
   * Reorder tasks (update positions)
   */
  reorder: publicProcedure
    .input(
      z.object({
        tasks: z.array(
          z.object({
            id: z.string(),
            position: z.number(),
            status: z.enum([
              "TODO",
              "IN_PROGRESS",
              "IN_REVIEW",
              "DONE",
              "CANCELLED",
            ]),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updates = input.tasks.map((task) =>
        ctx.db.task.update({
          where: { id: task.id },
          data: {
            position: task.position,
            status: task.status,
          },
        })
      );

      return ctx.db.$transaction(updates);
    }),
});

