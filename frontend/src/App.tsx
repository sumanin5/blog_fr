import { ThemeProvider } from "@/features/theme";
import { AuthProvider, useAuth } from "@/features/auth";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";

import { routeTree } from "./routeTree.gen";

const router = createRouter({
  routeTree,
  context: {
    auth: undefined!,
    queryClient: undefined!,
  },
  defaultPreload: "intent",
  defaultPreloadStaleTime: 0,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function InnerApp() {
  const auth = useAuth();
  const queryClient = useQueryClient();

  // 将 auth 状态注入路由上下文，这样你就能在 beforeLoad 里用了
  return <RouterProvider router={router} context={{ auth, queryClient }} />;
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="my-blog-theme">
      <AuthProvider>
        <InnerApp />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
