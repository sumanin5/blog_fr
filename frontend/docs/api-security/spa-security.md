# 服务端和客户端 spa 的对比

```mermaid
graph TB
subgraph "❌ 错误：纯 SPA"
Browser1[浏览器<br/>React/Vue]
Browser1 -.->|包含 API_SECRET| Bundle1[打包后的 JS]
Bundle1 -.->|任何人都能看到| Hacker1[黑客打开开发者工具<br/>找到密钥]

        style Browser1 fill:#f99,stroke:#333,stroke-width:2px
        style Hacker1 fill:#f99,stroke:#333,stroke-width:2px
    end

    subgraph "✅ 正确：Next.js Server Actions"
        Browser2[浏览器<br/>客户端组件]
        Browser2 -->|调用 Server Action| Server1[Next.js 服务器<br/>Server Component]
        Server1 -->|使用 API_SECRET 签名| API1[FastAPI 后端]

        Note1[密钥只在服务器<br/>永不发送到浏览器]

        style Server1 fill:#9f9,stroke:#333,stroke-width:2px
        style API1 fill:#9f9,stroke:#333,stroke-width:2px
    end

```

## nextjs 的流程

```mermaid
sequenceDiagram
    participant Browser as 浏览器
    participant NextServer as Next.js 服务器
    participant Backend as FastAPI 后端

    Browser->>NextServer: 调用 transferMoney()
    Note over NextServer: 使用 API_SECRET<br/>生成签名
    NextServer->>Backend: POST /transfer<br/>+ 签名
    Backend->>Backend: 验证签名
    Backend->>NextServer: 返回结果
    NextServer->>Browser: 返回结果

    Note over Browser: 密钥从未离开服务器
```

## 传统 spa+bff 层

```mermaid
graph LR
    Browser[浏览器<br/>React SPA] -->|普通 HTTP| BFF[BFF 服务器<br/>Node.js/Express]
    BFF -->|HMAC 签名| Backend[FastAPI 后端]

    Note1[密钥在 BFF 服务器]

    style BFF fill:#9f9,stroke:#333,stroke-width:2px
```

## 纯 spa+会话令牌

```mermaid
sequenceDiagram
    participant Browser as 浏览器
    participant Backend as 后端

    Browser->>Backend: POST /login<br/>用户名+密码
    Backend->>Backend: 验证用户
    Backend->>Browser: 返回 JWT Token

    Note over Browser: 存储 Token

    Browser->>Backend: POST /transfer<br/>Authorization: Bearer {token}
    Backend->>Backend: 验证 Token
    Backend->>Browser: 返回结果
```

## 传统 spa 的安全方案

```mermaid
graph TB
    SPA[传统 SPA<br/>React/Vue/Angular]

    SPA --> Choice{选择方案}

    Choice -->|方案 1| HMAC[HMAC 签名<br/>需要 BFF 层]
    Choice -->|方案 2| JWT[JWT Token<br/>不需要 BFF]
    Choice -->|方案 3| Session[Session Cookie<br/>不需要 BFF]

    HMAC --> BFF[BFF 服务器<br/>持有密钥]
    BFF --> Backend1[后端 API]

    JWT --> Backend2[后端 API<br/>验证 Token]
    Session --> Backend3[后端 API<br/>验证 Session]

    style HMAC fill:#ff9,stroke:#333,stroke-width:2px
    style JWT fill:#9f9,stroke:#333,stroke-width:2px
    style Session fill:#9f9,stroke:#333,stroke-width:2px
```

## 方案 1：HMAC + BFF（需要 BFF）

适用场景：服务器到服务器的通信

```mermaid
sequenceDiagram
    participant Browser as 浏览器
    participant BFF as BFF 服务器
    participant API as 后端 API

    Browser->>BFF: POST /transfer
    Note over BFF: 生成 HMAC 签名
    BFF->>API: POST /transfer<br/>+ 签名
    API->>API: 验证签名
    API->>BFF: 返回结果
    BFF->>Browser: 返回结果
```

## 方案 2：JWT Token（不需要 BFF）⭐ 推荐

适用场景：用户登录后的操作（大多数场景）

