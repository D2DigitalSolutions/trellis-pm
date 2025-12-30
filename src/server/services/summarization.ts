import { z } from "zod";
import { db } from "@/server/db";
import { getAIProvider } from "@/server/ai";
import type { AIProvider } from "@/server/ai";

// ============================================
// Configuration
// ============================================

export interface SummarizationConfig {
  // Minimum messages before generating a summary
  minMessagesForSummary: number;
  // Generate new summary every N new messages
  summarizeEveryNMessages: number;
  // Maximum messages to include in summary generation
  maxMessagesToSummarize: number;
  // Model to use for summarization (optional, uses provider default)
  model?: string;
  // Temperature for summary generation
  temperature: number;
}

const DEFAULT_CONFIG: SummarizationConfig = {
  minMessagesForSummary: 10,
  summarizeEveryNMessages: 10,
  maxMessagesToSummarize: 50,
  temperature: 0.3,
};

// ============================================
// Summary Schemas
// ============================================

const branchSummarySchema = z.object({
  summary: z.string().describe("A concise summary of the conversation so far"),
  keyDecisions: z.array(z.string()).describe("Key decisions made in the conversation"),
  openQuestions: z.array(z.string()).describe("Unresolved questions or topics"),
  nextSteps: z.array(z.string()).describe("Suggested next steps based on the conversation"),
});

export type BranchSummary = z.infer<typeof branchSummarySchema>;

const projectSummarySchema = z.object({
  summary: z.string().describe("A high-level summary of the project"),
  goals: z.array(z.string()).describe("Main project goals"),
  currentFocus: z.string().describe("What the project is currently focused on"),
  recentProgress: z.array(z.string()).describe("Recent progress or achievements"),
});

export type ProjectSummary = z.infer<typeof projectSummarySchema>;

// ============================================
// Summarization Service
// ============================================

export class SummarizationService {
  private config: SummarizationConfig;
  private provider: AIProvider | null;

  constructor(config: Partial<SummarizationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.provider = getAIProvider();
  }

  /**
   * Check if a branch needs summarization
   */
  async branchNeedsSummary(branchId: string): Promise<boolean> {
    const branch = await db.branch.findUnique({
      where: { id: branchId },
      select: {
        summaryMessageCount: true,
        _count: {
          select: { messages: true },
        },
      },
    });

    if (!branch) return false;

    const currentCount = branch._count.messages;
    const lastSummaryCount = branch.summaryMessageCount;

    // Need summary if:
    // 1. Never summarized and enough messages
    // 2. Enough new messages since last summary
    if (lastSummaryCount === 0) {
      return currentCount >= this.config.minMessagesForSummary;
    }

    return (currentCount - lastSummaryCount) >= this.config.summarizeEveryNMessages;
  }

  /**
   * Generate and store a summary for a branch
   */
  async summarizeBranch(branchId: string): Promise<BranchSummary | null> {
    if (!this.provider) {
      console.warn("No AI provider configured. Skipping branch summarization.");
      return null;
    }

    // Get branch with messages
    const branch = await db.branch.findUnique({
      where: { id: branchId },
      include: {
        workItem: {
          select: {
            title: true,
            type: true,
            description: true,
          },
        },
        messages: {
          where: { deletedAt: null },
          orderBy: { createdAt: "asc" },
          take: this.config.maxMessagesToSummarize,
          include: {
            user: {
              select: { name: true },
            },
          },
        },
      },
    });

    if (!branch) {
      throw new Error(`Branch not found: ${branchId}`);
    }

    if (branch.messages.length < this.config.minMessagesForSummary) {
      return null;
    }

    // Format messages for summarization
    const conversationText = branch.messages
      .map((m) => {
        const speaker = m.role === "USER" 
          ? `User${m.user?.name ? ` (${m.user.name})` : ""}`
          : m.role;
        return `${speaker}: ${m.content}`;
      })
      .join("\n\n");

    // Include previous summary if it exists
    const previousSummary = branch.summary 
      ? `Previous summary: ${branch.summary}\n\n` 
      : "";

    // Store the message count before we start summarizing
    // This is used for optimistic locking
    const preUpdateMessageCount = branch.summaryMessageCount;

    // Generate summary using AI
    try {
      const result = await this.provider.generateStructured({
        messages: [
          {
            role: "system",
            content: `You are a conversation summarizer. Analyze the following conversation about a ${branch.workItem.type.toLowerCase()} titled "${branch.workItem.title}" and provide a structured summary.

${previousSummary}Focus on:
1. The main points discussed
2. Any decisions that were made
3. Open questions or unresolved topics
4. Suggested next steps

Be concise but comprehensive.`,
          },
          {
            role: "user",
            content: `Summarize this conversation:\n\n${conversationText}`,
          },
        ],
        schema: branchSummarySchema,
        schemaName: "BranchSummary",
        temperature: this.config.temperature,
        model: this.config.model,
      });

      // Store the summary using optimistic locking
      // Only update if no one else has updated since we started
      const summaryText = this.formatBranchSummary(result.data);
      const updateResult = await db.branch.updateMany({
        where: { 
          id: branchId,
          // Optimistic lock: only update if summaryMessageCount hasn't changed
          summaryMessageCount: preUpdateMessageCount,
        },
        data: {
          summary: summaryText,
          summaryUpdatedAt: new Date(),
          summaryMessageCount: branch.messages.length,
        },
      });

      if (updateResult.count === 0) {
        // Another process updated first - this is fine, our summary is stale
        console.log(`Summarization for branch ${branchId} was superseded by another process`);
        return null;
      }

      return result.data;
    } catch (error) {
      console.error("Failed to summarize branch:", error);
      throw error;
    }
  }

