import { db } from "@/server/db";
import type { ProjectCreate, ProjectUpdate } from "@/lib/schemas";

/**
 * Project service - business logic layer for project operations
 */
export const projectService = {
  /**
   * Get all projects with optional filtering
   */
  async getAll(options?: { status?: string; ownerId?: string }) {
    return db.project.findMany({
      where: {
        ...(options?.status && { status: options.status as any }),
        ...(options?.ownerId && { ownerId: options.ownerId }),
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            tasks: true,
            members: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
  },

  /**
   * Get a single project by ID
   */
  async getById(id: string) {
    return db.project.findUnique({
      where: { id },
      include: {
        owner: true,
        members: {
          include: {
            user: true,
          },
        },
        labels: true,
        tasks: {
          include: {
            assignee: true,
            labels: true,
          },
          orderBy: {
            position: "asc",
          },
        },
      },
    });
  },

  /**
   * Get a project by slug
   */
  async getBySlug(slug: string) {
    return db.project.findUnique({
      where: { slug },
      include: {
        owner: true,
        members: {
          include: {
            user: true,
          },
        },
        labels: true,
      },
    });
  },

  /**
   * Create a new project
   */
  async create(data: ProjectCreate) {
    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    return db.project.create({
      data: {
        ...data,
        slug,
      },
    });
  },

  /**
   * Update a project
   */
  async update(id: string, data: ProjectUpdate) {
    return db.project.update({
      where: { id },
      data,
    });
  },

  /**
   * Delete a project
   */
  async delete(id: string) {
    return db.project.delete({
      where: { id },
    });
  },

  /**
   * Archive a project
   */
  async archive(id: string) {
    return db.project.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });
  },
};