```mermaid
sequenceDiagram
    participant Browser as 浏览器
    participant API as 后端 API

    Note over Browser,API: 第 1 步：登录
    Browser->>API: POST /login<br/>用户名+密码
    API->>API: 验证用户
    API->>Browser: 返回 JWT Token

    Note over Browser,API: 第 2 步：后续请求
    Browser->>API: POST /transfer<br/>Authorization: Bearer {token}
    API->>API: 验证 Token
    API->>Browser: 返回结果
```

## 方案 3：Session Cookie（不需要 BFF）

适用场景：传统 Web 应用

```mermaid
sequenceDiagram
    participant Browser as 浏览器
    participant API as 后端 API

    Browser->>API: POST /login<br/>用户名+密码
    API->>API: 创建 Session
    API->>Browser: Set-Cookie: session_id=xxx

    Browser->>API: POST /transfer<br/>Cookie: session_id=xxx
    API->>API: 验证 Session
    API->>Browser: 返回结果
```

## 传统 SPA 的安全方案选择：

```mermaid
graph TD
    Start[传统 SPA] --> Q1{有用户登录?}

    Q1 -->|是| JWT[使用 JWT Token<br/>❌ 不需要 BFF]
    Q1 -->|否| Q2{需要调用第三方 API?}

    Q2 -->|是| BFF1[使用 BFF 层<br/>✅ 需要 BFF]
    Q2 -->|否| Public[考虑是否应该<br/>改为公开 API]

    JWT --> Simple[简单、标准、推荐]
    BFF1 --> Complex[复杂但必要]

    style JWT fill:#9f9,stroke:#333,stroke-width:2px
    style Simple fill:#9f9,stroke:#333,stroke-width:2px
```

## 🎯 安全需求分级

```mermaid
graph TB
    subgraph "Level 1: 基础安全"
        Blog[个人博客<br/>内容网站<br/>展示型网站]
        BlogSec[✅ HTTPS<br/>✅ 基础认证<br/>❌ 不需要 HMAC]
    end

    subgraph "Level 2: 中等安全"
        Social[社交平台<br/>电商网站<br/>SaaS 应用]
        SocialSec[✅ HTTPS<br/>✅ JWT Token<br/>✅ 速率限制<br/>⚠️ 可选 HMAC]
    end

    subgraph "Level 3: 高级安全"
        Finance[金融支付<br/>银行系统<br/>医疗系统]
        FinanceSec[✅ HTTPS<br/>✅ JWT Token<br/>✅ HMAC 签名<br/>✅ 防重放<br/>✅ 审计日志]
    end

    style Blog fill:#9f9,stroke:#333,stroke-width:2px
    style Finance fill:#f99,stroke:#333,stroke-width:2px
```

## 💡 你的博客项目应该用什么？

推荐方案：JWT Token

```mermaid
graph LR
    subgraph "公开访问"
        Read[查看文章<br/>查看列表<br/>搜索]
        ReadAuth[❌ 不需要认证]
    end

    subgraph "管理员操作"
        Admin[发布文章<br/>编辑文章<br/>删除文章]
        AdminAuth[✅ JWT Token]
    end

    subgraph "用户操作"
        User[评论<br/>点赞]
        UserAuth[✅ JWT Token]
    end

    style ReadAuth fill:#9f9,stroke:#333,stroke-width:2px
    style AdminAuth fill:#ff9,stroke:#333,stroke-width:2px
    style UserAuth fill:#ff9,stroke:#333,stroke-width:2px
```

## 如何选择

```mermaid
graph TD
    Start[你的项目类型] --> Blog{博客网站?}

    Blog -->|是| Simple[JWT Token<br/>足够了]
    Blog -->|否| Type{什么类型?}

    Type -->|电商/社交| Medium[JWT + 部分 HMAC]
    Type -->|金融/医疗| Full[完整 HMAC 方案]

    Simple --> Note1[✅ 简单<br/>✅ 够用<br/>✅ 易维护]
    Medium --> Note2[⚠️ 支付 API 用 HMAC<br/>✅ 其他用 JWT]
    Full --> Note3[✅ 所有 API 用 HMAC<br/>✅ 完整防护]

    style Simple fill:#9f9,stroke:#333,stroke-width:2px
    style Note1 fill:#9f9,stroke:#333,stroke-width:2px
```
