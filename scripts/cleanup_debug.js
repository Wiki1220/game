import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

const filesToDelete = [
    'scripts/check_status.js',
    'scripts/check_url.js',
    'scripts/check_error_log.js',
    'scripts/check_pm2_log.js',
    'scripts/switch_to_3001.js',
    'scripts/check_firewall.js',
    'scripts/verify_local_curl.js',
    'scripts/deploy_simple_proxy.js',
    'scripts/manual_diag.js',
    'scripts/min_diag.js',
    'scripts/direct_switch.js',
    'scripts/check_new_server.js',
    'scripts/deploy_test_hello.js',
    'server/test_hello.js',
    'scripts/verify_remote_hello.js',
    'scripts/deploy_emergency.js',
    'scripts/test_ssh_conn.js',
    'scripts/check_final_status.js',
    'scripts/fix_502.js',
    'scripts/fix_permissions.js',
    'scripts/fix_server.js',
    'scripts/force_debug.js',
    'scripts/force_debug_step.js',
    'scripts/force_start_app.js',
    'scripts/reboot_server.js',
    'scripts/post_reboot_start.js',
    'scripts/reset_nginx_static.js',
    'scripts/debug_fs.js',
    'scripts/debug_internal_curl.js',
    'scripts/debug_nginx.js',
    'scripts/debug_path_perms.js',
    'scripts/diagnose_server.js',
    'scripts/bypass_nginx.js',
    'scripts/check_port_80.js',
    'scripts/deploy_new_server.js', // Replaced by final
    'scripts/final_deploy_fix.js', // Obsolete
    'nginx.simple.conf',
    'nginx.game.conf',
    'server/test_http.js'
];

console.log('Cleaning up debug scripts...');

filesToDelete.forEach(file => {
    const fullPath = path.join(projectRoot, file);
    if (fs.existsSync(fullPath)) {
        try {
            fs.unlinkSync(fullPath);
            console.log(`Deleted: ${file}`);
        } catch (e) {
            console.error(`Failed to delete ${file}:`, e.message);
        }
    } else {
        // console.log(`Skipped (Not Found): ${file}`);
    }
});

console.log('Cleanup Complete.');
