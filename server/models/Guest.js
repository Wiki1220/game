const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

/**
 * 游客表
 * 轻量级临时用户，用于快速体验游戏
 * 游客数据可定期清理
 */
const Guest = sequelize.define('Guest', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: '游客唯一ID'
    },
    guest_id: {
        type: DataTypes.STRING(50),
        unique: true,
        allowNull: false,
        comment: '游客标识（如 Guest_XXXXX）'
    },
    nickname: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: '显示昵称'
    },

    // ==================== 头像 ====================
    avatar_preset: {
        type: DataTypes.STRING(50),
        defaultValue: 'soldier_red',
        comment: '预设头像标识'
    },

    // ==================== 基础统计 ====================
    total_games: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: '对局数'
    },
    wins: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: '胜场'
    },
    losses: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: '负场'
    },

    // ==================== 会话信息 ====================
    session_token: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: '会话令牌'
    },
    device_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: '设备标识（用于恢复会话）'
    },
    last_active_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '最后活跃时间'
    },
    ip_address: {
        type: DataTypes.STRING(45),
        allowNull: true,
        comment: 'IP地址'
    },

    // ==================== 转正相关 ====================
    converted_to_user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: '转正后的正式用户ID（如果已转正）'
    },
    converted_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '转正时间'
    }
}, {
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    tableName: 'guests',
    indexes: [
        { fields: ['guest_id'] },
        { fields: ['device_id'] },
        { fields: ['last_active_at'] },
        { fields: ['created_at'] }
    ]
});

module.exports = Guest;
