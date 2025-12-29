import { createTRPCRouter } from "../trpc";
import { projectRouter } from "./project";
import { workItemRouter } from "./work-item";
import { branchRouter } from "./branch";
import { messageRouter } from "./message";
import { artifactRouter } from "./artifact";
import { contextRouter } from "./context";

/**
 * This is the primary router for your server.
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  project: projectRouter,
  workItem: workItemRouter,
  branch: branchRouter,
  message: messageRouter,
  artifact: artifactRouter,
  context: contextRouter,
});

// Export type definition of API
export type AppRouter = typeof appRouter;
