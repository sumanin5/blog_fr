// frontend/src/routes/admin.tsx
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin")({
  // 1. 在这里做拦截，拿到 AuthContext 里的状态
  beforeLoad: ({ context, location }) => {
    // context.auth 就是 AuthProvider 提供的 value
    if (context.auth.isLoading) {
      // 如果还在加载用户信息，可以在这里先返回，TanStack 会等待渲染
      return;
    }

    if (!context.auth.isAuthenticated) {
      throw redirect({
        to: "/auth/login",
        search: { redirect: location.href },
      });
    }
  },

  component: AdminPage,
});

function AdminPage() {
  // 2. 这里已经确定是登录状态了，可以直接拿到用户信息
  const { auth } = Route.useRouteContext();

  return (
    <div className="container mx-auto py-10">
      <h1 className="mb-4 text-3xl font-bold">管理后台</h1>
      <p className="text-muted-foreground">欢迎回来，{auth.user?.name}！</p>
    </div>
  );
}
