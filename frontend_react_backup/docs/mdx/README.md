# MDX 功能文档

本目录包含了项目中 MDX 功能的完整文档。

## 📚 文档目录

1. **[MDX 介绍](./01-introduction.md)** - MDX 基础概念和优势
2. **[渲染和样式](./02-rendering-and-styling.md)** - 如何自定义 MDX 元素样式
3. **[编辑器组件](./03-editor-component.md)** - MDX 编辑器的使用方法
4. **[数学公式](./04-math-formulas.md)** - KaTeX 数学公式支持
5. **[导入和组件](./05-import-and-components.md)** - 在 MDX 中使用 React 组件
6. **[交互功能](./06-interactive-features.md)** - 交互式 MDX 内容
7. **[导入机制详解](./07-import-myth-explained.md)** - MDX 导入机制的深入解析
8. **[流程图和图表](./08-flowcharts-and-diagrams.md)** - 🆕 流程图支持文档

## 🎯 新增功能：流程图支持

### 支持的图表类型

#### 1. Mermaid 图表（静态）

- ✅ 流程图 (Flowchart)
- ✅ 时序图 (Sequence Diagram)
- ✅ 甘特图 (Gantt Chart)
- ✅ 类图 (Class Diagram)
- ✅ 状态图 (State Diagram)
- ✅ 饼图 (Pie Chart)
- ✅ Git 流程图 (Git Graph)
- ✅ 实体关系图 (ER Diagram)
- ✅ 用户旅程图 (User Journey)

#### 2. React Flow 图表（交互式）

- ✅ 可拖拽节点
- ✅ 可缩放画布
- ✅ 小地图导航
- ✅ 自定义节点样式
- ✅ 连接线动画

### 使用方法

#### Mermaid 图表

在 MDX 文件中使用 mermaid 代码块：

\`\`\`mermaid
graph TD
A[开始] --> B[处理]
B --> C[结束]
\`\`\`

#### React Flow 图表

在 MDX 文件中直接使用组件：

```mdx
<SimpleFlowExample />
<SystemArchExample />
```

## 🔧 技术实现

### 依赖包

- `mermaid`: Mermaid 图表渲染
- `reactflow`: React Flow 交互式图表
- `rehype-mermaid`: MDX 中的 Mermaid 支持（已移除，使用客户端渲染）

### 核心组件

- `MermaidChart.tsx`: Mermaid 图表组件
- `ReactFlowChart.tsx`: React Flow 图表组件
- `FlowExamples.tsx`: 预定义的流程图示例
- `CodeBlock.tsx`: 增强的代码块组件，支持 Mermaid 检测

### 配置文件

- `vite.config.ts`: Vite 构建配置
- `mdx-components.tsx`: MDX 组件映射

## 🎨 自定义主题

### Mermaid 主题

在 `MermaidChart.tsx` 中配置：

```tsx
themeVariables: {
  primaryColor: "#3b82f6",
  primaryTextColor: "#1f2937",
  // ...
}
```

### React Flow 主题

通过 CSS 变量自定义：

```css
.react-flow {
  --rf-node-bg: #ffffff;
  --rf-node-border: #e2e8f0;
}
```

## 📝 示例文件

查看 `frontend/src/content/mdx-showcase.mdx` 文件，其中包含了所有图表类型的完整示例。

## 🚀 扩展指南

### 添加新的图表类型

1. 安装相应的图表库
2. 创建新的组件文件
3. 在 `mdx-components.tsx` 中注册
4. 更新文档

### 自定义节点类型

对于 React Flow，可以创建自定义节点：

```tsx
const customNodeTypes = {
  customNode: YourCustomComponent,
};
```

## 🔍 故障排除

### 常见问题

1. **Mermaid 图表不显示**: 检查语法是否正确
2. **React Flow 样式问题**: 确保导入了 CSS 文件
3. **编译错误**: 检查类型导入是否正确

### 调试技巧

- 使用浏览器开发者工具查看控制台错误
- 检查 Mermaid 语法验证器
- 查看 React Flow 官方示例

## 📚 相关资源

- [Mermaid 官方文档](https://mermaid.js.org/)
- [React Flow 官方文档](https://reactflow.dev/)
- [MDX 官方文档](https://mdxjs.com/)
- [项目 MDX 使用指南](../setup/mdx-usage.md)
