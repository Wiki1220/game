import { Client } from 'ssh2';

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
        console.log('SSH Connected. Executing Remote Setup...');

        const cmd = [
            'export DEBIAN_FRONTEND=noninteractive',
            'apt-get install -y unzip',
            // Clean old
            'rm -rf /var/www/game/dist /var/www/game/server',
            // Unzip (assuming deploy_full.zip is in /var/www/game)
            'unzip -o /var/www/game/deploy_full.zip -d /var/www/game',
            // Setup Server
            'cd /var/www/game/server',
            'npm install --production',
            // Start App
            'pm2 delete all || true',
            'PORT=80 pm2 start index.js --name game --update-env',
            'pm2 save',
            'echo "--- FINAL SETUP COMPLETE ---"',
            'netstat -tulpn | grep :80'
        ].join(' && ');

        conn.exec(cmd, (err, stream) => {
            if (err) throw err;
            stream.on('close', () => conn.end())
                .on('data', d => process.stdout.write(d))
                .stderr.on('data', d => process.stderr.write(d));
        });
    }).on('error', e => console.error('SSH Error', e))
        .connect(config);
};

run();
