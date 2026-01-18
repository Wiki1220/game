import { PLAYERS, BOARD_WIDTH, BOARD_HEIGHT } from './constants';
import { getRandomCards } from './cards';
import { CARD_TYPES } from './cardDefs';

// Action Types
export const ActionTypes = {
    SELECT_PIECE: 'SELECT_PIECE',
    MOVE_PIECE: 'MOVE_PIECE',
    TICK_TIMER: 'TICK_TIMER',
    SWITCH_TURN: 'SWITCH_TURN', // Internal
    DRAFT_CARD: 'DRAFT_CARD',
    PLAY_CARD: 'PLAY_CARD', // Initiates play (checks target)
    RESOLVE_CARD: 'RESOLVE_CARD', // Finalizes play (after target selection)
    CANCEL_CARD: 'CANCEL_CARD',
    END_PLAY_PHASE: 'END_PLAY_PHASE'
};

/* Helper: Create Board */
const createInitialBoard = () => {
    const pieces = [];
    let idCounter = 1;
    const add = (type, player, x, y) => pieces.push({ id: idCounter++, type, player, x, y });

    // RED (Bottom, y=9 is General)
    add('chariot', 'red', 0, 9); add('horse', 'red', 1, 9); add('elephant', 'red', 2, 9); add('advisor', 'red', 3, 9);
    add('general', 'red', 4, 9);
    add('advisor', 'red', 5, 9); add('elephant', 'red', 6, 9); add('horse', 'red', 7, 9); add('chariot', 'red', 8, 9);
    add('cannon', 'red', 1, 7); add('cannon', 'red', 7, 7);
    add('soldier', 'red', 0, 6); add('soldier', 'red', 2, 6); add('soldier', 'red', 4, 6); add('soldier', 'red', 6, 6); add('soldier', 'red', 8, 6);

    // BLACK (Top, y=0 is General)
    add('chariot', 'black', 0, 0); add('horse', 'black', 1, 0); add('elephant', 'black', 2, 0); add('advisor', 'black', 3, 0);
    add('general', 'black', 4, 0);
    add('advisor', 'black', 5, 0); add('elephant', 'black', 6, 0); add('horse', 'black', 7, 0); add('chariot', 'black', 8, 0);
    add('cannon', 'black', 1, 2); add('cannon', 'black', 7, 2);
    add('soldier', 'black', 0, 3); add('soldier', 'black', 2, 3); add('soldier', 'black', 4, 3); add('soldier', 'black', 6, 3); add('soldier', 'black', 8, 3);

    return pieces;
};

/* Phase Manager:
   DRAFT -> PLAY_CARD (Main) -> END
*/
export const createInitialState = () => ({
    board: createInitialBoard(),
    turn: PLAYERS.RED, // 'red'
    phase: 'DRAFT', // DRAFT, PLAY_CARD, TARGET_SELECTION, GAMEOVER
    selectedPieceId: null,
    validMoves: [],
    players: {
        [PLAYERS.RED]: { hand: [], dead: [] },
        [PLAYERS.BLACK]: { hand: [], dead: [] }
    },
    timers: {
        [PLAYERS.RED]: 600,
        [PLAYERS.BLACK]: 600
    },
    halfMoveClock: 0,
    log: [],
    draftOptions: getRandomCards(), // Start with a draft!

    // Buffs/Rules
    activeBuffs: [], // List of buff IDs active THIS turn
    traps: [], // List of { player, type, targetId, effect }
    globalRules: {
        [PLAYERS.RED]: null,
        [PLAYERS.BLACK]: null
    },

    // Card Playing State
    pendingCard: null,
});

const validateTarget = (piece, card, turn) => {
    if (!piece) return false;
    // Check ownership
    if (card.targetEnemy && piece.player === turn) return false;
    if (card.targetSelf && piece.player !== turn) return false;
    if (card.targetType && piece.type !== card.targetType) return false;
    return true;
};

