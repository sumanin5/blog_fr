"use server";

import { cookies } from "next/headers";

export async function verifyGatePassword(formData: FormData) {
  const password = formData.get("password") as string;
  const secret = process.env.AUTH_GATE_SECRET;

  if (!secret) {
    // 如果没有设置密码，默认允许或者禁止？
    // 根据用户描述，这是必要功能，所以如果没有设置变量，可能应该报错或通过。
    // 这里假设如果没有设置密码，就不阻拦（或者阻拦一切）。
    // 安全起见，如果未配置，可能无法通过。
    return { success: false, message: "系统配置错误：未设置门卫密码" };
  }

  if (password === secret) {
    // Set session cookie
    (await cookies()).set("auth_gate_pass", "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      // No maxAge -> Session cookie (browser close clears it)
    });
    return { success: true };
  }

  return { success: false, message: "验证失败" };
}
