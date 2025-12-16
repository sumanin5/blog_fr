import type { ReactNode } from "react";
import { QueryProvider } from "./QueryProvider";

interface AppProvidersProps {
    children: ReactNode;
}

/**
 * 应用级 Providers 组合
 *
 * 目前只包含 QueryProvider，其他 Provider（如 AuthProvider, ThemeProvider）
 * 已移至 App.tsx 中，因为它们需要与路由系统配合使用
 *
 * 这个组件主要用于未来可能需要的全局 Provider 扩展
 */
export const AppProviders = ({ children }: AppProvidersProps) => {
    return (
        <QueryProvider>
            {/* 未来可以在这里添加其他不依赖路由的全局 Provider */}
            {children}
        </QueryProvider>
    );
};