  /**
   * Generate and store a summary for a project
   */
  async summarizeProject(projectId: string): Promise<ProjectSummary | null> {
    if (!this.provider) {
      console.warn("No AI provider configured. Skipping project summarization.");
      return null;
    }

    // Get project with work items
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        workItems: {
          where: { deletedAt: null },
          select: {
            type: true,
            title: true,
            status: true,
            description: true,
          },
          orderBy: { updatedAt: "desc" },
          take: 20,
        },
      },
    });

    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    // Format work items for summarization
    const workItemsText = project.workItems
      .map((wi) => `- [${wi.type}] ${wi.title} (${wi.status})${wi.description ? `: ${wi.description}` : ""}`)
      .join("\n");

    // Generate summary using AI
    try {
      const result = await this.provider.generateStructured({
        messages: [
          {
            role: "system",
            content: `You are a project summarizer. Analyze the following project information and provide a high-level summary suitable for providing context to AI assistants working on the project.

Be concise but informative. Focus on what would be most useful for understanding the project's purpose and current state.`,
          },
          {
            role: "user",
            content: `Project: ${project.name}
Description: ${project.description ?? "No description"}

Recent Work Items:
${workItemsText}

Generate a summary of this project.`,
          },
        ],
        schema: projectSummarySchema,
        schemaName: "ProjectSummary",
        temperature: this.config.temperature,
        model: this.config.model,
      });

      // Store the summary
      const summaryText = this.formatProjectSummary(result.data);
      await db.project.update({
        where: { id: projectId },
        data: {
          summary: summaryText,
          summaryUpdatedAt: new Date(),
        },
      });

      return result.data;
    } catch (error) {
      console.error("Failed to summarize project:", error);
      throw error;
    }
  }

  /**
   * Update summaries for all branches that need it
   */
  async updatePendingSummaries(): Promise<{ updated: string[]; failed: string[] }> {
    const updated: string[] = [];
    const failed: string[] = [];

    // Find branches that need summarization
    const branches = await db.branch.findMany({
      where: {
        deletedAt: null,
      },
      select: {
        id: true,
        summaryMessageCount: true,
        _count: {
          select: { messages: true },
        },
      },
    });

    for (const branch of branches) {
      const currentCount = branch._count.messages;
      const needsSummary = 
        (branch.summaryMessageCount === 0 && currentCount >= this.config.minMessagesForSummary) ||
        (currentCount - branch.summaryMessageCount >= this.config.summarizeEveryNMessages);

      if (needsSummary) {
        try {
          await this.summarizeBranch(branch.id);
          updated.push(branch.id);
        } catch (error) {
          console.error(`Failed to summarize branch ${branch.id}:`, error);
          failed.push(branch.id);
        }
      }
    }

    return { updated, failed };
  }

  /**
   * Format branch summary as a readable string
   */
  private formatBranchSummary(summary: BranchSummary): string {
    const sections: string[] = [summary.summary];

    if (summary.keyDecisions.length > 0) {
      sections.push("");
      sections.push("Key Decisions:");
      for (const decision of summary.keyDecisions) {
        sections.push(`• ${decision}`);
      }
    }

    if (summary.openQuestions.length > 0) {
      sections.push("");
      sections.push("Open Questions:");
      for (const question of summary.openQuestions) {
        sections.push(`• ${question}`);
      }
    }

    if (summary.nextSteps.length > 0) {
      sections.push("");
      sections.push("Next Steps:");
      for (const step of summary.nextSteps) {
        sections.push(`• ${step}`);
      }
    }

    return sections.join("\n");
  }

  /**
   * Format project summary as a readable string
   */
  private formatProjectSummary(summary: ProjectSummary): string {
    const sections: string[] = [summary.summary];

    if (summary.goals.length > 0) {
      sections.push("");
      sections.push("Goals:");
      for (const goal of summary.goals) {
        sections.push(`• ${goal}`);
      }
    }

    if (summary.currentFocus) {
      sections.push("");
      sections.push(`Current Focus: ${summary.currentFocus}`);
    }

    if (summary.recentProgress.length > 0) {
      sections.push("");
      sections.push("Recent Progress:");
      for (const progress of summary.recentProgress) {
        sections.push(`• ${progress}`);
      }
    }

    return sections.join("\n");
  }
}

