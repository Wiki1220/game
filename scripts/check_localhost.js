import { Client } from 'ssh2';

const config = {
    host: '120.26.212.80',
    port: 22,
    username: 'root',
    password: 'Game2026',
    hostVerifier: () => true
};

console.log('检查服务器本地回环访问...\n');

const conn = new Client();
conn.on('ready', () => {
    const cmd = `
echo "=== PM2 状态 ==="
pm2 list

echo ""
echo "=== 端口监听 ==="
netstat -tulpn | grep :3333

echo ""
echo "=== 进程检查 ==="
ps aux | grep "node.*index.js" | grep -v grep

echo ""
echo "=== 测试 127.0.0.1:3333（HTTP 头）==="
curl -v -I http://127.0.0.1:3333 2>&1

echo ""
echo "=== 测试 127.0.0.1:3333（完整响应）==="
curl -v http://127.0.0.1:3333 2>&1 | head -50

echo ""
echo "=== PM2 日志（最后 20 行）==="
pm2 logs game --lines 20 --nostream 2>&1 || echo "无日志"
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
