"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FolderKanban,
  Layers,
  Bug,
  Lightbulb,
  ListTodo,
  Plus,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useProjects, useWorkItems } from "@/lib/hooks";
import { CreateProjectModal } from "@/components/modals/create-project-modal";

// ============================================
// Types
// ============================================

interface WorkItemNode {
  id: string;
  title: string;
  type: "EPIC" | "SPRINT" | "TASK" | "BUG" | "IDEA";
  status: string;
  children: WorkItemNode[];
}

interface ProjectSidebarProps {
  selectedProjectId: string | null;
  selectedWorkItemId: string | null;
  onProjectSelect: (projectId: string) => void;
  onWorkItemSelect: (workItemId: string) => void;
  onCreateProject?: () => void;
}

// ============================================
// Icons
// ============================================

const workItemIcons = {
  EPIC: Layers,
  SPRINT: Zap,
  TASK: ListTodo,
  BUG: Bug,
  IDEA: Lightbulb,
};

const workItemColors = {
  EPIC: "text-purple-400",
  SPRINT: "text-cyan-400",
  TASK: "text-slate-400",
  BUG: "text-red-400",
  IDEA: "text-amber-400",
};

// ============================================
// Work Item Tree Node
// ============================================

function WorkItemTreeNode({
  item,
  selectedId,
  onSelect,
  level = 0,
}: {
  item: WorkItemNode;
  selectedId: string | null;
  onSelect: (id: string) => void;
  level?: number;
}) {
  const [isOpen, setIsOpen] = useState(level < 2);
  const hasChildren = item.children.length > 0;
  const Icon = workItemIcons[item.type];
  const colorClass = workItemColors[item.type];
  const isSelected = selectedId === item.id;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer transition-colors group",
          isSelected
            ? "bg-indigo-500/20 text-white"
            : "text-slate-400 hover:bg-white/5 hover:text-white"
        )}
        style={{ marginLeft: `${level * 16}px` }}
        onClick={() => onSelect(item.id)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
            className="p-0.5 hover:bg-white/10 rounded flex-shrink-0"
          >
            {isOpen ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </button>
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}
        <Icon className={cn("w-4 h-4 flex-shrink-0", colorClass)} />
        <span className="truncate text-sm flex-1">{item.title}</span>
      </div>

      {hasChildren && isOpen && (
        <div>
          {item.children.map((child) => (
            <WorkItemTreeNode
              key={child.id}
              item={child}
              selectedId={selectedId}
              onSelect={onSelect}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// Project Section
// ============================================

function ProjectSection({
  project,
  isSelected,
  selectedWorkItemId,
  onProjectSelect,
  onWorkItemSelect,
}: {
  project: { id: string; name: string; slug: string };
  isSelected: boolean;
  selectedWorkItemId: string | null;
  onProjectSelect: (id: string) => void;
  onWorkItemSelect: (id: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(isSelected);
  const { data: workItems, isLoading } = useWorkItems(project.id);

  // Build tree structure from flat work items
  const buildTree = (items: typeof workItems): WorkItemNode[] => {
    if (!items) return [];

    type WorkItemWithEdges = (typeof items)[number] & {
      parentEdges?: { id: string; parentId: string; edgeType: string }[];
    };
    
    const typedItems = items as WorkItemWithEdges[];

    const itemMap = new Map<string, WorkItemNode>();
    const roots: WorkItemNode[] = [];

    // First pass: create all nodes
    typedItems.forEach((item) => {
      itemMap.set(item.id, {
        id: item.id,
        title: item.title,
        type: item.type,
        status: item.status,
        children: [],
      });
    });

    // Second pass: build tree structure
    typedItems.forEach((item) => {
      const node = itemMap.get(item.id)!;
      const parentEdge = item.parentEdges?.find((e) => e.edgeType === "PARENT_CHILD");
      if (parentEdge?.parentId) {
        const parent = itemMap.get(parentEdge.parentId);
        if (parent) {
          parent.children.push(node);
        } else {
          roots.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    return roots;
  };

  const tree = buildTree(workItems);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-1">
      <CollapsibleTrigger asChild>
        <div
          className={cn(
            "flex items-center gap-2 py-2 px-2 cursor-pointer transition-colors rounded",
            isSelected
              ? "bg-indigo-500/10 border-l-2 border-indigo-500"
              : "hover:bg-white/5 border-l-2 border-transparent"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onProjectSelect(project.id);
          }}
        >
          <FolderKanban className="w-4 h-4 text-indigo-400 flex-shrink-0" />
          <span className="font-medium text-sm text-white flex-1 truncate">
            {project.name}
          </span>
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0" />
          )}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {isLoading ? (
          <div className="py-2 px-2 text-xs text-slate-500">Loading...</div>
        ) : tree.length === 0 ? (
          <div className="py-2 px-2 text-xs text-slate-500">No work items</div>
        ) : (
          tree.map((item) => (
            <WorkItemTreeNode
              key={item.id}
              item={item}
              selectedId={selectedWorkItemId}
              onSelect={onWorkItemSelect}
            />
          ))
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

// ============================================
// Main Component
// ============================================

export function ProjectSidebar({
  selectedProjectId,
  selectedWorkItemId,
  onProjectSelect,
  onWorkItemSelect,
  onCreateProject,
}: ProjectSidebarProps) {
  const { data: projects, isLoading } = useProjects();
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const handleCreateSuccess = (projectId: string) => {
    onProjectSelect(projectId);
  };

  return (
    <div className="h-full flex flex-col bg-slate-950">
      {/* Header */}
      <div className="px-4 py-4 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-xs">T</span>
            </div>
            <span className="font-semibold text-white">Trellis</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-400 hover:text-white hover:bg-white/10 flex-shrink-0"
            onClick={() => setCreateModalOpen(true)}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Projects List */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-3">
          <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
            Projects
          </h3>

          {isLoading ? (
            <div className="py-8 text-center text-slate-500 text-sm">
              Loading projects...
            </div>
          ) : !projects || projects.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-slate-500 text-sm mb-3">No projects yet</p>
              {onCreateProject && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCreateProject}
                  className="border-slate-700 text-slate-300"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Project
                </Button>
              )}
            </div>
          ) : (
            projects.map((project) => (
              <ProjectSection
                key={project.id}
                project={project}
                isSelected={selectedProjectId === project.id}
                selectedWorkItemId={selectedWorkItemId}
                onProjectSelect={onProjectSelect}
                onWorkItemSelect={onWorkItemSelect}
              />
            ))
          )}
        </div>
      </div>

      {/* Create Project Modal */}
      <CreateProjectModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}

