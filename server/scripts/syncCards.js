/**
 * 卡牌数据同步脚本
 * 从 cardDefs.js 同步卡牌数据到数据库
 * 
 * 运行方式: node server/scripts/syncCards.js
 */

const path = require('path');

// 设置模块别名以便导入 ES 模块
async function main() {
    // 动态导入 ES 模块
    const cardDefsPath = path.join(__dirname, '../../src/game/cardDefs.js');
    const { CARD_DATA, CARD_TYPES, CARD_TIERS } = await import(`file://${cardDefsPath}`);

    // 导入数据库模型
    const { Card, sequelize } = require('../models');

    console.log('=== 卡牌数据同步脚本 ===\n');
    console.log(`发现 ${CARD_DATA.length} 张卡牌定义\n`);

    try {
        // 确保数据库连接
        await sequelize.authenticate();
        console.log('✓ 数据库连接成功\n');

        // 同步表结构
        await Card.sync({ alter: true });
        console.log('✓ Cards 表结构同步完成\n');

        let created = 0;
        let updated = 0;
        let skipped = 0;

        for (const cardDef of CARD_DATA) {
            // 跳过未实现的卡牌
            if (!cardDef.isImplemented) {
                skipped++;
                console.log(`○ 跳过 (未实现): ${cardDef.name}`);
                continue;
            }

            // 映射类型和稀有度
            const typeKey = Object.entries(CARD_TYPES).find(([k, v]) => v === cardDef.type)?.[0] || 'ACTION';
            const tierKey = Object.entries(CARD_TIERS).find(([k, v]) => v === cardDef.tier)?.[0] || 'SILVER';

            const cardData = {
                card_code: cardDef.id,
                name_cn: cardDef.name,
                name_en: null,
                description_cn: cardDef.effect,
                description_en: null,
                type: typeKey,
                tier: tierKey,
                effect_id: cardDef.effectId,
                needs_target: cardDef.needsTarget || false,
                target_type: cardDef.targetSelf ? 'self' : (cardDef.targetEnemy ? 'enemy' : (cardDef.targetEmpty ? 'empty' : null)),
                target_piece_type: cardDef.targetType || null,
                is_active: true,
                is_implemented: cardDef.isImplemented || false,
                effect_data: {
                    needsTarget: cardDef.needsTarget,
                    targetSelf: cardDef.targetSelf,
                    targetEnemy: cardDef.targetEnemy,
                    targetEmpty: cardDef.targetEmpty,
                    targetType: cardDef.targetType
                }
            };

            // 查找或创建
            const [card, isCreated] = await Card.findOrCreate({
                where: { card_code: cardDef.id },
                defaults: cardData
            });

            if (isCreated) {
                created++;
                console.log(`✓ 创建: ${cardDef.name} (${typeKey}/${tierKey})`);
            } else {
                // 更新现有记录
                await card.update(cardData);
                updated++;
                console.log(`↻ 更新: ${cardDef.name}`);
            }
        }

        console.log('\n=== 同步完成 ===');
        console.log(`创建: ${created}`);
        console.log(`更新: ${updated}`);
        console.log(`跳过: ${skipped}`);
        console.log(`总计: ${CARD_DATA.length}`);

    } catch (error) {
        console.error('同步失败:', error);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

main();
