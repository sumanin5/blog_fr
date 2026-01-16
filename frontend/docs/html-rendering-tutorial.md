# HTML 渲染教程

## 🎯 核心思想

将后端返回的 HTML 字符串转换为 React 组件树。

## 📚 第一课：基础概念

### 问题：为什么不能直接用 `dangerouslySetInnerHTML`？

```jsx
// ❌ 简单但不安全，且无法自定义
<div dangerouslySetInnerHTML={{ __html: htmlString }} />
```

**问题**：

1. 安全风险（XSS 攻击）
2. 无法自定义组件（代码块、Mermaid 图表等）
3. 无法添加交互功能

### 解决方案：解析 + 转换

```jsx
// ✅ 安全且可自定义
import parse from "html-react-parser";

parse(htmlString, {
  replace: (domNode) => {
    // 识别特殊元素，返回自定义组件
    if (domNode.name === "pre") {
      return <CodeBlock>...</CodeBlock>;
    }
  },
});
```

## 📊 第二课：解析流程

### 步骤 1：HTML 字符串 → DOM 树

```javascript
// 输入
const html = `
<article>
  <h1>标题</h1>
  <pre><code class="language-js">console.log('hello')</code></pre>
</article>
`;

// html-react-parser 解析后的 DOM 树
{
  type: 'tag',
  name: 'article',
  children: [
    {
      type: 'tag',
      name: 'h1',
      children: [{ type: 'text', data: '标题' }]
    },
    {
      type: 'tag',
      name: 'pre',
      children: [
        {
          type: 'tag',
          name: 'code',
          attribs: { class: 'language-js' },
          children: [{ type: 'text', data: "console.log('hello')" }]
        }
      ]
    }
  ]
}
```

### 步骤 2：遍历 DOM 树

```javascript
parse(html, {
  replace: (domNode) => {
    // 对每个节点调用这个函数
    console.log(domNode.name); // 'article', 'h1', 'pre', 'code'
  },
});
```

### 步骤 3：识别 + 转换

```javascript
parse(html, {
  replace: (domNode) => {
    // 识别代码块
    if (domNode.name === "pre") {
      // 提取数据
      const codeNode = domNode.children[0];
      const code = codeNode.children[0].data;
      const lang = codeNode.attribs.class.replace("language-", "");

      // 返回自定义组件
      return <CodeBlock code={code} language={lang} />;
    }

    // 识别标题
    if (domNode.name === "h1") {
      const text = domNode.children[0].data;
      return <h1 id={slugify(text)}>{text}</h1>;
    }
  },
});
```

## 🔍 第三课：实际案例分析

### 案例 1：简单的段落

```javascript
// 输入
const html = '<p>这是一段文字</p>';

// DOM 节点
{
  type: 'tag',
  name: 'p',
  children: [
    { type: 'text', data: '这是一段文字' }
  ]
}

// 处理
replace: (domNode) => {
  // 不需要特殊处理，返回 undefined
  // html-react-parser 会自动转换为 <p>这是一段文字</p>
}
```

### 案例 2：代码块

```javascript
// 输入
const html = '<pre><code class="language-js">const x = 1;</code></pre>';

// DOM 节点
{
  type: 'tag',
  name: 'pre',
  children: [
    {
      type: 'tag',
      name: 'code',
      attribs: { class: 'language-js' },
      children: [
        { type: 'text', data: 'const x = 1;' }
      ]
    }
  ]
}

// 处理
replace: (domNode) => {
  if (domNode.name === 'pre') {
    // 1. 找到 code 标签
    const codeNode = domNode.children.find(
      child => child.name === 'code'
    );

    // 2. 提取语言
    const lang = codeNode.attribs.class.replace('language-', '');

    // 3. 提取代码文本
    const code = codeNode.children[0].data;

    // 4. 返回自定义组件
    return <CodeBlock code={code} language={lang} />;
  }
}
```

### 案例 3：Mermaid 图表

```javascript
// 输入
const html = '<div class="mermaid">graph TD\n  A --> B</div>';

// DOM 节点
{
  type: 'tag',
  name: 'div',
  attribs: { class: 'mermaid' },
  children: [
    { type: 'text', data: 'graph TD\n  A --> B' }
  ]
}

// 处理
replace: (domNode) => {
  if (domNode.attribs?.class?.includes('mermaid')) {
    // 1. 提取 Mermaid 代码
    const code = domNode.children[0].data;

    // 2. 返回 Mermaid 组件
    return <MermaidDiagram code={code} />;
  }
}
```

### 案例 4：嵌套结构（标题）

```javascript
// 输入
const html = '<h1>我的<strong>标题</strong></h1>';

// DOM 节点
{
  type: 'tag',
  name: 'h1',
  children: [
    { type: 'text', data: '我的' },
    {
      type: 'tag',
      name: 'strong',
      children: [{ type: 'text', data: '标题' }]
    }
  ]
}

// 处理（需要递归提取文本）
replace: (domNode) => {
  if (domNode.name === 'h1') {
    // 递归提取所有文本
    let text = '';
    const extractText = (node) => {
      if (node.type === 'text') {
        text += node.data;
      } else if (node.children) {
        node.children.forEach(extractText);
      }
    };
    domNode.children.forEach(extractText);

    // 生成 ID
    const id = slugify(text); // "我的标题" → "wo-de-biao-ti"

    // 返回带 ID 的标题（保留原始 children）
    return (
      <h1 id={id}>
        {domToReact(domNode.children)}
      </h1>
    );
  }
}
```

