# AI 调试提示词：MDX + Mermaid 渲染问题

## 🤖 给 AI 助手的指令

你好！我需要你帮助解决一个 React + MDX + Mermaid 项目中的渲染问题。**请务必使用 Chrome DevTools MCP 工具进行实际的浏览器调试**。

## 🔧 MCP 工具使用指南

你有访问 Chrome DevTools MCP 工具的权限，请按以下步骤进行调试：

### 1. 启动浏览器调试

```javascript
// 打开问题页面
mcp_chrome_devtools_new_page("http://localhost:5174/mdx/test-clean");

// 或者打开完整展示页面
mcp_chrome_devtools_new_page("http://localhost:5174/mdx/showcase");
```

### 2. 获取页面信息

```javascript
// 获取页面 DOM 结构快照
mcp_chrome_devtools_take_snapshot();

// 获取控制台错误信息
mcp_chrome_devtools_list_console_messages();

// 检查网络请求
mcp_chrome_devtools_list_network_requests();
```

### 3. 分析具体元素

```javascript
// 如果需要检查特定元素，使用 uid
mcp_chrome_devtools_click("element-uid-here");

// 获取元素详细信息
mcp_chrome_devtools_evaluate_script(
  "() => { return document.querySelector('.mermaid-chart'); }",
);
```

## 🚨 核心问题

### 主要错误信息：

```
In HTML, <p> cannot be a descendant of <p>.
In HTML, <div> cannot be a descendant of <p>.
[React Flow]: It looks like you've created a new nodeTypes or edgeTypes object.
Mermaid rendering error: No diagram type detected
```

### 问题表现：

1. **HTML 嵌套错误**：MDX 组件生成了非法的 HTML 嵌套结构
2. **Mermaid 不渲染**：流程图代码块无法正确转换为图表
3. **React Flow 警告**：性能警告，组件重复创建对象

## 📁 关键文件位置

- **MDX 组件配置**: `frontend/src/components/mdx/mdx-components.tsx`
- **清理版本**: `frontend/src/components/mdx/mdx-components-clean.tsx`
- **Mermaid 组件**: `frontend/src/components/mdx/MermaidChart.tsx`
- **代码块组件**: `frontend/src/components/mdx/CodeBlock.tsx`
- **测试页面**: `frontend/src/pages/mdx/MDXTestClean.tsx`
- **Vite 配置**: `frontend/vite.config.ts`

## 🎯 调试重点

### 1. 使用 MCP 工具检查 DOM 结构

重点关注：

- `<p>` 标签的嵌套情况
- MDX 组件渲染后的实际 HTML 结构
- Mermaid 图表容器的状态

### 2. 分析控制台错误

使用 MCP 工具获取详细的错误信息：

- React 渲染警告
- Mermaid 初始化错误
- 任何 JavaScript 运行时错误

### 3. 检查 Mermaid 代码提取

验证：

- CodeBlock 组件是否正确识别 `language="mermaid"`
- 代码内容是否正确传递给 MermaidChart 组件
- Mermaid 库是否正确加载

## 🔍 具体调试步骤

### 步骤 1：页面加载检查

```javascript
// 1. 打开测试页面
mcp_chrome_devtools_new_page("http://localhost:5174/mdx/test-clean");

// 2. 等待页面加载完成
mcp_chrome_devtools_wait_for("Mermaid 图表");

// 3. 获取页面快照
mcp_chrome_devtools_take_snapshot();
```

### 步骤 2：错误分析

```javascript
// 获取所有控制台消息
mcp_chrome_devtools_list_console_messages();

// 检查是否有 Mermaid 相关错误
mcp_chrome_devtools_evaluate_script(`
() => {
  const errors = [];
  const mermaidElements = document.querySelectorAll('.mermaid-chart');
  mermaidElements.forEach((el, i) => {
    errors.push({
      index: i,
      innerHTML: el.innerHTML,
      hasError: el.innerHTML.includes('图表渲染错误')
    });
  });
  return errors;
}
`);
```

### 步骤 3：DOM 结构验证

```javascript
// 检查 p 标签嵌套问题
mcp_chrome_devtools_evaluate_script(`
() => {
  const nestedPs = [];
  document.querySelectorAll('p p').forEach(el => {
    nestedPs.push({
      outerHTML: el.outerHTML,
      parentTag: el.parentElement.tagName
    });
  });
  return nestedPs;
}
`);
```

## 💡 预期解决方案

基于你的调试结果，可能需要：

1. **重构 MDX 组件映射**：避免 `<p>` 标签嵌套
2. **修复 Mermaid 集成**：确保代码正确提取和渲染
3. **优化 React Flow**：移除重复对象创建
4. **调整 MDX 配置**：可能需要修改 rehype 插件

## 📋 期望输出

请提供：

1. **详细的 DOM 结构分析**（通过 MCP 工具获取）
2. **具体的错误信息**（控制台消息）
3. **Mermaid 渲染状态**（是否正确初始化）
4. **修复建议**（基于实际调试结果）

---

**重要提醒**：请务必使用 Chrome DevTools MCP 工具进行实际的浏览器调试，而不是仅基于代码分析。这将提供最准确的问题诊断和解决方案。
