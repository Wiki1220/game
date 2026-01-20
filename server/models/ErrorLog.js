const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

/**
 * 错误日志表
 */
const ErrorLog = sequelize.define('ErrorLog', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    error_code: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: '错误码'
    },
    error_type: {
        type: DataTypes.ENUM('client', 'server', 'database', 'network', 'game_logic', 'unknown'),
        defaultValue: 'unknown',
        comment: '错误类型'
    },
    severity: {
        type: DataTypes.ENUM('info', 'warn', 'error', 'fatal'),
        defaultValue: 'error',
        comment: '严重程度'
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: '错误信息'
    },
    stack_trace: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '堆栈跟踪'
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: '关联用户'
    },
    session_id: {
        type: DataTypes.STRING(36),
        allowNull: true,
        comment: '会话ID'
    },
    game_id: {
        type: DataTypes.STRING(36),
        allowNull: true,
        comment: '关联对局ID'
    },
    request_path: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: '请求路径'
    },
    request_method: {
        type: DataTypes.STRING(10),
        allowNull: true,
        comment: 'HTTP方法'
    },
    request_body: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: '请求体'
    },
    response_status: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: '响应状态码'
    },
    ip_address: {
        type: DataTypes.STRING(45),
        allowNull: true,
        comment: 'IP'
    },
    user_agent: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'UA'
    },
    server_version: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: '服务器版本'
    },
    metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: '额外上下文'
    }
}, {
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    tableName: 'error_logs',
    indexes: [
        { fields: ['severity', 'created_at'] },
        { fields: ['user_id', 'created_at'] },
        { fields: ['game_id'] },
        { fields: ['error_type', 'created_at'] }
    ]
});

module.exports = ErrorLog;
