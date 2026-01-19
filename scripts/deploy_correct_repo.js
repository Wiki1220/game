import { Client } from 'ssh2';

const config = {
    host: '120.26.212.80',
    port: 22,
    username: 'root',
    password: 'Game2026',
    hostVerifier: () => true,
    readyTimeout: 90000
};

console.log('==========================================');
console.log('  使用正确的仓库地址部署（端口 3333）');
console.log('  仓库: github.com/Wiki1220/game.git');
console.log('==========================================\n');

const conn = new Client();
conn.on('ready', () => {
    console.log('✓ SSH 连接成功\n');

    const cmd = `
set -e

echo ">>> 1. 清理旧部署"
pm2 delete all || true
pkill -f "node.*index.js" || true
rm -rf /var/www/game

echo ""
echo ">>> 2. 克隆代码（使用正确的仓库地址）"
cd /var/www
git clone https://github.com/Wiki1220/game.git game
cd game
ls -la

echo ""
echo ">>> 3. 安装前端依赖"
npm install

echo ""
echo ">>> 4. 构建前端"
npm run build
ls -la dist/

echo ""
echo ">>> 5. 安装后端依赖"
cd server
npm install --production

echo ""
echo ">>> 6. 启动服务（端口 3333）"
PORT=3333 pm2 start index.js --name game
pm2 save

echo ""
echo ">>> 7. 等待启动"
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
            }
            console.log('==========================================\n');
            conn.end();
        });
    });

}).on('error', err => {
    console.error('SSH 连接失败:', err.message);
}).connect(config);
