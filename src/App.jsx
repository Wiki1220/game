import React, { useReducer, useEffect, useState, useRef } from 'react';
import Board from './components/Board';
import DraftModal from './components/DraftModal';
import SettingsModal from './components/SettingsModal';
import { createInitialState, gameReducer, ActionTypes } from './game/engine';
import { getPieceMoves } from './game/pieces';
import Card from './components/Card';
import { PLAYERS, PHASES } from './game/constants';
import { socket } from './game/socket';
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

function App() {
  const [gameState, dispatch] = useReducer(gameReducer, null, createInitialState);
  const [showSettings, setShowSettings] = useState(false);

  // Game Mode States
  const [appMode, setAppMode] = useState('MENU'); // MENU, LOCAL, ONLINE_LOBBY, ONLINE_GAME
  const [roomId, setRoomId] = useState(null);
  const [myColor, setMyColor] = useState(PLAYERS.RED); // Local defaults to Red starter? Actually local is hotseat.
  const [onlineStatus, setOnlineStatus] = useState('IDLE'); // IDLE, FINDING, CONNECTED

  // Ref for roomId to access in callbacks if needed, though state is usually fine in effects with dependencies
  const activeRoomId = useRef(null);

  // Timer Effect
  useEffect(() => {
    const timer = setInterval(() => {
      // Only tick if playing
      if (appMode === 'LOCAL' || (appMode === 'ONLINE_GAME' && onlineStatus === 'CONNECTED')) {
        dispatch({ type: ActionTypes.TICK_TIMER });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [appMode, onlineStatus]);

  // Socket Setup
  useEffect(() => {
    socket.on('connect', () => {
      console.log('Socket Connected');
    });

    socket.on('disconnect', () => {
      console.log('Socket Disconnected');
      setOnlineStatus('DISCONNECTED');
    });

    socket.on('waiting_for_match', () => {
      setOnlineStatus('FINDING');
    });

    socket.on('game_start', (data) => {
      console.log('Game Start:', data);
      activeRoomId.current = data.roomId;
      setRoomId(data.roomId);
      setMyColor(data.color === 'red' ? PLAYERS.RED : PLAYERS.BLACK);
      setAppMode('ONLINE_GAME');
      setOnlineStatus('CONNECTED');

      // Reset Game State for new game
      // We might need a RESET action or just reload?
      // Ideally dispatch a RESET_GAME action, but for now we rely on initial.
      // If we want to support "Next Game", we need Reset.
      // Since we mount App once, we just proceed.
    });

    socket.on('remote_action', (action) => {
      console.log('Remote Action:', action);
      dispatch(action);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('waiting_for_match');
      socket.off('game_start');
      socket.off('remote_action');
    };
  }, []);

  const startLocalGame = () => {
    setAppMode('LOCAL');
  };

  const startOnlineSearch = () => {
    setAppMode('ONLINE_LOBBY');
    setOnlineStatus('CONNECTING');
    socket.connect();
    socket.emit('find_match');
  };

  // Wrapper for Dispatch to handle Online Sync
  const handleGameAction = (action) => {
    // 1. Dispatch Locally
    dispatch(action);

    // 2. If Online, Broadcast
    if (appMode === 'ONLINE_GAME') {
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

    // Online Check: Is it my turn?
    if (appMode === 'ONLINE_GAME') {
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

      // Local UI update: Valid Moves don't need to be synced! 
      // They are client-side visual helpers.
      // So we dispatch purely locally for highlight.
      dispatch({ type: ActionTypes.SELECT_PIECE, payload: { pieceId: clickedPiece.id } });
      dispatch({ type: 'UPDATE_VALID_MOVES', payload: moves });

      // Note: We do NOT emit select_piece to server usually, to avoid spam/cheating hints.
      // But engine reducer might need it? 
      // Our Engine uses 'selectedPieceId' in state to determine 'MOVE_PIECE' payload source?
      // Yes: MOVE_PIECE only has (x,y). It relies on state.selectedPieceId.
      // SO WE MUST SYNC SELECTION.
      // OR: We change MOVE_PIECE to include sourceId?
      // For now, let's Sync Selection. It's easiest. 
      // (Optimization: Change Move Action to {from, to})

      if (appMode === 'ONLINE_GAME') {
        socket.emit('game_action', {
          roomId: activeRoomId.current,
          action: { type: ActionTypes.SELECT_PIECE, payload: { pieceId: clickedPiece.id } }
        });
        // Valid moves are local calc always.
      }

    } else if (gameState.pendingCard && phase === 'PLAY_CARD') {
      handleGameAction({ type: ActionTypes.CANCEL_CARD });
    }
  };

  const activePlayerHand = gameState.players[gameState.turn].hand;

  // --- RENDER MENU ---
  if (appMode === 'MENU') {
    return (
      <div className="menu-container" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#1a1a1a', color: '#fff', gap: '20px'
      }}>
        <h1 style={{ fontSize: '3em', textShadow: '0 0 10px red' }}>战旗：对决</h1>
        <button className="primary-action" style={{ fontSize: '1.5em', padding: '15px 40px' }} onClick={startLocalGame}>
          本地热座 (双人)
        </button>
        <button className="primary-action" style={{ fontSize: '1.5em', padding: '15px 40px', background: '#444' }} onClick={startOnlineSearch}>
          在线匹配 (多人)
        </button>
      </div>
    );
  }

  if (appMode === 'ONLINE_LOBBY') {
    return (
      <div className="menu-container" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#1a1a1a', color: '#fff'
      }}>
        <h2>正在匹配对手...</h2>
        <div className="loader" style={{ marginTop: '20px' }}>⏳ {onlineStatus}</div>
        <button style={{ marginTop: '20px', padding: '10px' }} onClick={() => window.location.reload()}>取消</button>
      </div>
    );
  }

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
          {appMode === 'ONLINE_GAME' && (
            <div style={{ position: 'absolute', top: 10, left: 10, color: '#aaa', fontSize: '0.8em' }}>
              你是: <span style={{ color: myColor === 'red' ? 'red' : '#aaa' }}>{myColor === 'red' ? '红方' : '黑方'}</span>
            </div>
          )}

          {gameState.phase === PHASES.DRAFT && (
            // Only show draft if it is MY turn in online mode?
            // Actually Draft happens at start of turn.
            // If online, only current turn player should see options.
            // BUT: Engine updates state for both.
            // UI should block interaction if not my turn.
            (appMode !== 'ONLINE_GAME' || gameState.turn === myColor) ? (
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
                {appMode === 'ONLINE_GAME' && gameState.turn === myColor && " (我)"}
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
                      if (appMode === 'ONLINE_GAME' && gameState.turn !== myColor) return;
                      if (gameState.phase === PHASES.PLAY_CARD) handlePlayCard(card);
                    }}
                    disabled={gameState.phase !== PHASES.PLAY_CARD || (appMode === 'ONLINE_GAME' && gameState.turn !== myColor)}
                  />
                </div>
              ))}
              {activePlayerHand.length === 0 && <div className="empty-state">暂无锦囊</div>}
            </div>

            {gameState.phase === PHASES.PLAY_CARD && (
              <button
                className="primary-action full-width"
                onClick={endPlayPhase}
                disabled={appMode === 'ONLINE_GAME' && gameState.turn !== myColor}
                style={{ opacity: (appMode === 'ONLINE_GAME' && gameState.turn !== myColor) ? 0.5 : 1 }}
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

export default App;
