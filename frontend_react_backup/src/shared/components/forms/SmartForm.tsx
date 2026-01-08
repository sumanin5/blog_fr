/**
 * 🧠 智能表单组件 - 配置驱动的表单生成器
 *
 * 这个组件通过配置自动生成表单，内部处理不同的表单模式
 */
import type { UseFormReturn, FieldValues } from "react-hook-form";
import { FormWrapper } from "./FormWrapper";
import { UniversalFormField } from "./FormField";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui-extended";

// 字段类型定义
type FieldType = "text" | "email" | "password" | "textarea";

interface FormFieldConfig {
    name: string;
    label: string;
    type: FieldType;
    placeholder?: string;
    required?: boolean;
    validation?: {
        minLength?: number;
        maxLength?: number;
        pattern?: RegExp;
    };
}

interface SmartFormProps<T extends FieldValues = FieldValues> {
    fields: FormFieldConfig[];
    submitLabel?: string;
    className?: string;

    // React 19 模式
    action?: (formData: FormData) => void | Promise<void>;
    errors?: Record<string, string[]>;
    isPending?: boolean;

    // react-hook-form 模式
    form?: UseFormReturn<T>;
    onSubmit?: (data: T) => void;
}

/**
 * 渲染表单字段
 */
function renderField(field: FormFieldConfig, error?: string) {
    const commonProps = {
        name: field.name,
        placeholder: field.placeholder,
        required: field.required,
        className: error ? "border-destructive" : "",
    };

    switch (field.type) {
        case "email":
            return <Input {...commonProps} type="email" />;
        case "password":
            return <Input {...commonProps} type="password" />;
        default:
            return <Input {...commonProps} type="text" />;
    }
}

/**
 * 智能表单组件
 * 根据配置自动生成表单，支持多种模式
 */
export function SmartForm<T extends FieldValues = FieldValues>({
    fields,
    submitLabel = "提交",
    className,
    action,
    errors,
    isPending,
    form,
    onSubmit
}: SmartFormProps<T>) {
    return (
        <FormWrapper
            action={action}
            form={form as UseFormReturn<FieldValues, unknown, FieldValues>}
            onSubmit={onSubmit as ((data: FieldValues) => void) | undefined}
            className={`space-y-4 ${className || ""}`}
        >
            {fields.map((field) => {
                const error = errors?.[field.name]?.[0];

                return (
                    <UniversalFormField
                        key={field.name}
                        name={field.name}
                        label={field.label}
                        error={error}
                        form={form as UseFormReturn<FieldValues> | undefined}
                        required={field.required}
                    >
                        {renderField(field, error)}
                    </UniversalFormField>
                );
            })}

            <Button
                type="submit"
                className="w-full"
                disabled={isPending}
            >
                {isPending ? "提交中..." : submitLabel}
            </Button>
        </FormWrapper>
    );
}

// 使用示例：
//
// const loginFields: FormFieldConfig[] = [
//   { name: "username", label: "用户名", type: "text", required: true },
//   { name: "password", label: "密码", type: "password", required: true, validation: { minLength: 6 } }
// ];
//
// React 19 模式：
// <SmartForm
//   fields={loginFields}
//   action={loginAction}
//   errors={state?.errors}
//   isPending={isPending}
//   submitLabel="登录"
// />
//
// react-hook-form 模式：
// <SmartForm
//   fields={loginFields}
//   form={form}
//   onSubmit={handleSubmit}
//   submitLabel="登录"
// />
