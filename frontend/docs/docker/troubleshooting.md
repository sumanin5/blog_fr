# Docker 开发环境故障排查

## 问题：找不到新安装的 npm 包

### 症状

```
Failed to resolve import "@fontsource/inter/300.css" from "src/main.tsx"
```

### 原因

Docker 容器中的 `node_modules` 是挂载的卷，当你在 `package.json` 中添加新依赖后，容器中的依赖没有自动更新。

### 解决方案

#### 方法 1：重新构建镜像（推荐）

```bash
# 停止并删除旧容器
docker compose -f docker-compose.dev.yml down

# 重新构建前端镜像（不使用缓存）
docker compose -f docker-compose.dev.yml build --no-cache frontend

# 启动服务
docker compose -f docker-compose.dev.yml up
```

#### 方法 2：在运行中的容器内安装

```bash
# 进入容器
docker compose -f docker-compose.dev.yml exec frontend sh

# 安装依赖
npm install

# 退出容器
exit
```

#### 方法 3：删除 node_modules 卷后重建

```bash
# 停止服务
docker compose -f docker-compose.dev.yml down

# 删除 node_modules 卷
docker volume rm $(docker volume ls -q | grep node_modules)

# 重新构建并启动
docker compose -f docker-compose.dev.yml up --build
```

## 问题：热重载不工作

### 解决方案

确保 `vite.config.ts` 中配置了：

```typescript
server: {
  host: "0.0.0.0",
  port: 5173,
  watch: {
    usePolling: true, // Docker 中必须启用轮询
  },
}
```

## 问题：端口被占用

### 症状

```
Error: listen EADDRINUSE: address already in use :::5173
```

### 解决方案

```bash
# 查看占用端口的进程
lsof -i :5173

# 停止 Docker 服务
docker compose -f docker-compose.dev.yml down

# 或者修改 docker-compose.dev.yml 中的端口映射
ports:
  - "5174:5173"  # 改用 5174
```

## 问题：权限错误

### 症状

```
EACCES: permission denied
```

### 解决方案

在 `docker-compose.dev.yml` 中设置用户权限：

```yaml
backend:
  user: "${UID}:${GID}"
```

然后在 `.env` 文件中添加：

```bash
UID=1000
GID=1000
```
