import { Client } from 'ssh2';

const config = {
    host: '120.26.212.80',
    port: 22,
    username: 'root',
    password: 'Game2026',
    hostVerifier: () => true
};

console.log('==========================================');
console.log('  使用服务器上已有的 deploy_full.zip');
console.log('==========================================\n');

const conn = new Client();
conn.on('ready', () => {
    console.log('✓ SSH 连接成功\n');

    const cmd = `
set -e

echo ">>> 1. 检查文件"
ls -lh /root/deploy_full.zip

echo ""
echo ">>> 2. 停止旧服务"
pm2 delete all || true
pkill -f "node.*index.js" || true

echo ""
echo ">>> 3. 清理并创建目录"
rm -rf /var/www/game
mkdir -p /var/www/game
cd /var/www/game

echo ""
echo ">>> 4. 解压文件"
unzip -o /root/deploy_full.zip
ls -la

echo ""
echo ">>> 5. 检查解压结果"
ls -la dist/ 2>&1 || echo "dist 目录不存在"
ls -la server/ 2>&1 || echo "server 目录不存在"

echo ""
echo ">>> 6. 安装后端依赖"
cd server
npm install --production
ls -la node_modules/ | head -10

echo ""
echo ">>> 7. 启动服务（端口 3333）"
PORT=3333 pm2 start index.js --name game
pm2 save

echo ""
echo ">>> 8. 等待启动"
sleep 3

echo ""
echo "=================== 验证结果 ==================="
pm2 list
echo ""
netstat -tulpn | grep :3333
echo ""
curl -I http://127.0.0.1:3333
echo "================================================"
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
            console.log('\n==========================================');
            console.log('退出码:', code);
            if (code === 0) {
                console.log('\n✓✓✓ 部署成功！✓✓✓');
                console.log('\n游戏地址: http://120.26.212.80:3333\n');
            } else {
                console.log('\n部署可能失败，请查看错误信息');
            }
            console.log('==========================================\n');
            conn.end();
        });
    });

}).on('error', err => {
    console.error('SSH 连接失败:', err.message);
}).connect(config);
