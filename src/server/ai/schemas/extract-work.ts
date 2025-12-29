import { z } from "zod";

// ============================================
// Work Item Extraction Schema
// ============================================

/**
 * Schema for a work item to be created
 */
export const workItemToCreateSchema = z.object({
  title: z.string().min(1).max(255).describe("Title of the work item"),
  type: z.enum(["EPIC", "SPRINT", "TASK", "BUG", "IDEA"]).describe("Type of work item"),
  description: z.string().max(10000).optional().describe("Detailed description"),
  acceptanceCriteria: z.array(z.string()).optional().describe("List of acceptance criteria"),
  parentWorkItemId: z.string().optional().describe("ID of parent work item to nest under"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional().describe("Priority level"),
  estimatedEffort: z.string().optional().describe("Estimated effort (e.g., '2 hours', '1 day')"),
});

export type WorkItemToCreate = z.infer<typeof workItemToCreateSchema>;

/**
 * Schema for an artifact to be created
 */
export const artifactToCreateSchema = z.object({
  workItemTitleRef: z.string().describe("Reference to the work item title this artifact belongs to"),
  type: z.enum(["PLAN", "SPEC", "CHECKLIST", "DECISION", "CODE", "NOTE"]).describe("Type of artifact"),
  title: z.string().min(1).max(255).describe("Title of the artifact"),
  content: z.record(z.string(), z.any()).describe("Structured content of the artifact"),
});

export type ArtifactToCreate = z.infer<typeof artifactToCreateSchema>;

/**
 * Full extraction response schema
 */
export const extractWorkResponseSchema = z.object({
  workItemsToCreate: z.array(workItemToCreateSchema).describe("Work items to create based on the user's input"),
  artifactsToCreate: z.array(artifactToCreateSchema).describe("Artifacts to create for the work items"),
  suggestedNextActions: z.array(z.string()).describe("Suggested next actions for the user"),
});

export type ExtractWorkResponse = z.infer<typeof extractWorkResponseSchema>;

/**
 * Input schema for the extract-work endpoint
 */
export const extractWorkInputSchema = z.object({
  branchId: z.string().min(1, "Branch ID is required"),
  userText: z.string().min(1, "User text is required").max(50000, "Text too long"),
  options: z.object({
    includeContext: z.boolean().optional().default(true),
    maxWorkItems: z.number().min(1).max(20).optional().default(10),
    preferredTypes: z.array(z.enum(["EPIC", "SPRINT", "TASK", "BUG", "IDEA"])).optional(),
  }).optional(),
});

export type ExtractWorkInput = z.infer<typeof extractWorkInputSchema>;

/**
 * Get the JSON schema description for AI prompting
 */
export function getExtractWorkSchemaDescription(): string {
  return `You must respond with valid JSON matching this exact structure:

{
  "workItemsToCreate": [
    {
      "title": "string (required, max 255 chars)",
      "type": "EPIC" | "SPRINT" | "TASK" | "BUG" | "IDEA" (required),
      "description": "string (optional, detailed description)",
      "acceptanceCriteria": ["string", ...] (optional, list of criteria),
      "parentWorkItemId": "string" (optional, ID to nest under),
      "priority": "LOW" | "MEDIUM" | "HIGH" | "URGENT" (optional),
      "estimatedEffort": "string" (optional, e.g., '2 hours')"
    }
  ],
  "artifactsToCreate": [
    {
      "workItemTitleRef": "string (required, title of work item this belongs to)",
      "type": "PLAN" | "SPEC" | "CHECKLIST" | "DECISION" | "CODE" | "NOTE" (required),
      "title": "string (required, artifact title)",
      "content": { ... } (required, structured JSON content)
    }
  ],
  "suggestedNextActions": ["string", ...] (list of suggested next steps)
}

Guidelines:
- Extract actionable work items from the user's text
- Break down large tasks into smaller, manageable pieces
- Use appropriate types (EPIC for large features, TASK for individual work items, BUG for issues)
- Include clear acceptance criteria when possible
- Create PLAN or SPEC artifacts for complex work items
- Create CHECKLIST artifacts for multi-step processes
- Suggest practical next actions the user can take`;
}

