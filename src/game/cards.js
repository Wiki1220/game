import { CARD_DATA, CARD_TIERS } from './cardDefs.js';

const PROBABILITIES = [
    { tier: CARD_TIERS.SILVER, weight: 40 },
    { tier: CARD_TIERS.GOLD, weight: 40 },
    { tier: CARD_TIERS.PRISMATIC, weight: 20 }
];

export const createRNG = (seed) => {
    let s = seed || Date.now();
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
    };
};

export const getRandomRarity = (rng) => {
    const rand = (rng ? rng() : Math.random()) * 100;
    let sum = 0;
    for (const p of PROBABILITIES) {
        sum += p.weight;
        if (rand < sum) return p.tier;
    }
    return CARD_TIERS.SILVER;
};

export const getRandomCards = (count = 3, forceRarity = null, rng = null) => {
    const random = rng || (() => Math.random());

    // 1. Determine Rarity
    const selectedRarity = forceRarity || getRandomRarity(random);

    // 2. Filter Pool
    let pool = CARD_DATA.filter(c => c.isImplemented && c.tier === selectedRarity);
    if (pool.length === 0) pool = CARD_DATA.filter(c => c.isImplemented);

    // 3. Pick Cards
    const selection = [];
    for (let i = 0; i < count; i++) {
        if (pool.length === 0) break;
        const randIndex = Math.floor(random() * pool.length);
        const randomCard = pool[randIndex];
        // UID
        selection.push({ ...randomCard, uid: Math.random().toString(36).substr(2, 9) }); // UID can be non-deterministic or seeded? Seeded is better for strict sync.
        // But UID doesn't affect logic much, just React keys. 
        // Let's stick with Math.random for UID to avoid complex string gen from float.
    }

    return {
        cards: selection,
        rarity: selectedRarity
    };
};
