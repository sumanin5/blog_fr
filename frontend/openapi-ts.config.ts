import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  // OpenAPI 规范文件路径
  input: "./openapi.json",

  // 生成代码的输出目录 - 更新到新的结构
  output: {
    path: "./src/shared/api/generated",
    format: "prettier", // 使用 prettier 格式化（如果已安装）
  },

  // 使用 fetch 客户端（内置）
  client: "@hey-api/client-fetch",

  // 插件配置
  plugins: [
    // 生成 TypeScript 类型
    "@hey-api/typescript",
    // 生成 SDK 服务类
    "@hey-api/sdk",
  ],
});
