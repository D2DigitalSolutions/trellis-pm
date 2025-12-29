import { z } from "zod";

/**
 * Project status enum schema
 */
export const projectStatusSchema = z.enum(["ACTIVE", "ARCHIVED", "COMPLETED"]);

/**
 * Schema for creating a new project
 */
export const projectCreateSchema = z.object({
  name: z
    .string()
    .min(1, "Project name is required")
    .max(100, "Project name must be less than 100 characters"),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .optional(),
  ownerId: z.string().min(1, "Owner is required"),
});

/**
 * Schema for updating a project
 */
export const projectUpdateSchema = z.object({
  name: z
    .string()
    .min(1, "Project name is required")
    .max(100, "Project name must be less than 100 characters")
    .optional(),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .optional(),
  status: projectStatusSchema.optional(),
});

/**
 * Type exports
 */
export type ProjectStatus = z.infer<typeof projectStatusSchema>;
export type ProjectCreate = z.infer<typeof projectCreateSchema>;
export type ProjectUpdate = z.infer<typeof projectUpdateSchema>;

