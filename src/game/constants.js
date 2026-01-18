export const BOARD_WIDTH = 9;
export const BOARD_HEIGHT = 10;

export const PIECE_TYPES = {
    GENERAL: 'general', // Jiang/Shuai
    ADVISOR: 'advisor', // Shi
    ELEPHANT: 'elephant', // Xiang
    HORSE: 'horse', // Ma
    CHARIOT: 'chariot', // Ju
    CANNON: 'cannon', // Pao
    SOLDIER: 'soldier', // Bing/Zu
};

export const PLAYERS = {
    RED: 'red',
    BLACK: 'black',
};

// Standard Xiangqi Board Setup
export const INITIAL_BOARD_SETUP = [
    // Black Side (Top, y=0 to y=4)
    { id: 'b_c1', type: PIECE_TYPES.CHARIOT, player: PLAYERS.BLACK, x: 0, y: 0 },
    { id: 'b_h1', type: PIECE_TYPES.HORSE, player: PLAYERS.BLACK, x: 1, y: 0 },
    { id: 'b_e1', type: PIECE_TYPES.ELEPHANT, player: PLAYERS.BLACK, x: 2, y: 0 },
    { id: 'b_a1', type: PIECE_TYPES.ADVISOR, player: PLAYERS.BLACK, x: 3, y: 0 },
    { id: 'b_g1', type: PIECE_TYPES.GENERAL, player: PLAYERS.BLACK, x: 4, y: 0 },
    { id: 'b_a2', type: PIECE_TYPES.ADVISOR, player: PLAYERS.BLACK, x: 5, y: 0 },
    { id: 'b_e2', type: PIECE_TYPES.ELEPHANT, player: PLAYERS.BLACK, x: 6, y: 0 },
    { id: 'b_h2', type: PIECE_TYPES.HORSE, player: PLAYERS.BLACK, x: 7, y: 0 },
    { id: 'b_c2', type: PIECE_TYPES.CHARIOT, player: PLAYERS.BLACK, x: 8, y: 0 },
    { id: 'b_cn1', type: PIECE_TYPES.CANNON, player: PLAYERS.BLACK, x: 1, y: 2 },
    { id: 'b_cn2', type: PIECE_TYPES.CANNON, player: PLAYERS.BLACK, x: 7, y: 2 },
    { id: 'b_s1', type: PIECE_TYPES.SOLDIER, player: PLAYERS.BLACK, x: 0, y: 3 },
    { id: 'b_s2', type: PIECE_TYPES.SOLDIER, player: PLAYERS.BLACK, x: 2, y: 3 },
    { id: 'b_s3', type: PIECE_TYPES.SOLDIER, player: PLAYERS.BLACK, x: 4, y: 3 },
    { id: 'b_s4', type: PIECE_TYPES.SOLDIER, player: PLAYERS.BLACK, x: 6, y: 3 },
    { id: 'b_s5', type: PIECE_TYPES.SOLDIER, player: PLAYERS.BLACK, x: 8, y: 3 },

    // Red Side (Bottom, y=5 to y=9)
    { id: 'r_c1', type: PIECE_TYPES.CHARIOT, player: PLAYERS.RED, x: 0, y: 9 },
    { id: 'r_h1', type: PIECE_TYPES.HORSE, player: PLAYERS.RED, x: 1, y: 9 },
    { id: 'r_e1', type: PIECE_TYPES.ELEPHANT, player: PLAYERS.RED, x: 2, y: 9 },
    { id: 'r_a1', type: PIECE_TYPES.ADVISOR, player: PLAYERS.RED, x: 3, y: 9 },
    { id: 'r_g1', type: PIECE_TYPES.GENERAL, player: PLAYERS.RED, x: 4, y: 9 },
    { id: 'r_a2', type: PIECE_TYPES.ADVISOR, player: PLAYERS.RED, x: 5, y: 9 },
    { id: 'r_e2', type: PIECE_TYPES.ELEPHANT, player: PLAYERS.RED, x: 6, y: 9 },
    { id: 'r_h2', type: PIECE_TYPES.HORSE, player: PLAYERS.RED, x: 7, y: 9 },
    { id: 'r_c2', type: PIECE_TYPES.CHARIOT, player: PLAYERS.RED, x: 8, y: 9 },
    { id: 'r_cn1', type: PIECE_TYPES.CANNON, player: PLAYERS.RED, x: 1, y: 7 },
    { id: 'r_cn2', type: PIECE_TYPES.CANNON, player: PLAYERS.RED, x: 7, y: 7 },
    { id: 'r_s1', type: PIECE_TYPES.SOLDIER, player: PLAYERS.RED, x: 0, y: 6 },
    { id: 'r_s2', type: PIECE_TYPES.SOLDIER, player: PLAYERS.RED, x: 2, y: 6 },
    { id: 'r_s3', type: PIECE_TYPES.SOLDIER, player: PLAYERS.RED, x: 4, y: 6 },
    { id: 'r_s4', type: PIECE_TYPES.SOLDIER, player: PLAYERS.RED, x: 6, y: 6 },
    { id: 'r_s5', type: PIECE_TYPES.SOLDIER, player: PLAYERS.RED, x: 8, y: 6 },
];

export const PHASES = {
    DRAFT: 'DRAFT',
    PLAY_CARD: 'PLAY_CARD',
    TARGET_SELECTION: 'TARGET_SELECTION', // Added for clarity
    MOVE: 'MOVE',
};
