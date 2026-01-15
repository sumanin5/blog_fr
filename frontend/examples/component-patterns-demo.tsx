/**
 * React 组件传递模式示例代码
 *
 * 这个文件包含了所有传递组件的方式的实际示例
 * 可以复制到项目中运行查看效果
 */

"use client";

import { useState, useEffect, ComponentType } from "react";

// ============================================
// 示例 1：直接调用 vs 插槽传递
// ============================================

// 子组件
function ExpensiveChild() {
  console.log("🔴 ExpensiveChild 渲染了！");
  return (
    <div className="p-4 bg-blue-100 rounded">
      我是一个昂贵的子组件（每次渲染都会打印日志）
    </div>
  );
}

// 方式 A：直接调用（性能差）
function DirectCallParent() {
  const [count, setCount] = useState(0);

  return (
    <div className="p-4 border rounded space-y-4">
      <h3 className="font-bold">方式 A：直接调用</h3>
      <button
        onClick={() => setCount(count + 1)}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        点击次数: {count}
      </button>
      <ExpensiveChild /> {/* ❌ 每次点击都会重新渲染 */}
      <p className="text-sm text-gray-600">
        打开控制台，每次点击按钮都会看到 "ExpensiveChild 渲染了！"
      </p>
    </div>
  );
}

// 方式 B：插槽传递（性能好）
function SlotParent({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0);

  return (
    <div className="p-4 border rounded space-y-4">
      <h3 className="font-bold">方式 B：插槽传递</h3>
      <button
        onClick={() => setCount(count + 1)}
        className="px-4 py-2 bg-green-500 text-white rounded"
      >
        点击次数: {count}
      </button>
      {children} {/* ✅ 不会重新渲染 */}
      <p className="text-sm text-gray-600">
        打开控制台，点击按钮不会看到 "ExpensiveChild 渲染了！"
      </p>
    </div>
  );
}

// 使用对比
export function Example1() {
  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">示例 1：直接调用 vs 插槽传递</h2>

      <DirectCallParent />

      <SlotParent>
        <ExpensiveChild />
      </SlotParent>
    </div>
  );
}

// ============================================
// 示例 2：具名插槽（Named Slots）
// ============================================

interface DashboardLayoutProps {
  header: React.ReactNode;
  sidebar: React.ReactNode;
  content: React.ReactNode;
  footer: React.ReactNode;
}

function DashboardLayout({
  header,
  sidebar,
  content,
  footer,
}: DashboardLayoutProps) {
  return (
    <div className="border rounded overflow-hidden">
      <header className="bg-gray-800 text-white p-4">{header}</header>
      <div className="flex">
        <aside className="w-64 bg-gray-100 p-4">{sidebar}</aside>
        <main className="flex-1 p-4">{content}</main>
      </div>
      <footer className="bg-gray-200 p-4">{footer}</footer>
    </div>
  );
}

export function Example2() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">示例 2：具名插槽</h2>
      <DashboardLayout
        header={<div className="font-bold">Dashboard Header</div>}
        sidebar={
          <nav className="space-y-2">
            <div>菜单 1</div>
            <div>菜单 2</div>
            <div>菜单 3</div>
          </nav>
        }
        content={
          <div>
            <h3 className="text-xl font-bold mb-4">主要内容区域</h3>
            <p>这里是页面的主要内容</p>
          </div>
        }
        footer={<div className="text-center text-sm">© 2024 My App</div>}
      />
    </div>
  );
}

// ============================================
// 示例 3：Render Props
// ============================================

interface DataFetcherProps {
  url: string;
  render: (data: any, loading: boolean, error: Error | null) => React.ReactNode;
}

function DataFetcher({ url, render }: DataFetcherProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });
  }, [url]);

  return <>{render(data, loading, error)}</>;
}

export function Example3() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">示例 3：Render Props</h2>
      <DataFetcher
        url="https://jsonplaceholder.typicode.com/users/1"
        render={(data, loading, error) => {
          if (loading) return <div className="text-blue-500">加载中...</div>;
          if (error)
            return <div className="text-red-500">错误: {error.message}</div>;
          return (
            <div className="p-4 bg-green-100 rounded">
              <h3 className="font-bold">{data?.name}</h3>
              <p>{data?.email}</p>
            </div>
          );
        }}
      />
    </div>
  );
}

// ============================================
// 示例 4：函数作为 Children
// ============================================

interface MouseTrackerProps {
  children: (position: { x: number; y: number }) => React.ReactNode;
}

function MouseTracker({ children }: MouseTrackerProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  return (
    <div
      className="h-64 border-2 border-dashed border-gray-300 rounded relative"
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setPosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }}
    >
      {children(position)}
    </div>
  );
}

export function Example4() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">示例 4：函数作为 Children</h2>
      <MouseTracker>
        {({ x, y }) => (
          <div
            className="absolute w-4 h-4 bg-red-500 rounded-full pointer-events-none"
            style={{
              left: x - 8,
              top: y - 8,
              transform: "translate(0, 0)",
            }}
          >
            <div className="absolute left-6 top-0 whitespace-nowrap text-sm">
              ({Math.round(x)}, {Math.round(y)})
            </div>
          </div>
        )}
      </MouseTracker>
      <p className="text-sm text-gray-600">在灰色区域移动鼠标查看效果</p>
    </div>
  );
}

// ============================================
// 示例 5：组件作为 Props
// ============================================

interface IconButtonProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
}

function IconButton({ icon: Icon, label, onClick }: IconButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </button>
  );
}

// 示例图标组件
function SaveIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
      />
    </svg>
  );
}

function DeleteIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}

export function Example5() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">示例 5：组件作为 Props</h2>
      <div className="flex gap-4">
        <IconButton
          icon={SaveIcon}
          label="保存"
          onClick={() => alert("保存成功！")}
        />
        <IconButton
          icon={DeleteIcon}
          label="删除"
          onClick={() => alert("确认删除？")}
        />
      </div>
    </div>
  );
}

// ============================================
// 示例 6：React.cloneElement
// ============================================

function Wrapper({ children }: { children: React.ReactElement }) {
  // 克隆子元素并注入额外的 props
  const clonedChild = React.cloneElement(children, {
    className: `${
      children.props.className || ""
    } border-2 border-purple-500 p-4 rounded`,
    "data-wrapped": "true",
  });

  return (
    <div className="space-y-2">
      <div className="text-sm text-gray-600">
        这个按钮被 Wrapper 注入了样式：
      </div>
      {clonedChild}
    </div>
  );
}

export function Example6() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">示例 6：React.cloneElement</h2>
      <Wrapper>
        <button className="bg-blue-500 text-white px-4 py-2">
          原始按钮（会被注入边框和内边距）
        </button>
      </Wrapper>
    </div>
  );
}

// ============================================
// 完整示例页面
// ============================================

export default function ComponentPatternsDemo() {
  return (
    <div className="max-w-4xl mx-auto p-8 space-y-12">
      <h1 className="text-4xl font-bold">React 组件传递模式示例</h1>

      <Example1 />
      <hr />

      <Example2 />
      <hr />

      <Example3 />
      <hr />

      <Example4 />
      <hr />

      <Example5 />
      <hr />

      <Example6 />
    </div>
  );
}
