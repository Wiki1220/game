import { PLAYERS, BOARD_WIDTH, BOARD_HEIGHT } from './constants.js';
import { getRandomCards, createRNG } from './cards.js';
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

const createInitialBoard = () => {
    const pieces = [];
    let idCounter = 1;
    const add = (type, player, x, y) => pieces.push({ id: idCounter++, type, player, x, y });

    // RED (Bottom)
    add('chariot', 'red', 0, 9); add('horse', 'red', 1, 9); add('elephant', 'red', 2, 9); add('advisor', 'red', 3, 9);
    add('general', 'red', 4, 9);
    add('advisor', 'red', 5, 9); add('elephant', 'red', 6, 9); add('horse', 'red', 7, 9); add('chariot', 'red', 8, 9);
    add('cannon', 'red', 1, 7); add('cannon', 'red', 7, 7);
    add('soldier', 'red', 0, 6); add('soldier', 'red', 2, 6); add('soldier', 'red', 4, 6); add('soldier', 'red', 6, 6); add('soldier', 'red', 8, 6);

    // BLACK (Top)
    add('chariot', 'black', 0, 0); add('horse', 'black', 1, 0); add('elephant', 'black', 2, 0); add('advisor', 'black', 3, 0);
    add('general', 'black', 4, 0);
    add('advisor', 'black', 5, 0); add('elephant', 'black', 6, 0); add('horse', 'black', 7, 0); add('chariot', 'black', 8, 0);
    add('cannon', 'black', 1, 2); add('cannon', 'black', 7, 2);
    add('soldier', 'black', 0, 3); add('soldier', 'black', 2, 3); add('soldier', 'black', 4, 3); add('soldier', 'black', 6, 3); add('soldier', 'black', 8, 3);

    return pieces;
};

export const createInitialState = ({ seed } = {}) => ({
    rng: createRNG(seed),
    board: createInitialBoard(),
    turn: PLAYERS.RED,
    phase: 'PLAY_CARD',
    selectedPieceId: null,
    validMoves: [],
    players: {
        [PLAYERS.RED]: { hand: [], dead: [] },
        [PLAYERS.BLACK]: { hand: [], dead: [] }
    },
    timers: { [PLAYERS.RED]: 600, [PLAYERS.BLACK]: 600 },
    halfMoveClock: 0,
    log: [],
    // Draft
    draftOptions: [],
    nextDraftRarity: null,
    // Mechanics
    activeBuffs: [],
    traps: [],
    globalRules: [],
    // Logic
    lastMove: null,
    lastOpponentMove: null, // { from: {x, y}, to: {x, y} }
    pendingCard: null,
    banishedPieces: [], // { piece, returnTurn }
    riverFloodTimer: 0,
    summonedPieces: [], // [pieceId1, pieceId2, ...] - Track summoned pieces for FIFO and cannon platform check
});

const getPieceAt = (board, x, y) => board.find(p => p.x === x && p.y === y);

// --- Move Logic ---
const isValidPos = (x, y) => x >= 0 && x < 9 && y >= 0 && y < 10;

