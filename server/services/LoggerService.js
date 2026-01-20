const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { UserActionLog, ErrorLog, PointsTransaction } = require('../models');

// 日志根目录
const LOG_ROOT = process.env.LOG_PATH || path.join(__dirname, '../../logs');

/**
 * 日志服务
 * 提供各类日志的写入和查询功能
 */
class LoggerService {

    /**
     * 确保目录存在
     */
    static ensureDir(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    /**
     * 获取对局日志路径
     * 格式: logs/games/{YYYY}/{MM}/{DD}/{game_log_id}.json
     */
    static getGameLogPath(gameLogId, date = new Date()) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        const dir = path.join(LOG_ROOT, 'games', String(year), month, day);
        this.ensureDir(dir);

        return path.join(dir, `${gameLogId}.json`);
    }

    /**
     * 生成新的对局日志ID
     */
    static generateGameLogId() {
        return uuidv4();
    }

    /**
     * 写入对局日志
     */
    static writeGameLog(gameLogId, logData) {
        try {
            const logPath = this.getGameLogPath(gameLogId, new Date(logData.timeline?.game_started || Date.now()));
            const content = JSON.stringify(logData, null, 2);
            fs.writeFileSync(logPath, content, 'utf-8');
            console.log(`[GameLog] Written: ${logPath}`);
            return logPath;
        } catch (error) {
            console.error('[GameLog] Write error:', error);
            this.logError({
                error_type: 'server',
                severity: 'error',
                message: 'Failed to write game log',
                metadata: { gameLogId, error: error.message }
            });
            return null;
        }
    }

    /**
     * 读取对局日志
     */
    static readGameLog(gameLogId, date) {
        try {
            const logPath = this.getGameLogPath(gameLogId, date);
            if (!fs.existsSync(logPath)) {
                return null;
            }
            const content = fs.readFileSync(logPath, 'utf-8');
            return JSON.parse(content);
        } catch (error) {
            console.error('[GameLog] Read error:', error);
            return null;
        }
    }

    /**
     * 查找对局日志（按日期范围）
     */
    static findGameLogs(startDate, endDate) {
        const logs = [];
        const current = new Date(startDate);
        const end = new Date(endDate);

        while (current <= end) {
            const year = current.getFullYear();
            const month = String(current.getMonth() + 1).padStart(2, '0');
            const day = String(current.getDate()).padStart(2, '0');

            const dir = path.join(LOG_ROOT, 'games', String(year), month, day);

            if (fs.existsSync(dir)) {
                const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
                files.forEach(file => {
                    logs.push({
                        game_log_id: file.replace('.json', ''),
                        date: `${year}-${month}-${day}`,
                        path: path.join(dir, file)
                    });
                });
            }

            current.setDate(current.getDate() + 1);
        }

        return logs;
    }

    /**
     * 记录用户行为
     */
    static async logUserAction(data) {
        try {
            await UserActionLog.create({
                user_id: data.user_id,
                user_type: data.user_type || 'user',
                session_id: data.session_id,
                action: data.action,
                action_category: data.action_category,
                target_type: data.target_type,
                target_id: data.target_id,
                metadata: data.metadata,
                ip_address: data.ip_address,
                user_agent: data.user_agent,
                device_type: data.device_type || 'unknown'
            });
        } catch (error) {
            console.error('[UserActionLog] Error:', error.message);
        }
    }

    /**
     * 记录错误
     */
    static async logError(data) {
        try {
            await ErrorLog.create({
                error_code: data.error_code,
                error_type: data.error_type || 'unknown',
                severity: data.severity || 'error',
                message: data.message,
                stack_trace: data.stack_trace,
                user_id: data.user_id,
                session_id: data.session_id,
                game_id: data.game_id,
                request_path: data.request_path,
                request_method: data.request_method,
                request_body: data.request_body,
                response_status: data.response_status,
                ip_address: data.ip_address,
                user_agent: data.user_agent,
                server_version: data.server_version || process.env.npm_package_version,
                metadata: data.metadata
            });
        } catch (error) {
            console.error('[ErrorLog] Error:', error.message);
            // 写入文件作为备份
            this.writeErrorToFile(data);
        }
    }

    /**
     * 错误日志写入文件（数据库失败时的备份）
     */
    static writeErrorToFile(data) {
        try {
            const date = new Date();
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');

            const dir = path.join(LOG_ROOT, 'errors', String(year), month);
            this.ensureDir(dir);

            const filePath = path.join(dir, `${day}.log`);
            const line = `[${date.toISOString()}] ${data.severity || 'error'}: ${data.message}\n`;

            fs.appendFileSync(filePath, line, 'utf-8');
        } catch (e) {
            console.error('[ErrorLog] File write failed:', e.message);
        }
    }

    /**
     * 记录点数变动
     */
    static async logPointsTransaction(data) {
        try {
            return await PointsTransaction.create({
                user_id: data.user_id,
                user_type: data.user_type || 'user',
                transaction_type: data.transaction_type,
                amount: data.amount,
                balance_before: data.balance_before,
                balance_after: data.balance_after,
                reference_type: data.reference_type,
                reference_id: data.reference_id,
                description: data.description,
                metadata: data.metadata
            });
        } catch (error) {
            console.error('[PointsTransaction] Error:', error.message);
            this.logError({
                error_type: 'database',
                severity: 'error',
                message: 'Failed to log points transaction',
                metadata: { data, error: error.message }
            });
            return null;
        }
    }

    /**
     * 创建对局日志对象（初始化）
     */
    static createGameLogObject(room, players, serverVersion) {
        const gameLogId = this.generateGameLogId();

        return {
            log_version: '1.0',
            game_log_id: gameLogId,
            game_record_id: null, // 对局结束后填充
            server_version: serverVersion || '0.3.3',

            room: {
                id: room.id,
                name: room.name,
                type: room.isPublic ? 'public' : 'private',
                mode: room.mode || 'casual',
                created_at: room.createdAt || new Date().toISOString()
            },

            players: {
                red: players.red ? {
                    user_id: players.red.user?.id || null,
                    user_type: players.red.user?.is_guest ? 'guest' : 'user',
                    username: players.red.user?.username,
                    nickname: players.red.user?.nickname || players.red.user?.username,
                    points_before: players.red.user?.points || 1000,
                    join_time: new Date().toISOString()
                } : null,
                black: players.black ? {
                    user_id: players.black.user?.id || null,
                    user_type: players.black.user?.is_guest ? 'guest' : 'user',
                    username: players.black.user?.username,
                    nickname: players.black.user?.nickname || players.black.user?.username,
                    points_before: players.black.user?.points || 1000,
                    join_time: new Date().toISOString()
                } : null
            },

            timeline: {
                room_created: room.createdAt,
                players_ready: null,
                game_started: null,
                game_ended: null,
                total_duration_ms: 0
            },

            result: null,
            initial_state: null,
            events: [],
            final_state: null,
            statistics: {
                red: { pieces_captured: 0, cards_drawn: 0, cards_played: 0 },
                black: { pieces_captured: 0, cards_drawn: 0, cards_played: 0 }
            },
            anomalies: []
        };
    }

    /**
     * 添加事件到对局日志
     */
    static addGameEvent(gameLog, eventType, data) {
        const seq = gameLog.events.length + 1;
        gameLog.events.push({
            seq,
            event_type: eventType,
            timestamp: new Date().toISOString(),
            data
        });
        return seq;
    }
}

module.exports = LoggerService;
