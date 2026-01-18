import { CARD_DATA } from './cardDefs';

// Re-export for compatibility if needed elsewhere
export { CARD_DATA };

export const getRandomCards = (count = 3) => {
    const selection = [];
    // Filter only implemented cards for now to avoid crashes? 
    // User wants to add cards via file, so perhaps we show them even if not implemented?
    // "是否已经实现" flag matches. Let's filter by isImplemented === true for the draft to avoid bugs.
    // Or users might want to see them as placeholders. 
    // I'll filter for now to be safe, or maybe just all.
    // Let's stick to ALL, but maybe the UI disables them?
    // User logic: "I can edit this file... you execute logic".

    // For random draft, stick to implemented ones for gameplay stability unless debug.
    const pool = CARD_DATA.filter(c => c.isImplemented);

    for (let i = 0; i < count; i++) {
        if (pool.length === 0) break;
        const randomCard = pool[Math.floor(Math.random() * pool.length)];
        // Add Unique ID for this instance
        selection.push({ ...randomCard, uid: Math.random().toString(36).substr(2, 9) });
    }
    return selection;
};
