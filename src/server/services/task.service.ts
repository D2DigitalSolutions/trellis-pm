import { db } from "@/server/db";
import type { TaskCreate, TaskUpdate } from "@/lib/schemas";

/**
 * Task service - business logic layer for task operations
 */
export const taskService = {
  /**
   * Get all tasks for a project
   */
  async getByProject(
    projectId: string,
    options?: { status?: string; assigneeId?: string }
  ) {
    return db.task.findMany({
      where: {
        projectId,
        ...(options?.status && { status: options.status as any }),
        ...(options?.assigneeId && { assigneeId: options.assigneeId }),
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        labels: true,
        _count: {
          select: {
            comments: true,
            subtasks: true,
          },
        },
      },
      orderBy: [{ status: "asc" }, { position: "asc" }],
    });
  },

  /**
   * Get a single task by ID
   */
  async getById(id: string) {
    return db.task.findUnique({
      where: { id },
      include: {
        assignee: true,
        creator: true,
        labels: true,
        comments: {
          include: {
            author: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        subtasks: {
          include: {
            assignee: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
  },

  /**
   * Create a new task
   */
  async create(data: TaskCreate) {
    const { labelIds, ...taskData } = data;

    // Get the highest position for the status
    const maxPosition = await db.task.aggregate({
      where: {
        projectId: data.projectId,
        status: data.status ?? "TODO",
      },
      _max: {
        position: true,
      },
    });

    return db.task.create({
      data: {
        ...taskData,
        position: (maxPosition._max.position ?? -1) + 1,
        labels: labelIds
          ? {
              connect: labelIds.map((id) => ({ id })),
            }
          : undefined,
      },
      include: {
        assignee: true,
        labels: true,
      },
    });
  },

  /**
   * Update a task
   */
  async update(id: string, data: TaskUpdate) {
    const { labelIds, ...updateData } = data;

    return db.task.update({
      where: { id },
      data: {
        ...updateData,
        labels: labelIds
          ? {
              set: labelIds.map((id) => ({ id })),
            }
          : undefined,
      },
      include: {
        assignee: true,
        labels: true,
      },
    });
  },

  /**
   * Delete a task
   */
  async delete(id: string) {
    return db.task.delete({
      where: { id },
    });
  },

  /**
   * Reorder tasks
   */
  async reorder(
    tasks: Array<{ id: string; position: number; status: string }>
  ) {
    const updates = tasks.map((task) =>
      db.task.update({
        where: { id: task.id },
        data: {
          position: task.position,
          status: task.status as any,
        },
      })
    );

    return db.$transaction(updates);
  },

  /**
   * Add a comment to a task
   */
  async addComment(taskId: string, authorId: string, content: string) {
    return db.comment.create({
      data: {
        taskId,
        authorId,
        content,
      },
      include: {
        author: true,
      },
    });
  },
};

