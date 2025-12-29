import { z } from "zod";
import { db } from "@/server/db";
import type { Message as DbMessage, Artifact, Branch, WorkItem, Project } from "@/generated/prisma/client";

// ============================================
// Context Pack Types
// ============================================

export interface ContextPack {
  // Project context
  project: {
    id: string;
    name: string;
    description: string | null;
    summary: string | null;
  };

  // Work item context
  workItem: {
    id: string;
    type: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    acceptanceCriteria: string | null;
    parentItems: Array<{
      id: string;
      type: string;
      title: string;
    }>;
  };

  // Branch context
  branch: {
    id: string;
    name: string | null;
    summary: string | null;
    messageCount: number;
    isDefault: boolean;
  };

  // Recent messages (last N)
  messages: Array<{
    id: string;
    role: string;
    content: string;
    createdAt: Date;
    userName: string | null;
  }>;

  // Linked artifacts
  artifacts: {
    plan: ArtifactSummary | null;
    spec: ArtifactSummary | null;
    decision: ArtifactSummary | null;
    checklist: ArtifactSummary | null;
    all: ArtifactSummary[];
  };

  // Metadata
  metadata: {
    generatedAt: Date;
    tokenEstimate: number;
  };
}

export interface ArtifactSummary {
  id: string;
  type: string;
  title: string;
  version: number;
  content: unknown;
  updatedAt: Date;
}

export interface ContextBuilderOptions {
  messageLimit?: number;
  includeArtifacts?: boolean;
  artifactTypes?: Array<"PLAN" | "SPEC" | "DECISION" | "CHECKLIST" | "CODE" | "NOTE">;
  includeParentItems?: boolean;
  includeBranchSummary?: boolean;
}

const DEFAULT_OPTIONS: Required<ContextBuilderOptions> = {
  messageLimit: 20,
  includeArtifacts: true,
  artifactTypes: ["PLAN", "SPEC", "DECISION", "CHECKLIST"],
  includeParentItems: true,
  includeBranchSummary: true,
};

// ============================================
// Context Builder Service
// ============================================

export class ContextBuilder {
  private options: Required<ContextBuilderOptions>;

