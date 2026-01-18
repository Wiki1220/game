import React from 'react';
import Card from './Card';
import './Card.css'; // Ensure we have the new styles

const Hand = ({ cards, onPlayCard, canPlay }) => {
    return (
        <div className="hand-container">
            <div className="hand-cards">
                {cards.map((card) => (
                    <div key={card.uid} className="hand-card-wrapper">
                        <Card
                            card={card}
                            onClick={() => canPlay && onPlayCard(card)}
                            disabled={!canPlay}
                        />
                    </div>
                ))}
                {cards.length === 0 && <div className="empty-hand">No Cards</div>}
            </div>
        </div>
    );
};

export default Hand;
