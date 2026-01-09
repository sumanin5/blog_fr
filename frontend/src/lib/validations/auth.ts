import { z } from "zod";

// 登录表单验证 Schema
export const loginSchema = z.object({
  username: z.string().min(1, "请输入账号").trim(),
  password: z.string().min(6, "密码至少6位").max(100, "密码不能超过100位"),
});

// 注册表单验证 Schema
export const registerSchema = z
  .object({
    username: z
      .string()
      .min(3, "用户名至少3位")
      .max(50, "用户名不能超过50位")
      .trim(),
    email: z.string().email("邮箱格式不正确").trim(),
    password: z.string().min(6, "密码至少6位").max(100, "密码不能超过100位"),
    confirmPassword: z.string().min(6, "确认密码至少6位"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "两次密码输入不一致",
    path: ["confirmPassword"],
  });

// 导出类型
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;

// 验证函数
export function validateLogin(data: unknown) {
  return loginSchema.safeParse(data);
}

export function validateRegister(data: unknown) {
  return registerSchema.safeParse(data);
}
