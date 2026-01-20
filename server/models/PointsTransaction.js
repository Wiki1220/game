const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

/**
 * 点数交易流水表
 * 记录所有点数变动
 */
const PointsTransaction = sequelize.define('PointsTransaction', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '用户ID'
    },
    user_type: {
        type: DataTypes.ENUM('user', 'guest'),
        allowNull: false,
        comment: '用户类型'
    },
    transaction_type: {
        type: DataTypes.ENUM(
            'game_win',
            'game_loss',
            'game_draw',
            'daily_login',
            'achievement',
            'purchase_avatar',
            'purchase_emote',
            'admin_grant',
            'admin_deduct',
            'refund',
            'convert_bonus'
        ),
        allowNull: false,
        comment: '交易类型'
    },
    amount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '变动数量 (正=获得, 负=消费)'
    },
    balance_before: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '变动前余额'
    },
    balance_after: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '变动后余额'
    },
    reference_type: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: '关联类型: game, shop, admin, system'
    },
    reference_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: '关联ID'
    },
    description: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: '描述'
    },
    metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: '额外数据'
    }
}, {
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    tableName: 'points_transactions',
    indexes: [
        { fields: ['user_id', 'created_at'] },
        { fields: ['transaction_type', 'created_at'] },
        { fields: ['reference_id'] }
    ]
});

module.exports = PointsTransaction;
