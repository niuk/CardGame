import { Mutex } from 'await-semaphore';

import * as Lib from '../lib';
import * as CardImages from './card-images';
import Sprite from './sprite';

const playerNameFromCookie = Lib.getCookie('playerName');
if (playerNameFromCookie === undefined) throw new Error('No player name!');
export const playerName = playerNameFromCookie;

const gameIdFromCookie = Lib.getCookie('gameId');
if (gameIdFromCookie === undefined) throw new Error('No game id!');
export const gameId = gameIdFromCookie;

// some state-manipulating operations are asynchronous, so we need to guard against races
const stateMutex = new Mutex();
export async function lock(): Promise<() => void> {
    //console.log(`acquiring state lock...\n${new Error().stack}`);
    const release = await stateMutex.acquire();
    //console.log(`acquired state lock\n${new Error().stack}`);
    return () => {
        release();
        //console.log(`released state lock`);
    };
}

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
export let faceSpritesForPlayer: Sprite[][] = [];

// open websocket connection to get game state updates
let ws = new WebSocket(`wss://${window.location.hostname}/`);

const callbacksForMethodName = new Map<string, ((result: Lib.MethodResult) => void)[]>();

function addCallback(methodName: string, callback: (result: Lib.MethodResult) => void) {
    console.log(`adding callback for method '${methodName}'`);

    let callbacks = callbacksForMethodName.get(methodName);
    if (callbacks === undefined) {
        callbacks = [];
        callbacksForMethodName.set(methodName, callbacks);
    }

    callbacks.push(result => {
        console.log(`invoking callback for method '${methodName}'`);
        callback(result);
    });
}

