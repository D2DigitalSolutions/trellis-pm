import { z } from "zod";

export const messageRoleSchema = z.enum(["USER", "ASSISTANT", "TOOL", "SYSTEM"]);

export const messageCreateSchema = z.object({
  branchId: z.string().cuid(),
  role: messageRoleSchema,
  content: z.string().min(1, "Content is required"),
  userId: z.string().cuid().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const messageUpdateSchema = z.object({
  content: z.string().min(1),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type MessageRole = z.infer<typeof messageRoleSchema>;
export type MessageCreate = z.infer<typeof messageCreateSchema>;
export type MessageUpdate = z.infer<typeof messageUpdateSchema>;

