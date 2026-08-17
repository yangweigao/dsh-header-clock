#!/usr/bin/env bash
# header-clock 一键安装脚本（macOS / Linux）
# 用法: ./install.sh [-h <DSH_HOME>] [-p <profile>]
# 默认: DSH_HOME=$HOME/.dsh  profile=web
set -euo pipefail

DSH_HOME="${HOME}/.dsh"
PROFILE="web"

while getopts "h:p:" opt; do
  case "$opt" in
    h) DSH_HOME="$OPTARG" ;;
    p) PROFILE="$OPTARG" ;;
    *) echo "用法: $0 [-h DSH_HOME] [-p profile]"; exit 1 ;;
  esac
done

if [ ! -d "$DSH_HOME" ]; then
  echo "错误: 未找到 DSH 目录 $DSH_HOME" >&2
  exit 1
fi
PROFILE_DIR="$DSH_HOME/profiles/$PROFILE"
if [ ! -d "$PROFILE_DIR" ]; then
  echo "错误: 未找到 profile 目录 $PROFILE_DIR" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TARGET="$PROFILE_DIR/node_modules/header-clock"

echo "1/3 复制插件到 $TARGET"
mkdir -p "$TARGET"
cp -R "$SCRIPT_DIR/static/." "$TARGET/"

PATCH="$PROFILE_DIR/cordis.patch.yml"
if [ ! -f "$PATCH" ]; then
  echo "错误: 未找到 $PATCH" >&2
  exit 1
fi

if grep -q 'header-clock' "$PATCH"; then
  echo "2/3 cordis.patch.yml 已包含 header-clock，跳过"
else
  cat >> "$PATCH" <<'EOF'

# header-clock (DSH 头部时钟插件) - 临时禁用: 将 disabled 改为 true 并重启 DSH
- insert:
    - id: header-clock
      name: header-clock
      disabled: false
EOF
  echo "2/3 已写入 cordis.patch.yml"
fi

echo "3/3 运行冒烟测试:"
if command -v node >/dev/null 2>&1; then
  node "$SCRIPT_DIR/test/smoke.test.js" || echo "注意: 冒烟测试未通过，请检查环境" >&2
else
  echo "未安装 Node.js，跳过测试（不影响安装）"
fi

echo ""
echo "安装完成！请重启 DSH 服务（不是刷新浏览器），时钟即随页面自动显示。"
echo "卸载: 删除 $TARGET 目录，并从 $PATCH 中移除 header-clock 条目。"
