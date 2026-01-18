export const CARD_TIERS = {
    SILVER: '白银',
    GOLD: '黄金',
    MYTHIC: '传说',
};

export const CARD_TYPES = {
    SPEED: '速攻',
    TRAP: '陷阱',
    ACTION: '行动',
    RULE: '规则',
};

export const CARD_DATA = [
    {
        id: 'speed_war_horse',
        tier: CARD_TIERS.GOLD,
        name: '战马',
        type: CARD_TYPES.SPEED,
        effect: '本回合你的马移动时无视马脚。',
        note: '已在 pieces.js 中实现逻辑 (ignoreHorseLeg check)',
        isImplemented: true,
        effectId: 'IGNORE_HORSE_LEG'
    },
    {
        id: 'trap_doomed',
        tier: CARD_TIERS.GOLD,
        name: '注定',
        type: CARD_TYPES.TRAP,
        effect: '选择一个敌方棋子。若其下个回合移动，丢弃对方所有手牌。',
        note: '在 engine.js MOVE_PIECE 阶段检测触发',
        isImplemented: true,
        needsTarget: true,
        targetEnemy: true,
        effectId: 'TRAP_DOOMED'
    },
    {
        id: 'action_deserter',
        tier: CARD_TIERS.SILVER,
        name: '逃兵',
        type: CARD_TYPES.ACTION,
        effect: '选择己方一个兵，后退一步。此行动会跳过原本的移动阶段。',
        note: '在 engine.js RESOLVE_CARD 中直接修改坐标',
        isImplemented: true,
        needsTarget: true,
        targetSelf: true,
        targetType: 'soldier',
        effectId: 'ACTION_DESERTER'
    },
    {
        id: 'rule_trample',
        tier: CARD_TIERS.SILVER,
        name: '践踏',
        type: CARD_TYPES.RULE,
        effect: '永续：你的相/象移动时可以吃掉阻挡路线的棋子（象眼处的棋子）。',
        note: 'pieces.js 中已允许移动到象眼目标，但具体的“吃掉象眼棋子”逻辑需要由 engine 处理',
        isImplemented: true, // Logic partly in piece filter, capture logic needs verification
        effectId: 'RULE_TRAMPLE'
    },
    {
        id: 'action_drift',
        tier: CARD_TIERS.MYTHIC,
        name: '漂移',
        type: CARD_TYPES.ACTION,
        effect: '你的一个车执行一次移动，到达终点后随机向非移动轴方向平移一步。',
        note: '尚未完全实现，需要复杂的移动后结算',
        isImplemented: false,
        needsTarget: true,
        targetSelf: true,
        targetType: 'chariot',
        effectId: 'ACTION_DRIFT'
    }
];
