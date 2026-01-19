const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../middleware/auth');
const { Op } = require('sequelize');

// Helper: Sign Token
const signToken = (user) => {
    return jwt.sign(
        { id: user.id, username: user.username, is_guest: user.is_guest },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
};

// 1. Register
exports.register = async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validation
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password check failed' });
        }

        // Check exist
        const existingUser = await User.findOne({ where: { username } });
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Create
        const user = await User.create({
            username,
            password_hash,
            is_guest: false
        });

        const token = signToken(user);
        res.status(201).json({ token, user: { id: user.id, username: user.username, elo: user.elo_rating } });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error during registration' });
    }
};

// 2. Login
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await User.findOne({ where: { username } });
        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        if (user.is_guest) {
            return res.status(400).json({ error: 'Guest accounts cannot login via password' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Update last login
        user.changed('updatedAt', true);
        await user.save();

        const token = signToken(user);
        res.json({ token, user: { id: user.id, username: user.username, elo: user.elo_rating } });

    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

// 3. Guest Login
exports.guestLogin = async (req, res) => {
    try {
        // Generate random guest name
        let username;
        let isUnique = false;

        while (!isUnique) {
            username = `Guest_${Math.floor(Math.random() * 100000)}`;
            const check = await User.findOne({ where: { username } });
            if (!check) isUnique = true;
        }

        const user = await User.create({
            username,
            is_guest: true
        });

        const token = signToken(user);
        res.status(201).json({ token, user: { id: user.id, username: user.username, is_guest: true } });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Guest login failed' });
    }
};

// 4. Get Current User
exports.getMe = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: ['id', 'username', 'elo_rating', 'wins', 'losses', 'is_guest']
        });
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};
