/**
 * 🎯 表单封装层 - 统一处理不同的表单模式
 *
 * 这个组件解决了 shadcn Form 与 React 19 Server Actions 的兼容性问题
 * 通过封装层提供统一的 API，内部根据需要选择合适的实现
 */
import type { ReactNode } from "react";
import { Form as ShadcnForm } from "@/components/ui/form";
import type { UseFormReturn, FieldValues } from "react-hook-form";

interface FormWrapperProps {
    children: ReactNode;
    className?: string;
    // React 19 Server Actions 支持
    action?: (formData: FormData) => void | Promise<void>;
    // react-hook-form 支持
    form?: UseFormReturn<FieldValues, unknown, FieldValues>;
    onSubmit?: (data: FieldValues) => void;
}

/**
 * 智能表单包装器
 * - 如果提供了 action，使用原生 form + Server Actions
 * - 如果提供了 form，使用 shadcn Form + react-hook-form
 */
export function FormWrapper({
    children,
    className,
    action,
    form,
    onSubmit
}: FormWrapperProps) {
    // React 19 Server Actions 模式
    if (action) {
        return (
            <form action={action} className={className}>
                {children}
            </form>
        );
    }

    // react-hook-form 模式
    if (form && onSubmit) {
        return (
            <ShadcnForm {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className={className}>
                    {children}
                </form>
            </ShadcnForm>
        );
    }

    // 降级到普通 form
    return (
        <form className={className}>
            {children}
        </form>
    );
}

// 使用示例：
//
// React 19 模式：
// <FormWrapper action={serverAction}>
//   <Input name="username" />
//   <Button type="submit">提交</Button>
// </FormWrapper>
//
// react-hook-form 模式：
// <FormWrapper form={form} onSubmit={onSubmit}>
//   <FormField control={form.control} name="username" render={...} />
//   <Button type="submit">提交</Button>
// </FormWrapper>
