import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

const config = {
    host: '120.26.212.80',
    port: 22,
    username: 'root',
    password: 'Game2026',
    hostVerifier: () => true
};

console.log('=== 通过 Base64 部署游戏 ===\n');

const run = () => {
    const conn = new Client();
    conn.on('ready', () => {
        console.log('SSH 已连接');

        // 读取 zip 文件并转为 base64
        const zipPath = path.join(projectRoot, 'deploy_full.zip');
        console.log('读取游戏包:', zipPath);

        const zipBuffer = fs.readFileSync(zipPath);
        const zipBase64 = zipBuffer.toString('base64');
        const zipSize = (zipBuffer.length / 1024 / 1024).toFixed(2);

        console.log(`游戏包大小: ${zipSize} MB`);
        console.log('Base64 编码长度:', zipBase64.length);
        console.log('上传并部署...\n');

        // 分块传输 base64 数据
        const chunkSize = 50000; // 每块 50KB
        const chunks = [];
        for (let i = 0; i < zipBase64.length; i += chunkSize) {
            chunks.push(zipBase64.substring(i, i + chunkSize));
        }

        console.log(`分为 ${chunks.length} 块传输\n`);

        // 先清空目标文件
        let cmd = 'rm -f /root/deploy.b64';

        conn.exec(cmd, (err, stream) => {
            stream.on('close', () => {
                uploadChunks(conn, chunks, 0);
            });
        });

    }).on('error', e => console.error('SSH Error:', e))
        .connect(config);
};

function uploadChunks(conn, chunks, index) {
    if (index >= chunks.length) {
        // 所有块上传完成，开始解码和部署
        deployGame(conn);
        return;
    }

    // 使用 echo 追加数据
    const chunk = chunks[index];
    const cmd = `echo -n "${chunk}" >> /root/deploy.b64`;

    conn.exec(cmd, (err, stream) => {
        if (err) {
            console.error('上传块失败:', err);
            conn.end();
            return;
        }
        stream.on('close', () => {
            if ((index + 1) % 10 === 0) {
                console.log(`已上传: ${index + 1}/${chunks.length} 块`);
            }
            uploadChunks(conn, chunks, index + 1);
        });
    });
}

function deployGame(conn) {
    console.log('\n所有数据块上传完成！');
    console.log('解码并部署...\n');

    const cmd = [
        'echo "=== 解码文件 ==="',
        'base64 -d /root/deploy.b64 > /root/deploy_full.zip',
        'ls -lh /root/deploy_full.zip',
        'echo ""',
        'echo "=== 清理旧部署 ==="',
        'pm2 delete all || true',
        'rm -rf /var/www/game/*',
        'mkdir -p /var/www/game',
        'echo ""',
        'echo "=== 解压游戏包 ==="',
        'cd /var/www/game',
        'unzip -o /root/deploy_full.zip',
        'echo ""',
        'echo "=== 检查文件 ==="',
        'ls -la /var/www/game/',
        'ls -la /var/www/game/dist/ | head -10',
        'ls -la /var/www/game/server/',
        'echo ""',
        'echo "=== 安装依赖 ==="',
        'cd /var/www/game/server',
        'npm install --production',
        'echo ""',
        'echo "=== 启动游戏 ==="',
        'PORT=80 pm2 start index.js --name game',
        'pm2 save',
        'echo ""',
        'echo "=== 验证部署 ==="',
        'pm2 list',
        'netstat -tulpn | grep :80',
        'echo ""',
        'curl -I http://127.0.0.1 2>&1 | head -5'
    ].join(' && ');

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code) => {
            console.log('\n=== 部署完成 ===');
            console.log('退出码:', code);
            conn.end();
        })
            .on('data', d => process.stdout.write(d.toString()))
            .stderr.on('data', d => process.stderr.write(d.toString()));
    });
}

run();
