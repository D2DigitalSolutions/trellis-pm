import { z } from "zod";

export const artifactTypeSchema = z.enum(["PLAN", "SPEC", "CHECKLIST", "DECISION", "CODE", "NOTE"]);

export const artifactCreateSchema = z.object({
  type: artifactTypeSchema,
  title: z.string().min(1, "Title is required").max(255, "Title is too long"),
  content: z.record(z.unknown()),
  workItemId: z.string().cuid(),
  branchId: z.string().cuid().optional(),
});

export const artifactUpdateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.record(z.unknown()).optional(),
});

export type ArtifactType = z.infer<typeof artifactTypeSchema>;
export type ArtifactCreate = z.infer<typeof artifactCreateSchema>;
export type ArtifactUpdate = z.infer<typeof artifactUpdateSchema>;

