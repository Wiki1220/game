import React from 'react';
import { CARD_TIERS } from '../game/cardDefs';

const TIER_STYLES = {
  [CARD_TIERS.SILVER]: {
    borderColor: '#c0c0c0',
    background: 'linear-gradient(135deg, #2c3e50, #bdc3c7)',
    icon: '🥈'
  },
  [CARD_TIERS.GOLD]: {
    borderColor: '#ffd700',
    background: 'linear-gradient(135deg, #b8860b, #f1c40f)',
    icon: '🥇'
  },
  [CARD_TIERS.PRISMATIC]: {
    borderColor: '#ff69b4', // Pinkish border backup
    isPrismatic: true, // Special flag for CSS animation
    icon: '🔮'
  }
};

const Card = ({ card, onClick, disabled, style }) => {
  const tierStyle = TIER_STYLES[card.tier] || TIER_STYLES[CARD_TIERS.SILVER];

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

      <div className="card-body">
        <p className="card-effect">{card.effect}</p>
      </div>

      <div className="card-shine"></div>

      <style>{`
        .game-card {
          width: 100px;
          height: 140px;
          border: 2px solid;
          border-radius: 8px;
          padding: 8px;
          color: white;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: transform 0.2s, box-shadow 0.2s;
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 6px rgba(0,0,0,0.3);
          user-select: none;
        }

        .game-card.prismatic {
          border: 2px solid transparent; 
          background: linear-gradient(#1a1a1a, #1a1a1a) padding-box,
                      linear-gradient(124deg, #ff2400, #e81d1d, #e8b71d, #e3e81d, #1de840, #1ddde8, #2b1de8, #dd00f3, #dd00f3, #e8b71d) border-box;
          animation: rainbow-border 5s ease infinite;
        }
        
        .game-card.prismatic .card-header,
        .game-card.prismatic .card-body {
             z-index: 2;
        }
        
        /* Inner flow for Prismatic background? 
           User asked "Prismatic level color scheme like the center of the image" (Rainbow).
           Let's apply a subtle rainbow gradient to the background too.
        */
        .game-card.prismatic::before {
             content: '';
             position: absolute; top:0; left:0; right:0; bottom:0;
             background: linear-gradient(124deg, rgba(255,0,0,0.2), rgba(0,255,0,0.2), rgba(0,0,255,0.2));
             z-index: 1;
             animation: rainbow-bg 10s ease infinite;
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
          box-shadow: 0 8px 12px rgba(0,0,0,0.5);
          z-index: 10;
        }

        .game-card.disabled {
          opacity: 0.5;
          cursor: not-allowed;
          filter: grayscale(0.8);
        }

        .card-header { font-weight: bold; font-size: 0.9em; margin-bottom: 5px; text-shadow: 0 1px 2px rgba(0,0,0,0.8); display: flex; justify-content: space-between; z-index: 2; }
        .card-body { flex: 1; font-size: 0.75em; line-height: 1.2; overflow-y: auto; text-shadow: 0 1px 1px rgba(0,0,0,0.5); z-index: 2; }
        .card-body::-webkit-scrollbar { display: none; }

        .card-shine {
          position: absolute; top: 0; left: -100%; width: 50%; height: 100%;
          background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0) 100%);
          transform: skewX(-20deg);
          animation: shine 3s infinite;
          z-index: 5;
        }
        @keyframes shine { 0% { left: -100%; } 20% { left: 200%; } 100% { left: 200%; } }
      `}</style>
    </div>
  );
};

export default Card;
