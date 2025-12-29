"use client";

import { trpc } from "@/lib/providers/trpc-provider";

/**
 * Custom hooks for common tRPC operations
 */

// ============================================
// Project Hooks
// ============================================

export function useProjects(includeDeleted = false) {
  return trpc.project.getAll.useQuery({ includeDeleted });
}

export function useProjectList(options?: { status?: "ACTIVE" | "ARCHIVED" | "COMPLETED"; limit?: number }) {
  return trpc.project.list.useQuery(options);
}

export function useProject(id: string) {
  return trpc.project.get.useQuery(
    { id },
    { enabled: !!id }
  );
}

export function useProjectById(id: string) {
  return trpc.project.getById.useQuery(
    { id },
    { enabled: !!id }
  );
}

export function useProjectBySlug(slug: string) {
  return trpc.project.getBySlug.useQuery(
    { slug },
    { enabled: !!slug }
  );
}

export function useCreateProject() {
  const utils = trpc.useUtils();
  return trpc.project.create.useMutation({
    onSuccess: () => {
      utils.project.getAll.invalidate();
      utils.project.list.invalidate();
    },
  });
}

export function useUpdateProject() {
  const utils = trpc.useUtils();
  return trpc.project.update.useMutation({
    onSuccess: (data) => {
      utils.project.getAll.invalidate();
      utils.project.list.invalidate();
      utils.project.get.invalidate({ id: data.id });
      utils.project.getById.invalidate({ id: data.id });
    },
  });
}

export function useDeleteProject() {
  const utils = trpc.useUtils();
  return trpc.project.delete.useMutation({
    onSuccess: () => {
      utils.project.getAll.invalidate();
      utils.project.list.invalidate();
    },
  });
}

// ============================================
// Work Item Hooks
// ============================================

export function useWorkItems(projectId: string, type?: "EPIC" | "SPRINT" | "TASK" | "BUG" | "IDEA") {
  return trpc.workItem.getByProject.useQuery(
    { projectId, type },
    { enabled: !!projectId }
  );
}

export function useWorkItemList(projectId: string, options?: {
  type?: "EPIC" | "SPRINT" | "TASK" | "BUG" | "IDEA";
  status?: "OPEN" | "IN_PROGRESS" | "IN_REVIEW" | "BLOCKED" | "DONE" | "CANCELLED";
  limit?: number;
}) {
  return trpc.workItem.list.useQuery(
    { projectId, ...options },
    { enabled: !!projectId }
  );
}

export function useWorkItem(id: string) {
  return trpc.workItem.get.useQuery(
    { id },
    { enabled: !!id }
  );
}

export function useWorkItemById(id: string) {
  return trpc.workItem.getById.useQuery(
    { id },
    { enabled: !!id }
  );
}

export function useWorkItemHierarchy(id: string) {
  return trpc.workItem.getHierarchy.useQuery(
    { id },
    { enabled: !!id }
  );
}

export function useCreateWorkItem() {
  const utils = trpc.useUtils();
  return trpc.workItem.create.useMutation({
    onSuccess: (data) => {
      utils.workItem.getByProject.invalidate({ projectId: data.projectId });
      utils.workItem.list.invalidate();
    },
  });
}

export function useUpdateWorkItem() {
  const utils = trpc.useUtils();
  return trpc.workItem.update.useMutation({
    onSuccess: (data) => {
      utils.workItem.getByProject.invalidate({ projectId: data.projectId });
      utils.workItem.list.invalidate();
      utils.workItem.get.invalidate({ id: data.id });
      utils.workItem.getById.invalidate({ id: data.id });
    },
  });
}

export function useDeleteWorkItem() {
  const utils = trpc.useUtils();
  return trpc.workItem.delete.useMutation({
    onSuccess: () => {
      utils.workItem.invalidate();
    },
  });
}

export function useReparentWorkItem() {
  const utils = trpc.useUtils();
  return trpc.workItem.reparent.useMutation({
    onSuccess: () => {
      utils.workItem.invalidate();
    },
  });
}

export function useReorderWorkItems() {
  const utils = trpc.useUtils();
  return trpc.workItem.reorder.useMutation({
    onSuccess: () => {
      utils.workItem.invalidate();
    },
  });
}

export function useAddWorkItemEdge() {
  const utils = trpc.useUtils();
  return trpc.workItem.addEdge.useMutation({
    onSuccess: () => {
      utils.workItem.invalidate();
    },
  });
}