ws.onmessage = async e => {
    const obj = JSON.parse(e.data);
    if ('methodName' in obj) {
        const returnMessage = <Lib.MethodResult>obj;
        const methodName = returnMessage.methodName;
        const callbacks = callbacksForMethodName.get(methodName);
        if (callbacks === undefined || callbacks.length === 0) {
            throw new Error(`no callbacks found for method: ${methodName}`);
        }

        const callback = callbacks.shift();
        if (callback === undefined) {
            throw new Error(`callback is undefined for method: ${methodName}`);
        }
        
        callback(returnMessage);
    } else if (
        'deckCount' in obj &&
        'activePlayerIndex' in obj &&
        'playerIndex' in obj &&
        'playerCards' in obj &&
        'playerRevealCount' in obj &&
        'otherPlayers' in obj
    ) {
        const unlock = await lock();
        try {
            previousGameState = gameState;
            gameState = <Lib.GameState>obj;

            if (previousGameState !== undefined) {
                console.log(`previousGameState.playerCards: ${JSON.stringify(previousGameState.playerCards)}`);
                console.log(`previous selectedIndices: ${JSON.stringify(selectedIndices)}`);
                console.log(`previous selectedCards: ${JSON.stringify(selectedIndices.map(i => previousGameState?.playerCards[i]))}`);
            }

            // selected indices might have shifted
            for (let i = 0; i < selectedIndices.length; ++i) {
                const selectedIndex = selectedIndices[i];
                if (selectedIndex === undefined) throw new Error();

                if (JSON.stringify(gameState.playerCards[selectedIndex]) !== JSON.stringify(previousGameState?.playerCards[selectedIndex])) {
                    let found = false;
                    for (let j = 0; j < gameState.playerCards.length; ++j) {
                        if (JSON.stringify(gameState.playerCards[j]) === JSON.stringify(previousGameState?.playerCards[selectedIndex])) {
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
            selectedIndices.sort((a, b) => a - b);

            // initialize animation states
            associateAnimationsWithCards(previousGameState, gameState);

            console.log(`gameState.playerCards: ${JSON.stringify(gameState.playerCards)}`);
            console.log(`selectedIndices: ${JSON.stringify(selectedIndices)}`);
            console.log(`selectedCards: ${JSON.stringify(selectedIndices.map(i => gameState?.playerCards[i]))}`);
        } finally {
            unlock();
        }
    } else {
        throw new Error(JSON.stringify(e.data));
    }
};

let onAnimationsAssociated = () => {};

function associateAnimationsWithCards(previousGameState: Lib.GameState | undefined, gameState: Lib.GameState) {
    deckSprites.splice(gameState.deckCount, deckSprites.length - gameState.deckCount);
    for (let i = deckSprites.length; i < gameState.deckCount; ++i) {
        deckSprites[i] = new Sprite(CardImages.get('Back0'));
    }

    const previousBackSpritesForPlayer = backSpritesForPlayer;
    backSpritesForPlayer = [];

    // reuse previous face sprites as much as possible to maintain continuity
    const previousFaceSpritesForPlayer = faceSpritesForPlayer;
    faceSpritesForPlayer = [];

    for (let i = 0; i < 4; ++i) {
        let previousFaceCards: Lib.Card[];
        let faceCards: Lib.Card[];

        let previousBackSprites: Sprite[] = previousBackSpritesForPlayer[i] ?? [];
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
                if (JSON.stringify(faceCards[j]) === JSON.stringify(previousFaceCards[k])) {
                    const previousFaceSprite = previousFaceSprites[k];
                    if (previousFaceSprite === undefined) throw new Error();
                    faceSprites[j] = previousFaceSprite;
                    // remove to avoid associating another sprite with the same card
                    previousFaceSprites.splice(k, 1);
                    previousFaceCards.splice(k, 1);
                    found = true;
                    break;
                }
            }

            if (!found) {
                const faceCard = faceCards[j];
                if (faceCard === undefined) throw new Error();
                faceSprites[j] = new Sprite(CardImages.get(JSON.stringify(faceCard)));
            }
        }
    }

    onAnimationsAssociated();
}

export async function joinGame(gameId: string, playerName: string) {
    // wait for connection
    do {
        await Lib.delay(1000);
        console.log(`ws.readyState: ${ws.readyState}, WebSocket.OPEN: ${WebSocket.OPEN}`);
    } while (ws.readyState != WebSocket.OPEN);

    // try to join the game
    const result = await new Promise<Lib.MethodResult>(resolve => {
        addCallback('joinGame', resolve);
        ws.send(JSON.stringify(<Lib.JoinGameMessage>{ gameId, playerName }));
    });

    if (result.errorDescription !== undefined) {
        window.alert(result.errorDescription);
        throw new Error(result.errorDescription);
    }
}

export function drawCard() {
    return new Promise<Lib.MethodResult>(resolve => {
        addCallback('drawCard', result => {
            if (result.errorDescription !== undefined) {
                resolve(result);
            } else {
                onAnimationsAssociated = () => {
                    onAnimationsAssociated = () => {};
                    resolve(result);
                };
            }
        });

        ws.send(JSON.stringify(<Lib.DrawCardMessage>{
            drawCard: null
        }));
    });
}

export function returnCardsToDeck(gameState: Lib.GameState) {
    return new Promise<Lib.MethodResult>(resolve => {
        addCallback('cardsToReturnToDeck', resolve);
        ws.send(JSON.stringify(<Lib.ReturnCardsToDeckMessage>{
            cardsToReturnToDeck: selectedIndices.map(i => gameState.playerCards[i])
        }));
    });
}

export function reorderCards(gameState: Lib.GameState) {
    return new Promise<Lib.MethodResult>(resolve => {
        addCallback('reorderCards', resolve);
        ws.send(JSON.stringify(<Lib.ReorderCardsMessage>{
            reorderedCards: gameState.playerCards,
            newRevealCount: gameState.playerRevealCount
        }));
    });
}

export function sortBySuit(gameState: Lib.GameState) {
    let compareFn = ([aSuit, aRank]: Lib.Card, [bSuit, bRank]: Lib.Card) => {
        if (aSuit !== bSuit) {
            return aSuit - bSuit;
        } else {
            return aRank - bRank;
        }
    };

    previousGameState = <Lib.GameState>JSON.parse(JSON.stringify(gameState));
    sortCards(gameState.playerCards, 0, gameState.playerRevealCount, compareFn);
    sortCards(gameState.playerCards, gameState.playerRevealCount, gameState.playerCards.length, compareFn);
    associateAnimationsWithCards(gameState, previousGameState);
    return reorderCards(gameState);
}

export function sortByRank(gameState: Lib.GameState) {
    let compareFn = ([aSuit, aRank]: Lib.Card, [bSuit, bRank]: Lib.Card) => {
        if (aRank !== bRank) {
            return aRank - bRank;
        } else {
            return aSuit - bSuit;
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
    compareFn: (a: Lib.Card, b: Lib.Card) => number
) {
    cards.splice(start, end - start, ...cards.slice(start, end).sort(compareFn));
}
