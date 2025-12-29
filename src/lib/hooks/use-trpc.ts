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

export function useProject(id: string) {
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
    },
  });
}

export function useUpdateProject() {
  const utils = trpc.useUtils();
  return trpc.project.update.useMutation({
    onSuccess: (data) => {
      utils.project.getAll.invalidate();
      utils.project.getById.invalidate({ id: data.id });
    },
  });
}

export function useDeleteProject() {
  const utils = trpc.useUtils();
  return trpc.project.delete.useMutation({
    onSuccess: () => {
      utils.project.getAll.invalidate();
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

export function useWorkItem(id: string) {
  return trpc.workItem.getById.useQuery(
    { id },
    { enabled: !!id }
  );
}

export function useCreateWorkItem() {
  const utils = trpc.useUtils();
  return trpc.workItem.create.useMutation({
    onSuccess: (data) => {
      utils.workItem.getByProject.invalidate({ projectId: data.projectId });
    },
  });
}

export function useUpdateWorkItem() {
  const utils = trpc.useUtils();
  return trpc.workItem.update.useMutation({
    onSuccess: (data) => {
      utils.workItem.getByProject.invalidate({ projectId: data.projectId });
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

export function useReorderWorkItems() {
  const utils = trpc.useUtils();
  return trpc.workItem.reorder.useMutation({
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

export function useBranch(id: string, includeMessages = true) {
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

export function useCreateMessage() {
  const utils = trpc.useUtils();
  return trpc.message.create.useMutation({
    onSuccess: (data) => {
      utils.message.getByBranch.invalidate({ branchId: data.branchId });
      utils.branch.getById.invalidate({ id: data.branchId });
    },
  });
}

export function useUpdateMessage() {
  const utils = trpc.useUtils();
  return trpc.message.update.useMutation({
    onSuccess: (data) => {
      utils.message.getByBranch.invalidate({ branchId: data.branchId });
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

// ============================================
// Artifact Hooks
// ============================================

export function useArtifacts(workItemId: string, type?: "PLAN" | "SPEC" | "CHECKLIST" | "DECISION" | "CODE" | "NOTE") {
  return trpc.artifact.getByWorkItem.useQuery(
    { workItemId, type },
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
      if (data.branchId) {
        utils.artifact.getByBranch.invalidate({ branchId: data.branchId });
      }
    },
  });
}

export function useUpdateArtifact() {
  const utils = trpc.useUtils();
  return trpc.artifact.update.useMutation({
    onSuccess: (data) => {
      utils.artifact.getById.invalidate({ id: data.id });
      utils.artifact.getByWorkItem.invalidate({ workItemId: data.workItemId });
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
