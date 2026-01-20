const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

/**
 * 用户行为日志表
 * 记录用户操作行为
 */
const UserActionLog = sequelize.define('UserActionLog', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: '用户ID'
    },
    user_type: {
        type: DataTypes.ENUM('user', 'guest'),
        allowNull: true,
        comment: '用户类型'
    },
    session_id: {
        type: DataTypes.STRING(36),
        allowNull: true,
        comment: '会话ID'
    },
    action: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: '行为类型'
    },
    action_category: {
        type: DataTypes.STRING(30),
        allowNull: true,
        comment: '行为分类'
    },
    target_type: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: '目标类型'
    },
    target_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: '目标ID'
    },
    metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: '额外数据'
    },
    ip_address: {
        type: DataTypes.STRING(45),
        allowNull: true,
        comment: 'IP地址'
    },
    user_agent: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: '浏览器UA'
    },
    device_type: {
        type: DataTypes.ENUM('desktop', 'mobile', 'tablet', 'unknown'),
        defaultValue: 'unknown',
        comment: '设备类型'
    }
}, {
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    tableName: 'user_action_logs',
    indexes: [
        { fields: ['user_id', 'created_at'] },
        { fields: ['action', 'created_at'] },
        { fields: ['session_id'] }
    ]
});

module.exports = UserActionLog;
