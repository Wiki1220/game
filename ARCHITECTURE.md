# Xiangqi Card Game Architecture

## 1. Overview
This project is a web-based implementation of Chinese Chess (Xiangqi) fused with Roguelike card mechanics.
- **Tech Stack**: React + Vite + Vanilla CSS
- **Mode**: Local Hotseat (Two Players on one screen)

## 2. Core Structure

### State Management (The "Brain")
We will use a central `GameState` object managed by a formatted **Action/Reducer** pattern (similar to Redux, but local).
This ensures that every change is trackable, aiding the future AI training requirement.

```javascript
/* Example GameState */
{
  board: { ... }, // 10x9 Grid
  turn: 'red', // 'red' | 'black'
  phase: 'DRAFT', // 'DRAFT' | 'PLAY_CARD' | 'MOVE'
  players: {
    red: { hand: [], energy: 0, buffs: [] },
    black: { hand: [], energy: 0, buffs: [] }
  },
  activeEffects: [], // Global effects (e.g., "Horses have no legs")
  log: [] // History of all actions
}
```

## 3. The Card & Event System (Decoupling)
To support complex cards (like "Traps" or "Rule Changes"), we will not hardcode logic into the pieces. Instead, we use an **Event/Hook System**.

### Workflow
When an action happens (e.g., a unit tries to move), the engine allows active Cards/Buffs to "interrupt" or "modify" the action.

### Key Hooks
1.  **`canSelectCard(card)`**: Check conditions.
2.  **`onTurnStart`**: Trigger period effects.
3.  **`getValidMoves(board, piece)`**:
    *   *Standard Logic* calculates basic moves.
    *   *Effect Interceptors* modify the result (e.g., add "田" moves, remove blocking legs).
4.  **`onBeforeMove(source, target)`**: Can cancel move or trigger traps.
5.  **`onAfterMove(source, target)`**: Trigger post-move effects.
6.  **`onCapture(attacker, victim)`**: Critical for "Deathrattle" effects (Traps).

### Card Data Structure
```javascript
{
  id: 'trap_explosive',
  name: 'Explosive Trap',
  type: 'SECRET', // Hidden from opponent
  trigger: 'onCapture', // When listens
  effect: (gameState, context) => { ... } // What it does
}
```

## 4. Logging for AI
Every change to the state must come through a serialized `Action`.
We will save these actions to a `Gamelog`.

**Log Format:**
```json
{
  "seq": 105,
  "timestamp": 1715000000,
  "player": "red",
  "action": "PLAY_CARD",
  "payload": { "cardId": "horse_buff", "target": null },
  "resultingStateHash": "..."
}
```

## 5. Development Roadmap
1.  **Phase 1: The Board**: Render Xiangqi board & standard movement logic.
2.  **Phase 2: The Loop**: Implement Turn Switch & Game State machine.
3.  **Phase 3: The Cards**: Add UI for Hand/Drafting and the Hook system.
4.  **Phase 4: Visuals**: Add animations and styling.
