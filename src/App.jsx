import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Lobby from './components/Lobby';
import GameArena from './components/GameArena';
import { socket } from './game/socket';
import './index.css';

function App() {
  const [user, setUser] = useState(null);
  const [gameState, setGameState] = useState('LOGIN'); // LOGIN, LOBBY, GAME_LOCAL, GAME_ONLINE
  const [roomId, setRoomId] = useState(null);

  // Load user from local storage
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      setUser(JSON.parse(savedUser));
      setGameState('LOBBY');
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    setGameState('LOBBY');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setGameState('LOGIN');
    socket.disconnect();
  };

  const handleStartLocalGame = () => {
    setGameState('GAME_LOCAL');
  };

  const handleJoinOnlineGame = (targetRoomId, type) => {
    // 1. Connect Socket with Token
    const token = localStorage.getItem('token');
    socket.auth = { token };
    socket.connect();

    // 2. Set State
    setRoomId(targetRoomId);
    setGameState('GAME_ONLINE');

    // 3. Emit Join (Logic will be refined in Stage 5: Room Mechanism)
    // For now, we reuse the old flow logic inside GameArena, 
    // BUT actually GameArena expects socket events.
    // We should emit 'join_room' or similar here?
    // Old logic: socket.emit('find_match');

    // Let's rely on GameArena to handle socket events via 'gameMode'.
    // But we need to emit initial join.
    console.log(`Joining room: ${targetRoomId}`);

    // Temporary: Emit find_match compatible for old server logic
    // Or just connect. The old server logic puts you in a room if you match.
    // Stage 5 implements proper rooms. 
    // For now, let's stick to the OLD matching logic if we click "Online Game",
    // BUT the user interface has changed.

    // Since we are in Stage 3, we haven't implemented backend Room Manager yet (Stage 5).
    // So the "Create Room" buttons are a bit premature for the backend logic.
    // HOWEVER, to keep it working, we can use the old 'find_match' logic.

    if (type === 'JOIN' || type === 'CREATE') {
      // Fallback to old matching for now until Stage 5
      socket.emit('find_match');
    }
  };

  const handleQuitGame = () => {
    // Return to Lobby
    // If online, disconnect socket or leave room
    if (gameState === 'GAME_ONLINE') {
      socket.disconnect(); // Simple way to leave
    }
    setGameState('LOBBY');
    setRoomId(null);
  };

  // Render Router
  if (gameState === 'LOGIN') {
    return <Login onLogin={handleLogin} onGuest={handleLogin} />;
  }

  if (gameState === 'LOBBY') {
    return (
      <Lobby
        user={user}
        onLogout={handleLogout}
        onLocalGame={handleStartLocalGame}
        onJoinGame={handleJoinOnlineGame}
      />
    );
  }

  if (gameState === 'GAME_LOCAL') {
    return (
      <GameArena
        gameMode="LOCAL"
        onQuit={handleQuitGame}
      />
    );
  }

  if (gameState === 'GAME_ONLINE') {
    return (
      <GameArena
        gameMode="ONLINE_GAME"
        initialRoomId={roomId}
        myInitialColor="red" // This will be updated by socket 'game_start' in GameArena
        onQuit={handleQuitGame}
      />
    );
  }

  return <div>Loading...</div>;
}

export default App;
