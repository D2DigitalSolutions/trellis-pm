"use client";

import { useState } from "react";
import { 
  ResizableHandle, 
  ResizablePanel, 
  ResizablePanelGroup 
} from "@/components/ui/resizable";
import { ProjectSidebar } from "./project-sidebar";
import { BoardView } from "@/components/board/board-view";
import { BranchPanel } from "@/components/panel/branch-panel";
import { useWorkItem } from "@/lib/hooks";
import { PanelRightOpen, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";

// ============================================
// Types
// ============================================

interface DashboardLayoutProps {
  initialProjectId?: string;
}

// ============================================
// Header Bar
// ============================================

function HeaderBar({
  projectName,
  parentWorkItem,
  onOpenPanel,
  isPanelOpen,
}: {
  projectName?: string;
  parentWorkItem?: { title: string; type: string } | null;
  onOpenPanel: () => void;
  isPanelOpen: boolean;
}) {
  return (
    <header className="h-14 border-b border-white/5 bg-slate-950/50 backdrop-blur-sm flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        {projectName && (
          <>
            <h1 className="font-semibold text-white">{projectName}</h1>
            {parentWorkItem && (
              <>
                <span className="text-slate-600">/</span>
                <div className="flex items-center gap-2 text-slate-400">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <span className="text-sm">{parentWorkItem.title}</span>
                </div>
              </>
            )}
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className={`text-slate-400 hover:text-white ${isPanelOpen ? "bg-white/10" : ""}`}
          onClick={onOpenPanel}
        >
          <PanelRightOpen className="w-4 h-4 mr-2" />
          Details
        </Button>
      </div>
    </header>
  );
}

// ============================================
// Empty State
// ============================================

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mb-6">
        <Layers className="w-8 h-8 text-indigo-400" />
      </div>
      <h2 className="text-xl font-semibold text-white mb-2">Select a project</h2>
      <p className="text-slate-500 max-w-sm">
        Choose a project from the sidebar to view its work items on the board.
      </p>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function DashboardLayout({ initialProjectId }: DashboardLayoutProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    initialProjectId || null
  );
  const [selectedWorkItemId, setSelectedWorkItemId] = useState<string | null>(null);
  const [parentWorkItemId, setParentWorkItemId] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Fetch selected work item details
  const { data: selectedWorkItem } = useWorkItem(selectedWorkItemId || "");
  const { data: parentWorkItem } = useWorkItem(parentWorkItemId || "");

  const handleProjectSelect = (projectId: string) => {
    setSelectedProjectId(projectId);
    setSelectedWorkItemId(null);
    setParentWorkItemId(null);
    setIsPanelOpen(false);
  };

  const handleWorkItemSelect = (workItemId: string) => {
    setSelectedWorkItemId(workItemId);
    setIsPanelOpen(true);
  };

  const handleWorkItemDoubleClick = (workItemId: string) => {
    // Navigate into the work item (set as parent)
    setParentWorkItemId(workItemId);
    setSelectedWorkItemId(null);
  };

  return (
    <div className="h-screen bg-slate-950 overflow-hidden">
      <ResizablePanelGroup orientation="horizontal" className="h-full">
        {/* Left Sidebar */}
        <ResizablePanel 
          defaultSize={20} 
          minSize={15} 
          maxSize={30}
          className="min-w-[200px]"
        >
          <ProjectSidebar
            selectedProjectId={selectedProjectId}
            selectedWorkItemId={selectedWorkItemId}
            onProjectSelect={handleProjectSelect}
            onWorkItemSelect={(id) => {
              // If clicking on an epic/sprint, set it as parent
              // Otherwise select it
              handleWorkItemSelect(id);
            }}
          />
        </ResizablePanel>

        <ResizableHandle className="w-px bg-white/5 hover:bg-indigo-500/50 transition-colors" />

        {/* Main Content */}
        <ResizablePanel defaultSize={80}>
          <div className="h-full flex flex-col">
            <HeaderBar
              projectName={selectedProjectId ? "Project" : undefined}
              parentWorkItem={parentWorkItem ? { title: parentWorkItem.title, type: parentWorkItem.type } : null}
              onOpenPanel={() => setIsPanelOpen(!isPanelOpen)}
              isPanelOpen={isPanelOpen}
            />

            <main className="flex-1 overflow-hidden">
              {selectedProjectId ? (
                <BoardView
                  projectId={selectedProjectId}
                  parentWorkItemId={parentWorkItemId}
                  selectedWorkItemId={selectedWorkItemId}
                  onWorkItemSelect={handleWorkItemSelect}
                />
              ) : (
                <EmptyState />
              )}
            </main>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Branch Panel (Right Drawer) */}
      {selectedWorkItem && (
        <BranchPanel
          workItemId={selectedWorkItem.id}
          workItemTitle={selectedWorkItem.title}
          isOpen={isPanelOpen}
          onClose={() => setIsPanelOpen(false)}
        />
      )}
    </div>
  );
}

