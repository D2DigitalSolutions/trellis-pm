"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WorkItemCard } from "./work-item-card";
import { cn } from "@/lib/utils";

// ============================================
// Types
// ============================================

interface WorkItem {
  id: string;
  title: string;
  type: "EPIC" | "SPRINT" | "TASK" | "BUG" | "IDEA";
  status: string;
  description?: string | null;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT" | null;
  _count?: {
    branches?: number;
    artifacts?: number;
  };
}

interface BoardColumnProps {
  title: string;
  status: string;
  items: WorkItem[];
  selectedItemId: string | null;
  onItemSelect: (id: string) => void;
  onAddItem?: () => void;
  colorClass?: string;
}

// ============================================
// Status Colors
// ============================================

const statusColors: Record<string, { dot: string; bg: string; border: string }> = {
  TODO: {
    dot: "bg-slate-400",
    bg: "bg-slate-500/5",
    border: "border-slate-500/20",
  },
  OPEN: {
    dot: "bg-slate-400",
    bg: "bg-slate-500/5",
    border: "border-slate-500/20",
  },
  DOING: {
    dot: "bg-blue-400",
    bg: "bg-blue-500/5",
    border: "border-blue-500/20",
  },
  IN_PROGRESS: {
    dot: "bg-blue-400",
    bg: "bg-blue-500/5",
    border: "border-blue-500/20",
  },
  IN_REVIEW: {
    dot: "bg-purple-400",
    bg: "bg-purple-500/5",
    border: "border-purple-500/20",
  },
  DONE: {
    dot: "bg-emerald-400",
    bg: "bg-emerald-500/5",
    border: "border-emerald-500/20",
  },
  BLOCKED: {
    dot: "bg-red-400",
    bg: "bg-red-500/5",
    border: "border-red-500/20",
  },
};

// ============================================
// Component
// ============================================

export function BoardColumn({
  title,
  status,
  items,
  selectedItemId,
  onItemSelect,
  onAddItem,
}: BoardColumnProps) {
  const colors = statusColors[status] || statusColors.TODO;

  return (
    <div
      className={cn(
        "flex flex-col h-full min-w-[280px] max-w-[320px] rounded-xl border",
        colors.bg,
        colors.border
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full", colors.dot)} />
          <h3 className="font-medium text-sm text-white">{title}</h3>
          <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">
            {items.length}
          </span>
        </div>
        {onAddItem && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-slate-400 hover:text-white hover:bg-white/10"
            onClick={onAddItem}
          >
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Items */}
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-2">
          {items.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No items
            </div>
          ) : (
            items.map((item) => (
              <WorkItemCard
                key={item.id}
                id={item.id}
                title={item.title}
                type={item.type}
                description={item.description}
                priority={item.priority}
                branchCount={item._count?.branches}
                artifactCount={item._count?.artifacts}
                isSelected={selectedItemId === item.id}
                onClick={() => onItemSelect(item.id)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

