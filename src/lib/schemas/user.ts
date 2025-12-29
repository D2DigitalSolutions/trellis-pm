import { z } from "zod";

/**
 * Member role enum schema
 */
export const memberRoleSchema = z.enum(["OWNER", "ADMIN", "MEMBER", "VIEWER"]);

/**
 * Schema for creating a new user
 */
export const userCreateSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  avatarUrl: z.string().url("Invalid avatar URL").optional(),
});

/**
 * Schema for updating a user
 */
export const userUpdateSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters")
    .optional(),
  avatarUrl: z.string().url("Invalid avatar URL").optional().nullable(),
});

/**
 * Type exports
 */
export type MemberRole = z.infer<typeof memberRoleSchema>;
export type UserCreate = z.infer<typeof userCreateSchema>;
export type UserUpdate = z.infer<typeof userUpdateSchema>;

