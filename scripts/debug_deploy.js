import { Client } from 'ssh2';

const config = {
    host: '120.26.212.80',
    port: 22,
    username: 'root',
    password: 'Game2026',
    hostVerifier: () => true
};

console.log('最小化调试部署（查看每一步的详细输出）...\n');

const conn = new Client();
conn.on('ready', () => {
    console.log('SSH 已连接\n');

    const cmd = `
cd /var/www/game/server || exit 1
echo "当前目录: $(pwd)"
echo ""
echo "=== 文件列表 ==="
ls -la
echo ""
echo "=== 检查 package.json ==="
cat package.json
echo ""
echo "=== 检查 node_modules ==="
ls node_modules 2>&1 | head -5 || echo "node_modules 不存在"
echo ""
echo "=== 安装依赖（如果需要）==="
npm install 2>&1 | tail -20
echo ""
echo "=== 测试直接运行 ==="
PORT=3333 timeout 3 node index.js 2>&1 &
NODEPID=$!
sleep 2
echo "Node PID: $NODEPID"
netstat -tulpn | grep :3333 || echo "端口未监听"
kill $NODEPID 2>/dev/null || true
echo ""
echo "=== 用 PM2 启动 ==="
pm2 delete game 2>/dev/null || true
PORT=3333 pm2 start index.js --name game 2>&1
pm2 save
sleep 2
echo ""
echo "=== 最终验证 ==="
pm2 list
netstat -tulpn | grep :3333
curl -I http://127.0.0.1:3333 2>&1 | head -5
`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('data', d => process.stdout.write(d.toString()));
        stream.stderr.on('data', d => process.stderr.write(d.toString()));
        stream.on('close', (code) => {
            console.log('\n退出码:', code);
            conn.end();
        });
    });
}).on('error', e => console.error('SSH Error:', e))
    .connect(config);
