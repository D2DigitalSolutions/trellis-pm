"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Layers, Zap, ListTodo, Bug, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

const workItemIcons = {
  EPIC: Layers,
  SPRINT: Zap,
  TASK: ListTodo,
  BUG: Bug,
  IDEA: Lightbulb,
};

const workItemColors = {
  EPIC: "from-purple-500/20 to-purple-600/20 border-purple-500/50",
  SPRINT: "from-cyan-500/20 to-cyan-600/20 border-cyan-500/50",
  TASK: "from-slate-500/20 to-slate-600/20 border-slate-500/50",
  BUG: "from-red-500/20 to-red-600/20 border-red-500/50",
  IDEA: "from-amber-500/20 to-amber-600/20 border-amber-500/50",
};

const workItemIconColors = {
  EPIC: "text-purple-400",
  SPRINT: "text-cyan-400",
  TASK: "text-slate-400",
  BUG: "text-red-400",
  IDEA: "text-amber-400",
};

export interface WorkItemNodeData {
  title: string;
  type: "EPIC" | "SPRINT" | "TASK" | "BUG" | "IDEA";
  status: string;
  isSelected?: boolean;
}

export const WorkItemNode = memo(({ data, selected }: NodeProps<WorkItemNodeData>) => {
  const Icon = workItemIcons[data.type];
  const colorClass = workItemColors[data.type];
  const iconColor = workItemIconColors[data.type];

  return (
    <div
      className={cn(
        "px-4 py-3 rounded-lg border-2 bg-gradient-to-br backdrop-blur-sm min-w-[200px] max-w-[250px] transition-all",
        colorClass,
        selected || data.isSelected
          ? "ring-2 ring-indigo-500 shadow-lg shadow-indigo-500/20"
          : "hover:shadow-md"
      )}
    >
      {/* Top handle for incoming connections */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-indigo-500 !border-2 !border-white"
      />

      {/* Node content */}
      <div className="flex items-start gap-2">
        <Icon className={cn("w-5 h-5 flex-shrink-0 mt-0.5", iconColor)} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white leading-tight break-words">
            {data.title}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-400">{data.type}</span>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-xs text-slate-400">{data.status}</span>
          </div>
        </div>
      </div>

      {/* Bottom handle for outgoing connections */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-indigo-500 !border-2 !border-white"
      />
    </div>
  );
});

WorkItemNode.displayName = "WorkItemNode";

