# MDX 数学公式支持

## 配置步骤

### 1. 安装依赖

```bash
npm install remark-math rehype-katex katex
```

- `remark-math`：解析数学公式语法（`$...$` 和 `$$...$$`）
- `rehype-katex`：将数学公式渲染为 KaTeX
- `katex`：KaTeX 核心库和样式

### 2. 配置插件

```tsx
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css"; // 必须引入样式！

await evaluate(code, {
  remarkPlugins: [remarkMath],
  rehypePlugins: [rehypeKatex],
});
```

### 3. Vite 配置（静态 MDX 文件）

```ts
// vite.config.ts
import mdx from "@mdx-js/rollup";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

export default defineConfig({
  plugins: [
    mdx({
      remarkPlugins: [remarkMath],
      rehypePlugins: [rehypeKatex],
    }),
  ],
});
```

## 语法说明

### 行内公式

使用单个 `$` 包裹：

```mdx
质能方程：$E = mc^2$

勾股定理：$a^2 + b^2 = c^2$
```

渲染效果：质能方程：$E = mc^2$

### 块级公式

使用双 `$$` 包裹：

```mdx
$$
x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
$$
```

渲染效果：

$$
x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
$$

## 常用公式示例

### 基础运算

```latex
$a + b = c$           # 加法
$a - b = c$           # 减法
$a \times b = c$      # 乘法
$a \div b = c$        # 除法
$\frac{a}{b}$         # 分数
$a^2$                 # 上标
$a_n$                 # 下标
$\sqrt{x}$            # 平方根
$\sqrt[n]{x}$         # n次根
```

### 希腊字母

```latex
$\alpha, \beta, \gamma, \delta$
$\epsilon, \zeta, \eta, \theta$
$\pi, \sigma, \omega, \phi$
$\Gamma, \Delta, \Theta, \Omega$
```

### 数学符号

```latex
$\sum_{i=1}^{n} x_i$          # 求和
$\prod_{i=1}^{n} x_i$         # 求积
$\int_{a}^{b} f(x) dx$        # 积分
$\lim_{x \to \infty} f(x)$    # 极限
$\partial f / \partial x$     # 偏导数
$\nabla f$                    # 梯度
```

### 矩阵

```latex
$$
\begin{pmatrix}
a & b \\
c & d
\end{pmatrix}
$$

$$
\begin{bmatrix}
1 & 2 & 3 \\
4 & 5 & 6
\end{bmatrix}
$$
```

### 方程组

```latex
$$
\begin{cases}
x + y = 1 \\
x - y = 0
\end{cases}
$$
```

### 著名公式

```latex
# 欧拉恒等式
$$e^{i\pi} + 1 = 0$$

# 高斯积分
$$\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}$$

# 麦克斯韦方程
$$\nabla \cdot \mathbf{E} = \frac{\rho}{\varepsilon_0}$$
```

## 注意事项

### 1. JavaScript 字符串中的转义

在 JavaScript 模板字符串中写 LaTeX 公式时，反斜杠需要转义：

```tsx
// ❌ 错误：反斜杠被 JavaScript 转义
const mdx = `$\frac{1}{2}$`; // 实际变成 $rac{1}{2}$

// ✅ 方案1：双反斜杠
const mdx = `$\\frac{1}{2}$`;

// ✅ 方案2：使用 String.raw（推荐）
const mdx = String.raw`$\frac{1}{2}$`;
```

### 2. MDX 中的特殊字符

某些字符在 MDX 中有特殊含义，需要注意：

```mdx
<!-- ❌ 可能出问题 -->

$x < y$ <!-- < 可能被解析为 JSX -->

<!-- ✅ 使用 LaTeX 命令 -->

$x \lt y$ <!-- 使用 \lt 代替 < -->
$x \gt y$ <!-- 使用 \gt 代替 > -->
```

### 3. 块级公式的空行

块级公式前后需要空行：

```mdx
<!-- ❌ 可能出问题 -->

文字
$$x = 1$$
文字

<!-- ✅ 正确写法 -->

文字

$$x = 1$$

文字
```

### 4. 公式中的换行

在公式中换行使用 `\\`：

```latex
$$
\begin{aligned}
f(x) &= x^2 + 2x + 1 \\
     &= (x + 1)^2
\end{aligned}
$$
```

### 5. 样式未加载

如果公式显示为原始 LaTeX 代码，检查是否引入了 KaTeX 样式：

```tsx
import "katex/dist/katex.min.css"; // 必须引入！
```

## 替代方案：MathJax

如果 KaTeX 不满足需求，可以使用 MathJax：

```bash
npm install rehype-mathjax
```

```tsx
import rehypeMathjax from "rehype-mathjax";

await evaluate(code, {
  remarkPlugins: [remarkMath],
  rehypePlugins: [rehypeMathjax], // 替换 rehypeKatex
});
```

**KaTeX vs MathJax**：

| 特性       | KaTeX      | MathJax |
| ---------- | ---------- | ------- |
| 渲染速度   | 更快       | 较慢    |
| 包大小     | 较小       | 较大    |
| 功能完整性 | 基础够用   | 更完整  |
| 浏览器兼容 | 现代浏览器 | 更广泛  |
