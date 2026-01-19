import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// 需要保留的脚本（生产部署需要）
const keepScripts = [
    'step_by_step_deploy.js',  // 最终成功的部署脚本
    'quick_check.js',          // 快速状态检查
];

// 需要删除的文件类型
const filesToDelete = {
    scripts: [
        'check_deploy_logs.js',
        'check_deploy_status.js',
        'check_firewall.js',
        'check_game_dir.js',
        'check_localhost.js',
        'check_pm2_errors.js',
        'check_port_3333.js',
        'check_server_files.js',
        'clean_deploy_3333.js',
        'cleanup_debug.js',
        'debug_deploy.js',
        'deep_diagnose.js',
        'deploy.js',  // 旧版本
        'deploy_base64.js',
        'deploy_correct_repo.js',
        'deploy_existing_zip.js',
        'deploy_final_fix.js',
        'deploy_from_github.js',
        'deploy_from_url.js',
        'deploy_game_final.js',
        'deploy_github_final.js',
        'deploy_github_simple.js',
        'deploy_manual.js',
        'deploy_onetime.js',
        'deploy_port_3333.js',
        'deploy_simple.js',
        'deploy_zip.js',
        'diagnose_502.js',
        'diagnose_current.js',
        'final_deploy.js',
        'final_fix.js',
        'final_setup.js',
        'final_verify.js',
        'full_diagnostic.js',
        'pm2_takeover.js',
        'redeploy.js',
        'redeploy_full.js',
        'setup_server.js',
        'start_pm2.js',
        'start_upload_server.js',
        'start_with_systemd.js',
        'test_connection.js',
        'test_git_clone.js',
        'verify_deployment.js'
    ],
    root: [
        'deploy_full.zip',
        'dist.zip',
        'game-deploy.zip',
        'ACCESS_GUIDE.md',
        'DEPLOYMENT_ISSUES.md',
        'DEPLOY_README.md',
        'GITHUB_DEPLOY.md'
    ]
};

console.log('开始清理项目...\n');

let deleted = 0;
let failed = 0;

// 删除 scripts 目录下的文件
filesToDelete.scripts.forEach(file => {
    const filePath = path.join(projectRoot, 'scripts', file);
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`✓ 已删除: scripts/${file}`);
            deleted++;
        }
    } catch (err) {
        console.error(`✗ 删除失败: scripts/${file}`, err.message);
        failed++;
    }
});

// 删除根目录文件
filesToDelete.root.forEach(file => {
    const filePath = path.join(projectRoot, file);
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`✓ 已删除: ${file}`);
            deleted++;
        }
    } catch (err) {
        console.error(`✗ 删除失败: ${file}`, err.message);
        failed++;
    }
});

console.log(`\n清理完成：`);
console.log(`  成功删除: ${deleted} 个文件`);
console.log(`  失败: ${failed} 个文件`);
console.log(`\n保留的脚本：`);
keepScripts.forEach(script => console.log(`  - scripts/${script}`));
