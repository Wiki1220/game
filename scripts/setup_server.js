import { Client } from 'ssh2';

const config = {
    host: '120.55.247.13',
    port: 22,
    username: 'root',
    password: 'Game2026'
};

const commands = [
    'export DEBIAN_FRONTEND=noninteractive',
    'echo "Checking OS..."',
    'cat /etc/os-release',
    'echo "Updating Package List..."',
    'apt-get update -y',
    'echo "Installing Curl, Git, Nginx..."',
    'apt-get install -y curl git nginx',
    'echo "Setting up Node.js 20..."',
    'curl -fsSL https://deb.nodesource.com/setup_20.x | bash -',
    'apt-get install -y nodejs',
    'echo "Verifying Installations..."',
    'node -v',
    'npm -v',
    'nginx -v',
    'echo "Server Setup Complete!"'
];

const runServerSetup = () => {
    const conn = new Client();
    console.log('Connecting to server for setup...');

    conn.on('ready', () => {
        console.log('SSH Connection Established.');

        // Join commands with && to ensure sequence, but allow some failures? 
        // Better to run a single script block.
        const script = commands.join(' && \n');

        conn.exec(script, (err, stream) => {
            if (err) {
                console.error('Execution Error:', err);
                conn.end();
                return;
            }

            stream.on('close', (code, signal) => {
                console.log('Setup finished with code: ' + code);
                conn.end();
            }).on('data', (data) => {
                process.stdout.write('REMOTE: ' + data);
            }).stderr.on('data', (data) => {
                process.stderr.write('REMOTE_ERR: ' + data);
            });
        });
    }).on('error', (err) => {
        console.error('Connection Failed:', err);
    }).connect(config);
};

runServerSetup();
