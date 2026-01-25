/**
 * 这是一个专门用于测试系统错误边界 (Error Boundary) 的页面
 * 访问此页面会主动抛出一个异常
 */
export default function TestErrorPage() {
  // 💣 只要该组件尝试渲染，就会触发崩溃
  throw new Error("来自测试路由的模拟崩溃：这是一次预期的系统错误测试。");

  // 这行代码永远不会执行，但为了满足 TS 返回值要求：
  return (
    <div className="p-8 text-center">
      <h1>如果你看到了这段文字，说明错误没有被正确抛出。</h1>
    </div>
  );
}
