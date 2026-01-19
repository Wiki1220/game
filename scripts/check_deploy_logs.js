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
echo "=== 检查 npm 错误日志 ==="
ls -la /var/www/game/npm-debug.log* 2>/dev/null || echo "无 npm 错误日志"
ls -la /var/www/game/server/npm-debug.log* 2>/dev/null || echo "无 server npm 错误日志"

echo ""
echo "=== 检查 PM2 日志目录 ==="
ls -la /root/.pm2/logs/ 2>/dev/null | tail -10

echo ""
echo "=== 尝试手动启动游戏 ==="
cd /var/www/game/server
echo "当前目录: $(pwd)"
echo "文件列表:"
ls -la
echo ""
echo "尝试直接运行 node:"
PORT=80 node index.js 2>&1 &
sleep 3
netstat -tulpn | grep :80
ps aux | grep "node index.js"
`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => {
            console.log('\n检查完成');
            conn.end();
        })
            .on('data', d => process.stdout.write(d.toString()))
            .stderr.on('data', d => process.stderr.write(d.toString()));
    });
}).on('error', e => console.error('SSH Error:', e))
    .connect(config);
