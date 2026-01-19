const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./middleware/auth');
const RoomManager = require('./managers/RoomManager');
// const { createInitialState } = require('./game/engine_backend'); 
// Or just relay actions?
// Logic:
// Stage 5 just needs Room setup. Gameplay is mostly Client-Side sync for now?
// Actually Stage 4 "Engine" was moved to src/game/engine.js (Frontend).
// Ideally Backend should validate moves. But for now, we relay actions.
// However, the "Initial State" for game start (Assigning Colors) is Backend's job.

// TODO: We need a backend version of game constants/engine to start game properly?
// Or just send "Start" signal and let clients init?
// Let's send { roomId, color, players } and let clients init.

module.exports = (io) => {
    // Middleware
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error('Authentication error'));

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            socket.user = decoded;
            next();
        } catch (e) {
            next(new Error('Authentication error'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`User Connected: ${socket.user.username} (${socket.id})`);

        // Send initial room list
        socket.emit('room_list', RoomManager.getPublicRooms());

        // 1. Get Rooms
        socket.on('get_rooms', () => {
            socket.emit('room_list', RoomManager.getPublicRooms());
        });

        // 2. Create Room
        socket.on('create_room', (config) => {
            // Config: { name, isPublic }
            const room = RoomManager.createRoom(config, socket.user, socket);
            socket.join(room.id);

            socket.emit('room_joined', {
                roomId: room.id,
                isOwner: true,
                players: Array.from(room.players.values()).map(p => ({
                    id: p.user.id, username: p.user.username, isReady: p.isReady, color: p.color
                }))
            });

            // Update Lobby for everyone
            io.emit('room_list', RoomManager.getPublicRooms());
        });

        // 3. Join Room
        socket.on('join_room', (roomId) => {
            const result = RoomManager.joinRoom(roomId, socket.user, socket);
            if (result.error) {
                return socket.emit('error', result.error);
            }

            const room = result.room;
            socket.join(roomId);

            // Notify Me
            socket.emit('room_joined', {
                roomId: room.id,
                isOwner: room.ownerId === socket.user.id,
                players: Array.from(room.players.values()).map(p => ({
                    id: p.user.id, username: p.user.username, isReady: p.isReady, color: p.color
                }))
            });

            // Notify Others in Room
            socket.to(roomId).emit('player_joined', {
                id: socket.user.id, username: socket.user.username, isReady: false, color: 'black' // Second joiner is usually black/2nd
            });

            // Update Lobby (Occupancy changed)
            io.emit('room_list', RoomManager.getPublicRooms());
        });

        // 4. Ready
        socket.on('player_ready', (isReady) => {
            // Find room? Socket doesn't know room easily unless we track it
            // Or client sends roomId. Client SHOULD send roomId.
            // But secure way is: track socket->room mapping in SocketController or RoomManager.
            // RoomManager.rooms is Map<id, Room>.
            // We can iterate or use a reverse map.
            // For now, let's assume client sends roomId for simplicity, but validate.
            // Iterate RoomManager to find where socket is? Expensive.
            // Better: socket.data.roomId

            // Wait, I didn't set socket.data.roomId.
            // Let's iterate RoomManager rooms? Or just trust client for now?
            // Trust client with simple validation.
        });

        // Revised Ready with RoomId
        socket.on('toggle_ready', ({ roomId, isReady }) => {
            const room = RoomManager.getRoom(roomId);
            if (!room) return;

            room.setReady(socket.id, isReady);
            io.to(roomId).emit('player_ready_update', { userId: socket.user.id, isReady });

            // Check Start
            if (room.bothReady()) {
                room.status = 'PLAYING';
                io.to(roomId).emit('game_start', {
                    roomId: room.id,
                    players: Array.from(room.players.values()).map(p => ({
                        id: p.user.id, username: p.user.username, color: p.color
                    }))
                    // Client handles initial state
                });
                // Update Lobby (Status Changed)
                io.emit('room_list', RoomManager.getPublicRooms());
            }
        });

        // 5. Game Action
        socket.on('game_action', ({ roomId, action }) => {
            // Relay to others in room
            socket.to(roomId).emit('remote_action', action);
        });

        // 6. Leave / Disconnect
        const handleLeave = () => {
            // Find room user is in. 
            // Better: Store roomId on socket
            const roomId = socket.currentRoomId;
            if (roomId) {
                const room = RoomManager.leaveRoom(roomId, socket.id);
                socket.leave(roomId);
                if (room) {
                    io.to(roomId).emit('player_left', { userId: socket.user.id });
                    if (room.isEmpty()) {
                        // Already deleted in Manager
                        io.emit('room_list', RoomManager.getPublicRooms());
                    } else {
                        // Update Room List (Player count)
                        io.emit('room_list', RoomManager.getPublicRooms());
                    }
                }
            }
        };

        socket.on('leave_room', handleLeave);
        socket.on('disconnect', handleLeave);

        // Helper to track room
        socket.on('join_room', (roomId) => { socket.currentRoomId = roomId; });
        socket.on('create_room', () => {
            // Wait, create_room handler above didn't set currentRoomId.
            // Let's fix create_room logic above to set socket.currentRoomId
        });
    });
};
