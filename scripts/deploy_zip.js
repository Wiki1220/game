import { Client } from 'ssh2';
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

const run = () => {
    const conn = new Client();
    conn.on('ready', () => {
        console.log('SSH Ready. Installing Unzip...');

        conn.exec('export DEBIAN_FRONTEND=noninteractive && apt-get install -y unzip', (err, stream) => {
            if (err) throw err;
            stream.on('close', () => {
                console.log('Unzip Installed. Uploading Files...');
                conn.sftp((err, sftp) => {
                    if (err) throw err;

                    const queue = [
                        { local: path.join(projectRoot, 'dist.zip'), remote: '/var/www/game/dist.zip' },
                        { local: path.join(projectRoot, 'server', 'index.js'), remote: '/var/www/game/server/index.js' },
                        { local: path.join(projectRoot, 'server', 'package.json'), remote: '/var/www/game/server/package.json' }
                    ];

                    // Create dirs
                    conn.exec('mkdir -p /var/www/game/dist && mkdir -p /var/www/game/server', (e, s2) => {
                        s2.on('close', () => {
                            uploadNext(0);
                        });
                    });

                    function uploadNext(i) {
                        if (i >= queue.length) {
                            console.log('Uploads Done. Unzipping & Starting...');
                            finish(conn);
                            return;
                        }
                        const item = queue[i];
                        console.log(`Uploading ${path.basename(item.local)}...`);
                        sftp.fastPut(item.local, item.remote, (err) => {
                            if (err) {
                                console.error('Upload Failed', err);
                                conn.end();
                                return;
                            }
                            uploadNext(i + 1);
                        });
                    }
                });
            }).on('data', d => process.stdout.write(d));
        });
    }).on('error', e => console.error('SSH Error', e))
        .connect(config);
};

function finish(conn) {
    const cmd = [
        'cd /var/www/game',
        'unzip -o dist.zip -d dist', // Unzip to dist folder (dist.zip contains dist/ inside? No, Compress-Archive path dist. So it contains dist/file. Wait.
        // If I compressed "dist", zip root has "dist".
        // If I unzip to /var/www/game, it creates /var/www/game/dist.
        // Correct.
        'cd /var/www/game/server',
        'export DEBIAN_FRONTEND=noninteractive',
        'npm install --production',
        'pm2 delete all || true',
        'PORT=80 pm2 start index.js --name game --update-env',
        'pm2 save',
        'echo "DEPLOYMENT SUCCESS"',
        'netstat -tulpn | grep :80'
    ].join(' && ');

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => conn.end())
            .on('data', d => process.stdout.write(d));
    });
}

run();
