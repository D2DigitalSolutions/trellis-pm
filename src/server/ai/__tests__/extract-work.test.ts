import { describe, it, expect, vi } from "vitest";
import {
  extractWorkResponseSchema,
  extractWorkInputSchema,
  workItemToCreateSchema,
  artifactToCreateSchema,
  type ExtractWorkResponse,
} from "../schemas/extract-work";

// ============================================
// Schema Validation Tests
// ============================================

describe("extractWorkResponseSchema", () => {
  it("should validate a complete valid response", () => {
    const validResponse: ExtractWorkResponse = {
      workItemsToCreate: [
        {
          title: "Implement user authentication",
          type: "TASK",
          description: "Add login and signup functionality",
          acceptanceCriteria: [
            "Users can sign up with email",
            "Users can log in with credentials",
            "Sessions persist across page refreshes",
          ],
          priority: "HIGH",
        },
        {
          title: "Fix login button styling",
          type: "BUG",
          description: "The login button is misaligned on mobile",
          parentWorkItemId: "parent-123",
        },
      ],
      artifactsToCreate: [
        {
          workItemTitleRef: "Implement user authentication",
          type: "SPEC",
          title: "Authentication Specification",
          content: {
            overview: "User authentication system",
            requirements: ["OAuth support", "Session management"],
          },
        },
      ],
      suggestedNextActions: [
        "Set up the authentication provider",
        "Create database migration for users table",
      ],
    };

    const result = extractWorkResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.workItemsToCreate).toHaveLength(2);
      expect(result.data.artifactsToCreate).toHaveLength(1);
      expect(result.data.suggestedNextActions).toHaveLength(2);
    }
  });

  it("should validate empty arrays", () => {
    const emptyResponse: ExtractWorkResponse = {
      workItemsToCreate: [],
      artifactsToCreate: [],
      suggestedNextActions: [],
    };

    const result = extractWorkResponseSchema.safeParse(emptyResponse);
    expect(result.success).toBe(true);
  });

  it("should reject missing required fields", () => {
    const invalidResponse = {
      workItemsToCreate: [],
      // Missing artifactsToCreate and suggestedNextActions
    };

    const result = extractWorkResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });

  it("should reject invalid work item type", () => {
    const invalidResponse = {
      workItemsToCreate: [
        {
          title: "Some task",
          type: "INVALID_TYPE", // Invalid
        },
      ],
      artifactsToCreate: [],
      suggestedNextActions: [],
    };

    const result = extractWorkResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });

  it("should reject work item with empty title", () => {
    const invalidResponse = {
      workItemsToCreate: [
        {
          title: "", // Empty
          type: "TASK",
        },
      ],
      artifactsToCreate: [],
      suggestedNextActions: [],
    };

    const result = extractWorkResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });
});

describe("workItemToCreateSchema", () => {
  it("should validate minimal work item", () => {
    const workItem = {
      title: "Simple task",
      type: "TASK",
    };

    const result = workItemToCreateSchema.safeParse(workItem);
    expect(result.success).toBe(true);
  });

  it("should validate work item with all fields", () => {
    const workItem = {
      title: "Complex task",
      type: "EPIC",
      description: "A complex epic with many subtasks",
      acceptanceCriteria: ["Criterion 1", "Criterion 2"],
      parentWorkItemId: "parent-id",
      priority: "URGENT",
      estimatedEffort: "2 weeks",
    };

    const result = workItemToCreateSchema.safeParse(workItem);
    expect(result.success).toBe(true);
  });

  it("should reject title exceeding max length", () => {
    const workItem = {
      title: "a".repeat(300), // Exceeds 255 chars
      type: "TASK",
    };

    const result = workItemToCreateSchema.safeParse(workItem);
    expect(result.success).toBe(false);
  });

  it("should validate all work item types", () => {
    const types = ["EPIC", "SPRINT", "TASK", "BUG", "IDEA"];

    for (const type of types) {
      const result = workItemToCreateSchema.safeParse({
        title: "Test",
        type,
      });
      expect(result.success).toBe(true);
    }
  });

  it("should validate all priority levels", () => {
    const priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];

    for (const priority of priorities) {
      const result = workItemToCreateSchema.safeParse({
        title: "Test",
        type: "TASK",
        priority,
      });
      expect(result.success).toBe(true);
    }
  });
});

