import { PLAYERS, BOARD_WIDTH, BOARD_HEIGHT } from './constants.js';
import { getRandomCards } from './cards.js';
import { CARD_TYPES, CARD_TIERS } from './cardDefs.js';

// Action Types
export const ActionTypes = {
    SELECT_PIECE: 'SELECT_PIECE',
    MOVE_PIECE: 'MOVE_PIECE',
    TICK_TIMER: 'TICK_TIMER',
    SWITCH_TURN: 'SWITCH_TURN',
    DRAFT_CARD: 'DRAFT_CARD',
    PLAY_CARD: 'PLAY_CARD',
    RESOLVE_CARD: 'RESOLVE_CARD',
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

export const createInitialState = () => ({
    board: createInitialBoard(),
    turn: PLAYERS.RED,
    phase: 'PLAY_CARD', // Start in PLAY_CARD because Red Turn 1 skips Draft
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

    // Draft Logic
    // Red starts with NO cards (Phase will skip to PLAY_CARD in reducer init logic? Or handle in component?)
    // Actually, createInitialState makes draftOptions.
    // Rule: "先手的第一回合无选牌阶段"
    draftOptions: [], // Empty for Red Turn 1
    nextDraftRarity: null, // Used to sync rarity (Black -> Red)

    // Mechanics
    activeBuffs: [],
    traps: [],
    globalRule: null, // Single active global rule name/effect

    lastMove: null, // { fromX, fromY, toX, toY, pieceId }

    pendingCard: null,
});

const validateTarget = (piece, card, turn) => {
    if (!piece) return false;
    // General Immunity to Card Effects (Targeting)?
    // "将军只能被吃子,而不会被卡牌效果所消灭"
    // Usually means you can't target general with "Destroy" cards.
    // But buffs might be okay.
    // For now, allow targeting, handle immunity in effect resolution.

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
    const targetPiece = targetId ? newState.board.find(p => p.id === targetId) : null;

    // Remove card from hand
    newState.players[player].hand = state.players[player].hand.filter(c => c.uid !== card.uid);
    newState.phase = 'PLAY_CARD';
    newState.pendingCard = null;
    newState.selectedPieceId = null;
    newState.validMoves = [];

    // General Protection Check for DESTROY effects
    // If a card effect blindly destroys, we must check type.
    const isGeneral = (p) => p && p.type === 'general';

    switch (card.type) {
        case CARD_TYPES.SPEED:
            if (card.effectId) {
                newState.activeBuffs = [...newState.activeBuffs, card.effectId];
                logInfo += " (生效)";
            }
            break;

        case CARD_TYPES.TRAP:
            if (card.effectId && targetId) {
                newState.traps = [...newState.traps, {
                    player: player,
                    type: card.effectId,
                    targetId: targetId
                }];
                logInfo += ` 放置于棋子`;
            }
            break;

        case CARD_TYPES.RULE:
            // "永续卡场上只能存在一张...后发的覆盖前置"
            newState.globalRule = {
                name: card.name,
                effectId: card.effectId,
                player: player // owner just in case
            };
            logInfo += " (永续生效)";
            break;

        case CARD_TYPES.ACTION:
            if (card.effectId === 'ACTION_DESERTER') {
                if (targetPiece) {
                    // Logic: Back 1.
                    const backY = targetPiece.player === 'red' ? targetPiece.y + 1 : targetPiece.y - 1;

                    // Bounds check
                    if (backY >= 0 && backY <= 9) {
                        const collider = newState.board.find(p => p.x === targetPiece.x && p.y === backY);

                        // Collision Rule: "视作原先棋子将后来棋子吃掉"
                        if (collider) {
                            // Collider (Original Occupant) eats Mover (Later Piece)
                            // So TargetPiece (Mover) is removed. Collider stays.
                            newState.board = newState.board.filter(p => p.id !== targetPiece.id);
                            logInfo += " (撞击阵亡)";
                        } else {
                            // Move freely
                            newState.board = newState.board.map(p => p.id === targetPiece.id ? { ...p, y: backY } : p);
                            logInfo += " (后退)";
                        }
                    } else {
                        logInfo += " (出界无效)";
                    }
                }
                // Skip Move Phase -> Switch Turn
                const nextTurn = state.turn === PLAYERS.RED ? PLAYERS.BLACK : PLAYERS.RED;
                return prepareNextTurn(newState, nextTurn);
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

// Helper to switch turn and handle draft logic
const prepareNextTurn = (state, nextPlayer) => {
    let newState = { ...state, turn: nextPlayer, activeBuffs: [] }; // Clear buffs

    // Hand Limit Check
    // "手牌数量为三时应该无选牌阶段"
    const handSize = state.players[nextPlayer].hand.length;

    if (handSize >= 3) {
        newState.phase = 'PLAY_CARD';
        newState.draftOptions = [];
        // Keep nextDraftRarity for next person? 
        // Logic: "连续的两次选牌". If run is skipped, does it consume the Rarity logic?
        // Let's assume the rarity sync pattern holds: Black sets for Red.
        // If Red skips, does Black generate new or keep old?
        // "对面选到了黄金...". If I skip, I didn't select.
        // So Black generates fresh?
        // Let's keep it simple: If skipped, we don't consume/generate rarity.
        // Or: If Red skips, Black just randomly generates next time.
    } else {
        // Generate Draft
        // Logic: Black (P2) generates Random. Red (P1) uses Stored.
        // nextTurnRarity stores what P1 should use.
        // When P2 drafts, we generate X. We store X in 'nextDraftRarity'.
        // When P1 drafts, we use 'nextDraftRarity'.

        let draftResult;

        if (nextPlayer === PLAYERS.BLACK) {
            // Black generates random (or guided by Probabilities)
            draftResult = getRandomCards(3, null); // Null = use probability
            // Store this rarity for Red
            newState.nextDraftRarity = draftResult.rarity;
        } else {
            // Red uses stored rarity (if exists, else random - e.g. Turn 3 if Black skipped?)
            const forced = state.nextDraftRarity;
            draftResult = getRandomCards(3, forced); // If forced is null, it rolls random
        }

        newState.phase = 'DRAFT';
        newState.draftOptions = draftResult.cards;
    }

    return newState;
};


/* REDUCER */
export const gameReducer = (state, action) => {
    switch (action.type) {
        case ActionTypes.TICK_TIMER:
            if (state.phase.includes('GAME')) return state;
            const newTimers = { ...state.timers };
            newTimers[state.turn] -= 1;
            if (newTimers[state.turn] <= 0) {
                // Time over? For now just stop at 0
                return { ...state, phase: 'GAMEOVER', log: [...state.log, { player: 'SYSTEM', info: '超时判负' }] };
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
                draftOptions: [],
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
            if (state.phase === 'TARGET_SELECTION') {
                const target = state.board.find(p => p.id === action.payload.pieceId);
                // Validate
                if (validateTarget(target, state.pendingCard, state.turn)) {
                    return resolveCardEffect(state, state.pendingCard, action.payload.pieceId);
                } else {
                    return state;
                }
            }
            if (state.phase === 'PLAY_CARD') {
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
                if (targetPiece.type === 'general') {
                    logs.push({ player: 'SYSTEM', action: 'WIN', info: `${state.turn} Wins!` });
                    return { ...state, phase: 'GAMEOVER', log: [...state.log, ...logs] };
                }
            }

            // Move
            const newBoard = state.board.filter(p => p.id !== targetPiece?.id).map(p => {
                if (p.id === movedPiece.id) return { ...p, x: targetX, y: targetY };
                return p;
            });

            // Handle Traps
            const doomedTrap = state.traps.find(t => t.targetId === movedPiece.id && t.type === 'TRAP_DOOMED');
            if (doomedTrap) {
                nextState.players[state.turn].hand = [];
                logs.push({ player: 'SYSTEM', action: 'TRAP', info: '陷阱触发：弃置所有手牌!' });
                nextState.traps = nextState.traps.filter(t => t !== doomedTrap);
            }

            // Record Last Move
            nextState.lastMove = {
                fromX: movedPiece.x,
                fromY: movedPiece.y,
                toX: targetX,
                toY: targetY,
                pieceId: movedPiece.id
            };

            // State Update
            nextState.board = newBoard;
            nextState.log = [...state.log, { player: state.turn, action: 'MOVE', info: `${movedPiece.type} to (${targetX},${targetY})` }, ...logs];

            // Next Turn
            const nextTurn = state.turn === PLAYERS.RED ? PLAYERS.BLACK : PLAYERS.RED;
            return prepareNextTurn(nextState, nextTurn);

        case ActionTypes.END_PLAY_PHASE:
            // Skip the card playing, go straight to move?
            // Actually usually means "Skip to Move" but if user has nothing to move?
            // "Play Phase" implies "Card Phase". 
            // In our loop: Draft -> Play Card -> Move -> End Turn.
            // If user clicks "End Play Phase", they enter "Move Phase" (Implied by SELECT/MOVE PIECE availability).
            // Actually, SELECT_PIECE works in PLAY_CARD phase too (to move).
            // So END_PLAY_PHASE might mean "End Turn" if movement done?
            // Or maybe "I don't want to play cards, just let me move".
            // Since movement is integrated, this action might be redundant or just UI state.
            return state;

        default:
            return state;
    }
};
