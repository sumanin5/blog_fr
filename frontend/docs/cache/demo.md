## React + TanStack Query（客户端缓存）

```mermaid
sequenceDiagram
    participant U1 as 用户1浏览器
    participant U2 as 用户2浏览器
    participant U3 as 用户3浏览器
    participant API as 后端API
    participant DB as 数据库

    U1->>U1: 首次访问，无缓存
    U1->>API: GET /api/posts
    API->>DB: SELECT * FROM posts
    DB-->>API: 返回数据
    API-->>U1: JSON
    U1->>U1: TanStack Query 缓存（本地）

    U2->>U2: 首次访问，无缓存
    U2->>API: GET /api/posts ❌ 重复请求
    API->>DB: SELECT * FROM posts ❌ 重复查询
    DB-->>API: 返回数据
    API-->>U2: JSON
    U2->>U2: TanStack Query 缓存（本地）

    U3->>U3: 首次访问，无缓存
    U3->>API: GET /api/posts ❌ 重复请求
    API->>DB: SELECT * FROM posts ❌ 重复查询
    DB-->>API: 返回数据
    API-->>U3: JSON

    Note over DB: 3个用户 = 3次数据库查询<br/>每个用户的缓存是独立的
```

## Next.js（服务端缓存）

```mermaid
sequenceDiagram
    participant U1 as 用户1
    participant U2 as 用户2
    participant U3 as 用户3
    participant Next as Next.js服务器
    participant Cache as 服务端缓存
    participant DB as 数据库

    U1->>Next: 访问 /posts
    Next->>Cache: 检查缓存
    Cache-->>Next: 未命中
    Next->>DB: SELECT * FROM posts
    DB-->>Next: 返回数据
    Next->>Cache: 缓存结果（服务端）
    Next-->>U1: 返回 HTML

    U2->>Next: 访问 /posts
    Next->>Cache: 检查缓存
    Cache-->>Next: 命中 ✅
    Next-->>U2: 返回 HTML（不查数据库）

    U3->>Next: 访问 /posts
    Next->>Cache: 检查缓存
    Cache-->>Next: 命中 ✅
    Next-->>U3: 返回 HTML（不查数据库）

    Note over DB: 3个用户 = 1次数据库查询<br/>所有用户共享缓存
```

## revalidateTag() 的作用范围

答案：同时刷新数据缓存和全路由缓存

## revalidateTag("posts");

这一行会：

✅ 失效所有带 tags: ["posts"] 的数据缓存
✅ 失效依赖这些数据的全路由缓存
工作原理
缓存依赖关系

```mermaid
graph TB
    Tag[revalidateTag 'posts'] --> DataCache[数据缓存失效]
    DataCache --> RouteCache[全路由缓存失效]
    RouteCache --> Rerender[下次访问重新渲染]

    style Tag fill:#f99,stroke:#333,stroke-width:2px
    style DataCache fill:#fff4e1,stroke:#333,stroke-width:2px
    style RouteCache fill:#ffe1f5,stroke:#333,stroke-width:2px
```

## 用户访问流程

```mermaid
sequenceDiagram
    participant User as 用户
    participant Next as Next.js
    participant DataCache as 数据缓存
    participant RouteCache as 全路由缓存
    participant API as 后端API

    User->>Next: 访问 /posts
    Next->>RouteCache: 检查全路由缓存
    RouteCache-->>Next: 未命中（已失效）

    Next->>DataCache: 检查数据缓存
    DataCache-->>Next: 未命中（已失效）

    Next->>API: 请求数据
    API-->>Next: 返回新数据

    Next->>DataCache: 缓存新数据
    Next->>Next: 渲染页面
    Next->>RouteCache: 缓存新 HTML
    Next-->>User: 返回新页面
```

## 完整的缓存流程

```mermaid
graph TB
    subgraph "正常访问（99%的情况）"
        U1[用户访问] --> C1{检查缓存}
        C1 -->|命中| R1[返回缓存 1ms ⚡]
    end

    subgraph "发布新文章（1%的情况）"
        Admin[管理员] --> Git[Git Push]
        Git --> Sync[后端同步]
        Sync --> DB[更新数据库]
        DB --> Invalid[失效缓存]
        Invalid --> Next[Next.js]
        Next --> Clear[清除缓存]
    end

    subgraph "缓存失效后首次访问"
        U2[用户访问] --> C2{检查缓存}
        C2 -->|未命中| API[请求API]
        API --> Render[渲染页面]
        Render --> Cache[缓存结果]
        Cache --> R2[返回页面]
    end

    style R1 fill:#9f9,stroke:#333,stroke-width:2px
    style Clear fill:#f99,stroke:#333,stroke-width:2px
    style Cache fill:#9ff,stroke:#333,stroke-width:2px
```

## nextjs 的核心价值

```mermaid
graph TB
    Next[Next.js] --> SSR[服务端渲染]
    Next --> Cache[强大的缓存]
    Next --> SEO[SEO 友好]

    SSR --> Perf1[首屏快]
    Cache --> Perf2[性能极佳]
    SEO --> Perf3[搜索排名高]

    Perf1 --> Value[核心价值]
    Perf2 --> Value
    Perf3 --> Value

    style Cache fill:#f99,stroke:#333,stroke-width:3px
    style Value fill:#9f9,stroke:#333,stroke-width:2px
```

## nextjs 的学习曲线

```mermaid
graph LR
    subgraph "初级（1-2周）"
        A1[路由系统]
        A2[组件基础]
        A3[数据获取]
    end

    subgraph "中级（1-2个月）"
        B1[服务端组件]
        B2[客户端组件]
        B3[API 路由]
    end

    subgraph "高级（3-6个月）"
        C1[缓存机制 ⭐⭐⭐⭐⭐]
        C2[性能优化]
        C3[部署策略]
    end

    A1 --> A2 --> A3 --> B1 --> B2 --> B3 --> C1 --> C2 --> C3

    style C1 fill:#f99,stroke:#333,stroke-width:3px
```
