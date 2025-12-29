import { createTRPCRouter } from "../trpc";
import { projectRouter } from "./project";
import { taskRouter } from "./task";

/**
 * This is the primary router for your server.
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  project: projectRouter,
  task: taskRouter,
});

// Export type definition of API
export type AppRouter = typeof appRouter;

