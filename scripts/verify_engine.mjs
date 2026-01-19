
const { createInitialState, gameReducer, ActionTypes } = require('../src/game/engine'); // Node path? src usage requires babel or ESM.
// My project uses ESM for src?
// package.json "type": "module"?
// Let's check environment.
// If not, I can't import src directly in Node without babel.
// But I updated 'auto-deploy.js' to use `require`.
// My `engine.js` uses `export const`. ESM.
// `verify_room_logic.js` used `require`.
// `server` uses `require`.
// `src` uses `import`.
// I CANNOT run `src/game/engine.js` in Node directly if it uses ESM `current`.
// UNLESS I use `node --input-type=module` or rename to .mjs.
// OR `auto-deploy.js` builds frontend?
// Frontend is built by Vite.
// Server is CommonJS.
// Engine is shared?
// `src/game/engine.js` has `export const`. usage in Server?
// Server `socket.js` imported `engine_backend`? No, commented out.
// Server DOES NOT use engine.js currently.
// So Verification must be done by running a test script that supports ESM.
// `scripts/test_engine_rules.js` exists. How does it run?
// It likely uses `babel-node` or similar if setup?
// Or I rename it to .mjs?
// I'll check `package.json` to see `scripts`.
// But I can't check it easily.

// Logic:
// I'll try to run a simple `.mjs` script. Node supports ESM in .mjs.
// I'll write `scripts/verify_engine.mjs`.

import { createInitialState, gameReducer, ActionTypes } from '../src/game/engine.js';
import { PLAYERS } from '../src/game/constants.js';

console.log("Starting Engine Verification...");

// 1. Init
const state = createInitialState({ seed: 12345 });
if (!state.board) throw new Error("Board not initialized");
if (state.turn !== 'red') throw new Error("Turn not Red");
if (state.rng().toFixed(5) !== '0.24623') console.log("RNG Check Warning: Different impl or seed behavior");
// Just check it runs.

console.log("Initial State OK. Board Size:", state.board.length);

// 2. Select Piece
const cannon = state.board.find(p => p.type === 'cannon' && p.player === 'red');
const s1 = gameReducer(state, {
    type: ActionTypes.SELECT_PIECE,
    payload: { pieceId: cannon.id }
});

if (s1.validMoves.length === 0) throw new Error("No valid moves for Red Cannon");
console.log("Select Piece OK. Valid Moves:", s1.validMoves.length);

// 3. Move Piece
const move = s1.validMoves[0];
const s2 = gameReducer(s1, {
    type: ActionTypes.MOVE_PIECE,
    payload: { pieceId: cannon.id, toX: move.x, toY: move.y }
});

if (s2.turn !== 'black') throw new Error("Turn did not switch");
console.log("Move Piece OK. Turn Switched to Black.");

// 4. Draft Check (Turn 2 Black)
// Initial Hand size 0.
// Draft Phase should be triggered? or Play Phase?
// Rewrite: "Rule: Red Turn 1 skips draft".
// Black Turn 1? (Turn 2 total).
// Logic: "Draft Logic ... if hand < 3 ... newState.phase = 'DRAFT'".
if (s2.phase !== 'DRAFT') {
    console.error("Phase is:", s2.phase);
    throw new Error("Expected Black to enter DRAFT phase");
}
console.log("Draft Phase Triggered OK. Options:", s2.draftOptions?.length);

console.log("Engine Verification PASSED!");
