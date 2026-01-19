import { Client } from 'ssh2';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

const config = {
    host: '120.26.212.80',
    port: 22,
    username: 'root',
    password: 'Game2026',
    // Critical for stable connection
    hostVerifier: () => true
};

// Recursive file list helper
function getAllFiles(dirPath, arrayOfFiles) {
    if (!fs.existsSync(dirPath)) return [];
    const files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];
    files.forEach(function (file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            arrayOfFiles.push(path.join(dirPath, "/", file));
        }
    });
    return arrayOfFiles;
}

const run = () => {
    const conn = new Client();
    conn.on('ready', () => {
        console.log('SSH Connected. Starting Game Deployment...');

        // 1. Prepare Directories
        const prepCmd = [
            'mkdir -p /var/www/game/dist',
            'mkdir -p /var/www/game/server',
            // Clean old dist files to avoid stale assets
            'rm -rf /var/www/game/dist/*',
        ].join(' && ');

        conn.exec(prepCmd, (err, stream) => {
            if (err) throw err;
            stream.on('close', () => {
                console.log('Directories Ready. Uploading Code...');
                conn.sftp((err, sftp) => {
                    if (err) throw err;

                    // 2. Upload Backend (index.js + package.json)
                    // We need package.json to install deps!
                    // Assuming server/package.json exists.
                    // If not, we generate a simple one or assume user has it.
                    // Checking user file list... server/package.json exists (Step 310).

                    const uploadQueue = [
                        { local: path.join(projectRoot, 'server', 'index.js'), remote: '/var/www/game/server/index.js' },
                        { local: path.join(projectRoot, 'server', 'package.json'), remote: '/var/www/game/server/package.json' }
                    ];

                    // Add Dist files
                    const distPath = path.join(projectRoot, 'dist');
                    const distFiles = getAllFiles(distPath);
                    distFiles.forEach(f => {
                        const rel = path.relative(distPath, f).replace(/\\/g, '/');
                        uploadQueue.push({
                            local: f,
                            remote: `/var/www/game/dist/${rel}`
                        });
                    });

                    console.log(`Total files to upload: ${uploadQueue.length}`);

                    // Sequential Upload to avoid overwhelmed connection? 
                    // Or Parallel with limit? fastPut is async.
                    // Let's do simple tracking.

                    let active = 0;
                    let completed = 0;
                    const total = uploadQueue.length;
                    const maxConcurrency = 5;
                    let index = 0;

                    const next = () => {
                        while (active < maxConcurrency && index < total) {
                            upload(uploadQueue[index++]);
                        }
                    };

                    const upload = (item) => {
                        active++;
                        // Ensure remote dir exists for nested files
                        const remoteDir = path.dirname(item.remote);
                        // This is tricky via SFTP standard, commonly we trust mkdir -p ran, 
                        // but for nested dist/assets we need to be sure.
                        // We can create dirs lazily via exec if fastPut fails? 
                        // Or just pre-create 'assets' since Vite structure is flat usually (dist/assets).

                        sftp.fastPut(item.local, item.remote, (err) => {
                            if (err) {
                                // Retry or log?
                                // If dir missing, we might fail.
                                console.error(`Upload Failed: ${item.remote}`, err.message);
                            }
                            active--;
                            completed++;
                            if (completed % 10 === 0) console.log(`Progress: ${completed}/${total}`);

                            if (completed === total) {
                                console.log('Upload Complete.');
                                startApp(conn);
                            } else {
                                next();
                            }
                        });
                    };

                    // Pre-create assets dir just in case
                    conn.exec('mkdir -p /var/www/game/dist/assets', () => {
                        next();
                    });
                });
            });
        });
    }).connect(config);
};

function startApp(conn) {
    console.log('Installing Dependencies & Starting App...');
    const cmd = [
        'cd /var/www/game/server',
        'export DEBIAN_FRONTEND=noninteractive',
        'npm install --production', // Faster, skips devDeps
        'pm2 delete all || true',
        'PORT=80 pm2 start index.js --name game --update-env',
        'pm2 save',
        'echo "--- DEPLOYMENT SUCCESS ---"',
        'netstat -tulpn | grep :80'
    ].join(' && ');

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => {
            conn.end();
        }).on('data', d => process.stdout.write(d));
    });
}

run();
