import { Outlet, Link } from "react-router-dom";

export default function Layout() {
  return (
    <div className="flex h-screen">
      {/*左侧侧边栏 - 永远固定不动*/}
      <aside className="w-64 bg-slate-800 text-white p5">
        <div className="font-bold text-xl mb-10">我的应用</div>
        <nav className="flex flex-col gap-4">
          <Link to="/" className="text-blue-500">
            首页
          </Link>
          <Link to="/about" className="text-blue-500">
            关于
          </Link>
          <Link to="/dashboard" className="text-blue-500">
            仪表盘
          </Link>
        </nav>
      </aside>

      {/*右侧内容区域 - 可以根据路由变化而变化*/}
      <main className="flex-1 p-5">
        <Outlet />
      </main>
    </div>
  );
}