// --- HELPER: Resolve Card Effects ---
const resolveCardEffect = (state, card, targetId = null) => {
    const player = state.turn;
    let newState = { ...state };
    let logInfo = card.name;

    // Remove card from hand
    newState.players[player].hand = state.players[player].hand.filter(c => c.uid !== card.uid);
    newState.phase = 'PLAY_CARD'; // Return to play phase by default
    newState.pendingCard = null;
    newState.selectedPieceId = null;
    newState.validMoves = [];

    switch (card.type) {
        case CARD_TYPES.SPEED:
            // Add to activeBuffs
            if (card.effectId) {
                newState.activeBuffs = [...newState.activeBuffs, card.effectId];
                logInfo += " (生效)";
            }
            break;

        case CARD_TYPES.TRAP:
            // Add to traps
            if (card.effectId && targetId) {
                newState.traps = [...newState.traps, {
                    player: player, // who placed it
                    type: card.effectId,
                    targetId: targetId
                }];
                logInfo += ` 放置于棋子`;
            }
            break;

        case CARD_TYPES.RULE:
            // Set Global Rule
            newState.globalRules = {
                ...newState.globalRules,
                [player]: card.effectId
            };
            logInfo += " (持续生效)";
            break;

        case CARD_TYPES.ACTION:
            // Handle specific actions
            if (card.effectId === 'ACTION_DESERTER') {
                const pawn = newState.board.find(p => p.id === targetId);
                if (pawn) {
                    // Logic: Back 1.
                    // Red (y=9...0), Back is y+1. Black (y=0...9), Back is y-1.
                    const backY = pawn.player === 'red' ? pawn.y + 1 : pawn.y - 1;

                    // Bounds check
                    if (backY >= 0 && backY <= 9) {
                        // Check collision
                        const collider = newState.board.find(p => p.x === pawn.x && p.y === backY);

                        // Execute move if empty or enemy
                        if (!collider || collider.player !== player) {
                            // If enemy, capture
                            if (collider) {
                                newState.board = newState.board.filter(p => p.id !== collider.id);
                                logInfo += " (击杀后退)";
                            } else {
                                logInfo += " (后退)";
                            }
                            // Move Pawn
                            newState.board = newState.board.map(p => p.id === pawn.id ? { ...p, y: backY } : p);
                        } else {
                            logInfo += " (被阻挡)";
                        }
                    } else {
                        logInfo += " (出界无效)";
                    }
                }

                // Action cards typically consume the turn or "skip move phase"
                // Description: "此行动会跳过原本的移动阶段"
                // For now, let's keep it in PLAY_CARD phase, but user clicked "Action".
                // If it skips move, we should switch turn?
                // "This action skips original move phase".
                // So -> Switch Turn.
                const nextTurn = state.turn === PLAYERS.RED ? PLAYERS.BLACK : PLAYERS.RED;
                return {
                    ...newState,
                    turn: nextTurn,
                    phase: 'DRAFT',
                    draftOptions: getRandomCards(),
                    activeBuffs: [],
                    log: [...state.log, { player: state.turn, action: 'PLAY', info: logInfo }]
                };
            }
            break;

        default:
            break;
    }

    return {
        ...newState,
        log: [...newState.log, { player: state.turn, action: 'PLAY', info: logInfo }]
    };
};

