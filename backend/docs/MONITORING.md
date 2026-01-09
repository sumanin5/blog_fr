# 📊 APM 监控配置指南

本项目已集成多种 APM（应用性能监控）方案，可根据需求选择启用。

---

## 🎯 监控方案对比

| 方案              | 优点                         | 缺点         | 适用场景             |
| ----------------- | ---------------------------- | ------------ | -------------------- |
| **Sentry**        | 功能强大、易用、免费额度充足 | 第三方服务   | 生产环境推荐 ⭐      |
| **OpenTelemetry** | 开源标准、不绑定厂商         | 需要自建后端 | 大型企业、私有化部署 |
| **自定义监控**    | 轻量级、无依赖               | 功能简单     | 开发环境、快速调试   |

---

## 1️⃣ Sentry（推荐）

### 安装依赖

```bash
cd backend
uv add --group monitoring "sentry-sdk[fastapi]"
```

### 配置环境变量

在 `.env` 文件中添加：

```bash
# 注册 Sentry 账号: https://sentry.io
SENTRY_DSN=https://your-key@o123456.ingest.sentry.io/7654321
SENTRY_ENVIRONMENT=production  # 或 development
SENTRY_TRACES_SAMPLE_RATE=0.1  # 10% 采样率（生产环境推荐）
```

### 获取 Sentry DSN

1. 访问 [https://sentry.io](https://sentry.io) 注册账号（免费）
2. 创建新项目，选择 **Python + FastAPI**
3. 复制 DSN 到 `.env` 文件

### 功能特性

- ✅ 自动捕获未处理的异常
- ✅ API 性能追踪（慢请求告警）
- ✅ 数据库查询性能分析
- ✅ 用户上下文追踪
- ✅ 错误聚合和趋势分析
- ✅ 邮件/Slack 告警

### 免费额度

- 5,000 错误事件/月
- 10,000 性能事件/月
- 1 个项目
- 保留 30 天数据

---

## 2️⃣ OpenTelemetry（企业级）

### 安装依赖

```bash
cd backend
uv add --group monitoring \
  opentelemetry-api \
  opentelemetry-sdk \
  opentelemetry-instrumentation-fastapi \
  opentelemetry-instrumentation-sqlalchemy \
  opentelemetry-exporter-otlp
```

### 配置环境变量

```bash
ENABLE_OPENTELEMETRY=true
OTEL_EXPORTER_ENDPOINT=http://localhost:4317  # OTLP Collector 地址
```

### 启动 OTLP Collector（Docker）

```bash
# 使用 Jaeger 作为后端
docker run -d --name jaeger \
  -p 4317:4317 \
  -p 16686:16686 \
  jaegertracing/all-in-one:latest

# 访问 Jaeger UI: http://localhost:16686
```

### 功能特性

- ✅ 分布式追踪（跨服务调用链）
- ✅ 自定义指标导出
- ✅ 支持多种后端（Jaeger、Zipkin、Prometheus）
- ✅ 开源标准，不绑定厂商

---

## 3️⃣ 自定义性能监控（默认启用）

无需额外配置，项目启动时自动启用。

### 配置慢请求阈值

```bash
SLOW_REQUEST_THRESHOLD=1.0  # 超过 1 秒的请求会记录警告
```

### 功能特性

- ✅ 记录每个请求的响应时间
- ✅ 慢请求告警
- ✅ 响应头添加 `X-Process-Time`
- ✅ 结构化日志输出

### 日志示例

```
2024-01-09 10:30:15 - INFO - ✅ Request completed: {
  "method": "GET",
  "path": "/api/v1/posts/article",
  "status_code": 200,
  "process_time": "0.123s",
  "client_ip": "127.0.0.1"
}

2024-01-09 10:30:20 - WARNING - 🐌 Slow request detected: {
  "method": "POST",
  "path": "/api/v1/posts/article",
  "status_code": 201,
  "process_time": "1.456s",
  "client_ip": "127.0.0.1"
}
```

---

## 🔧 手动追踪（业务代码中使用）

### 捕获异常

```python
from app.core.monitoring import capture_exception

try:
    result = await some_risky_operation()
except Exception as e:
    capture_exception(e, context={
        "user_id": user.id,
        "operation": "create_post",
        "post_id": post.id
    })
    raise
```

### 性能追踪

```python
from app.core.monitoring import track_performance

@track_performance("create_post")
async def create_post(session, post_data):
    # 业务逻辑
    pass
```

---

## 📈 生产环境建议

### 推荐配置

```bash
# 生产环境 .env
ENVIRONMENT=production
SENTRY_DSN=https://your-production-dsn@sentry.io/xxx
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1  # 10% 采样（平衡性能和成本）
SLOW_REQUEST_THRESHOLD=0.5  # 生产环境更严格
```

### 采样率建议

| 流量规模             | 采样率     | 说明     |
| -------------------- | ---------- | -------- |
| < 1000 req/day       | 1.0 (100%) | 全量追踪 |
| 1000-10000 req/day   | 0.5 (50%)  | 中等采样 |
| 10000-100000 req/day | 0.1 (10%)  | 低采样   |
| > 100000 req/day     | 0.01 (1%)  | 极低采样 |

### 告警配置

在 Sentry 中配置告警规则：

1. **错误率告警**：错误率 > 5% 时发送邮件
2. **慢请求告警**：P95 响应时间 > 1s 时发送 Slack 通知
3. **新错误告警**：出现新类型错误时立即通知

---

## 🧪 测试监控是否生效

### 1. 触发一个错误

```bash
curl http://localhost:8000/api/v1/posts/article/non-existent-id
```

### 2. 查看日志

```bash
docker compose logs -f backend | grep "ERROR"
```

### 3. 查看 Sentry Dashboard

访问 Sentry 项目页面，应该能看到错误事件。

---

## 🔍 故障排查

### Sentry 未收到事件

1. 检查 DSN 是否正确
2. 检查网络连接（防火墙/代理）
3. 查看日志：`docker compose logs backend | grep sentry`

### OpenTelemetry 连接失败

1. 确认 OTLP Collector 已启动
2. 检查端口是否开放：`telnet localhost 4317`
3. 查看日志：`docker compose logs backend | grep opentelemetry`

---

## 📚 相关文档

- [Sentry Python SDK](https://docs.sentry.io/platforms/python/)
- [OpenTelemetry Python](https://opentelemetry.io/docs/instrumentation/python/)
- [FastAPI 性能优化](https://fastapi.tiangolo.com/advanced/performance/)

---

**监控配置完成！** 🎉
