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

    // 3. Pick Cards (NO DUPLICATES)
    const selection = [];
    const availablePool = [...pool]; // Copy to avoid mutation

    for (let i = 0; i < count && availablePool.length > 0; i++) {
        const randIndex = Math.floor(random() * availablePool.length);
        const randomCard = availablePool[randIndex];

        // Add card with unique ID
        selection.push({
            ...randomCard,
            uid: `${randomCard.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        });

        // Remove selected card from pool to prevent duplicates
        availablePool.splice(randIndex, 1);
    }

    return {
        cards: selection,
        rarity: selectedRarity
    };
};
