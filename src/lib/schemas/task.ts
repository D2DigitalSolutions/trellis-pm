import { z } from "zod";

/**
 * Task status enum schema
 */
export const taskStatusSchema = z.enum([
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "DONE",
  "CANCELLED",
]);

/**
 * Task priority enum schema
 */
export const taskPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

/**
 * Schema for creating a new task
 */
export const taskCreateSchema = z.object({
  title: z
    .string()
    .min(1, "Task title is required")
    .max(200, "Task title must be less than 200 characters"),
  description: z
    .string()
    .max(2000, "Description must be less than 2000 characters")
    .optional(),
  status: taskStatusSchema.optional().default("TODO"),
  priority: taskPrioritySchema.optional().default("MEDIUM"),
  dueDate: z.coerce.date().optional(),
  projectId: z.string().min(1, "Project is required"),
  assigneeId: z.string().optional(),
  creatorId: z.string().min(1, "Creator is required"),
  parentId: z.string().optional(),
  labelIds: z.array(z.string()).optional(),
});

/**
 * Schema for updating a task
 */
export const taskUpdateSchema = z.object({
  title: z
    .string()
    .min(1, "Task title is required")
    .max(200, "Task title must be less than 200 characters")
    .optional(),
  description: z
    .string()
    .max(2000, "Description must be less than 2000 characters")
    .optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  dueDate: z.coerce.date().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  position: z.number().int().optional(),
  labelIds: z.array(z.string()).optional(),
});

/**
 * Type exports
 */
export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type TaskPriority = z.infer<typeof taskPrioritySchema>;
export type TaskCreate = z.infer<typeof taskCreateSchema>;
export type TaskUpdate = z.infer<typeof taskUpdateSchema>;

