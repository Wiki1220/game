import { Client } from 'ssh2';

const config = {
    host: '120.26.212.80',
    port: 22,
    username: 'root',
    password: 'Game2026',
    hostVerifier: () => true
};

console.log('测试 Git Clone...\n');

const conn = new Client();
conn.on('ready', () => {
    console.log('SSH 已连接\n');

    const testCmd = `
cd /tmp
rm -rf test-clone
echo "尝试克隆仓库..."
git clone "https://github.com/Wiki1220/-----.git" test-clone 2>&1
echo "结果:"
ls -la test-clone 2>&1 | head -10
`;

    conn.exec(testCmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code) => {
            console.log('\n退出码:', code, '\n');
            conn.end();
        })
            .on('data', d => process.stdout.write(d.toString()))
            .stderr.on('data', d => process.stderr.write(d.toString()));
    });
}).on('error', e => console.error('SSH Error:', e))
    .connect(config);
