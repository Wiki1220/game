import React from 'react';
import './Card.css';
import { CARD_TYPES, CARD_TIERS } from '../game/cardDefs';

const Icons = {
    [CARD_TYPES.TRAP]: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 22h20L12 2zM12 16v2M12 8v4" />
        </svg>
    ),
    [CARD_TYPES.SPEED]: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
    ),
    [CARD_TYPES.ACTION]: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
        </svg>
    ),
    [CARD_TYPES.RULE]: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="21" x2="9" y2="9" />
        </svg>
    ),
    DEFAULT: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
        </svg>
    )
};

const TIER_CLASS_MAP = {
    [CARD_TIERS.SILVER]: 'silver',
    [CARD_TIERS.GOLD]: 'gold',
    [CARD_TIERS.MYTHIC]: 'red' // Mythic maps to 'red' CSS theme
};

const Card = ({ card, onClick, disabled }) => {
    // Map Chinese Tier to CSS class
    const rarityClass = TIER_CLASS_MAP[card.tier] || 'silver';

    return (
        <div
            className={`game-card rarity-${rarityClass} ${disabled ? 'disabled' : ''}`}
            onClick={!disabled ? onClick : undefined}
        >
            <div className="card-border-frame">
                <div className="card-header">
                    <span className="card-name">{card.name}</span>
                </div>

                {/* Middle: Icon */}
                <div className="card-art">
                    <div className={`icon-container`}>
                        {Icons[card.type] || Icons.DEFAULT}
                    </div>
                </div>

                <div className="card-info">
                    <p>{card.effect || card.desc}</p>
                </div>

                <div className="card-footer-badge">
                    {card.tier}
                </div>
            </div>
        </div>
    );
};

export default Card;