export function useRemoveWorkItemEdge() {
  const utils = trpc.useUtils();
  return trpc.workItem.removeEdge.useMutation({
    onSuccess: () => {
      utils.workItem.invalidate();
    },
  });
}

// ============================================
// Branch Hooks
// ============================================

export function useBranches(workItemId: string) {
  return trpc.branch.getByWorkItem.useQuery(
    { workItemId },
    { enabled: !!workItemId }
  );
}

export function useBranchList(workItemId: string) {
  return trpc.branch.list.useQuery(
    { workItemId },
    { enabled: !!workItemId }
  );
}

export function useBranch(id: string, includeMessages = true) {
  return trpc.branch.get.useQuery(
    { id, includeMessages },
    { enabled: !!id }
  );
}

export function useBranchById(id: string, includeMessages = true) {
  return trpc.branch.getById.useQuery(
    { id, includeMessages },
    { enabled: !!id }
  );
}

export function useCreateBranch() {
  const utils = trpc.useUtils();
  return trpc.branch.create.useMutation({
    onSuccess: (data) => {
      utils.branch.getByWorkItem.invalidate({ workItemId: data.workItemId });
      utils.branch.list.invalidate({ workItemId: data.workItemId });
      utils.workItem.get.invalidate({ id: data.workItemId });
    },
  });
}

export function useForkBranchFromMessage() {
  const utils = trpc.useUtils();
  return trpc.branch.forkFromMessage.useMutation({
    onSuccess: (data) => {
      if (data) {
        utils.branch.getByWorkItem.invalidate({ workItemId: data.workItemId });
        utils.branch.list.invalidate({ workItemId: data.workItemId });
        utils.workItem.get.invalidate({ id: data.workItemId });
      }
    },
  });
}

export function useSetDefaultBranch() {
  const utils = trpc.useUtils();
  return trpc.branch.setDefault.useMutation({
    onSuccess: () => {
      utils.branch.invalidate();
    },
  });
}

export function useDeleteBranch() {
  const utils = trpc.useUtils();
  return trpc.branch.delete.useMutation({
    onSuccess: () => {
      utils.branch.invalidate();
    },
  });
}

// ============================================
// Message Hooks
// ============================================

export function useMessages(branchId: string, limit = 50) {
  return trpc.message.getByBranch.useQuery(
    { branchId, limit },
    { enabled: !!branchId }
  );
}

export function useMessageList(branchId: string, options?: { limit?: number; order?: "asc" | "desc" }) {
  return trpc.message.list.useQuery(
    { branchId, ...options },
    { enabled: !!branchId }
  );
}

export function useMessage(id: string) {
  return trpc.message.get.useQuery(
    { id },
    { enabled: !!id }
  );
}

export function useAppendMessage() {
  const utils = trpc.useUtils();
  return trpc.message.append.useMutation({
    onSuccess: (data) => {
      utils.message.getByBranch.invalidate({ branchId: data.branchId });
      utils.message.list.invalidate({ branchId: data.branchId });
      utils.branch.get.invalidate({ id: data.branchId });
      utils.branch.getById.invalidate({ id: data.branchId });
    },
  });
}

export function useCreateMessage() {
  const utils = trpc.useUtils();
  return trpc.message.create.useMutation({
    onSuccess: (data) => {
      utils.message.getByBranch.invalidate({ branchId: data.branchId });
      utils.message.list.invalidate({ branchId: data.branchId });
      utils.branch.get.invalidate({ id: data.branchId });
      utils.branch.getById.invalidate({ id: data.branchId });
    },
  });
}

export function useUpdateMessage() {
  const utils = trpc.useUtils();
  return trpc.message.update.useMutation({
    onSuccess: (data) => {
      utils.message.getByBranch.invalidate({ branchId: data.branchId });
      utils.message.list.invalidate({ branchId: data.branchId });
      utils.message.get.invalidate({ id: data.id });
    },
  });
}

export function useDeleteMessage() {
  const utils = trpc.useUtils();
  return trpc.message.delete.useMutation({
    onSuccess: () => {
      utils.message.invalidate();
    },
  });
}

export function useBulkAppendMessages() {
  const utils = trpc.useUtils();
  return trpc.message.bulkAppend.useMutation({
    onSuccess: (_, variables) => {
      utils.message.getByBranch.invalidate({ branchId: variables.branchId });
      utils.message.list.invalidate({ branchId: variables.branchId });
    },
  });
}

// ============================================
// Artifact Hooks
// ============================================

