"use client";

import { useMemo } from "react";
import { BoardColumn } from "./board-column";
import { useWorkItems } from "@/lib/hooks";
import { Skeleton } from "@/components/ui/skeleton";

// ============================================
// Types
// ============================================

interface BoardViewProps {
  projectId: string;
  parentWorkItemId?: string | null;
  selectedWorkItemId: string | null;
  onWorkItemSelect: (id: string) => void;
  onAddWorkItem?: (status: string) => void;
}

// ============================================
// Column Configuration
// ============================================

const BOARD_COLUMNS = [
  { key: "TODO", title: "To Do", statuses: ["OPEN"] },
  { key: "DOING", title: "In Progress", statuses: ["IN_PROGRESS", "IN_REVIEW"] },
  { key: "DONE", title: "Done", statuses: ["DONE"] },
];

// ============================================
// Component
// ============================================

export function BoardView({
  projectId,
  parentWorkItemId,
  selectedWorkItemId,
  onWorkItemSelect,
  onAddWorkItem,
}: BoardViewProps) {
  const { data: workItems, isLoading } = useWorkItems(projectId);

  // Filter items by parent (if specified) and group by status
  const columns = useMemo(() => {
    if (!workItems) return BOARD_COLUMNS.map((col) => ({ ...col, items: [] }));

    // Filter by parent if specified
    type WorkItemWithEdges = (typeof workItems)[number] & {
      parentEdges?: { id: string; parentId: string; edgeType: string }[];
    };
    
    const items = workItems as WorkItemWithEdges[];
    let filteredItems = items;
    
    if (parentWorkItemId) {
      // Get children of the parent
      filteredItems = items.filter((item) => {
        const parentEdge = item.parentEdges?.find((e) => e.edgeType === "PARENT_CHILD");
        return parentEdge?.parentId === parentWorkItemId;
      });
    } else {
      // Show only root items (no parent)
      filteredItems = items.filter((item) => {
        const parentEdge = item.parentEdges?.find((e) => e.edgeType === "PARENT_CHILD");
        return !parentEdge?.parentId;
      });
    }

    return BOARD_COLUMNS.map((col) => ({
      ...col,
      items: filteredItems.filter((item) => col.statuses.includes(item.status)),
    }));
  }, [workItems, parentWorkItemId]);

  if (isLoading) {
    return (
      <div className="flex gap-4 p-6 h-full overflow-x-auto">
        {BOARD_COLUMNS.map((col) => (
          <div
            key={col.key}
            className="flex flex-col min-w-[280px] max-w-[320px] rounded-xl border border-white/10 bg-white/5 p-4"
          >
            <Skeleton className="h-6 w-24 mb-4" />
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-4 p-6 h-full overflow-x-auto">
      {columns.map((column) => (
        <BoardColumn
          key={column.key}
          title={column.title}
          status={column.key}
          items={column.items}
          selectedItemId={selectedWorkItemId}
          onItemSelect={onWorkItemSelect}
          onAddItem={onAddWorkItem ? () => onAddWorkItem(column.statuses[0]) : undefined}
        />
      ))}
    </div>
  );
}

