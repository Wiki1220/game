import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Lobby from './components/Lobby';
import GameArena from './components/GameArena';
import WaitingRoom from './components/WaitingRoom';
import { socket } from './game/socket';
import './index.css';
import { useToast } from './components/common/Toast';

function App() {
  const { addToast } = useToast();
  const [user, setUser] = useState(null);
  const [gameState, setGameState] = useState('LOGIN'); // LOGIN, LOBBY, WAITING_ROOM, GAME_LOCAL, GAME_ONLINE

  // Room State
  const [roomInfo, setRoomInfo] = useState(null);

  // Game Context (for online game)
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [myColor, setMyColor] = useState('red');
  const [seed, setSeed] = useState(null);

  // Load user from local storage
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      setUser(JSON.parse(savedUser));
      setGameState('LOBBY');

      // 自动连接 Socket
      socket.auth = { token: savedToken };
      if (!socket.connected) {
        socket.connect();
      }
    }
  }, []);

  // Global Error Listener
  useEffect(() => {
    const handleGlobalError = (event) => {
      let msg = event.reason ? (typeof event.reason === 'string' ? event.reason : event.reason.message) : event.message;
      if (!msg && event.error) msg = event.error.message;
      if (!msg) msg = "未知错误";

      // Filter out ResizeObserver loop limit exceeded (Standard React ignore)
      if (msg.includes('ResizeObserver')) return;

      addToast(`系统错误: ${msg}`, 'error');
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleGlobalError);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleGlobalError);
    };
  }, [addToast]);

  // Socket Event Listeners for Global Room Navigation & Session
  useEffect(() => {
    if (!socket) return;

    // 1. Room Joined -> Go to Waiting Room
    const handleRoomJoined = (info) => {
      console.log('Room Joined:', info);
      setRoomInfo(info);
      setActiveRoomId(info.roomId);
      setGameState('WAITING_ROOM');
    };

    // 2. Game Start -> Go to Game Arena
    const handleGameStart = (data) => {
      console.log('Game Starting:', data);
      const myData = data.players.find(p => String(p.id) === String(user.id));
      setMyColor(myData ? myData.color : 'red');
      if (data.seed) setSeed(data.seed);
      setGameState('GAME_ONLINE');
    };

    // 3. Error
    const handleError = (msg) => {
      addToast(msg, 'error');
    };

    // 4. Connect Error
    const handleConnectError = (err) => {
      if (err.message === 'Authentication error') {
        localStorage.removeItem('token');
        setGameState('LOGIN');
      }
      addToast('连接错误: ' + err.message, 'error');
    };

    // 5. Force Disconnect (Session Kick)
    const handleForceDisconnect = ({ reason }) => {
      addToast('您已被强制下线: ' + reason, 'error');
      localStorage.removeItem('token');
      socket.disconnect();
      setGameState('LOGIN');
      setUser(null);
    };

    socket.on('room_joined', handleRoomJoined);
    socket.on('game_start', handleGameStart);
    socket.on('error', handleError);
    socket.on('connect_error', handleConnectError);
    socket.on('force_disconnect', handleForceDisconnect);

    return () => {
      socket.off('room_joined', handleRoomJoined);
      socket.off('game_start', handleGameStart);
      socket.off('error', handleError);
      socket.off('connect_error', handleConnectError);
      socket.off('force_disconnect', handleForceDisconnect);
    };
  }, [user, addToast]); // user dependency ensures we have user id for color check

  const handleLogin = (userData) => {
    setUser(userData);
    setGameState('LOBBY');

    // 连接 Socket
    const token = localStorage.getItem('token');
    socket.auth = { token };
    if (!socket.connected) {
      socket.connect();
    }
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

    // Always Ensure Connection
    if (!socket.connected) {
      socket.connect();
    }

    // 2. Emit Action (Wait for connect?)
    // Normally emit queues if disconnected.
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
    if (gameState === 'GAME_ONLINE' && activeRoomId) {
      socket.emit('leave_room');
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
        seed={seed}
        onQuit={() => setGameState('LOBBY')}
      />
    );
  }

  // DEFAULT: LOBBY
  return (
    <Lobby
      user={user}
      onLogout={handleLogout}
      onJoinGame={handleRoomAction}
      onLocalGame={handleStartLocalGame}
    />
  );
}

export default App;
