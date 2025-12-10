import { Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/common";
import Dashboard from "@/pages/dashboard/Dashboard";

/**
 * 仪表盘模块路由
 * 路径：/dashboard（需要登录）
 */
export const dashboardRoutes = (
  <Route
    index
    element={
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    }
  />
);
