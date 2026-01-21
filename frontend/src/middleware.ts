// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default function middleware(request: NextRequest) {
  // 1. 获取 Cookie 中的 Token
  const token = request.cookies.get("access_token")?.value;

  // 2. 定义需要保护的路径
  const isAdminPage = request.nextUrl.pathname.startsWith("/admin");

  // 3. 如果是后台页面且没有 Token，直接重定向到登录页
  if (isAdminPage && !token) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// 限制中间件仅在特定路径下运行，提升性能
export const config = {
  matcher: ["/admin/:path*"],
};
