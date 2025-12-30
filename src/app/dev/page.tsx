"use client";

import { useState } from "react";
import {
  Activity,
  Zap,
  FileText,
  Play,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Cpu,
  GitBranch,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  useAIStatus, 
  useProjects, 
  useBranches,
  useExtractWork,
  useSummarizeBranch,
} from "@/lib/hooks";
import { toast } from "sonner";

// ============================================
// Provider Status Card
// ============================================

function ProviderStatusCard() {
  const { data: status, isLoading, refetch } = useAIStatus();

  if (isLoading) {
    return (
      <Card className="bg-slate-900 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Cpu className="w-5 h-5 text-indigo-400" />
            AI Provider Status
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-white">
            <Cpu className="w-5 h-5 text-indigo-400" />
            AI Provider Status
          </CardTitle>
          <CardDescription className="text-slate-400">
            Currently configured AI provider
          </CardDescription>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => refetch()}
          className="border-slate-600 text-slate-300 hover:bg-slate-800"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Active Provider */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800">
          <span className="text-slate-300">Active Provider</span>
          {status?.configured ? (
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              {status.configured}
            </Badge>
          ) : (
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
              None Configured
            </Badge>
          )}
        </div>

        {/* Provider Details */}
        <div className="space-y-2">
          <span className="text-sm font-medium text-slate-400">All Providers</span>
          {status?.details && Object.entries(status.details).map(([name, detail]) => (
            <div 
              key={name}
              className="flex items-center justify-between p-2 rounded bg-slate-800/50"
            >
              <div className="flex items-center gap-2">
                {detail.available ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-slate-500" />
                )}
                <span className="text-sm text-slate-300">{name}</span>
              </div>
              {!detail.available && detail.reason && (
                <span className="text-xs text-slate-500">{detail.reason}</span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// Project & Mode Template Card
// ============================================

function ProjectTemplateCard() {
  const { data: projects, isLoading } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  const selectedProject = projects?.find(p => p.id === selectedProjectId);

  if (isLoading) {
    return (
      <Card className="bg-slate-900 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <BookOpen className="w-5 h-5 text-purple-400" />
            Project & Mode Template
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <BookOpen className="w-5 h-5 text-purple-400" />
          Project & Mode Template
        </CardTitle>
        <CardDescription className="text-slate-400">
          Select a project to view its mode template
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
          <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
            <SelectValue placeholder="Select a project..." />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-600">
            {projects?.map(project => (
              <SelectItem 
                key={project.id} 
                value={project.id}
                className="text-white hover:bg-slate-700"
              >
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedProject && (
          <div className="space-y-3 p-3 rounded-lg bg-slate-800">
            <div>
              <span className="text-xs text-slate-500">Project</span>
              <p className="text-white font-medium">{selectedProject.name}</p>
            </div>
            
            {selectedProject.modeTemplate ? (
              <>
                <div>
                  <span className="text-xs text-slate-500">Mode Template</span>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                      {selectedProject.modeTemplate.name}
                    </Badge>
                  </div>
                </div>
                
                {selectedProject.modeTemplate.aiSystemPrompt && (
                  <div>
                    <span className="text-xs text-slate-500">AI System Prompt</span>
                    <ScrollArea className="h-24 mt-1">
                      <p className="text-xs text-slate-400 whitespace-pre-wrap">
                        {selectedProject.modeTemplate.aiSystemPrompt}
                      </p>
                    </ScrollArea>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2 text-slate-500">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">No mode template assigned</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// Generate Summary Card
// ============================================

function GenerateSummaryCard() {
  const { data: projects } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [result, setResult] = useState<string | null>(null);

  // Get work items for selected project to find branches
  const { data: branches } = useBranches(
    // We need a workItemId, so let's get branches differently
    // For now, let's simplify and just show a list
    ""
  );

  const summarizeBranch = useSummarizeBranch();
  const isLoading = summarizeBranch.isPending;

  const handleSummarize = async () => {
    if (!selectedBranchId) {
      toast.error("Please enter a branch ID");
      return;
    }

    setResult(null);

    try {
      const response = await summarizeBranch.mutateAsync({
        branchId: selectedBranchId,
        force: true,
      });

      setResult(JSON.stringify(response, null, 2));
      toast.success("Summary generated successfully!");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error("Failed to generate summary", { description: message });
      setResult(`Error: ${message}`);
    }
  };

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <GitBranch className="w-5 h-5 text-cyan-400" />
          Generate Branch Summary
        </CardTitle>
        <CardDescription className="text-slate-400">
          Manually trigger branch summarization
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm text-slate-400 block mb-2">Branch ID</label>
          <input
            type="text"
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            placeholder="Enter branch ID..."
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white placeholder:text-slate-500"
          />
          <p className="text-xs text-slate-500 mt-1">
            Get branch IDs from Prisma Studio: npm run db:studio
          </p>
        </div>

        <Button 
          onClick={handleSummarize}
          disabled={!selectedBranchId || isLoading}
          className="w-full bg-cyan-600 hover:bg-cyan-500"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Generate Summary Now
            </>
          )}
        </Button>

        {result && (
          <ScrollArea className="h-48 rounded-lg bg-slate-950 p-3">
            <pre className="text-xs text-slate-300 whitespace-pre-wrap">{result}</pre>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// Extract Work Card
// ============================================

function ExtractWorkCard() {
  const [branchId, setBranchId] = useState<string>("");
  const [userText, setUserText] = useState<string>(
    "We need to build a user authentication system. It should support OAuth with Google and GitHub, email/password login, and password reset functionality. Also there's a bug where the login button doesn't work on mobile Safari."
  );
  const [result, setResult] = useState<string | null>(null);

  const extractWork = useExtractWork();
  const isLoading = extractWork.isPending;

  const handleExtract = async () => {
    if (!branchId) {
      toast.error("Please enter a branch ID");
      return;
    }

    if (!userText.trim()) {
      toast.error("Please enter some text to analyze");
      return;
    }

    setResult(null);

    try {
      const response = await extractWork.mutateAsync({
        branchId,
        userText,
        options: {
          includeContext: true,
          maxWorkItems: 10,
        },
      });

      setResult(JSON.stringify(response, null, 2));
      toast.success("Work items extracted successfully!", {
        description: `Found ${response.data.workItemsToCreate.length} work items`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error("Failed to extract work", { description: message });
      setResult(`Error: ${message}`);
    }
  };

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Zap className="w-5 h-5 text-amber-400" />
          Extract Work Items
        </CardTitle>
        <CardDescription className="text-slate-400">
          Test the extract-work AI endpoint
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm text-slate-400 block mb-2">Branch ID</label>
          <input
            type="text"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            placeholder="Enter branch ID..."
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white placeholder:text-slate-500"
          />
        </div>

        <div>
          <label className="text-sm text-slate-400 block mb-2">User Text</label>
          <Textarea
            value={userText}
            onChange={(e) => setUserText(e.target.value)}
            placeholder="Enter text to extract work items from..."
            className="min-h-[100px] bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
          />
        </div>

        <Button 
          onClick={handleExtract}
          disabled={!branchId || !userText.trim() || isLoading}
          className="w-full bg-amber-600 hover:bg-amber-500"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Extracting...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Run Extract Work
            </>
          )}
        </Button>

        {result && (
          <ScrollArea className="h-64 rounded-lg bg-slate-950 p-3">
            <pre className="text-xs text-slate-300 whitespace-pre-wrap">{result}</pre>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// Main Page
// ============================================

export default function DevPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-indigo-400" />
            <div>
              <h1 className="text-xl font-bold">Dev Panel</h1>
              <p className="text-sm text-slate-400">Manual verification & testing tools</p>
            </div>
            <Badge className="ml-auto bg-amber-500/20 text-amber-400 border-amber-500/30">
              Development Only
            </Badge>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            <ProviderStatusCard />
            <ProjectTemplateCard />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <GenerateSummaryCard />
            <ExtractWorkCard />
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-8 p-4 rounded-lg bg-slate-900 border border-slate-700">
          <h2 className="text-lg font-semibold mb-3">Quick Links</h2>
          <div className="flex flex-wrap gap-3">
            <a 
              href="/dashboard" 
              className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
            >
              Dashboard
            </a>
            <a 
              href="http://localhost:5555" 
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
            >
              Prisma Studio
            </a>
            <a 
              href="/api/trpc" 
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
            >
              tRPC Playground
            </a>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/30">
          <h3 className="font-semibold text-indigo-300 mb-2">How to use this panel</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-indigo-200/80">
            <li>Run <code className="px-1 py-0.5 rounded bg-indigo-500/20">npm run db:seed</code> to create demo data</li>
            <li>Run <code className="px-1 py-0.5 rounded bg-indigo-500/20">npm run db:studio</code> to get branch IDs</li>
            <li>Copy a branch ID and paste it in the forms above</li>
            <li>Test the AI features using the buttons</li>
          </ol>
        </div>
      </main>
    </div>
  );
}

