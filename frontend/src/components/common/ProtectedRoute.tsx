import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { LoadingSpinner } from "./LoadingSpinner";

// 定义 Props 接口：这个组件接受什么参数？
// 这里只需要接受 children，也就是它包裹的子组件
interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * 🛡️ 受保护路由组件 (安检门)
 *
 * 作用：拦截未登录用户的访问请求。
 * 逻辑：
 * 1. 如果正在加载用户信息 -> 显示 Loading
 * 2. 如果未登录 -> 跳转到登录页
 * 3. 如果已登录 -> 渲染子组件 (children)
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  // 1. 从 AuthContext 获取认证状态
  const { isAuthenticated, isLoading } = useAuth();

  // 获取当前试图访问的路径，以便登录后跳回来 (可选优化)
  const location = useLocation();

  // 2. 处理加载状态
  // 当用户刷新页面时，AuthContext 需要一点时间去检查 LocalStorage 和后端
  // 这期间如果不显示 Loading，页面会闪烁或者误判为未登录
  if (isLoading) {
    return (
      <>
        <LoadingSpinner />
      </>
    );
  }

  // 3. 检查是否已登录
  if (!isAuthenticated) {
    // 如果没登录，使用 <Navigate /> 组件重定向到登录页
    // replace: true 表示替换当前历史记录，防止用户点击“后退”按钮回到这个受保护页面
    // state: 把当前路径传过去，登录成功后可以跳回来
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // 4. 如果已登录，放行！渲染子组件
  return <>{children}</>;
}
