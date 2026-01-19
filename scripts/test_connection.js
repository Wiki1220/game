import { Client } from 'ssh2';

const conn = new Client();
const config = {
    host: '120.55.247.13',
    port: 22,
    username: 'root',
    password: 'Game2026'
};

console.log('Connecting to server...');

conn.on('ready', () => {
    console.log('Client :: ready');
    conn.exec('uptime', (err, stream) => {
        if (err) throw err;
        stream.on('close', (code, signal) => {
            console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
            conn.end();
        }).on('data', (data) => {
            console.log('STDOUT: ' + data);
        }).stderr.on('data', (data) => {
            console.log('STDERR: ' + data);
        });
    });
}).on('error', (err) => {
    console.error('Connection Failed:', err);
}).connect(config);
