# Next.js 缓存机制 - 背景介绍

## 为什么 Next.js 的缓存这么复杂？

这是 Next.js (App Router) 中**最难理解的部分**，也是无数开发者（包括资深架构师）在深夜里抓狂的原因：

> **"为什么我的数据更新了，页面还是旧的？！"**

## 核心矛盾

Next.js 的缓存系统设计得极其激进且复杂，因为它试图在两个目标之间寻找平衡：

```mermaid
graph LR
    A[极致性能] <--> B[数据新鲜度]

    A --> C[静态生成<br/>SSG]
    B --> D[服务端渲染<br/>SSR]

    style A fill:#9f9,stroke:#333,stroke-width:2px
    style B fill:#f99,stroke:#333,stroke-width:2px
```

### 极致性能 vs 数据新鲜度

| 目标           | 实现方式         | 优点             | 缺点             |
| -------------- | ---------------- | ---------------- | ---------------- |
| **极致性能**   | 静态生成 (SSG)   | 速度快，CDN 友好 | 数据可能过期     |
| **数据新鲜度** | 服务端渲染 (SSR) | 数据永远最新     | 每次请求都要计算 |

## Next.js 的解决方案：四层缓存

Next.js 设计了一个**四层缓存模型**，每一层都有不同的作用和生命周期：

```mermaid
graph TB
    subgraph 客户端
        L4[第4层: 路由器缓存<br/>Router Cache<br/>浏览器内存]
    end

    subgraph 服务端
        L1[第1层: 请求记忆<br/>Request Memoization<br/>请求生命周期]
        L2[第2层: 数据缓存<br/>Data Cache<br/>持久化]
        L3[第3层: 全路由缓存<br/>Full Route Cache<br/>持久化]
    end

    L4 -.用户跳转.-> L3
    L3 -.渲染页面.-> L2
    L2 -.获取数据.-> L1

    style L1 fill:#e1f5ff,stroke:#333,stroke-width:2px
    style L2 fill:#fff4e1,stroke:#333,stroke-width:2px
    style L3 fill:#ffe1f5,stroke:#333,stroke-width:2px
    style L4 fill:#f5e1ff,stroke:#333,stroke-width:2px
```

## 常见问题场景

### 场景 1：数据库更新了，但页面没变

```mermaid
sequenceDiagram
    participant Dev as 开发者
    participant DB as 数据库
    participant Cache as 缓存
    participant User as 用户

    Dev->>DB: 更新数据
    DB-->>Dev: ✅ 更新成功
    User->>Cache: 访问页面
    Cache-->>User: ❌ 返回旧数据

    Note over User: 为什么还是旧的？
```

**原因**：可能是第 2 层（数据缓存）或第 3 层（全路由缓存）在作祟。

---

### 场景 2：刷新页面正常，点后退按钮就不对

```mermaid
sequenceDiagram
    participant User as 用户
    participant Browser as 浏览器缓存
    participant Server as 服务器

    User->>Server: 访问列表页
    Server-->>Browser: 返回数据（缓存到内存）
    User->>Server: 进入详情页，修改数据
    Server-->>User: ✅ 修改成功
    User->>Browser: 点击后退
    Browser-->>User: ❌ 显示旧数据（从内存读取）

    Note over User: 为什么后退就不对？
```

**原因**：第 4 层（路由器缓存）在浏览器内存中缓存了旧数据。

---

### 场景 3：开发环境正常，生产环境就不对

```mermaid
graph TB
    Dev[开发环境<br/>npm run dev]
    Prod[生产环境<br/>npm run build]

    Dev --> DevOK[✅ 数据正常更新]
    Prod --> ProdBad[❌ 数据不更新]

    style DevOK fill:#9f9,stroke:#333,stroke-width:2px
    style ProdBad fill:#f99,stroke:#333,stroke-width:2px
```

**原因**：开发环境和生产环境的缓存策略不同，生产环境会启用第 3 层（全路由缓存）。

---

## 为什么要理解这四层？

```mermaid
graph LR
    A[理解四层缓存] --> B[知道数据存在哪]
    B --> C[知道何时失效]
    C --> D[知道如何控制]
    D --> E[完全掌控 Next.js]

    style A fill:#bbf,stroke:#333,stroke-width:2px
    style E fill:#9f9,stroke:#333,stroke-width:2px
```

### 掌握四层缓存后，你能做到：

1. ✅ **快速定位问题**：数据不更新？立刻知道是哪一层的问题
2. ✅ **精准控制缓存**：知道何时该缓存，何时不该缓存
3. ✅ **优化性能**：合理使用缓存，让应用飞起来
4. ✅ **避免踩坑**：不再被"数据不更新"困扰

---

## 四层缓存概览

| 层级        | 名称       | 位置       | 生命周期 | 主要作用           |
| ----------- | ---------- | ---------- | -------- | ------------------ |
| **第 1 层** | 请求记忆   | 服务端内存 | 单次请求 | 去重，避免重复请求 |
| **第 2 层** | 数据缓存   | 服务端文件 | 持久化   | 缓存 API 数据      |
| **第 3 层** | 全路由缓存 | 服务端文件 | 持久化   | 缓存渲染结果       |
| **第 4 层** | 路由器缓存 | 浏览器内存 | 会话期间 | 客户端导航优化     |

---

## 学习路径

```mermaid
graph LR
    Start[开始] --> L1[第1层: 请求记忆]
    L1 --> L2[第2层: 数据缓存]
    L2 --> L3[第3层: 全路由缓存]
    L3 --> L4[第4层: 路由器缓存]
    L4 --> Summary[总结与实战]

    style Start fill:#9f9,stroke:#333,stroke-width:2px
    style Summary fill:#f99,stroke:#333,stroke-width:2px
```

接下来，我们将逐层深入，彻底搞懂 Next.js 的缓存机制！

---

## 核心建议

在学习过程中，请记住：

1. **不要害怕**：缓存虽然复杂，但有规律可循
2. **逐层理解**：一次只关注一层，不要混淆
3. **动手实践**：看完每一层后，写代码验证
4. **查表排查**：遇到问题时，按四层顺序排查

让我们开始吧！
