import * as React from "react";
import { Button as ShadcnButton } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { type VariantProps } from "class-variance-authority";
import { buttonVariants } from "@/shared/components/ui/button";

interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean;
    noTransition?: boolean;
}

/**
 * 🔧 扩展的 Button 组件
 *
 * 基于 shadcn Button 的二次封装，添加了额外功能：
 * - noTransition: 禁用所有过渡效果，适用于主题切换等场景
 */
export function Button({
    className,
    variant,
    size,
    asChild = false,
    noTransition = false,
    ...props
}: ButtonProps) {
    return (
        <ShadcnButton
            variant={variant}
            size={size}
            asChild={asChild}
            className={cn(
                // 如果需要禁用过渡，完全移除过渡效果
                noTransition && "transition-none",
                className
            )}
            {...props}
        />
    );
}
