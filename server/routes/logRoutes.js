const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const LoggerService = require('../services/LoggerService');
const { UserActionLog, ErrorLog, PointsTransaction, Card } = require('../models');
const { Op } = require('sequelize');

/**
 * 日志 API 路由
 * 提供日志查询接口
 */

// ==================== 对局日志 ====================

/**
 * 获取对局日志列表
 * GET /api/logs/games?start_date=2026-01-01&end_date=2026-01-31
 */
router.get('/games', authenticateToken, async (req, res) => {
    try {
        const { start_date, end_date } = req.query;

        if (!start_date || !end_date) {
            return res.status(400).json({
                success: false,
                error: 'start_date and end_date are required'
            });
        }

        const logs = LoggerService.findGameLogs(
            new Date(start_date),
            new Date(end_date)
        );

        res.json({
            success: true,
            count: logs.length,
            logs: logs.map(l => ({
                game_log_id: l.game_log_id,
                date: l.date
            }))
        });
    } catch (error) {
        console.error('[LogsAPI] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 获取单个对局日志详情
 * GET /api/logs/games/:game_log_id?date=2026-01-20
 */
router.get('/games/:game_log_id', authenticateToken, async (req, res) => {
    try {
        const { game_log_id } = req.params;
        const { date } = req.query;

        if (!date) {
            return res.status(400).json({
                success: false,
                error: 'date query parameter is required (YYYY-MM-DD)'
            });
        }

        const log = LoggerService.readGameLog(game_log_id, new Date(date));

        if (!log) {
            return res.status(404).json({
                success: false,
                error: 'Game log not found'
            });
        }

        res.json({
            success: true,
            log
        });
    } catch (error) {
        console.error('[LogsAPI] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== 用户行为日志 ====================

/**
 * 获取用户行为日志
 * GET /api/logs/actions?user_id=1&action=login&start_date=2026-01-01&limit=100
 */
router.get('/actions', authenticateToken, async (req, res) => {
    try {
        const {
            user_id,
            action,
            action_category,
            start_date,
            end_date,
            page = 1,
            limit = 100
        } = req.query;

        const where = {};

        if (user_id) where.user_id = user_id;
        if (action) where.action = action;
        if (action_category) where.action_category = action_category;
        if (start_date || end_date) {
            where.created_at = {};
            if (start_date) where.created_at[Op.gte] = new Date(start_date);
            if (end_date) where.created_at[Op.lte] = new Date(end_date);
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { count, rows } = await UserActionLog.findAndCountAll({
            where,
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset
        });

        res.json({
            success: true,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / parseInt(limit))
            },
            logs: rows
        });
    } catch (error) {
        console.error('[LogsAPI] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== 错误日志 ====================

/**
 * 获取错误日志
 * GET /api/logs/errors?severity=error&start_date=2026-01-01&limit=50
 */
router.get('/errors', authenticateToken, async (req, res) => {
    try {
        const {
            severity,
            error_type,
            user_id,
            game_id,
            start_date,
            end_date,
            page = 1,
            limit = 50
        } = req.query;

        const where = {};

        if (severity) where.severity = severity;
        if (error_type) where.error_type = error_type;
        if (user_id) where.user_id = user_id;
        if (game_id) where.game_id = game_id;
        if (start_date || end_date) {
            where.created_at = {};
            if (start_date) where.created_at[Op.gte] = new Date(start_date);
            if (end_date) where.created_at[Op.lte] = new Date(end_date);
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { count, rows } = await ErrorLog.findAndCountAll({
            where,
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset
        });

        res.json({
            success: true,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / parseInt(limit))
            },
            logs: rows
        });
    } catch (error) {
        console.error('[LogsAPI] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== 点数流水 ====================

/**
 * 获取点数交易记录
 * GET /api/logs/points?user_id=1&transaction_type=game_win&limit=100
 */
router.get('/points', authenticateToken, async (req, res) => {
    try {
        const {
            user_id,
            transaction_type,
            start_date,
            end_date,
            page = 1,
            limit = 100
        } = req.query;

        const where = {};

        if (user_id) where.user_id = user_id;
        if (transaction_type) where.transaction_type = transaction_type;
        if (start_date || end_date) {
            where.created_at = {};
            if (start_date) where.created_at[Op.gte] = new Date(start_date);
            if (end_date) where.created_at[Op.lte] = new Date(end_date);
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { count, rows } = await PointsTransaction.findAndCountAll({
            where,
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset
        });

        res.json({
            success: true,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / parseInt(limit))
            },
            transactions: rows
        });
    } catch (error) {
        console.error('[LogsAPI] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== 卡牌数据 ====================

/**
 * 获取所有卡牌
 * GET /api/logs/cards
 */
router.get('/cards', async (req, res) => {
    try {
        const { type, tier, active_only } = req.query;

        const where = {};
        if (type) where.type = type;
        if (tier) where.tier = tier;
        if (active_only === 'true') where.is_active = true;

        const cards = await Card.findAll({
            where,
            order: [['type', 'ASC'], ['tier', 'ASC'], ['id', 'ASC']]
        });

        res.json({
            success: true,
            count: cards.length,
            cards
        });
    } catch (error) {
        console.error('[LogsAPI] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== 统计接口 ====================

/**
 * 获取日志统计摘要
 * GET /api/logs/stats?date=2026-01-20
 */
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const { date } = req.query;
        const targetDate = date ? new Date(date) : new Date();

        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        const dateWhere = {
            created_at: {
                [Op.gte]: startOfDay,
                [Op.lte]: endOfDay
            }
        };

        // 查询各类日志数量
        const [actionCount, errorCount, pointsCount] = await Promise.all([
            UserActionLog.count({ where: dateWhere }),
            ErrorLog.count({ where: dateWhere }),
            PointsTransaction.count({ where: dateWhere })
        ]);

        // 查询对局日志
        const gameLogs = LoggerService.findGameLogs(startOfDay, endOfDay);

        res.json({
            success: true,
            date: targetDate.toISOString().split('T')[0],
            stats: {
                game_logs: gameLogs.length,
                action_logs: actionCount,
                error_logs: errorCount,
                points_transactions: pointsCount
            }
        });
    } catch (error) {
        console.error('[LogsAPI] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
