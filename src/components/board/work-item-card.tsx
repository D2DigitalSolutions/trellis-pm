"use client";

import { Layers, Bug, Lightbulb, ListTodo, Zap, MessageSquare, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ============================================
// Types
// ============================================

interface WorkItemCardProps {
  id: string;
  title: string;
  type: "EPIC" | "SPRINT" | "TASK" | "BUG" | "IDEA";
  description?: string | null;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT" | null;
  branchCount?: number;
  artifactCount?: number;
  isSelected?: boolean;
  onClick?: () => void;
}

// ============================================
// Icons & Colors
// ============================================

const typeIcons = {
  EPIC: Layers,
  SPRINT: Zap,
  TASK: ListTodo,
  BUG: Bug,
  IDEA: Lightbulb,
};

const typeColors = {
  EPIC: {
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
    icon: "text-purple-400",
    badge: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  },
  SPRINT: {
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/30",
    icon: "text-cyan-400",
    badge: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  },
  TASK: {
    bg: "bg-slate-500/10",
    border: "border-slate-500/30",
    icon: "text-slate-400",
    badge: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  },
  BUG: {
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    icon: "text-red-400",
    badge: "bg-red-500/20 text-red-300 border-red-500/30",
  },
  IDEA: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    icon: "text-amber-400",
    badge: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  },
};

const priorityColors = {
  LOW: "bg-slate-500/20 text-slate-400",
  MEDIUM: "bg-blue-500/20 text-blue-400",
  HIGH: "bg-orange-500/20 text-orange-400",
  URGENT: "bg-red-500/20 text-red-400",
};

// ============================================
// Component
// ============================================

export function WorkItemCard({
  id,
  title,
  type,
  description,
  priority,
  branchCount = 0,
  artifactCount = 0,
  isSelected,
  onClick,
}: WorkItemCardProps) {
  const Icon = typeIcons[type];
  const colors = typeColors[type];

  return (
    <div
      onClick={onClick}
      className={cn(
        "group p-3 rounded-lg border cursor-pointer transition-all duration-200",
        colors.bg,
        colors.border,
        isSelected
          ? "ring-2 ring-indigo-500 shadow-lg shadow-indigo-500/20"
          : "hover:border-white/20 hover:shadow-md"
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-2 mb-2">
        <div className={cn("p-1.5 rounded", colors.bg)}>
          <Icon className={cn("w-3.5 h-3.5", colors.icon)} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-white truncate">{title}</h4>
        </div>
      </div>

      {/* Description */}
      {description && (
        <p className="text-xs text-slate-400 line-clamp-2 mb-3">{description}</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", colors.badge)}>
            {type}
          </Badge>
          {priority && (
            <Badge
              variant="outline"
              className={cn("text-[10px] px-1.5 py-0 border-0", priorityColors[priority])}
            >
              {priority}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 text-slate-500">
          {branchCount > 0 && (
            <div className="flex items-center gap-0.5 text-[10px]">
              <MessageSquare className="w-3 h-3" />
              <span>{branchCount}</span>
            </div>
          )}
          {artifactCount > 0 && (
            <div className="flex items-center gap-0.5 text-[10px]">
              <FileText className="w-3 h-3" />
              <span>{artifactCount}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

