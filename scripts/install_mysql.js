import { Client } from 'ssh2';

const config = {
    host: '120.26.212.80',
    port: 22,
    username: 'root',
    password: 'Game2026',
    hostVerifier: () => true
};

const INSTALL_CMD = `
set -e
export DEBIAN_FRONTEND=noninteractive

echo ">>> Updating apt..."
apt-get update -y

echo ">>> Installing MySQL Server..."
apt-get install -y mysql-server

echo ">>> Starting MySQL..."
systemctl start mysql
systemctl enable mysql

echo ">>> Configuring Database..."
# Wait for MySQL to start
sleep 5

# Create Database and User
# Note: In MySQL 8.0+, root uses auth_socket by default. We use sudo to access it.
mysql -e "CREATE DATABASE IF NOT EXISTS game_db;"
mysql -e "CREATE USER IF NOT EXISTS 'game_user'@'localhost' IDENTIFIED BY 'GameDbPass2026!';"
mysql -e "GRANT ALL PRIVILEGES ON game_db.* TO 'game_user'@'localhost';"
mysql -e "FLUSH PRIVILEGES;"

echo ">>> MySQL Installed and Configured!"
echo "Database: game_db"
echo "User: game_user"
`;

console.log('Installing MySQL on remote server...');

const conn = new Client();
conn.on('ready', () => {
    conn.exec(INSTALL_CMD, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code, signal) => {
            console.log('Installation Exit Code:', code);
            conn.end();
        }).on('data', (data) => {
            process.stdout.write(data);
        }).stderr.on('data', (data) => {
            process.stderr.write(data);
        });
    });
}).connect(config);
