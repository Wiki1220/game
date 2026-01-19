export const CARD_TIERS = {
    SILVER: '白银',
    GOLD: '黄金',
    PRISMATIC: '彩色',
};

export const CARD_TYPES = {
    SPEED: '速攻',
    TRAP: '陷阱',
    ACTION: '行动',
    RULE: '永续', // 规则 -> 永续
    SUMMON: '召唤', // New
    EQUIP: '装备', // New
};

export const CARD_DATA = [
    // --- SUMMONS ---
    {
        id: 'summon_roadblock',
        tier: CARD_TIERS.GOLD,
        name: '路障',
        type: CARD_TYPES.SUMMON,
        effect: '召唤一个中立棋子，可以被双方玩家吃掉。',
        effectId: 'SUMMON_ROADBLOCK',
        needsTarget: true, // Select empty space
        targetEmpty: true,
        isImplemented: true
    },
    {
        id: 'summon_jackpot',
        tier: CARD_TIERS.SILVER,
        name: '大奖',
        type: CARD_TYPES.SUMMON,
        effect: '在随机位置召唤一个奖励中立棋子，吃掉该棋子的玩家的所有手牌变为等量彩色卡牌。',
        effectId: 'SUMMON_JACKPOT',
        isImplemented: true
    },
    {
        id: 'summon_reinforce',
        tier: CARD_TIERS.PRISMATIC,
        name: '增援',
        type: CARD_TYPES.SUMMON,
        effect: '选择一个空地，召唤一个友方棋子(兵)，该棋子不可被移动。',
        effectId: 'SUMMON_FRIENDLY',
        needsTarget: true,
        targetEmpty: true,
        isImplemented: true
    },
    {
        id: 'summon_arsenal',
        tier: CARD_TIERS.SILVER,
        name: '武器库',
        type: CARD_TYPES.SUMMON,
        effect: '随机选取一个空地召唤一个武器库，吃掉武器库的棋子获得一个适配的装备。',
        effectId: 'SUMMON_ARSENAL',
        isImplemented: true
    },

    // --- RULES (永续) ---
    {
        id: 'rule_pursuit',
        tier: CARD_TIERS.PRISMATIC,
        name: '追杀',
        type: CARD_TYPES.RULE,
        effect: '若你此回合行动后对敌人进行将军，则对手只能移动将。',
        effectId: 'RULE_PURSUIT',
        isImplemented: true
    },
    {
        id: 'rule_unlimited',
        tier: CARD_TIERS.SILVER,
        name: '永续', // Card Name is "永续"? User said "银色 永续：召唤物数量不再受到限制". Probably name is "无限"? User said "银色 永续...". 
        // Let's call it "无限".
        name: '无限',
        type: CARD_TYPES.RULE,
        effect: '召唤物数量不再受到限制。',
        effectId: 'RULE_UNLIMITED',
        isImplemented: true
    },
    {
        id: 'rule_restrict',
        tier: CARD_TIERS.SILVER,
        name: '限行',
        type: CARD_TYPES.RULE,
        effect: '所有车至多移动四格。',
        effectId: 'RULE_RESTRICT',
        isImplemented: true
    },
    {
        id: 'rule_burn',
        tier: CARD_TIERS.SILVER,
        name: '焚烧',
        type: CARD_TYPES.RULE,
        effect: '后续所有被抽到的卡只能在当回合使用，否则会自动被弃置。',
        effectId: 'RULE_BURN',
        isImplemented: true
    },
    {
        id: 'rule_equilibrium', // "永续：装备的效果无法生效" -> Name? User said "金色 永续：装备的效果无法生效". Maybe name is "无效化"? Or "静默"? 
        // Let's call it "静默".
        name: '静默',
        tier: CARD_TIERS.GOLD,
        type: CARD_TYPES.RULE,
        effect: '装备的效果无法生效。',
        effectId: 'RULE_EQUILIBRIUM',
        isImplemented: true
    },
    {
        id: 'rule_tide',
        tier: CARD_TIERS.SILVER,
        name: '涨潮',
        type: CARD_TYPES.RULE, // It says "2 turns", so maybe Trap or distinct logic? User classified as "Silver Tide". Effect: 2 turns no river crossing.
        // It's a temporary Rule.
        effect: '两个回合内，所有棋子无法过河。',
        effectId: 'RULE_TIDE',
        isImplemented: true
    },

    // --- ACTIONS ---
    {
        id: 'action_universe',
        tier: CARD_TIERS.GOLD,
        name: '宇宙',
        type: CARD_TYPES.ACTION,
        effect: '若你没有相同的棋子，则消灭己方棋盘上所有的敌方棋子。',
        effectId: 'ACTION_UNIVERSE',
        isImplemented: true
    },
    {
        id: 'action_typhoon',
        tier: CARD_TIERS.PRISMATIC,
        name: '台风',
        type: CARD_TYPES.ACTION,
        effect: '摧毁所有已经发动的陷阱效果。',
        effectId: 'ACTION_TYPHOON',
        isImplemented: true
    },
    {
        id: 'action_future',
        tier: CARD_TIERS.GOLD,
        name: '增援未来',
        type: CARD_TYPES.ACTION,
        effect: '选择一个友方棋子，将其暂时移出游戏，在你的下下个行动阶段开始，使其回归原位，并吃掉当前位置的棋子。',
        effectId: 'ACTION_FUTURE',
        needsTarget: true,
        targetSelf: true,
        isImplemented: true
    },
    {
        id: 'action_whisper',
        tier: CARD_TIERS.PRISMATIC,
        name: '古神低语',
        type: CARD_TYPES.ACTION,
        effect: '随机发动五张通常卡，目标会随机选定。',
        effectId: 'ACTION_WHISPER',
        isImplemented: true
    },
    {
        id: 'action_undead',
        tier: CARD_TIERS.SILVER,
        name: '亡灵大军',
        type: CARD_TYPES.ACTION,
        effect: '在你全部兵死亡的场合可以发动，复活你的所有兵。',
        effectId: 'ACTION_UNDEAD',
        isImplemented: true
    },
    {
        id: 'action_fireball',
        tier: CARD_TIERS.PRISMATIC,
        name: '火球术',
        type: CARD_TYPES.ACTION,
        effect: '在你的棋子少于对手时可以发动，消灭一个在友方棋子攻击范围内的棋子。',
        effectId: 'ACTION_FIREBALL',
        needsTarget: true, // Enemy piece in range
        targetEnemy: true,
        isImplemented: true
    },
    {
        id: 'action_nano',
        tier: CARD_TIERS.SILVER,
        name: '纳米激素',
        type: CARD_TYPES.ACTION,
        effect: '选择一个友方棋子，使其随机行动两步。',
        effectId: 'ACTION_NANO',
        needsTarget: true,
        targetSelf: true,
        isImplemented: true
    },
    {
        id: 'action_flood',
        tier: CARD_TIERS.SILVER,
        name: '洪水预警',
        type: CARD_TYPES.ACTION,
        effect: '六个回合后，消灭楚河汉界上的全部棋子。',
        effectId: 'ACTION_FLOOD',
        isImplemented: true
    },
    {
        id: 'action_time_distort',
        tier: CARD_TIERS.SILVER,
        name: '时空扰乱',
        type: CARD_TYPES.ACTION,
        effect: '下个回合对手的时间只有十五秒。',
        effectId: 'ACTION_TIME_DISTORT',
        isImplemented: true
    },
    {
        id: 'action_escort',
        tier: CARD_TIERS.GOLD,
        name: '护驾',
        type: CARD_TYPES.ACTION,
        effect: '应将时可以发动，选择一个空地，将一个随机友方棋子传送至该位置。',
        effectId: 'ACTION_ESCORT',
        needsTarget: true,
        targetEmpty: true,
        isImplemented: true
    },
    {
        id: 'action_sus_trade',
        tier: CARD_TIERS.SILVER,
        name: '可疑交易',
        type: CARD_TYPES.ACTION,
        effect: '若你的对手下一个行动阶段使用的棋子与你当前回合相同，则消灭两个棋子。',
        effectId: 'ACTION_SUS_TRADE',
        isImplemented: true
    },
    {
        id: 'action_immobilize',
        tier: CARD_TIERS.PRISMATIC,
        name: '定身术',
        type: CARD_TYPES.ACTION,
        effect: '选择一个敌方棋子，下一回合对手无法行动该棋子。',
        effectId: 'ACTION_IMMOBILIZE',
        needsTarget: true,
        targetEnemy: true,
        isImplemented: true
    },
    {
        id: 'action_mind_control',
        tier: CARD_TIERS.GOLD,
        name: '精神控制',
        type: CARD_TYPES.ACTION,
        effect: '选择一个敌方棋子，使其向随机有空位的方向移动一格。',
        effectId: 'ACTION_MIND_CONTROL',
        needsTarget: true,
        targetEnemy: true,
        isImplemented: true
    },
    {
        id: 'action_ignition',
        tier: CARD_TIERS.PRISMATIC,
        name: '点火',
        type: CARD_TYPES.ACTION,
        effect: '选择一个友方车，若其在出生点且前方一个为空地，使其前进一格。',
        effectId: 'ACTION_IGNITION',
        needsTarget: true,
        targetSelf: true,
        targetType: 'chariot',
        isImplemented: true
    },

    // --- EQUIPS / TRAPS ---
    // User calls them "Equip", but logic matches Attachments.
    {
        id: 'equip_dress',
        tier: CARD_TIERS.SILVER,
        name: '洋装',
        type: CARD_TYPES.EQUIP,
        effect: '选择一个友方兵，当其进入对方棋盘底行时，将其变为车并随机获得一张彩色卡牌。',
        effectId: 'EQUIP_DRESS',
        needsTarget: true,
        targetSelf: true,
        targetType: 'soldier',
        isImplemented: true
    },
    {
        id: 'equip_suicide',
        tier: CARD_TIERS.SILVER,
        name: '自爆卡车',
        type: CARD_TYPES.EQUIP,
        effect: '选择一个友方车装备，它在吃掉一个地方棋子后消灭自身，并消灭四周的全部棋子。',
        effectId: 'EQUIP_SUICIDE',
        needsTarget: true,
        targetSelf: true,
        targetType: 'chariot',
        isImplemented: true
    },
    {
        id: 'equip_barrier',
        tier: CARD_TIERS.GOLD,
        name: '屏障',
        type: CARD_TYPES.EQUIP, // One turn only usually, but let's treat as short equip
        effect: '选择一个友方棋子，在你的下一个回合开始前，它所在的位置无法被选中。',
        effectId: 'EQUIP_BARRIER',
        needsTarget: true,
        targetSelf: true,
        isImplemented: true
    },
    {
        id: 'equip_lifejacket',
        tier: CARD_TIERS.GOLD,
        name: '救生衣',
        type: CARD_TYPES.EQUIP,
        effect: '选择一个友方相装备，它可以过河。',
        effectId: 'EQUIP_LIFEJACKET',
        needsTarget: true,
        targetSelf: true,
        targetType: 'elephant',
        isImplemented: true
    },
    {
        id: 'equip_horseshoe',
        tier: CARD_TIERS.GOLD,
        name: '马蹄',
        type: CARD_TYPES.EQUIP,
        effect: '选择一个友方马装备，它可以无视马脚行动，但是无法因此吃子。',
        effectId: 'EQUIP_HORSESHOE',
        needsTarget: true,
        targetSelf: true,
        targetType: 'horse',
        isImplemented: true
    },
    {
        id: 'equip_medal',
        tier: CARD_TIERS.SILVER,
        name: '免死金牌',
        type: CARD_TYPES.EQUIP,
        effect: '选择一个友方士装备，当九宫格内有其它棋子被吃时，消灭装备者，将被吃掉的棋子在装备者位置复活。',
        effectId: 'EQUIP_MEDAL',
        needsTarget: true,
        targetSelf: true,
        targetType: 'advisor',
        isImplemented: true
    },

    // --- TRAPS ---
    {
        id: 'trap_overload',
        tier: CARD_TIERS.SILVER,
        name: '过载',
        type: CARD_TYPES.TRAP, // Acts on Player? "陷阱：过载".
        effect: '对你的对手在一个回合内发动了第三张卡牌，强制结束他的当前回合。',
        effectId: 'TRAP_OVERLOAD',
        isImplemented: true
    },

    // --- SPEED ---
    {
        id: 'speed_shrug',
        tier: CARD_TIERS.SILVER,
        name: '耸肩无视',
        type: CARD_TYPES.SPEED,
        effect: '你的炮使用召唤物作为跳板时不会死亡。',
        effectId: 'SPEED_SHRUG',
        isImplemented: true
    },
    {
        id: 'speed_column',
        tier: CARD_TIERS.GOLD,
        name: '绕柱',
        type: CARD_TYPES.SPEED,
        effect: '在应将的场合可以发动，你只能行动将，但是可以走两步。',
        effectId: 'SPEED_COLUMN',
        isImplemented: true
    }
];
