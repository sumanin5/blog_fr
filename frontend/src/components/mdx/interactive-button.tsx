"use client";

import { Button } from "@/components/ui/button";

/**
 * 交互式按钮组件
 *
 * 目的：为 MDX 文章提供支持事件处理的按钮组件
 *
 * 使用场景：
 *   - 服务端渲染的 MDX 中需要交互式按钮
 *   - 避免直接使用 <button onClick={...}> 导致的序列化错误
 *
 * 工作原理：
 *   1. 服务端渲染时：生成按钮的 HTML 结构和样式
 *   2. 客户端 Hydration：React 激活 onClick 等事件处理器
 *
 * @example
 * ```mdx
 * <InteractiveButton message="点击成功！">
 *   点击我
 * </InteractiveButton>
 * ```
 */

interface InteractiveButtonProps {
  children: React.ReactNode;
  message?: string;
  variant?:
    | "default"
    | "outline"
    | "ghost"
    | "destructive"
    | "secondary"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

export function InteractiveButton({
  children,
  message = "按钮被点击了！",
  variant = "default",
  size = "default",
}: InteractiveButtonProps) {
  const handleClick = () => {
    alert(message);
  };

  return (
    <Button onClick={handleClick} variant={variant} size={size}>
      {children}
    </Button>
  );
}
