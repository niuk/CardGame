var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
define(["require", "exports", "../lib", "./card-images", "./sprite"], function (require, exports, Lib, CardImages, sprite_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.sortByRank = exports.sortBySuit = exports.reorderCards = exports.returnCards = exports.drawCard = exports.joinGame = exports.faceSpritesForPlayer = exports.backSpritesForPlayer = exports.deckSprites = exports.selectedIndices = exports.gameState = exports.previousGameState = exports.gameId = exports.playerName = void 0;
    Lib = __importStar(Lib);
    CardImages = __importStar(CardImages);
    sprite_1 = __importDefault(sprite_1);
    const playerNameFromCookie = Lib.getCookie('playerName');
    if (playerNameFromCookie === undefined)
        throw new Error('No player name!');
    exports.playerName = playerNameFromCookie;
    const gameIdFromCookie = Lib.getCookie('gameId');
    if (gameIdFromCookie === undefined)
        throw new Error('No game id!');
    exports.gameId = gameIdFromCookie;
    // indices of cards for drag & drop
    // IMPORTANT: this array must always be sorted!
    // Always use binarySearch to insert and delete or sort after manipulation
    exports.selectedIndices = [];
    // for animating the deck
    exports.deckSprites = [];
    // associative arrays, one for each player at their player index
    // each element corresponds to a face-down card by index
    exports.backSpritesForPlayer = [];
    // each element corresponds to a face-up card by index
    exports.faceSpritesForPlayer = [];
    // open websocket connection to get game state updates
    let ws = new WebSocket(`wss://${window.location.hostname}/`);
    let wsMessageCallback = null;
    ws.onmessage = e => {
        console.log(e.data);
        const obj = JSON.parse(e.data);
        if ('errorDescription' in obj) {
            if (wsMessageCallback !== null) {
                wsMessageCallback(obj);
                wsMessageCallback = null;
            }
        }
        else {
            exports.previousGameState = exports.gameState;
            exports.gameState = obj;
            // selected indices might have shifted
            for (let i = 0; i < exports.selectedIndices.length; ++i) {
                const selectedIndex = exports.selectedIndices[i];
                if (selectedIndex === undefined)
                    throw new Error();
                if (exports.gameState.playerCards[selectedIndex] !== exports.previousGameState?.playerCards[selectedIndex]) {
                    let found = false;
                    for (let j = 0; j < exports.gameState.playerCards.length; ++j) {
                        if (exports.gameState.playerCards[j] === exports.previousGameState?.playerCards[selectedIndex]) {
                            exports.selectedIndices[i] = j;
                            found = true;
                            break;
                        }
                    }
                    if (!found) {
                        exports.selectedIndices.splice(i, 1);
                        --i;
                    }
                }
            }
            // binary search still needs to work
            exports.selectedIndices.sort();
            // initialize animation states
            associateAnimationsWithCards(exports.previousGameState, exports.gameState);
            if (wsMessageCallback !== null) {
                wsMessageCallback(exports.gameState);
                wsMessageCallback = null;
            }
        }
    };
    async function joinGame(gameId, playerName) {
        // wait for connection
        do {
            await Lib.delay(1000);
            console.log(`ws.readyState: ${ws.readyState}, WebSocket.OPEN: ${WebSocket.OPEN}`);
        } while (ws.readyState != WebSocket.OPEN);
        // try to join the game
        const result = await new Promise(resolve => {
            wsMessageCallback = resolve;
            ws.send(JSON.stringify({ gameId, playerName }));
        });
        if ('errorDescription' in result) {
            window.alert(result.errorDescription);
            throw new Error(result.errorDescription);
        }
    }
    exports.joinGame = joinGame;
    function associateAnimationsWithCards(previousGameState, gameState) {
        exports.deckSprites.splice(gameState.deckCount, exports.deckSprites.length - gameState.deckCount);
        for (let i = exports.deckSprites.length; i < gameState.deckCount; ++i) {
            exports.deckSprites[i] = new sprite_1.default(CardImages.get('Back0'));
        }
        const previousBackSpritesForPlayer = exports.backSpritesForPlayer;
        exports.backSpritesForPlayer = [];
        // reuse previous face sprites as much as possible to maintain continuity
        const previousFaceSpritesForPlayer = exports.faceSpritesForPlayer;
        exports.faceSpritesForPlayer = [];
        for (let i = 0; i < 4; ++i) {
            let previousFaceCards;
            let faceCards;
            let previousBackSprites = previousBackSpritesForPlayer[i] ?? [];
            let backSprites = [];
            exports.backSpritesForPlayer[i] = backSprites;
            if (i == gameState.playerIndex) {
                previousFaceCards = previousGameState?.playerCards ?? [];
                faceCards = gameState.playerCards;
            }
            else {
                let previousOtherPlayer = previousGameState?.otherPlayers[i];
                let otherPlayer = gameState.otherPlayers[i];
                previousFaceCards = previousOtherPlayer?.revealedCards ?? [];
                faceCards = otherPlayer?.revealedCards ?? [];
                for (let j = 0; j < (otherPlayer?.cardCount ?? 0) - (otherPlayer?.revealedCards?.length ?? 0); ++j) {
                    backSprites[j] = new sprite_1.default(CardImages.get(`Back${i}`));
                }
            }
            let previousFaceSprites = previousFaceSpritesForPlayer[i] ?? [];
            let faceSprites = [];
            exports.faceSpritesForPlayer[i] = faceSprites;
            for (let j = 0; j < faceCards.length; ++j) {
                let found = false;
                for (let k = 0; k < previousFaceCards.length; ++k) {
                    if (faceCards[j] === previousFaceCards[k]) {
                        const previousFaceSprite = previousFaceSprites[k];
                        if (previousFaceSprite === undefined)
                            throw new Error();
                        faceSprites[j] = previousFaceSprite;
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    const faceCard = faceCards[j];
                    if (faceCard === undefined)
                        throw new Error();
                    faceSprites[j] = new sprite_1.default(CardImages.get(Lib.cardToString(faceCard)));
                }
            }
        }
    }
    function drawCard() {
        return new Promise(resolve => {
            wsMessageCallback = resolve;
            ws.send(JSON.stringify({
                draw: null
            }));
        });
    }
    exports.drawCard = drawCard;
    function returnCards(gameState) {
        return new Promise(resolve => {
            wsMessageCallback = resolve;
            ws.send(JSON.stringify({
                cardsToReturn: exports.selectedIndices.map(i => gameState.playerCards[i])
            }));
        });
    }
    exports.returnCards = returnCards;
    function reorderCards(gameState) {
        return new Promise(resolve => {
            wsMessageCallback = resolve;
            ws.send(JSON.stringify({
                cards: gameState.playerCards,
                revealCount: gameState.playerRevealCount
            }));
        });
    }
    exports.reorderCards = reorderCards;
    function sortBySuit(gameState) {
        let compareFn = (a, b) => {
            if (Lib.getSuit(a) === Lib.getSuit(b)) {
                return Lib.getRank(a) - Lib.getRank(b);
            }
            else {
                return Lib.getSuit(a) - Lib.getSuit(b);
            }
        };
        sortCards(gameState.playerCards, 0, gameState.playerRevealCount, compareFn);
        sortCards(gameState.playerCards, gameState.playerRevealCount, gameState.playerCards.length, compareFn);
        return reorderCards(gameState);
    }
    exports.sortBySuit = sortBySuit;
    function sortByRank(gameState) {
        let compareFn = (a, b) => {
            if (Lib.getRank(a) === Lib.getRank(b)) {
                return Lib.getSuit(a) - Lib.getSuit(b);
            }
            else {
                return Lib.getRank(a) - Lib.getRank(b);
            }
        };
        exports.previousGameState = JSON.parse(JSON.stringify(gameState));
        sortCards(gameState.playerCards, 0, gameState.playerRevealCount, compareFn);
        sortCards(gameState.playerCards, gameState.playerRevealCount, gameState.playerCards.length, compareFn);
        associateAnimationsWithCards(gameState, exports.previousGameState);
        return reorderCards(gameState);
    }
    exports.sortByRank = sortByRank;
    function sortCards(cards, start, end, compareFn) {
        cards.splice(start, end - start, ...cards.slice(start, end).sort(compareFn));
    }
});
