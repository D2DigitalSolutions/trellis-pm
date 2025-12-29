"use client";

import { useState } from "react";
import {
  GitBranch,
  MessageSquare,
  FileText,
  Plus,
  ChevronRight,
  Clock,
  GitFork,
  CheckCircle,
  FileCode,
  ClipboardList,
  BookOpen,
  Lightbulb,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useBranches, useMessages, useArtifactList } from "@/lib/hooks";

// ============================================
// Types
// ============================================

interface BranchPanelProps {
  workItemId: string;
  workItemTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

// ============================================
// Artifact Icons
// ============================================

const artifactIcons = {
  PLAN: Target,
  SPEC: BookOpen,
  CHECKLIST: ClipboardList,
  DECISION: CheckCircle,
  CODE: FileCode,
  NOTE: Lightbulb,
};

const artifactColors = {
  PLAN: "text-indigo-400 bg-indigo-500/10",
  SPEC: "text-purple-400 bg-purple-500/10",
  CHECKLIST: "text-emerald-400 bg-emerald-500/10",
  DECISION: "text-amber-400 bg-amber-500/10",
  CODE: "text-cyan-400 bg-cyan-500/10",
  NOTE: "text-slate-400 bg-slate-500/10",
};

// ============================================
// Branch List
// ============================================

function BranchList({
  workItemId,
  selectedBranchId,
  onBranchSelect,
  onCreateBranch,
}: {
  workItemId: string;
  selectedBranchId: string | null;
  onBranchSelect: (id: string) => void;
  onCreateBranch?: () => void;
}) {
  const { data: branches, isLoading } = useBranches(workItemId);

  if (isLoading) {
    return (
      <div className="p-4 text-center text-slate-500 text-sm">
        Loading branches...
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {branches?.map((branch) => (
        <div
          key={branch.id}
          onClick={() => onBranchSelect(branch.id)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors",
            selectedBranchId === branch.id
              ? "bg-indigo-500/20 text-white"
              : "text-slate-400 hover:bg-white/5 hover:text-white"
          )}
        >
          <GitBranch className="w-4 h-4 text-indigo-400" />
          <span className="flex-1 text-sm truncate">{branch.name}</span>
          {branch.isDefault && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-indigo-500/30 text-indigo-400">
              default
            </Badge>
          )}
          {branch.forkedFromId && (
            <GitFork className="w-3 h-3 text-slate-500" />
          )}
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </div>
      ))}

      {onCreateBranch && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-slate-400 hover:text-white"
          onClick={onCreateBranch}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Branch
        </Button>
      )}
    </div>
  );
}

// ============================================
// Branch Chat
// ============================================

function BranchChat({ branchId }: { branchId: string }) {
  const { data, isLoading } = useMessages(branchId);
  const [newMessage, setNewMessage] = useState("");
  
  const messagesList = data?.messages || [];

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
        Loading messages...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messagesList.length === 0 ? (
            <div className="text-center text-slate-500 text-sm py-8">
              No messages yet. Start a conversation!
            </div>
          ) : (
            messagesList.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === "USER" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-4 py-2.5",
                    message.role === "USER"
                      ? "bg-indigo-500/20 text-white"
                      : message.role === "ASSISTANT"
                      ? "bg-slate-800 text-slate-200"
                      : "bg-amber-500/10 text-amber-200 text-sm"
                  )}
                >
                  {message.role === "TOOL" && (
                    <div className="text-[10px] text-amber-400 mb-1 uppercase tracking-wider">
                      Tool Response
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <div className="flex items-center justify-end gap-2 mt-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span className="text-[10px] text-slate-500">
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t border-white/5">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && newMessage.trim()) {
                // Handle send message
                setNewMessage("");
              }
            }}
          />
          <Button
            size="icon"
            className="bg-indigo-600 hover:bg-indigo-500"
            disabled={!newMessage.trim()}
          >
            <MessageSquare className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Artifacts List
// ============================================

function ArtifactsList({ workItemId, branchId }: { workItemId: string; branchId?: string | null }) {
  const { data, isLoading } = useArtifactList(workItemId, { branchId: branchId || undefined });
  
  const artifactsList = data?.artifacts || [];

  if (isLoading) {
    return (
      <div className="p-4 text-center text-slate-500 text-sm">
        Loading artifacts...
      </div>
    );
  }

  if (artifactsList.length === 0) {
    return (
      <div className="p-8 text-center">
        <FileText className="w-12 h-12 mx-auto mb-3 text-slate-600" />
        <p className="text-slate-500 text-sm">No artifacts yet</p>
        <p className="text-slate-600 text-xs mt-1">
          Create plans, specs, or checklists for this work item
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-4">
      {artifactsList.map((artifact) => {
        const Icon = artifactIcons[artifact.type];
        const colorClass = artifactColors[artifact.type];

        return (
          <div
            key={artifact.id}
            className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 border border-white/5 cursor-pointer hover:border-white/10 transition-colors"
          >
            <div className={cn("p-2 rounded-lg", colorClass)}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-white truncate">
                {artifact.title}
              </h4>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 border-slate-600 text-slate-400"
                >
                  {artifact.type}
                </Badge>
                <span className="text-[10px] text-slate-500">
                  v{artifact.version}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function BranchPanel({
  workItemId,
  workItemTitle,
  isOpen,
  onClose,
}: BranchPanelProps) {
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("branches");

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-[420px] sm:max-w-[420px] bg-slate-950 border-l border-white/10 p-0"
      >
        <SheetHeader className="p-4 border-b border-white/5">
          <SheetTitle className="text-white text-lg">{workItemTitle}</SheetTitle>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-[calc(100%-73px)]">
          <TabsList className="grid w-full grid-cols-3 bg-slate-900/50 rounded-none border-b border-white/5">
            <TabsTrigger
              value="branches"
              className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-slate-400"
            >
              <GitBranch className="w-4 h-4 mr-2" />
              Branches
            </TabsTrigger>
            <TabsTrigger
              value="chat"
              className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-slate-400"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Chat
            </TabsTrigger>
            <TabsTrigger
              value="artifacts"
              className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-slate-400"
            >
              <FileText className="w-4 h-4 mr-2" />
              Artifacts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="branches" className="flex-1 m-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4">
                <BranchList
                  workItemId={workItemId}
                  selectedBranchId={selectedBranchId}
                  onBranchSelect={(id) => {
                    setSelectedBranchId(id);
                    setActiveTab("chat");
                  }}
                  onCreateBranch={() => {
                    // Handle create branch
                  }}
                />
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="chat" className="flex-1 m-0 overflow-hidden">
            {selectedBranchId ? (
              <BranchChat branchId={selectedBranchId} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <GitBranch className="w-12 h-12 mb-3 text-slate-600" />
                <p className="text-sm">Select a branch to view chat</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="artifacts" className="flex-1 m-0 overflow-hidden">
            <ScrollArea className="h-full">
              <ArtifactsList workItemId={workItemId} branchId={selectedBranchId} />
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