export function useArtifacts(workItemId: string, type?: "PLAN" | "SPEC" | "CHECKLIST" | "DECISION" | "CODE" | "NOTE") {
  return trpc.artifact.getByWorkItem.useQuery(
    { workItemId, type },
    { enabled: !!workItemId }
  );
}

export function useArtifactList(workItemId: string, options?: {
  type?: "PLAN" | "SPEC" | "CHECKLIST" | "DECISION" | "CODE" | "NOTE";
  branchId?: string;
  limit?: number;
}) {
  return trpc.artifact.list.useQuery(
    { workItemId, ...options },
    { enabled: !!workItemId }
  );
}

export function useArtifactsByBranch(branchId: string) {
  return trpc.artifact.getByBranch.useQuery(
    { branchId },
    { enabled: !!branchId }
  );
}

export function useArtifact(id: string) {
  return trpc.artifact.get.useQuery(
    { id },
    { enabled: !!id }
  );
}

export function useArtifactById(id: string) {
  return trpc.artifact.getById.useQuery(
    { id },
    { enabled: !!id }
  );
}

export function useCreateArtifact() {
  const utils = trpc.useUtils();
  return trpc.artifact.create.useMutation({
    onSuccess: (data) => {
      utils.artifact.getByWorkItem.invalidate({ workItemId: data.workItemId });
      utils.artifact.list.invalidate({ workItemId: data.workItemId });
      if (data.branchId) {
        utils.artifact.getByBranch.invalidate({ branchId: data.branchId });
      }
      utils.workItem.get.invalidate({ id: data.workItemId });
    },
  });
}

export function useUpdateArtifact() {
  const utils = trpc.useUtils();
  return trpc.artifact.update.useMutation({
    onSuccess: (data) => {
      utils.artifact.get.invalidate({ id: data.id });
      utils.artifact.getById.invalidate({ id: data.id });
      utils.artifact.getByWorkItem.invalidate({ workItemId: data.workItemId });
      utils.artifact.list.invalidate({ workItemId: data.workItemId });
    },
  });
}

export function useDeleteArtifact() {
  const utils = trpc.useUtils();
  return trpc.artifact.delete.useMutation({
    onSuccess: () => {
      utils.artifact.invalidate();
    },
  });
}

export function useDuplicateArtifact() {
  const utils = trpc.useUtils();
  return trpc.artifact.duplicate.useMutation({
    onSuccess: (data) => {
      utils.artifact.getByWorkItem.invalidate({ workItemId: data.workItemId });
      utils.artifact.list.invalidate({ workItemId: data.workItemId });
    },
  });
}

// ============================================
// Context Hooks
// ============================================

export function useContext(branchId: string, options?: {
  messageLimit?: number;
  includeArtifacts?: boolean;
}) {
  return trpc.context.build.useQuery(
    { branchId, options },
    { enabled: !!branchId }
  );
}

export function useContextString(branchId: string, options?: {
  messageLimit?: number;
  includeArtifacts?: boolean;
}) {
  return trpc.context.buildString.useQuery(
    { branchId, options },
    { enabled: !!branchId }
  );
}

export function useNeedsSummary(branchId: string) {
  return trpc.context.needsSummary.useQuery(
    { branchId },
    { enabled: !!branchId }
  );
}

export function useSummarizeBranch() {
  const utils = trpc.useUtils();
  return trpc.context.summarizeBranch.useMutation({
    onSuccess: (_, variables) => {
      utils.branch.get.invalidate({ id: variables.branchId });
      utils.branch.getById.invalidate({ id: variables.branchId });
      utils.context.build.invalidate({ branchId: variables.branchId });
      utils.context.needsSummary.invalidate({ branchId: variables.branchId });
    },
  });
}

export function useSummarizeProject() {
  const utils = trpc.useUtils();
  return trpc.context.summarizeProject.useMutation({
    onSuccess: (_, variables) => {
      utils.project.get.invalidate({ id: variables.projectId });
      utils.project.getById.invalidate({ id: variables.projectId });
    },
  });
}

export function useRunSummarizationJob() {
  const utils = trpc.useUtils();
  return trpc.context.runSummarizationJob.useMutation({
    onSuccess: () => {
      utils.branch.invalidate();
      utils.context.invalidate();
    },
  });
}

// ============================================
// AI Hooks
// ============================================

export function useAIStatus() {
  return trpc.ai.status.useQuery();
}

export function useExtractWork() {
  return trpc.ai.extractWork.useMutation();
}

export function useGenerateText() {
  return trpc.ai.generateText.useMutation();
}
