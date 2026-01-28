# TrafficPulse Dashboard 集成计划

## 1. 目标

将 "TrafficPulse" 流量分析系统集成到现有的 `admin/dashboard` 中，作为超级管理员的“数据中台”核心视图。
利用现有的 `shadcn/ui` 组件库替换原始代码中的自定义 UI 组件，确保视觉风格一致性。

## 2. 核心任务分解

### Phase 1: 类型定义与数据层准备

- [ ] **定义类型**: 创建 `frontend/src/types/analytics.ts`
  - 核心接口: `UserSession`, `PageView`, `DeviceType`, `UserType`, `Location`, `ArticleStat`
- [ ] **Mock 数据适配**: 迁移用户提供的 `generateMockData` 到 `frontend/src/lib/mock/analytics.ts`
  - 确保数据结构与新的后端 API (`AnalyticsEventResponse`) 兼容，便于后续切换真数据。

### Phase 2: 组件迁移与 UI 重构 (TrafficPulse)

将 `dashboard/components` 下的组件迁移至 `frontend/src/components/admin/dashboard/traffic-pulse/`，并进行深度重构：

- [ ] **基础 UI 替换**:
  - `Card`, `CardHeader` -> `@/components/ui/card`
  - `Badge` -> `@/components/ui/badge` (需要适配 variant 样式: success/warning/danger)
  - `Button` -> `@/components/ui/button`
  - `table` (原生) -> `@/components/ui/table` (Table, TableHeader, TableRow, TableCell)

- [ ] **业务组件重构**:
  - [ ] `DashboardCharts.tsx` -> `TrafficOverviewCharts.tsx` (概览图表: 设备占比 + 流量趋势)
  - [ ] `SessionList.tsx` -> `RealTimeSessionTable.tsx` (实时访客列表 + 详情侧边栏)
  - [ ] `CrawlerAnalysis.tsx` -> `BotTrafficMonitor.tsx` (爬虫分析: 摘要 + 类型分布 + 抓取排行)
  - [ ] `UserAnalysis.tsx` -> `UserBehaviorAnalytics.tsx` (用户画像: 活跃度 + 地区 + 高价值用户)
  - [ ] `ArticleTable.tsx` -> `ContentPerformanceTable.tsx` (内容表现)

### Phase 3: 页面集成

- [ ] **仪表盘布局更新**: 修改 `frontend/src/app/(admin)/admin/dashboard/page.tsx`
  - 引入 `Tabs` 组件 (`@/components/ui/tabs`) 分割视图：
    - **Tab 1: 总览 (Overview)**: 包含 KPI 卡片 + `TrafficOverviewCharts` + `ContentPerformanceTable`
    - **Tab 2: 用户 (User)**: `UserBehaviorAnalytics` + `RealTimeSessionTable`
    - **Tab 3: 爬虫 (Bot)**: `BotTrafficMonitor`
  - 仅对 `superadmin` 显示完整视图。

### Phase 4: 真数据对接 (Future)

- [ ] 对接后端新的 `ip_address`, `duration`, `country` 等字段。
- [ ] 前端实现心跳机制 (`navigator.sendBeacon`) 上报 `duration`。
- [ ] 后端集成 GeoIP2 实现 IP -> 地理位置转换。

## 3. UI 组件映射表

| 原组件    | 目标组件 (shadcn/ui) | 备注                                                       |
| :-------- | :------------------- | :--------------------------------------------------------- |
| `Card`    | `Card`               | 需要拆分为 Card, CardHeader, CardTitle, CardContent        |
| `Badge`   | `Badge`              | 需增加 variant 的 className 映射 (green/red/neutral)       |
| `<table>` | `Table`              | 使用 TableHeader, TableBody, TableRow 获得更好的响应式支持 |
| `Button`  | `Button`             | 保持 variant 命名或适配                                    |

## 4. 执行顺序

1. 定义 Types & Mock Data
2. 迁移并重构 DashboardCharts & ArticleTable (Overview tab)
3. 迁移并重构 SessionList & UserAnalysis (User tab)
4. 迁移并重构 CrawlerAnalysis (Bot tab)
5. 组装 Dashboard Page
