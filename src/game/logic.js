import { PIECE_TYPES, PLAYERS } from './constants';

// Helper: Check if a position is within the board
const isValidPos = (x, y) => x >= 0 && x < 9 && y >= 0 && y < 10;

// Helper: Check if a position is inside the "Palace" (3x3 area)
const isInPalace = (x, y, player) => {
    if (x < 3 || x > 5) return false;
    if (player === PLAYERS.BLACK) return y >= 0 && y <= 2;
    if (player === PLAYERS.RED) return y >= 7 && y <= 9;
    return false;
};

// Returns true if the move causes the player's general to be captured (Face-to-Face flying general rule is handled separately usually, but basic self-check is here)
// Actually, for performance, we usually generate pseudo-moves first.
// For this function, we just return the RAW legal moves according to piece movement physics.
// We do NOT check for "Suicide" (moving into check) here yet to avoid infinite recursion. that logic goes in engine.

export const getPieceMoves = (piece, board) => {
    const { type, player, x, y } = piece;
    const moves = [];

    // Helper to add move if target is empty or enemy
    const addIfValid = (tx, ty) => {
        if (!isValidPos(tx, ty)) return false;
        const target = board.find(p => p.x === tx && p.y === ty);
        if (!target) {
            moves.push({ x: tx, y: ty });
            return true; // Empty
        } else if (target.player !== player) {
            moves.push({ x: tx, y: ty });
            return false; // Enemy (blocked after capture)
        }
        return false; // Blocked by friend
    };

    switch (type) {
        case PIECE_TYPES.SOLDIER: {
            // Forward
            const dir = player === PLAYERS.BLACK ? 1 : -1;
            addIfValid(x, y + dir);

            // Horizontal (only after crossing river)
            const crossedRiver = player === PLAYERS.BLACK ? y >= 5 : y <= 4;
            if (crossedRiver) {
                addIfValid(x - 1, y);
                addIfValid(x + 1, y);
            }
            break;
        }

        case PIECE_TYPES.CANNON: {
            const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
            dirs.forEach(([dx, dy]) => {
                let hasPlatform = false;
                for (let i = 1; i < 10; i++) {
                    const tx = x + dx * i;
                    const ty = y + dy * i;
                    if (!isValidPos(tx, ty)) break;

                    const target = board.find(p => p.x === tx && p.y === ty);
                    if (!target) {
                        if (!hasPlatform) moves.push({ x: tx, y: ty });
                    } else {
                        if (!hasPlatform) {
                            hasPlatform = true; // Found the "platform" (cannon mount)
                        } else {
                            if (target.player !== player) moves.push({ x: tx, y: ty }); // Capture
                            break; // Can't jump over two pieces
                        }
                    }
                }
            });
            break;
        }

        case PIECE_TYPES.CHARIOT: {
            const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
            dirs.forEach(([dx, dy]) => {
                for (let i = 1; i < 10; i++) {
                    const tx = x + dx * i;
                    const ty = y + dy * i;
                    if (!isValidPos(tx, ty)) break;

                    const target = board.find(p => p.x === tx && p.y === ty);
                    if (!target) {
                        moves.push({ x: tx, y: ty });
                    } else {
                        if (target.player !== player) moves.push({ x: tx, y: ty });
                        break; // Blocked
                    }
                }
            });
            break;
        }

        case PIECE_TYPES.HORSE: {
            const knightMoves = [
                { dx: 1, dy: 2, lx: 0, ly: 1 }, { dx: 1, dy: -2, lx: 0, ly: -1 },
                { dx: -1, dy: 2, lx: 0, ly: 1 }, { dx: -1, dy: -2, lx: 0, ly: -1 },
                { dx: 2, dy: 1, lx: 1, ly: 0 }, { dx: 2, dy: -1, lx: 1, ly: 0 },
                { dx: -2, dy: 1, lx: -1, ly: 0 }, { dx: -2, dy: -1, lx: -1, ly: 0 }
            ];
            knightMoves.forEach(({ dx, dy, lx, ly }) => {
                const legX = x + lx;
                const legY = y + ly;
                const legObstructed = board.some(p => p.x === legX && p.y === legY);
                if (!legObstructed) {
                    addIfValid(x + dx, y + dy);
                }
            });
            break;
        }

        case PIECE_TYPES.ELEPHANT: {
            const elephantMoves = [
                { dx: 2, dy: 2, lx: 1, ly: 1 }, { dx: 2, dy: -2, lx: 1, ly: -1 },
                { dx: -2, dy: 2, lx: -1, ly: 1 }, { dx: -2, dy: -2, lx: -1, ly: -1 }
            ];
            elephantMoves.forEach(({ dx, dy, lx, ly }) => {
                const tx = x + dx;
                const ty = y + dy;
                // Elephant cannot cross river
                const riverCrossed = player === PLAYERS.BLACK ? ty >= 5 : ty <= 4;
                if (riverCrossed) return;

                const dateXY = board.some(p => p.x === x + lx && p.y === y + ly); // "Elephant Eye"
                if (!dateXY) {
                    addIfValid(tx, ty);
                }
            });
            break;
        }

        case PIECE_TYPES.ADVISOR: {
            const advisorMoves = [
                { dx: 1, dy: 1 }, { dx: 1, dy: -1 },
                { dx: -1, dy: 1 }, { dx: -1, dy: -1 }
            ];
            advisorMoves.forEach(({ dx, dy }) => {
                const tx = x + dx;
                const ty = y + dy;
                if (isInPalace(tx, ty, player)) {
                    addIfValid(tx, ty);
                }
            });
            break;
        }

        case PIECE_TYPES.GENERAL: {
            const generalMoves = [
                { dx: 0, dy: 1 }, { dx: 0, dy: -1 },
                { dx: 1, dy: 0 }, { dx: -1, dy: 0 }
            ];
            generalMoves.forEach(({ dx, dy }) => {
                const tx = x + dx;
                const ty = y + dy;
                if (isInPalace(tx, ty, player)) {
                    addIfValid(tx, ty);
                }
            });

            // "Flying General": Check if facing enemy general directly with no blockers
            // This is usually a special check, but we can add it as a valid "Move" if it captures.
            // But standard rule says: "Cannot be on same file without blockers".
            // It implies a passive rule (Move is ILLEGAL if it reveals General).
            // It DOES NOT mean General can fly to capture unless it's a move.
            // Wait, standard rule: If Generals see each other, the one moving to "Execute" is a valid move?
            // Actually, in Xiangqi, you simply CANNOT make a move that leaves Generals facing each other.
            // But the "Flying General" kill is a valid move in some variations or just a "suicide check".
            // Let's stick to standard: "A move is illegal if Generals face each other". 
            // So this piece generator doesn't need to generate "Fly", but the VALIDATOR needs to block moves that expose General.
            break;
        }
    }
    return moves;
};
