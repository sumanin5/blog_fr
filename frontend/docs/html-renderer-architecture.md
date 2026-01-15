# HTML 渲染器架构说明

## 🎯 核心问题

**为什么 HTML 渲染器不能像 MDX 一样使用组件映射？**

## 📊 对比分析

### MDX 渲染器（简单）

```typescript
// 使用组件映射表
<MDXRemote
  source={mdx}
  components={{
    pre: CodeBlock,
    h1: Heading1,
    h2: Heading2,
    InteractiveButton: InteractiveButton,
  }}
/>
```

**特点**：

- ✅ 声明式映射
- ✅ 清晰易懂
- ✅ 易于扩展

### HTML 渲染器（原来的实现 - 复杂）

```typescript
// 使用单个回调函数
parse(html, {
  replace: (domNode) => {
    // 必须在一个函数里判断所有情况
    if (domNode.name === "pre") { return <CodeBlock>... }
    if (domNode.name === "h1") { return <Heading1>... }
    if (domNode.class?.includes("mermaid")) { return <Mermaid>... }
    // ... 200 行代码
  }
})
```

**问题**：

- ❌ 所有逻辑混在一起
- ❌ 难以维护
- ❌ 难以扩展

## 💡 改进方案：模拟组件映射

虽然 `html-react-parser` 的 API 不支持组件映射表，但我们可以**模拟**这种模式。

### 改进后的架构

```typescript
// 1. 定义组件处理器映射表（类似 MDX 的 components）
function createComponentHandlers(slugger, options) {
  return {
    pre: (domNode) => {
      // 代码块处理逻辑
      return <CodeBlock>...</CodeBlock>;
    },

    heading: (domNode) => {
      // 标题处理逻辑
      return <h1 id={...}>...</h1>;
    },
  };
}

// 2. 特殊元素处理器（基于 class 或 data 属性）
function handleSpecialElements(domNode) {
  if (domNode.class?.includes("mermaid")) {
    return <MermaidDiagram>...</MermaidDiagram>;
  }

  if (domNode.attribs["data-component"]) {
    return <InteractiveButton>...</InteractiveButton>;
  }
}

// 3. 主渲染函数（查找映射）
const options = {
  replace: (domNode) => {
    // 3.1 检查特殊元素
    const specialElement = handleSpecialElements(domNode);
    if (specialElement) return specialElement;

    // 3.2 检查标签名映射
    const handlers = createComponentHandlers(slugger, options);

    if (domNode.name === "pre") {
      return handlers.pre(domNode);
    }

    if (["h1", "h2", "h3", "h4", "h5", "h6"].includes(domNode.name)) {
      return handlers.heading(domNode);
    }
  }
};
```

## 🎨 架构对比

### 旧架构（单体函数）

```
replace(domNode) {
  ├─ if (自定义组件) { ... }
  ├─ if (Mermaid) { ... }
  ├─ if (代码块) { ... }
  ├─ if (数学公式) { ... }
  └─ if (标题) { ... }
}

问题：
- 所有逻辑混在一起
- 难以测试单个处理器
- 难以复用处理逻辑
```

### 新架构（分层处理）

```
replace(domNode) {
  ├─ handleSpecialElements(domNode)  ← 特殊元素层
  │   ├─ 自定义组件
  │   ├─ Mermaid
  │   └─ 数学公式
  │
  └─ componentHandlers[tagName]      ← 标签映射层
      ├─ pre → CodeBlock
      ├─ h1-h6 → Heading
      └─ 其他...

优点：
- 职责分离
- 易于测试
- 易于扩展
```

## 📦 两层处理机制

### 第一层：特殊元素处理器

**识别条件**：基于 `class` 或 `data-*` 属性

```typescript
function handleSpecialElements(domNode) {
  // 1. 自定义组件（data-component）
  if (domNode.attribs["data-component"] === "interactive-button") {
    return <InteractiveButton {...props} />;
  }

  // 2. Mermaid 图表（class="mermaid"）
  if (domNode.attribs.class?.includes("mermaid")) {
    return <MermaidDiagram code={...} />;
  }

  // 3. 数学公式（class="math-inline" 或 "math-block"）
  if (domNode.attribs.class?.includes("math")) {
    return <KatexMath latex={...} />;
  }
}
```

**为什么需要这一层？**

- 这些元素不能仅通过标签名识别
- 需要检查额外的属性

### 第二层：标签名映射

**识别条件**：基于标签名（`pre`, `h1`, `h2`, ...）

```typescript
const componentHandlers = {
  pre: (domNode) => <CodeBlock>...</CodeBlock>,
  heading: (domNode) => <h1 id={...}>...</h1>,
};

// 查找映射
if (domNode.name === "pre") {
  return componentHandlers.pre(domNode);
}

if (["h1", "h2", ...].includes(domNode.name)) {
  return componentHandlers.heading(domNode);
}
```