const getValidMoves = (state, piece) => {
    if (!piece || piece.player !== state.turn) return [];

    // 1. Status Check
    const isFrozen = state.activeBuffs.some(b => b.pieceId === piece.id && b.effectId === 'FROZEN');
    if (isFrozen) return [];
    if (piece.immobile) return []; // Summoned Friendly
    if (piece.type === 'roadblock' || piece.type === 'jackpot' || piece.type === 'arsenal') return []; // Neutral usually immobile (unless Mind Control?)

    const moves = [];
    const { x, y, type, player } = piece;
    const dy = player === 'red' ? -1 : 1; // Forward direction

    // Helpers
    const checkMove = (tx, ty) => {
        if (!isValidPos(tx, ty)) return;
        const target = getPieceAt(state.board, tx, ty);
        if (target && target.player === player) return; // Blocked by friendly
        moves.push({ x: tx, y: ty });
    };

    const hasBuff = (effectId) => state.activeBuffs.some(b => b.pieceId === piece.id && b.effectId === effectId);
    const hasGlobal = (ruleId) => state.globalRules.some(r => r.id === ruleId);

    // Rule: Tide (No River Cross)
    const tideActive = hasGlobal('RULE_TIDE');
    const isRiverCross = (tx, ty) => {
        if (player === 'red') return ty <= 4; // Red river is y=4/5 boundary. Top is 0..4
        return ty >= 5;
    };

    // Filter wrapper
    const addMove = (tx, ty) => {
        if (tideActive && isRiverCross(tx, ty) && !isRiverCross(x, y)) return; // Crossing check
        checkMove(tx, ty);
    };

    switch (type) {
        case 'general': // Palace Only
            [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dx, dy]) => {
                const tx = x + dx, ty = y + dy;
                // Palace bounds: x 3-5. Red y 7-9, Black y 0-2
                if (tx < 3 || tx > 5) return;
                if (player === 'red' && ty < 7) return;
                if (player === 'black' && ty > 2) return;
                addMove(tx, ty);
            });
            break;
        case 'advisor': // Palace Diag
            [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([dx, dy]) => {
                const tx = x + dx, ty = y + dy;
                if (tx < 3 || tx > 5) return;
                if (player === 'red' && ty < 7) return;
                if (player === 'black' && ty > 2) return;
                addMove(tx, ty);
            });
            break;
        case 'elephant': // Diag 2. No River (unless Lifejacket). Eye block.
            [[2, 2], [2, -2], [-2, 2], [-2, -2]].forEach(([dx, dy]) => {
                const tx = x + dx, ty = y + dy;
                if (!isValidPos(tx, ty)) return;

                // Eye check
                if (getPieceAt(state.board, x + dx / 2, y + dy / 2)) return;

                // River check
                const canCross = hasBuff('EQUIP_LIFEJACKET');
                if (!canCross) {
                    if (player === 'red' && ty <= 4) return;
                    if (player === 'black' && ty >= 5) return;
                }
                addMove(tx, ty);
            });
            break;
        case 'horse': // L-move. Leg block. (Equip Horseshoe ignores leg)
            const ignoreLeg = hasBuff('EQUIP_HORSESHOE');
            [
                { dx: 1, dy: 2, lx: 0, ly: 1 }, { dx: -1, dy: 2, lx: 0, ly: 1 },
                { dx: 1, dy: -2, lx: 0, ly: -1 }, { dx: -1, dy: -2, lx: 0, ly: -1 },
                { dx: 2, dy: 1, lx: 1, ly: 0 }, { dx: 2, dy: -1, lx: 1, ly: 0 },
                { dx: -2, dy: 1, lx: -1, ly: 0 }, { dx: -2, dy: -1, lx: -1, ly: 0 }
            ].forEach(({ dx, dy, lx, ly }) => {
                if (!ignoreLeg && getPieceAt(state.board, x + lx, y + ly)) return; // Leg blocked
                addMove(x + dx, y + dy);
            });
            // Horseshoe restriction: "Cannot capture".
            // Implementation: Filter moves later? Or handle in addMove?
            // "Cannot capture" -> if target exists, remove.
            if (ignoreLeg) {
                // Filter capture moves if using horseshoe? 
                // Text says "Can ignore leg... but cannot THEREBY eat piece?" 
                // Or "Horseshoe Horse cannot eat AT ALL?" 
                // Usually "Cannot eat IF using leg ski". 
                // Let's assume strict "Cannot eat at all" is easier or "Cannot eat if leg was blocked".
                // Simplest interpretation: "Equipped horse cannot capture." (Penalty).
                // "无视马脚行动，但是无法因此吃子" -> "Cannot capture by this (ignoring leg)".
                // If leg wasn't blocked, can it capture? "无法因此".
                // I will assume: If Leg Blocked -> Add Move but ONLY if empty.
            }
            break;
        case 'chariot':
        case 'cannon':
            // Orthogonal.
            const restrict = hasGlobal('RULE_RESTRICT') && type === 'chariot';
            [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dx, dy]) => {
                for (let i = 1; i < 10; i++) {
                    if (restrict && i > 4) break;
                    const tx = x + dx * i, ty = y + dy * i;
                    if (!isValidPos(tx, ty)) break;

                    if (tideActive && isRiverCross(tx, ty) && !isRiverCross(x, y)) break; // Stop at river

                    const target = getPieceAt(state.board, tx, ty);
                    if (!target) {
                        moves.push({ x: tx, y: ty }); // Use raw moves to avoid re-check
                    } else {
                        // Conflict
                        if (type === 'chariot') {
                            if (target.player !== player) moves.push({ x: tx, y: ty }); // Capture
                        } else {
                            // Cannon: jump
                            // Look further for platform
                            for (let j = i + 1; j < 10; j++) {
                                const jx = x + dx * j, jy = y + dy * j;
                                if (!isValidPos(jx, jy)) break;
                                const target2 = getPieceAt(state.board, jx, jy);
                                if (target2) {
                                    if (target2.player !== player) moves.push({ x: jx, y: jy }); // Capture
                                    break;
                                }
                            }
                        }
                        break; // Stop scanning this dir
                    }
                }
            });
            break;
        case 'soldier':
            // Forward
            addMove(x, y + dy);
            // Side if crossed river
            const crossed = player === 'red' ? y <= 4 : y >= 5;
            if (crossed) {
                addMove(x + 1, y);
                addMove(x - 1, y);
            }
            break;
    }

    return moves;
};

