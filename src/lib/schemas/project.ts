import { z } from "zod";

export const projectStatusSchema = z.enum(["ACTIVE", "ARCHIVED", "COMPLETED"]);
export const memberRoleSchema = z.enum(["OWNER", "ADMIN", "MEMBER", "VIEWER"]);

export const projectCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  description: z.string().max(500, "Description is too long").optional(),
  ownerId: z.string().cuid(),
});

export const projectUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  status: projectStatusSchema.optional(),
});

export type ProjectStatus = z.infer<typeof projectStatusSchema>;
export type MemberRole = z.infer<typeof memberRoleSchema>;
export type ProjectCreate = z.infer<typeof projectCreateSchema>;
export type ProjectUpdate = z.infer<typeof projectUpdateSchema>;
