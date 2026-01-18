import React, { useMemo } from 'react';
import './Board.css';

const Board = ({ boardState, selectedPieceId, validMoves, onSquareClick }) => {

    // Use useMemo to avoid recalculating grid percentages constantly
    // 9 Cols (0-8)
    // 10 Rows (0-9)
    // Grid layout puts items in cells. Center of cell (0,0) is where piece sits.
    // We want lines to intersect at center of cells.

    const getCenter = (idx, total) => `${(idx + 0.5) * (100 / total)}%`;

    const renderGrid = () => {
        // We stop lines slightly before the edge of the board container to look cleaner
        // E.g. Start at center of col 0, end at center of col 8.
        const startX = '5.55%'; // Center of Col 0
        const endX = '94.44%';   // Center of Col 8
        const startY = '5%';    // Center of Row 0
        const endY = '95%';     // Center of Row 9

        const riverTopY = '45%'; // Between Row 4 and 5
        const riverBottomY = '55%';

        return (
            <div className="board-grid-overlay">
                {/* Horizontal Lines (10 rows) */}
                {Array.from({ length: 10 }).map((_, i) => (
                    <div
                        key={`h-${i}`}
                        className="grid-line-horiz"
                        style={{
                            top: getCenter(i, 10),
                            left: startX,
                            right: `calc(100% - ${endX})` // CSS right is distance from right edge
                        }}
                    ></div>
                ))}

                {/* Vertical Lines (9 cols) */}
                {/* Edges (0 and 8) are FULL HEIGHT. Inner (1-7) break at river. */}
                {Array.from({ length: 9 }).map((_, i) => {
                    const leftPos = getCenter(i, 9);
                    if (i === 0 || i === 8) {
                        return (
                            <div
                                key={`v-${i}`}
                                className="grid-line-vert"
                                style={{ left: leftPos, top: startY, bottom: `calc(100% - ${endY})` }}
                            ></div>
                        );
                    } else {
                        // Inner lines
                        return (
                            <React.Fragment key={`v-${i}`}>
                                {/* Top Half: Row 0 to Row 4 */}
                                <div
                                    className="grid-line-vert"
                                    style={{ left: leftPos, top: startY, bottom: '55%' /* Breaks at river top */ }}
                                ></div>
                                {/* Bottom Half: Row 5 to Row 9 */}
                                <div
                                    className="grid-line-vert"
                                    style={{ left: leftPos, top: '55%', bottom: `calc(100% - ${endY})` }}
                                ></div>
                            </React.Fragment>
                        );
                    }
                })}

                {/* Palace Diagonals */}
                <svg className="palace-lines" width="100%" height="100%">
                    {/* Top Palace: (3,0) to (5,2) */}
                    <line x1={getCenter(3, 9)} y1={getCenter(0, 10)} x2={getCenter(5, 9)} y2={getCenter(2, 10)} stroke="#5d4037" strokeWidth="1" />
                    <line x1={getCenter(5, 9)} y1={getCenter(0, 10)} x2={getCenter(3, 9)} y2={getCenter(2, 10)} stroke="#5d4037" strokeWidth="1" />

                    {/* Bottom Palace: (3,7) to (5,9) */}
                    <line x1={getCenter(3, 9)} y1={getCenter(7, 10)} x2={getCenter(5, 9)} y2={getCenter(9, 10)} stroke="#5d4037" strokeWidth="1" />
                    <line x1={getCenter(5, 9)} y1={getCenter(7, 10)} x2={getCenter(3, 9)} y2={getCenter(9, 10)} stroke="#5d4037" strokeWidth="1" />
                </svg>

                {/* River Text */}
                <div className="river-bank">
                    <span>楚 河</span>
                    <span>汉 界</span>
                </div>
            </div>
        );
    };

    const renderCells = () => {
        // ... same as before but ensure classNames match ...
        const cells = [];
        for (let y = 0; y < 10; y++) {
            for (let x = 0; x < 9; x++) {
                const piece = boardState.find(p => p.x === x && p.y === y);
                const isSelected = piece && piece.id === selectedPieceId;
                const isValidMove = validMoves.some(m => m.x === x && m.y === y);

                cells.push(
                    <div
                        key={`${x}-${y}`}
                        className={`board-square ${isValidMove ? 'valid-target' : ''}`}
                        onClick={() => onSquareClick(x, y)}
                    >
                        {piece && (
                            <div className={`piece ${piece.player} ${piece.type} ${isSelected ? 'selected' : ''}`}>
                                <span className="piece-text">
                                    {getPieceChar(piece.type, piece.player)}
                                </span>
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
