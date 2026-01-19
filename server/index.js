const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json()); // Support JSON body

// Routes
app.use('/api/auth', require('./routes/authRoutes'));

// Database
const sequelize = require('./config/db');
const User = require('./models/User');

// Sync Database
(async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connected.');
        await sequelize.sync(); // Create tables if not exists
        console.log('✅ Models synced.');
    } catch (error) {
        console.error('❌ Database connection error:', error);
    }
})();

// Health Check
app.get('/api/health', async (req, res) => {
    try {
        await sequelize.authenticate();
        res.json({ status: 'ok', db: 'connected' });
    } catch (error) {
        res.status(500).json({ status: 'error', db: error.message });
    }
});

// In local: d:\Projects\game is CWD (via node server/index.js), so dist is ./dist?
// Let's handle both.
// If __dirname is .../server, then ../dist is correct.
const distPath = path.join(__dirname, '../dist');
console.log('Serving static files from:', distPath);

app.use(express.static(distPath));

const server = http.createServer(app);

// Allow both localhost and the production IP/domain
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// State
let waitingPlayer = null; // Simple queue
const rooms = new Map(); // roomId -> { red: socketId, black: socketId, log: [] }

io.on('connection', (socket) => {
    console.log(`User Connected: ${socket.id}`);

    // Matchmaking Logic
    socket.on('find_match', () => {
        if (waitingPlayer && waitingPlayer.id !== socket.id) {
            // Match found!
            const roomId = `room_${Date.now()}`;
            const opponent = waitingPlayer;
            waitingPlayer = null;

            // Assign sides
            const roomConfig = {
                id: roomId,
                red: opponent.id,
                black: socket.id,
                log: []
            };
            rooms.set(roomId, roomConfig);

            // Notify Players
            socket.join(roomId);
            opponent.join(roomId);

            io.to(opponent.id).emit('game_start', { roomId, color: 'red', opponentId: socket.id });
            socket.emit('game_start', { roomId, color: 'black', opponentId: opponent.id });

            console.log(`Match created: ${roomId}`);
        } else {
            // Wait
            waitingPlayer = socket;
            socket.emit('waiting_for_match');
            console.log(`User ${socket.id} waiting...`);
        }
    });

    // Relay Actions
    socket.on('game_action', (data) => {
        // Broadcast to room excluding sender
        socket.to(data.roomId).emit('remote_action', data.action);
    });

    socket.on('disconnect', () => {
        console.log('User Disconnected', socket.id);
        if (waitingPlayer === socket) {
            waitingPlayer = null;
        }
    });
});

// SPA Fallback: ALL other requests return index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

// Default to 80 if allowed (Production), else 3001 (Local)
// We will force PORT=80 in the deployment script
const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`GAME SERVER RUNNING ON PORT ${PORT}`);
});
