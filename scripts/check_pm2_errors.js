import { Client } from 'ssh2';

const config = {
    host: '120.26.212.80',
    port: 22,
    username: 'root',
    password: 'Game2026',
    hostVerifier: () => true
};

console.log('查看 PM2 启动失败的原因...\n');

const conn = new Client();
conn.on('ready', () => {
    const cmd = `
cd /var/www/game/server
echo "=== 当前目录 ==="
pwd
ls -la

echo ""
echo "=== 尝试直接运行 Node（查看错误）==="
PORT=3333 node index.js 2>&1 &
NODEPID=$!
echo "Node PID: $NODEPID"
sleep 3
ps aux | grep $NODEPID | grep -v grep || echo "进程已结束"
netstat -tulpn | grep :3333 || echo "端口未监听"
kill $NODEPID 2>/dev/null || true

echo ""
echo "=== 检查 PM2 错误日志 ==="
pm2 logs --err --lines 50 --nostream 2>&1 | tail -30
`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('data', d => process.stdout.write(d.toString()));
        stream.stderr.on('data', d => process.stderr.write(d.toString()));
        stream.on('close', () => {
            console.log('\n=== 检查完成 ===');
            conn.end();
        });
    });
}).on('error', e => console.error('SSH Error:', e))
    .connect(config);
