const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

/**
 * 对局记录表
 * 记录每一局游戏的详细信息
 */
const GameRecord = sequelize.define('GameRecord', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: '对局记录唯一ID'
    },
    room_id: {
        type: DataTypes.STRING(20),
        allowNull: false,
        comment: '房间ID'
    },
    game_log_id: {
        type: DataTypes.STRING(36),
        allowNull: true,
        comment: '详细日志文件ID'
    },

    // ==================== 玩家信息 ====================
    // 红方
    red_player_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: '红方用户ID（NULL表示游客）'
    },
    red_player_type: {
        type: DataTypes.ENUM('user', 'guest'),
        allowNull: false,
        comment: '红方玩家类型'
    },
    red_guest_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: '红方游客ID（如果是游客）'
    },
    red_username: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: '红方用户名/昵称（快照）'
    },
    red_elo_before: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: '红方对局前ELO'
    },
    red_elo_after: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: '红方对局后ELO'
    },
    red_elo_change: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: '红方ELO变化'
    },

    // 黑方
    black_player_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: '黑方用户ID（NULL表示游客）'
    },
    black_player_type: {
        type: DataTypes.ENUM('user', 'guest'),
        allowNull: false,
        comment: '黑方玩家类型'
    },
    black_guest_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: '黑方游客ID（如果是游客）'
    },
    black_username: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: '黑方用户名/昵称（快照）'
    },
    black_elo_before: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: '黑方对局前ELO'
    },
    black_elo_after: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: '黑方对局后ELO'
    },
    black_elo_change: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: '黑方ELO变化'
    },

    // ==================== 对局结果 ====================
    winner: {
        type: DataTypes.ENUM('red', 'black', 'draw', 'none'),
        allowNull: true,
        comment: '胜利方：red/black/draw/none(未完成)'
    },
    winner_player_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: '胜利者用户ID'
    },
    end_reason: {
        type: DataTypes.ENUM(
            'checkmate',      // 将死
            'timeout',        // 超时
            'surrender',      // 投降
            'disconnect',     // 断线判负
            'draw_agreement', // 协议和棋
            'stalemate',      // 困毙
            'repetition',     // 三次重复
            'fifty_moves',    // 50回合无进展
            'abandoned',      // 双方弃赛
            'error'           // 系统错误
        ),
        allowNull: true,
        comment: '结束原因'
    },

    // ==================== 对局统计 ====================
    total_turns: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: '总回合数'
    },
    red_turns: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: '红方回合数'
    },
    black_turns: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: '黑方回合数'
    },
    duration_seconds: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: '对局时长（秒）'
    },
    red_time_used: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: '红方用时（秒）'
    },
    black_time_used: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: '黑方用时（秒）'
    },

    // ==================== 卡牌统计 ====================
    red_cards_played: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: '红方使用卡牌数'
    },
    black_cards_played: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: '黑方使用卡牌数'
    },
    red_pieces_captured: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: '红方吃子数'
    },
    black_pieces_captured: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: '黑方吃子数'
    },

    // ==================== 时间戳 ====================
    started_at: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: '对局开始时间'
    },
    ended_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '对局结束时间'
    },

    // ==================== 对局类型 ====================
    game_mode: {
        type: DataTypes.ENUM('ranked', 'casual', 'match', 'custom', 'local'),
        defaultValue: 'casual',
        comment: '对局模式：ranked=排位, casual=休闲, match=匹配, custom=自定义, local=本地'
    },
    is_ranked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: '是否计入排名'
    },

    // ==================== 回放数据 ====================
    move_history: {
        type: DataTypes.TEXT('long'),
        allowNull: true,
        comment: '走棋历史（JSON格式）'
    },
    card_history: {
        type: DataTypes.TEXT('long'),
        allowNull: true,
        comment: '卡牌使用历史（JSON格式）'
    },
    seed: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: '随机种子（用于复现）'
    },

    // ==================== 元数据 ====================
    server_version: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: '服务器版本'
    },
    client_version: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: '客户端版本'
    }
}, {
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    tableName: 'game_records',
    indexes: [
        { fields: ['room_id'] },
        { fields: ['red_player_id'] },
        { fields: ['black_player_id'] },
        { fields: ['winner'] },
        { fields: ['started_at'] },
        { fields: ['game_mode'] },
        { fields: ['is_ranked'] }
    ]
});

module.exports = GameRecord;
