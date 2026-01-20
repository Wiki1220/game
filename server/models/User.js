const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

/**
 * 正式注册用户表
 * 包含完整的用户信息、统计数据和个性化设置
 */
const User = sequelize.define('User', {
    // ==================== 基础信息 ====================
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: '用户唯一ID'
    },
    username: {
        type: DataTypes.STRING(50),
        unique: true,
        allowNull: false,
        comment: '登录用户名（唯一，不可修改）'
    },
    nickname: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: '显示昵称（可修改）'
    },
    email: {
        type: DataTypes.STRING(255),
        unique: true,
        allowNull: true,
        validate: {
            isEmail: true
        },
        comment: '邮箱地址（用于找回密码）'
    },
    phone: {
        type: DataTypes.STRING(20),
        unique: true,
        allowNull: true,
        comment: '手机号码'
    },
    password_hash: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: '密码哈希'
    },

    // ==================== 头像系统 ====================
    avatar_type: {
        type: DataTypes.ENUM('preset', 'custom'),
        defaultValue: 'preset',
        comment: '头像类型：preset=预设棋子, custom=自定义上传'
    },
    avatar_preset: {
        type: DataTypes.STRING(50),
        defaultValue: 'general_red',
        comment: '预设头像标识：general_red, general_black, chariot, horse, cannon, soldier 等'
    },
    avatar_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: '自定义头像URL（CDN或本地路径）'
    },

    // ==================== 游戏统计 ====================
    elo_rating: {
        type: DataTypes.INTEGER,
        defaultValue: 1000,
        comment: 'ELO 评分'
    },
    elo_peak: {
        type: DataTypes.INTEGER,
        defaultValue: 1000,
        comment: '历史最高 ELO'
    },
    total_games: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: '总对局数'
    },
    wins: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: '胜场数'
    },
    losses: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: '负场数'
    },
    draws: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: '平局数'
    },
    win_streak: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: '当前连胜'
    },
    max_win_streak: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: '历史最高连胜'
    },
    total_play_time: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: '总游戏时长（秒）'
    },

    // ==================== 账户状态 ====================
    status: {
        type: DataTypes.ENUM('active', 'banned', 'suspended', 'deleted'),
        defaultValue: 'active',
        comment: '账户状态'
    },
    ban_reason: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: '封禁原因'
    },
    ban_until: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '封禁截止时间（NULL表示永久）'
    },
    role: {
        type: DataTypes.ENUM('user', 'vip', 'moderator', 'admin'),
        defaultValue: 'user',
        comment: '用户角色'
    },

    // ==================== 登录与安全 ====================
    last_login_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '最后登录时间'
    },
    last_login_ip: {
        type: DataTypes.STRING(45),
        allowNull: true,
        comment: '最后登录IP（支持IPv6）'
    },
    login_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: '登录次数'
    },
    failed_login_attempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: '连续登录失败次数'
    },
    lockout_until: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '账户锁定截止时间'
    },

    // ==================== 个性化设置 ====================
    preferred_color: {
        type: DataTypes.ENUM('red', 'black', 'random'),
        defaultValue: 'random',
        comment: '偏好执棋颜色'
    },
    sound_enabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: '是否开启音效'
    },
    notification_enabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: '是否开启通知'
    },
    language: {
        type: DataTypes.STRING(10),
        defaultValue: 'zh-CN',
        comment: '界面语言'
    },
    timezone: {
        type: DataTypes.STRING(50),
        defaultValue: 'Asia/Shanghai',
        comment: '时区'
    },

    // ==================== 社交信息 ====================
    bio: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: '个人简介'
    },
    title: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: '称号/头衔'
    },

    // ==================== 验证状态 ====================
    email_verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: '邮箱是否已验证'
    },
    phone_verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: '手机是否已验证'
    },

    // ==================== 元数据 ====================
    register_ip: {
        type: DataTypes.STRING(45),
        allowNull: true,
        comment: '注册时IP地址'
    },
    register_source: {
        type: DataTypes.STRING(50),
        defaultValue: 'web',
        comment: '注册来源：web, mobile, wechat, qq 等'
    },
    referrer_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: '推荐人用户ID'
    }
}, {
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    tableName: 'users',
    indexes: [
        { fields: ['username'] },
        { fields: ['email'] },
        { fields: ['elo_rating'] },
        { fields: ['status'] },
        { fields: ['created_at'] }
    ]
});

module.exports = User;
