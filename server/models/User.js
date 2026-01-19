const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    username: {
        type: DataTypes.STRING(50),
        unique: true,
        allowNull: false
    },
    password_hash: {
        type: DataTypes.STRING(255),
        allowNull: true // 游客可能没有密码
    },
    is_guest: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    elo_rating: {
        type: DataTypes.INTEGER,
        defaultValue: 1000
    },
    wins: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    losses: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    draws: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
}, {
    timestamps: true, // created_at, updated_at
    updatedAt: 'last_login', // Map updated_at to last_login roughly, or separate
    createdAt: 'created_at'
});

module.exports = User;
