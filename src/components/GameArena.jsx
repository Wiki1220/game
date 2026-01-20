import React, { useReducer, useEffect, useState, useRef } from 'react';
import Board from './Board';
import DraftModal from './DraftModal';
import SettingsModal from './SettingsModal';
import { createInitialState, gameReducer, ActionTypes, getValidMoves } from '../game/engine';
import { getPieceMoves } from '../game/pieces';
import Card from './Card';
import { PLAYERS, PHASES } from '../game/constants';
import { socket } from '../game/socket';
import { useToast } from './common/Toast';
import './GameArena.css';

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
    const { addToast } = useToast();

    // Sync myColor from props
    useEffect(() => {
        if (myInitialColor) setMyColor(myInitialColor);
    }, [myInitialColor]);

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

            // Trap Trigger Check
            if (lastEntry.text && lastEntry.text.includes('触发了陷阱')) {
                setNotification({ message: lastEntry.text });
                setTimeout(() => setNotification(null), 2000);
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
    // --- Handlers ---

    const getStatusMessage = () => {
        const { phase, turn } = gameState;
        const isMyTurn = gameMode === 'LOCAL' ? true : turn === myColor;

        if (notification) return notification.message;

        if (phase === 'DRAFT') {
            if (gameMode === 'LOCAL') return `${turn === 'red' ? '红方' : '黑方'} 正在选牌`;
            return isMyTurn ? "请挑选你的锦囊" : "对手正在选择锦囊";
        }
        if (phase === 'PLAY_CARD') {
            if (gameMode === 'LOCAL') return `${turn === 'red' ? '红方' : '黑方'} 行动`;
            return isMyTurn ? "你的回合: 请使用锦囊或移动" : "对手正在思考...";
        }
        return "游戏进行中";
    };

    const handleGameAction = (action) => {
        try {
            dispatch(action);
            if (gameMode === 'ONLINE_GAME') {
                socket.emit('game_action', { roomId: activeRoomId.current, action });
            }
        } catch (e) {
            console.error("Game Action Error:", e);
            addToast(`操作失败: ${e.message}`, 'error');
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

    // Ref for latest state to avoid re-creating handlers on every timer tick
    const gameStateRef = useRef(gameState);
    useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

    const handleSquareClick = React.useCallback((x, y) => {
        const currentGameState = gameStateRef.current;
        try {
            if (currentGameState.phase === 'GAMEOVER') return;
            if (gameMode === 'ONLINE_GAME' && currentGameState.turn !== myColor) return;

            const { board, turn, validMoves, pendingCard } = currentGameState;

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
                    payload: { pieceId: currentGameState.selectedPieceId, toX: x, toY: y }
                });
                return;
            }

            // 3. Select Piece (Friendly)
            const clickedPiece = board.find(p => p.x === x && p.y === y);
            if (clickedPiece && clickedPiece.player === turn) {
                handleGameAction({ type: ActionTypes.SELECT_PIECE, payload: { pieceId: clickedPiece.id } });
            }
        } catch (e) {
            console.error("Board Interaction Error:", e);
            addToast(`游戏逻辑错误: ${e.message}`, 'error');
        }
    }, [gameMode, myColor]); // Stable dependencies

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

    // UX-001: 将军检测 - 检查当前玩家是否被将军
    const isInCheck = React.useMemo(() => {
        const currentPlayer = gameState.turn;
        // 如果游戏结束，不再检测将军
        if (gameState.phase === 'GAMEOVER') return false;

        const general = gameState.board.find(p => p.player === currentPlayer && p.type === 'general');
        if (!general) return false;

        // 严格将军检测：检查任何敌方棋子的合法移动是否包含将的位置
        return gameState.board.some(p => {
            // 排除己方和中立
            if (p.player === currentPlayer || p.player === 'neutral') return false;

            // 获取敌方棋子的合法移动（忽略当前是否轮到它）
            // 传入 true 作为第三个参数 ignoreTurn
            const moves = getValidMoves(gameState, p, true);

            return moves.some(m => m.x === general.x && m.y === general.y);
        });
    }, [gameState.board, gameState.turn, gameState]);

    // UX-002: 倒计时紧迫感
    const currentTimer = gameState.timers[gameState.turn] || 60;
    const isTimerCritical = currentTimer <= 10;

    // --- RENDER ---
    return (
        <div className="game-container">
            {/* Game Over Modal */}
            {showGameOver && (
                <div className="modal-overlay">
                    <div className="modal-content victory-modal">
                        <h1>
                            {gameState.winner === myColor
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
                        flip={gameMode === 'ONLINE_GAME' && myColor === 'black'}
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

                    {/* Status Panel (Replaces Log & Rules) */}
                    <div className={`sidebar-section status-panel ${isInCheck ? 'in-check' : ''} ${isTimerCritical ? 'timer-critical' : ''}`}>
                        <div className="section-header" style={{ justifyContent: 'center' }}>
                            <span className={isTimerCritical ? 'timer-warning timer-blink' : ''}>
                                剩余 {Math.ceil(currentTimer)}s
                                {isInCheck && <span className="check-badge"> ⚠️ 将军!</span>}
                            </span>
                        </div>
                        <div className="status-content">
                            {/* Embedded Rules Display */}
                            {gameState.globalRules && gameState.globalRules.some(r => r.type === '永续') && (() => {
                                const ruleCards = gameState.globalRules.filter(r => r.type === '永续');
                                return (
                                    <>
                                        <div className="mini-rules-list">
                                            {ruleCards.map((rule, idx) => (
                                                <div key={idx} className="mini-rule-item">
                                                    <span className="rule-name">[{rule.name}]</span> {rule.effect}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="status-separator" />
                                    </>
                                );
                            })()}

                            {notification ? (
                                <span style={{ color: '#ff4444', fontWeight: 'bold', fontSize: '1.2em' }}>
                                    ⚠️ {notification.message}
                                </span>
                            ) : (
                                <span style={{ color: '#fff', fontSize: '1.1em' }}>
                                    {getStatusMessage()}
                                </span>
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


        </div>
    );
}

export default GameArena;
