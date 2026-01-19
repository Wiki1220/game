import { Client } from 'ssh2';

const config = {
    host: '120.26.212.80',
    port: 22,
    username: 'root',
    password: 'Game2026',
    hostVerifier: () => true
};

// 从用户提供的链接下载并部署
const DOWNLOAD_URL = process.argv[2];

if (!DOWNLOAD_URL) {
    console.log('用法: node deploy_from_url.js <下载链接>');
    console.log('例如: node deploy_from_url.js https://example.com/game-deploy.zip');
    process.exit(1);
}

console.log('==========================================');
console.log('  从用户提供的链接部署游戏');
console.log('==========================================\n');
console.log('下载链接:', DOWNLOAD_URL, '\n');

const conn = new Client();
conn.on('ready', () => {
    console.log('✓ SSH 连接成功\n');

    const cmd = `
set -e

echo ">>> 1. 清理旧部署"
pm2 delete all || true
pkill -f "node.*index.js" || true
rm -rf /var/www/game
rm -f /tmp/game-deploy.zip

echo ""
echo ">>> 2. 下载游戏包"
cd /tmp
wget -O game-deploy.zip "${DOWNLOAD_URL}"
ls -lh game-deploy.zip

echo ""
echo ">>> 3. 解压到 /var/www/game"
mkdir -p /var/www/game
cd /var/www/game
unzip -o /tmp/game-deploy.zip
ls -la

echo ""
echo ">>> 4. 安装后端依赖"
cd /var/www/game/server
npm install --production

echo ""
echo ">>> 5. 启动服务（端口 3333）"
PORT=3333 pm2 start index.js --name game
pm2 save

echo ""
echo ">>> 6. 等待启动"
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
                console.log('\n部署失败，请检查错误信息');
            }
            console.log('==========================================\n');
            conn.end();
        });
    });

}).on('error', err => {
    console.error('SSH 连接失败:', err.message);
}).connect(config);
