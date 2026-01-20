import React, { useMemo, useState } from 'react';
import './Board.css';

const Board = ({ boardState, selectedPieceId, validMoves, onSquareClick, lastMove, lastOpponentMove, traps, activeBuffs, selectableTargets = [], selectableEmptyPositions = [], summonedPieces = [], flip = false }) => {
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

        // 1. Summoned piece info
        if (summonedPieces && summonedPieces.includes(piece.id)) {
            const summonTypes = {
                'roadblock': '召唤物: 路障 (可被双方吃掉)',
                'jackpot': '召唤物: 大奖 (吃掉后手牌变彩色)',
                'soldier': '召唤物: 增援 (不可移动)',
                'arsenal': '召唤物: 武器库 (吃掉获得装备)'
            };
            const summonInfo = summonTypes[piece.type] || '召唤物';
            msgs.push(summonInfo);
        }

        // 2. Equipment (activeBuffs for this piece)
        if (activeBuffs) {
            const equipments = activeBuffs.filter(buff => buff.pieceId === piece.id);
            equipments.forEach(eq => {
                msgs.push(`装备: ${eq.name}`);
            });
        }

        // 3. Traps attached to this piece
        if (traps) {
            traps.forEach(trap => {
                if (trap.targetId === piece.id) {
                    const trapName = trap.name || '未知陷阱';
                    if (trap.type === 'TRAP_DOOMED') {
                        msgs.push("状态：被注定 (移动即弃牌)");
                    } else {
                        msgs.push(`陷阱: ${trapName}`);
                    }
                }
            });
        }

        // 4. Temporary piece properties
        if (piece.barrier) msgs.push("状态：屏障保护");
        if (piece.immobilized) msgs.push("状态：被定身");
        if (piece.immobile) msgs.push("状态：不可移动");
        if (piece.canCrossRiver) msgs.push("状态：可过河");

        if (msgs.length === 0) return null;

        return (
            <div className="piece-tooltip">
                {msgs.map((m, i) => <div key={i}>{m}</div>)}
            </div>
        );
    };

    // ISSUE-012 FIX: 使用 useMemo 缓存 cells 渲染，避免每次都重新计算90个格子
    const cells = useMemo(() => {
        const cellsArray = [];
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

                // Selectable for card target
                const isSelectableEmpty = selectableEmptyPositions.some(pos => pos.x === x && pos.y === y);

                cellsArray.push(
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

                        {piece && (() => {
                            // Calculate transform to preserve rotation AND scale/animation
                            let transformStyle = flip ? 'rotate(180deg)' : undefined;
                            if (isSelected && flip) transformStyle = 'rotate(180deg) scale(1.15)'; // Manually compose if flipped

                            // Determine class for animation
                            const isTarget = selectableTargets.includes(piece.id);
                            const targetClass = isTarget ? (flip ? 'selectable-target-flipped' : 'selectable-target') : '';

                            return (
                                <div
                                    className={`piece ${piece.player} ${piece.type} ${isSelected ? 'selected' : ''} ${targetClass} ${summonedPieces.includes(piece.id) ? 'summoned-piece' : ''}`}
                                    style={{ transform: transformStyle }}
                                >
                                    <span className="piece-text">
                                        {getPieceChar(piece.type, piece.player)}
                                    </span>
                                    {/* Tooltip */}
                                    {hoveredPieceId === piece.id && getPieceTooltip(piece)}
                                </div>
                            );
                        })()}

                        {isValidMove && !piece && <div className="highlight-overlay target" />}
                        {isValidMove && piece && <div className="highlight-overlay capture" />}
                        {isSelectableEmpty && <div className="highlight-overlay target" />}
                    </div>
                );
            }
        }
        return cellsArray;
    }, [boardState, selectedPieceId, validMoves, lastMove, lastOpponentMove, selectableTargets, selectableEmptyPositions, summonedPieces, flip, hoveredPieceId, traps, activeBuffs]);

    return (
        <div className="board-container">
            <div className="xiangqi-board" style={{ transform: flip ? 'rotate(180deg)' : 'none' }}>
                {renderGrid()}
                {cells}
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
                
                @keyframes pulse-scale {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.15); }
                }

                @keyframes pulse-scale-flipped {
                    0%, 100% { transform: rotate(180deg) scale(1); }
                    50% { transform: rotate(180deg) scale(1.15); }
                }
                
                .selectable-target {
                    animation: pulse-scale 1s ease-in-out infinite;
                }
                .selectable-target-flipped {
                    animation: pulse-scale-flipped 1s ease-in-out infinite;
                }
                
                .summoned-piece {
                    border-bottom: 3px solid #ffd700;
                    box-shadow: 0 2px 0 0 rgba(255, 215, 0, 0.5);
                }
                
                .piece.neutral {
                    color: #5d4037;
                    border-color: #4e342e;
                    background: #e0e0e0;
                }
            `}</style>
        </div>
    );
};

const getPieceChar = (type, player) => {
    const chars = {
        red: { general: '帅', advisor: '仕', elephant: '相', horse: '马', chariot: '车', cannon: '炮', soldier: '兵' },
        black: { general: '将', advisor: '士', elephant: '象', horse: '马', chariot: '车', cannon: '炮', soldier: '卒' },
        neutral: { roadblock: '障', jackpot: '奖', arsenal: '武', soldier: '援' }
    };
    if (chars[player] && chars[player][type]) return chars[player][type];
    // Try neutral fallback for summons, or return ?
    if (chars.neutral[type]) return chars.neutral[type];
    return '?';
};

export default Board;
