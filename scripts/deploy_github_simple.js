import { Client } from 'ssh2';

const config = {
    host: '120.26.212.80',
    port: 22,
    username: 'root',
    password: 'Game2026',
    hostVerifier: () => true
};

const GITHUB_REPO = 'https://github.com/Wiki1220/-----';

console.log('=== 简化部署（从 GitHub）===\n');

const conn = new Client();
conn.on('ready', () => {
    console.log('SSH 已连接\n');

    const cmd = [
        'pm2 delete all || true',
        'rm -rf /var/www/game',
        'cd /var/www',
        `git clone ${GITHUB_REPO}.git game 2>&1 | tail -20`,
        'cd game',
        'ls -la',
        'echo ""',
        'echo "=== 安装前端依赖并构建 ==="',
        'npm install 2>&1 | tail -10',
        'npm run build 2>&1 | tail -10',
        'echo ""',
        'echo "=== 安装后端依赖 ==="',
        'cd server',
        'npm install --production 2>&1 | tail -5',
        'echo ""',
        'echo "=== 启动游戏 ==="',
        'PORT=80 pm2 start index.js --name game',
        'pm2 save',
        'pm2 list',
        'netstat -tulpn | grep :80'
    ].join(' && ');

    console.log('执行部署...\n');

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code) => {
            console.log('\n=== 退出码:', code, '===\n');
            conn.end();
        })
            .on('data', d => process.stdout.write(d.toString()))
            .stderr.on('data', d => process.stderr.write(d.toString()));
    });
}).on('error', e => console.error('SSH Error:', e))
    .connect(config);
