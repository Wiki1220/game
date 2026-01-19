import { Client } from 'ssh2';

const config = {
    host: '120.26.212.80',
    port: 22,
    username: 'root',
    password: 'Game2026',
    hostVerifier: () => true
};

console.log('=== 最终诊断 - 找出问题根源 ===\n');

const conn = new Client();
conn.on('ready', () => {
    const cmd = `
echo "1. 检查目录结构"
ls -la /var/www/ 2>&1
echo ""
ls -la /var/www/game/ 2>&1
echo ""
ls -la /var/www/game/server/ 2>&1

echo ""
echo "2. 如果目录不存在，重新克隆"
if [ ! -d "/var/www/game/server" ]; then
    echo "目录不存在，开始重新部署..."
    rm -rf /var/www/game
    cd /var/www
    git clone "https://github.com/Wiki1220/-----.git" game 2>&1 | tail -20
    echo "克隆完成，检查结果:"
    ls -la /var/www/game/
    ls -la /var/www/game/server/
fi

echo ""
echo "3. 安装后端依赖"
cd /var/www/game/server
npm install --production 2>&1 | tail -10

echo ""
echo "4. 直接测试运行（不用 PM2）"
PORT=3333 node index.js &
NODEPID=$!
echo "启动 Node 进程: $NODEPID"
sleep 3

echo ""
echo "5. 检查是否运行"
netstat -tulpn | grep :3333
ps aux | grep $NODEPID | grep -v grep

echo ""
echo "6. 测试访问"
curl http://127.0.0.1:3333 2>&1 | head -20

echo ""
echo "7. 如果成功，用 PM2 接管"
if netstat -tulpn | grep :3333 > /dev/null; then
    echo "服务运行正常，用 PM2 接管..."
    kill $NODEPID
    sleep 1
    pm2 delete game 2>/dev/null || true
    PORT=3333 pm2 start index.js --name game
    pm2 save
    sleep 2
    pm2 list
    echo ""
    curl -I http://127.0.0.1:3333 2>&1 | head -5
    echo ""
    echo "✓✓✓ 部署完成！"
    echo "访问: http://120.26.212.80:3333"
else
    echo "✗ 服务启动失败"
    kill $NODEPID 2>/dev/null || true
fi
`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('data', d => process.stdout.write(d.toString()));
        stream.stderr.on('data', d => process.stderr.write(d.toString()));
        stream.on('close', (code) => {
            console.log('\n=============================');
            console.log('诊断完成，退出码:', code);
            console.log('=============================\n');
            conn.end();
        });
    });
}).on('error', e => console.error('SSH Error:', e))
    .connect(config);
