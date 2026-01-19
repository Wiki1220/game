import React, { useState, useEffect } from 'react';
import { socket } from '../game/socket';
import CreateRoomModal from './CreateRoomModal';

const Lobby = ({ user, onLogout, onJoinGame, onLocalGame }) => {
  const [inputRoom, setInputRoom] = useState('');
  const [rooms, setRooms] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    // Fetch rooms on mount
    socket.emit('get_rooms');

    const handleRoomList = (list) => {
      setRooms(list);
    };

    socket.on('room_list', handleRoomList);
    return () => socket.off('room_list', handleRoomList);
  }, []);

  const handleCreateSubmit = (config) => {
    // onJoinGame handles socket emit? 
    // Better: Lobby emits 'create_room', then App handles 'room_joined'.
    // BUT App currently manages the "GameState" transition (LOGIN -> LOBBY -> GAME).
    // If Lobby emits, App needs to know when to switch view.
    // App listens to 'room_joined' or 'game_start'.
    // So Lobby can just emit socket events directly?
    // Let's delegate to App via onJoinGame for cleaner "View Control".
    onJoinGame({ action: 'CREATE', config });
    setShowCreateModal(false);
  };

  const handleJoin = (roomId) => {
    if (!roomId) return;
    onJoinGame({ action: 'JOIN', roomId });
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

        .action-btn { width: 100%; padding: 12px; border-radius: 6px; border: none; cursor: pointer; font-weight: bold; margin-top: 10px; }
        .primary { background: #d32f2f; color: white; }
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
      `}</style>
    </div>
  );
};

export default Lobby;
