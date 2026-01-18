import React from 'react';
import Card from './Card';
import './DraftModal.css';

const DraftModal = ({ options, onSelect }) => {
    if (!options || options.length === 0) return null;

    return (
        <div className="draft-overlay">
            <div className="draft-modal">
                <h2>Choose Your Tactic</h2>
                <div className="draft-options">
                    {options.map((card, index) => (
                        <div key={card.uid || index} className="draft-card-wrapper" onClick={() => onSelect(card)}>
                            <Card card={card} />
                        </div>
                    ))}
                </div>
                <p className="draft-hint">Select a card to add to your hand.</p>
            </div>
        </div>
    );
};

export default DraftModal;
