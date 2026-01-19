import { Client } from 'ssh2';

const config = {
    host: '120.26.212.80',
    port: 22,
    username: 'root',
    password: 'Game2026',
    hostVerifier: () => true
};

console.log('=== 完整诊断：逐步检查每个环节 ===\n');

const conn = new Client();
conn.on('ready', () => {
    const cmd = `
echo "1. 检查压缩包"
ls -lh /root/deploy_full.zip
file /root/deploy_full.zip

echo ""
echo "2. 测试解压"
cd /tmp
rm -rf test-extract
mkdir test-extract
cd test-extract
unzip -l /root/deploy_full.zip | head -20
unzip -o /root/deploy_full.zip
ls -la

echo ""
echo "3. 检查解压后的结构"
ls -la dist/ 2>&1 | head -10
ls -la server/ 2>&1 | head -10

echo ""
echo "4. 检查 server/index.js"
head -30 server/index.js 2>&1

echo ""
echo "5. 检查 server/package.json"
cat server/package.json 2>&1

echo ""
echo "6. 尝试安装依赖"
cd server
npm install --production 2>&1 | tail -20

echo ""
echo "7. 测试直接运行"
PORT=3333 timeout 3 node index.js 2>&1 &
sleep 2
netstat -tulpn | grep :3333
ps aux | grep "node index.js" | grep -v grep
`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('data', d => process.stdout.write(d.toString()));
        stream.stderr.on('data', d => process.stderr.write(d.toString()));
        stream.on('close', () => {
            console.log('\n=== 诊断完成 ===');
            conn.end();
        });
    });
}).on('error', e => console.error('SSH Error:', e))
    .connect(config);
