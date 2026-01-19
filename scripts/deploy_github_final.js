import { Client } from 'ssh2';

const config = {
    host: '120.26.212.80',
    port: 22,
    username: 'root',
    password: 'Game2026',
    hostVerifier: () => true
};

console.log('=== 从 GitHub 部署游戏（最终版）===\n');

const conn = new Client();
conn.on('ready', () => {
    console.log('SSH 已连接\n');

    // 分步执行，便于调试
    console.log('步骤 1: 停止旧服务并清理...');
    conn.exec('pm2 delete all || true', (err, s1) => {
        s1.on('close', () => {
            console.log('步骤 2: 清理目录...');
            conn.exec('rm -rf /var/www/game', (err, s2) => {
                s2.on('close', () => {
                    console.log('步骤 3: 克隆代码仓库...\n');
                    const cloneCmd = 'cd /var/www && git clone "https://github.com/Wiki1220/-----.git" game';

                    conn.exec(cloneCmd, (err, s3) => {
                        if (err) throw err;
                        let output = '';
                        s3.on('data', d => {
                            output += d.toString();
                            process.stdout.write(d);
                        });
                        s3.stderr.on('data', d => {
                            output += d.toString();
                            process.stderr.write(d);
                        });
                        s3.on('close', (code) => {
                            if (code !== 0) {
                                console.log('\n克隆失败，退出码:', code);
                                conn.end();
                                return;
                            }

                            console.log('\n✓ 代码克隆成功\n');
                            console.log('步骤 4: 安装依赖并构建...\n');

                            const buildCmd = [
                                'cd /var/www/game',
                                'npm install',
                                'npm run build',
                                'cd server',
                                'npm install --production',
                                'PORT=80 pm2 start index.js --name game',
                                'pm2 save',
                                'echo ""',
                                'echo "=== 部署完成 ==="',
                                'pm2 list',
                                'netstat -tulpn | grep :80'
                            ].join(' && ');

                            conn.exec(buildCmd, (err, s4) => {
                                if (err) throw err;
                                s4.on('close', (code) => {
                                    console.log('\n\n=== 最终退出码:', code, '===');
                                    if (code === 0) {
                                        console.log('\n✓✓✓ 部署成功！✓✓✓');
                                        console.log('游戏地址: http://120.26.212.80\n');
                                    }
                                    conn.end();
                                })
                                    .on('data', d => process.stdout.write(d.toString()))
                                    .stderr.on('data', d => process.stderr.write(d.toString()));
                            });
                        });
                    });
                });
            });
        });
    });
}).on('error', e => console.error('SSH Error:', e))
    .connect(config);
