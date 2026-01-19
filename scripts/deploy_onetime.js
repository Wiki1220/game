import { Client } from 'ssh2';

const config = {
    host: '120.26.212.80',
    port: 22,
    username: 'root',
    password: 'Game2026',
    hostVerifier: () => true,
    readyTimeout: 30000
};

console.log('=== 一次性部署 ===\n');

const conn = new Client();
conn.on('ready', () => {
    console.log('SSH 连接成功\n');
    console.log('执行完整部署命令（请耐心等待 2-3 分钟）...\n');

    // 一次性执行所有命令
    const fullCmd = `
set -e
echo "=== 停止旧服务 ==="
pm2 delete all || true
echo ""
echo "=== 清理目录 ==="
rm -rf /var/www/game
echo ""
echo "=== 克隆代码 ==="
cd /var/www
git clone "https://github.com/Wiki1220/-----.git" game
cd game
echo ""
echo "=== 安装前端依赖 ==="
npm install 2>&1 | tail -5
echo ""
echo "=== 构建前端 ==="
npm run build 2>&1 | tail -5
echo ""
echo "=== 安装后端依赖 ==="
cd server
npm install --production 2>&1 | tail -5
echo ""
echo "=== 启动游戏 ==="
PORT=80 pm2 start index.js --name game
pm2 save
echo ""
echo "=== 验证部署 ==="
pm2 list
netstat -tulpn | grep :80
echo ""
curl -I http://127.0.0.1 2>&1 | head -3
echo ""
echo "=== 部署完成 ==="
`;

    conn.exec(fullCmd, (err, stream) => {
        if (err) {
            console.error('执行错误:', err);
            conn.end();
            return;
        }

        stream.on('close', (code) => {
            console.log('\n===============');
            console.log('退出码:', code);
            if (code === 0) {
                console.log('✓ 部署成功！');
                console.log('游戏地址: http://120.26.212.80');
            } else {
                console.log('✗ 部署失败');
            }
            console.log('===============\n');
            conn.end();
        })
            .on('data', d => process.stdout.write(d.toString()))
            .stderr.on('data', d => process.stderr.write(d.toString()));
    });

}).on('error', err => {
    console.error('SSH 连接失败:', err);
}).connect(config);
