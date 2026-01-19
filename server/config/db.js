const { Sequelize } = require('sequelize');
require('dotenv').config();

// Default to local dev settings if env vars missing
const DB_NAME = process.env.DB_NAME || 'game_db';
const DB_USER = process.env.DB_USER || 'game_user';
const DB_PASS = process.env.DB_PASS || 'GameDbPass2026!'; // Default from install script
const DB_HOST = process.env.DB_HOST || 'localhost';

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
    host: DB_HOST,
    dialect: 'mysql',
    logging: false, // Turn off logging for production clarity
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
});

module.exports = sequelize;
