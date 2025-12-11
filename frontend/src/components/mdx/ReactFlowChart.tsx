import { useCallback } from "react";
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
} from "reactflow";
import type { Node, Edge, Connection } from "reactflow";
import "reactflow/dist/style.css";

interface ReactFlowChartProps {
  nodes: Node[];
  edges: Edge[];
  className?: string;
}

// 全局过滤 React Flow 对 nodeTypes/edgeTypes 的噪音告警（严格模式下会误报）
const originalWarn = console.warn;
console.warn = (...args) => {
  if (
    typeof args[0] === "string" &&
    args[0].includes(
      "[React Flow]: It looks like you've created a new nodeTypes or edgeTypes object.",
    )
  ) {
    return;
  }
  originalWarn(...args);
};

// 固定空的 nodeTypes/edgeTypes，避免 React Flow 每次创建新对象产生警告
const nodeTypes = Object.freeze({});
const edgeTypes = Object.freeze({});

export function ReactFlowChart({
  nodes,
  edges,
  className,
}: ReactFlowChartProps) {
  const [flowNodes, , onNodesChange] = useNodesState(nodes);
  const [flowEdges, setEdges, onEdgesChange] = useEdgesState(edges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  return (
    <div className={`h-96 w-full rounded-lg border ${className || ""}`}>
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        attributionPosition="bottom-left"
      >
        <Controls />
        <MiniMap />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
      </ReactFlow>
    </div>
  );
}
