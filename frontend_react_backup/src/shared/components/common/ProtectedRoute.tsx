// frontend/src/shared/components/common/ProtectedRoute.tsx
import { useAuth } from "@/features/auth";
import { useNavigate, useLocation } from "@tanstack/react-router"; // 换成这个
import { useEffect, type ReactNode } from "react";
import { LoadingSpinner } from "./LoadingSpinner";

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // 没登录就跳走
      navigate({
        to: "/auth/login",
        search: { redirect: location.href },
      });
    }
  }, [isLoading, isAuthenticated, navigate, location.href]);

  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return null; // 还没跳走前先不渲染内容

  return <>{children}</>;
}
