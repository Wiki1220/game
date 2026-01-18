/* PIECE LOGIC */
import { PLAYERS } from './constants';

// checkObstruction helper (generic)
const isObstruction = (x, y, board) => board.some(p => p.x === x && p.y === y);
const getPieceAt = (x, y, board) => board.find(p => p.x === x && p.y === y);

/* Main Move Calculator */
/* Now accepts activeBuffs and globalRules */
export const getPieceMoves = (piece, board, activeBuffs = [], globalRules = {}) => {
    const moves = [];
    const { type, player, x, y } = piece;

    // Directions
    // (Standard logic...)

    const addMove = (tx, ty) => {
        if (tx < 0 || tx > 8 || ty < 0 || ty > 9) return;
        const target = getPieceAt(tx, ty, board);
        if (target && target.player === player) return; // Blocked by friend
        moves.push({ x: tx, y: ty });
    };

    const isRed = player === PLAYERS.RED;

    // Buff Checks
    const ignoreHorseLeg = activeBuffs.includes('IGNORE_HORSE_LEG');
    const trample = globalRules[player] === 'RULE_TRAMPLE';

    switch (type) {
        case 'soldier':
            // Forward
            const dy = isRed ? -1 : 1;
            addMove(x, y + dy);
            // Horizontal if crossed river
            // Red River is y <= 4. Black River is y >= 5.
            const crossedRiver = isRed ? y <= 4 : y >= 5;
            if (crossedRiver) {
                addMove(x - 1, y);
                addMove(x + 1, y);
            }
            break;

        case 'cannon':
        case 'chariot':
            const orths = [[0, 1], [0, -1], [1, 0], [-1, 0]];
            orths.forEach(([dx, dy]) => {
                let dist = 1;
                while (true) {
                    const tx = x + dx * dist;
                    const ty = y + dy * dist;
                    if (tx < 0 || tx > 8 || ty < 0 || ty > 9) break;
                    const target = getPieceAt(tx, ty, board);

                    if (!target) {
                        // Chariot: Move freely. Cannon: Move freely.
                        if (type === 'chariot') moves.push({ x: tx, y: ty });
                        if (type === 'cannon') moves.push({ x: tx, y: ty });
                    } else {
                        // Hit a piece
                        if (type === 'chariot') {
                            // Capture enemy?
                            if (target.player !== player) moves.push({ x: tx, y: ty });
                            break; // Stop
                        }
                        if (type === 'cannon') {
                            // Cannon Jump Screen
                            let jumpDist = dist + 1;
                            while (true) {
                                const jx = x + dx * jumpDist;
                                const jy = y + dy * jumpDist;
                                if (jx < 0 || jx > 8 || jy < 0 || jy > 9) break;
                                const jumpTarget = getPieceAt(jx, jy, board);
                                if (jumpTarget) {
                                    if (jumpTarget.player !== player) moves.push({ x: jx, y: jy }); // Capture
                                    break;
                                }
                                jumpDist++;
                            }
                            break;
                        }
                    }
                    dist++;
                }
            });
            break;

        case 'horse':
            // 8 positions.
            const horseMoves = [
                { dx: 1, dy: -2, lx: 0, ly: -1 }, { dx: -1, dy: -2, lx: 0, ly: -1 },
                { dx: 1, dy: 2, lx: 0, ly: 1 }, { dx: -1, dy: 2, lx: 0, ly: 1 },
                { dx: 2, dy: -1, lx: 1, ly: 0 }, { dx: 2, dy: 1, lx: 1, ly: 0 },
                { dx: -2, dy: -1, lx: -1, ly: 0 }, { dx: -2, dy: 1, lx: -1, ly: 0 }
            ];
            horseMoves.forEach(m => {
                const legX = x + m.lx;
                const legY = y + m.ly;
                const tx = x + m.dx;
                const ty = y + m.dy;

                const isBlocked = isObstruction(legX, legY, board);

                if (!isBlocked || ignoreHorseLeg) {
                    addMove(tx, ty);
                }
            });
            break;

        case 'elephant':
            const eleMoves = [
                { dx: 2, dy: 2, ex: 1, ey: 1 }, { dx: -2, dy: 2, ex: -1, ey: 1 },
                { dx: 2, dy: -2, ex: 1, ey: -1 }, { dx: -2, dy: -2, ex: -1, ey: -1 }
            ];
            eleMoves.forEach(m => {
                const tx = x + m.dx;
                const ty = y + m.dy;
                const eyeX = x + m.ex;
                const eyeY = y + m.ey;

                if (isRed && ty < 5) return; // Cannot cross river
                if (!isRed && ty > 4) return;

                const eyePiece = getPieceAt(eyeX, eyeY, board);
                const isBlocked = !!eyePiece;

                if (!isBlocked) {
                    addMove(tx, ty);
                } else if (trample) {
                    // TRAMPLE RULE: Can move, AND captures the eye piece?
                    // "Eat pieces in its path... (at the eye)".
                    // So, the move is valid. The DESTINATION must also be valid.
                    // But what about the piece at the eye? 
                    // With current engine, 'MOVES' are just (x,y) destinations.
                    // We can't specify "Capture Eye Piece" easily in a simple {x,y} list unless we handle it in MOVE_PIECE logic.
                    // OR: We define the "target" of the move as the destination, and engine logic handles side-effects.
                    // Standard move: overwrites destination.
                    // Trample move: overwrites eye? 
                    // Logic: If Trample is active, allow move even if blocked.
                    addMove(tx, ty);
                    // Actual "Eating" logic needs to be in Engine when resolving move.
                    // We'll mark this complexity for now: "Allows jumping" effectively.
                    // If user specifically said "Eat", we need special handling.
                }
            });
            break;

        case 'advisor':
            const advMoves = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
            advMoves.forEach(([dx, dy]) => {
                const tx = x + dx;
                const ty = y + dy;
                // Palace confinement
                if (tx < 3 || tx > 5) return;
                if (isRed && ty < 7) return;
                if (!isRed && ty > 2) return;
                addMove(tx, ty);
            });
            break;

        case 'general':
            const genMoves = [[0, 1], [0, -1], [1, 0], [-1, 0]];
            genMoves.forEach(([dx, dy]) => {
                const tx = x + dx;
                const ty = y + dy;
                if (tx < 3 || tx > 5) return;
                if (isRed && ty < 7) return;
                if (!isRed && ty > 2) return;
                addMove(tx, ty);
            });
            // Flying General? (Standard rule: Generals cannot face each other)
            // We check this after filtering moves usually, or subtract invalid ones.
            // Basic moves first.
            break;
    }

    return moves;
};
