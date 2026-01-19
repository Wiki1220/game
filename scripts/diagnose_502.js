import { Client } from 'ssh2';

const config = {
    host: '120.26.212.80',
    port: 22,
    username: 'root',
    password: 'Game2026',
    hostVerifier: () => true
};

console.log('诊断 502 错误...\n');

const conn = new Client();
conn.on('ready', () => {
    const cmd = `
echo "=== PM2 进程状态 ==="
pm2 list
echo ""
echo "=== PM2 日志（最后 30 行）==="
pm2 logs --lines 30 --nostream
echo ""
echo "=== 端口 80 监听状态 ==="
netstat -tulpn | grep :80
echo ""
echo "=== 检查游戏目录 ==="
ls -la /var/www/game/
echo ""
ls -la /var/www/game/server/
echo ""
echo "=== 测试本地访问 ==="
curl -v http://127.0.0.1 2>&1 | head -20
`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => {
            console.log('\n诊断完成');
            conn.end();
        })
            .on('data', d => process.stdout.write(d.toString()))
            .stderr.on('data', d => process.stderr.write(d.toString()));
    });
}).on('error', e => console.error('SSH Error:', e))
    .connect(config);
