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
// BUG-010 FIX: 限制 CORS 来源，生产环境只允许特定域名
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://120.26.212.80',
    'https://120.26.212.80'
];

const io = new Server(server, {
    cors: {
        origin: process.env.NODE_ENV === 'production' ? allowedOrigins : "*",
        methods: ["GET", "POST"]
    }
});


// Initialize Socket Logic
require('./socket')(io);

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
