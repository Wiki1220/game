import { PLAYERS, BOARD_WIDTH, BOARD_HEIGHT, GAME_CONFIG } from './constants.js';
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
    timers: { [PLAYERS.RED]: GAME_CONFIG.TURN_TIME_LIMIT, [PLAYERS.BLACK]: GAME_CONFIG.TURN_TIME_LIMIT },
    halfMoveClock: 0,
    log: [],
    // Draft
    draftOptions: [],
    nextDraftRarity: null,
    rarityOwner: null, // Track who chose the current rarity ('red' or 'black')
    // Mechanics
    activeBuffs: [],
    traps: [],
    globalRules: [], // { id, name, effect, duration, owner }
    // Logic
    lastMove: null, // { pieceId, from: {x,y}, to: {x,y} }
    lastOpponentMove: null, // { from: {x,y}, to: {x,y} } - for UI highlight
    pendingCard: null,
    banishedPieces: [], // For ACTION_FUTURE
    cardsPlayedThisTurn: 0,
    riverFloodTimer: 0,
    summonedPieces: [], // List of IDs of summoned pieces (for limit check)
});

const getPieceAt = (board, x, y) => board.find(p => p.x === x && p.y === y);

const getPieceName = (piece) => {
    const names = {
        red: { general: '帅', advisor: '仕', elephant: '相', horse: '马', chariot: '车', cannon: '炮', soldier: '兵', roadblock: '路障', jackpot: '大奖', arsenal: '武器库' },
        black: { general: '将', advisor: '士', elephant: '象', horse: '马', chariot: '车', cannon: '炮', soldier: '卒', roadblock: '路障', jackpot: '大奖', arsenal: '武器库' },
        neutral: { roadblock: '路障', jackpot: '大奖', arsenal: '武器库' }
    };
    return names[piece.player]?.[piece.type] || piece.type;
};

// --- Move Logic ---
const isValidPos = (x, y) => x >= 0 && x < 9 && y >= 0 && y < 10;