## 🎨 第四课：核心模式

### 模式 1：基于标签名识别

```javascript
// 适用于：标准 HTML 标签
if (domNode.name === 'pre') { ... }
if (domNode.name === 'h1') { ... }
if (domNode.name === 'img') { ... }
```

### 模式 2：基于 class 识别

```javascript
// 适用于：特殊标记的元素
if (domNode.attribs?.class?.includes('mermaid')) { ... }
if (domNode.attribs?.class?.includes('math-inline')) { ... }
```

### 模式 3：基于 data 属性识别

```javascript
// 适用于：自定义组件
if (domNode.attribs?.['data-component'] === 'interactive-button') { ... }
```

## 🔧 第五课：数据提取技巧

### 技巧 1：提取简单文本

```javascript
// 单层文本
const text = domNode.children[0].data;
```

### 技巧 2：提取嵌套文本（递归）

```javascript
let text = "";
const extractText = (node) => {
  if (node.type === "text") {
    text += node.data;
  } else if (node.children) {
    node.children.forEach(extractText);
  }
};
domNode.children.forEach(extractText);
```

### 技巧 3：查找特定子节点

```javascript
// 查找 code 标签
const codeNode = domNode.children.find(
  (child) => child.type === "tag" && child.name === "code"
);
```

### 技巧 4：提取属性

```javascript
// 提取 class
const className = domNode.attribs?.class || "";

// 提取 id
const id = domNode.attribs?.id;

// 提取 data 属性
const componentType = domNode.attribs?.["data-component"];
```

### 技巧 5：保留原始 children

```javascript
import { domToReact } from "html-react-parser";

// 保留原始的 HTML 结构
return <h1 id={id}>{domToReact(domNode.children, options)}</h1>;
```

## 🎯 第六课：完整示例

让我们看一个完整的处理流程：

```javascript
import parse, { domToReact } from "html-react-parser";

const html = `
<article>
  <h1>我的博客</h1>
  <p>这是内容</p>
  <pre><code class="language-js">console.log('hello')</code></pre>
  <div class="mermaid">graph TD\n  A --> B</div>
</article>
`;

const result = parse(html, {
  replace: (domNode) => {
    // 1. 处理标题
    if (domNode.name === "h1") {
      const text = domNode.children[0].data;
      return <h1 id={slugify(text)}>{text}</h1>;
    }

    // 2. 处理代码块
    if (domNode.name === "pre") {
      const codeNode = domNode.children[0];
      const code = codeNode.children[0].data;
      const lang = codeNode.attribs.class.replace("language-", "");
      return <CodeBlock code={code} language={lang} />;
    }

    // 3. 处理 Mermaid
    if (domNode.attribs?.class?.includes("mermaid")) {
      const code = domNode.children[0].data;
      return <MermaidDiagram code={code} />;
    }

    // 4. 其他元素不处理，使用默认转换
  },
});

// 结果
<article>
  <h1 id="wo-de-bo-ke">我的博客</h1>
  <p>这是内容</p>
  <CodeBlock code="console.log('hello')" language="js" />
  <MermaidDiagram code="graph TD\n  A --> B" />
</article>;
```

## 💡 第七课：为什么这么复杂？

### 对比：MDX 渲染器

```jsx
// MDX：10 行代码
<MDXRemote source={mdx} components={...} />
// ↑ 编译器自动处理一切
```

### HTML 渲染器

```jsx
// HTML：200 行代码
parse(html, {
  replace: (domNode) => {
    // 手动识别
    // 手动提取
    // 手动转换
  },
});
// ↑ 必须手动处理一切
```

### 为什么？

| 步骤 | MDX     | HTML    |
| ---- | ------- | ------- |
| 解析 | ✅ 自动 | ❌ 手动 |
| 识别 | ✅ 自动 | ❌ 手动 |
| 提取 | ✅ 自动 | ❌ 手动 |
| 转换 | ✅ 自动 | ❌ 手动 |

**结论**：HTML 渲染器的复杂度是**必要的**，因为需要手动完成 MDX 编译器自动做的所有事情。

## 🎓 总结

### 核心思想

```
HTML 字符串 → 解析 → DOM 树 → 遍历 → 识别 → 转换 → React 组件
```

### 三个关键步骤

1. **识别**：判断这是什么元素（标签名、class、data 属性）
2. **提取**：从 DOM 节点中提取数据（文本、属性、子节点）
3. **转换**：返回对应的 React 组件

### 核心工具

- `html-react-parser`：解析 HTML 字符串
- `replace` 函数：遍历和转换节点
- `domToReact`：保留原始 HTML 结构

### 为什么复杂？

因为 HTML 是字符串，需要手动完成：

- 解析 DOM 树
- 识别特殊元素
- 提取嵌套数据
- 创建 React 组件

这是**必要的复杂度**，不是代码写得不好。

---

**下一步**：让我们深入看看实际代码中的每个处理器是如何工作的。
