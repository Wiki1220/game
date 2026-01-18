import React, { useReducer, useEffect, useState } from 'react';
import Board from './components/Board';
import DraftModal from './components/DraftModal';
import SettingsModal from './components/SettingsModal';
import { createInitialState, gameReducer, ActionTypes } from './game/engine';
import { getPieceMoves } from './game/pieces'; // Ensure this matches what pieces.js exports
import Card from './components/Card';
import { PLAYERS, PHASES } from './game/constants';
import './index.css';

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

  // Translate Move Info (e.g. "chariot to (0,9)")
  if (entry.action === 'MOVE' && info) {
    // Parse info "type to (x,y)"
    const parts = info.split(' ');
    if (parts.length >= 3) {
      const type = parts[0];
      const target = parts[2]; // "(x,y)"
      const cnName = PIECE_NAMES[entry.player]?.[type] || type;
      info = `${cnName} -> ${target}`;
    }
  }

  return `${action} ${info || ''}`;
};

function App() {
  const [gameState, dispatch] = useReducer(gameReducer, null, createInitialState);
  const [showSettings, setShowSettings] = useState(false);

  // Timer Effect
  useEffect(() => {
    const timer = setInterval(() => {
      dispatch({ type: ActionTypes.TICK_TIMER });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
    dispatch({ type: ActionTypes.DRAFT_CARD, payload: { card } });
  };

  const handlePlayCard = (card) => {
    dispatch({ type: ActionTypes.PLAY_CARD, payload: { card } });
  };

  const endPlayPhase = () => {
    dispatch({ type: ActionTypes.END_PLAY_PHASE });
  };

  const handleSurrender = () => {
    if (confirm('确定要投降吗？')) {
      window.location.reload();
    }
    setShowSettings(false);
  };

  const handleQuit = () => {
    if (confirm('确定要退出吗？')) {
      window.location.reload();
    }
  };

  const handleSquareClick = (x, y) => {
    const { board, turn, selectedPieceId, validMoves, phase, activeBuffs, globalRules } = gameState;

    // A. Targeting Mode (Cards)
    if (phase === PHASES.TARGET_SELECTION || phase === 'TARGET_SELECTION') {
      const targetPiece = board.find(p => p.x === x && p.y === y);
      if (targetPiece) {
        dispatch({ type: ActionTypes.SELECT_PIECE, payload: { pieceId: targetPiece.id } });
      } else {
        dispatch({ type: ActionTypes.CANCEL_CARD });
      }
      return;
    }

    // B. Normal Move Mode
    const isMoveTarget = validMoves.some(m => m.x === x && m.y === y);
    if (isMoveTarget) {
      dispatch({ type: ActionTypes.MOVE_PIECE, payload: { x, y } });
      return;
    }

    // Select Piece
    const clickedPiece = board.find(p => p.x === x && p.y === y);
    if (clickedPiece && clickedPiece.player === turn) {
      // Calculate Valid Moves with Buffs
      const moves = getPieceMoves(clickedPiece, board, activeBuffs, globalRules);

      dispatch({ type: ActionTypes.SELECT_PIECE, payload: { pieceId: clickedPiece.id } });
      dispatch({ type: 'UPDATE_VALID_MOVES', payload: moves });
    } else if (gameState.pendingCard && phase === 'PLAY_CARD') {
      dispatch({ type: ActionTypes.CANCEL_CARD });
    }
  };

  const activePlayerHand = gameState.players[gameState.turn].hand;

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
          {gameState.phase === PHASES.DRAFT && (
            <DraftModal
              options={gameState.draftOptions}
              onSelect={handleDraft}
            />
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
                    onClick={() => gameState.phase === PHASES.PLAY_CARD && handlePlayCard(card)}
                    disabled={gameState.phase !== PHASES.PLAY_CARD}
                  />
                </div>
              ))}
              {activePlayerHand.length === 0 && <div className="empty-state">暂无锦囊</div>}
            </div>

            {gameState.phase === PHASES.PLAY_CARD && (
              <button className="primary-action full-width" onClick={endPlayPhase}>
                结束出牌 (移动)
              </button>
            )}
          </div>

        </aside>
      </div>
    </div>
  );
}

export default App;
