import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { db } from "@/server/db";

/**
 * Context creation for tRPC
 */
export const createTRPCContext = async (opts: { headers: Headers }) => {
  return {
    db,
    ...opts,
  };
};

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;

/**
 * Initialize tRPC with superjson transformer
 */
const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Create a server-side caller
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * Router and procedure exports
 */
export const createTRPCRouter = t.router;

/**
 * Public (unauthenticated) procedure
 */
export const publicProcedure = t.procedure;

/**
 * Protected (authenticated) procedure
 * Add your auth logic here when implementing authentication
 */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  // TODO: Add authentication check here
  // For now, we'll allow all requests
  // Example:
  // if (!ctx.session?.user) {
  //   throw new TRPCError({ code: "UNAUTHORIZED" });
  // }
  
  return next({
    ctx: {
      ...ctx,
      // Add authenticated user to context here
      // user: ctx.session.user,
    },
  });
});

