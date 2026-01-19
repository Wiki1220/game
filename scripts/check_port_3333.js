import { Client } from 'ssh2';

const config = {
    host: '120.26.212.80',
    port: 22,
    username: 'root',
    password: 'Game2026',
    hostVerifier: () => true
};

console.log('检查端口 3333 状态...\n');

const conn = new Client();
conn.on('ready', () => {
    const cmd = `
echo "=== PM2 进程 ==="
pm2 list

echo ""
echo "=== 端口 3333 监听 ==="
netstat -tulpn | grep :3333

echo ""
echo "=== HTTP 测试 ==="
curl -I http://127.0.0.1:3333 2>&1 | head -10

echo ""
echo "=== 进程检查 ==="
ps aux | grep "node.*index.js" | grep -v grep
`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        let output = '';
        stream.on('data', d => {
            output += d.toString();
            process.stdout.write(d);
        });
        stream.stderr.on('data', d => {
            output += d.toString();
            process.stderr.write(d);
        });
        stream.on('close', () => {
            console.log('\n========== 检查结果 ==========');
            if (output.includes('online') && output.includes(':3333')) {
                console.log('✓✓✓ 成功！游戏运行在端口 3333');
                console.log('\n访问地址: http://120.26.212.80:3333\n');
            } else if (output.includes(':3333')) {
                console.log('✓ 端口 3333 正在监听');
                console.log('\n访问地址: http://120.26.212.80:3333\n');
            } else {
                console.log('✗ 服务未成功启动');
            }
            console.log('==============================\n');
            conn.end();
        });
    });
}).on('error', e => console.error('SSH Error:', e))
    .connect(config);
