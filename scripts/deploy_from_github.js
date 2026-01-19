import { Client } from 'ssh2';

const config = {
    host: '120.26.212.80',
    port: 22,
    username: 'root',
    password: 'Game2026',
    hostVerifier: () => true
};

// 替换为您的 GitHub 仓库地址
const GITHUB_REPO = process.argv[2] || 'YOUR_GITHUB_REPO_URL';

if (GITHUB_REPO === 'YOUR_GITHUB_REPO_URL') {
    console.log('请提供 GitHub 仓库地址作为参数！');
    console.log('用法: node deploy_from_github.js <github-repo-url>');
    console.log('例如: node deploy_from_github.js https://github.com/username/game.git');
    process.exit(1);
}

console.log('=== 从 GitHub 部署游戏 ===\n');
console.log('仓库地址:', GITHUB_REPO, '\n');

const conn = new Client();
conn.on('ready', () => {
    console.log('SSH 已连接\n');

    const cmd = [
        'echo "=== 安装 Git (如果未安装) ==="',
        'which git || (export DEBIAN_FRONTEND=noninteractive && apt-get update && apt-get install -y git)',
        'echo ""',
        'echo "=== 停止旧服务 ==="',
        'pm2 delete all || true',
        'echo ""',
        'echo "=== 清理旧代码 ==="',
        'rm -rf /var/www/game',
        'mkdir -p /var/www',
        'cd /var/www',
        'echo ""',
        'echo "=== 克隆代码仓库 ==="',
        `git clone ${GITHUB_REPO} game`,
        'cd game',
        'echo ""',
        'echo "=== 构建前端 ==="',
        'npm install',
        'npm run build',
        'echo ""',
        'echo "=== 安装后端依赖 ==="',
        'cd server',
        'npm install --production',
        'echo ""',
        'echo "=== 启动游戏 ==="',
        'PORT=80 pm2 start index.js --name game',
        'pm2 save',
        'echo ""',
        'echo "=== 部署完成 ==="',
        'pm2 list',
        'netstat -tulpn | grep :80',
        'echo ""',
        'curl -I http://127.0.0.1 2>&1 | head -5'
    ].join(' && ');

    console.log('执行部署...\n');

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code) => {
            console.log('\n=== 退出码:', code, '===');
            if (code === 0) {
                console.log('\n✓ 部署成功！');
                console.log('游戏地址: http://120.26.212.80');
            } else {
                console.log('\n✗ 部署失败，请检查日志');
            }
            conn.end();
        })
            .on('data', d => process.stdout.write(d.toString()))
            .stderr.on('data', d => process.stderr.write(d.toString()));
    });
}).on('error', e => console.error('SSH Error:', e))
    .connect(config);
