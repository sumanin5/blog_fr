import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "@/shared/lib/query-client";
import type { ReactNode } from "react";

interface QueryProviderProps {
    children: ReactNode;
}

/**
 * TanStack Query Provider 组件
 *
 * 提供全局的查询客户端和开发工具
 */
export const QueryProvider = ({ children }: QueryProviderProps) => {
    return (
        <QueryClientProvider client={queryClient}>
            {children}
            {/* 开发环境下显示 React Query DevTools */}
            {import.meta.env.DEV && (
                <ReactQueryDevtools initialIsOpen={false} />
            )}
        </QueryClientProvider>
    );
};
