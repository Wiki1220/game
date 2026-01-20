const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

/**
 * 卡牌数据表
 * 存储所有卡牌的定义信息
 */
const Card = sequelize.define('Card', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    card_code: {
        type: DataTypes.STRING(50),
        unique: true,
        allowNull: false,
        comment: '卡牌唯一编码'
    },
    name_cn: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: '中文名称'
    },
    name_en: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: '英文名称'
    },
    description_cn: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '中文效果描述'
    },
    description_en: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '英文效果描述'
    },
    type: {
        type: DataTypes.ENUM('SPEED', 'TRAP', 'ACTION', 'RULE', 'SUMMON', 'EQUIP', 'NORMAL'),
        allowNull: false,
        comment: '卡牌类型'
    },
    tier: {
        type: DataTypes.ENUM('SILVER', 'GOLD', 'PRISMATIC'),
        allowNull: false,
        comment: '稀有度'
    },
    effect_id: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: '效果标识符'
    },
    needs_target: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: '是否需要选择目标'
    },
    target_type: {
        type: DataTypes.STRING(30),
        allowNull: true,
        comment: '目标类型: self, enemy, empty'
    },
    target_piece_type: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: '限定棋子类型'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: '是否启用'
    },
    is_implemented: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: '是否已实现'
    },
    icon_url: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: '图标路径'
    },
    effect_data: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: '效果参数'
    }
}, {
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    tableName: 'cards',
    indexes: [
        { fields: ['card_code'] },
        { fields: ['type'] },
        { fields: ['tier'] }
    ]
});

module.exports = Card;
