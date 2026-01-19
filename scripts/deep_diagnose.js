import { Client } from 'ssh2';

const config = {
    host: '120.26.212.80',
    port: 22,
    username: 'root',
    password: 'Game2026',
    hostVerifier: () => true
};

console.log('深度诊断 - 查找服务启动失败的真正原因...\n');

const conn = new Client();
conn.on('ready', () => {
    const cmd = `
echo "=== 1. 检查 systemd 服务日志 ==="
journalctl -u xiangqi-game --no-pager -n 50 | tail -30

echo ""
echo "=== 2. 检查/var/www/game/server 目录权限 ==="
ls -la /var/www/game/server/

echo ""
echo "=== 3. 检查 node_modules 是否存在 ==="
ls /var/www/game/server/node_modules/ | head -10

echo ""
echo "=== 4. 直接运行 node 看错误 ==="
cd /var/www/game/server
PORT=80 timeout 5 node index.js 2>&1 || echo "启动失败或超时"

echo ""
echo "=== 5. 检查端口是否被占用 ==="
netstat -tulpn | grep :80

echo ""
echo "=== 6. 测试 require 主要模块 ==="
node -e "require('express'); console.log('Express OK')" 2>&1 || echo "Express 加载失败"
node -e "require('socket.io'); console.log('Socket.IO OK')" 2>&1 || echo "Socket.IO 加载失败"
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
            console.log('\n========== 诊断完成 ==========\n');

            // 分析输出找出问题
            if (output.includes('EACCES')) {
                console.log('❌ 问题：权限不足（无法绑定端口 80）');
                console.log('解决方案：作为 root 用户运行或使用其他端口');
            } else if (output.includes('EADDRINUSE')) {
                console.log('❌ 问题：端口已被占用');
            } else if (output.includes('Cannot find module')) {
                console.log('❌ 问题：缺少依赖模块');
                console.log('解决方案：重新运行 npm install');
            } else if (output.includes('SyntaxError')) {
                console.log('❌ 问题：代码语法错误');
            } else {
                console.log('❓ 问题不明确，请查看上面的日志');
            }

            conn.end();
        });
    });
}).on('error', e => console.error('SSH Error:', e))
    .connect(config);
