import * as Lib from './lib';
import * as CardImages from './card-images';
import Sprite from './sprite';

const playerNameFromCookie = Lib.getCookie('playerName');
if (playerNameFromCookie === undefined) throw new Error('No player name!');
export const playerName = playerNameFromCookie;

const gameIdFromCookie = Lib.getCookie('gameId');
if (gameIdFromCookie === undefined) throw new Error('No game id!');
export const gameId = gameIdFromCookie;

// we need to keep a copy of the previous game state around for bookkeeping purposes
export let previousGameState: Lib.GameState | undefined;
// the most recently received game state, if any
export let gameState: Lib.GameState | undefined;

// indices of cards for drag & drop
// IMPORTANT: this array must always be sorted!
// Always use binarySearch to insert and delete or sort after manipulation
export const selectedIndices: number[] = [];

// for animating the deck
export let deckSprites: Sprite[] = [];

// associative arrays, one for each player at their player index
// each element corresponds to a face-down card by index
export let backSpritesForPlayer: Sprite[][] = [];

// each element corresponds to a face-up card by index
// face sprites are constructed using the previous face sprites to maintain continuity
let previousFaceSpritesForPlayer: Sprite[][] = [];
export let faceSpritesForPlayer: Sprite[][] = [];

// open websocket connection to get game state updates
let ws = new WebSocket(`wss://${window.location.hostname}/`);

let wsMessageCallback: ((result: Lib.ErrorMessage | Lib.GameState) => void) | null = null;

ws.onmessage = e => {
    const obj = JSON.parse(e.data);
    if ('errorDescription' in obj) {
        if (wsMessageCallback !== null) { 
            wsMessageCallback(<Lib.ErrorMessage>obj);
            wsMessageCallback = null;
        }
    } else {
        previousGameState = gameState;
        gameState = <Lib.GameState>obj;

        // selected indices might have shifted
        for (let i = 0; i < selectedIndices.length; ++i) {
            const selectedIndex = selectedIndices[i];
            if (selectedIndex === undefined) throw new Error();

            if (gameState.playerCards[selectedIndex] !== previousGameState?.playerCards[selectedIndex]) {
                let found = false;
                for (let j = 0; j < gameState.playerCards.length; ++j) {
                    if (gameState.playerCards[j] === previousGameState?.playerCards[selectedIndex]) {
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

        // initialize animation states
        associateAnimationsWithCards(previousGameState, gameState);

        if (wsMessageCallback !== null) {
            wsMessageCallback(gameState);
            wsMessageCallback = null;
        }
    }
};

export async function joinGame(gameId: string, playerName: string) {
    // wait for connection
    while (ws.readyState != WebSocket.OPEN) {
        await Lib.delay(1000);
        console.log(`ws.readyState: ${ws.readyState}`);
    }

    // try to join the game
    const result = await new Promise<Lib.ErrorMessage | Lib.GameState>(resolve => {
        wsMessageCallback = resolve;
        ws.send(JSON.stringify(<Lib.JoinMessage>{ gameId, playerName }));
    });
    
    if ('errorDescription' in result) {
        window.alert(result.errorDescription);
        throw new Error(result.errorDescription);
    }
}

function associateAnimationsWithCards(previousGameState: Lib.GameState | undefined, gameState: Lib.GameState) {
    deckSprites = [];
    for (let i = 0; i < gameState.deckCount; ++i) {
        deckSprites[i] = new Sprite(CardImages.get('Back0'));
    }

    backSpritesForPlayer = [];

    previousFaceSpritesForPlayer = faceSpritesForPlayer;
    faceSpritesForPlayer = [];

    for (let i = 0; i < 4; ++i) {
        let previousFaceCards: Lib.Card[];
        let faceCards: Lib.Card[];

        let backSprites: Sprite[] = [];
        backSpritesForPlayer[i] = backSprites;
        if (i == gameState.playerIndex) {
            previousFaceCards = previousGameState?.playerCards ?? [];
            faceCards = gameState.playerCards;
        } else {
            let previousOtherPlayer = previousGameState?.otherPlayers[i];
            let otherPlayer = gameState.otherPlayers[i];

            previousFaceCards = previousOtherPlayer?.revealedCards ?? [];  
            faceCards = otherPlayer?.revealedCards ?? [];

            for (let j = 0; j < (otherPlayer?.cardCount ?? 0) - (otherPlayer?.revealedCards?.length ?? 0); ++j) {
                backSprites[j] = new Sprite(CardImages.get(`Back${i}`));
            }
        }

        let previousFaceSprites: Sprite[] = previousFaceSpritesForPlayer[i] ?? [];
        let faceSprites: Sprite[] = [];
        faceSpritesForPlayer[i] = faceSprites;
        for (let j = 0; j < faceCards.length; ++j) {
            let found = false;
            for (let k = 0; k < previousFaceCards.length; ++k) {
                if (faceCards[j] === previousFaceCards[k]) {
                    const previousFaceSprite = previousFaceSprites[k];
                    if (previousFaceSprite === undefined) throw new Error();
                    faceSprites[j] = previousFaceSprite;
                    found = true;
                    break;
                }
            }

            if (!found) {
                const faceCard = faceCards[j];
                if (faceCard === undefined) throw new Error();
                faceSprites[j] = new Sprite(CardImages.get(Lib.cardToString(faceCard)));
            }
        }
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
