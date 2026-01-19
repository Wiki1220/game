import { Client } from 'ssh2';

const config = {
    host: '120.26.212.80',
    port: 22,
    username: 'root',
    password: 'Game2026',
    hostVerifier: () => true
};

console.log('检查上次部署的详细日志...\n');

const conn = new Client();
conn.on('ready', () => {
    const cmd = `
echo "=== 检查下载的文件 ==="
ls -lh /tmp/game-deploy.zip 2>&1 || echo "文件不存在"

echo ""
echo "=== 检查 /var/www/game 目录 ==="
ls -la /var/www/game/ 2>&1 || echo "目录不存在"

echo ""
echo "=== 检查 server 目录 ==="
ls -la /var/www/game/server/ 2>&1 || echo "server 目录不存在"

echo ""
echo "=== PM2 日志 ==="
pm2 logs game --lines 30 --nostream 2>&1 || echo "无 PM2 日志"

echo ""
echo "=== 尝试手动下载并部署 ==="
cd /tmp
rm -f game-deploy.zip game-deploy-test.zip
echo "下载测试..."
wget -O game-deploy-test.zip "https://airportal.cn/591452/N0l5Rr1muO" 2>&1 | tail -10
ls -lh game-deploy-test.zip 2>&1
`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('data', d => process.stdout.write(d.toString()));
        stream.stderr.on('data', d => process.stderr.write(d.toString()));
        stream.on('close', () => {
            console.log('\n检查完成');
            conn.end();
        });
    });
}).on('error', e => console.error('SSH Error:', e))
    .connect(config);
