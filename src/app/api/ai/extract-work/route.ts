import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { extractWork } from "@/server/ai/extract-work";
import { extractWorkInputSchema } from "@/server/ai/schemas";
import { AIProviderError, StructuredOutputError } from "@/server/ai/types";

/**
 * POST /api/ai/extract-work
 *
 * Extract work items, artifacts, and suggested actions from user text.
 *
 * Request body:
 * {
 *   branchId: string,
 *   userText: string,
 *   options?: {
 *     includeContext?: boolean,
 *     maxWorkItems?: number,
 *     preferredTypes?: ("EPIC" | "SPRINT" | "TASK" | "BUG" | "IDEA")[]
 *   }
 * }
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     workItemsToCreate: [...],
 *     artifactsToCreate: [...],
 *     suggestedNextActions: [...]
 *   },
 *   metadata: {
 *     provider: string,
 *     model: string,
 *     tokenUsage?: {...}
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Validate input
    const validationResult = extractWorkInputSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation error",
          details: validationResult.error.errors.map((e) => ({
            path: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    const { branchId, userText, options } = validationResult.data;

    // Extract work items
    const result = await extractWork(branchId, userText, {
      includeContext: options?.includeContext ?? true,
      maxWorkItems: options?.maxWorkItems ?? 10,
      preferredTypes: options?.preferredTypes,
    });

    return NextResponse.json({
      success: true,
      data: result.data,
      metadata: {
        provider: result.provider,
        model: result.model,
        tokenUsage: result.tokenUsage,
      },
    });
  } catch (error) {
    console.error("Extract work error:", error);

    // Handle specific error types
    if (error instanceof StructuredOutputError) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to parse AI response",
          details: {
            provider: error.provider,
            validationErrors: error.validationErrors.errors.map((e) => ({
              path: e.path.join("."),
              message: e.message,
            })),
            rawOutput: error.rawOutput.substring(0, 500), // Truncate for safety
          },
        },
        { status: 422 }
      );
    }

    if (error instanceof AIProviderError) {
      const statusCode = error.code === "NO_PROVIDER" ? 503 : 502;
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          details: {
            provider: error.provider,
            code: error.code,
          },
        },
        { status: statusCode }
      );
    }

    // Generic error
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/extract-work
 *
 * Returns schema information for the extract-work endpoint
 */
export async function GET() {
  return NextResponse.json({
    endpoint: "/api/ai/extract-work",
    method: "POST",
    description: "Extract work items, artifacts, and suggested actions from user text",
    input: {
      branchId: "string (required) - The branch ID for context",
      userText: "string (required) - The user's text to analyze",
      options: {
        includeContext: "boolean (optional, default: true) - Include branch context",
        maxWorkItems: "number (optional, default: 10) - Maximum work items to extract",
        preferredTypes: "array (optional) - Preferred work item types",
      },
    },
    output: {
      workItemsToCreate: [
        {
          title: "string",
          type: "EPIC | SPRINT | TASK | BUG | IDEA",
          description: "string (optional)",
          acceptanceCriteria: ["string"],
          parentWorkItemId: "string (optional)",
          priority: "LOW | MEDIUM | HIGH | URGENT (optional)",
          estimatedEffort: "string (optional)",
        },
      ],
      artifactsToCreate: [
        {
          workItemTitleRef: "string",
          type: "PLAN | SPEC | CHECKLIST | DECISION | CODE | NOTE",
          title: "string",
          content: "object",
        },
      ],
      suggestedNextActions: ["string"],
    },
  });
}

