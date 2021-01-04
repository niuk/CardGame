import * as Lib from './lib';
import * as Animation from './animation';
import * as CardImages from './card-images';
import Vector from './vector';

// the most recently received game state, if any
export let gameState: Lib.GameState | undefined = undefined;
// keep copies of the previous game state around for bookkeeping purposes
let previousGameState: Lib.GameState | undefined = undefined;

// indices of cards for drag & drop
// IMPORTANT: this array must always be sorted!
// Always use binarySearch to insert and delete or sort after manipulation
export const selectedIndices: number[] = [];

// associative arrays, one for each player at their player index
// each Anim.Card corresponds to a visible Lib.Card by index
export let animations: Animation.Card[][] | undefined;
// animation states are always constructed using the previous animation states for continuity
let previousAnimations: Animation.Card[][] | undefined;

// open websocket connection to get game state updates
let ws = new WebSocket(`wss://${window.location.hostname}/`);

let wsMessageCallback: ((result: Lib.ErrorMessage | Lib.GameState) => void) | null = null;

ws.onmessage = ev => {
    const obj = JSON.parse(ev.data);
    if ('errorDescription' in obj) {
        if (wsMessageCallback !== null) { 
            wsMessageCallback(<Lib.ErrorMessage>obj);
            wsMessageCallback = null;
        }
    } else {
        gameState = <Lib.GameState>obj;
        if (gameState === undefined) {
            throw new Error(`bad game state: ${ev.data}`);
        }

        previousGameState = gameState;
        if (previousGameState !== undefined) {
            // selected indices might have shifted
            for (let i = 0; i < selectedIndices.length; ++i) {
                if (gameState.playerCards[selectedIndices[i]] !== previousGameState.playerCards[selectedIndices[i]]) {
                    let found = false;
                    for (let j = 0; j < gameState.playerCards.length; ++j) {
                        if (gameState.playerCards[j] === previousGameState.playerCards[selectedIndices[i]]) {
                            selectedIndices[i] = j;
                            found = true;
                            break;
                        }
                    }

                    if (!found) { 
                        selectedIndices.splice(i, 1);
                        --i;
                    }
                }
            }

            // binary search still needs to work
            selectedIndices.sort();
        }

        // initialize animation states
        associateAnimationsWithCards(gameState, previousGameState);

        if (wsMessageCallback !== null) {
            wsMessageCallback(gameState);
            wsMessageCallback = null;
        }
    }
};

function associateAnimationsWithCards(gameState: Lib.GameState, previousGameState: Lib.GameState) {
    animations = [];
    if (previousAnimations === undefined) {
        previousAnimations = [];
    }

    for (let i = 0; i < 4; ++i) {
        let cards: Lib.Card[];
        let previousCards: Lib.Card[];
        if (i == gameState.playerIndex) {
            cards = gameState.playerCards;
            previousCards = previousGameState.playerCards;
        } else {
            const otherPlayer = gameState.otherPlayers[i];
            if (otherPlayer !== undefined) {
                cards = otherPlayer.revealedCards;
            } else {
                cards = [];
            }

            const previousOtherPlayer = previousGameState.otherPlayers[i];
            if (previousOtherPlayer !== undefined) {
                previousCards = previousOtherPlayer.revealedCards;
            } else {
                previousCards = [];
            }
        }

        animations[i] = [];
        if (previousAnimations[i] === undefined) {
            previousAnimations[i] = [];
        }

        for (let j = 0; j < cards.length; ++j) {
            let found = false;
            for (let k = 0; k < previousCards.length; ++k) {
                if (cards[j] === previousCards[k]) {
                    animations[i][j] = previousAnimations[i][k];
                    found = true;
                    break;
                }
            }

            // TODO: use revealedCount and deckCount to determine initial position
            if (!found) {
                animations[i][j] = new Animation.Card(
                    CardImages.get(cards[j]),
                    new Vector(0, 0),
                    new Vector(0, 0),
                    new Vector(0, 0)
                );
            }
        }
    }
}

export async function joinGame(gameId: string, playerName: string) {
    // wait for connection
    while (ws.readyState != WebSocket.OPEN) {
        await Lib.delay(1000);
        console.log(`ws.readyState: ${ws.readyState}`);
    }

    // try to join the game
    const result = await new Promise<Lib.ErrorMessage | Lib.GameState>(resolve => {
        wsMessageCallback = resolve;
        ws.send(JSON.stringify(<Lib.JoinMessage>{
            gameId: gameId,
            playerName: playerName
        }));
    });
    
    if ('errorDescription' in result) {
        window.alert(result.errorDescription);
        throw new Error(result.errorDescription);
    }
}

export function drawCard() {
    return new Promise<Lib.ErrorMessage | Lib.GameState>(resolve => {
        wsMessageCallback = resolve;

        ws.send(JSON.stringify(<Lib.DrawMessage>{
            draw: null
        }));
    });
}

export function returnCards(gameState: Lib.GameState) {
    return new Promise<Lib.ErrorMessage | Lib.GameState>(resolve => {
        wsMessageCallback = resolve;

        ws.send(JSON.stringify(<Lib.ReturnMessage>{
            cardsToReturn: selectedIndices.map(i => gameState.playerCards[i])
        }));
    })
}

export function reorderCards(gameState: Lib.GameState) {
    return new Promise<Lib.ErrorMessage | Lib.GameState>(resolve => {
        wsMessageCallback = resolve;

        ws.send(JSON.stringify(<Lib.ReorderMessage>{
            cards: gameState.playerCards,
            revealCount: gameState.playerRevealCount
        }));
    })
}

export function sortBySuit(gameState: Lib.GameState) {
    let compareFn = (a: number, b: number) => {
        if (Lib.getSuit(a) === Lib.getSuit(b)) {
            return Lib.getRank(a) - Lib.getRank(b);
        } else {
            return Lib.getSuit(a) - Lib.getSuit(b);
        }
    };

    sortCards(gameState.playerCards, 0, gameState.playerRevealCount, compareFn);
    sortCards(gameState.playerCards, gameState.playerRevealCount, gameState.playerCards.length, compareFn);
    return reorderCards(gameState);
}

export function sortByRank(gameState: Lib.GameState) {
    let compareFn = (a: number, b: number) => {
        if (Lib.getRank(a) === Lib.getRank(b)) {
            return Lib.getSuit(a) - Lib.getSuit(b);
        } else {
            return Lib.getRank(a) - Lib.getRank(b);
        }
    };

    previousGameState = <Lib.GameState>JSON.parse(JSON.stringify(gameState));
    sortCards(gameState.playerCards, 0, gameState.playerRevealCount, compareFn);
    sortCards(gameState.playerCards, gameState.playerRevealCount, gameState.playerCards.length, compareFn);
    associateAnimationsWithCards(gameState, previousGameState);
    return reorderCards(gameState);
}

function sortCards(
    cards: Lib.Card[],
    start: number,
    end: number,
    compareFn: (a: number, b: number) => number
) {
    cards.splice(start, end - start, ...cards.slice(start, end).sort(compareFn));
}
