import { Client } from 'ssh2';

const config = {
    host: '120.26.212.80',
    port: 22,
    username: 'root',
    password: 'Game2026',
    hostVerifier: () => true
};

console.log('在服务器上启动上传接收器...\n');

const uploadServerCode = `
const http = require('http');
const fs = require('fs');

const server = http.createServer((req, res) => {
  if (req.method === 'POST') {
    const file = fs.createWriteStream('/root/deploy_full.zip');
    req.pipe(file);
    file.on('finish', () => {
      console.log('文件接收完成！');
      res.writeHead(200);
      res.end('OK');
      setTimeout(() => process.exit(0), 500);
    });
  } else {
    res.writeHead(200);
    res.end('Ready');
  }
});

server.listen(8888, '0.0.0.0', () => {
  console.log('Upload server running on port 8888');
});
`;

const conn = new Client();
conn.on('ready', () => {
    console.log('SSH 已连接\n');

    // 写入上传服务器代码
    const cmd1 = `cat > /root/upload_server.js << 'UPLOAD_SERVER_EOF'
${uploadServerCode}
UPLOAD_SERVER_EOF`;

    conn.exec(cmd1, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => {
            console.log('上传服务器代码已写入');
            console.log('启动上传服务器...\n');

            // 启动上传服务器
            conn.exec('node /root/upload_server.js & sleep 2 && netstat -tulpn | grep :8888', (err, s2) => {
                if (err) throw err;
                let output = '';
                s2.on('data', d => {
                    output += d.toString();
                    process.stdout.write(d);
                });
                s2.on('close', () => {
                    if (output.includes(':8888')) {
                        console.log('\n✓ 上传服务器已启动！');
                        console.log('\n现在请运行以下命令上传文件：');
                        console.log('powershell -Command "$file=\\'deploy_full.zip\\';$url=\\'http://120.26.212.80:8888\\';Invoke-WebRequest -Uri $url -Method POST -InFile $file"');
                            conn.end();
                    } else {
                        console.log('\n✗ 上传服务器启动失败');
                        conn.end();
                    }
                });
            });
        });
    });
}).on('error', e => console.error('SSH Error:', e))
    .connect(config);
