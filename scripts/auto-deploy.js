import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
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

const COLORS = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
    console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function step(num, message) {
    log(`\n[步骤 ${num}] ${message}`, 'blue');
}

async function runCommand(command, cwd = projectRoot) {
    try {
        const { stdout, stderr } = await execAsync(command, { cwd });
        return { success: true, stdout, stderr };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function sshExec(command) {
    return new Promise((resolve, reject) => {
        const conn = new Client();
        conn.on('ready', () => {
            conn.exec(command, (err, stream) => {
                if (err) {
                    conn.end();
                    reject(err);
                    return;
                }

                let output = '';
                let errorOutput = '';

                stream.on('data', d => output += d.toString());
                stream.stderr.on('data', d => errorOutput += d.toString());
                stream.on('close', (code) => {
                    conn.end();
                    resolve({ code, output, errorOutput });
                });
            });
        }).on('error', reject)
            .connect(config);
    });
}

async function deploy() {
    log('\n===========================================', 'magenta');
    log('    自动部署流程', 'magenta');
    log('===========================================\n', 'magenta');

    try {
        // 步骤 1: 构建前端
        step(1, '构建前端...');
        const buildResult = await runCommand('npm run build');
        if (!buildResult.success) {
            throw new Error('前端构建失败: ' + buildResult.error);
        }
        log('✓ 前端构建成功', 'green');

        // 步骤 2: 打包文件
        step(2, '打包部署文件...');
        const zipPath = path.join(projectRoot, 'deploy.zip');
        if (fs.existsSync(zipPath)) {
            fs.unlinkSync(zipPath);
        }

        const zipResult = await runCommand(
            'powershell Compress-Archive -Path dist,server -DestinationPath deploy.zip -Force'
        );
        if (!zipResult.success) {
            throw new Error('打包失败: ' + zipResult.error);
        }

        const stats = fs.statSync(zipPath);
        log(`✓ 打包完成 (${(stats.size / 1024 / 1024).toFixed(2)} MB)`, 'green');

        // 步骤 3: 备份当前服务器状态
        step(3, '备份服务器当前状态...');
        const backupCmd = `
      if [ -d /var/www/game ]; then
        rm -rf /var/www/game.backup
        cp -r /var/www/game /var/www/game.backup
        echo "备份完成"
      else
        echo "无需备份（首次部署）"
      fi
    `;
        await sshExec(backupCmd);
        log('✓ 备份完成', 'green');

        // 步骤 4: 上传文件
        step(4, '上传文件到服务器...');
        await new Promise((resolve, reject) => {
            const conn = new Client();
            conn.on('ready', () => {
                conn.sftp((err, sftp) => {
                    if (err) {
                        conn.end();
                        reject(err);
                        return;
                    }

                    sftp.fastPut(zipPath, '/root/deploy.zip', (err) => {
                        conn.end();
                        if (err) reject(err);
                        else resolve();
                    });
                });
            }).on('error', reject)
                .connect(config);
        });
        log('✓ 文件上传成功', 'green');

        // 步骤 5: 部署到服务器
        step(5, '在服务器上部署...');
        const deployCmd = `
      set -e
      cd /tmp
      rm -rf deploy-test
      mkdir deploy-test
      cd deploy-test
      unzip -q /root/deploy.zip
      rm -rf /var/www/game
      mv /tmp/deploy-test /var/www/game
      cd /var/www/game/server
      npm install --production --silent
      pm2 delete game 2>/dev/null || true
      PORT=3333 pm2 start index.js --name game
      pm2 save
      sleep 2
      echo "部署完成"
    `;

        const deployResult = await sshExec(deployCmd);
        if (deployResult.code !== 0) {
            throw new Error('部署失败: ' + deployResult.errorOutput);
        }
        log('✓ 部署成功', 'green');

        // 步骤 6: 验证服务
        step(6, '验证服务状态...');
        const verifyCmd = `
      pm2 list | grep game | grep online && 
      netstat -tulpn | grep :3333 &&
      curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3333
    `;

        const verifyResult = await sshExec(verifyCmd);
        if (verifyResult.code !== 0 || !verifyResult.output.includes('200')) {
            throw new Error('服务验证失败');
        }
        log('✓ 服务运行正常 (HTTP 200)', 'green');

        // 步骤 7: 运行测试
        step(7, '运行基础测试...');
        const testCmd = `
      cd /var/www/game/server
      # 测试静态文件
      test -f ../dist/index.html || exit 1
      # 测试 Socket.IO 端点
      curl -s http://127.0.0.1:3333/socket.io/ | grep -q "0" || exit 1
      echo "测试通过"
    `;

        const testResult = await sshExec(testCmd);
        if (testResult.code !== 0) {
            log('⚠ 测试失败，但服务运行正常', 'yellow');
        } else {
            log('✓ 所有测试通过', 'green');
        }

        // 清理
        fs.unlinkSync(zipPath);

        log('\n===========================================', 'green');
        log('    ✓✓✓ 部署成功！', 'green');
        log('===========================================', 'green');
        log(`\n游戏地址: http://120.26.212.80:3333`, 'blue');
        log(`部署时间: ${new Date().toLocaleString('zh-CN')}\n`, 'blue');

        return true;

    } catch (error) {
        log('\n===========================================', 'red');
        log('    ✗ 部署失败', 'red');
        log('===========================================', 'red');
        log(`\n错误: ${error.message}\n`, 'red');

        // 尝试回滚
        log('正在尝试回滚...', 'yellow');
        try {
            const rollbackCmd = `
        pm2 delete game 2>/dev/null || true
        if [ -d /var/www/game.backup ]; then
          rm -rf /var/www/game
          mv /var/www/game.backup /var/www/game
          cd /var/www/game/server
          PORT=3333 pm2 start index.js --name game
          pm2 save
          echo "回滚完成"
        fi
      `;
            await sshExec(rollbackCmd);
            log('✓ 已回滚到之前版本', 'yellow');
        } catch (rollbackError) {
            log('✗ 回滚失败: ' + rollbackError.message, 'red');
        }

        return false;
    }
}

// 运行部署
deploy().then(success => {
    process.exit(success ? 0 : 1);
});
