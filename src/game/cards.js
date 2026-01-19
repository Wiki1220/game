import { CARD_DATA, CARD_TIERS } from './cardDefs.js';

// Probabilities check
// Silver 40%, Gold 40%, Mythic 20%
const PROBABILITIES = [
    { tier: CARD_TIERS.SILVER, weight: 40 },
    { tier: CARD_TIERS.GOLD, weight: 40 },
    { tier: CARD_TIERS.MYTHIC, weight: 20 }
];

export const getRandomRarity = () => {
    const random = Math.random() * 100;
    let sum = 0;
    for (const p of PROBABILITIES) {
        sum += p.weight;
        if (random < sum) return p.tier;
    }
    return CARD_TIERS.SILVER; // Fallback
};

export const getRandomCards = (count = 3, forceRarity = null) => {
    // 1. Determine Rarity for this batch
    const selectedRarity = forceRarity || getRandomRarity();

    // 2. Filter Pool by Rarity AND Implementation
    const pool = CARD_DATA.filter(c => c.isImplemented && c.tier === selectedRarity);

    // If pool is empty (e.g. no Mythic cards implemented), fallback to lower tiers
    // For now, let's assume we have enough or allow duplication if needed, 
    // but better to fallback than crash.
    let validPool = pool;
    if (validPool.length === 0) {
        // Fallback to ANY implemented
        validPool = CARD_DATA.filter(c => c.isImplemented);
    }

    // 3. Pick Cards
    const selection = [];
    for (let i = 0; i < count; i++) {
        if (validPool.length === 0) break;
        const randomCard = validPool[Math.floor(Math.random() * validPool.length)];
        // Add Unique ID for this instance
        selection.push({ ...randomCard, uid: Math.random().toString(36).substr(2, 9) });
    }

    return {
        cards: selection,
        rarity: selectedRarity
    };
};
