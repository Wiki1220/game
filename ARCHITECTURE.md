# Xiangqi Card Game - Full Stack Architecture

## 1. System Overview
The system is divided into three main components:
1.  **Client (Frontend)**: React + Vite (Existing). Handles UI, animations, and input.
2.  **Game Server (Backend)**: Node.js + Socket.IO. Handles matchmaking, real-time game state synchronization, and validation.
3.  **Data Store**: MongoDB (Recommended). Stores user profiles, match history (for AI training), and card data.

## 2. Server Selection
**Recommended OS**: **Linux (Ubuntu 22.04 LTS)**
- **Reasoning**:
    - Native support for Node.js/Docker.
    - Standard for deploying Redis/MongoDB.
    - Cost-effective and stable for long-running socket connections.

## 3. Tech Stack Details

### Frontend (Client)
- **Framework**: React 19
- **State**: Redux-like local reducer (Migrating to Server authoritative state for multiplayer).
- **Network**: `socket.io-client` for real-time events.

### Backend (Server)
- **Runtime**: Node.js
- **Real-time**: `socket.io`
    - Events: `join_game`, `make_move`, `play_card`, `game_over`.
- **API**: Express.js (for Login/Signup REST APIs).
- **AI Interface**: Spawn Python process or HTTP request to Python AI service.

### Database
- **Users**: Username, Password Hash, MMR/Rank.
- **GameLogs**: Full JSON dump of every match actions (Vital for AI training).

## 4. Workflows

### Multiplayer Flow
1.  User connects via Socket.io.
2.  Server performs Matchmaking (Queue).
3.  Server creates a `GameRoom`.
4.  Moves are sent to Server -> Server Validates -> Broadcasts to both clients.
    *   *Note: Client-side validation is for UI feedback only; Server is authority.*

### AI Training Flow
1.  Game ends -> Server saves `GameLog` to DB.
2.  Python script pulls `GameLogs` -> Trains Model.
3.  Server loads new Model for "PvE" mode.
