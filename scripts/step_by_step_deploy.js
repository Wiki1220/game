import { Client } from 'ssh2';

const config = {
    host: '120.26.212.80',
    port: 22,
    username: 'root',
    password: 'Game2026',
    hostVerifier: () => true
};

console.log('========================================');
console.log('  一步一步检查并修复');
console.log('========================================\n');

const conn = new Client();
conn.on('ready', () => {
    const cmd = `
echo "第 1 步：检查 zip 文件"
ls -lh /root/deploy_full.zip
file /root/deploy_full.zip

echo ""
echo "第 2 步：测试解压"
cd /tmp
rm -rf deploy-test
mkdir deploy-test
cd deploy-test
unzip -t /root/deploy_full.zip 2>&1 | tail -5
echo "解压测试结果: $?"

echo ""
echo "第 3 步：实际解压"
unzip -o /root/deploy_full.zip
ls -la

echo ""
echo "第 4 步：检查结构"
if [ -d "dist" ]; then
    echo "✓ dist 目录存在"
    ls dist/ | head -3
else
    echo "✗ dist 目录不存在"
fi

if [ -d "server" ]; then
    echo "✓ server 目录存在"
    ls server/
else
    echo "✗ server 目录不存在"
fi

echo ""
echo "第 5 步：移动到正式位置"
rm -rf /var/www/game
mkdir -p /var/www
mv /tmp/deploy-test /var/www/game
cd /var/www/game
pwd
ls -la

echo ""
echo "第 6 步：安装后端依赖"
cd server
npm install --production 2>&1 | tail -10

echo ""
echo "第 7 步：启动服务"
pm2 delete all || true
PORT=3333 pm2 start index.js --name game
pm2 save

echo ""
echo "第 8 步：验证"
sleep 3
pm2 list
netstat -tulpn | grep :3333
curl http://127.0.0.1:3333 2>&1 | head -5
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
            console.log('========================================\n');
            conn.end();
        });
    });

}).on('error', err => {
    console.error('SSH 连接失败:', err.message);
}).connect(config);