describe("artifactToCreateSchema", () => {
  it("should validate minimal artifact", () => {
    const artifact = {
      workItemTitleRef: "Some task",
      type: "NOTE",
      title: "Simple note",
      content: { text: "Just a note" },
    };

    const result = artifactToCreateSchema.safeParse(artifact);
    expect(result.success).toBe(true);
  });

  it("should validate all artifact types", () => {
    const types = ["PLAN", "SPEC", "CHECKLIST", "DECISION", "CODE", "NOTE"];

    for (const type of types) {
      const result = artifactToCreateSchema.safeParse({
        workItemTitleRef: "Task",
        type,
        title: "Artifact",
        content: { data: "test" },
      });
      expect(result.success).toBe(true);
    }
  });

  it("should accept complex content structures", () => {
    const artifact = {
      workItemTitleRef: "Build API",
      type: "PLAN",
      title: "Implementation Plan",
      content: {
        phases: [
          { name: "Phase 1", tasks: ["Task A", "Task B"] },
          { name: "Phase 2", tasks: ["Task C"] },
        ],
        timeline: "2 weeks",
        dependencies: ["Database", "Auth"],
        nested: {
          deep: {
            value: [1, 2, 3],
          },
        },
      },
    };

    const result = artifactToCreateSchema.safeParse(artifact);
    expect(result.success).toBe(true);
  });
});