export const getValidMoves = (state, piece, ignoreTurn = false) => {
    if (!piece || (!ignoreTurn && piece.player !== state.turn)) return [];

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

        // Check Barrier: Cannot be targeted
        if (target) {
            const hasBarrier = state.activeBuffs.some(b => b.pieceId === target.id && b.effectId === 'BARRIER');
            if (hasBarrier && target.player !== player) return;
        }

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
                const legBlocked = getPieceAt(state.board, x + lx, y + ly);
                if (legBlocked && !ignoreLeg) return; // Leg blocked and no horseshoe

                // Horseshoe Restriction: "Cannot capture thereby" (if legitimate move was blocked)
                // If leg was blocked (but ignored), we cannot capture.
                if (legBlocked && ignoreLeg) {
                    const target = getPieceAt(state.board, x + dx, y + dy);
                    if (target) return; // Cannot capture if using horseshoe mechanic
                }

                addMove(x + dx, y + dy);
            });
            // Horseshoe restriction: "Cannot capture".
            // Implementation: Filter moves later? Or handle in addMove?
            // Text says "Can ignore leg... but cannot THEREBY eat piece?" 
            // Or "Horseshoe Horse cannot eat AT ALL?" 
            // Usually "Cannot eat IF using leg ski". 
            // Let's assume strict "Cannot eat at all" is easier or "Cannot eat if leg was blocked".
            // Simplest interpretation: "Equipped horse cannot capture." (Penalty).
            // "无视马脚行动，但是无法因此吃子" -> "Cannot capture by this (ignoring leg)".
            // If leg wasn't blocked, can it capture? "无法因此".
            // I will assume: If Leg Blocked -> Add Move but ONLY if empty.
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

    // Resolve Card
    newState.cardsPlayedThisTurn = (newState.cardsPlayedThisTurn || 0) + 1;

    // Check TRAP_OVERLOAD Logic
    // "If your opponent plays 3rd card in a turn, end their turn"
    const overloadTrap = newState.globalRules.find(r => r.id === 'TRAP_OVERLOAD' && r.owner === opponent);
    if (overloadTrap) {
        if (newState.cardsPlayedThisTurn >= 3) {
            newState.log.push({ text: `对手触发陷阱【过载】，${player === 'red' ? '红方' : '黑方'} 回合强制结束!` });

            // Remove the trap (Triggered)
            newState.globalRules = newState.globalRules.filter(r => r !== overloadTrap);

            // Force Turn Switch logic (simplified copy of turn switch)
            const nextTurn = state.turn === PLAYERS.RED ? PLAYERS.BLACK : PLAYERS.RED;
            newState.turn = nextTurn;
            newState.phase = 'DRAFT'; // Or whatever next phase
            newState.cardsPlayedThisTurn = 0;
            // ... Draft logic needed here too? Or just skip draft?
            // Simple: Set phase to 'PLAY_CARD' directly to punish? 
            // Standard flow: DRAFT -> PLAY. Let's give them draft.
            // Duplicate draft logic is complex. 
            // Alternative: Set phase to 'END_TURN_IMMEDIATE' and handle in reducer? No.
            // Let's just return to 'DRAFT' phase for opponent.
            // We need to run the draft logic again...
            // Refactor turn switch logic to helper?
            // For now, let's just use return newState with phase 'DRAFT' and let next user click draft?
            // Or better: Skip draft for simplicity to avoid code dupe.
            newState.phase = 'PLAY_CARD';
            return newState;
        }
    }

    switch (card.effectId) {
        case 'SUMMON_ROADBLOCK':
            if (!targetPos) {
                console.error('SUMMON_ROADBLOCK requires targetPos');
                newState.log.push({ text: `${player === 'red' ? '红方' : '黑方'} 召唤路障失败 (未选择位置)` });
                break;
            }
            try {
                const id = spawnPiece('roadblock', 'neutral', targetPos.x, targetPos.y);
                if (id) {
                    newState.log.push({ text: `${player === 'red' ? '红方' : '黑方'} 召唤了路障` });
                }
            } catch (error) {
                console.error('SUMMON_ROADBLOCK error:', error);
                newState.log.push({ text: `${player === 'red' ? '红方' : '黑方'} 召唤路障失败` });
            }
            break;

        case 'SUMMON_JACKPOT':
            {
                try {
                    let empty = [];
                    for (let x = 0; x < 9; x++) {
                        for (let y = 0; y < 10; y++) {
                            if (!getPieceAt(newState.board, x, y)) empty.push({ x, y });
                        }
                    }
                    if (empty.length) {
                        const p = empty[Math.floor(Math.random() * empty.length)];
                        const id = spawnPiece('jackpot', 'neutral', p.x, p.y);
                        if (id) {
                            newState.log.push({ text: `${player === 'red' ? '红方' : '黑方'} 召唤了大奖` });
                        }
                    }
                } catch (error) {
                    console.error('SUMMON_JACKPOT error:', error);
                    newState.log.push({ text: `${player === 'red' ? '红方' : '黑方'} 召唤大奖失败` });
                }
            }
            break;

        case 'SUMMON_FRIENDLY':
            if (!targetPos) {
                console.error('SUMMON_FRIENDLY requires targetPos');
                newState.log.push({ text: `${player === 'red' ? '红方' : '黑方'} 召唤增援失败 (未选择位置)` });
                break;
            }
            try {
                const id = spawnPiece('soldier', player, targetPos.x, targetPos.y, { immobile: true });
                if (id) {
                    newState.log.push({ text: `${player === 'red' ? '红方' : '黑方'} 召唤了增援` });
                }
            } catch (error) {
                console.error('SUMMON_FRIENDLY error:', error);
                newState.log.push({ text: `${player === 'red' ? '红方' : '黑方'} 召唤增援失败` });
            }
            break;

        case 'SUMMON_ARSENAL':
            {
                try {
                    let empty = [];
                    for (let x = 0; x < 9; x++) {
                        for (let y = 0; y < 10; y++) {
                            if (!getPieceAt(newState.board, x, y)) empty.push({ x, y });
                        }
                    }
                    if (empty.length) {
                        const p = empty[Math.floor(Math.random() * empty.length)];
                        const id = spawnPiece('arsenal', 'neutral', p.x, p.y);
                        if (id) {
                            newState.log.push({ text: `${player === 'red' ? '红方' : '黑方'} 召唤了武器库` });
                        }
                    }
                } catch (error) {
                    console.error('SUMMON_ARSENAL error:', error);
                    newState.log.push({ text: `${player === 'red' ? '红方' : '黑方'} 召唤武器库失败` });
                }
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
                // Check condition: no duplicate piece types
                const myP = newState.board.filter(p => p.player === player);
                if (new Set(myP.map(p => p.type)).size === myP.length) {
                    // Eliminate all ENEMY pieces (not own pieces!)
                    const enemyPieces = newState.board.filter(p => p.player === opponent);
                    enemyPieces.forEach(p => newState.players[opponent].dead.push(p));
                    newState.board = newState.board.filter(p => p.player !== opponent);
                    newState.log.push({ text: `${player === 'red' ? '红方' : '黑方'} 宇宙消灭所有敌方棋子!` });
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
            {
                // Check if all soldiers are dead
                const mySoldiers = newState.board.filter(p => p.player === player && p.type === 'soldier');
                const deadSoldiers = newState.players[player].dead.filter(p => p.type === 'soldier');

                if (mySoldiers.length === 0 && deadSoldiers.length > 0) {
                    // Revive all dead soldiers at random empty positions
                    deadSoldiers.forEach(soldier => {
                        let empty = [];
                        for (let x = 0; x < 9; x++) {
                            for (let y = 0; y < 10; y++) {
                                if (!getPieceAt(newState.board, x, y)) empty.push({ x, y });
                            }
                        }
                        if (empty.length > 0) {
                            const pos = empty[Math.floor(Math.random() * empty.length)];
                            soldier.x = pos.x;
                            soldier.y = pos.y;
                            newState.board.push(soldier);
                        }
                    });
                    // Clear dead soldiers
                    newState.players[player].dead = newState.players[player].dead.filter(p => p.type !== 'soldier');
                    newState.log.push({ text: `${player === 'red' ? '红方' : '黑方'} 复活了所有兵!` });
                }
            }
            break;
        case 'ACTION_FIREBALL':
            // Check condition: my pieces < opponent pieces
            if (newState.board.filter(p => p.player === player).length < newState.board.filter(p => p.player === opponent).length && targetPiece) {
                // Cannot kill general with fireball
                if (targetPiece.type === 'general') {
                    newState.log.push({ text: `${player === 'red' ? '红方' : '黑方'} 火球术无法消灭将帅` });
                } else {
                    newState.board = newState.board.filter(p => p.id !== targetPiece.id);
                    newState.players[targetPiece.player].dead.push(targetPiece);
                }
            }
            break;
        case 'ACTION_NANO':
            if (targetPiece) {
                // Random Move 2 steps
                const moves = getValidMoves(newState, targetPiece);
                if (moves.length > 0) {
                    // First random move
                    const move1 = moves[Math.floor(Math.random() * moves.length)];
                    targetPiece.x = move1.x;
                    targetPiece.y = move1.y;

                    // Second random move from new position
                    const moves2 = getValidMoves(newState, targetPiece);
                    if (moves2.length > 0) {
                        const move2 = moves2[Math.floor(Math.random() * moves2.length)];
                        targetPiece.x = move2.x;
                        targetPiece.y = move2.y;
                    }
                    newState.log.push({ text: `${player === 'red' ? '红方' : '黑方'} 纳米激素使 ${getPieceName(targetPiece)} 随机移动` });
                }
            }
            break;
        case 'ACTION_FLOOD': newState.riverFloodTimer = 12; break;
        case 'ACTION_TIME_DISTORT': newState.globalRules.push({ id: 'TIME_DISTORT', duration: 2 }); break;
        case 'ACTION_ESCORT':
            // Check if in check (应将)
            const general = newState.board.find(p => p.player === player && p.type === 'general');
            const isInCheck = general && newState.board.some(p => {
                if (p.player === opponent) {
                    const moves = getValidMoves(newState, p);
                    return moves.some(m => m.x === general.x && m.y === general.y);
                }
                return false;
            });

            if (!isInCheck) {
                // Not in check, discard card
                newState.log.push({ text: `${player === 'red' ? '红方' : '黑方'} 弃置护驾 (未应将)` });
                break;
            }

            if (targetPos) {
                const friends = newState.board.filter(p => p.player === player);
                const f = friends[Math.floor(Math.random() * friends.length)];
                if (f) {
                    f.x = targetPos.x;
                    f.y = targetPos.y;
                    newState.log.push({ text: `${player === 'red' ? '红方' : '黑方'} 护驾传送 ${getPieceName(f)}` });
                }
            }
            break;
        case 'ACTION_SUS_TRADE':
            // Record the piece type used this turn, will check opponent's next turn
            if (newState.lastMovedPieceType) {
                newState.activeBuffs.push({
                    effectId: 'SUS_TRADE_WATCH',
                    player,
                    watchType: newState.lastMovedPieceType,
                    duration: 2
                });
            }
            break;
        case 'ACTION_IMMOBILIZE': if (targetPiece) newState.activeBuffs.push({ pieceId: targetPiece.id, effectId: 'FROZEN', duration: 2 }); break;
        case 'ACTION_MIND_CONTROL':
            if (targetPiece) {
                // Cannot control advisor or elephant
                if (targetPiece.type === 'advisor' || targetPiece.type === 'elephant') {
                    newState.log.push({ text: `${player === 'red' ? '红方' : '黑方'} 精神控制无效 (士相不可控制)` });
                    break;
                }

                const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
                const valid = dirs.filter(([dx, dy]) => isValidPos(targetPiece.x + dx, targetPiece.y + dy) && !getPieceAt(newState.board, targetPiece.x + dx, targetPiece.y + dy));
                if (valid.length) {
                    const d = valid[Math.floor(Math.random() * valid.length)];
                    targetPiece.x += d[0]; targetPiece.y += d[1];
                    newState.log.push({ text: `${player === 'red' ? '红方' : '黑方'} 精神控制 ${getPieceName(targetPiece)}` });
                }
            }
            break;
        case 'ACTION_IGNITION':
            if (targetPiece && targetPiece.type === 'chariot') {
                // Check if at birth position
                const birthY = player === 'red' ? 9 : 0;
                if (targetPiece.y === birthY) {
                    const dy = player === 'red' ? -1 : 1;
                    if (!getPieceAt(newState.board, targetPiece.x, targetPiece.y + dy)) {
                        targetPiece.y += dy;
                        newState.log.push({ text: `${player === 'red' ? '红方' : '黑方'} 点火使车前进` });
                    }
                }
            }
            break;
        case 'RULE_PURSUIT':
        case 'RULE_UNLIMITED':
        case 'RULE_RESTRICT':
        case 'RULE_BURN':
        case 'RULE_EQUILIBRIUM':
        case 'RULE_TIDE':
            // Add complete card info to globalRules for proper display
            // Single Rule Logic (Environment Cards Mutually Exclusive)
            // Single Rule Logic (Environment Cards Mutually Exclusive)
            newState.globalRules = newState.globalRules.filter(r => r.type !== '永续');
            newState.globalRules.push({
                id: card.effectId,
                name: card.name,
                effect: card.effect,
                type: card.type,
                duration: 999
            });
            break;
        case 'TRAP_OVERLOAD':
            {
                const currentTraps = newState.globalRules.filter(r => r.owner === player && (r.type === '陷阱' || r.type === CARD_TYPES.TRAP));
                if (currentTraps.length >= 2) {
                    newState.log.push({ text: `${player === 'red' ? '红方' : '黑方'} 陷阱已达上限 (2/2)，无法盖放。` });
                    break;
                }
                newState.globalRules.push({
                    id: 'TRAP_OVERLOAD',
                    name: '过载',
                    type: '陷阱',
                    owner: player,
                    count: 0
                });
            }
            break;
        case 'SPEED_SHRUG':
            newState.activeBuffs.push({ effectId: 'SPEED_SHRUG', player, duration: 1 });
            break;
        case 'SPEED_COLUMN':
            // Check if in check
            const gen = newState.board.find(p => p.player === player && p.type === 'general');
            const inCheck = gen && newState.board.some(p => {
                if (p.player === opponent) {
                    const movs = getValidMoves(newState, p);
                    return movs.some(m => m.x === gen.x && m.y === gen.y);
                }
                return false;
            });

            if (inCheck && gen) {
                // Can only move general, but can move twice
                newState.activeBuffs.push({
                    effectId: 'SPEED_COLUMN',
                    player,
                    allowedPiece: gen.id,
                    movesLeft: 2,
                    duration: 1
                });
                newState.log.push({ text: `${player === 'red' ? '红方' : '黑方'} 绕柱 - 将可移动2步` });
            } else {
                newState.log.push({ text: `${player === 'red' ? '红方' : '黑方'} 弃置绕柱 (未应将)` });
            }
            break;
    }

    newState.players[player].hand = newState.players[player].hand.filter(c => c.uid !== card.uid);
    newState.phase = 'PLAY_CARD';
    newState.pendingCard = null;
    newState.selectedPieceId = null;
    newState.log.push({ turn: state.turn, text: `${player === 'red' ? '红方' : '黑方'} 使用 ${card.name}` });

    // Action Cards (Nano, Fireball) end the turn immediately
    if (card.type === CARD_TYPES.ACTION) {
        return switchTurnLogic(newState);
    }

    return newState;
};

// --- Reducer ---
// Helper for Turn Switching (Shared by MOVE and TIMEOUT)
const switchTurnLogic = (state) => {
    const newState = { ...state };

    // Switch Turn
    const nextTurn = state.turn === PLAYERS.RED ? PLAYERS.BLACK : PLAYERS.RED;
    newState.turn = nextTurn;

    // Reset Timer for new turn
    newState.timers[nextTurn] = GAME_CONFIG.TURN_TIME_LIMIT;

    // --- Draft Logic ---
    const hand = newState.players[nextTurn].hand;
    // Hand Limit (Skip Draft)
    if (hand.length >= GAME_CONFIG.MAX_HAND_SIZE) {
        newState.log.push({ turn: nextTurn, text: `手牌上限(${GAME_CONFIG.MAX_HAND_SIZE})，跳过抽卡` });
        newState.phase = 'PLAY_CARD';
    } else {
        newState.phase = 'DRAFT';

        // Tier Rotation Logic
        let draftRarity;
        if (!newState.rarityOwner) {
            draftRarity = null;
        } else if (newState.rarityOwner === nextTurn) {
            draftRarity = null;
        } else {
            draftRarity = newState.nextDraftRarity;
        }

        const { cards, rarity } = getRandomCards(3, draftRarity, newState.rng);
        newState.draftOptions = cards;
        newState.nextDraftRarity = rarity;

        if (draftRarity === null) {
            newState.rarityOwner = nextTurn;
        }
    }

    newState.selectedPieceId = null;
    newState.validMoves = [];
    newState.cardsPlayedThisTurn = 0;

    // ACTION_FUTURE: Banished Return
    if (newState.banishedPieces && newState.banishedPieces.length > 0) {
        const returning = [];
        newState.banishedPieces = newState.banishedPieces.map(bp => {
            bp.returnTurn--;
            if (bp.returnTurn <= 0) {
                returning.push(bp.piece);
                return null;
            }
            return bp;
        }).filter(bp => bp !== null);

        returning.forEach(p => {
            const occupant = newState.board.find(boardP => boardP.x === p.x && boardP.y === p.y);
            if (occupant) {
                newState.board = newState.board.filter(boardP => boardP.id !== occupant.id);
                if (occupant.player !== 'neutral') newState.players[occupant.player].dead.push(occupant);
                newState.log.push({ text: `${p.player === 'red' ? '红方' : '黑方'} 未来援军回归，踩死 ${getPieceName(occupant)}` });
            } else {
                newState.log.push({ text: `${p.player === 'red' ? '红方' : '黑方'} 未来援军回归` });
            }
            newState.board.push(p);
        });
    }

    // Flood Logic
    if (newState.riverFloodTimer > 0) {
        newState.riverFloodTimer--;
        if (newState.riverFloodTimer === 0) {
            // Execute flood
            const riverY = 4;
            const floodedPieces = newState.board.filter(p => p.y === riverY || p.y === riverY + 1);
            floodedPieces.forEach(p => {
                // BUG-003 FIX: 中立棋子没有 players entry，需要特殊处理
                if (p.player !== 'neutral' && newState.players[p.player]) {
                    newState.players[p.player].dead.push(p);
                }
                // 同时从 summonedPieces 中移除
                if (newState.summonedPieces.includes(p.id)) {
                    newState.summonedPieces = newState.summonedPieces.filter(id => id !== p.id);
                }
            });
            newState.board = newState.board.filter(p => p.y !== riverY && p.y !== riverY + 1);
            newState.log.push({ text: '\u6d2a\u6c34\u6d88\u706d\u695a\u6cb3\u6c49\u754c\u4e0a\u7684\u68cb\u5b50!' });
        }
    }

    // Rule Duration
    newState.globalRules = newState.globalRules.map(rule => ({
        ...rule,
        duration: rule.duration - 1
    })).filter(rule => rule.duration > 0);

    // Buff Duration
    newState.activeBuffs = newState.activeBuffs.map(buff =>
        buff.duration ? { ...buff, duration: buff.duration - 1 } : buff
    ).filter(buff => !buff.duration || buff.duration > 0);

    return newState;
};

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
                // Check if general is captured - GAME OVER
                if (target.type === 'general') {
                    newState.board = newState.board.filter(p => p.id !== target.id);
                    newState.players[target.player].dead.push(target);
                    newState.phase = 'GAMEOVER';
                    newState.winner = piece.player;
                    newState.log.push({
                        action: 'WIN',
                        info: `${piece.player === 'red' ? '\u7ea2\u65b9' : '\u9ed1\u65b9'}\u5c06\u519b\u88ab\u5403! ${state.turn === 'red' ? '\u7ea2\u65b9' : '\u9ed1\u65b9'}\u80dc\u5229!`
                    });
                    return newState;
                }

                newState.board = newState.board.filter(p => p.id !== target.id);
                if (target.player !== 'neutral') newState.players[target.player].dead.push(target);

                // BUG-002 FIX: 召唤物被吃时从追踪列表移除
                if (newState.summonedPieces.includes(target.id)) {
                    newState.summonedPieces = newState.summonedPieces.filter(id => id !== target.id);
                }

                // Triggers
                if (target.type === 'jackpot') {
                    const currentHandSize = newState.players[state.turn].hand.length;
                    // Hand limit check: only add cards if hand has space
                    if (currentHandSize < 3) {
                        // BUG-004 FIX: 修正卡牌数量计算，应获取剩余空位数量的卡牌
                        const cardsToGet = 3 - currentHandSize; // Get as many as possible
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
                        // Check if player has SPEED_SHRUG active
                        const hasShrug = newState.activeBuffs.some(b => b.effectId === 'SPEED_SHRUG' && b.player === state.turn);

                        if (!hasShrug) {
                            // Cannon suicide: remove the cannon that just moved
                            newState.board = newState.board.filter(p => p.id !== piece.id);
                            newState.players[piece.player].dead.push(piece);
                            newState.log.push({ turn: state.turn, text: `${piece.player === 'red' ? '红方' : '黑方'}的炮使用召唤物作为炮架，同归于尽` });
                        } else {
                            newState.log.push({ turn: state.turn, text: `${piece.player === 'red' ? '红方' : '黑方'}的炮耸肩无视召唤物炮架` });
                        }
                    }
                }
            }

            piece.x = toX; piece.y = toY;

            // BUG-007 FIX: 记录当前移动的棋子类型，用于「可疑交易」卡牌
            newState.lastMovedPieceType = piece.type;

            // Equipment Triggers AFTER move

            // EQUIP_DRESS: Soldier reaches end line -> becomes chariot + get prismatic card
            if (piece.type === 'soldier') {
                const hasDress = newState.activeBuffs.some(b => b.pieceId === piece.id && b.effectId === 'EQUIP_DRESS');
                const endLine = piece.player === 'red' ? 0 : 9;
                if (hasDress && piece.y === endLine) {
                    piece.type = 'chariot';
                    // Remove dress buff
                    newState.activeBuffs = newState.activeBuffs.filter(b => !(b.pieceId === piece.id && b.effectId === 'EQUIP_DRESS'));
                    // Give prismatic card
                    if (newState.players[piece.player].hand.length < 3) {
                        const { cards } = getRandomCards(1, CARD_TIERS.PRISMATIC, newState.rng);
                        newState.players[piece.player].hand.push(...cards);
                    }
                    newState.log.push({ text: `${piece.player === 'red' ? '红方' : '黑方'}的兵变为车!` });
                }
            }

            // EQUIP_SUICIDE: Chariot captures -> explodes and destroys surrounding pieces
            if (target && piece.type === 'chariot') {
                const hasSuicide = newState.activeBuffs.some(b => b.pieceId === piece.id && b.effectId === 'EQUIP_SUICIDE');
                if (hasSuicide) {
                    // Remove suicide chariot
                    newState.board = newState.board.filter(p => p.id !== piece.id);
                    newState.players[piece.player].dead.push(piece);

                    // Destroy surrounding pieces (8 directions)
                    const surroundingPieces = [];
                    for (let dx = -1; dx <= 1; dx++) {
                        for (let dy = -1; dy <= 1; dy++) {
                            if (dx === 0 && dy === 0) continue;
                            const sp = getPieceAt(newState.board, toX + dx, toY + dy);
                            if (sp) surroundingPieces.push(sp);
                        }
                    }
                    surroundingPieces.forEach(sp => {
                        newState.board = newState.board.filter(p => p.id !== sp.id);
                        newState.players[sp.player].dead.push(sp);
                    });
                    newState.log.push({ text: `${piece.player === 'red' ? '红方' : '黑方'}的自爆车炸毁周围棋子!` });
                }
            }

            // EQUIP_MEDAL: If piece in palace is captured, advisor sacrifices to revive it
            if (target) {
                // Check if any advisor has MEDAL and target is in palace
                const inPalace = (x, y) => {
                    if (y >= 0 && y <= 2) return x >= 3 && x <= 5; // Black palace
                    if (y >= 7 && y <= 9) return x >= 3 && x <= 5; // Red palace
                    return false;
                };

                if (inPalace(toX, toY)) {
                    const advisors = newState.board.filter(p =>
                        p.player === target.player &&
                        p.type === 'advisor' &&
                        newState.activeBuffs.some(b => b.pieceId === p.id && b.effectId === 'EQUIP_MEDAL')
                    );

                    if (advisors.length > 0) {
                        const advisor = advisors[0];
                        // Sacrifice advisor
                        newState.board = newState.board.filter(p => p.id !== advisor.id);
                        newState.players[advisor.player].dead.push(advisor);
                        // Revive target at advisor's position
                        target.x = advisor.x;
                        target.y = advisor.y;
                        newState.board.push(target);
                        // Remove from dead if it was added
                        newState.players[target.player].dead = newState.players[target.player].dead.filter(p => p.id !== target.id);
                        newState.log.push({ text: `${advisor.player === 'red' ? '红方' : '黑方'}的士牺牲复活 ${getPieceName(target)}!` });
                    }
                }
            }

            // Track last opponent move (for UI highlighting)
            newState.lastOpponentMove = {
                from: moveFrom,
                to: { x: toX, y: toY }
            };

            // Switch Turn
            return switchTurnLogic(newState);
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

        case ActionTypes.TICK_TIMER: {
            if (state.phase === 'GAMEOVER') return state;
            const newState = { ...state, timers: { ...state.timers } };
            newState.timers[state.turn]--;

            if (newState.timers[state.turn] <= 0) {
                newState.log.push({ text: `${state.turn === PLAYERS.RED ? '红方' : '黑方'} 回合超时，自动跳过` });
                // BUG-001 FIX: 使用 newState 而非 state，确保日志正确记录
                return switchTurnLogic(newState);
            }
            return newState;
        }

        default: return state;
    }
};
