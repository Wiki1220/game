const Room = require('../game/Room');

class RoomManager {
    constructor() {
        this.rooms = new Map(); // roomId -> Room
    }

    createRoom(config, user, socket) {
        // Generate ID (6 digits)
        let id;
        do {
            id = Math.floor(100000 + Math.random() * 900000).toString();
        } while (this.rooms.has(id));

        const room = new Room(id, config.name, config, user.id);
        room.addPlayer(socket, user);

        this.rooms.set(id, room);

        // socket.join(id); // Handle in Socket Controller
        return room;
    }

    getRoom(id) {
        return this.rooms.get(id);
    }

    getPublicRooms() {
        const list = [];
        for (const room of this.rooms.values()) {
            if (room.config.isPublic && !room.isFull()) {
                list.push(room.getPublicInfo());
            }
        }
        return list;
    }

    joinRoom(id, user, socket) {
        const room = this.rooms.get(id);
        if (!room) return { error: '房间不存在' };
        if (room.isFull()) return { error: '房间已满' };

        // Check if already in?
        // Check password? (Later)

        room.addPlayer(socket, user);
        return { room };
    }

    leaveRoom(roomId, socketId) {
        const room = this.rooms.get(roomId);
        if (!room) return;

        room.removePlayer(socketId);

        if (room.isEmpty()) {
            this.rooms.delete(roomId);
            console.log(`Room ${roomId} destroyed (Empty)`);
        } else {
            // Notification logic handled by controller
        }
        return room;
    }
}

module.exports = new RoomManager(); // Singleton
