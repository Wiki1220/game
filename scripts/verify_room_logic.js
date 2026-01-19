import { io } from 'socket.io-client';

const BASE_URL = 'http://120.26.212.80:3333';
const API_URL = `${BASE_URL}/api/auth`;

async function getGuestToken() {
    const res = await fetch(`${API_URL}/guest`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.token;
}

async function runTest() {
    console.log('🔍 Testing Room System...');

    try {
        // User 1
        const token1 = await getGuestToken();
        const socket1 = io(BASE_URL, { auth: { token: token1 }, reconnection: false });

        await new Promise((resolve) => socket1.on('connect', resolve));
        console.log('✅ User 1 Connected');

        // Create Room
        console.log('User 1 Creating Room...');
        socket1.emit('create_room', { name: 'Test Room', isPublic: true });

        const roomInfo = await new Promise((resolve) => {
            socket1.on('room_joined', (data) => resolve(data));
        });
        console.log(`✅ Room Created: ${roomInfo.roomId} (${roomInfo.players[0].username})`);

        // User 2
        const token2 = await getGuestToken();
        const socket2 = io(BASE_URL, { auth: { token: token2 }, reconnection: false });

        await new Promise((resolve) => socket2.on('connect', resolve));
        console.log('✅ User 2 Connected');

        // Check Room List
        console.log('User 2 Fetching Rooms...');
        socket2.emit('get_rooms');
        const list = await new Promise(resolve => socket2.on('room_list', resolve));

        const found = list.find(r => r.id === roomInfo.roomId);
        if (found) {
            console.log(`✅ Room found in list: ${found.name} (Players: ${found.playerCount})`);
        } else {
            console.error('❌ Room NOT found in list');
            process.exit(1);
        }

        // Join Room
        console.log('User 2 Joining Room...');
        socket2.emit('join_room', roomInfo.roomId);

        const joinInfo = await new Promise(resolve => socket2.on('room_joined', resolve));
        console.log(`✅ User 2 Joined: ${joinInfo.roomId}`);

        socket1.close();
        socket2.close();
        console.log('🎉 Room Logic Verified!');

    } catch (e) {
        console.error('❌ Test Failed:', e);
        process.exit(1);
    }
}

runTest();
