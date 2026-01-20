const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Guest } = require('../models');
const { JWT_SECRET } = require('../middleware/auth');
const { Op } = require('sequelize');

// Helper: Sign Token
const signToken = (user, isGuest = false) => {
    return jwt.sign(
        {
            id: user.id,
            username: isGuest ? user.guest_id : user.username,
            is_guest: isGuest,
            guest_id: isGuest ? user.guest_id : null
        },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
};

// 1. Register
exports.register = async (req, res) => {
    try {
        const { username, password, email } = req.body;

        // Validation
        if (!username || !password) {
            return res.status(400).json({ error: '用户名和密码不能为空' });
        }

        if (username.length < 3 || username.length > 20) {
            return res.status(400).json({ error: '用户名长度需要3-20个字符' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: '密码长度至少6个字符' });
        }

        // Check username format
        if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(username)) {
            return res.status(400).json({ error: '用户名只能包含字母、数字、下划线和中文' });
        }

        // Check exist
        const existingUser = await User.findOne({ where: { username } });
        if (existingUser) {
            return res.status(400).json({ error: '用户名已被占用' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Get IP from request
        const registerIp = req.ip || req.connection.remoteAddress;

        // Create
        const user = await User.create({
            username,
            nickname: username, // 默认昵称等于用户名
            password_hash,
            email: email || null,
            register_ip: registerIp,
            register_source: 'web',
            last_login_at: new Date(),
            login_count: 1
        });

        const token = signToken(user, false);
        res.status(201).json({
            token,
            user: {
                id: user.id,
                username: user.username,
                nickname: user.nickname,
                points: user.elo_rating,
                avatar_preset: user.avatar_preset,
                is_guest: false
            }
        });

    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: '注册失败，请稍后重试' });
    }
};

// 2. Login
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await User.findOne({ where: { username } });
        if (!user) {
            return res.status(400).json({ error: '用户名或密码错误' });
        }

        // 检查账户状态
        if (user.status === 'banned') {
            return res.status(403).json({ error: '账户已被封禁: ' + (user.ban_reason || '违规操作') });
        }

        if (user.status === 'suspended') {
            if (user.ban_until && new Date() < user.ban_until) {
                return res.status(403).json({ error: `账户暂停至 ${user.ban_until.toLocaleString()}` });
            }
            // 解除暂停
            user.status = 'active';
        }

        // 检查是否锁定
        if (user.lockout_until && new Date() < user.lockout_until) {
            return res.status(403).json({ error: '账户已锁定，请稍后重试' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            // 增加失败次数
            user.failed_login_attempts = (user.failed_login_attempts || 0) + 1;
            if (user.failed_login_attempts >= 5) {
                user.lockout_until = new Date(Date.now() + 15 * 60 * 1000); // 锁定15分钟
            }
            await user.save();
            return res.status(400).json({ error: '用户名或密码错误' });
        }

        // 登录成功，重置失败次数
        user.failed_login_attempts = 0;
        user.lockout_until = null;
        user.last_login_at = new Date();
        user.last_login_ip = req.ip || req.connection.remoteAddress;
        user.login_count = (user.login_count || 0) + 1;
        await user.save();

        const token = signToken(user, false);
        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                nickname: user.nickname || user.username,
                points: user.elo_rating,
                avatar_type: user.avatar_type,
                avatar_preset: user.avatar_preset,
                avatar_url: user.avatar_url,
                role: user.role,
                is_guest: false
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: '登录失败，请稍后重试' });
    }
};

// 3. Guest Login - 使用 Guest 表
exports.guestLogin = async (req, res) => {
    try {
        // Generate random guest ID
        let guestId;
        let isUnique = false;

        while (!isUnique) {
            guestId = `Guest_${Math.floor(Math.random() * 100000)}`;
            const check = await Guest.findOne({ where: { guest_id: guestId } });
            if (!check) isUnique = true;
        }

        const guest = await Guest.create({
            guest_id: guestId,
            nickname: guestId,
            ip_address: req.ip || req.connection.remoteAddress,
            last_active_at: new Date()
        });

        const token = signToken(guest, true);
        res.status(201).json({
            token,
            user: {
                id: guest.id,
                username: guest.guest_id,
                nickname: guest.nickname,
                avatar_preset: guest.avatar_preset,
                is_guest: true
            }
        });

    } catch (error) {
        console.error('Guest login error:', error);
        res.status(500).json({ error: '游客登录失败' });
    }
};

// 4. Get Current User
exports.getMe = async (req, res) => {
    try {
        const isGuest = req.user.is_guest;

        if (isGuest) {
            const guest = await Guest.findByPk(req.user.id);
            if (!guest) return res.status(404).json({ error: '用户不存在' });

            return res.json({
                id: guest.id,
                username: guest.guest_id,
                nickname: guest.nickname || guest.guest_id,
                avatar_preset: guest.avatar_preset,
                total_games: guest.total_games,
                wins: guest.wins,
                losses: guest.losses,
                is_guest: true
            });
        }

        const user = await User.findByPk(req.user.id, {
            attributes: [
                'id', 'username', 'nickname', 'elo_rating',
                'wins', 'losses', 'draws', 'total_games',
                'avatar_type', 'avatar_preset', 'avatar_url',
                'role', 'title', 'created_at'
            ]
        });
        if (!user) return res.status(404).json({ error: '用户不存在' });

        res.json({
            ...user.toJSON(),
            is_guest: false
        });
    } catch (error) {
        console.error('GetMe error:', error);
        res.status(500).json({ error: '获取用户信息失败' });
    }
};

// 5. 游客转正式用户
exports.convertGuest = async (req, res) => {
    try {
        if (!req.user.is_guest) {
            return res.status(400).json({ error: '只有游客可以转为正式用户' });
        }

        const { username, password } = req.body;

        // Validation
        if (!username || !password) {
            return res.status(400).json({ error: '用户名和密码不能为空' });
        }

        // Check exist
        const existingUser = await User.findOne({ where: { username } });
        if (existingUser) {
            return res.status(400).json({ error: '用户名已被占用' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Get guest data
        const guest = await Guest.findByPk(req.user.id);
        if (!guest) {
            return res.status(404).json({ error: '游客记录不存在' });
        }

        // Create new user with guest's stats
        const user = await User.create({
            username,
            nickname: guest.nickname || username,
            password_hash,
            avatar_preset: guest.avatar_preset,
            total_games: guest.total_games,
            wins: guest.wins,
            losses: guest.losses,
            register_ip: guest.ip_address,
            register_source: 'guest_convert'
        });

        // Update guest record
        guest.converted_to_user_id = user.id;
        guest.converted_at = new Date();
        await guest.save();

        const token = signToken(user, false);
        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                nickname: user.nickname,
                elo_rating: user.elo_rating,
                is_guest: false
            },
            message: '转正成功！您的游戏记录已保留。'
        });

    } catch (error) {
        console.error('Convert guest error:', error);
        res.status(500).json({ error: '转正失败，请稍后重试' });
    }
};
