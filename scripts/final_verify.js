import { Client } from 'ssh2';

const config = {
    host: '120.26.212.80',
    port: 22,
    username: 'root',
    password: 'Game2026',
    hostVerifier: () => true
};

console.log('最终验证...\n');

const conn = new Client();
conn.on('ready', () => {
    const cmd = `
echo "=== systemd 服务状态 ==="
systemctl status xiangqi-game --no-pager | head -15

echo ""
echo "=== 端口监听 ==="
netstat -tulpn | grep :80

echo ""
echo "=== HTTP 测试 ==="
curl -v http://127.0.0.1 2>&1 | head -20

echo ""
echo "=== 进程列表 ==="
ps aux | grep "node.*index.js" | grep -v grep
`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => {
            console.log('\n验证完成');
            conn.end();
        })
            .on('data', d => process.stdout.write(d.toString()))
            .stderr.on('data', d => process.stderr.write(d.toString()));
    });
}).on('error', e => console.error('SSH Error:', e))
    .connect(config);
