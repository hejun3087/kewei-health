# ============================================
# 可为健康 - 生产镜像（npm workspaces monorepo）
# 注意：lockfile 只在仓库根，必须在根上下文安装依赖
# ============================================

# ============ 依赖安装（全 workspace，含 dev，供构建） ============
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY web/package.json ./web/
COPY miniprogram/package.json ./miniprogram/
RUN npm ci

# ============ 后端构建 ============
FROM node:20-alpine AS server-builder
WORKDIR /app
COPY --from=deps /app ./
COPY server/ ./server/
RUN npx prisma generate --schema server/prisma/schema.prisma \
 && npm run build -w server

# ============ Web 前端构建 ============
FROM node:20-alpine AS web-builder
WORKDIR /app
COPY --from=server-builder /app ./
COPY web/ ./web/
RUN npm run build -w web

# ============ 生产依赖（仅 server 运行时） ============
FROM node:20-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY web/package.json ./web/
COPY miniprogram/package.json ./miniprogram/
RUN npm ci --omit=dev -w server

# ============ 生产镜像 ============
FROM node:20-alpine

RUN apk add --no-cache dumb-init

WORKDIR /app

# 运行时依赖（workspaces 依赖会提升至根 node_modules）
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/server/node_modules ./server/node_modules

# 后端构建产物 + Prisma schema（启动时 migrate deploy 用）
COPY --from=server-builder /app/server/dist ./server/dist
COPY --from=server-builder /app/server/prisma ./server/prisma
COPY --from=server-builder /app/server/package.json ./server/package.json

# Web 静态产物（可由 Nginx 容器 docker cp 或挂载使用）
COPY --from=web-builder /app/web/dist ./web/dist

# 上传目录（compose 中挂 volume）
RUN mkdir -p /app/server/uploads

WORKDIR /app/server

EXPOSE 3000

# 使用 dumb-init 作为 PID 1，正确处理信号
ENTRYPOINT ["dumb-init", "--"]

# 启动前自动应用数据库迁移，再启动服务
CMD ["sh", "-c", "npx prisma migrate deploy --schema prisma/schema.prisma && node dist/main.js"]
