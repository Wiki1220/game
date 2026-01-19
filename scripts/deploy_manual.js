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

console.log('=== 手动部署游戏 ===\n');

// 读取关键文件
const serverIndexJs = fs.readFileSync(path.join(projectRoot, 'server', 'index.js'), 'utf8');
const serverPackageJson = fs.readFileSync(path.join(projectRoot, 'server', 'package.json'), 'utf8');

// 读取 dist 目录中的 index.html
const distIndexHtml = fs.readFileSync(path.join(projectRoot, 'dist', 'index.html'), 'utf8');

// 读取 dist/assets 中的文件（只取前几个关键文件）
const distAssetsDir = path.join(projectRoot, 'dist', 'assets');
const assetFiles = fs.readdirSync(distAssetsDir).filter(f => f.endsWith('.js') || f.endsWith('.css'));

console.log('准备上传的文件：');
console.log('- server/index.js');
console.log('- server/package.json');
console.log('- dist/index.html');
console.log(`- ${assetFiles.length} 个 asset 文件\n`);

const conn = new Client();
conn.on('ready', () => {
    console.log('SSH 已连接\n');

    // 步骤 1: 创建目录结构
    const cmd1 = [
        'pm2 delete all || true',
        'rm -rf /var/www/game',
        'mkdir -p /var/www/game/server',
        'mkdir -p /var/www/game/dist/assets'
    ].join(' && ');

    conn.exec(cmd1, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => {
            console.log('✓ 目录结构已创建\n');

            // 步骤 2: 上传 server/index.js
            uploadFile(conn, '/var/www/game/server/index.js', serverIndexJs, () => {
                console.log('✓ server/index.js 已上传\n');

                // 步骤 3: 上传 server/package.json
                uploadFile(conn, '/var/www/game/server/package.json', serverPackageJson, () => {
                    console.log('✓ server/package.json 已上传\n');

                    // 步骤 4: 上传 dist/index.html
                    uploadFile(conn, '/var/www/game/dist/index.html', distIndexHtml, () => {
                        console.log('✓ dist/index.html 已上传\n');

                        // 步骤 5: 上传 assets
                        uploadAssets(conn, assetFiles, 0, () => {
                            console.log('\n✓ 所有文件已上传\n');

                            // 步骤 6: 安装依赖并启动
                            startGame(conn);
                        });
                    });
                });
            });
        }).on('data', d => process.stdout.write(d.toString()));
    });
}).on('error', e => console.error('SSH Error:', e))
    .connect(config);

function uploadFile(conn, remotePath, content, callback) {
    // 转义单引号
    const escapedContent = content.replace(/'/g, "'\\''");
    const cmd = `cat > '${remotePath}' << 'FILE_CONTENT_EOF'\n${content}\nFILE_CONTENT_EOF`;

    conn.exec(cmd, (err, stream) => {
        if (err) {
            console.error('上传失败:', remotePath, err);
            conn.end();
            return;
        }
        stream.on('close', callback);
    });
}

function uploadAssets(conn, files, index, callback) {
    if (index >= files.length) {
        callback();
        return;
    }

    const file = files[index];
    const localPath = path.join(projectRoot, 'dist', 'assets', file);
    const remotePath = `/var/www/game/dist/assets/${file}`;
    const content = fs.readFileSync(localPath, 'utf8');

    console.log(`上传 assets/${file}...`);
    uploadFile(conn, remotePath, content, () => {
        uploadAssets(conn, files, index + 1, callback);
    });
}

function startGame(conn) {
    console.log('安装依赖并启动游戏...\n');

    const cmd = [
        'cd /var/www/game/server',
        'npm install --production 2>&1 | tail -10',
        'echo ""',
        'PORT=80 pm2 start index.js --name game',
        'pm2 save',
        'echo ""',
        'echo "=== 部署成功 ==="',
        'pm2 list',
        'netstat -tulpn | grep :80',
        'echo ""',
        'curl -I http://127.0.0.1 2>&1 | head -5'
    ].join(' && ');

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => {
            console.log('\n=== 部署完成 ===');
            conn.end();
        })
            .on('data', d => process.stdout.write(d.toString()))
            .stderr.on('data', d => process.stderr.write(d.toString()));
    });
}
