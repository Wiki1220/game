import { Client } from 'ssh2';

const config = {
    host: '120.26.212.80',
    port: 22,
    username: 'root',
    password: 'Game2026',
    hostVerifier: () => true
};

console.log('使用 systemd 服务启动游戏（绕过 PM2）...\n');

const conn = new Client();
conn.on('ready', () => {
    // 创建 systemd 服务文件
    const serviceContent = `[Unit]
Description=Xiangqi Game Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/game/server
Environment=PORT=80
ExecStart=/usr/bin/node /var/www/game/server/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target`;

    const cmd = `
echo "=== 停止所有旧进程 ==="
pm2 delete all || true
pkill -f "node index.js" || true
systemctl stop xiangqi-game || true

echo ""
echo "=== 创建 systemd 服务 ==="
cat > /etc/systemd/system/xiangqi-game.service << 'EOF'
${serviceContent}
EOF

echo ""
echo "=== 重新加载 systemd ==="
systemctl daemon-reload

echo ""
echo "=== 启动服务 ==="
systemctl start xiangqi-game

echo ""
echo "=== 设置开机自启 ==="
systemctl enable xiangqi-game

echo ""
echo "=== 等待服务启动 ==="
sleep 3

echo ""
echo "=== 检查服务状态 ==="
systemctl status xiangqi-game --no-pager

echo ""
echo "=== 检查端口 ==="
netstat -tulpn | grep :80

echo ""
echo "=== 测试访问 ==="
curl -I http://127.0.0.1 2>&1 | head -5
`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code) => {
            console.log('\n====================');
            console.log('退出码:', code);
            if (code === 0) {
                console.log('\n✓✓✓ 服务启动成功！✓✓✓');
                console.log('\n游戏地址: http://120.26.212.80');
                console.log('\n服务管理命令:');
                console.log('- 查看状态: systemctl status xiangqi-game');
                console.log('- 重启服务: systemctl restart xiangqi-game');
                console.log('- 查看日志: journalctl -u xiangqi-game -f');
            }
            console.log('====================\n');
            conn.end();
        })
            .on('data', d => process.stdout.write(d.toString()))
            .stderr.on('data', d => process.stderr.write(d.toString()));
    });
}).on('error', e => console.error('SSH Error:', e))
    .connect(config);
