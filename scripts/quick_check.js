import { Client } from 'ssh2';

const config = {
    host: '120.26.212.80',
    port: 22,
    username: 'root',
    password: 'Game2026',
    hostVerifier: () => true
};

console.log('简化检查...\n');

const conn = new Client();
conn.on('ready', () => {
    const cmd = `
pm2 list
echo ""
netstat -tulpn | grep :3333
echo ""
curl http://127.0.0.1:3333 2>&1 | head -20
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
            console.log('\n========== 分析结果 ==========');
            if (output.includes('online')) {
                console.log('✓ PM2 进程在线');
            } else {
                console.log('✗ PM2 进程不在线');
            }

            if (output.includes(':3333')) {
                console.log('✓ 端口 3333 正在监听');
            } else {
                console.log('✗ 端口 3333 未监听');
            }

            if (output.includes('<!DOCTYPE') || output.includes('<html')) {
                console.log('✓ 服务器返回 HTML（服务正常）');
                console.log('\n问题：服务器本地正常，但外部访问 502');
                console.log('可能原因：防火墙或安全组未正确配置端口 3333');
            } else if (output.includes('Connection refused')) {
                console.log('✗ 连接被拒绝（服务未运行）');
            } else {
                console.log('? 无法判断，请查看上面的输出');
            }
            console.log('==============================\n');
            conn.end();
        });
    });
}).on('error', e => console.error('SSH Error:', e))
    .connect(config);
