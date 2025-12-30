"use client";

import { useState, useEffect } from "react";
import { ProjectSidebar } from "./project-sidebar";
import { BoardView } from "@/components/board/board-view";
import { MindMapView } from "@/components/views/mind-map-view";
import { BranchPanel } from "@/components/panel/branch-panel";
import { useWorkItem, useProject } from "@/lib/hooks";
import { PanelRightOpen, Layers, LayoutGrid, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReactFlowProvider } from "reactflow";

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
  project,
  parentWorkItem,
  selectedView,
  onViewChange,
  onOpenPanel,
  isPanelOpen,
}: {
  project?: { name: string; modeTemplate?: { name: string; slug: string } | null } | null;
  parentWorkItem?: { title: string; type: string } | null;
  selectedView: "board" | "mind-map";
  onViewChange: (view: "board" | "mind-map") => void;
  onOpenPanel: () => void;
  isPanelOpen: boolean;
}) {
  return (
    <header className="h-14 border-b border-white/5 bg-slate-950/50 backdrop-blur-sm flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        {project && (
          <>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-white">{project.name}</h1>
              {project.modeTemplate && (
                <Badge variant="secondary" className="text-xs">
                  {project.modeTemplate.name}
                </Badge>
              )}
            </div>
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

      <div className="flex items-center gap-4">
        {/* View Switcher */}
        {project && (
          <Tabs value={selectedView} onValueChange={(v) => onViewChange(v as "board" | "mind-map")}>
            <TabsList>
              <TabsTrigger value="board" className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4" />
                Board
              </TabsTrigger>
              <TabsTrigger value="mind-map" className="flex items-center gap-2">
                <Network className="w-4 h-4" />
                Mind Map
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

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
    <div className="flex flex-col items-center justify-center h-full text-center px-4">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mb-6">
        <Layers className="w-10 h-10 text-indigo-400" />
      </div>
      <h2 className="text-2xl font-semibold text-white mb-3">Welcome to Trellis</h2>
      <p className="text-slate-400 max-w-md mb-6">
        Trellis adapts to how you work. Choose a mode template when creating a project:
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mb-8">
        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
          <h3 className="font-medium text-white mb-1">Agile Sprint</h3>
          <p className="text-sm text-slate-400">Track sprints, tasks, and stories</p>
        </div>
        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
          <h3 className="font-medium text-white mb-1">Lean Experiment</h3>
          <p className="text-sm text-slate-400">Test hypotheses and iterate</p>
        </div>
        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
          <h3 className="font-medium text-white mb-1">Brainstorm Map</h3>
          <p className="text-sm text-slate-400">Explore ideas non-linearly</p>
        </div>
      </div>
      <p className="text-slate-500 text-sm">
        Select a project from the sidebar or create a new one to get started.
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
  const [selectedView, setSelectedView] = useState<"board" | "mind-map">("board");

  // Fetch selected work item details and project details
  const { data: selectedWorkItem } = useWorkItem(selectedWorkItemId || "");
  const { data: parentWorkItem } = useWorkItem(parentWorkItemId || "");
  const { data: currentProject } = useProject(selectedProjectId || "");

  // Load/save view preference from localStorage
  useEffect(() => {
    if (selectedProjectId) {
      const savedView = localStorage.getItem(`trellis-view-${selectedProjectId}`);
      if (savedView === "board" || savedView === "mind-map") {
        setSelectedView(savedView);
      }
    }
  }, [selectedProjectId]);

  const handleViewChange = (view: "board" | "mind-map") => {
    setSelectedView(view);
    if (selectedProjectId) {
      localStorage.setItem(`trellis-view-${selectedProjectId}`, view);
    }
  };

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
    <div className="h-screen bg-slate-950 overflow-hidden flex">
      {/* Left Sidebar - Fixed Width */}
      <aside className="w-64 flex-shrink-0 border-r border-white/5">
        <ProjectSidebar
          selectedProjectId={selectedProjectId}
          selectedWorkItemId={selectedWorkItemId}
          onProjectSelect={handleProjectSelect}
          onWorkItemSelect={(id) => {
            handleWorkItemSelect(id);
          }}
        />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <HeaderBar
          project={currentProject}
          parentWorkItem={parentWorkItem ? { title: parentWorkItem.title, type: parentWorkItem.type } : null}
          selectedView={selectedView}
          onViewChange={handleViewChange}
          onOpenPanel={() => setIsPanelOpen(!isPanelOpen)}
          isPanelOpen={isPanelOpen}
        />

        <main className="flex-1 overflow-hidden">
          {selectedProjectId ? (
            selectedView === "board" ? (
              <BoardView
                projectId={selectedProjectId}
                parentWorkItemId={parentWorkItemId}
                selectedWorkItemId={selectedWorkItemId}
                onWorkItemSelect={handleWorkItemSelect}
              />
            ) : (
              <ReactFlowProvider>
                <MindMapView
                  projectId={selectedProjectId}
                  parentWorkItemId={parentWorkItemId}
                  selectedWorkItemId={selectedWorkItemId}
                  onWorkItemSelect={handleWorkItemSelect}
                />
              </ReactFlowProvider>
            )
          ) : (
            <EmptyState />
          )}
        </main>
      </div>

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

