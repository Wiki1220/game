const User = require('./User');
const Guest = require('./Guest');
const GameRecord = require('./GameRecord');
const sequelize = require('../config/db');

// ==================== 模型关联 ====================

// User 与 GameRecord 的关系（作为红方）
User.hasMany(GameRecord, {
    foreignKey: 'red_player_id',
    as: 'gamesAsRed',
    constraints: false
});
GameRecord.belongsTo(User, {
    foreignKey: 'red_player_id',
    as: 'redPlayer',
    constraints: false
});

// User 与 GameRecord 的关系（作为黑方）
User.hasMany(GameRecord, {
    foreignKey: 'black_player_id',
    as: 'gamesAsBlack',
    constraints: false
});
GameRecord.belongsTo(User, {
    foreignKey: 'black_player_id',
    as: 'blackPlayer',
    constraints: false
});

// User 推荐人关系
User.belongsTo(User, {
    foreignKey: 'referrer_id',
    as: 'referrer',
    constraints: false
});
User.hasMany(User, {
    foreignKey: 'referrer_id',
    as: 'referrals',
    constraints: false
});

// Guest 与 User 的关系（转正）
Guest.belongsTo(User, {
    foreignKey: 'converted_to_user_id',
    as: 'convertedUser',
    constraints: false
});

module.exports = {
    sequelize,
    User,
    Guest,
    GameRecord
};
