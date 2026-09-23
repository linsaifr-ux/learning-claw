#!/bin/zsh
cd "$(dirname "$0")"
if command -v node >/dev/null 2>&1; then
  task_node="$(command -v node)"
elif [[ -x "$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" ]]; then
  task_node="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
else
  print '請先安裝 Node.js 22，並依 README 執行 pnpm install。'
  read '?按 Enter 關閉。'
  exit 1
fi
if [[ ! -f node_modules/vite/bin/vite.js ]]; then
  print '請先依 README 執行 pnpm install。'
  read '?按 Enter 關閉。'
  exit 1
fi
print '寶物教室預覽：http://127.0.0.1:4173/ （保持此視窗開啟）'
"$task_node" node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4173 --strictPort
