"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateWorkItem } from "@/lib/hooks";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AddChildNodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  parentId: string | null;
  onSuccess?: (workItemId: string) => void;
}

export function AddChildNodeModal({ open, onOpenChange, projectId, parentId, onSuccess }: AddChildNodeModalProps) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"TASK" | "BUG" | "IDEA" | "EPIC" | "SPRINT">("TASK");
  
  const createWorkItem = useCreateWorkItem();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    try {
      const workItem = await createWorkItem.mutateAsync({
        projectId,
        title: title.trim(),
        type,
        status: "TODO",
        parentId: parentId || undefined,
      });

      toast.success(`${type} "${workItem.title}" created!`);
      setTitle("");
      setType("TASK");
      onOpenChange(false);
      onSuccess?.(workItem.id);
    } catch (error) {
      toast.error("Failed to create work item");
      console.error(error);
    }
  };

  const handleCancel = () => {
    setTitle("");
    setType("TASK");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Child Node</DialogTitle>
            <DialogDescription>
              {parentId
                ? "Create a new work item as a child of the selected node."
                : "Create a new root-level work item."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="node-title">
                Title <span className="text-red-400">*</span>
              </Label>
              <Input
                id="node-title"
                placeholder="e.g., Implement user login"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label htmlFor="node-type">Type</Label>
              <Select value={type} onValueChange={(v: any) => setType(v)}>
                <SelectTrigger id="node-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EPIC">Epic</SelectItem>
                  <SelectItem value="SPRINT">Sprint</SelectItem>
                  <SelectItem value="TASK">Task</SelectItem>
                  <SelectItem value="BUG">Bug</SelectItem>
                  <SelectItem value="IDEA">Idea</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={createWorkItem.isPending || !title.trim()}>
              {createWorkItem.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Node"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

