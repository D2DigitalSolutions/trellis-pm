import { z } from "zod";

export const userCreateSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  avatarUrl: z.string().url("Invalid avatar URL").optional(),
});

export const userUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().optional().nullable(),
});

export type UserCreate = z.infer<typeof userCreateSchema>;
export type UserUpdate = z.infer<typeof userUpdateSchema>;
