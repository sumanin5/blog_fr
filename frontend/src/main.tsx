import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// 🎨 导入 Inter 字体（本地化，不依赖外网）
import "@fontsource/inter/300.css"; // Light
import "@fontsource/inter/400.css"; // Regular
import "@fontsource/inter/500.css"; // Medium
import "@fontsource/inter/600.css"; // Semi-bold
import "@fontsource/inter/700.css"; // Bold

import "./index.css";
import "./api/config"; // 初始化 API 客户端配置
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
