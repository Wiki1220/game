import { Client } from 'ssh2';

const config = {
    host: '120.26.212.80',
    port: 22,
    username: 'root',
    password: 'Game2026',
    hostVerifier: () => true,
    readyTimeout: 60000
};

console.log('==================================');
console.log('  重新部署（带详细步骤输出）');
console.log('==================================\n');

const conn = new Client();
conn.on('ready', () => {
    console.log('✓ SSH 连接成功\n');

    const cmd = `
set -e # 遇到错误立即停止

echo "步骤 1: 停止旧服务"
pm2 delete all || true

echo "步骤 2: 清理旧目录"
rm -rf /var/www/game

echo "步骤 3: 克隆代码"
cd /var/www
git clone "https://github.com/Wiki1220/-----.git" game
cd game

echo "步骤 4: 检查关键文件"
ls -la server/index.js
ls -la server/package.json

echo "步骤 5: 安装前端依赖"
npm install

echo "步骤 6: 构建前端"
npm run build

echo "步骤 7: 检查构建结果"
ls -la dist/index.html
ls -la dist/assets/

echo "步骤 8: 安装后端依赖"
cd server
npm install --production

echo "步骤 9: 测试后端代码"
node -e "console.log('Node.js 可以执行')"

echo "步骤 10: 启动游戏"
PORT=80 pm2 start index.js --name game

echo "步骤 11: 保存 PM2"
pm2 save

echo "步骤 12: 等待 2 秒"
sleep 2

echo ""
echo "========== 验证结果 =========="
pm2 list
echo ""
netstat -tulpn | grep :80
echo ""
curl -I http://127.0.0.1 2>&1 | head -5
echo "=============================="
`;

    conn.exec(cmd, (err, stream) => {
        if (err) {
            console.error('执行错误:', err);
            conn.end();
            return;
        }

        stream.on('data', d => process.stdout.write(d.toString()));
        stream.stderr.on('data', d => process.stderr.write(d.toString()));

        stream.on('close', (code) => {
            console.log('\n==================================');
            console.log('退出码:', code);
            if (code === 0) {
                console.log('\n✓✓✓ 部署成功！✓✓✓');
                console.log('\n请访问: http://120.26.212.80');
            } else {
                console.log('\n✗ 部署失败，请查看上面的错误信息');
            }
            console.log('==================================\n');
            conn.end();
        });
    });

}).on('error', err => {
    console.error('SSH 连接失败:', err);
}).connect(config);
