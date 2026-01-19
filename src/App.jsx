import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Lobby from './components/Lobby';
import GameArena from './components/GameArena';
import WaitingRoom from './components/WaitingRoom';
import { socket } from './game/socket';
import './index.css';

function App() {
  const [user, setUser] = useState(null);
  const [gameState, setGameState] = useState('LOGIN'); // LOGIN, LOBBY, WAITING_ROOM, GAME_LOCAL, GAME_ONLINE

  // Room State
  const [roomInfo, setRoomInfo] = useState(null);

  // Game Context (for online game)
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [myColor, setMyColor] = useState('red');

  // Load user from local storage
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      setUser(JSON.parse(savedUser));
      setGameState('LOBBY');
    }
  }, []);

  // Socket Event Listeners for Global Room Navigation
  useEffect(() => {
    if (!socket) return;

    // 1. Room Joined -> Go to Waiting Room
    const handleRoomJoined = (info) => {
      // info: { roomId, isOwner, players: [...] }
      console.log('Room Joined:', info);
      setRoomInfo(info);
      setActiveRoomId(info.roomId);
      setGameState('WAITING_ROOM');
    };

    // 2. Game Start -> Go to Game Arena
    const handleGameStart = (data) => {
      // data: { roomId, players: [{id, username, color}] }
      console.log('Game Starting:', data);

      // Find my color
      const myData = data.players.find(p => p.id === user.id);
      setMyColor(myData ? myData.color : 'red');

      setGameState('GAME_ONLINE');
    };

    // 3. Error
    const handleError = (msg) => {
      alert(msg); // Simple alert for now
    };

    socket.on('room_joined', handleRoomJoined);
    socket.on('game_start', handleGameStart);
    socket.on('error', handleError);

    return () => {
      socket.off('room_joined', handleRoomJoined);
      socket.off('game_start', handleGameStart);
      socket.off('error', handleError);
    };
  }, [user]); // user dependency ensures we have user id for color check

  const handleLogin = (userData) => {
    setUser(userData);
    setGameState('LOBBY');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setGameState('LOGIN');
    if (socket.connected) socket.disconnect();
  };

  const handleStartLocalGame = () => {
    setGameState('GAME_LOCAL');
    setMyColor('red'); // P1 is Red
    setActiveRoomId(null);
  };

  // Called from Lobby
  const handleRoomAction = ({ action, roomId, config }) => {
    // 1. Connect Socket
    const token = localStorage.getItem('token');
    socket.auth = { token };
    if (!socket.connected) socket.connect();

    // 2. Emit Action
    if (action === 'CREATE') {
      socket.emit('create_room', config);
    } else if (action === 'JOIN') {
      socket.emit('join_room', roomId);
    }
  };

  const handleLeaveRoom = () => {
    if (activeRoomId) {
      socket.emit('leave_room');
    }
    setActiveRoomId(null);
    setRoomInfo(null);
    setGameState('LOBBY');
  };

  const handleQuitGame = () => {
    // If online, leave room
    if (gameState === 'GAME_ONLINE' && activeRoomId) {
      socket.emit('leave_room');
      // Disconnect socket for clean slate? 
      // Or keep connected for lobby?
      // Keep connected usually.
    }
    setGameState('LOBBY');
    setActiveRoomId(null);
    setRoomInfo(null);
  };

  // --- RENDER ---

  if (gameState === 'LOGIN') {
    return <Login onLogin={handleLogin} onGuest={handleLogin} />;
  }

  if (gameState === 'WAITING_ROOM') {
    return (
      <WaitingRoom
        roomInfo={roomInfo}
        onLeave={handleLeaveRoom}
        userId={user ? user.id : null}
      />
    );
  }

  if (gameState === 'GAME_LOCAL') {
    return (
      <GameArena
        gameMode="LOCAL"
        myInitialColor="red"
        onQuit={handleQuitGame}
      />
    );
  }

  if (gameState === 'GAME_ONLINE') {
    return (
      <GameArena
        gameMode="ONLINE_GAME"
        initialRoomId={activeRoomId}
        myInitialColor={myColor}
        onQuit={handleQuitGame}
      />
    );
  }

  // DEFAULT: LOBBY
  return (
    <Lobby
      user={user}
      onLogout={handleLogout}
      onJoinGame={handleRoomAction} // Pass the handler
      onLocalGame={handleStartLocalGame}
    />
  );
}

export default App;
