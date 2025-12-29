import { z } from "zod";

export const branchCreateSchema = z.object({
  workItemId: z.string().cuid(),
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  forkedFromId: z.string().cuid().optional(),
  forkPointMessageId: z.string().cuid().optional(),
});

export const branchUpdateSchema = z.object({
  name: z.string().min(1).max(100),
});

export type BranchCreate = z.infer<typeof branchCreateSchema>;
export type BranchUpdate = z.infer<typeof branchUpdateSchema>;

