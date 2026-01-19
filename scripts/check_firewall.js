import { Client } from 'ssh2';

const config = {
    host: '120.26.212.80',
    port: 22,
    username: 'root',
    password: 'Game2026',
    hostVerifier: () => true
};

console.log('检查服务器防火墙设置...\n');

const conn = new Client();
conn.on('ready', () => {
    const cmd = `
echo "=== UFW 状态 ==="
ufw status verbose 2>&1 || echo "UFW 未安装或未启用"

echo ""
echo "=== iptables 规则 ==="
iptables -L -n | grep 3333 || echo "无端口 3333 相关规则"

echo ""
echo "=== 所有监听端口 ==="
netstat -tulpn | grep LISTEN

echo ""
echo "=== 尝试开放端口 3333（如果 UFW 启用）==="
if ufw status | grep -q "Status: active"; then
    ufw allow 3333/tcp
    ufw status | grep 3333
fi
`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('data', d => process.stdout.write(d.toString()));
        stream.stderr.on('data', d => process.stderr.write(d.toString()));
        stream.on('close', () => {
            console.log('\n=== 检查完成 ===');
            console.log('\n如果是云服务器，请在控制台检查安全组：');
            console.log('1. 入站规则中确保有：TCP 3333 允许 0.0.0.0/0');
            console.log('2. 规则优先级要高于拒绝规则');
            console.log('3. 保存并应用规则\n');
            conn.end();
        });
    });
}).on('error', e => console.error('SSH Error:', e))
    .connect(config);
