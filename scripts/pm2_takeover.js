import { Client } from 'ssh2';

const config = {
    host: '120.26.212.80',
    port: 22,
    username: 'root',
    password: 'Game2026',
    hostVerifier: () => true
};

console.log('检查手动启动的进程并用 PM2 接管...\n');

const conn = new Client();
conn.on('ready', () => {
    const cmd = `
echo "=== 检查当前运行的 node 进程 ==="
ps aux | grep "node index.js" | grep -v grep

echo ""
echo "=== 测试访问 ==="
curl -I http://127.0.0.1 2>&1 | head -5

echo ""
echo "=== 杀死手动进程 ==="
pkill -f "node index.js"
sleep 1

echo ""
echo "=== 用 PM2 启动 ==="
cd /var/www/game/server
PORT=80 pm2 start index.js --name game
pm2 save
sleep 2

echo ""
echo "=== 验证 PM2 进程 ==="
pm2 list

echo ""
echo "=== 验证端口监听 ==="
netstat -tulpn | grep :80

echo ""
echo "=== 最终测试 ==="
curl -I http://127.0.0.1 2>&1 | head -5
`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code) => {
            console.log('\n退出码:', code);
            if (code === 0) {
                console.log('\n✓ PM2 启动成功！');
                console.log('请访问: http://120.26.212.80\n');
            }
            conn.end();
        })
            .on('data', d => process.stdout.write(d.toString()))
            .stderr.on('data', d => process.stderr.write(d.toString()));
    });
}).on('error', e => console.error('SSH Error:', e))
    .connect(config);
