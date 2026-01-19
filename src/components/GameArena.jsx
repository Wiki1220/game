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

    if (entry.action === 'MOVE' && info) {
        const parts = info.split(' ');
        if (parts.length >= 3) {
            const type = parts[0];
            const target = parts[2];
            const cnName = PIECE_NAMES[entry.player]?.[type] || type;
            info = `${cnName} -> ${target}`;
        }
    }
    return `${action} ${info || ''}`;
};

// Props: gameMode, onQuit
function GameArena({ gameMode, initialRoomId, myInitialColor, onQuit }) {
    const [gameState, dispatch] = useReducer(gameReducer, null, createInitialState);
    const [showSettings, setShowSettings] = useState(false);

    // States from props
    const [roomId, setRoomId] = useState(initialRoomId);
    // Default color logic: if Local, doesn't matter (hotseat). If Online, provided by props.
    const [myColor, setMyColor] = useState(myInitialColor || PLAYERS.RED);

    // Ref for roomId to access in callbacks
    const activeRoomId = useRef(initialRoomId);

    // Timer Effect
    useEffect(() => {
        const timer = setInterval(() => {
            // Only tick if we are in a valid game state
            // For Local, always tick. For Online, assume connected if we are in GameArena.
            dispatch({ type: ActionTypes.TICK_TIMER });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Socket Listener for Game Actions (if online)
    useEffect(() => {
        if (gameMode !== 'ONLINE_GAME') return;

        socket.on('remote_action', (action) => {
            console.log('Remote Action:', action);
            dispatch(action);
        });

        return () => {
            socket.off('remote_action');
        };
    }, [gameMode]);

    // Handle Actions
    const handleGameAction = (action) => {
        // 1. Dispatch Locally
        dispatch(action);

        // 2. If Online, Broadcast
        if (gameMode === 'ONLINE_GAME') {
            socket.emit('game_action', {
                roomId: activeRoomId.current,
                action: action
            });
        }
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const handleDraft = (card) => {
        if (gameState.players[gameState.turn].hand.length >= 3) {
            alert("手牌已满! (上限 3)");
            return;
        }
        handleGameAction({ type: ActionTypes.DRAFT_CARD, payload: { card } });
    };

    const handlePlayCard = (card) => {
        handleGameAction({ type: ActionTypes.PLAY_CARD, payload: { card } });
    };

    const endPlayPhase = () => {
        handleGameAction({ type: ActionTypes.END_PLAY_PHASE });
    };

    const handleSurrender = () => {
        if (confirm('确定要投降吗？')) {
            onQuit();
        }
        setShowSettings(false);
    };

    const handleQuit = () => {
        if (confirm('确定要退出吗？')) {
            onQuit();
        }
    };

    const handleSquareClick = (x, y) => {
        const { board, turn, selectedPieceId, validMoves, phase, activeBuffs, globalRules } = gameState;

        // Online Check: Is it my turn?
        if (gameMode === 'ONLINE_GAME') {
            if (turn !== myColor) {
                console.log("Not your turn!");
                return; // Block interaction
            }
        }

        // A. Targeting Mode (Cards)
        if (phase === PHASES.TARGET_SELECTION || phase === 'TARGET_SELECTION') {
            const targetPiece = board.find(p => p.x === x && p.y === y);
            if (targetPiece) {
                handleGameAction({ type: ActionTypes.SELECT_PIECE, payload: { pieceId: targetPiece.id } });
            } else {
                handleGameAction({ type: ActionTypes.CANCEL_CARD });
            }
            return;
        }

        // B. Normal Move Mode
        const isMoveTarget = validMoves.some(m => m.x === x && m.y === y);
        if (isMoveTarget) {
            handleGameAction({ type: ActionTypes.MOVE_PIECE, payload: { x, y } });
            return;
        }

        // Select Piece
        const clickedPiece = board.find(p => p.x === x && p.y === y);
        if (clickedPiece && clickedPiece.player === turn) {
            const moves = getPieceMoves(clickedPiece, board, activeBuffs, globalRules);

            dispatch({ type: ActionTypes.SELECT_PIECE, payload: { pieceId: clickedPiece.id } });
            dispatch({ type: 'UPDATE_VALID_MOVES', payload: moves });

            if (gameMode === 'ONLINE_GAME') {
                socket.emit('game_action', {
                    roomId: activeRoomId.current,
                    action: { type: ActionTypes.SELECT_PIECE, payload: { pieceId: clickedPiece.id } }
                });
            }

        } else if (gameState.pendingCard && phase === 'PLAY_CARD') {
            handleGameAction({ type: ActionTypes.CANCEL_CARD });
        }
    };

    const activePlayerHand = gameState.players[gameState.turn].hand;

    // --- RENDER GAME ---
    return (
        <div className="game-container">
            {/* Modals */}
            {showSettings && (
                <SettingsModal
                    onClose={() => setShowSettings(false)}
                    onSurrender={handleSurrender}
                    onQuit={handleQuit}
                />
            )}

            {/* Main Layout */}
            <div className="main-layout">

                {/* Left: Board Area */}
                <div className="board-section">
                    {/* Online Info Overlay */}
                    {gameMode === 'ONLINE_GAME' && (
                        <div style={{ position: 'absolute', top: 10, left: 10, color: '#aaa', fontSize: '0.8em' }}>
                            你是: <span style={{ color: myColor === 'red' ? 'red' : '#aaa' }}>{myColor === 'red' ? '红方' : '黑方'}</span>
                        </div>
                    )}

                    {gameState.phase === PHASES.DRAFT && (
                        (gameMode !== 'ONLINE_GAME' || gameState.turn === myColor) ? (
                            <DraftModal
                                options={gameState.draftOptions}
                                onSelect={handleDraft}
                            />
                        ) : (
                            <div style={{ position: 'absolute', zIndex: 10, background: 'rgba(0,0,0,0.7)', padding: '20px', borderRadius: '10px', color: '#fff' }}>
                                对手正在选牌...
                            </div>
                        )
                    )}

                    {/* Hint Overlay for Targeting */}
                    {gameState.phase === 'TARGET_SELECTION' && (
                        <div style={{
                            position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)',
                            padding: '10px 20px', background: 'rgba(0,0,0,0.8)', color: '#fff',
                            borderRadius: '20px', pointerEvents: 'none', zIndex: 50
                        }}>
                            请选择目标： {gameState.pendingCard?.name}
                        </div>
                    )}
                    <Board
                        boardState={gameState.board}
                        selectedPieceId={gameState.selectedPieceId}
                        validMoves={gameState.validMoves}
                        onSquareClick={handleSquareClick}
                    />
                </div>

                {/* Right: Sidebar */}
                <aside className="sidebar">

                    {/* 1. User Info & Settings */}
                    <div className="sidebar-section user-info">
                        <div className="user-details">
                            <div className={`avatar ${gameState.turn}`} />
                            <div className="username">
                                {gameState.turn === PLAYERS.RED ? '红方将军' : '黑方将军'}
                                {gameMode === 'ONLINE_GAME' && gameState.turn === myColor && " (我)"}
                            </div>
                        </div>
                        <button className="icon-btn settings-trigger" onClick={() => setShowSettings(true)}>
                            ⚙️
                        </button>
                    </div>

                    {/* 2. Timer */}
                    <div className="sidebar-section timer-section">
                        <div className="timer-label">TIME REMAINING</div>
                        <div className={`timer-clock ${gameState.timers[gameState.turn] < 60 ? 'critical' : ''}`}>
                            {formatTime(gameState.timers[gameState.turn])}
                        </div>
                    </div>

                    {/* 3. History Log */}
                    <div className="sidebar-section log-section">
                        <h4>战况</h4>
                        <div className="log-entries">
                            {gameState.log.slice().reverse().map((entry, i) => (
                                <div key={i} className="log-entry">
                                    <span className={`log-tag ${entry.player === 'red' ? 'red' : 'black'}`}>
                                        [{entry.player === 'red' ? '红' : '黑'}]
                                    </span>
                                    {formatLog(entry)}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 4. Hand Area */}
                    <div className="sidebar-section hand-section">
                        <div className="section-header">
                            <span>可用锦囊</span>
                            <span className="hand-count">{activePlayerHand.length}/3</span>
                        </div>

                        <div className="sidebar-hand-grid">
                            {activePlayerHand.map(card => (
                                <div key={card.uid} className="sidebar-card-item">
                                    <Card
                                        card={card}
                                        onClick={() => {
                                            if (gameMode === 'ONLINE_GAME' && gameState.turn !== myColor) return;
                                            if (gameState.phase === PHASES.PLAY_CARD) handlePlayCard(card);
                                        }}
                                        disabled={gameState.phase !== PHASES.PLAY_CARD || (gameMode === 'ONLINE_GAME' && gameState.turn !== myColor)}
                                    />
                                </div>
                            ))}
                            {activePlayerHand.length === 0 && <div className="empty-state">暂无锦囊</div>}
                        </div>

                        {gameState.phase === PHASES.PLAY_CARD && (
                            <button
                                className="primary-action full-width"
                                onClick={endPlayPhase}
                                disabled={gameMode === 'ONLINE_GAME' && gameState.turn !== myColor}
                                style={{ opacity: (gameMode === 'ONLINE_GAME' && gameState.turn !== myColor) ? 0.5 : 1 }}
                            >
                                结束出牌 (移动)
                            </button>
                        )}
                    </div>

                </aside>
            </div>
        </div>
    );
}

export default GameArena;
