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

const queryCommand = `
cd /var/www/game && node -e "
const { GameRecord, Card, sequelize } = require('./server/models');
(async () => {
    try {
        const lastGame = await GameRecord.findOne({
            order: [['created_at', 'DESC']]
        });
        
        const cardCount = await Card.count();

        if (lastGame) {
            console.log('RESULT_Winner: ' + lastGame.winner);
            console.log('RESULT_RedCards: ' + lastGame.red_cards_played);
            console.log('RESULT_BlackCards: ' + lastGame.black_cards_played);
            console.log('RESULT_Turns: ' + lastGame.total_turns);
        }
        console.log('RESULT_CardCount: ' + cardCount);

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
        console.log('Querying game stats and card count...');
        const result = await sshExec(queryCommand);
        console.log(result);
    } catch (error) {
        console.error('Failed:', error);
    }
})();
