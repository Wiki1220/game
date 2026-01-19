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
console.log('  完全重新部署（端口 3333）');
console.log('==========================================\n');

const conn = new Client();
conn.on('ready', () => {
    console.log('✓ SSH 连接成功\n');
    console.log('开始完整部署流程...\n');

    const cmd = `
#!/bin/bash
set -x  # 显示执行的每一条命令

echo ">>> 1. 停止所有服务"
pm2 delete all || true
pkill -f "node.*index.js" || true

echo ""
echo ">>> 2. 完全清理旧目录"
rm -rf /var/www/game
rm -rf /tmp/game-deploy

echo ""
echo ">>> 3. 创建临时目录并克隆代码"
mkdir -p /tmp/game-deploy
cd /tmp/game-deploy
git clone "https://github.com/Wiki1220/-----.git" game
cd game
pwd
ls -la

echo ""
echo ">>> 4. 安装前端依赖"
npm install

echo ""
echo ">>> 5. 构建前端"
npm run build
ls -la dist/

echo ""
echo ">>> 6. 移动到正式目录"
mv /tmp/game-deploy/game /var/www/game
cd /var/www/game

echo ""
echo ">>> 7. 安装后端依赖"
cd server
npm install --production
ls -la

echo ""
echo ">>> 8. 测试 Node.js 能否运行"
node -v
node -e "console.log('Node works')"

echo ""
echo ">>> 9. 启动服务（端口 3333）"
PORT=3333 pm2 start index.js --name game
pm2 save

echo ""
echo ">>> 10. 等待启动"
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
            console.log('部署完成！退出码:', code);
            if (code === 0) {
                console.log('\n✓✓✓ 成功！✓✓✓');
                console.log('\n游戏地址: http://120.26.212.80:3333\n');
            } else {
                console.log('\n请查看上面的错误信息');
            }
            console.log('==========================================\n');
            conn.end();
        });
    });

}).on('error', err => {
    console.error('\nSSH 连接失败:', err.message);
}).connect(config);
