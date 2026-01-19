import React, { useMemo, useState } from 'react';
import './Board.css';

const Board = ({ boardState, selectedPieceId, validMoves, onSquareClick, lastMove, lastOpponentMove, traps, activeBuffs }) => {
    // Local state for hover tooltip
    const [hoveredPieceId, setHoveredPieceId] = useState(null);

    const getCenter = (idx, total) => `${(idx + 0.5) * (100 / total)}%`;

    const renderGrid = () => {
        // ... (Keep existing grid logic) ...
        const startX = '5.55%';
        const endX = '94.44%';
        const startY = '5%';
        const endY = '95%';
        const riverTopY = '45%';
        const riverBottomY = '55%';

        return (
            <div className="board-grid-overlay">
                {Array.from({ length: 10 }).map((_, i) => (
                    <div key={`h-${i}`} className="grid-line-horiz" style={{ top: getCenter(i, 10), left: startX, right: `calc(100% - ${endX})` }}></div>
                ))}
                {Array.from({ length: 9 }).map((_, i) => {
                    const leftPos = getCenter(i, 9);
                    if (i === 0 || i === 8) {
                        return <div key={`v-${i}`} className="grid-line-vert" style={{ left: leftPos, top: startY, bottom: `calc(100% - ${endY})` }}></div>;
                    } else {
                        return (
                            <React.Fragment key={`v-${i}`}>
                                <div className="grid-line-vert" style={{ left: leftPos, top: startY, bottom: '55%' }}></div>
                                <div className="grid-line-vert" style={{ left: leftPos, top: '55%', bottom: `calc(100% - ${endY})` }}></div>
                            </React.Fragment>
                        );
                    }
                })}
                <svg className="palace-lines" width="100%" height="100%">
                    <line x1={getCenter(3, 9)} y1={getCenter(0, 10)} x2={getCenter(5, 9)} y2={getCenter(2, 10)} stroke="#5d4037" strokeWidth="1" />
                    <line x1={getCenter(5, 9)} y1={getCenter(0, 10)} x2={getCenter(3, 9)} y2={getCenter(2, 10)} stroke="#5d4037" strokeWidth="1" />
                    <line x1={getCenter(3, 9)} y1={getCenter(7, 10)} x2={getCenter(5, 9)} y2={getCenter(9, 10)} stroke="#5d4037" strokeWidth="1" />
                    <line x1={getCenter(5, 9)} y1={getCenter(7, 10)} x2={getCenter(3, 9)} y2={getCenter(9, 10)} stroke="#5d4037" strokeWidth="1" />
                </svg>
                <div className="river-bank"><span>楚 河</span><span>汉 界</span></div>
            </div>
        );
    };

    const getPieceTooltip = (piece) => {
        if (!piece) return null;
        let msgs = [];

        // 1. Check Traps (Attachments)
        if (traps) {
            traps.forEach(trap => {
                if (trap.targetId === piece.id) {
                    // Map trap type to text. 
                    // To do this robustly, we might want map or pass full card name in trap object?
                    // Engine 'traps' array stores { type: effectId, targetId }.
                    // We can map effectId to text.
                    if (trap.type === 'TRAP_DOOMED') msgs.push("状态：被注定 (移动即弃牌)");
                }
            });
        }

        // 2. Global Buffs (if specific to piece type)
        // e.g. IGNORE_HORSE_LEG for Horse
        if (activeBuffs && activeBuffs.includes('IGNORE_HORSE_LEG') && piece.type === 'horse') {
            // Check player? Engine activeBuffs applies to TURN player usually.
            // If I view enemy horse, does it have buff?
            // Usually activeBuffs cleared on turn switch. So only current turn player has them.
            // But visual feedback is good.
            // Assuming activeBuffs is just strings.
            if (piece.player === 'red' || piece.player === 'black') {
                // Actually activeBuffs in engine usually means "Current Turn Player's buffs".
                // We don't check piece player here easily without knowing whose turn it is from props.
                // But typically buffs are "My Horse".
                msgs.push("状态：无视马脚");
            }
        }

        if (msgs.length === 0) return null;

        return (
            <div className="piece-tooltip">
                {msgs.map((m, i) => <div key={i}>{m}</div>)}
            </div>
        );
    };

    const renderCells = () => {
        const cells = [];
        for (let y = 0; y < 10; y++) {
            for (let x = 0; x < 9; x++) {
                const piece = boardState.find(p => p.x === x && p.y === y);
                const isSelected = piece && piece.id === selectedPieceId;
                const isValidMove = validMoves.some(m => m.x === x && m.y === y);

                // Last Move markers
                const isLastSrc = lastMove && lastMove.fromX === x && lastMove.fromY === y;
                const isLastDst = lastMove && lastMove.toX === x && lastMove.toY === y;

                // Opponent Move Highlight (golden)
                const isOpponentFrom = lastOpponentMove && lastOpponentMove.from && lastOpponentMove.from.x === x && lastOpponentMove.from.y === y;
                const isOpponentTo = lastOpponentMove && lastOpponentMove.to && lastOpponentMove.to.x === x && lastOpponentMove.to.y === y;

                cells.push(
                    <div
                        key={`${x}-${y}`}
                        className={`board-square ${isValidMove ? 'valid-target' : ''}`}
                        onClick={() => onSquareClick(x, y)}
                        onMouseEnter={() => piece && setHoveredPieceId(piece.id)}
                        onMouseLeave={() => setHoveredPieceId(null)}
                    >
                        {/* Markers */}
                        {isLastSrc && <div className="last-move-marker src" />}
                        {isLastDst && <div className="last-move-marker dst" />}
                        {isOpponentFrom && <div className="opponent-move-marker from" />}
                        {isOpponentTo && <div className="opponent-move-marker to" />}

                        {piece && (
                            <div className={`piece ${piece.player} ${piece.type} ${isSelected ? 'selected' : ''}`}>
                                <span className="piece-text">
                                    {getPieceChar(piece.type, piece.player)}
                                </span>
                                {/* Tooltip */}
                                {hoveredPieceId === piece.id && getPieceTooltip(piece)}
                            </div>
                        )}

                        {isValidMove && !piece && <div className="highlight-overlay target" />}
                        {isValidMove && piece && <div className="highlight-overlay capture" />}
                    </div>
                );
            }
        }
        return cells;
    };

    return (
        <div className="board-container">
            <div className="xiangqi-board">
                {renderGrid()}
                {renderCells()}
            </div>
            <style>{`
                .last-move-marker {
                    position: absolute;
                    width: 100%; height: 100%;
                    pointer-events: none;
                    z-index: 1;
                }
                .last-move-marker.src {
                    background-color: rgba(255, 255, 0, 0.3); /* Yellow Tint */
                    border: 2px dashed rgba(255, 215, 0, 0.8);
                }
                .last-move-marker.dst {
                    background-color: rgba(255, 255, 0, 0.3);
                    box-shadow: 0 0 10px rgba(255, 215, 0, 0.6);
                }
                .opponent-move-marker {
                    position: absolute;
                    width: 100%; height: 100%;
                    pointer-events: none;
                    z-index: 2;
                }
                .opponent-move-marker.from {
                    box-shadow: 0 0 15px 3px rgba(255, 215, 0, 0.6);
                    border: 2px solid rgba(255, 215, 0, 0.8);
                }
                .opponent-move-marker.to {
                    box-shadow: 0 0 15px 3px rgba(255, 215, 0, 0.7);
                    border: 2px solid rgba(255, 215, 0, 0.9);
                    background-color: rgba(255, 215, 0, 0.2);
                }
                .piece-tooltip {
                    position: absolute;
                    bottom: 110%;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(0,0,0,0.9);
                    color: #fff;
                    padding: 5px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    white-space: nowrap;
                    z-index: 100;
                    pointer-events: none;
                }
            `}</style>
        </div>
    );
};

const getPieceChar = (type, player) => {
    const chars = {
        red: { general: '帅', advisor: '仕', elephant: '相', horse: '马', chariot: '车', cannon: '炮', soldier: '兵' },
        black: { general: '将', advisor: '士', elephant: '象', horse: '马', chariot: '车', cannon: '炮', soldier: '卒' }
    };
    return chars[player][type];
};

export default Board;
