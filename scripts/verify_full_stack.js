import { io } from 'socket.io-client';
// import fetch from 'node-fetch'; // Use global fetch


const BASE_URL = 'http://120.26.212.80:3333';
const API_URL = `${BASE_URL}/api/auth`;

async function runTest() {
    console.log('🔍 开始全栈功能测试...\n');

    // 1. 测试健康检查
    try {
        const health = await fetch(`${BASE_URL}/api/health`).then(r => r.json());
        console.log('✅ 健康检查:', health);
        if (health.db !== 'connected') throw new Error('DB未连接');
    } catch (e) {
        console.error('❌ 健康检查失败:', e.message);
        process.exit(1);
    }

    // 2. 测试注册/登录 (游客模式)
    let token;
    let user;
    try {
        console.log('\n👤 正在尝试游客登录...');
        const res = await fetch(`${API_URL}/guest`, { method: 'POST' });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error);

        token = data.token;
        user = data.user;
        console.log(`✅ 登录成功: ${user.username} (ID: ${user.id})`);
        console.log(`🔑 Token获取成功`);
    } catch (e) {
        console.error('❌ 登录失败:', e.message);
        process.exit(1);
    }

    // 3. 测试 Socket 连接认证
    console.log('\n🔌正在连接 Socket.IO...');
    return new Promise((resolve, reject) => {
        const socket = io(BASE_URL, {
            auth: { token }, // 发送 Token
            transports: ['websocket'],
            reconnection: false
        });

        const timeout = setTimeout(() => {
            console.error('❌ Socket 连接超时');
            socket.close();
            process.exit(1);
        }, 5000);

        socket.on('connect', () => {
            clearTimeout(timeout);
            console.log(`✅ Socket 已连接 (ID: ${socket.id})`);

            // 4. 测试匹配功能 (旧逻辑)
            console.log('🎮 发送匹配请求...');
            socket.emit('find_match');
        });

        socket.on('waiting_for_match', () => {
            console.log('✅ 收到匹配响应: waiting_for_match');
            console.log('\n🎉 全流程测试通过！所有系统正常运行。');
            socket.disconnect();
            resolve();
        });

        socket.on('connect_error', (err) => {
            clearTimeout(timeout);
            console.error('❌ Socket 连接错误:', err.message);
            // 可能是认证失败
            reject(err);
        });
    });
}

runTest().catch(err => {
    console.error('❌ 测试失败:', err);
    process.exit(1);
});
