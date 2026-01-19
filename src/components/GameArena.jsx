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

    // Opponent Card Preview
    const [opponentCardPreview, setOpponentCardPreview] = useState(null); // { card, isTrap }

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

    // Log Monitoring for Notifications & Game Over & Opponent Card Preview
    useEffect(() => {
        const lastEntry = gameState.log[gameState.log.length - 1];
        if (lastEntry) {
            // Game Over Check
            if (lastEntry.action === 'WIN') {
                setShowGameOver(true);
                return; // Don't show play notification if game over
            }

            // Card Play Notification & Preview (Opponent)
            if (lastEntry.text && lastEntry.text.includes('使用')) {
                const isOpponent = (lastEntry.turn && lastEntry.turn !== myColor) ||
                    (gameMode === 'LOCAL' && lastEntry.turn !== gameState.turn);

                if (isOpponent) {
                    // Extract card name from log text like "红方 使用 路障"
                    const match = lastEntry.text.match(/使用\s+(.+)/);
                    if (match) {
                        const cardName = match[1];
                        // Check if it's a trap card (陷阱)
                        const isTrap = cardName.includes('陷阱') || lastEntry.text.includes('陷阱');

                        setOpponentCardPreview({
                            card: { name: isTrap ? '???' : cardName, effect: isTrap ? '对手发动了陷阱卡' : '' },
                            isTrap
                        });

                        setTimeout(() => setOpponentCardPreview(null), 2000);
                    }
                }
            }
        }
    }, [gameState.log, myColor, gameMode, gameState.turn]);

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
    };

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

    // Helper: Get selectable targets for pending card
    const getSelectableTargets = () => {
        if (!gameState.pendingCard) return { pieces: [], positions: [] };

        const card = gameState.pendingCard;
        const pieces = [];
        const positions = [];

        if (card.targetEmpty) {
            // Find all empty positions
            for (let x = 0; x < 9; x++) {
                for (let y = 0; y < 10; y++) {
                    const hasPiece = gameState.board.find(p => p.x === x && p.y === y);
                    if (!hasPiece) {
                        positions.push({ x, y });
                    }
                }
            }
        }

        if (card.targetSelf || card.targetEnemy || card.targetType) {
            gameState.board.forEach(p => {
                if (card.targetSelf && p.player !== gameState.turn) return;
                if (card.targetEnemy && p.player === gameState.turn) return;
                if (card.targetType && p.type !== card.targetType) return;
                pieces.push(p.id);
            });
        }

        return { pieces, positions };
    };

    const selectableTargets = getSelectableTargets();

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

            {/* Opponent Card Preview (Top Right) */}
            {opponentCardPreview && (
                <div className="opponent-card-preview-overlay">
                    <div className="opponent-card-box">
                        <div className="opponent-card-title">
                            {opponentCardPreview.isTrap ? '陷阱卡' : '对手使用卡牌'}
                        </div>
                        <div className="opponent-card-name">
                            {opponentCardPreview.card.name}
                        </div>
                        {!opponentCardPreview.isTrap && opponentCardPreview.card.effect && (
                            <div className="opponent-card-effect">
                                {opponentCardPreview.card.effect}
                            </div>
                        )}
                    </div>
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
                        lastOpponentMove={gameState.lastOpponentMove}
                        traps={gameState.traps}
                        activeBuffs={gameState.activeBuffs}
                        selectableTargets={selectableTargets.pieces}
                        selectableEmptyPositions={selectableTargets.positions}
                        summonedPieces={gameState.summonedPieces}
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

                    {/* Global Rules Display - Only RULE type cards */}
                    {gameState.globalRules && gameState.globalRules.length > 0 && (() => {
                        const ruleCards = gameState.globalRules.filter(r => r.type === '永续'); // CARD_TYPES.RULE = '永续'
                        if (ruleCards.length === 0) return null;

                        return (
                            <div className="sidebar-section active-rules-section">
                                <div className="section-header">
                                    <span>⚠️ 生效规则</span>
                                </div>
                                <div className="rules-list">
                                    {ruleCards.map((rule, idx) => (
                                        <div key={idx} className="rule-item">
                                            <div className="rule-name">{rule.name}</div>
                                            <div className="rule-effect-text">{rule.effect}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}

                    {/* Action Log */}
                    <div className="sidebar-section action-log-section">
                        <div className="section-header">
                            <span>📜 行动历史</span>
                        </div>
                        <div className="log-list">
                            {gameState.log.slice(-8).reverse().map((entry, idx) => (
                                <div key={idx} className="log-entry">
                                    <span className="log-text">{entry.text}</span>
                                </div>
                            ))}
                            {gameState.log.length === 0 && (
                                <div className="empty-log">暂无行动</div>
                            )}
                        </div>
                    </div>

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
        
        .opponent-card-preview-overlay {
            position: fixed;
            top: 20px;
            right: 420px; /* Next to board, covering hand area */
            z-index: 250;
            animation: fadeIn 0.3s ease-in;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .opponent-card-box {
            background: linear-gradient(135deg, #1a1a2e, #16213e);
            border: 3px solid #ffd700;
            border-radius: 15px;
            padding: 20px;
            min-width: 250px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.8);
        }
        
        .opponent-card-title {
            font-size: 0.9em;
            color: #95a5a6;
            text-align: center;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .opponent-card-name {
            font-size: 1.8em;
            font-weight: bold;
            color: #ffd700;
            text-align: center;
            margin-bottom: 15px;
            text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
        }
        
        .opponent-card-effect {
            font-size: 0.9em;
            color: #ecf0f1;
            text-align: center;
            line-height: 1.4;
            padding: 10px;
            background: rgba(0,0,0,0.3);
            border-radius: 8px;
        }

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

        .active-rules-section {
            margin: 10px;
            background: rgba(231, 76, 60, 0.1);
            border: 1px solid #e74c3c;
            border-radius: 5px;
            padding: 10px;
            max-height: 150px;
            overflow-y: auto;
        }

        .rules-list {
            margin-top: 8px;
        }

        .rule-item {
            display: flex;
            flex-direction: column;
            padding: 8px;
            margin: 5px 0;
            background: rgba(0,0,0,0.3);
            border-radius: 3px;
            font-size: 0.85em;
        }

        .rule-name {
            font-weight: bold;
            color: #e74c3c;
            margin-bottom: 4px;
        }
        
        .rule-effect-text {
            font-size: 0.9em;
            color: #bdc3c7;
            line-height: 1.3;
        }

        .rule-icon {
            margin-right: 8px;
            font-size: 1.2em;
        }

        .action-log-section {
            margin: 10px;
            background: rgba(0,0,0,0.2);
            border: 1px solid #34495e;
            border-radius: 5px;
            padding: 10px;
            max-height: 200px;
            overflow-y: auto;
        }

        .log-list {
            margin-top: 8px;
        }

        .log-entry {
            padding: 4px 6px;
            margin: 2px 0;
            background: rgba(255,255,255,0.05);
            border-left: 2px solid #3498db;
            border-radius: 2px;
            font-size: 0.8em;
            color: #ecf0f1;
        }

        .empty-log {
            text-align: center;
            padding: 20px;
            color: #7f8c8d;
            font-size: 0.85em;
        }

        .section-header {
            font-weight: bold;
            color: #ecf0f1;
            font-size: 0.9em;
            padding-bottom: 5px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
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
