// frontend/src/routes/_authenticated.tsx
import {
  createFileRoute,
  Outlet,
  useNavigate,
  useLocation,
} from "@tanstack/react-router";
import { useAuth } from "@/features/auth";
import { LoadingSpinner } from "@/shared/components/common/LoadingSpinner";
import { useEffect } from "react";

function AuthenticatedLayout() {
  const { isAuthenticated, isLoading } = useAuth(); // 直接用 hook 拿最新状态
  const navigate = useNavigate();
  const location = useLocation();

  // 统一的权限检查逻辑
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate({
        to: "/auth/login",
        search: { redirect: location.href },
      });
    }
  }, [isLoading, isAuthenticated, navigate, location.href]);

  // 加载中，显示加载动画
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // 只有确定登录了才渲染子页面
  if (isAuthenticated) {
    return <Outlet />;
  }

  // 未登录时，在跳转完成前什么都不显示
  return null;
}

export const Route = createFileRoute("/_authenticated")({
  // 暂时移除 beforeLoad，改由组件内部的 useEffect 处理，逻辑更可控
  component: AuthenticatedLayout,
});
