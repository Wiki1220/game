import React from 'react';
import './Piece.css';
import { PIECE_TYPES, PLAYERS } from '../game/constants';

const CHARACTERS = {
    [PLAYERS.RED]: {
        [PIECE_TYPES.GENERAL]: '帥',
        [PIECE_TYPES.ADVISOR]: '仕',
        [PIECE_TYPES.ELEPHANT]: '相',
        [PIECE_TYPES.HORSE]: '馬',
        [PIECE_TYPES.CHARIOT]: '車',
        [PIECE_TYPES.CANNON]: '炮',
        [PIECE_TYPES.SOLDIER]: '兵',
    },
    [PLAYERS.BLACK]: {
        [PIECE_TYPES.GENERAL]: '將',
        [PIECE_TYPES.ADVISOR]: '士',
        [PIECE_TYPES.ELEPHANT]: '象',
        [PIECE_TYPES.HORSE]: '馬',
        [PIECE_TYPES.CHARIOT]: '車',
        [PIECE_TYPES.CANNON]: '炮',
        [PIECE_TYPES.SOLDIER]: '卒',
    },
};

const Piece = ({ piece, selected, onClick }) => {
    if (!piece) return <div className="piece-placeholder" onClick={onClick} />;

    const { type, player } = piece;
    const char = CHARACTERS[player][type];

    return (
        <div
            className={`piece piece-${player} ${selected ? 'selected' : ''}`}
            onClick={onClick}
        >
            <div className="piece-inner">
                <span className="piece-char">{char}</span>
            </div>
        </div>
    );
};

export default Piece;
