#!/bin/bash

# epub2MD GUI 启动脚本

echo "🚀 正在启动 epub2MD GUI..."
echo ""

# 进入 gui 目录
SCRIPT_DIR="$(dirname "$0")"
cd "$SCRIPT_DIR/gui"

# 检查是否在正确的目录
if [ ! -f "server.js" ]; then
    echo "❌ 错误: 找不到 server.js 文件"
    echo "请确保在正确的目录中运行此脚本"
    echo ""
    read -p "按 Enter 键退出..."
    exit 1
fi

# 检查依赖是否已安装
if [ ! -d "node_modules" ]; then
    echo "📦 首次运行，正在安装依赖..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 依赖安装失败"
        echo ""
        read -p "按 Enter 键退出..."
        exit 1
    fi
    echo ""
fi

# 创建必要的目录
mkdir -p uploads outputs public

# 检查端口是否被占用
if lsof -Pi :3737 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  警告: 端口 3737 已被占用"
    echo "可能已有实例在运行，或使用其他端口"
    echo ""
fi

# 等待服务器启动的函数
wait_for_server() {
    local max_attempts=10
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s http://localhost:3737 > /dev/null 2>&1; then
            return 0
        fi
        sleep 0.5
        attempt=$((attempt + 1))
    done
    return 1
}

# 启动服务器（前台运行）
echo "✨ 启动服务器..."
echo ""

# 在后台启动服务器用于检测
node server.js &
SERVER_PID=$!

# 等待服务器启动
sleep 1

# 检查服务器是否成功启动
if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo "❌ 服务器启动失败"
    echo "请检查错误信息"
    echo ""
    read -p "按 Enter 键退出..."
    exit 1
fi

# 自动打开浏览器
if wait_for_server; then
    echo "🌐 正在打开浏览器..."
    open http://localhost:3737 2>/dev/null
else
    echo "⚠️  无法连接到服务器，但进程正在运行"
fi

echo ""
echo "✅ epub2MD GUI 已启动！"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📱 浏览器地址: http://localhost:3737"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 使用说明:"
echo "   1. 在浏览器中访问上述地址"
echo "   2. 拖拽或选择 EPUB 文件"
echo "   3. 配置转换选项"
echo "   4. 点击转换并下载结果"
echo ""
echo "⚠️  重要: 请不要关闭此终端窗口！"
echo "   - 按 Ctrl+C 可以停止服务器"
echo "   - 关闭窗口也会停止服务器"
echo ""

# 等待用户中断（前台运行）
wait $SERVER_PID
