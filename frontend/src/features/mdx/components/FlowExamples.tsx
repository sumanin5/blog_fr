import { ReactFlowChart } from "./ReactFlowChart";
import type { Node, Edge } from "reactflow";

// 简单流程图示例
const simpleFlowNodes: Node[] = [
  {
    id: "1",
    type: "input",
    data: { label: "开始" },
    position: { x: 250, y: 0 },
  },
  {
    id: "2",
    data: { label: "处理数据" },
    position: { x: 200, y: 100 },
  },
  {
    id: "3",
    data: { label: "验证结果" },
    position: { x: 200, y: 200 },
  },
  {
    id: "4",
    type: "output",
    data: { label: "结束" },
    position: { x: 250, y: 300 },
  },
];

const simpleFlowEdges: Edge[] = [
  { id: "e1-2", source: "1", target: "2", animated: true },
  { id: "e2-3", source: "2", target: "3" },
  { id: "e3-4", source: "3", target: "4", animated: true },
];

// 复杂系统架构示例
const systemArchNodes: Node[] = [
  {
    id: "frontend",
    data: { label: "前端应用\n(React)" },
    position: { x: 100, y: 50 },
    style: { backgroundColor: "#e1f5fe", border: "2px solid #0277bd" },
  },
  {
    id: "api-gateway",
    data: { label: "API 网关" },
    position: { x: 300, y: 50 },
    style: { backgroundColor: "#f3e5f5", border: "2px solid #7b1fa2" },
  },
  {
    id: "auth-service",
    data: { label: "认证服务" },
    position: { x: 200, y: 150 },
    style: { backgroundColor: "#fff3e0", border: "2px solid #f57c00" },
  },
  {
    id: "user-service",
    data: { label: "用户服务" },
    position: { x: 400, y: 150 },
    style: { backgroundColor: "#e8f5e8", border: "2px solid #388e3c" },
  },
  {
    id: "database",
    data: { label: "数据库\n(PostgreSQL)" },
    position: { x: 300, y: 250 },
    style: { backgroundColor: "#fce4ec", border: "2px solid #c2185b" },
  },
];

const systemArchEdges: Edge[] = [
  { id: "e1", source: "frontend", target: "api-gateway", label: "HTTP/HTTPS" },
  { id: "e2", source: "api-gateway", target: "auth-service", label: "认证" },
  {
    id: "e3",
    source: "api-gateway",
    target: "user-service",
    label: "业务逻辑",
  },
  { id: "e4", source: "auth-service", target: "database", label: "用户数据" },
  { id: "e5", source: "user-service", target: "database", label: "业务数据" },
];

export function SimpleFlowExample() {
  return (
    <div className="my-6">
      <h4 className="mb-4 text-lg font-semibold">简单流程图示例</h4>
      <ReactFlowChart nodes={simpleFlowNodes} edges={simpleFlowEdges} />
    </div>
  );
}

export function SystemArchExample() {
  return (
    <div className="my-6">
      <h4 className="mb-4 text-lg font-semibold">系统架构图示例</h4>
      <ReactFlowChart nodes={systemArchNodes} edges={systemArchEdges} />
    </div>
  );
}
