import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

const config = {
    host: '120.55.247.13',
    port: 22,
    username: 'root',
    password: 'Game2026'
};

const REMOTE_ROOT = '/var/www/game';

const getAllFiles = (dirPath, arrayOfFiles) => {
    if (!fs.existsSync(dirPath)) return arrayOfFiles || [];
    const files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];
    files.forEach((file) => {
        if (fs.statSync(path.join(dirPath, file)).isDirectory()) {
            arrayOfFiles = getAllFiles(path.join(dirPath, file), arrayOfFiles);
        } else {
            arrayOfFiles.push(path.join(dirPath, file));
        }
    });
    return arrayOfFiles;
};

const runDeploy = () => {
    const conn = new Client();
    console.log('Connecting...');

    conn.on('ready', () => {
        console.log('SSH Ready.');
        conn.sftp((err, sftp) => {
            if (err) throw err;

            // Prepare Lists
            const uploadList = [];
            const dirSet = new Set();

            const addForUpload = (localBase, remoteSub) => {
                const files = getAllFiles(localBase);
                files.forEach(f => {
                    if (f.includes('node_modules')) return;
                    const rel = path.relative(localBase, f);
                    const remote = path.posix.join(REMOTE_ROOT, remoteSub, rel.replace(/\\/g, '/'));
                    uploadList.push({ local: f, remote });

                    // Add all parent dirs
                    let d = path.posix.dirname(remote);
                    while (d !== '/' && d !== '.' && d.length > 5) { // Stop at root or short paths to avoid system dirs
                        dirSet.add(d);
                        d = path.posix.dirname(d);
                    }
                });
            };

            addForUpload(path.join(projectRoot, 'dist'), 'dist');
            addForUpload(path.join(projectRoot, 'server'), 'server');

            // Nginx
            uploadList.push({ local: path.join(projectRoot, 'nginx.game.conf'), remote: '/etc/nginx/sites-available/game' });

            const sortedDirs = Array.from(dirSet).sort((a, b) => a.length - b.length);

            // 1. Mkdir Loop (Serial, SFTP)
            const ensureDir = (i) => {
                if (i >= sortedDirs.length) {
                    console.log('Dirs ready. Uploading...');
                    uploadFiles(0);
                    return;
                }
                const dir = sortedDirs[i];
                sftp.stat(dir, (err, stats) => {
                    if (err || !stats) {
                        // Doesn't exist, create
                        sftp.mkdir(dir, (err) => {
                            if (err && err.code !== 4) { // 4 is failure, ignore if exists? Stat check should prevent.
                                console.log(`Mkdir ${dir} exists/err?`, err.code);
                            }
                            ensureDir(i + 1);
                        });
                    } else {
                        ensureDir(i + 1);
                    }
                });
            };

            // 2. Upload Loop (Serial, SFTP)
            const uploadFiles = (i) => {
                if (i >= uploadList.length) {
                    console.log('\nUploads done.');
                    sftp.end(); // Setup for exec
                    runFinalCommands(conn);
                    return;
                }
                const current = uploadList[i];
                const label = path.basename(current.remote);
                process.stdout.write(`Up: ${label}                   \r`);

                sftp.fastPut(current.local, current.remote, (err) => {
                    if (err) console.error('\nErr:', current.remote, err.message);
                    uploadFiles(i + 1);
                });
            };

            console.log(`Checking ${sortedDirs.length} directories...`);
            ensureDir(0);
        });
    }).on('error', e => console.error(e)).connect(config);
};

const runFinalCommands = (conn) => {
    // Commands to finalize
    const commands = [
        'npm install -g pm2',
        'export PATH=$PATH:/usr/bin:/usr/local/bin',
        'ln -sf /etc/nginx/sites-available/game /etc/nginx/sites-enabled/',
        'rm -f /etc/nginx/sites-enabled/default',
        'nginx -t && systemctl restart nginx',
        'cd /var/www/game/server && npm install --production',
        'pm2 stop game || true',
        'pm2 delete game || true',
        'cd /var/www/game/server && pm2 start index.js --name game',
        'pm2 save'
    ];

    const execNext = (i) => {
        if (i >= commands.length) {
            console.log('\nDeployment Complete!');
            console.log('http://120.55.247.13');
            conn.end();
            return;
        }
        console.log(`Exec: ${commands[i]}`);
        conn.exec(commands[i], (err, stream) => {
            if (err) { console.error(err); conn.end(); return; }
            stream.on('close', () => execNext(i + 1))
                .on('data', d => process.stdout.write(d.toString()))
                .stderr.on('data', d => process.stderr.write(d.toString()));
        });
    };

    execNext(0);
};

runDeploy();
