"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider as NextThemesProvider } from "next-themes";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // 在服务端渲染时，通常需要设置一些默认的 staleTime
        // 避免在客户端立即重新获取数据
        staleTime: 60 * 1000,
      },
    },
  });
}

// 浏览器端的 QueryClient 实例，用于在客户端之间共享
let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === "undefined") {
    // 服务端：总是创建一个新的 QueryClient
    return makeQueryClient();
  } else {
    // 客户端：如果已有 QueryClient 则复用，避免重新创建时重置缓存
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  // 注意：在此处初始化 QueryClient，确保其在整个应用的生命周期内是单例
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <NextThemesProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        enableColorScheme
        disableTransitionOnChange
      >
        {children}
      </NextThemesProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
