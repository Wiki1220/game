import { Client } from 'ssh2';

const config = {
    host: '120.26.212.80',
    port: 22,
    username: 'root',
    password: 'Game2026',
    hostVerifier: () => true
};

console.log('检查详细错误信息...\n');

const conn = new Client();
conn.on('ready', () => {
    const cmd = `
echo "=== 检查 /var/www/game 目录是否存在 ==="
ls -la /var/www/ | grep game
echo ""
echo "=== 检查游戏目录内容 ==="
if [ -d "/var/www/game" ]; then
    ls -la /var/www/game/
    echo ""
    ls -la /var/www/game/server/ 2>&1 | head -10
    echo ""
    echo "=== 检查 server/index.js ==="
    head -5 /var/www/game/server/index.js
else
    echo "目录不存在！"
fi
echo ""
echo "=== PM2 状态 ==="
pm2 list
echo ""
echo "=== 尝试手动启动 ==="
cd /var/www/game/server 2>/dev/null && PORT=80 node index.js &
sleep 2
netstat -tulpn | grep :80
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
