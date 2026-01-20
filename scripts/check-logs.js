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
                    output += data; // Combine stdout/stderr
                });
            });
        }).on('error', reject).connect(config);
    });
}

(async () => {
    try {
        console.log('Reading log file...');
        const content = await sshExec('find /var/www/game/logs -name "d01cd722-daed-4a20-8180-5af0929b6006.json" -exec cat {} +');
        console.log(content);
    } catch (error) {
        console.error('Failed:', error);
    }
})();
