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

console.log('=== 最简化部署 ===\n');

// 读取并编码关键文件为 base64
const files = {
    '/var/www/game/server/index.js': fs.readFileSync(path.join(projectRoot, 'server', 'index.js')),
    '/var/www/game/server/package.json': fs.readFileSync(path.join(projectRoot, 'server', 'package.json')),
    '/var/www/game/dist/index.html': fs.readFileSync(path.join(projectRoot, 'dist', 'index.html'))
};

// 读取 assets
const assetsDir = path.join(projectRoot, 'dist', 'assets');
const assetFiles = fs.readdirSync(assetsDir);
assetFiles.forEach(file => {
    const fullPath = path.join(assetsDir, file);
    if (fs.statSync(fullPath).isFile()) {
        files[`/var/www/game/dist/assets/${file}`] = fs.readFileSync(fullPath);
    }
});

console.log(`准备上传 ${Object.keys(files).length} 个文件\n`);

const conn = new Client();
conn.on('ready', () => {
    console.log('SSH 已连接\n');

    // 准备所有文件的 base64 命令
    let setupCommands = [
        'pm2 delete all || true',
        'rm -rf /var/www/game',
        'mkdir -p /var/www/game/server',
        'mkdir -p /var/www/game/dist/assets'
    ];

    // 为每个文件生成 base64 解码命令
    for (const [remotePath, content] of Object.entries(files)) {
        const b64 = content.toString('base64');
        setupCommands.push(`echo "${b64}" | base64 -d > ${remotePath}`);
    }

    // 添加部署命令
    setupCommands = setupCommands.concat([
        'cd /var/www/game/server',
        'npm install --production 2>&1 | tail -5',
        'PORT=80 pm2 start index.js --name game',
        'pm2 save',
        'echo ""',
        'echo "=== 部署完成 ==="',
        'pm2 list',
        'netstat -tulpn | grep :80',
        'echo ""',
        'curl -I http://127.0.0.1'
    ]);

    const finalCmd = setupCommands.join(' && ');

    console.log('执行部署...\n');

    conn.exec(finalCmd, { maxBuffer: 10 * 1024 * 1024 }, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code) => {
            console.log('\n退出码:', code);
            if (code === 0) {
                console.log('\n✓ 部署成功！');
            } else {
                console.log('\n✗ 部署失败');
            }
            conn.end();
        })
            .on('data', d => process.stdout.write(d.toString()))
            .stderr.on('data', d => process.stderr.write(d.toString()));
    });
}).on('error', e => console.error('SSH Error:', e))
    .connect(config);
