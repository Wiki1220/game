const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'xiangqi-secret-key-2026';

const authMiddleware = (req, res, next) => {
    // 1. Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        // 2. Verify token
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // { id, username, is_guest }
        next();
    } catch (error) {
        res.status(400).json({ error: 'Invalid token.' });
    }
};

module.exports = { authMiddleware, JWT_SECRET };