**为什么需要这一层？**

- 标准 HTML 标签的处理
- 类似 MDX 的组件映射

## 🔄 处理流程

```
HTML 字符串
  ↓
html-react-parser 解析
  ↓
遍历 DOM 节点
  ↓
对于每个节点：
  ├─ 1. 检查特殊元素（class/data 属性）
  │   ├─ 是 → 返回对应组件
  │   └─ 否 → 继续
  │
  └─ 2. 检查标签名映射
      ├─ 有映射 → 调用处理器
      └─ 无映射 → 使用默认渲染
```

## 🎯 为什么这样改进？

### 1. 更清晰的职责分离

```typescript
// 旧代码：所有逻辑混在一起
replace: (domNode) => {
  if (domNode.attribs["data-component"]) { ... }
  if (domNode.class?.includes("mermaid")) { ... }
  if (domNode.name === "pre") { ... }
  if (domNode.name === "h1") { ... }
  // ... 200 行
}

// 新代码：分层处理
replace: (domNode) => {
  const special = handleSpecialElements(domNode);  // 特殊元素
  if (special) return special;

  const handler = componentHandlers[domNode.name];  // 标签映射
  if (handler) return handler(domNode);
}
```

### 2. 更容易扩展

```typescript
// 添加新的标签处理器
const componentHandlers = {
  pre: ...,
  heading: ...,

  // 新增：表格处理器
  table: (domNode) => <CustomTable>...</CustomTable>,

  // 新增：链接处理器
  a: (domNode) => <CustomLink>...</CustomLink>,
};
```

### 3. 更容易测试

```typescript
// 可以单独测试每个处理器
describe("componentHandlers.pre", () => {
  it("should render code block", () => {
    const domNode = createMockPreNode();
    const result = componentHandlers.pre(domNode);
    expect(result).toEqual(<CodeBlock>...</CodeBlock>);
  });
});
```

### 4. 更容易复用

```typescript
// 可以在其他地方复用处理器
import { createComponentHandlers } from "./html-renderer";

const handlers = createComponentHandlers(slugger, options);
const codeBlock = handlers.pre(domNode);
```

## 🤔 为什么不能完全像 MDX 一样？

### MDX 的优势

```typescript
// MDX 编译器知道所有元素的类型
<MDXRemote
  components={{
    pre: CodeBlock, // 编译器自动调用
  }}
/>
```

### HTML 解析器的限制

```typescript
// html-react-parser 只提供单个回调
parse(html, {
  replace: (domNode) => {
    // 必须手动判断和调用
  },
});
```

**根本原因**：

- MDX 编译器在编译时就知道元素类型
- HTML 解析器只能在运行时遍历 DOM 树

## 📊 性能对比

### 旧实现

```
每个节点：
  检查 data-component → 10 行代码
  检查 mermaid → 10 行代码
  检查 pre → 20 行代码
  检查 math → 15 行代码
  检查 h1-h6 → 30 行代码

总计：85 行代码在一个函数里
```

### 新实现

```
每个节点：
  调用 handleSpecialElements → 返回结果或 undefined
  查找 componentHandlers → 调用对应处理器

总计：分散到多个小函数，每个 10-20 行
```

**性能**：几乎相同（都是 O(n) 遍历）
**可维护性**：大幅提升

## ✅ 总结

### 问题

HTML 渲染器不能像 MDX 一样使用声明式的组件映射表。

### 原因

`html-react-parser` 的 API 限制（只提供单个回调函数）。

### 解决方案

模拟组件映射的模式：

1. 创建组件处理器映射表
2. 创建特殊元素处理器
3. 在回调函数中查找和调用对应的处理器

### 收益

- ✅ 更清晰的职责分离
- ✅ 更容易扩展
- ✅ 更容易测试
- ✅ 更容易维护
- ✅ 性能不变

### 对比

| 特性     | MDX 渲染器 | HTML 渲染器（旧） | HTML 渲染器（新） |
| -------- | ---------- | ----------------- | ----------------- |
| 组件映射 | ✅ 声明式  | ❌ 单体函数       | ✅ 模拟映射       |
| 职责分离 | ✅         | ❌                | ✅                |
| 易于扩展 | ✅         | ❌                | ✅                |
| 易于测试 | ✅         | ❌                | ✅                |
| 代码行数 | 10 行      | 200 行            | 150 行            |
| 可维护性 | ⭐⭐⭐⭐⭐ | ⭐⭐              | ⭐⭐⭐⭐          |

---

**结论**：虽然 HTML 渲染器不能完全像 MDX 一样使用组件映射，但通过架构改进，我们可以达到类似的效果，大幅提升代码的可维护性。
