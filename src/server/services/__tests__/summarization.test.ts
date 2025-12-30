import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================
// Mock setup - must be hoisted before imports
// ============================================

const mockGenerateStructured = vi.fn().mockResolvedValue({
  data: {
    summary: "Test summary of the conversation.",
    keyDecisions: ["Decision 1", "Decision 2"],
    openQuestions: ["Question 1"],
    nextSteps: ["Step 1", "Step 2"],
  },
  text: "{}",
  model: "mock-model",
});

// Mock the database module
vi.mock("@/server/db", () => ({
  db: {
    branch: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

// Mock the AI module
vi.mock("@/server/ai", () => ({
  getAIProvider: vi.fn(() => ({
    name: "mock",
    supportsStructuredOutput: false,
    generateText: vi.fn(),
    generateStructured: mockGenerateStructured,
  })),
}));

// ============================================
// Import after mocks are set up
// ============================================

import {
  SummarizationService,
  maybeSummarizeBranch,
  triggerSummarizationIfNeeded,
} from "../summarization";
import { db } from "@/server/db";

// Get mocked references
const mockDb = vi.mocked(db);

// ============================================
// Mock Branch Data
// ============================================

const createMockBranch = (overrides: Record<string, unknown> = {}) => ({
  id: "branch-123",
  name: "main",
  summaryMessageCount: 0,
  summary: null,
  summaryUpdatedAt: null,
  workItem: {
    title: "Test Work Item",
    type: "TASK",
    description: "A test work item",
  },
  messages: [] as Array<{
    id: string;
    role: string;
    content: string;
    createdAt: Date;
    user: { name: string } | null;
  }>,
  _count: { messages: 0 },
  ...overrides,
});

// ============================================
// Helper to generate messages
// ============================================

function generateMessages(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `msg-${i}`,
    role: i % 2 === 0 ? "USER" : "ASSISTANT",
    content: `Message content ${i}`,
    createdAt: new Date(Date.now() - (count - i) * 60000),
    user: i % 2 === 0 ? { name: "Test User" } : null,
  }));
}

// ============================================
// Tests
// ============================================

describe("SummarizationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("branchNeedsSummary", () => {
    it("should return false for empty branch", async () => {
      mockDb.branch.findUnique.mockResolvedValue({
        summaryMessageCount: 0,
        _count: { messages: 0 },
      } as never);

      const service = new SummarizationService();
      const result = await service.branchNeedsSummary("branch-123");

      expect(result).toBe(false);
    });

    it("should return false when below minimum threshold", async () => {
      mockDb.branch.findUnique.mockResolvedValue({
        summaryMessageCount: 0,
        _count: { messages: 5 }, // Below default of 10
      } as never);

      const service = new SummarizationService();
      const result = await service.branchNeedsSummary("branch-123");

      expect(result).toBe(false);
    });

    it("should return true when reaching minimum threshold", async () => {
      mockDb.branch.findUnique.mockResolvedValue({
        summaryMessageCount: 0,
        _count: { messages: 10 }, // At default threshold of 10
      } as never);

      const service = new SummarizationService();
      const result = await service.branchNeedsSummary("branch-123");

      expect(result).toBe(true);
    });

    it("should return true when exceeding minimum threshold", async () => {
      mockDb.branch.findUnique.mockResolvedValue({
        summaryMessageCount: 0,
        _count: { messages: 15 },
      } as never);

      const service = new SummarizationService();
      const result = await service.branchNeedsSummary("branch-123");

      expect(result).toBe(true);
    });

    it("should return false when not enough new messages since last summary", async () => {
      mockDb.branch.findUnique.mockResolvedValue({
        summaryMessageCount: 10,
        _count: { messages: 15 }, // Only 5 new messages, threshold is 10
      } as never);

      const service = new SummarizationService();
      const result = await service.branchNeedsSummary("branch-123");

      expect(result).toBe(false);
    });

    it("should return true when enough new messages since last summary", async () => {
      mockDb.branch.findUnique.mockResolvedValue({
        summaryMessageCount: 10,
        _count: { messages: 20 }, // 10 new messages, threshold is 10
      } as never);

      const service = new SummarizationService();
      const result = await service.branchNeedsSummary("branch-123");

      expect(result).toBe(true);
    });

    it("should return false when branch not found", async () => {
      mockDb.branch.findUnique.mockResolvedValue(null);

      const service = new SummarizationService();
      const result = await service.branchNeedsSummary("nonexistent");

      expect(result).toBe(false);
    });

    it("should respect custom configuration", async () => {
      mockDb.branch.findUnique.mockResolvedValue({
        summaryMessageCount: 0,
        _count: { messages: 3 },
      } as never);

      // Custom config with lower threshold
      const service = new SummarizationService({
        minMessagesForSummary: 3,
      });
      const result = await service.branchNeedsSummary("branch-123");

      expect(result).toBe(true);
    });
  });

  describe("summarizeBranch", () => {
    it("should generate and store summary when threshold met", async () => {
      const messages = generateMessages(12);
      
      mockDb.branch.findUnique.mockResolvedValue(createMockBranch({
        messages,
        summaryMessageCount: 0,
      }) as never);
      mockDb.branch.updateMany.mockResolvedValue({ count: 1 } as never);

      const service = new SummarizationService();
      const result = await service.summarizeBranch("branch-123");

      expect(result).not.toBeNull();
      expect(result?.summary).toBe("Test summary of the conversation.");
      expect(mockGenerateStructured).toHaveBeenCalledOnce();
      expect(mockDb.branch.updateMany).toHaveBeenCalledOnce();
    });

    it("should return null if not enough messages", async () => {
      const messages = generateMessages(5);
      
      mockDb.branch.findUnique.mockResolvedValue(createMockBranch({
        messages,
        summaryMessageCount: 0,
      }) as never);

      const service = new SummarizationService();
      const result = await service.summarizeBranch("branch-123");

      expect(result).toBeNull();
      expect(mockGenerateStructured).not.toHaveBeenCalled();
    });

    it("should use optimistic locking on update", async () => {
      const messages = generateMessages(12);
      
      mockDb.branch.findUnique.mockResolvedValue(createMockBranch({
        messages,
        summaryMessageCount: 5, // Some previous summary
      }) as never);
      mockDb.branch.updateMany.mockResolvedValue({ count: 1 } as never);

      const service = new SummarizationService();
      await service.summarizeBranch("branch-123");

      // Check that updateMany was called with the optimistic lock condition
      expect(mockDb.branch.updateMany).toHaveBeenCalledWith({
        where: {
          id: "branch-123",
          summaryMessageCount: 5, // Optimistic lock on previous count
        },
        data: expect.objectContaining({
          summaryMessageCount: 12, // New count
        }),
      });
    });

    it("should return null if optimistic lock fails (race condition)", async () => {
      const messages = generateMessages(12);
      
      mockDb.branch.findUnique.mockResolvedValue(createMockBranch({
        messages,
        summaryMessageCount: 0,
      }) as never);
      // Simulate optimistic lock failure - another process updated first
      mockDb.branch.updateMany.mockResolvedValue({ count: 0 } as never);

      const service = new SummarizationService();
      const result = await service.summarizeBranch("branch-123");

      expect(result).toBeNull();
    });
  });

  describe("maybeSummarizeBranch", () => {
    it("should summarize when threshold is met", async () => {
      const messages = generateMessages(12);
      
      // First call for needsSummary check
      mockDb.branch.findUnique
        .mockResolvedValueOnce({
          summaryMessageCount: 0,
          _count: { messages: 12 },
        } as never)
        // Second call for actual summarization
        .mockResolvedValueOnce(createMockBranch({
          messages,
          summaryMessageCount: 0,
        }) as never);
      mockDb.branch.updateMany.mockResolvedValue({ count: 1 } as never);

      const result = await maybeSummarizeBranch("branch-123");

      expect(result).toBe(true);
      expect(mockGenerateStructured).toHaveBeenCalledOnce();
    });

    it("should not summarize when threshold not met", async () => {
      mockDb.branch.findUnique.mockResolvedValue({
        summaryMessageCount: 0,
        _count: { messages: 5 },
      } as never);

      const result = await maybeSummarizeBranch("branch-123");

      expect(result).toBe(false);
      expect(mockGenerateStructured).not.toHaveBeenCalled();
    });
  });

  describe("triggerSummarizationIfNeeded", () => {
    it("should run summarization in background without blocking", async () => {
      const messages = generateMessages(12);
      
      mockDb.branch.findUnique
        .mockResolvedValueOnce({
          summaryMessageCount: 0,
          _count: { messages: 12 },
        } as never)
        .mockResolvedValueOnce({
          id: "branch-123",
          summaryMessageCount: 0,
          _count: { messages: 12 },
        } as never)
        .mockResolvedValueOnce(createMockBranch({
          messages,
          summaryMessageCount: 0,
        }) as never)
        .mockResolvedValueOnce({
          summaryMessageCount: 12,
        } as never);
      mockDb.branch.updateMany.mockResolvedValue({ count: 1 } as never);

      // This should return immediately
      triggerSummarizationIfNeeded("branch-123");

      // Give time for the background task to complete
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(mockGenerateStructured).toHaveBeenCalled();
    });

    it("should not block even if summarization throws an error", async () => {
      mockDb.branch.findUnique.mockResolvedValueOnce({
        summaryMessageCount: 0,
        _count: { messages: 12 },
      } as never).mockRejectedValueOnce(new Error("Database error"));

      // This should not throw
      expect(() => {
        triggerSummarizationIfNeeded("branch-123");
      }).not.toThrow();

      // Give time for the background task to attempt
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    it("should respect timeout option", async () => {
      // Slow mock that takes too long
      mockDb.branch.findUnique
        .mockResolvedValueOnce({
          summaryMessageCount: 0,
          _count: { messages: 12 },
        } as never)
        .mockImplementationOnce(() => 
          new Promise((resolve) => setTimeout(() => resolve({
            id: "branch-123",
            summaryMessageCount: 0,
            _count: { messages: 12 },
          } as never), 200))
        );

      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      // This should timeout quickly
      triggerSummarizationIfNeeded("branch-123", { timeoutMs: 50 });

      // Wait for timeout
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("timed out")
      );

      consoleSpy.mockRestore();
    });
  });
});

// ============================================
// Integration Test: Message Append Triggers Summarization
// ============================================

describe("Message Append Triggers Summarization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should trigger summarization check after message append", async () => {
    // This is more of a documentation test showing the expected behavior
    // The actual integration is in the message router
    
    mockDb.branch.findUnique.mockResolvedValue({
      summaryMessageCount: 0,
      _count: { messages: 10 }, // At threshold
    } as never);

    const service = new SummarizationService();
    const needsSummary = await service.branchNeedsSummary("branch-123");

    expect(needsSummary).toBe(true);
    
    // In the actual router, after message.create:
    // triggerSummarizationIfNeeded(branchId) is called
    // which runs the summarization in the background
  });
});
