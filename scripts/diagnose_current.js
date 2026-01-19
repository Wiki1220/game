import { Client } from 'ssh2';

const config = {
    host: '120.26.212.80',
    port: 22,
    username: 'root',
    password: 'Game2026',
    hostVerifier: () => true
};

const run = () => {
    const conn = new Client();
    conn.on('ready', () => {
        console.log('=== 服务器诊断 ===\n');

        const cmd = [
            'echo ">>> PM2 进程列表:"',
            'pm2 list',
            'echo ""',
            'echo ">>> 端口 80 监听状态:"',
            'netstat -tulpn | grep :80',
            'echo ""',
            'echo ">>> 文件上传状态:"',
            'ls -lh /var/www/game/',
            'echo ""',
            'echo ">>> PM2 日志 (最后 20 行):"',
            'pm2 logs --lines 20 --nostream',
            'echo ""',
            'echo ">>> 测试本地访问:"',
            'curl -I http://127.0.0.1 2>&1 | head -5'
        ].join(' && ');

        conn.exec(cmd, (err, stream) => {
            if (err) {
                console.error('执行错误:', err);
                conn.end();
                return;
            }
            stream.on('close', () => {
                console.log('\n=== 诊断完成 ===');
                conn.end();
            })
                .on('data', d => process.stdout.write(d.toString()))
                .stderr.on('data', d => process.stderr.write(d.toString()));
        });
    }).on('error', err => console.error('SSH 连接失败:', err))
        .connect(config);
};

run();