/* REDUCER */
export const gameReducer = (state, action) => {
    switch (action.type) {
        case ActionTypes.TICK_TIMER:
            if (state.phase.includes('GAME')) return state;
            const newTimers = { ...state.timers };
            newTimers[state.turn] -= 1;
            if (newTimers[state.turn] <= 0) {
                // Game Over logic
                return state;
            }
            return { ...state, timers: newTimers };

        case ActionTypes.DRAFT_CARD:
            const { card } = action.payload;
            return {
                ...state,
                players: {
                    ...state.players,
                    [state.turn]: { ...state.players[state.turn], hand: [...state.players[state.turn].hand, card] }
                },
                phase: 'PLAY_CARD',
                draftOptions: [], // Clear draft
                activeBuffs: [], // New turn, reset turn buffs
                log: [...state.log, { player: state.turn, action: 'DRAFT', info: card.name }]
            };

        case ActionTypes.PLAY_CARD:
            const cardToPlay = action.payload.card;
            if (cardToPlay.needsTarget) {
                return {
                    ...state,
                    phase: 'TARGET_SELECTION',
                    pendingCard: cardToPlay,
                    selectedPieceId: null,
                    validMoves: []
                };
            } else {
                return resolveCardEffect(state, cardToPlay);
            }

        case ActionTypes.CANCEL_CARD:
            return {
                ...state,
                phase: 'PLAY_CARD',
                pendingCard: null,
                selectedPieceId: null,
                validMoves: []
            };

        case ActionTypes.RESOLVE_CARD:
            return resolveCardEffect(state, state.pendingCard, action.payload.targetId);

        case ActionTypes.SELECT_PIECE:
            // Handle selection
            if (state.phase === 'TARGET_SELECTION') {
                const target = state.board.find(p => p.id === action.payload.pieceId);
                // Validate
                if (validateTarget(target, state.pendingCard, state.turn)) {
                    // Auto resolve if valid
                    return resolveCardEffect(state, state.pendingCard, action.payload.pieceId);
                } else {
                    // Invalid target warning? Just ignore
                    return state;
                }
            }
            if (state.phase === 'PLAY_CARD') {
                // Just set selection. Valid moves are injected via UPDATE_VALID_MOVES
                return {
                    ...state,
                    selectedPieceId: action.payload.pieceId
                };
            }
            return state;

        case 'UPDATE_VALID_MOVES':
            return { ...state, validMoves: action.payload };

        case ActionTypes.MOVE_PIECE:
            const movedPiece = state.board.find(p => p.id === state.selectedPieceId);
            if (!movedPiece) return state;

            const targetX = action.payload.x;
            const targetY = action.payload.y;
            let logs = [];
            let nextState = { ...state };

            // Check Capture
            const targetPiece = state.board.find(p => p.x === targetX && p.y === targetY);
            if (targetPiece) {
                // Game Over Check
                if (targetPiece.type === 'general') {
                    // Win!
                    logs.push({ player: 'SYSTEM', action: 'WIN', info: `${state.turn} Wins!` });
                    return { ...state, phase: 'GAMEOVER', log: [...state.log, ...logs] };
                }
            }

            // Move
            const newBoard = state.board.filter(p => p.id !== targetPiece?.id).map(p => {
                if (p.id === movedPiece.id) return { ...p, x: targetX, y: targetY };
                return p;
            });

            // Handle Traps (DOOMED)
            // Check if mover has 'TRAP_DOOMED' target on them
            const doomedTrap = state.traps.find(t => t.targetId === movedPiece.id && t.type === 'TRAP_DOOMED');
            if (doomedTrap) {
                // Trigger Doom: Discard hand
                nextState.players[state.turn].hand = [];
                logs.push({ player: 'SYSTEM', action: 'TRAP', info: '陷阱触发：弃置所有手牌!' });
                // Remove trap
                nextState.traps = nextState.traps.filter(t => t !== doomedTrap);
            }

            // Next Turn
            const nextTurn = state.turn === PLAYERS.RED ? PLAYERS.BLACK : PLAYERS.RED;

            return {
                ...nextState,
                board: newBoard,
                turn: nextTurn,
                phase: 'DRAFT', // Cycle
                draftOptions: getRandomCards(),
                selectedPieceId: null,
                validMoves: [],
                activeBuffs: [],
                log: [...state.log, { player: state.turn, action: 'MOVE', info: `${movedPiece.type} to (${targetX},${targetY})` }, ...logs]
            };

        case ActionTypes.END_PLAY_PHASE:
            // Just UI helper? Implicitly the user moves next.
            return state;

        default:
            return state;
    }
};
