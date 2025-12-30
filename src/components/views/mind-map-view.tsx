"use client";

import { Plus, Network } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MindMapViewProps {
  projectId: string;
  parentWorkItemId?: string | null;
}

export function MindMapView({ projectId, parentWorkItemId }: MindMapViewProps) {
  // TODO: Implement actual mind map visualization
  // For MVP, show a placeholder with CTA

  return (
    <div className="h-full flex flex-col items-center justify-center bg-slate-950 p-8">
      <div className="max-w-2xl text-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-6 mx-auto">
          <Network className="w-10 h-10 text-purple-400" />
        </div>
        
        <h2 className="text-2xl font-semibold text-white mb-3">Mind Map View</h2>
        <p className="text-slate-400 mb-6">
          Visualize your work items as an interactive graph. Connect ideas, explore relationships,
          and think non-linearly.
        </p>

        <div className="p-6 rounded-lg bg-white/5 border border-white/10 mb-6">
          <p className="text-slate-300 text-sm mb-4">
            <strong>Coming Soon:</strong> Full mind map visualization with drag-and-drop nodes,
            custom connections, and real-time collaboration.
          </p>
          <p className="text-slate-500 text-xs">
            For now, use the Board view to manage your work items.
          </p>
        </div>

        <Button variant="outline" className="gap-2">
          <Plus className="w-4 h-4" />
          Add Work Item
        </Button>
      </div>
    </div>
  );
}

