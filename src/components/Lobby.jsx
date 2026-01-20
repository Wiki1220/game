import React, { useState, useEffect } from 'react';
import { socket } from '../game/socket';
import CreateRoomModal from './CreateRoomModal';
import ProfilePage from './ProfilePage';
import SettingsModal from './SettingsModal';

// 头像显示
const AVATAR_DISPLAY = {
  general_red: { char: '帥', color: '#d32f2f' },
  general_black: { char: '將', color: '#333' },
  chariot_red: { char: '車', color: '#d32f2f' },
  soldier_red: { char: '兵', color: '#d32f2f' },
};

const Lobby = ({ user, onLogout, onJoinGame, onLocalGame }) => {
  const [inputRoom, setInputRoom] = useState('');
  const [rooms, setRooms] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
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

    requestRooms();
    socket.on('connect', requestRooms);
    socket.on('room_list', handleRoomList);

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

  const getAvatarDisplay = () => {
    const preset = user.avatar_preset || 'general_red';
    return AVATAR_DISPLAY[preset] || AVATAR_DISPLAY.general_red;
  };

  return (
    <div className="lobby-container">
      {showCreateModal && (
        <CreateRoomModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateSubmit}
        />
      )}

      {showProfile && (
        <ProfilePage
          user={user}
          onClose={() => setShowProfile(false)}
          onUpdate={(updated) => {
            // 可以在这里更新本地 user 状态
          }}
        />
      )}

      {showRules && (
        <SettingsModal
          initialView="RULES"
          onClose={() => setShowRules(false)}
        />
      )}

      {/* 现代化头部导航 */}
      <header className="lobby-header">
        <div className="header-left">
          <div className="logo">
            <span className="logo-icon">♟</span>
            <span className="logo-text">战旗对决</span>
          </div>
        </div>

        <div className="header-right">
          {/* 用户信息区 */}
          <div
            className="user-section"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div
              className="user-avatar"
              style={{ background: getAvatarDisplay().color }}
            >
              {getAvatarDisplay().char}
            </div>
            <div className="user-info">
              <span className="username">{user.nickname || user.username}</span>
              <span className="points">
                <span className="points-icon">💎</span>
                {user.points || user.elo_rating || 1000}
              </span>
            </div>
            {user.is_guest && <span className="guest-tag">游客</span>}
            <span className="dropdown-arrow">▾</span>
          </div>

          {/* 下拉菜单 */}
          {showUserMenu && (
            <div className="user-dropdown" onMouseLeave={() => setShowUserMenu(false)}>
              <button className="dropdown-item" onClick={() => { setShowProfile(true); setShowUserMenu(false); }}>
                <span className="item-icon">👤</span>
                个人资料
              </button>
              <button className="dropdown-item" onClick={() => { setShowRules(true); setShowUserMenu(false); }}>
                <span className="item-icon">📜</span>
                游戏规则
              </button>
              <div className="dropdown-divider"></div>
              <button className="dropdown-item logout" onClick={onLogout}>
                <span className="item-icon">🚪</span>
                退出登录
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="lobby-content">
        <div className="lobby-left">
          <div className="mode-card local">
            <div className="card-icon">🎮</div>
            <h3>本地对战</h3>
            <p>热座模式，与身边的朋友切磋</p>
            <button onClick={onLocalGame} className="action-btn secondary">开始本地游戏</button>
          </div>

          <div className="mode-card online">
            <div className="card-icon">🌍</div>
            <h3>在线对战</h3>
            <div className="join-form">
              <input
                type="text"
                placeholder="输入房间ID..."
                value={inputRoom}
                onChange={e => setInputRoom(e.target.value)}
              />
              <button onClick={() => handleJoin(inputRoom)} className="join-btn" disabled={!inputRoom}>加入</button>
            </div>
            <button onClick={() => setShowCreateModal(true)} className="action-btn primary">创建房间</button>
          </div>

          <div className="mode-card match">
            <div className="card-icon">⚔️</div>
            <h3>快速匹配</h3>
            <p>寻找实力相当的对手</p>
            {isMatching ? (
              <div className="matching-status">
                <div className="match-spinner"></div>
                <p>正在寻找对手...</p>
                <button onClick={handleMatchCancel} className="action-btn secondary">取消匹配</button>
              </div>
            ) : (
              <button onClick={handleMatchStart} className="action-btn match-btn">开始匹配</button>
            )}
          </div>
        </div>

        <div className="lobby-right">
          <div className="room-list-panel">
            <div className="panel-header">
              <h3>🏠 公开房间</h3>
              <button className="refresh-btn" onClick={() => socket.emit('get_rooms')}>
                <span>🔄</span>
              </button>
            </div>
            <div className="room-list">
              {rooms.length === 0 ? (
                <div className="empty-list">
                  <div className="empty-icon">🏜️</div>
                  <p>暂无公开房间</p>
                  <p className="sub">创建一个房间开始游戏吧！</p>
                </div>
              ) : (
                rooms.map(room => (
                  <div key={room.id} className="room-item">
                    <div className="room-info">
                      <span className="room-name">{room.name}</span>
                      <span className="room-meta">房主: {room.owner} · {room.playerCount}/2</span>
                    </div>
                    <button
                      onClick={() => handleJoin(room.id)}
                      className="room-join-btn"
                      disabled={room.playerCount >= 2}
                    >
                      {room.playerCount >= 2 ? '已满' : '加入'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; }

        .lobby-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          color: #fff;
          display: flex;
          flex-direction: column;
        }

        /* 头部导航 */
        .lobby-header {
          padding: 15px 30px;
          background: rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(10px);
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .header-left {
          display: flex;
          align-items: center;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .logo-icon {
          font-size: 28px;
        }

        .logo-text {
          font-size: 22px;
          font-weight: bold;
          background: linear-gradient(135deg, #ff6b6b 0%, #ffd93d 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .header-right {
          position: relative;
        }

        .user-section {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 8px 16px 8px 8px;
          background: rgba(255,255,255,0.05);
          border-radius: 30px;
          cursor: pointer;
          transition: all 0.2s;
          height: 48px;
        }

        .user-section:hover {
          background: rgba(255,255,255,0.1);
        }

        .user-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: bold;
          color: #fff;
          flex-shrink: 0;
        }

        .user-info {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
          line-height: 1.2;
        }

        .username {
          font-weight: 600;
          font-size: 14px;
        }

        .points {
          font-size: 12px;
          color: #64b5f6;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .points-icon {
          font-size: 10px;
        }

        .guest-tag {
          background: rgba(255,193,7,0.2);
          color: #ffc107;
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 11px;
        }

        .dropdown-arrow {
          color: #666;
          font-size: 12px;
          margin-left: 5px;
        }

        /* 下拉菜单 */
        .user-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 10px;
          background: rgba(30, 30, 50, 0.98);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          overflow: hidden;
          min-width: 180px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.5);
          z-index: 100;
          animation: slideDown 0.2s ease;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 12px 16px;
          background: transparent;
          border: none;
          color: #ccc;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }

        .dropdown-item:hover {
          background: rgba(255,255,255,0.05);
          color: #fff;
        }

        .dropdown-item.logout {
          color: #f44336;
        }

        .dropdown-item.logout:hover {
          background: rgba(244,67,54,0.1);
        }

        .item-icon {
          font-size: 16px;
        }

        .dropdown-divider {
          height: 1px;
          background: rgba(255,255,255,0.1);
          margin: 5px 0;
        }

        /* 内容区 */
        .lobby-content {
          flex: 1;
          display: flex;
          gap: 30px;
          padding: 30px;
          justify-content: center;
          align-items: stretch;
        }

        .lobby-left {
          display: flex;
          flex-direction: column;
          gap: 15px;
          width: 320px;
        }

        .lobby-right {
          display: flex;
          flex-direction: column;
        }

        .room-list-panel {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          overflow: hidden;
          width: 420px;
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        /* 模式卡片 */
        .mode-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          padding: 25px;
          border-radius: 16px;
          text-align: center;
          transition: all 0.3s;
        }

        .mode-card:hover {
          background: rgba(255,255,255,0.05);
          transform: translateY(-3px);
        }

        .mode-card.online {
          border-color: rgba(230, 57, 70, 0.3);
        }

        .mode-card.match {
          border-color: rgba(255, 215, 0, 0.3);
          background: linear-gradient(135deg, rgba(255,215,0,0.05) 0%, transparent 100%);
        }

        .card-icon {
          font-size: 36px;
          margin-bottom: 10px;
        }

        .mode-card h3 {
          margin: 0 0 8px;
          font-size: 18px;
        }

        .mode-card p {
          color: #666;
          font-size: 13px;
          margin: 0 0 15px;
        }

        /* 按钮样式 */
        .action-btn {
          width: 100%;
          padding: 14px;
          border: none;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-btn.primary {
          background: linear-gradient(135deg, #e63946 0%, #d62828 100%);
          color: #fff;
          box-shadow: 0 4px 15px rgba(230,57,70,0.3);
        }

        .action-btn.primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(230,57,70,0.4);
        }

        .action-btn.secondary {
          background: rgba(255,255,255,0.1);
          color: #ccc;
        }

        .action-btn.secondary:hover {
          background: rgba(255,255,255,0.15);
          color: #fff;
        }

        .action-btn.match-btn {
          background: linear-gradient(135deg, #f9a825 0%, #ff8f00 100%);
          color: #000;
          font-weight: 700;
        }

        /* 加入表单 */
        .join-form {
          display: flex;
          gap: 8px;
          margin-bottom: 15px;
        }

        .join-form input {
          flex: 1;
          padding: 12px;
          background: rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          color: #fff;
          font-size: 14px;
        }

        .join-form input:focus {
          outline: none;
          border-color: #e63946;
        }

        .join-btn {
          padding: 12px 20px;
          background: rgba(255,255,255,0.1);
          border: none;
          border-radius: 10px;
          color: #fff;
          cursor: pointer;
        }

        .join-btn:disabled {
          opacity: 0.5;
        }

        /* 房间列表 - 样式在 lobby-right 后面定义 */

        .panel-header {
          padding: 18px 20px;
          background: rgba(0,0,0,0.2);
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .panel-header h3 {
          margin: 0;
          font-size: 16px;
        }

        .refresh-btn {
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          padding: 5px;
          border-radius: 50%;
          transition: all 0.3s;
        }

        .refresh-btn:hover {
          background: rgba(255,255,255,0.1);
          transform: rotate(180deg);
        }

        .room-list {
          flex: 1;
          padding: 15px;
          overflow-y: auto;
        }

        .empty-list {
          text-align: center;
          padding: 40px 20px;
        }

        .empty-icon {
          font-size: 48px;
          margin-bottom: 15px;
        }

        .empty-list p {
          color: #555;
          margin: 5px 0;
        }

        .empty-list .sub {
          font-size: 13px;
        }

        .room-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px;
          background: rgba(255,255,255,0.03);
          border-radius: 12px;
          margin-bottom: 10px;
          transition: all 0.2s;
        }

        .room-item:hover {
          background: rgba(255,255,255,0.06);
        }

        .room-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .room-name {
          font-weight: 600;
          color: #ffd700;
        }

        .room-meta {
          font-size: 12px;
          color: #666;
        }

        .room-join-btn {
          padding: 8px 20px;
          background: linear-gradient(135deg, #4caf50 0%, #388e3c 100%);
          border: none;
          border-radius: 8px;
          color: #fff;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .room-join-btn:hover:not(:disabled) {
          transform: scale(1.05);
        }

        .room-join-btn:disabled {
          background: #333;
          color: #666;
        }

        /* 匹配状态 */
        .matching-status {
          padding: 10px;
        }

        .matching-status p {
          margin: 10px 0;
        }

        .match-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid rgba(255,215,0,0.3);
          border-top-color: #ffd700;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* 响应式 */
        @media (max-width: 768px) {
          .lobby-content {
            flex-direction: column;
            padding: 20px;
          }

          .lobby-left, .lobby-right {
            width: 100%;
            max-width: none;
          }
        }
      `}</style>
    </div>
  );
};

export default Lobby;
