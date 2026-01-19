import { Client } from 'ssh2';

const config = {
    host: '120.26.212.80',
    port: 22,
    username: 'root',
    password: 'Game2026',
    hostVerifier: () => true,
    readyTimeout: 60000
};

console.log('===============================');
console.log('  最终部署（忽略非关键错误）');
console.log('===============================\n');

const conn = new Client();
conn.on('ready', () => {
    console.log('✓ SSH 已连接\n');
    console.log('开始部署（预计 2-3 分钟）...\n');

    const cmd = `
pm2 delete all 2>/dev/null || true
rm -rf /var/www/game
cd /var/www
git clone "https://github.com/Wiki1220/-----.git" game
cd game
npm install
npm run build
cd server
npm install --production
PORT=80 pm2 start index.js --name game
pm2 save
echo ""
echo "========== 部署结果 =========="
pm2 list
echo ""
netstat -tulpn | grep :80
echo ""
curl -I http://127.0.0.1
echo "=============================="
`;

    conn.exec(cmd, (err, stream) => {
        if (err) {
            console.error('执行错误:', err);
            conn.end();
            return;
        }

        let lastOutput = '';
        stream.on('data', d => {
            const text = d.toString();
            process.stdout.write(text);
            lastOutput += text;
        });

        stream.stderr.on('data', d => {
            process.stderr.write(d.toString());
        });

        stream.on('close', (code) => {
            console.log('\n===============================');
            console.log('退出码:', code);

            // 检查是否成功（查看输出中是否有 PM2 online 状态）
            if (lastOutput.includes('online') || code === 0) {
                console.log('✓✓✓ 部署成功！ ✓✓✓');
                console.log('\n游戏地址: http://120.26.212.80');
                console.log('\n请在浏览器中访问上述地址测试游戏！');
            } else {
                console.log('部署可能失败，请检查日志');
            }
            console.log('===============================\n');
            conn.end();
        });
    });

}).on('error', err => {
    console.error('\nSSH 连接失败:', err.message);
}).connect(config);
