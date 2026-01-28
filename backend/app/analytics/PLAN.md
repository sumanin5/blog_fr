# Analytics Module Implementation Plan

## 1. 核心战略与选型 (Strategy)

基于项目现状，我们采用 **部分自研 (Lightweight Self-hosted)** 方案。

- **存储层**: 直接复用 PostgreSQL。对于博客量级（预计 <100万行/年），利用 Postgres 强大的 JSONB 和索引能力足以处理。
- **前端层**: 使用 `Recharts` 进行组件化开发，完全集成进 Shadcn/ui 的设计风格。
- **优势**: 数据所有权完全掌控；可实现深度的业务数据关联（如：关联 `Post.category` 进行分类热度分析）；隐私友好（无需第三方 Cookie）。

## 2. 实施路线图 (Roadmap)

### 阶段一：数据采集优化 (Data Collection & Ingestion)

虽然目前已有 `POST /events` 接口，但需要增强其健壮性。

- [ ] **指纹识别**: 在前端生成或存储匿名的 `visitor_id` (存放在 localStorage)，用于区分 UV (独立访客)。
- [ ] **会话管理**: 定义 `session_id`，用于计算“单次访问时长”或“跳出率”。
- [ ] **前端 SDK**: 封装 `useAnalytics` hook，自动监听路由变化 (`usePathname`) 上报 PageView。

### 阶段二：后端聚合能力 (Backend Aggregation)

这是核心开发工作。所有统计接口**必须限制为超级管理员 (Superuser) 权限**。

#### 新增 API端点 (仅限管理员)

1.  `GET /analytics/stats/overview`
    - **权限**: `current_active_superuser`
    - **返回**: 今日 PV/UV，总文章阅读数，真实用户 vs 爬虫比例。
2.  `GET /analytics/stats/trend`
    - **参数**: `days` (可选值: 7, 15, 30)
    - **权限**: `current_active_superuser`
    - **功能**: 对真实用户进行按天聚合，返回流量趋势数组。
3.  `GET /analytics/stats/top-posts`
    - **权限**: `current_active_superuser`
    - **返回**: 阅读量最高的文章列表。

### 阶段三：可视化仪表盘 (Frontend Visualization)

在 `/admin/dashboard` 或专门的 `/admin/analytics` 页面实现。

- [ ] **安装依赖**: `pnpm add recharts`
- [ ] **组件开发**:
  - `AnalyticsDashboard`: 主容器。
  - `TrendChart`: 使用 Recharts `AreaChart` 展示流量趋势。
  - `StatsCards`: 展示关键指标的变化（如环比增长箭头）。
  - `TopContentTable`: 展示热门内容。

## 3. 数据结构回顾 (Current Schema)

当前模型 `AnalyticsEvent`:

```python
class AnalyticsEvent(Base):
    event_type: str  # page_view, click
    page_path: str   # /posts/python-intro
    session_id: str
    visitor_id: str
    user_id: UV
    payload: JSON    # { user_agent, ip, referrer, region }
```

**即刻开始的任务**:
优先完成 **阶段二 (后端聚合)**，因为这决定了前端能展示什么。

1.  定义聚合查询的 Schema (Response Models)。
2.  编写 CRUD 层的高级 SQL 查询 (使用 `func.count`, `group_by`, `date_trunc`).
3.  暴露 Router 接口并测试。
