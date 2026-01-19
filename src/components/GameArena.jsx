import React, { useReducer, useEffect, useState, useRef } from 'react';
import Board from './Board';
import DraftModal from './DraftModal';
import SettingsModal from './SettingsModal';
import { createInitialState, gameReducer, ActionTypes } from '../game/engine';
import { getPieceMoves } from '../game/pieces';
import Card from './Card';
import { PLAYERS, PHASES } from '../game/constants';
import { socket } from '../game/socket';

// Localization Helpers
const PIECE_NAMES = {
    red: { chariot: '车', horse: '马', elephant: '相', advisor: '仕', general: '帅', cannon: '炮', soldier: '兵' },
    black: { chariot: '车', horse: '马', elephant: '象', advisor: '士', general: '将', cannon: '砲', soldier: '卒' }
};

const formatLog = (entry) => {
    let action = entry.action;
    let info = entry.info;
    if (action === 'MOVE') action = '移动';
    if (action === 'DRAFT') action = '抽卡';
    if (action === 'PLAY') action = '打出';
    if (action === 'WIN') return info; // System msg

    if (entry.action === 'MOVE' && info && !info.includes('to')) {
        // already formatted? or simple
    } else if (entry.action === 'MOVE' && info) {
        const parts = info.split(' ');
        // Handle "chariot to (0,1)" format if needed, but existing engine log might be simple text
    }
    return `${action} ${info || ''}`;
};

