const express = require('express');
const router = express.Router();
const { User, Guest, GameRecord } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { Op } = require('sequelize');

// ==================== 预设头像列表 ====================
const PRESET_AVATARS = [
    // 红方棋子
    { id: 'general_red', name: '红帅', category: 'red' },
    { id: 'chariot_red', name: '红车', category: 'red' },
    { id: 'horse_red', name: '红马', category: 'red' },
    { id: 'cannon_red', name: '红炮', category: 'red' },
    { id: 'elephant_red', name: '红相', category: 'red' },
    { id: 'advisor_red', name: '红仕', category: 'red' },
    { id: 'soldier_red', name: '红兵', category: 'red' },
    // 黑方棋子
    { id: 'general_black', name: '黑将', category: 'black' },
    { id: 'chariot_black', name: '黑车', category: 'black' },
    { id: 'horse_black', name: '黑马', category: 'black' },
    { id: 'cannon_black', name: '黑砲', category: 'black' },
    { id: 'elephant_black', name: '黑象', category: 'black' },
    { id: 'advisor_black', name: '黑士', category: 'black' },
    { id: 'soldier_black', name: '黑卒', category: 'black' }
];

// ==================== 获取预设头像列表 ====================
router.get('/avatars/presets', (req, res) => {
    res.json({
        success: true,
        avatars: PRESET_AVATARS
    });
});

// ==================== 获取当前用户资料 ====================
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const isGuest = req.user.is_guest;

        if (isGuest) {
            const guest = await Guest.findOne({ where: { id: userId } });
            if (!guest) {
                return res.status(404).json({ success: false, message: '用户不存在' });
            }
            return res.json({
                success: true,
                user: {
                    id: guest.id,
                    guest_id: guest.guest_id,
                    nickname: guest.nickname || guest.guest_id,
                    avatar_preset: guest.avatar_preset,
                    is_guest: true,
                    total_games: guest.total_games,
                    wins: guest.wins,
                    losses: guest.losses,
                    created_at: guest.created_at
                }
            });
        }

        const user = await User.findByPk(userId, {
            attributes: { exclude: ['password_hash'] }
        });

        if (!user) {
            return res.status(404).json({ success: false, message: '用户不存在' });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                nickname: user.nickname || user.username,
                email: user.email,
                avatar_type: user.avatar_type,
                avatar_preset: user.avatar_preset,
                avatar_url: user.avatar_url,
                is_guest: false,
                points: user.elo_rating,
                elo_peak: user.elo_peak,
                total_games: user.total_games,
                wins: user.wins,
                losses: user.losses,
                draws: user.draws,
                win_streak: user.win_streak,
                max_win_streak: user.max_win_streak,
                total_play_time: user.total_play_time,
                role: user.role,
                title: user.title,
                bio: user.bio,
                preferred_color: user.preferred_color,
                created_at: user.created_at,
                last_login_at: user.last_login_at
            }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ success: false, message: '获取资料失败' });
    }
});

// ==================== 更新用户资料 ====================
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const isGuest = req.user.is_guest;

        const { nickname, avatar_type, avatar_preset, bio, preferred_color } = req.body;

        if (isGuest) {
            const guest = await Guest.findByPk(userId);
            if (!guest) {
                return res.status(404).json({ success: false, message: '用户不存在' });
            }

            // 游客只能改昵称和头像
            if (nickname) guest.nickname = nickname.slice(0, 50);
            if (avatar_preset && PRESET_AVATARS.some(a => a.id === avatar_preset)) {
                guest.avatar_preset = avatar_preset;
            }

            await guest.save();

            return res.json({
                success: true,
                message: '资料已更新',
                user: {
                    nickname: guest.nickname,
                    avatar_preset: guest.avatar_preset
                }
            });
        }

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: '用户不存在' });
        }

        // 更新允许修改的字段
        if (nickname !== undefined) user.nickname = nickname ? nickname.slice(0, 50) : null;
        if (bio !== undefined) user.bio = bio ? bio.slice(0, 500) : null;
        if (preferred_color && ['red', 'black', 'random'].includes(preferred_color)) {
            user.preferred_color = preferred_color;
        }
        if (avatar_type && ['preset', 'custom'].includes(avatar_type)) {
            user.avatar_type = avatar_type;
        }
        if (avatar_preset && PRESET_AVATARS.some(a => a.id === avatar_preset)) {
            user.avatar_preset = avatar_preset;
        }

        await user.save();

        res.json({
            success: true,
            message: '资料已更新',
            user: {
                nickname: user.nickname,
                avatar_type: user.avatar_type,
                avatar_preset: user.avatar_preset,
                bio: user.bio,
                preferred_color: user.preferred_color
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ success: false, message: '更新资料失败' });
    }
});

