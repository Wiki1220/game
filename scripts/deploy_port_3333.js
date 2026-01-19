import { Client } from 'ssh2';

const config = {
    host: '120.26.212.80',
    port: 22,
    username: 'root',
    password: 'Game2026',
    hostVerifier: () => true
};

console.log('========================================');
console.log('  使用端口 3333 部署游戏');
console.log('========================================\n');

const conn = new Client();
conn.on('ready', () => {
    console.log('✓ SSH 连接成功\n');

    const cmd = `
set -e  # 遇到错误立即停止

echo "步骤 1: 停止所有旧服务"
pm2 delete all || true
systemctl stop xiangqi-game || true
pkill -f "node.*index.js" || true

echo ""
echo "步骤 2: 检查代码目录"
if [ ! -d "/var/www/game" ]; then
    echo "代码不存在，开始克隆..."
    cd /var/www
    git clone "https://github.com/Wiki1220/-----.git" game
    cd game
    echo "安装前端依赖..."
    npm install
    echo "构建前端..."
    npm run build
    echo "安装后端依赖..."
    cd server
    npm install --production
else
    echo "代码已存在，跳过克隆"
    cd /var/www/game/server
fi

echo ""
echo "步骤 3: 使用端口 3333 启动游戏"
cd /var/www/game/server
PORT=3333 pm2 start index.js --name game
pm2 save

echo ""
echo "步骤 4: 等待启动"
sleep 3

echo ""
echo "========== 验证结果 =========="
pm2 list
echo ""
netstat -tulpn | grep :3333
echo ""
curl -I http://127.0.0.1:3333 2>&1 | head -5
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
            console.log('\n========================================');
            console.log('退出码:', code);
            if (code === 0) {
                console.log('\n✓✓✓ 部署成功！✓✓✓');
                console.log('\n游戏地址: http://120.26.212.80:3333');
                console.log('\n请在浏览器中访问上述地址！');
            } else {
                console.log('\n部署失败');
            }
            console.log('========================================\n');
            conn.end();
        });
    });

}).on('error', err => {
    console.error('SSH 连接失败:', err);
}).connect(config);
