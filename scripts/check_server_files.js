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
        console.log('检查服务器文件状态...\n');

        const cmd = [
            'echo "=== /var/www/game 目录内容 ==="',
            'ls -lh /var/www/game/',
            'echo ""',
            'echo "=== 检查 dist 目录 ==="',
            'ls /var/www/game/dist/ 2>&1 | head -10',
            'echo ""',
            'echo "=== 检查 server 目录 ==="',
            'ls -l /var/www/game/server/',
            'echo ""',
            'echo "=== 当前 PM2 进程 ==="',
            'pm2 list',
            'echo ""',
            'echo "=== PM2 日志(最后10行) ==="',
            'pm2 logs --lines 10 --nostream 2>&1 | tail -20'
        ].join(' && ');

        conn.exec(cmd, (err, stream) => {
            if (err) throw err;
            stream.on('close', () => {
                console.log('\n检查完成。');
                conn.end();
            })
                .on('data', d => process.stdout.write(d.toString()))
                .stderr.on('data', d => process.stderr.write(d.toString()));
        });
    }).on('error', e => console.error('SSH Error:', e))
        .connect(config);
};

run();
