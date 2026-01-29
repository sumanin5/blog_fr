/**
 * 这是一个专门用于测试系统错误边界 (Error Boundary) 的页面
 * 访问此页面会主动抛出一个异常
 */
export default function TestErrorPage() {
  // 💣 只要该组件尝试渲染，就会触发崩溃
  // 注释掉以允许生产环境构建通过。若要测试错误边界，请取消注释。
  // throw new Error("来自测试路由的模拟崩溃：这是一次预期的系统错误测试。");

  // 这行代码永远不会执行，但为了满足 TS 返回值要求：
  return (
    <div className="p-8 text-center pt-20">
      <h1 className="text-2xl font-bold">测试错误页面</h1>
      <p className="mt-4 text-muted-foreground">
        如果你看到了这段文字，说明 throw 已经被注释掉（为了通过构建）。
      </p>
      <p className="mt-2 text-sm">
        若要测试系统错误边界，请在 <code>src/app/test-error/page.tsx</code>{" "}
        中取消 throw 的注释。
      </p>
    </div>
  );
}
