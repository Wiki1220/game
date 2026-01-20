// 查询最近的对局记录
const { GameRecord, User, Guest, sequelize } = require('./server/models');

(async () => {
    try {
        console.log('=== 查询最近对局记录 ===\n');

        const records = await GameRecord.findAll({
            order: [['created_at', 'DESC']],
            limit: 10
        });

        if (records.length === 0) {
            console.log('没有找到对局记录');
        } else {
            records.forEach((r, i) => {
                console.log(`--- 记录 ${i + 1} ---`);
                console.log(`ID: ${r.id}`);
                console.log(`房间ID: ${r.room_id}`);
                console.log(`红方: ${r.red_username} (ID: ${r.red_player_id})`);
                console.log(`黑方: ${r.black_username} (ID: ${r.black_player_id})`);
                console.log(`胜者: ${r.winner}`);
                console.log(`结束原因: ${r.end_reason}`);
                console.log(`回合数: ${r.total_turns}`);
                console.log(`时长: ${r.duration_seconds}秒`);
                console.log(`开始: ${r.started_at}`);
                console.log(`结束: ${r.ended_at}`);
                console.log('');
            });
        }
    } catch (error) {
        console.error('查询失败:', error.message);
    } finally {
        await sequelize.close();
    }
})();
