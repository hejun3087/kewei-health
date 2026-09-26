# ============ 后端 API 服务 ============
FROM node:20-alpine AS server-builder

WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npx prisma generate
RUN npm run build

# ============ Web 前端 ============
FROM node:20-alpine AS web-builder

WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# ============ 生产镜像 ============
FROM node:20-alpine

WORKDIR /app

# 安装 dumb-init 用于正确处理信号
RUN apk add --no-cache dumb-init

# 复制后端构建产物
COPY --from=server-builder /app/server/dist ./server/dist
COPY --from=server-builder /app/server/node_modules ./server/node_modules
COPY --from=server-builder /app/server/package.json ./server/
COPY --from=server-builder /app/server/prisma ./server/prisma

# 复制前端构建产物（可通过Nginx托管）
COPY --from=web-builder /app/web/dist ./web/dist

# 创建上传目录
RUN mkdir -p /app/server/uploads

WORKDIR /app/server

EXPOSE 3000

# 使用 dumb-init 作为 PID 1
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
