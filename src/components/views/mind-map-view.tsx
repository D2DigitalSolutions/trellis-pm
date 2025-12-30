"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  useReactFlow,
  MiniMap,
  BackgroundVariant,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import { WorkItemNode, WorkItemNodeData } from "./WorkItemNode";
import { AddChildNodeModal } from "@/components/modals/add-child-node-modal";
import { Button } from "@/components/ui/button";
import { useWorkItems } from "@/lib/hooks";
import { Plus, Maximize2, Focus } from "lucide-react";
import { toast } from "sonner";
import dagre from "dagre";

interface MindMapViewProps {
  projectId: string;
  parentWorkItemId?: string | null;
  selectedWorkItemId?: string | null;
  onWorkItemSelect?: (workItemId: string) => void;
}

const nodeTypes = {
  workItem: WorkItemNode,
};

// Layout function using dagre for automatic tree layout
const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = "TB") => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  const nodeWidth = 250;
  const nodeHeight = 80;

  dagreGraph.setGraph({ 
    rankdir: direction,
    nodesep: 80,
    ranksep: 120,
    marginx: 50,
    marginy: 50,
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

export function MindMapView({ 
  projectId, 
  parentWorkItemId, 
  selectedWorkItemId,
  onWorkItemSelect 
}: MindMapViewProps) {
  const { data: workItems, isLoading } = useWorkItems(projectId, { includeDeleted: false });
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [addChildModalOpen, setAddChildModalOpen] = useState(false);
  const { fitView, setCenter } = useReactFlow();

  // Convert work items to nodes and edges
  useEffect(() => {
    if (!workItems) return;

    const newNodes: Node<WorkItemNodeData>[] = workItems.map((item) => ({
      id: item.id,
      type: "workItem",
      data: {
        title: item.title,
        type: item.type as any,
        status: item.status,
        isSelected: item.id === selectedWorkItemId,
      },
      position: { x: 0, y: 0 }, // Will be set by layout
    }));

    const newEdges: Edge[] = [];
    
    // Build edges from parent-child relationships
    workItems.forEach((item) => {
      const typedItem = item as any;
      if (typedItem.parentEdges && Array.isArray(typedItem.parentEdges)) {
        typedItem.parentEdges.forEach((edge: any) => {
          if (edge.edgeType === "PARENT_CHILD" && edge.parentId) {
            newEdges.push({
              id: edge.id,
              source: edge.parentId,
              target: item.id,
              type: "smoothstep",
              animated: false,
              style: { stroke: "#6366f1", strokeWidth: 2 },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: "#6366f1",
              },
            });
          }
        });
      }
    });

    // Apply automatic layout
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      newNodes,
      newEdges
    );

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);

    // Fit view after a short delay to allow rendering
    setTimeout(() => {
      fitView({ padding: 0.2, duration: 400 });
    }, 100);
  }, [workItems, selectedWorkItemId, setNodes, setEdges, fitView]);

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      onWorkItemSelect?.(node.id);
    },
    [onWorkItemSelect]
  );

  const handleZoomToFit = useCallback(() => {
    fitView({ padding: 0.2, duration: 400 });
  }, [fitView]);

  const handleCenterSelected = useCallback(() => {
    if (!selectedWorkItemId) {
      toast.info("No node selected");
      return;
    }

    const selectedNode = nodes.find((n) => n.id === selectedWorkItemId);
    if (selectedNode) {
      setCenter(
        selectedNode.position.x + 125, // Half of node width
        selectedNode.position.y + 40,  // Half of node height
        { zoom: 1, duration: 400 }
      );
    }
  }, [selectedWorkItemId, nodes, setCenter]);

  const handleAddChild = useCallback(() => {
    setAddChildModalOpen(true);
  }, []);

  const handleChildCreated = useCallback((workItemId: string) => {
    // The useWorkItems hook will refetch automatically
    toast.success("Node created and added to graph");
  }, []);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-950">
        <div className="text-slate-400">Loading mind map...</div>
      </div>
    );
  }

  if (!workItems || workItems.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-950 p-8">
        <div className="max-w-md text-center">
          <h3 className="text-xl font-semibold text-white mb-3">No Work Items Yet</h3>
          <p className="text-slate-400 mb-6">
            Create your first work item to see it visualized in the mind map.
          </p>
          <Button onClick={handleAddChild} className="gap-2">
            <Plus className="w-4 h-4" />
            Add First Node
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-slate-950 relative">
      {/* Mind Map Controls */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleZoomToFit}
          className="shadow-lg gap-2"
        >
          <Maximize2 className="w-4 h-4" />
          Zoom to Fit
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleCenterSelected}
          disabled={!selectedWorkItemId}
          className="shadow-lg gap-2"
        >
          <Focus className="w-4 h-4" />
          Center Selected
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={handleAddChild}
          className="shadow-lg gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Child Node
        </Button>
      </div>

      {/* React Flow Graph */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={1.5}
        defaultEdgeOptions={{
          type: "smoothstep",
          animated: false,
        }}
        className="bg-slate-950"
      >
        <Controls className="!bg-slate-800 !border-slate-700 [&>button]:!bg-slate-700 [&>button]:!border-slate-600 [&>button]:!text-white [&>button:hover]:!bg-slate-600" />
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={20} 
          size={1}
          className="!bg-slate-950"
          color="#334155"
        />
        <MiniMap 
          className="!bg-slate-800 !border-slate-700"
          maskColor="rgb(15, 23, 42, 0.7)"
          nodeColor={(node) => {
            const type = (node.data as WorkItemNodeData).type;
            const colors = {
              EPIC: "#a855f7",
              SPRINT: "#06b6d4",
              TASK: "#64748b",
              BUG: "#ef4444",
              IDEA: "#f59e0b",
            };
            return colors[type] || "#64748b";
          }}
        />
      </ReactFlow>

      {/* Add Child Modal */}
      <AddChildNodeModal
        open={addChildModalOpen}
        onOpenChange={setAddChildModalOpen}
        projectId={projectId}
        parentId={selectedWorkItemId || null}
        onSuccess={handleChildCreated}
      />
    </div>
  );
}
