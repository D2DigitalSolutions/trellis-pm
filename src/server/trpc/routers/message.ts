import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const messageRouter = createTRPCRouter({
  /**
   * Get all messages for a branch
   */
  getByBranch: publicProcedure
    .input(z.object({ 
      branchId: z.string(),
      limit: z.number().min(1).max(100).optional().default(50),
      cursor: z.string().optional(), // for pagination
    }))
    .query(async ({ ctx, input }) => {
      const messages = await ctx.db.message.findMany({
        where: { 
          branchId: input.branchId,
          deletedAt: null,
        },
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
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
      });

      let nextCursor: string | undefined;
      if (messages.length > input.limit) {
        const nextItem = messages.pop();
        nextCursor = nextItem?.id;
      }

      return {
        messages,
        nextCursor,
      };
    }),

  /**
   * Get a single message by ID
   */
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.message.findUnique({
        where: { id: input.id },
        include: {
          user: true,
          branch: {
            select: {
              id: true,
              name: true,
              workItemId: true,
            },
          },
        },
      });
    }),

  /**
   * Create a new message
   */
  create: publicProcedure
    .input(z.object({
      branchId: z.string(),
      role: z.enum(["USER", "ASSISTANT", "TOOL", "SYSTEM"]),
      content: z.string(),
      userId: z.string().optional(),
      metadata: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.message.create({
        data: {
          branchId: input.branchId,
          role: input.role,
          content: input.content,
          userId: input.userId,
          metadata: input.metadata,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
      });
    }),

  /**
   * Update a message (typically for streaming updates)
   */
  update: publicProcedure
    .input(z.object({
      id: z.string(),
      content: z.string(),
      metadata: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.message.update({
        where: { id: input.id },
        data: {
          content: input.content,
          metadata: input.metadata,
        },
      });
    }),

  /**
   * Soft delete a message
   */
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.message.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      });
    }),
});

