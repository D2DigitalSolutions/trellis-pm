"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateProject, useModeTemplates } from "@/lib/hooks";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CreateProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (projectId: string) => void;
}

export function CreateProjectModal({ open, onOpenChange, onSuccess }: CreateProjectModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [modeTemplateId, setModeTemplateId] = useState<string>("");
  
  const { data: modeTemplates, isLoading: templatesLoading } = useModeTemplates();
  const createProject = useCreateProject();

  // Set default template when templates load
  useState(() => {
    if (modeTemplates && modeTemplates.length > 0 && !modeTemplateId) {
      const agileTemplate = modeTemplates.find(t => t.slug === "agile-sprint");
      setModeTemplateId(agileTemplate?.id || modeTemplates[0].id);
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Project name is required");
      return;
    }

    if (!modeTemplateId) {
      toast.error("Please select a mode template");
      return;
    }

    try {
      const project = await createProject.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        modeTemplateId,
        slug: name.trim().toLowerCase().replace(/\s+/g, "-"),
        ownerId: "demo-user", // TODO: Replace with actual user ID when auth is implemented
      });

      toast.success(`Project "${project.name}" created!`);
      setName("");
      setDescription("");
      onOpenChange(false);
      onSuccess?.(project.id);
    } catch (error) {
      toast.error("Failed to create project");
      console.error(error);
    }
  };

  const handleCancel = () => {
    setName("");
    setDescription("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Choose a mode template to define how you'll work in this project.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Project Name */}
            <div className="space-y-2">
              <Label htmlFor="project-name">
                Project Name <span className="text-red-400">*</span>
              </Label>
              <Input
                id="project-name"
                placeholder="e.g., Mobile App Redesign"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="project-description">Description (optional)</Label>
              <Input
                id="project-description"
                placeholder="Brief description of your project"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Mode Template */}
            <div className="space-y-2">
              <Label htmlFor="mode-template">
                Mode Template <span className="text-red-400">*</span>
              </Label>
              <Select
                value={modeTemplateId}
                onValueChange={setModeTemplateId}
                disabled={templatesLoading}
              >
                <SelectTrigger id="mode-template">
                  <SelectValue placeholder="Select a mode template..." />
                </SelectTrigger>
                <SelectContent>
                  {templatesLoading ? (
                    <div className="flex items-center justify-center py-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  ) : (
                    modeTemplates?.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{template.name}</span>
                          <span className="text-xs text-slate-500">{template.description}</span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={createProject.isPending || !name.trim() || !modeTemplateId}>
              {createProject.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Project"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

