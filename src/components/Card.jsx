import React from 'react';
import { CARD_TYPES, CARD_TIERS } from '../game/cardDefs';

const TIER_STYLES = {
  [CARD_TIERS.SILVER]: {
    borderColor: '#c0c0c0',
    background: 'linear-gradient(135deg, #2c3e50, #bdc3c7)',
  },
  [CARD_TIERS.GOLD]: {
    borderColor: '#ffd700',
    background: 'linear-gradient(135deg, #b8860b, #f1c40f)',
  },
  [CARD_TIERS.PRISMATIC]: {
    borderColor: '#ff69b4',
    isPrismatic: true,
  }
};

// Card type icon mapping
const TYPE_ICONS = {
  [CARD_TYPES.SPEED]: '⚡',      // Lightning for speed
  [CARD_TYPES.SUMMON]: '🎭',    // Mask for summon
  [CARD_TYPES.EQUIP]: '⚔️',     // Sword for equipment
  [CARD_TYPES.ACTION]: '🎯',    // Target for action
  [CARD_TYPES.RULE]: '📜',      // Scroll for rules
  [CARD_TYPES.TRAP]: '🕷️',      // Spider for trap
};

const Card = ({ card, onClick, disabled, style }) => {
  const tierStyle = TIER_STYLES[card.tier] || TIER_STYLES[CARD_TIERS.SILVER];
  const typeIcon = TYPE_ICONS[card.type] || '❓';

  return (
    <div
      className={`game-card ${disabled ? 'disabled' : ''} ${tierStyle.isPrismatic ? 'prismatic' : ''}`}
      onClick={!disabled ? onClick : undefined}
      style={{
        ...style,
        borderColor: tierStyle.isPrismatic ? 'transparent' : tierStyle.borderColor,
        background: tierStyle.isPrismatic ? undefined : tierStyle.background,
      }}
    >
      <div className="card-header">
        <span className="card-name">{card.name}</span>
      </div>

      <div className="card-icon-area">
        <span className="card-type-icon">{typeIcon}</span>
      </div>

      <div className="card-footer">
        <p className="card-effect">{card.effect}</p>
      </div>

      <div className="card-shine"></div>

      <style>{`
        .game-card {
          width: 120px;
          height: 160px;
          border: 2px solid;
          border-radius: 10px;
          padding: 10px;
          color: white;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: transform 0.2s, box-shadow 0.2s;
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 8px rgba(0,0,0,0.4);
          user-select: none;
        }

        .game-card.prismatic {
          border: 2px solid transparent; 
          background: linear-gradient(#1a1a1a, #1a1a1a) padding-box,
                      linear-gradient(124deg, #ff2400, #e81d1d, #e8b71d, #e3e81d, #1de840, #1ddde8, #2b1de8, #dd00f3, #dd00f3, #e8b71d) border-box;
          animation: rainbow-border 5s ease infinite;
          background-size: 1800% 1800%;
        }
        
        .game-card.prismatic::before {
             content: '';
             position: absolute; top:0; left:0; right:0; bottom:0;
             background: linear-gradient(124deg, rgba(255,0,0,0.15), rgba(0,255,0,0.15), rgba(0,0,255,0.15));
             background-size: 200% 200%;
             z-index: 1;
             animation: rainbow-bg 8s ease infinite;
        }

        @keyframes rainbow-border {
            0%{background-position:0% 50%}
            50%{background-position:100% 50%}
            100%{background-position:0% 50%}
        }
        @keyframes rainbow-bg {
            0%{background-position:0% 50%}
            50%{background-position:100% 50%}
            100%{background-position:0% 50%}
        }

        .game-card:hover:not(.disabled) {
          transform: translateY(-5px) scale(1.05);
          box-shadow: 0 10px 20px rgba(0,0,0,0.6);
          z-index: 10;
        }

        .game-card.disabled {
          opacity: 0.5;
          cursor: not-allowed;
          filter: grayscale(0.8);
        }

        .card-header { 
          text-align: center;
          padding: 5px 0;
          z-index: 2; 
          position: relative;
        }
        
        .card-name {
          font-weight: bold;
          font-size: 0.9em;
          text-shadow: 0 2px 4px rgba(0,0,0,0.8);
          display: block;
        }

        .card-icon-area {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
          position: relative;
        }

        .card-type-icon {
          font-size: 3.5em;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
        }

        .card-footer {
          padding: 8px 4px;
          background: rgba(0,0,0,0.4);
          border-radius: 5px;
          z-index: 2;
          position: relative;
        }

        .card-effect {
          margin: 0;
          font-size: 0.65em;
          line-height: 1.3;
          text-align: center;
          max-height: 40px;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          text-shadow: 0 1px 2px rgba(0,0,0,0.8);
        }

        .card-shine {
          position: absolute;
          top: 0;
          left: -100%;
          width: 50%;
          height: 100%;
          background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0) 100%);
          transform: skewX(-20deg);
          animation: shine 4s infinite;
          z-index: 5;
          pointer-events: none;
        }
        
        @keyframes shine { 
          0% { left: -100%; } 
          20% { left: 200%; } 
          100% { left: 200%; } 
        }
      `}</style>
    </div>
  );
};

export default Card;
