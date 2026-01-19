import React, { useState } from 'react';
import { socket } from '../game/socket';

// Simple Lobby for now
const Lobby = ({ user, onLogout, onJoinGame, onLocalGame }) => {
    const [inputRoom, setInputRoom] = useState('');

    const handleCreate = () => {
        // Stage 5: Room Mechanism
        // For now, create a random room and join
        const roomId = `room_${Date.now()}_${user.id}`;
        onJoinGame(roomId, 'CREATE');
    };

    const handleJoin = () => {
        if (!inputRoom) return;
        onJoinGame(inputRoom, 'JOIN');
    };

    return (
        <div className="lobby-container">
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
                <div className="mode-card">
                    <h3>🕹️ 本地对战</h3>
                    <p>热座模式，与身边的朋友切磋</p>
                    <button onClick={onLocalGame} className="action-btn secondary">开始本地游戏</button>
                </div>

                <div className="mode-card online">
                    <h3>🌍 在线对战</h3>
                    <p>创建房间或加入他人房间</p>

                    <div className="room-actions">
                        <button onClick={handleCreate} className="action-btn primary large">创建房间</button>

                        <div className="join-input-group">
                            <input
                                type="text"
                                placeholder="输入房间号..."
                                value={inputRoom}
                                onChange={e => setInputRoom(e.target.value)}
                            />
                            <button onClick={handleJoin} className="action-btn">加入</button>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
        .lobby-container {
          height: 100vh;
          background: #1a1a1a;
          color: #fff;
          display: flex;
          flex-direction: column;
        }
        .lobby-header {
          padding: 20px;
          background: #252525;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }
        .user-profile {
          display: flex;
          gap: 15px;
          align-items: center;
        }
        .info h3 { margin: 0; }
        .info span { color: #888; font-size: 0.9em; margin-right: 10px; }
        .tag.guest { background: #555; padding: 2px 6px; borderRadius: 4px; color: #fff; font-size: 0.7em; }
        .lobby-content {
          flex: 1;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 30px;
          padding: 40px;
        }
        .mode-card {
          background: #2a2a2a;
          padding: 30px;
          border-radius: 12px;
          width: 300px;
          text-align: center;
          transition: transform 0.2s;
        }
        .mode-card:hover { transform: translateY(-5px); background: #333; }
        .mode-card.online { border: 1px solid #d32f2f; }
        
        .action-btn {
          width: 100%;
          padding: 12px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          font-weight: bold;
          margin-top: 20px;
        }
        .primary { background: #d32f2f; color: white; }
        .secondary { background: #444; color: white; }
        .large { font-size: 1.1em; padding: 15px; }
        
        .join-input-group {
          margin-top: 15px;
          display: flex;
          gap: 5px;
        }
        .join-input-group input {
          flex: 1;
          padding: 10px;
          background: #111;
          border: 1px solid #444;
          color: #fff;
          border-radius: 4px;
        }
      `}</style>
        </div>
    );
};

export default Lobby;