// --- Resolve Card Effects ---
const resolveCardEffect = (state, card, targetId = null, targetPos = null) => {
    const player = state.turn;
    const opponent = player === PLAYERS.RED ? PLAYERS.BLACK : PLAYERS.RED;
    let newState = { ...state };
    let logInfo = card.name;

    // Helpers
    const spawnPiece = (type, owner, x, y, extra = {}) => {
        const id = Math.max(0, ...newState.board.map(p => p.id), 999) + 1; // Basic counter
        newState.board.push({ id, type, player: owner, x, y, ...extra });

        // Track summoned pieces for FIFO limit (max 2)
        newState.summonedPieces.push(id);

        // Enforce summon limit: max 2 summoned pieces
        if (newState.summonedPieces.length > 2) {
            const oldestId = newState.summonedPieces.shift(); // Remove oldest from tracking
            newState.board = newState.board.filter(p => p.id !== oldestId); // Remove from board
            newState.log.push({ turn: player, text: `召唤物上限，移除最早的召唤物` });
        }

        return id;
    };

    const targetPiece = targetId ? newState.board.find(p => p.id === targetId) : null;

    // Switch for Effects (33 Cards)
    switch (card.effectId) {
        case 'SUMMON_ROADBLOCK': if (targetPos) spawnPiece('roadblock', 'neutral', targetPos.x, targetPos.y); break;
        case 'SUMMON_JACKPOT':
            {
                let empty = []; for (let x = 0; x < 9; x++) for (let y = 0; y < 10; y++) if (!getPieceAt(newState.board, x, y)) empty.push({ x, y });
                if (empty.length) { const p = empty[Math.floor(Math.random() * empty.length)]; spawnPiece('jackpot', 'neutral', p.x, p.y); }
            }
            break;
        case 'SUMMON_FRIENDLY': if (targetPos) spawnPiece('soldier', player, targetPos.x, targetPos.y, { immobile: true }); break;
        case 'SUMMON_ARSENAL':
            {
                let empty = []; for (let x = 0; x < 9; x++) for (let y = 0; y < 10; y++) if (!getPieceAt(newState.board, x, y)) empty.push({ x, y });
                if (empty.length) { const p = empty[Math.floor(Math.random() * empty.length)]; spawnPiece('arsenal', 'neutral', p.x, p.y); }
            }
            break;
        case 'EQUIP_DRESS':
        case 'EQUIP_SUICIDE':
        case 'EQUIP_LIFEJACKET':
        case 'EQUIP_HORSESHOE':
        case 'EQUIP_MEDAL':
            // Check Equilibrium
            if (!newState.globalRules.some(r => r.id === 'RULE_EQUILIBRIUM') && targetPiece) {
                newState.activeBuffs.push({ pieceId: targetPiece.id, effectId: card.effectId, name: card.name });
            }
            break;
        case 'EQUIP_BARRIER':
            if (targetPiece) newState.activeBuffs.push({ pieceId: targetPiece.id, effectId: 'BARRIER', duration: 2 });
            break;
        case 'ACTION_UNIVERSE':
            {
                const myP = newState.board.filter(p => p.player === player);
                if (new Set(myP.map(p => p.type)).size === myP.length) {
                    newState.board = newState.board.filter(p => p.player === player || p.player === 'neutral');
                }
            }
            break;
        case 'ACTION_TYPHOON': newState.traps = []; break;
        case 'ACTION_FUTURE':
            if (targetPiece) {
                newState.banishedPieces.push({ piece: targetPiece, returnTurn: 3 });
                newState.board = newState.board.filter(p => p.id !== targetPiece.id);
            }
            break;
        case 'ACTION_UNDEAD':
            // Revive all dead soldiers
            newState.players[player].dead.filter(p => p.type === 'soldier').forEach(p => {
                // Try find empty spot near original?
                // Simple: Find first empty spot
                // ...
            });
            break;
        case 'ACTION_FIREBALL':
            if (newState.board.filter(p => p.player === player).length < newState.board.filter(p => p.player === opponent).length && targetPiece) {
                newState.board = newState.board.filter(p => p.id !== targetPiece.id);
            }
            break;
        case 'ACTION_NANO':
            if (targetPiece) {
                // Random Move 2 steps.
                // Simplified: Just move x/y randomly +/- 2
            }
            break;
        case 'ACTION_FLOOD': newState.riverFloodTimer = 12; break;
        case 'ACTION_TIME_DISTORT': newState.globalRules.push({ id: 'TIME_DISTORT', duration: 2 }); break;
        case 'ACTION_ESCORT':
            if (targetPos) {
                const friends = newState.board.filter(p => p.player === player);
                const f = friends[Math.floor(Math.random() * friends.length)];
                if (f) { f.x = targetPos.x; f.y = targetPos.y; }
            }
            break;
        case 'ACTION_IMMOBILIZE': if (targetPiece) newState.activeBuffs.push({ pieceId: targetPiece.id, effectId: 'FROZEN', duration: 2 }); break;
        case 'ACTION_MIND_CONTROL':
            if (targetPiece) {
                const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
                const valid = dirs.filter(([dx, dy]) => isValidPos(targetPiece.x + dx, targetPiece.y + dy) && !getPieceAt(newState.board, targetPiece.x + dx, targetPiece.y + dy));
                if (valid.length) {
                    const d = valid[Math.floor(Math.random() * valid.length)];
                    targetPiece.x += d[0]; targetPiece.y += d[1];
                }
            }
            break;
        case 'ACTION_IGNITION': if (targetPiece && targetPiece.type === 'chariot') {
            const dy = player === 'red' ? -1 : 1;
            if (!getPieceAt(newState.board, targetPiece.x, targetPiece.y + dy)) targetPiece.y += dy;
        } break;
        case 'RULE_PURSUIT':
        case 'RULE_UNLIMITED':
        case 'RULE_RESTRICT':
        case 'RULE_BURN':
        case 'RULE_EQUILIBRIUM':
        case 'RULE_TIDE':
            newState.globalRules.push({ id: card.effectId, duration: 999 });
            break;
        case 'TRAP_OVERLOAD': newState.globalRules.push({ id: 'TRAP_OVERLOAD', owner: player, count: 0 }); break;
        case 'SPEED_SHRUG': newState.activeBuffs.push({ effectId: 'SPEED_SHRUG', player, duration: 1 }); break;
    }

    newState.players[player].hand = newState.players[player].hand.filter(c => c.uid !== card.uid);
    newState.phase = 'PLAY_CARD';
    newState.pendingCard = null;
    newState.selectedPieceId = null;
    newState.log.push({ turn: state.turn, text: `${player === 'red' ? '红方' : '黑方'} 使用 ${card.name}` });
    return newState;
};

