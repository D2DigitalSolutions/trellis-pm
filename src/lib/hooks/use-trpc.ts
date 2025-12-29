"use client";

import { trpc } from "@/lib/providers/trpc-provider";

/**
 * Custom hooks for common tRPC operations
 */

// ============================================
// Project Hooks
// ============================================

export function useProjects() {
  return trpc.project.getAll.useQuery();
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
// Task Hooks
// ============================================

export function useTasks(projectId: string) {
  return trpc.task.getByProject.useQuery(
    { projectId },
    { enabled: !!projectId }
  );
}

export function useTask(id: string) {
  return trpc.task.getById.useQuery(
    { id },
    { enabled: !!id }
  );
}

export function useCreateTask() {
  const utils = trpc.useUtils();
  return trpc.task.create.useMutation({
    onSuccess: (data) => {
      utils.task.getByProject.invalidate({ projectId: data.projectId });
    },
  });
}

export function useUpdateTask() {
  const utils = trpc.useUtils();
  return trpc.task.update.useMutation({
    onSuccess: (data) => {
      utils.task.getByProject.invalidate({ projectId: data.projectId });
      utils.task.getById.invalidate({ id: data.id });
    },
  });
}

export function useDeleteTask() {
  const utils = trpc.useUtils();
  return trpc.task.delete.useMutation({
    onSuccess: (_, variables) => {
      // Note: We'd need to know the projectId to invalidate properly
      // In practice, you'd pass it or use optimistic updates
      utils.task.invalidate();
    },
  });
}

export function useReorderTasks() {
  const utils = trpc.useUtils();
  return trpc.task.reorder.useMutation({
    onSuccess: () => {
      utils.task.invalidate();
    },
  });
}

