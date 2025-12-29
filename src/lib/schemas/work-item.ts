import { z } from "zod";

export const workItemTypeSchema = z.enum(["EPIC", "SPRINT", "TASK", "BUG", "IDEA"]);
export const workItemStatusSchema = z.enum(["OPEN", "IN_PROGRESS", "IN_REVIEW", "BLOCKED", "DONE", "CANCELLED"]);
export const workItemPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);
export const workItemEdgeTypeSchema = z.enum(["PARENT_CHILD", "BLOCKS", "RELATES_TO", "DUPLICATES"]);

export const workItemCreateSchema = z.object({
  type: workItemTypeSchema,
  title: z.string().min(1, "Title is required").max(255, "Title is too long"),
  description: z.string().max(10000).optional(),
  status: workItemStatusSchema.optional().default("OPEN"),
  priority: workItemPrioritySchema.optional().default("MEDIUM"),
  position: z.number().int().min(0).optional(),
  projectId: z.string().cuid(),
  creatorId: z.string().cuid(),
  assigneeId: z.string().cuid().optional(),
  parentId: z.string().cuid().optional(),
});

export const workItemUpdateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(10000).optional(),
  status: workItemStatusSchema.optional(),
  priority: workItemPrioritySchema.optional(),
  position: z.number().int().min(0).optional(),
  assigneeId: z.string().cuid().nullable().optional(),
});

export type WorkItemType = z.infer<typeof workItemTypeSchema>;
export type WorkItemStatus = z.infer<typeof workItemStatusSchema>;
export type WorkItemPriority = z.infer<typeof workItemPrioritySchema>;
export type WorkItemEdgeType = z.infer<typeof workItemEdgeTypeSchema>;
export type WorkItemCreate = z.infer<typeof workItemCreateSchema>;
export type WorkItemUpdate = z.infer<typeof workItemUpdateSchema>;

