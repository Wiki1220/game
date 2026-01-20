const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./middleware/auth');
const RoomManager = require('./managers/RoomManager');
const { GameRecord, User, Guest } = require('./models');
const LoggerService = require('./services/LoggerService');

// Global Queue defined at top level to ensure availability
const matchingQueue = [];
const userSessions = new Map(); // userId -> socketId

module.exports = (io) => {
    // Middleware
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error('Authentication error'));

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            socket.user = decoded;

            // 顶号逻辑：检查该用户是否已有连接
            const existingSocketId = userSessions.get(decoded.id);
            if (existingSocketId) {
                const oldSocket = io.sockets.sockets.get(existingSocketId);
                if (oldSocket) {
                    // 通知旧连接被踢下线 (前端可监听此事件)
                    console.log(`User ${decoded.username} logged in from new location. Signaling kick-out to ${existingSocketId}.`);
                    oldSocket.emit('force_disconnect', { reason: '您的账号已在别处登录' });
                    // 延迟断开，确保消息发出
                    setTimeout(() => {
                        oldSocket.disconnect(true);
                    }, 1000);
                }
            }

            // 注册新 Session
            userSessions.set(decoded.id, socket.id);
            socket.userId = decoded.id; // 方便 disconnect 时查找

            next();
        } catch (e) {
            next(new Error('Authentication error'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`User Connected: ${socket.user.username} (${socket.id})`);

        // Send initial room list
        const publicRooms = RoomManager.getPublicRooms();
        console.log(`[Connect] Sending room list to ${socket.user.username}. Rooms: ${publicRooms.length}`);
        socket.emit('room_list', publicRooms);

        // 1. Get Rooms
        socket.on('get_rooms', () => {
            const rooms = RoomManager.getPublicRooms();
            console.log(`[GetRooms] User ${socket.user.username} requested rooms. Returning ${rooms.length} rooms.`);
            console.log(`[Debug] Total rooms in manager: ${RoomManager.rooms.size}`);
            socket.emit('room_list', rooms);
        });

        // 2. Create Room
        socket.on('create_room', (config) => {
            console.log(`[CreateRoom] User ${socket.user.username} creating room: ${config.name} (Public: ${config.isPublic})`);
            // Config: { name, isPublic }
            const room = RoomManager.createRoom(config, socket.user, socket);
            socket.join(room.id);
            socket.currentRoomId = room.id;

            socket.emit('room_joined', {
                roomId: room.id,
                isOwner: true,
                players: Array.from(room.players.values()).map(p => ({
                    id: p.user.id, username: p.user.username, isReady: p.isReady, color: p.color
                }))
            });

            // Update Lobby for everyone
            const updatedList = RoomManager.getPublicRooms();
            console.log(`[CreateRoom] Broadcasting update. New public count: ${updatedList.length}`);
            io.emit('room_list', updatedList);
        });

        // 3. Join Room
        socket.on('join_room', (roomId) => {
            const result = RoomManager.joinRoom(roomId, socket.user, socket);
            if (result.error) {
                return socket.emit('error', result.error);
            }

            const room = result.room;
            socket.join(roomId);
            socket.currentRoomId = roomId;

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

        // 4. Ready (Legacy)
        socket.on('player_ready', (isReady) => {
            // ... legacy ...
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
                    seed: Date.now(),
                    players: Array.from(room.players.values()).map(p => ({
                        id: p.user.id, username: p.user.username, color: p.color
                    }))
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

        // 5.1 Game Start - 记录游戏开始
        socket.on('game_start', async ({ roomId }) => {
            try {
                const room = RoomManager.rooms.get(roomId);
                if (!room) return;

                const players = Array.from(room.players.values());
                const redPlayer = players.find(p => p.color === 'red');
                const blackPlayer = players.find(p => p.color === 'black');

                // 记录游戏开始时间
                room.gameStartedAt = new Date();
                room.gameLogId = LoggerService.generateGameLogId();

                // Cache User Information for Game End
                room.cachedRedUser = redPlayer?.user;
                room.cachedBlackUser = blackPlayer?.user;

                console.log(`[GAME] Game started in room ${roomId}. Log ID: ${room.gameLogId}`);

                // 记录用户行为日志
                LoggerService.logUserAction({
                    user_id: socket.user.id,
                    user_type: socket.user.is_guest ? 'guest' : 'user',
                    action: 'game_start',
                    action_category: 'game',
                    target_type: 'room',
                    target_id: roomId,
                    metadata: {
                        game_log_id: room.gameLogId,
                        red_player: redPlayer?.user?.username,
                        black_player: blackPlayer?.user?.username
                    }
                });
            } catch (error) {
                console.error('[GAME] Error recording game start:', error);
            }
        });

        // 5.2 Game End - 记录游戏结束
        socket.on('game_end', async ({ roomId, result }) => {
            try {
                const room = RoomManager.rooms.get(roomId);
                if (!room) {
                    console.log(`[GAME] Room ${roomId} not found for game_end. Creating record from result only.`);
                }

                const gameEndedAt = new Date();
                const gameStartedAt = room?.gameStartedAt || new Date(Date.now() - (result.duration_seconds || 0) * 1000);
                const durationSeconds = Math.floor((gameEndedAt - gameStartedAt) / 1000);

                // 从 result 中提取信息
                const {
                    winner,
                    end_reason,
                    total_turns = 0,
                    game_log_data
                } = result;

                // Retrieve cached users (Fallback to socket user if local 1v1? No room manager is truth)
                const redUser = room?.cachedRedUser;
                const blackUser = room?.cachedBlackUser;

                console.log(`[GAME] Game ended in room ${roomId}. Winner: ${winner}, Reason: ${end_reason}`);

                // 创建 GameRecord
                const record = await GameRecord.create({
                    room_id: roomId,
                    game_log_id: room?.gameLogId || LoggerService.generateGameLogId(),
                    red_player_id: redUser?.id || null,
                    red_player_type: redUser?.is_guest ? 'guest' : 'user',
                    red_guest_id: redUser?.is_guest ? redUser.guest_id : null,
                    red_username: redUser?.username || 'Unknown',

                    black_player_id: blackUser?.id || null,
                    black_player_type: blackUser?.is_guest ? 'guest' : 'user',
                    black_guest_id: blackUser?.is_guest ? blackUser.guest_id : null,
                    black_username: blackUser?.username || 'Unknown',

                    winner: winner || 'none',
                    end_reason: end_reason || 'unknown',
                    total_turns: total_turns,
                    duration_seconds: durationSeconds,
                    game_mode: room?.isPublic === false ? 'match' : 'casual',
                    started_at: gameStartedAt,
                    ended_at: gameEndedAt
                });

                console.log(`[GAME] GameRecord created. ID: ${record.id}`);

                // 写入详细日志文件
                if (game_log_data) {
                    game_log_data.game_record_id = record.id;
                    game_log_data.timeline.game_ended = gameEndedAt.toISOString();
                    game_log_data.timeline.total_duration_ms = durationSeconds * 1000;
                    game_log_data.result = {
                        winner,
                        end_reason,
                        total_turns
                    };

                    LoggerService.writeGameLog(room?.gameLogId || record.game_log_id, game_log_data);
                }

                // 记录用户行为日志
                LoggerService.logUserAction({
                    user_id: socket.user.id,
                    user_type: socket.user.is_guest ? 'guest' : 'user',
                    action: 'game_end',
                    action_category: 'game',
                    target_type: 'room',
                    target_id: roomId,
                    metadata: {
                        game_record_id: record.id,
                        winner,
                        end_reason
                    }
                });

                // Update User Stats (Async, no await needed to block response)
                updateUserStats(redUser, winner === 'red', winner === 'draw').catch(err => console.error('Stats Update Error:', err));
                updateUserStats(blackUser, winner === 'black', winner === 'draw').catch(err => console.error('Stats Update Error:', err));

                // 返回记录ID给前端
                socket.emit('game_record_saved', {
                    success: true,
                    record_id: record.id,
                    game_log_id: record.game_log_id
                });

            } catch (error) {
                console.error('[GAME] Error recording game end:', error);
                LoggerService.logError({
                    error_type: 'game_logic',
                    severity: 'error',
                    message: 'Failed to save game record',
                    user_id: socket.user?.id,
                    game_id: roomId,
                    stack_trace: error.stack,
                    metadata: { result }
                });
                socket.emit('game_record_saved', { success: false, error: error.message });
            }
        });

        // 6. Leave / Disconnect
        const handleLeave = () => {
            const roomId = socket.currentRoomId;
            if (roomId) {
                const room = RoomManager.leaveRoom(roomId, socket.id);
                socket.leave(roomId);
                socket.currentRoomId = null; // Clear room ID
                if (room) {
                    io.to(roomId).emit('player_left', { userId: socket.user.id });
                    if (room.isEmpty()) {
                        io.emit('room_list', RoomManager.getPublicRooms());
                    } else {
                        io.emit('room_list', RoomManager.getPublicRooms());
                    }
                }
            }
        };

        socket.on('leave_room', handleLeave);
        socket.on('disconnect', () => {
            handleLeave();

            // Clean up matching queue
            const idx = matchingQueue.findIndex(s => s.id === socket.id);
            if (idx !== -1) {
                matchingQueue.splice(idx, 1);
                console.log(`[MATCH] User ${socket.user.username} (Disconnected) removed from queue.`);
            }

            // Cleanup session
            if (userSessions.get(socket.userId) === socket.id) {
                userSessions.delete(socket.userId);
            }
        });


        // 7. Matchmaking
        socket.on('match_player', () => {
            console.log(`[MATCH] Received match_player from ${socket.user.username}`);

            // Check if already in queue or room
            if (socket.currentRoomId) {
                console.log(`[MATCH] User ${socket.user.username} already in room ${socket.currentRoomId}`);
                return socket.emit('error', '已经在一个房间中了');
            }
            if (matchingQueue.find(s => s.id === socket.id)) {
                console.log(`[MATCH] User ${socket.user.username} already in queue`);
                return;
            }

            console.log(`[MATCH] User ${socket.user.username} entering queue. Current Queue: ${matchingQueue.length}`);

            if (matchingQueue.length > 0) {
                // Found opponent
                const opponent = matchingQueue.shift();
                console.log(`[MATCH] Found opponent: ${opponent.user.username} for ${socket.user.username}`);

                // Check if opponent is still connected/valid
                if (!opponent.connected) {
                    console.log(`[MATCH] Opponent ${opponent.user.username} disconnected, trying next...`);
                    // Start over (push myself and wait, or try loop?)
                    // For simplicity, if opponent invalid, just add me to queue
                    matchingQueue.push(socket);
                    socket.emit('matching_wait'); // Wait for next
                    return;
                }

                // Create Private Room
                console.log(`[MATCH] Creating room for ${opponent.user.username} vs ${socket.user.username}`);
                // Safe name generation to handle potential undefined
                const name1 = opponent.user.username || 'P1';
                const name2 = socket.user.username || 'P2';
                const roomName = `Match-${name1.slice(0, 4)}VS${name2.slice(0, 4)}`;

                const room = RoomManager.createRoom({ name: roomName, isPublic: false }, opponent.user, opponent);

                // Owner Join Logic
                opponent.join(room.id);
                opponent.currentRoomId = room.id;

                // Join Me
                RoomManager.joinRoom(room.id, socket.user, socket);
                socket.join(room.id);
                socket.currentRoomId = room.id;

                console.log(`[MATCH] Match Success! Room: ${room.id}`);

                // Notify Opponent (Owner)
                opponent.emit('room_joined', {
                    roomId: room.id,
                    isOwner: true,
                    players: Array.from(room.players.values()).map(p => ({
                        id: p.user.id, username: p.user.username, isReady: p.isReady, color: p.color
                    }))
                });

                // Notify Me (Joiner)
                socket.emit('room_joined', {
                    roomId: room.id,
                    isOwner: false,
                    players: Array.from(room.players.values()).map(p => ({
                        id: p.user.id, username: p.user.username, isReady: p.isReady, color: p.color
                    }))
                });

            } else {
                // Wait in queue
                matchingQueue.push(socket);
                console.log(`[MATCH] User ${socket.user.username} queued. Queue size: ${matchingQueue.length}`);
                socket.emit('matching_wait');
            }
        });

        socket.on('cancel_match', () => {
            const idx = matchingQueue.findIndex(s => s.id === socket.id);
            if (idx !== -1) {
                matchingQueue.splice(idx, 1);
                console.log(`[MATCH] User ${socket.user.username} canceled match. Queue size: ${matchingQueue.length}`);
                socket.emit('matching_canceled');
            }
        });

    });
};

// Helper: Update User Stats
async function updateUserStats(userObj, isWin, isDraw) {
    if (!userObj) return;

    try {
        if (userObj.is_guest) {
            const guest = await Guest.findByPk(userObj.id);
            if (guest) {
                guest.total_games = (guest.total_games || 0) + 1;
                if (isWin) guest.wins = (guest.wins || 0) + 1;
                else if (!isDraw) guest.losses = (guest.losses || 0) + 1;
                await guest.save();
            }
        } else {
            // User
            const user = await User.findByPk(userObj.id);
            if (user) {
                user.total_games = (user.total_games || 0) + 1;
                if (isWin) user.wins = (user.wins || 0) + 1;
                else if (isDraw) user.draws = (user.draws || 0) + 1;
                else user.losses = (user.losses || 0) + 1;

                // Win Streak
                if (isWin) {
                    user.win_streak = (user.win_streak || 0) + 1;
                    if (user.win_streak > (user.max_win_streak || 0)) {
                        user.max_win_streak = user.win_streak;
                    }
                } else if (!isDraw) {
                    user.win_streak = 0;
                }
                await user.save();
            }
        }
    } catch (e) {
        console.error('Failed to update stats for user:', userObj.id, e);
    }
}