/**
 * Create a summarization service with default config
 */
export function createSummarizationService(
  config?: Partial<SummarizationConfig>
): SummarizationService {
  return new SummarizationService(config);
}

/**
 * Trigger summarization for a branch if needed
 * Returns true if a summary was generated
 */
export async function maybeSummarizeBranch(branchId: string): Promise<boolean> {
  const service = new SummarizationService();
  
  if (await service.branchNeedsSummary(branchId)) {
    const result = await service.summarizeBranch(branchId);
    return result !== null;
  }
  
  return false;
}

/**
 * Trigger summarization for a branch if needed (fire-and-forget with timeout)
 * This is safe to call without awaiting - it won't block the request
 * Uses optimistic locking via summaryMessageCount to prevent race conditions
 */
export function triggerSummarizationIfNeeded(
  branchId: string, 
  options: { timeoutMs?: number } = {}
): void {
  const { timeoutMs = 30000 } = options;
  
  // Create a promise that races the summarization against a timeout
  const summarizationPromise = (async () => {
    try {
      const service = new SummarizationService();
      
      // Quick check if summarization is needed
      if (!(await service.branchNeedsSummary(branchId))) {
        return;
      }
      
      // Get current branch state for optimistic locking
      const branch = await db.branch.findUnique({
        where: { id: branchId },
        select: {
          id: true,
          summaryMessageCount: true,
          _count: { select: { messages: true } },
        },
      });
      
      if (!branch) return;
      
      const expectedMessageCount = branch.summaryMessageCount;
      
      // Generate summary
      const result = await service.summarizeBranch(branchId);
      
      if (result) {
        // Use optimistic locking: only update if no one else has updated since we started
        // This is now handled inside summarizeBranch, but we do an extra check here
        const updatedBranch = await db.branch.findUnique({
          where: { id: branchId },
          select: { summaryMessageCount: true },
        });
        
        // If the count is different from what we just set, another process beat us
        // This is fine - we just log and move on
        if (updatedBranch && updatedBranch.summaryMessageCount !== branch._count.messages) {
          console.log(`Summarization race detected for branch ${branchId}, result may have been superseded`);
        }
      }
    } catch (error) {
      // Log but don't throw - this is fire-and-forget
      console.error(`Background summarization failed for branch ${branchId}:`, error);
    }
  })();
  
  // Create timeout promise
  const timeoutPromise = new Promise<void>((resolve) => {
    setTimeout(() => {
      console.warn(`Summarization for branch ${branchId} timed out after ${timeoutMs}ms`);
      resolve();
    }, timeoutMs);
  });
  
  // Race them - we don't await, just let it run in background
  Promise.race([summarizationPromise, timeoutPromise]).catch((error) => {
    console.error(`Unexpected error in background summarization for branch ${branchId}:`, error);
  });
}

