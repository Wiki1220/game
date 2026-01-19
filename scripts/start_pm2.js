import { Client } from 'ssh2';

const config = {
    host: '120.26.212.80',
    port: 22,
    username: 'root',
    password: 'Game2026',
    hostVerifier: () => true
};

console.log('启动 PM2 管理服务...\n');

const conn = new Client();
conn.on('ready', () => {
    const cmd = `
echo ">>> 杀掉临时进程"
pkill -f "node index.js"
sleep 1

echo ""
echo ">>> 用 PM2 启动"
cd /var/www/game/server 2>/dev/null || cd /tmp/test-extract/server
PORT=3333 pm2 start index.js --name game
pm2 save

echo ""
echo ">>> 验证"
sleep 2
pm2 list
netstat -tulpn | grep :3333
curl -I http://127.0.0.1:3333 2>&1 | head -5
`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('data', d => process.stdout.write(d.toString()));
        stream.stderr.on('data', d => process.stderr.write(d.toString()));
        stream.on('close', () => {
            console.log('\n=== PM2 启动完成 ===');
            console.log('\n✓✓✓ 游戏地址: http://120.26.212.80:3333 ✓✓✓\n');
            conn.end();
        });
    });
}).on('error', e => console.error('SSH Error:', e))
    .connect(config);
