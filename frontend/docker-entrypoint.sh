#!/usr/bin/env bash
set -euo pipefail

# Defaults can be overridden via environment
BACKEND_API_URL_DEFAULT="${VITE_BACKEND_API_URL:-}"
BACKEND_API_URL="${BACKEND_API_URL:-${BACKEND_API_URL_DEFAULT}}"
BACKEND_WS_URL="${BACKEND_WS_URL:-}"

# Build JS-safe values
if [ -n "${BACKEND_API_URL}" ]; then
  JS_BACKEND_API_URL="\"${BACKEND_API_URL}\""
else
  JS_BACKEND_API_URL="null"
fi

if [ -n "${BACKEND_WS_URL}" ]; then
  JS_BACKEND_WS_URL="\"${BACKEND_WS_URL}\""
else
  JS_BACKEND_WS_URL="null"
fi

mkdir -p /usr/share/nginx/html
cat >/usr/share/nginx/html/config.js <<EOF
window.__ENV__ = Object.assign({}, window.__ENV__, {
  BACKEND_API_URL: ${JS_BACKEND_API_URL},
  BACKEND_WS_URL: ${JS_BACKEND_WS_URL}
});
EOF

exec "$@"
                      