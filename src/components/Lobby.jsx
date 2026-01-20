import React, { useState, useEffect } from 'react';
import { socket } from '../game/socket';
import CreateRoomModal from './CreateRoomModal';

const Lobby = ({ user, onLogout, onJoinGame, onLocalGame }) => {
  const [inputRoom, setInputRoom] = useState('');
  const [rooms, setRooms] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isMatching, setIsMatching] = useState(false);

  useEffect(() => {
    // 监听房间列表
    const handleRoomList = (list) => {
      console.log('[Lobby] Received room_list:', list.length, 'rooms');
      setRooms(list);
    };

    const requestRooms = () => {
      console.log('[Lobby] Requesting rooms, socket connected:', socket.connected);
      if (socket.connected) {
        socket.emit('get_rooms');
      }
    };

    // 请求房间列表
    requestRooms();

    // 连接时也请求一次
    socket.on('connect', requestRooms);
    socket.on('room_list', handleRoomList);

    // 监听匹配状态
    const handleMatchingWait = () => setIsMatching(true);
    const handleMatchingCanceled = () => setIsMatching(false);

    socket.on('matching_wait', handleMatchingWait);
    socket.on('matching_canceled', handleMatchingCanceled);

    return () => {
      socket.off('room_list', handleRoomList);
      socket.off('connect', requestRooms);
      socket.off('matching_wait', handleMatchingWait);
      socket.off('matching_canceled', handleMatchingCanceled);
    };
  }, []);

  const handleCreateSubmit = (config) => {
    onJoinGame({ action: 'CREATE', config });
    setShowCreateModal(false);
  };

  const handleJoin = (roomId) => {
    if (!roomId) return;
    onJoinGame({ action: 'JOIN', roomId });
  };

  const handleMatchStart = () => {
    socket.emit('match_player');
    setIsMatching(true);
  };

  const handleMatchCancel = () => {
    socket.emit('cancel_match');
    setIsMatching(false);
  };

  return (
    <div className="lobby-container">
      {showCreateModal && (
        <CreateRoomModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateSubmit}
        />
      )}

      <header className="lobby-header">
        <div className="user-profile">
          <div className="avatar red" />
          <div className="info">
            <h3>{user.username}</h3>
            <span>ELO: {user.elo_rating || 1000}</span>
            {user.is_guest && <span className="tag guest">游客</span>}
          </div>
        </div>
        <button onClick={onLogout} className="logout-btn">退出登录</button>
      </header>

      <div className="lobby-content">
        <div className="lobby-left">
          <div className="mode-card">
            <h3>🕹️ 本地对战</h3>
            <p>热座模式，与身边的朋友切磋</p>
            <button onClick={onLocalGame} className="action-btn secondary">开始本地游戏</button>
          </div>

          <div className="mode-card online">
            <h3>🌍 在线对战</h3>
            <div className="join-form">
              <input
                type="text"
                placeholder="输入房间ID..."
                value={inputRoom}
                onChange={e => setInputRoom(e.target.value)}
              />
              <button onClick={() => handleJoin(inputRoom)} className="action-btn" disabled={!inputRoom}>加入私有房间</button>
            </div>
            <button onClick={() => setShowCreateModal(true)} className="action-btn primary large room-create-btn">创建房间</button>
          </div>

          {/* Matchmaking Section */}
          <div className="mode-card match-section">
            <h3>⚔️ 快速匹配</h3>
            <p>寻找实力相当的对手 (先到先得)</p>
            {isMatching ? (
              <div className="matching-status">
                <div className="spinner"></div>
                <p>正在寻找对手...</p>
                <button onClick={handleMatchCancel} className="action-btn secondary cancel-match-btn">取消匹配</button>
              </div>
            ) : (
              <button onClick={handleMatchStart} className="action-btn primary huge-btn">开始匹配</button>
            )}
          </div>
        </div>

        <div className="lobby-right">
          <div className="room-list-panel">
            <div className="panel-header">
              <h3>房间列表</h3>
              <button className="refresh-btn" onClick={() => socket.emit('get_rooms')}>🔄</button>
            </div>
            <div className="room-list">
              {rooms.length === 0 ? (
                <div className="empty-list">暂无公开房间</div>
              ) : (
                rooms.map(room => (
                  <div key={room.id} className="room-item">
                    <div className="room-info">
                      <span className="room-name">{room.name}</span>
                      <span className="room-owner">房主: {room.owner}</span>
                      <span className="room-status">{room.playerCount}/2 {room.status === 'PLAYING' ? '(游戏中)' : '(等待中)'}</span>
                    </div>
                    <button
                      onClick={() => handleJoin(room.id)}
                      className="join-btn"
                      disabled={room.playerCount >= 2}
                    >
                      加入
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .lobby-container {
          height: 100vh; background: #1a1a1a; color: #fff; display: flex; flex-direction: column;
        }
        .lobby-header {
          padding: 20px; background: #252525; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }
        .user-profile { display: flex; gap: 15px; align-items: center; }
        .info h3 { margin: 0; }
        .info span { color: #888; font-size: 0.9em; margin-right: 10px; }
        .tag.guest { background: #555; padding: 2px 6px; borderRadius: 4px; color: #fff; font-size: 0.7em; }
        
        .lobby-content {
          flex: 1; display: flex; gap: 30px; padding: 40px;
          justify-content: center;
        }
        .lobby-left { display: flex; flex-direction: column; gap: 20px; }
        .lobby-right { flex: 1; max-width: 600px; display: flex; }

        .mode-card {
          background: #2a2a2a; padding: 25px; border-radius: 12px; width: 300px; text-align: center;
        }
        .mode-card.online { border: 1px solid #d32f2f; }
        .mode-card.match-section { border: 2px solid gold; background: linear-gradient(135deg, #2a2a2a 0%, #3e2723 100%); }

        .action-btn { width: 100%; padding: 12px; border-radius: 6px; border: none; cursor: pointer; font-weight: bold; margin-top: 10px; }
        .primary { background: #d32f2f; color: white; }
        .primary.huge-btn { background: linear-gradient(to right, #d32f2f, #f50057); font-size: 1.2em; padding: 15px; }
        .secondary { background: #444; color: white; }
        .room-create-btn { margin-top: 20px; }

        .join-form { display: flex; gap: 5px; margin-top: 15px; }
        .join-form input { flex: 1; padding: 8px; background: #111; border: 1px solid #444; color: white; border-radius: 4px; }
        
        .room-list-panel {
            flex: 1; background: #222; border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; border: 1px solid #333;
        }
        .panel-header {
            padding: 15px; background: #2a2a2a; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center;
        }
        .panel-header h3 { margin: 0; }
        .refresh-btn { background: none; border: none; font-size: 1.2em; cursor: pointer; color: #aaa; transition: transform 0.2s; }
        .refresh-btn:hover { color: #fff; transform: rotate(180deg); }

        .room-list { flex: 1; overflow-y: auto; padding: 10px; }
        .room-item {
            background: #2a2a2a; padding: 15px; margin-bottom: 10px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;
        }
        .room-info { display: flex; flex-direction: column; gap: 4px; }
        .room-name { font-weight: bold; font-size: 1.1em; color: #ffd700; }
        .room-owner { font-size: 0.8em; color: #888; }
        .room-status { font-size: 0.8em; color: #aaa; }
        
        .join-btn {
            background: #2c3e50; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;
        }
        .join-btn:hover:not(:disabled) { background: #34495e; }
        .join-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .empty-list { text-align: center; color: #555; margin-top: 50px; }

        .matching-status { padding: 10px; }
        .spinner { 
            width: 30px; height: 30px; border: 3px solid rgba(255,255,255,0.3); border-radius: 50%; border-top-color: #fff; animation: spin 1s ease-in-out infinite; margin: 0 auto 10px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default Lobby;
