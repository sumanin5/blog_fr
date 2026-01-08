/**
 * 🔧 表单字段适配器 - 统一不同表单库的字段 API
 */
import type { ReactNode } from "react";
import {
    FormField as ShadcnFormField,
    FormItem,
    FormLabel,
    FormControl,
    FormMessage
} from "@/shared/components/ui/form";
import { Label } from "@/shared/components/ui/label";
import type { UseFormReturn, FieldValues, Path } from "react-hook-form";

interface UniversalFormFieldProps<T extends FieldValues = FieldValues> {
    // 通用属性
    name: string;
    label: string;
    children: ReactNode;
    error?: string;

    // react-hook-form 模式
    form?: UseFormReturn<T>;

    // 原生模式的额外属性
    htmlFor?: string;
    required?: boolean;
}

/**
 * 通用表单字段组件
 * 自动适配 react-hook-form 或原生表单模式
 */
export function UniversalFormField<T extends FieldValues = FieldValues>({
    name,
    label,
    children,
    error,
    form,
    htmlFor,
    required
}: UniversalFormFieldProps<T>) {
    // react-hook-form 模式
    if (form) {
        return (
            <ShadcnFormField
                control={form.control}
                name={name as Path<T>}
                render={() => (
                    <FormItem>
                        <FormLabel>{label}</FormLabel>
                        <FormControl>
                            {children}
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        );
    }

    // 原生表单模式
    return (
        <div className="space-y-2">
            <Label htmlFor={htmlFor || name} className={error ? "text-destructive" : ""}>
                {label}
                {required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {children}
            {error && (
                <p className="text-destructive text-sm">{error}</p>
            )}
        </div>
    );
}

// 使用示例：
//
// React 19 + 原生表单：
// <UniversalFormField name="username" label="用户名" error={state?.errors?.username?.[0]} required>
//   <Input name="username" />
// </UniversalFormField>
//
// react-hook-form：
// <UniversalFormField name="username" label="用户名" form={form}>
//   <Input {...form.register("username")} />
// </UniversalFormField>
