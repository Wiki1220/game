class Room {
    constructor(id, name, config = {}, ownerId) {
        this.id = id;
        this.name = name || `Room ${id}`;
        this.config = {
            isPublic: config.isPublic !== false, // Default true
            password: config.password || null
        };
        this.ownerId = ownerId;

        // Players: Map<socketId, { socket, user, color, isReady }>
        this.players = new Map();

        this.status = 'WAITING'; // WAITING, PLAYING
        this.game = null; // GameState when playing
    }

    addPlayer(socket, user) {
        if (this.players.size >= 2) return false;

        // Determine Color
        // If empty, random? Or first is Red?
        // Let's say First is Red (Owner), Second is Black.
        const color = this.players.size === 0 ? 'red' : 'black';

        this.players.set(socket.id, {
            id: socket.id, // Socket ID
            user: user, // User Data from Token
            color: color,
            isReady: false,
            socket: socket
        });

        return true;
    }

    removePlayer(socketId) {
        const p = this.players.get(socketId);
        if (p) {
            this.players.delete(socketId);
            // If owner left, transfer ownership or close room?
            // RoomManager handles empty room cleanup.
            // If playing, handle surrender?
            return p;
        }
        return null;
    }

    setReady(socketId, isReady) {
        const p = this.players.get(socketId);
        if (p) {
            p.isReady = isReady;
        }
    }

    isFull() {
        return this.players.size >= 2;
    }

    isEmpty() {
        return this.players.size === 0;
    }

    bothReady() {
        if (this.players.size < 2) return false;
        return Array.from(this.players.values()).every(p => p.isReady);
    }

    getPublicInfo() {
        return {
            id: this.id,
            name: this.name,
            isPublic: this.config.isPublic,
            playerCount: this.players.size,
            status: this.status,
            owner: this.players.size > 0 ? Array.from(this.players.values())[0].user.username : 'Unknown'
        };
    }
}

module.exports = Room;
