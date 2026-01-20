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
                }).stderr.on('data', (data) => {
                    output += data;
                });
            });
        }).on('error', reject).connect(config);
    });
}

(async () => {
    try {
        console.log('Fixing processes...');
        // Stop xiangqi if it exists (cleanup)
        await sshExec('pm2 delete xiangqi || true');

        // Reload game process (ensure it runs new code)
        // If 'game' is not the name, we might kill everything? No, let's try reloading 'game'
        const output = await sshExec('pm2 reload game || pm2 start server/index.js --name game');
        console.log(output);

        console.log('Done.');
    } catch (error) {
        console.error('Failed:', error);
    }
})();
