"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import { AlertCircle, RefreshCcw, Home } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * Next.js 全局错误边界组件
 * 当路由段发生未捕获的错误时，Next.js 会自动显示此组件
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 自动将错误上报给 Sentry
    console.error("Global Error Boundary caught:", error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] w-full items-center justify-center p-4">
      <Card className="mx-auto max-w-md border-destructive/20 shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-6 w-6" />
            <CardTitle className="text-2xl font-bold italic tracking-tight">
              Oops! 出错了
            </CardTitle>
          </div>
          <CardDescription className="text-base">
            抱歉，网页在运行过程中发生了一个意外错误。
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-4">
          <Alert
            variant="destructive"
            className="bg-destructive/5 border-destructive/10"
          >
            <AlertTitle className="font-semibold text-sm uppercase tracking-wider opacity-70">
              错误详情
            </AlertTitle>
            <AlertDescription className="mt-2 font-mono text-xs break-all leading-relaxed">
              {error.message || "未知系统错误"}
              {error.digest && (
                <div className="mt-2 pt-2 border-t border-destructive/10 opacity-60">
                  Error ID:{" "}
                  <span className="select-all font-bold">{error.digest}</span>
                </div>
              )}
            </AlertDescription>
          </Alert>

          <p className="text-sm text-muted-foreground leading-relaxed">
            如果是持续出现此问题，请尝试刷新页面或联系管理员。我们会自动记录该问题以便后续优化。
          </p>
        </CardContent>

        <CardFooter className="flex flex-col gap-2 sm:flex-row">
          <Button
            onClick={() => reset()}
            className="w-full sm:flex-1 gap-2 border-none bg-gradient-to-r from-destructive to-orange-600 hover:from-destructive/90 hover:to-orange-600/90 transition-all font-medium transition-transform active:scale-95"
          >
            <RefreshCcw className="h-4 w-4" />
            重试一次
          </Button>
          <Button
            asChild
            variant="outline"
            className="w-full sm:flex-1 gap-2 hover:bg-muted transition-all font-medium transition-transform active:scale-95"
          >
            <Link href="/">
              <Home className="h-4 w-4" />
              返回首页
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
