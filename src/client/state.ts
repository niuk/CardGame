import { Mutex } from 'await-semaphore';

import * as Lib from '../lib';
import * as VP from './view-params';
import Sprite from './sprite';
import Vector from './vector';

const playerNameFromCookie = Lib.getCookie('playerName');
if (playerNameFromCookie === undefined) throw new Error('No player name!');
export const playerName = decodeURI(playerNameFromCookie);

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

const callbacksForMethodName = new Map<Lib.MethodName, ((result: Lib.MethodResult) => void)[]>();
function addCallback(methodName: Lib.MethodName, resolve: () => void, reject: (reason: any) => void) {
    console.log(`adding callback for method '${methodName}'`);

    let callbacks = callbacksForMethodName.get(methodName);
    if (callbacks === undefined) {
        callbacks = [];
        callbacksForMethodName.set(methodName, callbacks);
    }

    callbacks.push(result => {
        console.log(`invoking callback for method '${methodName}'`);
        if ('errorDescription' in result) {
            reject(result.errorDescription);
        } else {
            resolve();
        }
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
        'playerIndex' in obj &&
        'playerCards' in obj &&
        'playerRevealCount' in obj &&
        //'playerState' in obj &&
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
            console.log(`gameState.playerShareCount = ${gameState.playerShareCount}`);
            console.log(`gameState.playerRevealCount = ${gameState.playerRevealCount}`);
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
    const previousDeckSprites = deckSprites;
    const previousBackSpritesForPlayer = backSpritesForPlayer;
    const previousFaceSpritesForPlayer = faceSpritesForPlayer;

    backSpritesForPlayer = [];
    faceSpritesForPlayer = [];
    for (let i = 0; i < 4; ++i) {
        const previousBackSprites = previousBackSpritesForPlayer[i] ?? [];
        previousBackSpritesForPlayer[i] = previousBackSprites;

        const previousFaceSprites = previousFaceSpritesForPlayer[i] ?? [];
        previousFaceSpritesForPlayer[i] = previousFaceSprites;

        let previousFaceCards: Lib.Card[];
        let faceCards: Lib.Card[];
        if (i === gameState.playerIndex) {
            previousFaceCards = previousGameState?.playerCards ?? [];
            faceCards = gameState.playerCards;
        } else {
            previousFaceCards = previousGameState?.otherPlayers[i]?.revealedCards ?? [];
            faceCards = gameState.otherPlayers[i]?.revealedCards ?? [];
        }

        let faceSprites: Sprite[] = [];
        faceSpritesForPlayer[i] = faceSprites;
        for (const faceCard of faceCards) {
            let faceSprite: Sprite | undefined = undefined;
            if (faceSprite === undefined) {
                for (let j = 0; j < previousFaceCards.length; ++j) {
                    const previousFaceCard = previousFaceCards[j];
                    if (previousFaceCard === undefined) throw new Error();
                    if (JSON.stringify(faceCard) === JSON.stringify(previousFaceCard)) {
                        previousFaceCards.splice(j, 1);
                        faceSprite = previousFaceSprites.splice(j, 1)[0];
                        if (faceSprite === undefined) throw new Error();
                        break;
                    }
                }
            }

            if (faceSprite === undefined) {
                for (let j = 0; j < 4; ++j) {
                    const previousOtherPlayer = previousGameState?.otherPlayers[j];
                    const otherPlayer = gameState.otherPlayers[j];
                    if (previousOtherPlayer === undefined || previousOtherPlayer === null ||
                        otherPlayer === undefined || otherPlayer === null
                    ) {
                        continue;
                    }

                    if (previousOtherPlayer.shareCount > otherPlayer.shareCount) {
                        for (let k = 0; k < previousOtherPlayer.shareCount; ++k) {
                            if (JSON.stringify(faceCard) === JSON.stringify(previousOtherPlayer.revealedCards[k])) {
                                --previousOtherPlayer.shareCount;
                                previousOtherPlayer.revealedCards.splice(k, 1);

                                faceSprite = previousFaceSpritesForPlayer[j]?.splice(k, 1)[0];
                                if (faceSprite === undefined) throw new Error();
                                
                                const sourceTransform = VP.getTransformForPlayer(VP.getRelativePlayerIndex(j, gameState.playerIndex));
                                const destinationTransform = VP.getTransformForPlayer(VP.getRelativePlayerIndex(i, gameState.playerIndex));
                                destinationTransform.invertSelf();

                                let p = sourceTransform.transformPoint(faceSprite.position);
                                p = destinationTransform.transformPoint(p);
                                faceSprite.position = new Vector(p.x, p.y);
                                break;
                            }
                        }
                    }

                    if (faceSprite !== undefined) {
                        break;
                    }
                }
            }

            if (faceSprite === undefined && previousBackSprites.length > 0) {
                // make it look like this card was revealed among previously hidden cards
                // which, of course, requires that the player had previously hidden cards
                faceSprite = previousBackSprites.splice(0, 1)[0];
                if (faceSprite === undefined) throw new Error();
                faceSprite.image = Sprite.getImage(JSON.stringify(faceCard));
            }

            if (faceSprite === undefined && previousDeckSprites.length > 0) {
                // make it look like this card came from the deck;
                const faceSprite = previousDeckSprites.splice(previousDeckSprites.length - 1, 1)[0];
                if (faceSprite === undefined) throw new Error();
                faceSprite.image = Sprite.getImage(JSON.stringify(faceCard));

                // this sprite is rendered in the player's transformed canvas context
                const transform = VP.getTransformForPlayer(VP.getRelativePlayerIndex(i, gameState.playerIndex));
                transform.invertSelf();
                const point = transform.transformPoint(faceSprite.position);
                faceSprite.position = new Vector(point.x, point.y);
            }

            if (faceSprite === undefined) {
                faceSprite = new Sprite(Sprite.getImage(JSON.stringify(faceCard)));
            }

            faceSprites.push(faceSprite);
        }
    }

    for (let i = 0; i < 4; ++i) {
        const previousBackSprites = previousBackSpritesForPlayer[i] ?? [];
        previousBackSpritesForPlayer[i] = previousBackSprites;

        const previousFaceSprites = previousFaceSpritesForPlayer[i] ?? [];
        previousFaceSpritesForPlayer[i] = previousFaceSprites;

        let backSprites: Sprite[] = [];
        backSpritesForPlayer[i] = backSprites;
        const otherPlayer = gameState.otherPlayers[i];
        if (i !== gameState.playerIndex && otherPlayer !== null && otherPlayer !== undefined) {
            // only other players have any hidden cards
            while (backSprites.length < otherPlayer.cardCount - otherPlayer.revealedCards.length) {
                let backSprite: Sprite | undefined = undefined;
                if (backSprite === undefined) {
                    for (let j = 0; j < 4; ++j) {
                        const previousOtherPlayer = previousGameState?.otherPlayers[j];
                        const otherPlayer = gameState.otherPlayers[j];
                        if (previousOtherPlayer === undefined || previousOtherPlayer === null ||
                            otherPlayer === undefined || otherPlayer === null
                        ) {
                            continue;
                        }

                        if (previousOtherPlayer.shareCount > otherPlayer.shareCount) {
                            previousOtherPlayer.shareCount--;
                            previousOtherPlayer.revealedCards.splice(0, 1);

                            backSprite = previousFaceSpritesForPlayer[j]?.splice(0, 1)[0];
                            if (backSprite === undefined) throw new Error();
                            backSprite.image = Sprite.getImage(`Back${i + 1}`);

                            const sourceTransform = VP.getTransformForPlayer(VP.getRelativePlayerIndex(j, gameState.playerIndex));
                            const destinationTransform = VP.getTransformForPlayer(VP.getRelativePlayerIndex(i, gameState.playerIndex));
                            
                            let p = sourceTransform.transformPoint(backSprite.position);
                            p = destinationTransform.transformPoint(p);
                            backSprite.position = new Vector(p.x, p.y);
                            break;
                        }
                    }
                }

                if (backSprite === undefined && previousBackSprites.length > 0) {
                    backSprite = previousBackSprites.splice(0, 1)[0];
                    if (backSprite === undefined) throw new Error();
                }
                
                if (backSprite === undefined && previousFaceSprites.length > 0) {
                    backSprite = previousFaceSprites.splice(0, 1)[0];
                    if (backSprite === undefined) throw new Error();
                    backSprite.image = Sprite.getImage(`Back${i + 1}`);
                }
                
                if (backSprite === undefined && previousDeckSprites.length > 0) {
                    backSprite = previousDeckSprites.splice(previousDeckSprites.length - 1, 1)[0];
                    if (backSprite === undefined) throw new Error();
                    backSprite.image = Sprite.getImage(`Back${i + 1}`);
                    
                    // this sprite comes from the deck, which is rendered in the client player's transform
                    const transform = VP.getTransformForPlayer(VP.getRelativePlayerIndex(i, gameState.playerIndex));
                    transform.invertSelf();
                    const point = transform.transformPoint(backSprite.position);
                    backSprite.position = new Vector(point.x, point.y);
                }
                
                if (backSprite === undefined) {
                    backSprite = new Sprite(Sprite.getImage(`Back${i + 1}`));
                }

                backSprites.push(backSprite);
            }
        }
    }

    deckSprites = [];
    while (deckSprites.length < gameState.deckCount) {
        let deckSprite: Sprite | undefined = undefined;
        if (deckSprite == undefined && previousDeckSprites.length > 0) {
            deckSprite = previousDeckSprites.splice(0, 1)[0];
            if (deckSprite === undefined) throw new Error();
        }

        if (deckSprite === undefined) {
            let i = 0;
            for (const previousBackSprites of previousBackSpritesForPlayer) {
                if (previousBackSprites.length > 0) {
                    deckSprite = previousBackSprites.splice(0, 1)[0];
                    if (deckSprite === undefined) throw new Error();
                    deckSprite.image = Sprite.getImage('Back0');

                    // the sprite came from the player's transformed canvas context
                    const transform = VP.getTransformForPlayer(VP.getRelativePlayerIndex(i, gameState.playerIndex));
                    const point = transform.transformPoint(deckSprite.position);
                    deckSprite.position = new Vector(point.x, point.y);

                    break;
                }

                ++i;
            }
        }

        if (deckSprite === undefined) {
            let i = 0;
            for (const previousFaceSprites of previousFaceSpritesForPlayer) {
                if (previousFaceSprites.length > 0) {
                    deckSprite = previousFaceSprites.splice(0, 1)[0];
                    if (deckSprite === undefined) throw new Error();
                    deckSprite.image = Sprite.getImage('Back0');
                    
                    // the sprite came from the player's transformed canvas context
                    const transform = VP.getTransformForPlayer(VP.getRelativePlayerIndex(i, gameState.playerIndex));
                    const point = transform.transformPoint(deckSprite.position);
                    deckSprite.position = new Vector(point.x, point.y);

                    break;
                }

                ++i;
            }
        }

        if (deckSprite === undefined) {
            deckSprite = new Sprite(Sprite.getImage('Back0'));
        }

        deckSprites.push(deckSprite);
    }

    setSpriteTargets(gameState);

    onAnimationsAssociated();
}

export function setSpriteTargets(
    gameState: Lib.GameState,
    reservedSpritesAndCards?: [Sprite, Lib.Card][],
    movingSpritesAndCards?: [Sprite, Lib.Card][],
    shareCount?: number,
    revealCount?: number,
    splitIndex?: number,
    returnToDeck?: boolean
) {
    const sprites = faceSpritesForPlayer[gameState.playerIndex];
    if (sprites === undefined) throw new Error();

    const cards = gameState.playerCards;

    reservedSpritesAndCards = reservedSpritesAndCards ?? cards.map((card, index) => <[Sprite, Lib.Card]>[sprites[index], card]);
    movingSpritesAndCards = movingSpritesAndCards ?? [];
    shareCount = shareCount ?? gameState.playerShareCount;
    revealCount = revealCount ?? gameState.playerRevealCount;
    splitIndex = splitIndex ?? cards.length;
    returnToDeck = returnToDeck ?? false;

    // clear for reinsertion
    sprites.splice(0, sprites.length);
    cards.splice(0, cards.length);

    for (const [reservedSprite, reservedCard] of reservedSpritesAndCards) {
        if (cards.length === splitIndex) {
            for (const [movingSprite, movingCard] of movingSpritesAndCards) {
                sprites.push(movingSprite);
                cards.push(movingCard);
            }
        }

        if (cards.length < shareCount) {
            reservedSprite.target = new Vector(
                VP.canvas.width / 2 - VP.spriteWidth - shareCount * VP.spriteGap + cards.length * VP.spriteGap,
                VP.canvas.height - 2 * VP.spriteHeight - VP.spriteGap
            );
        } else if (cards.length < revealCount) {
            reservedSprite.target = new Vector(
                VP.canvas.width / 2 + (cards.length - shareCount) * VP.spriteGap,
                VP.canvas.height - 2 * VP.spriteHeight
            );
        } else {
            let count = reservedSpritesAndCards.length - revealCount;
            if (!returnToDeck) {
                count += movingSpritesAndCards.length;
            }

            reservedSprite.target = new Vector(
                VP.canvas.width / 2 - VP.spriteWidth / 2 + (cards.length - revealCount - (count - 1) / 2) * VP.spriteGap,
                VP.canvas.height - VP.spriteHeight
            );
        }
        
        sprites.push(reservedSprite);
        cards.push(reservedCard);
    }

    if (cards.length === splitIndex) {
        for (const [movingSprite, movingCard] of movingSpritesAndCards) {
            sprites.push(movingSprite);
            cards.push(movingCard);
        }
    }

    gameState.playerShareCount = shareCount;
    gameState.playerRevealCount = revealCount;
}

export async function joinGame(gameId: string, playerName: string) {
    // wait for connection
    do {
        await Lib.delay(1000);
        console.log(`ws.readyState: ${ws.readyState}, WebSocket.OPEN: ${WebSocket.OPEN}`);
    } while (ws.readyState != WebSocket.OPEN);

    // try to join the game
    await new Promise<void>((resolve, reject) => {
        addCallback('joinGame', resolve, reject);
        ws.send(JSON.stringify(<Lib.JoinGameMessage>{ gameId, playerName }));
    });
}

export async function takeCard(otherPlayerIndex: number, cardIndex: number, card: Lib.Card) {
    const animationsAssociated = new Promise<void>(resolve => {
        onAnimationsAssociated = () => {
            console.log(`associated animations`);
            onAnimationsAssociated = () => {};
            resolve();
        };
    });

    await new Promise<void>((resolve, reject) => {
        addCallback('takeCard', resolve, reject);
        ws.send(JSON.stringify(<Lib.TakeCardMessage>{
            otherPlayerIndex,
            cardIndex,
            card
        }));
    });

    await animationsAssociated;
}

export async function drawCard(): Promise<void> {
    const animationsAssociated = new Promise<void>(resolve => {
        onAnimationsAssociated = () => {
            onAnimationsAssociated = () => {};
            resolve();
        };
    });

    await new Promise<void>((resolve, reject) => {
        addCallback('drawCard', resolve, reject);
        ws.send(JSON.stringify(<Lib.DrawCardMessage>{
            drawCard: null
        }));
    });

    await animationsAssociated;
}

export async function returnCardsToDeck(gameState: Lib.GameState) {
    await new Promise<void>((resolve, reject) => {
        addCallback('returnCardsToDeck', resolve, reject);
        ws.send(JSON.stringify(<Lib.ReturnCardsToDeckMessage>{
            cardsToReturnToDeck: selectedIndices.map(i => gameState.playerCards[i])
        }));
    });
    
    // make the selected cards disappear
    selectedIndices.splice(0, selectedIndices.length);
}

export function reorderCards(gameState: Lib.GameState) {
    return new Promise<void>((resolve, reject) => {
        addCallback('reorderCards', resolve, reject);
        ws.send(JSON.stringify(<Lib.ReorderCardsMessage>{
            reorderedCards: gameState.playerCards,
            newShareCount: gameState.playerShareCount,
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
    sortCards(gameState.playerCards, 0, gameState.playerShareCount, compareFn);
    sortCards(gameState.playerCards, gameState.playerShareCount, gameState.playerRevealCount, compareFn);
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
    sortCards(gameState.playerCards, 0, gameState.playerShareCount, compareFn);
    sortCards(gameState.playerCards, gameState.playerShareCount, gameState.playerRevealCount, compareFn);
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
    const section = cards.slice(start, end);
    section.sort(compareFn);
    cards.splice(start, end - start, ...section);
}
/*
export function wait() {
    return new Promise<void>((resolve, reject) => {
        addCallback('wait', resolve, reject);
        ws.send(JSON.stringify(<Lib.WaitMessage>{
            wait: null
        }));
    });
}

export function proceed() {
    return new Promise<void>((resolve, reject) => {
        addCallback('proceed', resolve, reject);
        ws.send(JSON.stringify(<Lib.ProceedMessage>{
            proceed: null
        }));
    });
}
*/