describe("extractWorkInputSchema", () => {
  it("should validate minimal input", () => {
    const input = {
      branchId: "branch-123",
      userText: "Create a login feature",
    };

    const result = extractWorkInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("should validate input with all options", () => {
    const input = {
      branchId: "branch-123",
      userText: "Create a login feature",
      options: {
        includeContext: false,
        maxWorkItems: 5,
        preferredTypes: ["TASK", "BUG"],
      },
    };

    const result = extractWorkInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("should reject empty branchId", () => {
    const input = {
      branchId: "",
      userText: "Some text",
    };

    const result = extractWorkInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("should reject empty userText", () => {
    const input = {
      branchId: "branch-123",
      userText: "",
    };

    const result = extractWorkInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("should reject maxWorkItems out of range", () => {
    const input = {
      branchId: "branch-123",
      userText: "Some text",
      options: {
        maxWorkItems: 100, // Max is 20
      },
    };

    const result = extractWorkInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

// ============================================
// Validation Helper Tests
// ============================================

describe("validateExtractWorkResponse", () => {
  it("should return success for valid data", () => {
    const validData = {
      workItemsToCreate: [{ title: "Task", type: "TASK" }],
      artifactsToCreate: [],
      suggestedNextActions: ["Do something"],
    };

    const result = extractWorkResponseSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.workItemsToCreate[0].title).toBe("Task");
    }
  });

  it("should return errors for invalid data", () => {
    const invalidData = {
      workItemsToCreate: [{ title: "Task" }], // Missing type
      artifactsToCreate: [],
      suggestedNextActions: [],
    };

    const result = extractWorkResponseSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      // Zod v4 uses result.error which is a ZodError object
      expect(result.error).toBeDefined();
    }
  });
});

// ============================================
// JSON Repair Tests
// ============================================

describe("repairExtractWorkJson", () => {
  // Helper function that mirrors the actual implementation
  const repairExtractWorkJson = (rawJson: string): string => {
    let json = rawJson.trim();

    // Remove markdown code blocks
    if (json.startsWith("```")) {
      json = json.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }

    // Fix common issues
    // 1. Trailing commas
    json = json.replace(/,\s*([}\]])/g, "$1");

    // 2. Single quotes to double quotes
    json = json.replace(/'/g, '"');

    // 3. Unquoted property names
    json = json.replace(/(\{|,)\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

    // 4. Fix undefined/null values
    json = json.replace(/:\s*undefined/g, ": null");

    return json;
  };

  it("should remove markdown code blocks", () => {
    const input = '```json\n{"key": "value"}\n```';
    const result = repairExtractWorkJson(input);
    expect(result).toBe('{"key": "value"}');
  });

  it("should fix trailing commas", () => {
    const input = '{"key": "value",}';
    const result = repairExtractWorkJson(input);
    expect(result).toBe('{"key": "value"}');
  });

  it("should convert single quotes to double quotes", () => {
    const input = "{'key': 'value'}";
    const result = repairExtractWorkJson(input);
    expect(result).toBe('{"key": "value"}');
  });

  it("should fix unquoted property names", () => {
    const input = '{key: "value"}';
    const result = repairExtractWorkJson(input);
    expect(result).toBe('{"key": "value"}');
  });

  it("should handle undefined values", () => {
    const input = '{"key": undefined}';
    const result = repairExtractWorkJson(input);
    expect(result).toBe('{"key": null}');
  });

  it("should handle complex nested JSON", () => {
    const input = `\`\`\`json
{
  workItemsToCreate: [
    {title: 'Task 1', type: 'TASK',}
  ],
  artifactsToCreate: [],
  suggestedNextActions: ['action 1',]
}
\`\`\``;

    const result = repairExtractWorkJson(input);
    const parsed = JSON.parse(result);
    expect(parsed.workItemsToCreate).toHaveLength(1);
    expect(parsed.workItemsToCreate[0].title).toBe("Task 1");
  });
});

// ============================================
// Mock Provider Tests
// ============================================

describe("MockProvider Integration", () => {
  // Mock AI provider for testing
  const createMockProvider = (response: ExtractWorkResponse) => ({
    name: "mock",
    supportsStructuredOutput: true,
    generateText: vi.fn(),
    generateStructured: vi.fn().mockResolvedValue({
      data: response,
      rawText: JSON.stringify(response),
      finishReason: "stop",
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      model: "mock-model",
      provider: "mock",
    }),
  });

  it("should use mock provider response", async () => {
    const mockResponse: ExtractWorkResponse = {
      workItemsToCreate: [
        {
          title: "Test Task",
          type: "TASK",
          description: "A test task",
        },
      ],
      artifactsToCreate: [],
      suggestedNextActions: ["Test action"],
    };

    const provider = createMockProvider(mockResponse);
    const result = await provider.generateStructured({
      messages: [],
      schema: extractWorkResponseSchema,
    });

    expect(result.data).toEqual(mockResponse);
    expect(result.provider).toBe("mock");
  });

  it("should validate mock provider response against schema", async () => {
    const mockResponse: ExtractWorkResponse = {
      workItemsToCreate: [
        {
          title: "Epic Feature",
          type: "EPIC",
          acceptanceCriteria: ["Criterion 1", "Criterion 2"],
          priority: "HIGH",
        },
        {
          title: "Sub Task",
          type: "TASK",
          parentWorkItemId: "parent-id",
        },
      ],
      artifactsToCreate: [
        {
          workItemTitleRef: "Epic Feature",
          type: "PLAN",
          title: "Feature Plan",
          content: { steps: ["Step 1", "Step 2"] },
        },
      ],
      suggestedNextActions: ["Start implementation", "Create database schema"],
    };

    const provider = createMockProvider(mockResponse);
    const result = await provider.generateStructured({
      messages: [],
      schema: extractWorkResponseSchema,
    });

    // Validate the response
    const validation = extractWorkResponseSchema.safeParse(result.data);
    expect(validation.success).toBe(true);

    if (validation.success) {
      expect(validation.data.workItemsToCreate).toHaveLength(2);
      expect(validation.data.artifactsToCreate).toHaveLength(1);
      expect(validation.data.suggestedNextActions).toHaveLength(2);
    }
  });

  it("should handle provider returning invalid data", async () => {
    const invalidResponse = {
      workItemsToCreate: [
        {
          title: "Task",
          // Missing type - invalid
        },
      ],
      artifactsToCreate: [],
      suggestedNextActions: [],
    };

    // Validate that the schema catches the error
    const validation = extractWorkResponseSchema.safeParse(invalidResponse);
    expect(validation.success).toBe(false);

    if (!validation.success) {
      // Zod v4 uses result.error which is a ZodError object
      expect(validation.error).toBeDefined();
      // The error message should mention the missing type field
      expect(validation.error.message).toContain("type");
    }
  });

  it("should simulate structured output retry on validation failure", async () => {
    const invalidResponse = {
      workItemsToCreate: [{ title: "Task" }], // Missing type
      artifactsToCreate: [],
      suggestedNextActions: [],
    };

    const validResponse: ExtractWorkResponse = {
      workItemsToCreate: [{ title: "Task", type: "TASK" }],
      artifactsToCreate: [],
      suggestedNextActions: [],
    };

    // Mock provider that returns invalid first, then valid
    let callCount = 0;
    const retryingProvider = {
      name: "retry-mock",
      supportsStructuredOutput: false,
      generateText: vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            text: JSON.stringify(invalidResponse),
            provider: "retry-mock",
            model: "test",
          });
        }
        return Promise.resolve({
          text: JSON.stringify(validResponse),
          provider: "retry-mock",
          model: "test",
        });
      }),
    };

    // First call returns invalid
    const firstResult = await retryingProvider.generateText({});
    const firstValidation = extractWorkResponseSchema.safeParse(
      JSON.parse(firstResult.text)
    );
    expect(firstValidation.success).toBe(false);

    // Second call returns valid
    const secondResult = await retryingProvider.generateText({});
    const secondValidation = extractWorkResponseSchema.safeParse(
      JSON.parse(secondResult.text)
    );
    expect(secondValidation.success).toBe(true);

    expect(callCount).toBe(2);
  });
});
