import React, { useState, useEffect } from 'react';
import { socket } from '../game/socket';

const WaitingRoom = ({ roomInfo, onLeave, userId }) => {
    const [players, setPlayers] = useState(roomInfo.players || []);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const handleUpdate = (data) => {
            // data: { userId, isReady }
            setPlayers(prev => prev.map(p =>
                p.id === data.userId ? { ...p, isReady: data.isReady } : p
            ));
        };

        const handleJoin = (player) => {
            setPlayers(prev => [...prev, player]);
        };

        const handleLeft = ({ userId }) => {
            setPlayers(prev => prev.filter(p => p.id !== userId));
        };

        socket.on('player_ready_update', handleUpdate);
        socket.on('player_joined', handleJoin);
        socket.on('player_left', handleLeft);

        return () => {
            socket.off('player_ready_update', handleUpdate);
            socket.off('player_joined', handleJoin);
            socket.off('player_left', handleLeft);
        };
    }, []);

    const toggleReady = () => {
        const newStatus = !isReady;
        setIsReady(newStatus);
        socket.emit('toggle_ready', { roomId: roomInfo.roomId, isReady: newStatus });
    };

    return (
        <div className="waiting-room-container">
            <div className="room-card">
                <header>
                    <h2>房间: {roomInfo.roomId}</h2>
                    <button className="leave-btn" onClick={onLeave}>离开房间</button>
                </header>

                <div className="players-list">
                    {/* Slot 1: Host/Red */}
                    {/* Slot 2: Guest/Black */}
                    {/* Or just map players */}
                    {players.map(p => (
                        <div key={p.id} className={`player-slot ${p.color}`}>
                            <div className="avatar" />
                            <div className="player-info">
                                <span className="name">{p.username} {p.id === userId ? '(我)' : ''}</span>
                                <span className={`status ${p.isReady ? 'ready' : ''}`}>
                                    {p.isReady ? '已准备' : '等待中...'}
                                </span>
                            </div>
                        </div>
                    ))}
                    {players.length < 2 && (
                        <div className="player-slot empty">等待玩家加入...</div>
                    )}
                </div>

                <div className="controls">
                    <button
                        className={`ready-btn ${isReady ? 'active' : ''}`}
                        onClick={toggleReady}
                    >
                        {isReady ? '取消准备' : '准备开始'}
                    </button>
                </div>
            </div>

            <style>{`
                .waiting-room-container {
                    height: 100vh; background: #1a1a1a; color: white;
                    display: flex; justify-content: center; align-items: center;
                }
                .room-card {
                    background: #2a2a2a; padding: 40px; border-radius: 12px;
                    width: 500px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                }
                header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
                .leave-btn { background: none; border: 1px solid #666; color: #aaa; padding: 5px 10px; cursor: pointer; border-radius: 4px; }
                .leave-btn:hover { border-color: #fff; color: #fff; }

                .players-list { display: flex; flex-direction: column; gap: 15px; margin-bottom: 30px; }
                .player-slot {
                    background: #333; padding: 15px; border-radius: 8px; display: flex; align-items: center; gap: 15px;
                    border-left: 5px solid #555;
                }
                .player-slot.red { border-left-color: #e74c3c; }
                .player-slot.black { border-left-color: #000; board: 1px solid #444; } /* Black border needs contrast */
                .player-slot.empty { border-left: 5px dashed #444; justify-content: center; color: #666; font-style: italic; }

                .avatar { width: 40px; height: 40px; background: #555; border-radius: 50%; }
                .player-info { flex: 1; display: flex; justify-content: space-between; align-items: center; }
                .status { font-size: 0.9em; color: #888; }
                .status.ready { color: #2ecc71; font-weight: bold; }

                .controls { text-align: center; }
                .ready-btn {
                    width: 100%; padding: 15px; border: none; border-radius: 8px;
                    font-size: 1.2em; font-weight: bold; cursor: pointer;
                    background: #d32f2f; color: white;
                    transition: all 0.2s;
                }
                .ready-btn.active {
                    background: #2ecc71;
                }
            `}</style>
        </div>
    );
};

export default WaitingRoom;
