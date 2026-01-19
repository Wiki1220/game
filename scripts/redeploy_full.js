import { Client } from 'ssh2';

const config = {
    host: '120.26.212.80',
    port: 22,
    username: 'root',
    password: 'Game2026',
    hostVerifier: () => true
};

console.log('==========================================');
console.log('  重新完整部署（端口 3333）');
console.log('==========================================\n');

const conn = new Client();
conn.on('ready', () => {
    console.log('✓ SSH 连接成功\n');

    const cmd = `
set -e

echo "步骤 1: 停止所有进程"
pm2 delete all || true
pkill -f "node.*index.js" || true

echo ""
echo "步骤 2: 清理并解压"
rm -rf /var/www/game
mkdir -p /var/www/game
cd /var/www/game
unzip -o /root/deploy_full.zip
ls -la

echo ""
echo "步骤 3: 检查文件"
ls -la dist/ | head -5
ls -la server/

echo ""
echo "步骤 4: 安装后端依赖"
cd server
npm install --production

echo ""
echo "步骤 5: PM2 启动"
PORT=3333 pm2 start index.js --name game
pm2 save

echo ""
echo "步骤 6: 等待 5 秒"
sleep 5

echo ""
echo "======== 验证 ========"
pm2 list
echo ""
netstat -tulpn | grep :3333
echo ""
curl http://127.0.0.1:3333 2>&1 | head -10
echo "====================="
`;

    conn.exec(cmd, (err, stream) => {
        if (err) {
            console.error('执行错误:', err);
            conn.end();
            return;
        }

        let output = '';
        stream.on('data', d => {
            output += d.toString();
            process.stdout.write(d);
        });
        stream.stderr.on('data', d => process.stderr.write(d.toString()));

        stream.on('close', (code) => {
            console.log('\n==========================================');
            console.log('退出码:', code);

            if (output.includes('online') && output.includes(':3333')) {
                console.log('\n✓✓✓ 部署成功！');
                console.log('游戏地址: http://120.26.212.80:3333');
            } else {
                console.log('\n部署可能失败');
            }
            console.log('==========================================\n');
            conn.end();
        });
    });

}).on('error', err => {
    console.error('SSH 连接失败:', err.message);
}).connect(config);