// --- Reducer ---
export const gameReducer = (state, action) => {
    switch (action.type) {
        case ActionTypes.SELECT_PIECE: {
            if (state.phase !== 'PLAY_CARD') return state;
            const { pieceId, x, y } = action.payload || {};
            const piece = state.board.find(p => p.id === pieceId);

            if (state.pendingCard) {
                if (!piece && state.pendingCard.needsTarget && !state.pendingCard.targetEmpty) return state;

                // Clicked Empty Space (for Summon/Escort)
                if (!piece && state.pendingCard.targetEmpty && x !== undefined && y !== undefined) {
                    return resolveCardEffect(state, state.pendingCard, null, { x, y });
                }

                // Card Target Selection (Piece)
                if (piece) {
                    // Validate target (Enemy/Self/Type)
                    // Note: validateTarget helper was removed in overwrite?
                    // I need to Inline validate or restore it.
                    // Inline Validation:
                    const card = state.pendingCard;
                    if (card.targetEnemy && piece.player === state.turn) return state; // Invalid
                    if (card.targetSelf && piece.player !== state.turn) return state; // Invalid
                    if (card.targetType && piece.type !== card.targetType) return state;
                    return resolveCardEffect(state, card, piece.id);
                }
            }

            if (!piece || piece.player !== state.turn) return { ...state, selectedPieceId: null, validMoves: [] };

            const moves = getValidMoves(state, piece);
            return { ...state, selectedPieceId: piece.id, validMoves: moves };
        }

        case ActionTypes.PLAY_CARD: {
            const { card } = action.payload;
            if (card.needsTarget) return { ...state, pendingCard: card };
            return resolveCardEffect(state, card);
        }

        case ActionTypes.MOVE_PIECE: {
            const { pieceId, toX, toY } = action.payload;
            const piece = state.board.find(p => p.id === pieceId);
            if (!piece) return state;

            let newState = { ...state };

            // Store move position for tracking (BEFORE piece moves)
            const moveFrom = { x: piece.x, y: piece.y };

            // LOGIC: Capture & Triggers (Jackpot, etc.)
            const target = newState.board.find(p => p.x === toX && p.y === toY);
            if (target) {
                newState.board = newState.board.filter(p => p.id !== target.id);
                if (target.player !== 'neutral') newState.players[target.player].dead.push(target);

                // Triggers
                if (target.type === 'jackpot') {
                    const currentHandSize = newState.players[state.turn].hand.length;
                    // Hand limit check: only add cards if hand has space
                    if (currentHandSize < 3) {
                        const cardsToGet = Math.min(currentHandSize, 3 - currentHandSize); // Get as many as possible
                        const { cards } = getRandomCards(cardsToGet, CARD_TIERS.PRISMATIC, newState.rng);
                        newState.players[state.turn].hand.push(...cards);
                    }
                    // If hand is full (3), silently discard (no message per requirement)
                }

                // Cannon Platform Suicide: If cannon captures using summoned piece as platform, cannon dies too
                if (piece.type === 'cannon' && target.player !== piece.player) {
                    // Find the platform piece (between cannon's original position and target)
                    const fromX = piece.x, fromY = piece.y;

                    // Determine direction
                    const dx = toX === fromX ? 0 : (toX > fromX ? 1 : -1);
                    const dy = toY === fromY ? 0 : (toY > fromY ? 1 : -1);

                    // Search for platform piece
                    let platformPiece = null;
                    let checkX = fromX + dx, checkY = fromY + dy;
                    while (checkX !== toX || checkY !== toY) {
                        const potentialPlatform = getPieceAt(newState.board, checkX, checkY);
                        if (potentialPlatform) {
                            platformPiece = potentialPlatform;
                            break;
                        }
                        checkX += dx;
                        checkY += dy;
                    }

                    // Check if platform is a summoned piece
                    if (platformPiece && newState.summonedPieces.includes(platformPiece.id)) {
                        // Cannon suicide: remove the cannon that just moved
                        newState.board = newState.board.filter(p => p.id !== piece.id);
                        newState.players[piece.player].dead.push(piece);
                        newState.log.push({ turn: state.turn, text: `${piece.player === 'red' ? '红方' : '黑方'}的炮使用召唤物作为炮架，同归于尽` });
                        // Note: piece is already moved to toX, toY, but we're removing it before turn switch
                    }
                }
            }

            piece.x = toX; piece.y = toY;

            // Track last opponent move (for UI highlighting)
            newState.lastOpponentMove = {
                from: moveFrom,
                to: { x: toX, y: toY }
            };

            // Switch Turn
            const nextTurn = state.turn === PLAYERS.RED ? PLAYERS.BLACK : PLAYERS.RED;
            newState.turn = nextTurn;

            // --- Draft Logic ---
            const hand = newState.players[nextTurn].hand;
            // Hand Limit 3 (Skip Draft)
            if (hand.length >= 3) {
                newState.log.push({ turn: nextTurn, text: '手牌上限(3)，跳过抽卡' });
                newState.phase = 'PLAY_CARD';
            } else {
                newState.phase = 'DRAFT';
                // Generate Options using PROPER RNG (Deterministic)
                const { cards, rarity } = getRandomCards(3, newState.nextDraftRarity, newState.rng);
                newState.draftOptions = cards;
                newState.nextDraftRarity = rarity; // Sync rarity to next player
            }

            newState.selectedPieceId = null;
            newState.validMoves = [];

            // Logic: Flood Timer, Banished Return, Buff Duration
            if (newState.riverFloodTimer > 0) {
                newState.riverFloodTimer--;
                if (newState.riverFloodTimer === 0) {
                    newState.board = newState.board.filter(p => p.y !== 4 && p.y !== 5); // Kill river
                }
            }

            return newState;
        }

        case ActionTypes.DRAFT_CARD: {
            const { card } = action.payload;
            if (state.phase !== 'DRAFT') return state;

            const hand = state.players[state.turn].hand;
            // Hand limit check: max 3 cards
            if (hand.length >= 3) {
                // Silently reject if hand is full (shouldn't happen due to skip logic, but safety check)
                return { ...state, phase: 'PLAY_CARD', draftOptions: [] };
            }

            // Add card to hand
            const newState = { ...state };
            newState.players[state.turn].hand = [...hand, card];
            newState.phase = 'PLAY_CARD';
            newState.draftOptions = [];
            newState.log.push({ turn: state.turn, text: `${state.turn === 'red' ? '红方' : '黑方'} 选择了 ${card.name}` });

            return newState;
        }

        case ActionTypes.CANCEL_CARD: {
            return { ...state, pendingCard: null, selectedPieceId: null, validMoves: [] };
        }

        case ActionTypes.END_PLAY_PHASE: {
            // For now, just a placeholder - could add logic to enforce move phase
            return state;
        }

        default: return state;
    }
};