// ==================== 修改用户名（特殊操作，可能需要付费道具） ====================
router.put('/profile/username', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const isGuest = req.user.is_guest;

        if (isGuest) {
            return res.status(403).json({ success: false, message: '游客无法修改用户名' });
        }

        const { newUsername } = req.body;

        if (!newUsername || newUsername.length < 3 || newUsername.length > 20) {
            return res.status(400).json({ success: false, message: '用户名长度需要3-20个字符' });
        }

        // 检查用户名格式
        if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(newUsername)) {
            return res.status(400).json({ success: false, message: '用户名只能包含字母、数字、下划线和中文' });
        }

        // 检查是否已存在
        const existing = await User.findOne({ where: { username: newUsername } });
        if (existing) {
            return res.status(400).json({ success: false, message: '用户名已被占用' });
        }

        const user = await User.findByPk(userId);
        user.username = newUsername;
        await user.save();

        res.json({
            success: true,
            message: '用户名已修改',
            newUsername: user.username
        });
    } catch (error) {
        console.error('Update username error:', error);
        res.status(500).json({ success: false, message: '修改用户名失败' });
    }
});

// ==================== 获取对局历史 ====================
router.get('/history', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const isGuest = req.user.is_guest;
        const { page = 1, limit = 20 } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const queryLimit = Math.min(parseInt(limit), 50); // 最多50条

        let whereClause;
        if (isGuest) {
            const guest = await Guest.findByPk(userId);
            if (!guest) {
                return res.status(404).json({ success: false, message: '用户不存在' });
            }
            whereClause = {
                [Op.or]: [
                    { red_guest_id: guest.guest_id },
                    { black_guest_id: guest.guest_id }
                ]
            };
        } else {
            whereClause = {
                [Op.or]: [
                    { red_player_id: userId },
                    { black_player_id: userId }
                ]
            };
        }

        const { count, rows: records } = await GameRecord.findAndCountAll({
            where: whereClause,
            order: [['started_at', 'DESC']],
            offset,
            limit: queryLimit,
            attributes: [
                'id', 'room_id',
                'red_username', 'black_username',
                'red_player_id', 'black_player_id',
                'red_guest_id', 'black_guest_id',
                'winner', 'end_reason',
                'total_turns', 'duration_seconds',
                'red_elo_change', 'black_elo_change',
                'game_mode', 'is_ranked',
                'started_at', 'ended_at'
            ]
        });

        // 格式化返回数据
        const formattedRecords = records.map(record => {
            const r = record.toJSON();
            const amIRed = isGuest
                ? r.red_guest_id === req.user.guest_id
                : r.red_player_id === userId;

            return {
                id: r.id,
                room_id: r.room_id,
                my_color: amIRed ? 'red' : 'black',
                opponent_name: amIRed ? r.black_username : r.red_username,
                result: r.winner === 'draw' ? 'draw' :
                    (amIRed && r.winner === 'red') || (!amIRed && r.winner === 'black') ? 'win' : 'loss',
                end_reason: r.end_reason,
                total_turns: r.total_turns,
                duration_seconds: r.duration_seconds,
                duration_formatted: formatDuration(r.duration_seconds),
                elo_change: amIRed ? r.red_elo_change : r.black_elo_change,
                game_mode: r.game_mode,
                is_ranked: r.is_ranked,
                played_at: r.started_at
            };
        });

        res.json({
            success: true,
            records: formattedRecords,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: queryLimit,
                totalPages: Math.ceil(count / queryLimit)
            }
        });
    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({ success: false, message: '获取对局历史失败' });
    }
});

// ==================== 获取用户统计数据 ====================
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const isGuest = req.user.is_guest;

        if (isGuest) {
            const guest = await Guest.findByPk(userId);
            return res.json({
                success: true,
                stats: {
                    total_games: guest.total_games,
                    wins: guest.wins,
                    losses: guest.losses,
                    win_rate: guest.total_games > 0 ? (guest.wins / guest.total_games * 100).toFixed(1) : 0
                }
            });
        }

        const user = await User.findByPk(userId);
        const winRate = user.total_games > 0 ? (user.wins / user.total_games * 100).toFixed(1) : 0;

        res.json({
            success: true,
            stats: {
                points: user.elo_rating,
                total_games: user.total_games,
                wins: user.wins,
                losses: user.losses,
                draws: user.draws,
                win_rate: winRate,
                win_streak: user.win_streak,
                max_win_streak: user.max_win_streak,
                total_play_time: user.total_play_time,
                total_play_time_formatted: formatDuration(user.total_play_time)
            }
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ success: false, message: '获取统计数据失败' });
    }
});

// ==================== 辅助函数 ====================
function formatDuration(seconds) {
    if (!seconds || seconds < 0) return '0秒';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}小时${minutes}分钟`;
    } else if (minutes > 0) {
        return `${minutes}分${secs}秒`;
    } else {
        return `${secs}秒`;
    }
}

module.exports = router;