  constructor(options: ContextBuilderOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Build a complete context pack for a branch
   */
  async buildContext(branchId: string): Promise<ContextPack> {
    // Fetch branch with work item and project
    const branch = await db.branch.findUnique({
      where: { id: branchId },
      include: {
        workItem: {
          include: {
            project: true,
            parentEdges: {
              where: { deletedAt: null, edgeType: "PARENT_CHILD" },
              include: {
                parent: {
                  select: {
                    id: true,
                    type: true,
                    title: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!branch) {
      throw new Error(`Branch not found: ${branchId}`);
    }

    const { workItem } = branch;
    const { project } = workItem;

    // Fetch messages
    const messages = await this.getRecentMessages(branchId);

    // Fetch message count
    const messageCount = await db.message.count({
      where: { branchId, deletedAt: null },
    });

    // Fetch artifacts
    const artifacts = await this.getLinkedArtifacts(workItem.id, branchId);

    // Calculate token estimate (rough: ~4 chars per token)
    const tokenEstimate = this.estimateTokens({
      project,
      workItem,
      branch,
      messages,
      artifacts: artifacts.all,
    });

    return {
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        summary: project.summary,
      },
      workItem: {
        id: workItem.id,
        type: workItem.type,
        title: workItem.title,
        description: workItem.description,
        status: workItem.status,
        priority: workItem.priority,
        acceptanceCriteria: workItem.acceptanceCriteria,
        parentItems: this.options.includeParentItems
          ? workItem.parentEdges.map((edge) => ({
              id: edge.parent.id,
              type: edge.parent.type,
              title: edge.parent.title,
            }))
          : [],
      },
      branch: {
        id: branch.id,
        name: branch.name,
        summary: this.options.includeBranchSummary ? branch.summary : null,
        messageCount,
        isDefault: branch.isDefault,
      },
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
        userName: m.user?.name ?? null,
      })),
      artifacts,
      metadata: {
        generatedAt: new Date(),
        tokenEstimate,
      },
    };
  }

  /**
   * Build context as a formatted string for AI prompts
   */
  async buildContextString(branchId: string): Promise<string> {
    const context = await this.buildContext(branchId);
    return this.formatContextAsString(context);
  }

  /**
   * Format context pack as a string suitable for AI system prompts
   */
  formatContextAsString(context: ContextPack): string {
    const sections: string[] = [];

    // Project section
    sections.push(`## Project: ${context.project.name}`);
    if (context.project.description) {
      sections.push(`Description: ${context.project.description}`);
    }
    if (context.project.summary) {
      sections.push(`Summary: ${context.project.summary}`);
    }

    // Work item section
    sections.push("");
    sections.push(`## Work Item: ${context.workItem.title}`);
    sections.push(`Type: ${context.workItem.type} | Status: ${context.workItem.status} | Priority: ${context.workItem.priority}`);
    if (context.workItem.description) {
      sections.push(`Description: ${context.workItem.description}`);
    }
    if (context.workItem.acceptanceCriteria) {
      sections.push(`Acceptance Criteria:\n${context.workItem.acceptanceCriteria}`);
    }

    // Parent items
    if (context.workItem.parentItems.length > 0) {
      sections.push("");
      sections.push("### Parent Items:");
      for (const parent of context.workItem.parentItems) {
        sections.push(`- [${parent.type}] ${parent.title}`);
      }
    }

    // Branch summary
    if (context.branch.summary) {
      sections.push("");
      sections.push("## Conversation Summary");
      sections.push(context.branch.summary);
    }

    // Artifacts
    if (context.artifacts.all.length > 0) {
      sections.push("");
      sections.push("## Linked Artifacts");
      for (const artifact of context.artifacts.all) {
        sections.push(`### ${artifact.type}: ${artifact.title} (v${artifact.version})`);
        sections.push("```json");
        sections.push(JSON.stringify(artifact.content, null, 2));
        sections.push("```");
      }
    }

    // Recent messages
    if (context.messages.length > 0) {
      sections.push("");
      sections.push("## Recent Conversation");
      for (const msg of context.messages) {
        const prefix = msg.role === "USER" ? `User${msg.userName ? ` (${msg.userName})` : ""}` : msg.role;
        sections.push(`**${prefix}**: ${msg.content}`);
      }
    }

    return sections.join("\n");
  }

  /**
   * Get recent messages for a branch
   */
  private async getRecentMessages(branchId: string) {
    return db.message.findMany({
      where: { branchId, deletedAt: null },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: this.options.messageLimit,
    }).then((messages) => messages.reverse()); // Reverse to get chronological order
  }

  /**
   * Get linked artifacts for a work item
   */
  private async getLinkedArtifacts(
    workItemId: string,
    branchId: string
  ): Promise<ContextPack["artifacts"]> {
    if (!this.options.includeArtifacts) {
      return { plan: null, spec: null, decision: null, checklist: null, all: [] };
    }

    // Get latest of each artifact type
    const artifacts = await db.artifact.findMany({
      where: {
        workItemId,
        deletedAt: null,
        type: { in: this.options.artifactTypes },
      },
      orderBy: [{ type: "asc" }, { version: "desc" }, { updatedAt: "desc" }],
    });

    // Group by type and take latest
    const byType: Record<string, ArtifactSummary> = {};
    for (const artifact of artifacts) {
      if (!byType[artifact.type]) {
        byType[artifact.type] = {
          id: artifact.id,
          type: artifact.type,
          title: artifact.title,
          version: artifact.version,
          content: artifact.content,
          updatedAt: artifact.updatedAt,
        };
      }
    }

    return {
      plan: byType["PLAN"] ?? null,
      spec: byType["SPEC"] ?? null,
      decision: byType["DECISION"] ?? null,
      checklist: byType["CHECKLIST"] ?? null,
      all: Object.values(byType),
    };
  }

  /**
   * Estimate token count for the context
   */
  private estimateTokens(data: {
    project: Project;
    workItem: WorkItem;
    branch: Branch;
    messages: Array<{ content: string }>;
    artifacts: ArtifactSummary[];
  }): number {
    let chars = 0;

    // Project
    chars += (data.project.name?.length ?? 0);
    chars += (data.project.description?.length ?? 0);
    chars += (data.project.summary?.length ?? 0);

    // Work item
    chars += (data.workItem.title?.length ?? 0);
    chars += (data.workItem.description?.length ?? 0);
    chars += (data.workItem.acceptanceCriteria?.length ?? 0);

    // Branch summary
    chars += (data.branch.summary?.length ?? 0);

    // Messages
    for (const msg of data.messages) {
      chars += msg.content.length;
    }

    // Artifacts
    for (const artifact of data.artifacts) {
      chars += JSON.stringify(artifact.content).length;
    }

    // Rough estimate: ~4 chars per token
    return Math.ceil(chars / 4);
  }
}

/**
 * Create a default context builder
 */
export function createContextBuilder(options?: ContextBuilderOptions): ContextBuilder {
  return new ContextBuilder(options);
}

/**
 * Quick helper to build context for a branch
 */
export async function buildContextForBranch(
  branchId: string,
  options?: ContextBuilderOptions
): Promise<ContextPack> {
  const builder = new ContextBuilder(options);
  return builder.buildContext(branchId);
}

