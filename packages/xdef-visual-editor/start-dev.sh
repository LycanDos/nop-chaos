#!/bin/bash

echo "正在启动 Xdef 可视化编辑器示例..."

# 进入 examples 目录
cd "$(dirname "$0")/examples"

# 检查是否已安装依赖
if [ ! -d "node_modules" ]; then
    echo "首次运行，正在安装依赖..."
    npm install
fi

# 启动开发服务器
echo "启动开发服务器..."
npm run dev