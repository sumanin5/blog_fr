import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Home from "@/pages/Home";
import About from "@/pages/About";
import Dashboard from "@/pages/Dashboard";
import Layout from "@/Layout";
function App() {
  return (
    // 1. 最外层必须包裹 BrowserRouter
    <BrowserRouter>
      <Routes>
        {/* 2. Route 决定了页面中间显示什么内容 */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
          <Route path="dashboard" element={<Dashboard />} />
        </Route>

        {/* 404 页面配置 */}
        <Route path="*" element={<div>404 Not Found</div>} />
        {/* 这里可以配置不需要 Layout 的页面，比如登录页 */}
        <Route path="/login" element={<div>登录页（没有侧边栏）</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
