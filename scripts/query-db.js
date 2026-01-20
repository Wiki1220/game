import { Client } from 'ssh2';

const config = {
    host: '120.26.212.80',
    port: 22,
    username: 'root',
    password: 'Game2026',
    hostVerifier: () => true // Skip host key check
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
                let errorOutput = '';

                stream.on('close', (code, signal) => {
                    conn.end();
                    if (code === 0) {
                        resolve(output);
                    } else {
                        reject(new Error(`Command failed with code ${code}: ${errorOutput}`));
                    }
                }).on('data', (data) => {
                    output += data;
                }).stderr.on('data', (data) => {
                    errorOutput += data;
                });
            });
        }).on('error', (err) => {
            reject(err);
        }).connect(config);
    });
}

const queryCommand = `
cd /var/www/game && node -e "
const { GameRecord, sequelize } = require('./server/models');
(async () => {
    try {
        const records = await GameRecord.findAll({
            order: [['created_at', 'DESC']],
            limit: 5
        });
        console.log(JSON.stringify(records, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
})();
"
`;

(async () => {
    try {
        console.log('Querying database...');
        const result = await sshExec(queryCommand);
        console.log(result);
    } catch (error) {
        console.error('Failed:', error);
    }
})();
