import { Client } from 'ssh2';

const config = {
    host: '120.26.212.80',
    port: 22,
    username: 'root',
    password: 'Game2026',
    hostVerifier: () => true
};

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
                stream.on('close', (code, signal) => {
                    conn.end();
                    resolve(output);
                }).on('data', (data) => {
                    output += data;
                });
            });
        }).on('error', reject).connect(config);
    });
}

(async () => {
    try {
        console.log('Syncing cards...');
        const output = await sshExec('cd /var/www/game && node server/scripts/syncCards.js');
        console.log(output);
    } catch (error) {
        console.error('Failed:', error);
    }
})();
