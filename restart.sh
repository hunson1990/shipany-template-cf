#!/bin/bash

# 重启项目脚本
echo "🔄 正在重启项目..."

# 0. 检查并自动切换Node.js版本
echo "🔍 检查Node.js版本..."
NODE_VERSION=$(node -v | sed 's/v//')
REQUIRED_VERSION="22.2.0"

# 版本比较函数
version_gt() {
    test "$(printf '%s\n' "$@" | sort -V | head -n 1)" != "$1"
}

if [ "$NODE_VERSION" != "$REQUIRED_VERSION" ]; then
    echo "❌ Node.js版本不符合要求"
    echo "   当前版本: v$NODE_VERSION"
    echo "   需要版本: v22.2.0"
    echo ""
    
    # 检查是否安装了nvm
    if command -v nvm &> /dev/null || [ -s "$HOME/.nvm/nvm.sh" ]; then
        echo "🔧 检测到nvm，尝试自动切换Node.js版本..."
        
        # 加载nvm
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
        
        # 检查是否已安装Node 22.2.0
        if nvm list | grep -q "v22.2.0"; then
            echo "✅ 发现已安装的Node.js 22.2.0，正在切换..."
            nvm use 22.2.0
            echo "✅ 已切换到Node.js $(node -v)"
        else
            echo "📦 Node.js 22.2.0未安装，正在安装..."
            nvm install 22.2.0
            nvm use 22.2.0
            echo "✅ 已安装并切换到Node.js $(node -v)"
        fi
    
    # 检查是否安装了n
    elif command -v n &> /dev/null; then
        echo "🔧 检测到n，尝试自动切换Node.js版本..."
        
        # 检查是否已安装Node 22.2.0
        if n list | grep -q "22.2.0"; then
            echo "✅ 发现已安装的Node.js 22.2.0，正在切换..."
            n 22.2.0
            echo "✅ 已切换到Node.js $(node -v)"
        else
            echo "📦 Node.js 22.2.0未安装，正在安装..."
            sudo n 22.2.0
            echo "✅ 已安装并切换到Node.js $(node -v)"
        fi
    
    else
        echo "⚠️  未检测到nvm或n，请手动升级Node.js："
        echo "   方法1: 安装nvm:"
        echo "     curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
        echo "     source ~/.bashrc"
        echo "     nvm install 22.2.0"
        echo ""
        echo "   方法2: 安装n:"
        echo "     npm install -g n"
        echo "     n 22.2.0"
        echo ""
        echo "   方法3: 从官网下载:"
        echo "     https://nodejs.org/"
        echo ""
        read -p "是否继续启动？可能会出现错误 (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "❌ 已取消启动"
            exit 1
        fi
    fi
else
    echo "✅ Node.js版本符合要求: v$NODE_VERSION"
fi

# 1. 清理3000端口占用
echo "🧹 清理3000端口占用..."
PID=$(lsof -ti:3000 2>/dev/null)
if [ ! -z "$PID" ]; then
    echo "发现3000端口被进程 $PID 占用，正在终止..."
    kill -9 $PID
    echo "✅ 已终止进程 $PID"
else
    echo "ℹ️  3000端口未被占用"
fi

# 等待一下确保端口释放
sleep 2

# 2. 停止所有可能的Node.js进程（可选，谨慎使用）
echo "🛑 停止相关Node.js进程..."
pkill -f "next-server" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true

# 3. 清理Next.js锁文件
echo "🔓 清理Next.js锁文件..."
if [ -f ".next/dev/lock" ]; then
    rm -f .next/dev/lock
    echo "✅ 已删除锁文件 .next/dev/lock"
else
    echo "ℹ️  锁文件不存在"
fi

# 4. 安装依赖（如果需要）
if [ "$1" = "--install" ] || [ "$1" = "-i" ]; then
    echo "📦 安装依赖..."
    npm install
fi

# 5. 启动开发服务器
echo "🚀 启动开发服务器..."
if npm run dev; then
    echo "✅ 项目启动成功！"
    echo "🌐 访问地址: http://localhost:3000"
else
    echo "❌ 项目启动失败！"
    echo "💡 可能的解决方案："
    echo "   1. 检查package.json中的scripts"
    echo "   2. 确保所有依赖已正确安装: npm install"
    echo "   3. 检查端口是否被占用"
    echo "   4. 确保Node.js版本为22.2.0"
    exit 1
fi