import { Client } from 'ssh2';
import { exec } from 'child_process';
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

console.log('开始最终部署...\n');
console.log('步骤 1: 压缩本地文件...');

// 确保 deploy_full.zip 已经存在（之前创建的）
const zipPath = path.join(projectRoot, 'deploy_full.zip');
console.log(`使用现有压缩包: ${zipPath}\n`);

console.log('步骤 2: 通过 SSH 上传并部署...');

const conn = new Client();
conn.on('ready', () => {
    console.log('SSH 连接成功！');

    conn.sftp((err, sftp) => {
        if (err) {
            console.error('SFTP 错误:', err);
            conn.end();
            return;
        }

        console.log('上传游戏包到服务器...');
        const remotePath = '/root/deploy_full.zip';

        sftp.fastPut(zipPath, remotePath, (err) => {
            if (err) {
                console.error('上传失败:', err);
                conn.end();
                return;
            }

            console.log('上传成功！开始部署...\n');

            const cmd = [
                'echo "=== 清理旧文件 ==="',
                'pm2 delete all || true',
                'rm -rf /var/www/game/*',
                'mkdir -p /var/www/game',
                'echo "=== 解压游戏包 ==="',
                'unzip -o /root/deploy_full.zip -d /var/www/game',
                'echo "=== 文件列表 ==="',
                'ls -R /var/www/game | head -30',
                'echo "=== 安装依赖 ==="',
                'cd /var/www/game/server',
                'npm install --production 2>&1 | tail -5',
                'echo "=== 启动游戏 ==="',
                'PORT=80 pm2 start index.js --name game',
                'pm2 save',
                'echo ""',
                'echo "=== 部署完成 ==="',
                'pm2 list',
                'netstat -tulpn | grep :80'
            ].join(' && ');

            conn.exec(cmd, (err, stream) => {
                if (err) throw err;
                stream.on('close', (code) => {
                    console.log('\n部署脚本执行完成，退出码:', code);
                    conn.end();
                })
                    .on('data', d => process.stdout.write(d.toString()))
                    .stderr.on('data', d => process.stderr.write(d.toString()));
            });
        });
    });
}).on('error', e => console.error('SSH 连接失败:', e))
    .connect(config);
