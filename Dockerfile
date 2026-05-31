# 多阶段构建：服务器只需 Docker + Git，无需本地安装 Node
FROM node:22-alpine AS builder

WORKDIR /app

# lockfileVersion 9.0 对应 pnpm 9；勿用 pnpm@latest（11.x 需 Node 22.13+ 且与 lockfile 可能不兼容）
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html/huobao-canvas

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
