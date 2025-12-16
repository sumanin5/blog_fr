/**
 * 🌊 React Flow 图表组件
 *
 * 用于创建交互式的流程图和节点-边图表。React Flow 是一个强大的图表库，
 * 支持拖拽、缩放、连线等交互功能。
 *
 * 关键特性:
 * - 交互式节点和边的编辑
 * - 内置控制面板和小地图
 * - 自动布局和手动调整
 * - 自定义节点和边类型
 * - 警告过滤机制避免噪音日志
 */
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

// 组件属性接口：定义传入的节点、边和样式
interface ReactFlowChartProps {
  nodes: Node[]; // 图表中的节点数组
  edges: Edge[]; // 连接节点的边数组
  className?: string; // 可选的CSS类名
}

/* ========== 🛠️ 警告抑制机制 ========== */
// React Flow 在严格模式下会对每次渲染创建新的 nodeTypes/edgeTypes 对象发出警告
// 这是一个已知的误报问题，因为我们使用的是空对象且不需要自定义类型
// 通过重写 console.warn 来过滤这些特定的噪音警告
const originalWarn = console.warn;
console.warn = (...args) => {
  // 检查警告消息是否为 React Flow 的 nodeTypes/edgeTypes 警告
  if (
    typeof args[0] === "string" &&
    args[0].includes(
      "[React Flow]: It looks like you've created a new nodeTypes or edgeTypes object.",
    )
  ) {
    // 如果是，则忽略这个警告（直接返回，不调用原始的 console.warn）
    return;
  }
  // 其他警告正常显示
  originalWarn(...args);
};

/* ========== 🔒 稳定引用对象 ========== */
// 使用 Object.freeze 创建不可变的空对象，确保引用稳定性
// 这样可以避免 React 每次重新渲染时都认为是新对象
const nodeTypes = Object.freeze({}); // 节点类型定义（空对象表示使用默认类型）
const edgeTypes = Object.freeze({}); // 边类型定义（空对象表示使用默认类型）

export function ReactFlowChart({
  nodes,
  edges,
  className,
}: ReactFlowChartProps) {
  /* ========== 📊 状态管理 ========== */
  // useNodesState: React Flow 提供的 Hook，管理节点状态
  // 返回值: [当前节点, 设置节点函数, 节点变化回调]
  // 这里我们不需要手动设置节点，所以用 _ 占位符忽略第二个参数
  const [flowNodes, , onNodesChange] = useNodesState(nodes);

  // useEdgesState: 管理边（连线）的状态
  // setEdges 用于添加新连线，onEdgesChange 处理边的变化（删除、移动等）
  const [flowEdges, setEdges, onEdgesChange] = useEdgesState(edges);

  /* ========== 🔗 连线处理 ========== */
  // 当用户在两个节点间创建连线时触发的回调函数
  // useCallback 确保函数引用稳定，避免不必要的重新渲染
  const onConnect = useCallback(
    (params: Connection) => {
      // addEdge 是 React Flow 提供的工具函数，用于向现有边数组添加新边
      // 使用函数式更新确保状态更新的正确性
      setEdges((existingEdges) => addEdge(params, existingEdges));
    },
    [setEdges], // 依赖数组：只有 setEdges 改变时才重新创建函数
  );

  /* ========== 🎨 渲染层 ========== */
  return (
    // 外层容器：固定高度 384px，全宽，圆角边框
    <div className={`h-96 w-full rounded-lg border ${className || ""}`}>
      <ReactFlow
        // 核心数据绑定
        nodes={flowNodes} // 当前显示的节点
        edges={flowEdges} // 当前显示的边
        // 事件处理器
        onNodesChange={onNodesChange} // 节点变化时的回调（移动、删除等）
        onEdgesChange={onEdgesChange} // 边变化时的回调
        onConnect={onConnect} // 用户创建新连线时的回调
        // 类型定义（使用我们前面定义的稳定引用）
        nodeTypes={nodeTypes} // 自定义节点类型（这里为空，使用默认）
        edgeTypes={edgeTypes} // 自定义边类型（这里为空，使用默认）
        // 视图控制
        fitView // 自动调整视图以适应所有节点
        attributionPosition="bottom-left" // React Flow 品牌标识位置
      >
        {/* ========== 🎮 交互组件 ========== */}
        <Controls /> {/* 缩放和平移控制按钮 */}
        <MiniMap /> {/* 小地图，显示整体视图 */}
        {/* 背景网格：点状背景，间距12px，点大小1px */}
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
      </ReactFlow>
    </div>
  );
}