function GameArena({ gameMode, initialRoomId, myInitialColor, onQuit, seed }) {
    const [gameState, dispatch] = useReducer(gameReducer, { seed }, createInitialState);
    const [showSettings, setShowSettings] = useState(false);
    const [myColor, setMyColor] = useState(myInitialColor || PLAYERS.RED);
    const [roomId, setRoomId] = useState(initialRoomId);
    const activeRoomId = useRef(initialRoomId);

    // Notification State
    const [notification, setNotification] = useState(null); // { message, detail }
    const [showGameOver, setShowGameOver] = useState(false); // Victory/Defeat

    // Hand Stacking State
    const [hoveredCardIndex, setHoveredCardIndex] = useState(null);

    // --- Effects ---

    // Timer
    useEffect(() => {
        const timer = setInterval(() => {
            if (gameState.phase !== 'GAMEOVER') {
                dispatch({ type: ActionTypes.TICK_TIMER });
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [gameState.phase]);

    // Socket
    useEffect(() => {
        if (gameMode !== 'ONLINE_GAME') return;
        socket.on('remote_action', (action) => dispatch(action));
        return () => socket.off('remote_action');
    }, [gameMode]);

    // Log Monitoring for Notifications & Game Over
    useEffect(() => {
        const lastEntry = gameState.log[gameState.log.length - 1];
        if (lastEntry) {
            // Game Over Check
            if (lastEntry.action === 'WIN') {
                setShowGameOver(true);
                return; // Don't show play notification if game over
            }

            // Card Play Notification (Opponent)
            if (lastEntry.action === 'PLAY' && lastEntry.player !== myColor) {
                showNotification(`对手使用了卡牌`, lastEntry.info);
            }
        }
    }, [gameState.log, myColor]);

    // Game Over Phase Check
    useEffect(() => {
        if (gameState.phase === 'GAMEOVER') {
            setShowGameOver(true);
        }
    }, [gameState.phase]);


    const showNotification = (title, msg) => {
        setNotification({ title, msg });
        setTimeout(() => setNotification(null), 2000);
    };

    // --- Handlers ---
    const handleGameAction = (action) => {
        dispatch(action);
        if (gameMode === 'ONLINE_GAME') {
            socket.emit('game_action', { roomId: activeRoomId.current, action });
        }
    };

    const handleDraft = (card) => {
        // Engine handles limit check (returns state with no change or skips), 
        // but UI check is good for feedback (though user said no prompt).
        // Engine reducer will just ignore if handfull? 
        // Actually we updated engine logic to skip phase if full.
        // So this modal shouldn't even appear if engine logic worked?
        // Wait, DRAFT phase is set by prepareNextTurn.
        // If Engine detects full hand, it sets phase to PLAY_CARD directly.
        // So DraftModal won't show. Correct.
        handleGameAction({ type: ActionTypes.DRAFT_CARD, payload: { card } });
    };

    const handlePlayCard = (card) => {
        handleGameAction({ type: ActionTypes.PLAY_CARD, payload: { card } });
    }; // Animation handled by CSS removal

    const endPlayPhase = () => handleGameAction({ type: ActionTypes.END_PLAY_PHASE });

    const handleSquareClick = (x, y) => {
        if (gameState.phase === 'GAMEOVER') return;
        if (gameMode === 'ONLINE_GAME' && gameState.turn !== myColor) return;

        const { board, turn, validMoves, pendingCard } = gameState;

        // 1. Pending Card Targeting
        if (pendingCard) {
            const clickedPiece = board.find(p => p.x === x && p.y === y);
            // Empty Target (e.g. Summon)
            if (!clickedPiece && pendingCard.targetEmpty) {
                handleGameAction({ type: ActionTypes.SELECT_PIECE, payload: { x, y } });
                return;
            }
            // Piece Target (Self/Enemy/Type checks will be done by Engine resolve)
            // But we can filter basic clicks here.
            if (clickedPiece) {
                handleGameAction({ type: ActionTypes.SELECT_PIECE, payload: { pieceId: clickedPiece.id, x, y } });
                return;
            }
            // Invalid click -> Cancel Card
            handleGameAction({ type: ActionTypes.CANCEL_CARD });
            return;
        }

        // 2. Move Logic
        const isMoveTarget = validMoves.some(m => m.x === x && m.y === y);
        if (isMoveTarget) {
            handleGameAction({
                type: ActionTypes.MOVE_PIECE,
                payload: { pieceId: gameState.selectedPieceId, toX: x, toY: y }
            });
            return;
        }

        // 3. Select Piece (Friendly)
        const clickedPiece = board.find(p => p.x === x && p.y === y);
        if (clickedPiece && clickedPiece.player === turn) {
            dispatch({ type: ActionTypes.SELECT_PIECE, payload: { pieceId: clickedPiece.id } });
        }
    };

    const activePlayerHand = gameState.players[gameState.turn].hand;

    // --- RENDER ---
    return (
        <div className="game-container">
            {/* Game Over Modal */}
            {showGameOver && (
                <div className="modal-overlay">
                    <div className="modal-content victory-modal">
                        <h1>
                            {gameState.log.find(l => l.action === 'WIN')?.info.includes(myColor)
                                ? "🏆 胜利！"
                                : (gameMode === 'LOCAL' ? "游戏结束" : "💀 败北")}
                        </h1>
                        <button className="primary-btn" onClick={onQuit}>返回主菜单</button>
                    </div>
                </div>
            )}

            {/* Notification Toast (Opponent Card) */}
            {notification && (
                <div className="notification-toast">
                    <h3>{notification.title}</h3>
                    <div className="card-preview-text">{notification.msg}</div>
                </div>
            )}

            {showSettings && (
                <SettingsModal onClose={() => setShowSettings(false)} onSurrender={() => { onQuit(); setShowSettings(false); }} onQuit={onQuit} />
            )}

            {/* Main Layout */}
            <div className="main-layout">
                <div className="board-section">
                    {/* Draft Modal */}
                    {gameState.phase === PHASES.DRAFT && (
                        (gameMode !== 'ONLINE_GAME' || gameState.turn === myColor) ? (
                            <DraftModal options={gameState.draftOptions} onSelect={handleDraft} />
                        ) : (
                            <div className="waiting-overlay">对手正在选牌...</div>
                        )
                    )}

                    <Board
                        boardState={gameState.board}
                        selectedPieceId={gameState.selectedPieceId}
                        validMoves={gameState.validMoves}
                        onSquareClick={handleSquareClick}
                        lastMove={gameState.lastMove}
                        traps={gameState.traps}
                        activeBuffs={gameState.activeBuffs}
                    />
                </div>

                <aside className="sidebar">
                    <div className="sidebar-section user-info">
                        <div className="user-details">
                            <div className={`avatar ${gameState.turn}`} />
                            <div className="username">
                                {gameState.turn === PLAYERS.RED ? '红方' : '黑方'}
                                {gameMode !== 'LOCAL' && (gameState.turn === myColor ? " (我)" : "")}
                            </div>
                        </div>
                        <button className="icon-btn settings-trigger" onClick={() => setShowSettings(true)}>⚙️</button>
                    </div>

                    {/* Global Rule Display (If any) */}
                    {gameState.globalRule && (
                        <div className="global-rule-display">
                            <small>当前规则</small>
                            <div>{gameState.globalRule.name}</div>
                        </div>
                    )}

                    <div className="sidebar-section hand-section">
                        <div className="section-header">
                            <span>锦囊 ({activePlayerHand.length})</span>
                        </div>

                        {/* Stacked Hand */}
                        <div className="hand-stack-container">
                            {activePlayerHand.map((card, index) => {
                                // Calculating offset
                                // Default: Stacked with ~30px offset
                                // Hover: Hovered card stays, Upper cards move UP or Lower move DOWN?
                                // User: "上方卡牌向下移动"? 
                                // Let's implement: Hovering expands spacing.

                                // Simple Stack:
                                const topOffset = index * 40; // 40px visible header
                                const zIndex = index;

                                const isHovered = hoveredCardIndex === index;
                                // Example Interaction:
                                // If we hover index 0 (bottom), index 1 and 2 move down to reveal 0? 
                                // No, 0 is covered by 1. To see 0, 1 must move away.
                                // Usually vertical stacks reveal on hover by spreading.

                                let finalTop = topOffset;
                                if (hoveredCardIndex !== null && index > hoveredCardIndex) {
                                    finalTop += 100; // Shift items below? No, items above.
                                    // Stack order: 0 is top or bottom?
                                    // Usually 0 is top in array, but visual?
                                    // Let's say 0 is at Top. 1 is below.
                                    // top: 0, top: 40, top: 80.
                                    // If I hover 0, 1 and 2 move down (top increased).
                                }
                                // Actually, code usually renders 0 first (behind) or last (front).
                                // HTML order: Last is on top (z-index).
                                // So index 0 is bottom-most.
                                // top: 0.
                                // index 1: top 40.
                                // index 2: top 80.
                                // If I hover 0: 1 and 2 should move DOWN (increase top).
                                if (hoveredCardIndex !== null && index > hoveredCardIndex) {
                                    finalTop += 90; // Reveal
                                }

                                return (
                                    <div
                                        key={card.uid}
                                        className="hand-card-wrapper"
                                        style={{ top: finalTop, zIndex }}
                                        onMouseEnter={() => setHoveredCardIndex(index)}
                                        onMouseLeave={() => setHoveredCardIndex(null)}
                                    >
                                        <Card
                                            card={card}
                                            onClick={() => {
                                                if (gameMode === 'ONLINE_GAME' && gameState.turn !== myColor) return;
                                                if (gameState.phase === PHASES.PLAY_CARD) handlePlayCard(card);
                                            }}
                                            disabled={gameState.phase !== PHASES.PLAY_CARD || (gameMode !== 'LOCAL' && gameState.turn !== myColor)}
                                        />
                                    </div>
                                );
                            })}
                            {activePlayerHand.length === 0 && <div className="empty-state">空手牌</div>}
                        </div>

                        {gameState.phase === PHASES.PLAY_CARD && (
                            <button className="primary-action full-width" onClick={endPlayPhase} disabled={gameMode !== 'LOCAL' && gameState.turn !== myColor} style={{ marginTop: 300 }}>
                                结束出牌
                            </button>
                        )}
                    </div>
                </aside>
            </div>

            <style>{`
        .notification-toast {
            position: absolute;
            top: 20%; left: 0;
            background: rgba(0,0,0,0.8);
            border: 2px solid #ffd700;
            border-left: none;
            padding: 20px 40px 20px 20px;
            color: #fff;
            border-radius: 0 10px 10px 0;
            animation: slideInLeft 0.5s;
            z-index: 200;
        }
        .card-preview-text { font-size: 1.2em; color: #ffd700; margin-top: 5px; }

        .hand-stack-container {
            position: relative;
            height: 400px; /* Enough for expanded stack */
            margin-top: 20px;
        }
        .hand-card-wrapper {
            position: absolute;
            left: 10px; right: 10px;
            transition: top 0.3s ease;
        }
        
        .waiting-overlay {
            position: absolute; top: 20px; left: 50%; transform: translateX(-50%);
            background: rgba(0,0,0,0.7); padding: 10px 20px; borderRadius: 20px; color: #fff;
        }

        .global-rule-display {
            background: #2c3e50;
            padding: 10px;
            margin: 10px;
            border-left: 3px solid #e74c3c;
            color: #fff;
        }

        .victory-modal {
            background: #222;
            color: white;
            padding: 40px;
            text-align: center;
            border: 2px solid gold;
        }
        .victory-modal h1 { font-size: 3em; margin-bottom: 30px; }

        @keyframes slideInLeft {
            from { transform: translateX(-100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
        </div>
    );
}

export default GameArena;
