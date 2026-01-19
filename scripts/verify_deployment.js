import { Client } from 'ssh2';

const config = {
    host: '120.26.212.80',
    port: 22,
    username: 'root',
    password: 'Game2026',
    hostVerifier: () => true
};

console.log('验证部署状态...\n');

const conn = new Client();
conn.on('ready', () => {
    const cmd = `
echo "=== PM2 状态 ==="
pm2 list
echo ""
echo "=== 端口监听 ==="
netstat -tulpn | grep :80
echo ""
echo "=== HTTP 响应 ==="
curl -I http://127.0.0.1 2>&1 | head -5
echo ""
echo "=== 游戏文件检查 ==="
ls -la /var/www/game/dist/ | head -5
ls -la /var/www/game/dist/assets/ | head -3
`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => {
            console.log('\n验证完成！');
            conn.end();
        })
            .on('data', d => process.stdout.write(d.toString()))
            .stderr.on('data', d => process.stderr.write(d.toString()));
    });
}).on('error', e => console.error('SSH Error:', e))
    .connect(config);
