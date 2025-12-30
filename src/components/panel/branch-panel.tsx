"use client";

import { useState, useRef, useEffect } from "react";
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
  Loader2,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { 
  useBranches, 
  useMessages, 
  useArtifactList, 
  useAppendMessage,
  useCreateBranch,
  useForkBranchFromMessage,
} from "@/lib/hooks";
import { toast } from "sonner";

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
// Helper Functions
// ============================================

function generateDefaultBranchName(prefix: string = "fork"): string {
  const timestamp = new Date().toISOString().slice(0, 16).replace(/[:-]/g, "").replace("T", "-");
  return `${prefix}-${timestamp}`;
}

// ============================================
// Optimistic Message Type
// ============================================

interface OptimisticMessage {
  id: string;
  role: "USER" | "ASSISTANT" | "TOOL" | "SYSTEM";
  content: string;
  createdAt: Date;
  isOptimistic?: boolean;
}

// ============================================
// Fork Dialog Component
// ============================================

interface ForkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string) => void;
  isLoading: boolean;
  defaultName: string;
  messagePreview?: string;
}

function ForkDialog({ isOpen, onClose, onConfirm, isLoading, defaultName, messagePreview }: ForkDialogProps) {
  const [branchName, setBranchName] = useState(defaultName);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset and focus when dialog opens
  useEffect(() => {
    if (isOpen) {
      setBranchName(defaultName);
      setTimeout(() => inputRef.current?.select(), 100);
    }
  }, [isOpen, defaultName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (branchName.trim()) {
      onConfirm(branchName.trim());
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitFork className="w-5 h-5 text-indigo-400" />
            Fork Branch
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Create a new branch from this message. The new branch will include all messages up to this point.
          </DialogDescription>
        </DialogHeader>
        
        {messagePreview && (
          <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700 text-sm text-slate-300 max-h-20 overflow-hidden">
            <p className="line-clamp-2">{messagePreview}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="branch-name" className="text-slate-300">Branch Name</Label>
            <Input
              ref={inputRef}
              id="branch-name"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              placeholder="Enter branch name..."
              className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
              disabled={isLoading}
            />
          </div>
          
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!branchName.trim() || isLoading}
              className="bg-indigo-600 hover:bg-indigo-500"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <GitFork className="w-4 h-4 mr-2" />
                  Create Fork
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Create Branch Dialog Component
// ============================================

interface CreateBranchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string) => void;
  isLoading: boolean;
}

function CreateBranchDialog({ isOpen, onClose, onConfirm, isLoading }: CreateBranchDialogProps) {
  const [branchName, setBranchName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset and focus when dialog opens
  useEffect(() => {
    if (isOpen) {
      setBranchName(generateDefaultBranchName("branch"));
      setTimeout(() => inputRef.current?.select(), 100);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (branchName.trim()) {
      onConfirm(branchName.trim());
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-indigo-400" />
            Create New Branch
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Create a new empty branch for this work item.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="new-branch-name" className="text-slate-300">Branch Name</Label>
            <Input
              ref={inputRef}
              id="new-branch-name"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              placeholder="Enter branch name..."
              className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
              disabled={isLoading}
            />
          </div>
          
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!branchName.trim() || isLoading}
              className="bg-indigo-600 hover:bg-indigo-500"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Branch
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Branch Chat
// ============================================

interface BranchChatProps {
  branchId: string;
  onForkSuccess?: (newBranchId: string) => void;
}

function BranchChat({ branchId, onForkSuccess }: BranchChatProps) {
  const { data, isLoading, refetch } = useMessages(branchId);
  const [newMessage, setNewMessage] = useState("");
  const [optimisticMessages, setOptimisticMessages] = useState<OptimisticMessage[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Fork dialog state
  const [forkDialogOpen, setForkDialogOpen] = useState(false);
  const [forkMessageId, setForkMessageId] = useState<string | null>(null);
  const [forkMessagePreview, setForkMessagePreview] = useState<string>("");
  
  const appendMessage = useAppendMessage();
  const forkBranch = useForkBranchFromMessage();
  const isSending = appendMessage.isPending;
  const isForking = forkBranch.isPending;
  
  const messagesList = data?.messages || [];
  
  // Combine real messages with optimistic ones
  const allMessages: OptimisticMessage[] = [
    ...messagesList.map((m) => ({
      id: m.id,
      role: m.role as "USER" | "ASSISTANT" | "TOOL" | "SYSTEM",
      content: m.content,
      createdAt: new Date(m.createdAt),
      isOptimistic: false,
    })),
    ...optimisticMessages,
  ];
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [allMessages.length]);
  
  // Handle message send
  const handleSendMessage = async () => {
    const content = newMessage.trim();
    if (!content || isSending) return;
    
    // Create optimistic message
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMsg: OptimisticMessage = {
      id: optimisticId,
      role: "USER",
      content,
      createdAt: new Date(),
      isOptimistic: true,
    };
    
    // Add optimistic message immediately
    setOptimisticMessages((prev) => [...prev, optimisticMsg]);
    setNewMessage("");
    
    // Focus back on input
    inputRef.current?.focus();
    
    try {
      await appendMessage.mutateAsync({
        branchId,
        content,
        role: "USER",
      });
      
      // Remove optimistic message after successful append (cache will be updated)
      setOptimisticMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      
      // Refetch to ensure we have the latest messages
      await refetch();
    } catch (error) {
      // Remove optimistic message on error
      setOptimisticMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      
      // Show error toast
      const errorMessage = error instanceof Error ? error.message : "Failed to send message";
      toast.error("Failed to send message", {
        description: errorMessage,
      });
      
      // Restore the message content so user can retry
      setNewMessage(content);
    }
  };
  
  // Handle fork button click
  const handleForkClick = (messageId: string, messageContent: string) => {
    setForkMessageId(messageId);
    setForkMessagePreview(messageContent);
    setForkDialogOpen(true);
  };
  
  // Handle fork confirmation
  const handleForkConfirm = async (name: string) => {
    if (!forkMessageId) return;
    
    try {
      const newBranch = await forkBranch.mutateAsync({
        messageId: forkMessageId,
        name,
        copyMessages: true,
      });
      
      setForkDialogOpen(false);
      setForkMessageId(null);
      setForkMessagePreview("");
      
      toast.success("Branch forked successfully", {
        description: `Created new branch "${newBranch?.name || name}"`,
      });
      
      // Notify parent to switch to the new branch
      if (newBranch && onForkSuccess) {
        onForkSuccess(newBranch.id);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fork branch";
      toast.error("Failed to fork branch", {
        description: errorMessage,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Loading messages...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {allMessages.length === 0 ? (
            <div className="text-center text-slate-500 text-sm py-8">
              No messages yet. Start a conversation!
            </div>
          ) : (
            allMessages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "group flex gap-3",
                  message.role === "USER" ? "justify-end" : "justify-start",
                  message.isOptimistic && "opacity-70"
                )}
              >
                <div
                  className={cn(
                    "relative max-w-[85%] rounded-lg px-4 py-2.5",
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
                  <div className="flex items-center justify-between gap-2 mt-1">
                    {/* Fork button - visible on hover for non-optimistic messages */}
                    {!message.isOptimistic && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 px-1.5 text-[10px] text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleForkClick(message.id, message.content);
                        }}
                        title="Fork from this message"
                      >
                        <GitFork className="w-3 h-3 mr-1" />
                        Fork
                      </Button>
                    )}
                    
                    <div className="flex items-center gap-2 ml-auto">
                      {message.isOptimistic ? (
                        <Loader2 className="w-3 h-3 text-slate-500 animate-spin" />
                      ) : (
                        <Clock className="w-3 h-3 text-slate-500" />
                      )}
                      <span className="text-[10px] text-slate-500">
                        {message.isOptimistic
                          ? "Sending..."
                          : new Date(message.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                      </span>
                    </div>
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
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 disabled:opacity-50"
            disabled={isSending}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && newMessage.trim()) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          <Button
            size="icon"
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50"
            disabled={!newMessage.trim() || isSending}
            onClick={handleSendMessage}
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
      
      {/* Fork Dialog */}
      <ForkDialog
        isOpen={forkDialogOpen}
        onClose={() => {
          setForkDialogOpen(false);
          setForkMessageId(null);
          setForkMessagePreview("");
        }}
        onConfirm={handleForkConfirm}
        isLoading={isForking}
        defaultName={generateDefaultBranchName("fork")}
        messagePreview={forkMessagePreview}
      />
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
  const [createBranchDialogOpen, setCreateBranchDialogOpen] = useState(false);
  
  const createBranch = useCreateBranch();
  const { refetch: refetchBranches } = useBranches(workItemId);
  
  // Handle new branch creation
  const handleCreateBranch = async (name: string) => {
    try {
      const newBranch = await createBranch.mutateAsync({
        workItemId,
        name,
      });
      
      setCreateBranchDialogOpen(false);
      
      toast.success("Branch created successfully", {
        description: `Created new branch "${newBranch.name}"`,
      });
      
      // Refetch branches to update the list
      await refetchBranches();
      
      // Select the new branch and switch to chat
      setSelectedBranchId(newBranch.id);
      setActiveTab("chat");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create branch";
      toast.error("Failed to create branch", {
        description: errorMessage,
      });
    }
  };
  
  // Handle fork success - switch to the new branch
  const handleForkSuccess = async (newBranchId: string) => {
    // Refetch branches to get the new one
    await refetchBranches();
    
    // Select the new branch
    setSelectedBranchId(newBranchId);
  };

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
                  onCreateBranch={() => setCreateBranchDialogOpen(true)}
                />
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="chat" className="flex-1 m-0 overflow-hidden">
            {selectedBranchId ? (
              <BranchChat 
                branchId={selectedBranchId} 
                onForkSuccess={handleForkSuccess}
              />
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
        
        {/* Create Branch Dialog */}
        <CreateBranchDialog
          isOpen={createBranchDialogOpen}
          onClose={() => setCreateBranchDialogOpen(false)}
          onConfirm={handleCreateBranch}
          isLoading={createBranch.isPending}
        />
      </SheetContent>
    </Sheet>
  );
}

