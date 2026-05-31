#!/usr/bin/env bash
# 星光无限画布 - Docker 一键部署（宝塔 / 任意 Linux 服务器）
#
# 前置条件：
#   1. 已安装 Docker（宝塔：软件商店 → Docker）
#   2. 已安装 Git
#   3. 服务器可访问 GitHub（私有仓库需配置 SSH 或 Token）
#
# 用法：
#   chmod +x deploy.sh && ./deploy.sh
#
# 常用环境变量（可选）：
#   REPO_URL=https://github.com/aigo666/huabu.git
#   BRANCH=dev
#   DEPLOY_DIR=/www/wwwroot/huobao-canvas
#   CONTAINER_NAME=huobao-canvas
#   HOST_PORT=8080
#   IMAGE_NAME=huobao-canvas
#   IMAGE_TAG=latest
#   API_PROXY=https://api.xgapi.top

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/aigo666/huabu.git}"
BRANCH="${BRANCH:-dev}"
DEPLOY_DIR="${DEPLOY_DIR:-/www/wwwroot/huobao-canvas}"
CONTAINER_NAME="${CONTAINER_NAME:-huobao-canvas}"
HOST_PORT="${HOST_PORT:-8080}"
IMAGE_NAME="${IMAGE_NAME:-huobao-canvas}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
API_PROXY="${API_PROXY:-https://api.xgapi.top}"

IMAGE="${IMAGE_NAME}:${IMAGE_TAG}"
API_HOST="$(echo "${API_PROXY}" | sed -E 's#^https?://##; s#/$##')"

log() { echo "[deploy] $*"; }
die() { echo "[deploy] ERROR: $*" >&2; exit 1; }

command -v docker >/dev/null 2>&1 || die "未找到 docker，请先在宝塔安装 Docker"
command -v git >/dev/null 2>&1 || die "未找到 git，请先安装 Git"

if ! docker info >/dev/null 2>&1; then
  die "Docker 未运行或无权限，请执行: sudo systemctl start docker && sudo usermod -aG docker \$USER"
fi

log "部署目录: ${DEPLOY_DIR}"
log "代码仓库: ${REPO_URL} (${BRANCH})"
log "容器端口: ${HOST_PORT} -> 80"
log "API 代理: ${API_PROXY}"

mkdir -p "${DEPLOY_DIR}"

if [ -d "${DEPLOY_DIR}/.git" ]; then
  log "拉取最新代码..."
  git -C "${DEPLOY_DIR}" fetch origin "${BRANCH}"
  git -C "${DEPLOY_DIR}" checkout "${BRANCH}"
  git -C "${DEPLOY_DIR}" reset --hard "origin/${BRANCH}"
else
  log "首次克隆仓库..."
  git clone --branch "${BRANCH}" --depth 1 "${REPO_URL}" "${DEPLOY_DIR}"
fi

cd "${DEPLOY_DIR}"

# 按部署环境覆盖 nginx 中的 API 上游
if [ -f nginx.conf ]; then
  sed -i.bak \
    -e "s|proxy_pass https://api.xgapi.top;|proxy_pass ${API_PROXY};|g" \
    -e "s|proxy_set_header Host api.xgapi.top;|proxy_set_header Host ${API_HOST};|g" \
    nginx.conf
  rm -f nginx.conf.bak
fi

log "构建 Docker 镜像 ${IMAGE} ..."
docker build -t "${IMAGE}" .

if docker ps -a --format '{{.Names}}' | grep -qx "${CONTAINER_NAME}"; then
  log "停止并删除旧容器 ${CONTAINER_NAME} ..."
  docker stop "${CONTAINER_NAME}" >/dev/null 2>&1 || true
  docker rm "${CONTAINER_NAME}" >/dev/null 2>&1 || true
fi

log "启动容器 ${CONTAINER_NAME} ..."
docker run -d \
  --name "${CONTAINER_NAME}" \
  --restart unless-stopped \
  -p "${HOST_PORT}:80" \
  "${IMAGE}"

SERVER_IP="$(hostname -I 2>/dev/null | awk '{print $1}' || echo '127.0.0.1')"

log "部署完成"
echo ""
echo "  访问地址: http://${SERVER_IP}:${HOST_PORT}/huobao-canvas/"
echo "  容器名称: ${CONTAINER_NAME}"
echo "  查看日志: docker logs -f ${CONTAINER_NAME}"
echo ""
echo "宝塔绑定域名（可选）："
echo "  网站 → 反向代理 → 目标 URL 填 http://127.0.0.1:${HOST_PORT}/huobao-canvas/"
echo ""
