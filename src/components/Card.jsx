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
    [CARD_TIERS.MYTHIC]: {
        borderColor: '#9b59b6',
        background: 'linear-gradient(135deg, #8e44ad, #d35400)',
        icon: '🔮'
    }
};

const Card = ({ card, onClick, disabled, style }) => {
    const tierStyle = TIER_STYLES[card.tier] || TIER_STYLES[CARD_TIERS.SILVER];

    return (
        <div
            className={`game-card ${disabled ? 'disabled' : ''}`}
            onClick={!disabled ? onClick : undefined}
            style={{
                ...style,
                borderColor: tierStyle.borderColor,
                background: tierStyle.background,
            }}
        >
            <div className="card-header">
                <span className="card-name">{card.name}</span>
                {/* <span className="card-icon">{tierStyle.icon}</span> */}
            </div>

            <div className="card-body">
                <p className="card-effect">{card.effect}</p>
            </div>

            {/* Decorative Shine */}
            <div className="card-shine"></div>

            <style>{`
        .game-card {
          width: 100px; /* Reduced width */
          height: 140px; /* Taller (Portrait) */
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

        .card-header {
          font-weight: bold;
          font-size: 0.9em;
          margin-bottom: 5px;
          text-shadow: 0 1px 2px rgba(0,0,0,0.8);
          display: flex;
          justify-content: space-between;
        }

        .card-body {
          flex: 1;
          font-size: 0.75em;
          line-height: 1.2;
          overflow-y: auto;
          text-shadow: 0 1px 1px rgba(0,0,0,0.5);
        }
        
        /* Scrollbar hidden for cleanliness */
        .card-body::-webkit-scrollbar { display: none; }

        .card-shine {
          position: absolute;
          top: 0; left: -100%;
          width: 50%; height: 100%;
          background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0) 100%);
          transform: skewX(-20deg);
          animation: shine 3s infinite;
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
