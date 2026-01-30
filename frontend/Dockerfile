# ============================================================
# 阶段 1: 依赖安装 (deps)
# ============================================================
FROM node:22-alpine AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制依赖文件
COPY package.json pnpm-lock.yaml ./

# 安装依赖
RUN pnpm install --frozen-lockfile


# ============================================================
# 阶段 2: 构建阶段 (builder)
# ============================================================
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 安装 pnpm (构建时可能需要执行脚本)
RUN npm install -g pnpm

# 设置构建时环境变量
# 默认使用相对路径 /api，通过 Caddy 反向代理访问后端
ARG NEXT_PUBLIC_API_URL=/api
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# 执行构建
RUN pnpm run build


# ============================================================
# 阶段 3: 运行阶段 (runner)
# ============================================================
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
# 禁用 Next.js 遥测数据采集
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制必要的静态资源和构建输出
# 只有在使用 output: 'standalone' 时才有效
COPY --from=builder /app/public ./public

# 自动从构建产物中提取 standalone 目录
# 这样镜像会非常小，因为它只包含了运行所需的最小 node_modules
RUN mkdir .next
RUN chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
# 允许外部访问
ENV HOSTNAME="0.0.0.0"

# server.js 是 standalone 输出模式自动生成的入口文件
CMD ["node", "server.js"]
