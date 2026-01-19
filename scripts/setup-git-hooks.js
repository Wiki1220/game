import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

const hookContent = `#!/bin/sh
# Git pre-push hook
# 在推送代码前自动部署到测试服务器

echo "🚀 检测到 git push，准备自动部署..."

# 获取当前分支
current_branch=$(git symbolic-ref --short HEAD 2>/dev/null || echo "unknown")

# 只在 main 分支触发自动部署
if [ "$current_branch" = "main" ]; then
    echo "📦 正在部署 main 分支..."
    
    # 运行自动部署脚本
    node scripts/auto-deploy.js
    
    # 检查部署结果
    if [ $? -eq 0 ]; then
        echo "✅ 自动部署成功！"
        echo "🌐 游戏地址: http://120.26.212.80:3333"
        exit 0
    else
        echo "❌ 自动部署失败！"
        echo "⚠️  推送已取消，请修复问题后重试"
        echo "💡 提示：使用 'git push --no-verify' 跳过部署"
        exit 1
    fi
else
    echo "ℹ️  跳过自动部署（仅 main 分支触发）"
    exit 0
fi
`;

console.log('设置 Git Hooks...\n');

try {
    const hooksDir = path.join(projectRoot, '.git', 'hooks');
    const prePushPath = path.join(hooksDir, 'pre-push');

    // 检查 .git 目录
    if (!fs.existsSync(path.join(projectRoot, '.git'))) {
        console.error('✗ 错误：未找到 .git 目录');
        console.log('提示：请先运行 git init');
        process.exit(1);
    }

    // 创建 hooks 目录（如果不存在）
    if (!fs.existsSync(hooksDir)) {
        fs.mkdirSync(hooksDir, { recursive: true });
    }

    // 写入 hook 文件
    fs.writeFileSync(prePushPath, hookContent, { mode: 0o755 });

    console.log('✓ Git pre-push hook 已安装');
    console.log(`  位置: ${prePushPath}`);
    console.log('\n功能说明：');
    console.log('  • 在 git push 前自动触发部署');
    console.log('  • 仅在 main 分支触发');
    console.log('  • 部署失败会阻止推送');
    console.log('  • 使用 git push --no-verify 可跳过\n');

    console.log('✅ Git Hooks 设置完成！\n');

} catch (error) {
    console.error('✗ 设置失败:', error.message);
    process.exit(1);
}
