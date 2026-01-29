"""
分析模块 API 文档

包含流量统计、行为上报及管理员看板相关的接口文档。
"""

LOG_EVENT_DOC = """
记录新的分析事件（PageView 或自定义事件）。

## 功能描述
- 自动识别爬虫 (Bot Detection)。
- 自动解析 User-Agent 获取浏览器、操作系统及设备类型。
- 自动提取访客 IP 地址（如果 Payload 中未提供）。
- 如果用户已登录，自动关联用户 ID。

## 请求体说明
- `event_type`: 事件类型，如 `page_view`, `click` 等。
- `page_path`: 发生事件的页面路径。
- `referrer`: 来源页面 URL。
- `post_id`: (可选) 关联的文章 UUID。
- `visitor_id`: 访客唯一标识（通常存储在 LocalStorage）。
- `session_id`: 会话唯一标识。
- `payload`: 自定义 JSON 数据。

## 注意事项
- 这是一个公开接口，前端应在路由切换或关键交互时调用。
- 爬虫发起的请求会被内部标记，但在返回体中会体现识结果。
"""

STATS_OVERVIEW_DOC = """
获取全站流量概览数据。

## 权限
- 仅限 **超级管理员** 访问。

## 返回值说明
- `total_pv/uv`: 历史累计去重统计（排除爬虫）。
- `today_pv/uv`: 今日实时统计（排除爬虫）。
- `bot_percentage`: 全站流量中机器人/爬虫的占比。

## 错误码
- `401 Unauthorized`: 未登录。
- `403 Forbidden`: 权限不足。
"""

STATS_TREND_DOC = """
获取每日流量趋势折线图数据。

## 权限
- 仅限 **超级管理员** 访问。

## 查询参数
- `days`: 统计天数，支持 `7`, `15`, `30`, `90` 等（默认 7）。

## 返回值
返回一个按日期排序的数组，包含每日的 PV 和 UV。
"""


STATS_TOP_POSTS_DOC = """
获取文章阅读量排行榜。

## 权限
- 仅限 **超级管理员** 访问。

## 查询参数
- `limit`: 返回数量限制（默认 10）。

## 注意事项
- 该排行已自动排除爬虫流量，反映真实的读者偏好。
- 仅包含已关联 `post_id` 的事件。
"""

STATS_DASHBOARD_DOC = """
获取 TrafficPulse 仪表盘所需的聚合统计数据。

## 功能描述
一次性返回仪表盘所需的多个维度的统计数据，减少前端 API 调用次数。

## 包含数据模块
1. **核心 KPI**:
   - `totalVisits`: 总会话数 (Session Count)。
   - `realUserCount`: 独立访客数 (Unique Visitors)。
   - `uniqueIPs`: 独立 IP 数。
   - `crawlerCount`: 爬虫访问次数。
   - `botTrafficPercent`: 爬虫流量占比。
   - `avgSessionDuration`: 平均会话时长 (秒)。

2. **设备分布 (Device Stats)**:
   - 按 `Mobile`, `PC`, `Tablet`, `Other` 分类的占比数据，用于饼图展示。

3. **24小时流量趋势 (Hourly Traffic)**:
   - 最近 24 小时的每小时 PV/UV 趋势，用于面积图展示。

## 权限
- 仅限 **超级管理员** 访问。
"""

STATS_SESSIONS_DOC = """
获取用户会话列表（分页）。

## 功能描述
提供详细的用户访问链路列表，以 Session 为维度进行聚合。

## 聚合逻辑
如果同一个 `session_id` 有多条事件记录：
- `start_time`: 取第一条记录的时间。
- `last_active`: 取最后一条记录的时间。
- `duration`: 会话总时长累加。
- `page_count`: 该会话内的总 PV 数。
- `device_info`: 取最后一次记录的设备信息。

## 排序
默认按 `last_active` 降序排列（最近活跃的会话排在前面）。

## 权限
- 仅限 **超级管理员** 访问。
"""
