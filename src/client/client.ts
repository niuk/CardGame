import * as Lib from '../lib';
import * as State from './state';

// the most recently received game state, if any
export let gameState: Lib.GameState | undefined;

// open websocket connection to get game state updates
let webSocket = new WebSocket(`wss://${window.location.hostname}/`);

export async function connect() {
    // wait for connection
    while (webSocket.readyState != WebSocket.OPEN) {
        console.log(`webSocket.readyState: ${webSocket.readyState}, WebSocket.OPEN: ${WebSocket.OPEN}`);

        await Lib.delay(100);
    }
}

webSocket.onmessage = e => {
    const obj = JSON.parse(e.data);
    if ('methodName' in obj) {
        const result = <Lib.Result>obj;

        const callbacks = callbacksForMethodType.get(result.methodName);
        if (callbacks === undefined || callbacks.length === 0) {
            throw new Error(`no callbacks found for method: ${result.methodName}`);
        }

        const callback = callbacks.shift();
        if (callback === undefined) {
            throw new Error(`callback is undefined for method: ${result.methodName}`);
        }
        
        callback(result);
    } else if (
        'gameId' in obj &&
        'deckCount' in obj &&
        'playerIndex' in obj &&
        'playerStates' in obj
    ) {
        if (JSON.stringify(gameState) === JSON.stringify(obj)) {
            return;
        }
        
        const previousGameState = gameState;
        gameState = <Lib.GameState>obj;

        console.log(`received gameState: ${JSON.stringify(gameState)}`);

        Lib.setCookie('gameId', gameState.gameId);

        // selected indices might have shifted
        const cards = gameState.playerStates[gameState.playerIndex]?.cards;
        const previousCards = previousGameState?.playerStates[previousGameState.playerIndex]?.cards;
        if (cards !== undefined && previousCards !== undefined) {
            const newSelectedIndices = [];
            
            for (const selectedIndex of State.selectedIndices) {
                const candidates = [];
                for (let i = 0; i < cards.length; ++i) {
                    if (JSON.stringify(previousCards[selectedIndex]) === JSON.stringify(cards[i])) {
                        candidates.push(i);
                    }
                }

                let min = Infinity;
                let closest = undefined;
                for (let candidate of candidates) {
                    const distance = Math.abs(candidate - selectedIndex);
                    if (min > distance) {
                        min = distance;
                        closest = candidate;
                    }
                }

                if (closest !== undefined) {
                    newSelectedIndices.push(closest);
                }
            }

            State.selectedIndices.splice(0, State.selectedIndices.length, ...newSelectedIndices);
        }

        // binary search still needs to work
        State.selectedIndices.sort((a, b) => a - b);

        State.linkSpritesWithCards(previousGameState, gameState);
        State.setPlayerSpriteTargets(gameState);
        State.transformPlayerContainers(gameState);
    } else {
        throw new Error(JSON.stringify(e.data));
    }
};

const callbacksForMethodType = new Map<Lib.MethodName, ((result: Lib.Result) => void)[]>();
function addCallback(methodName: Lib.MethodName, resolve: () => void, reject: (reason: any) => void) {
    //console.log(`adding callback for method '${methodName}'`);

    let callbacks = callbacksForMethodType.get(methodName);
    if (callbacks === undefined) {
        callbacks = [];
        callbacksForMethodType.set(methodName, callbacks);
    }

    callbacks.push(result => {
        //console.log(`invoking callback for method '${methodName}'`);
        if ('errorDescription' in result) {
            reject(result.errorDescription);
        } else {
            resolve();
        }
    });
}

export async function setPlayerName(playerName: string) {
    await new Promise<void>((resolve, reject) => {
        addCallback('SetPlayerName', resolve, reject);
        webSocket.send(JSON.stringify(<Lib.SetPlayerName>{
            methodName: 'SetPlayerName',
            playerName
        }))
    })
}

export async function joinGame(gameId: string) {
    // try to join the game
    await new Promise<void>((resolve, reject) => {
        addCallback('JoinGame', resolve, reject);
        webSocket.send(JSON.stringify(<Lib.JoinGame>{
            methodName: 'JoinGame',
            gameId
        }));
    });

    while (!gameState) {
        await Lib.delay(100);
    }
}

export async function newGame() {
    await new Promise<void>((resolve, reject) => {
        addCallback('NewGame', resolve, reject);
        webSocket.send(JSON.stringify(<Lib.NewGame>{
            methodName: 'NewGame'
        }));
    });

    while (!gameState) {
        await Lib.delay(100);
    }
}

export async function takeCard(otherPlayerIndex: number, cardIndex: number, card: Lib.Card) {
    const promise = State.getSpritesLinkedWithCardsPromise();

    await new Promise<void>((resolve, reject) => {
        addCallback('TakeCard', resolve, reject);
        webSocket.send(JSON.stringify(<Lib.TakeCard>{
            methodName: 'TakeCard',
            otherPlayerIndex,
            cardIndex,
            card
        }));
    });

    await promise;
}

export async function drawCard(): Promise<void> {
    const promise = State.getSpritesLinkedWithCardsPromise();

    await new Promise<void>((resolve, reject) => {
        addCallback('DrawCard', resolve, reject);
        webSocket.send(JSON.stringify(<Lib.DrawCard>{
            methodName: 'DrawCard'
        } as Lib.DrawCard));
    });

    await promise;
}

export async function returnCardsToDeck(gameState: Lib.GameState) {
    const player = gameState.playerStates[gameState.playerIndex];
    if (!player) throw new Error();

    await new Promise<void>((resolve, reject) => {
        addCallback('ReturnCardsToDeck', resolve, reject);
        webSocket.send(JSON.stringify(<Lib.ReturnCardsToDeck>{
            methodName: 'ReturnCardsToDeck',
            cardsToReturnToDeck: State.selectedIndices.map(i => player.cards[i])
        }));
    });
    
    // make the selected cards disappear
    State.selectedIndices.splice(0, State.selectedIndices.length);
}

export function reorderCards(gameState: Lib.GameState) {
    const player = gameState.playerStates[gameState.playerIndex];
    if (!player) throw new Error();

    return new Promise<void>((resolve, reject) => {
        addCallback('ReorderCards', resolve, reject);
        webSocket.send(JSON.stringify(<Lib.ReorderCards>{
            methodName: 'ReorderCards',
            reorderedCards: player.cards,
            newShareCount: player.shareCount,
            newRevealCount: player.revealCount,
            newGroupCount: player.groupCount
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

    const player = gameState.playerStates[gameState.playerIndex];
    if (player === undefined || player === null) throw new Error();

    const previousGameState = <Lib.GameState>JSON.parse(JSON.stringify(gameState));
    sortCards(player.cards, 0, player.shareCount, compareFn);
    sortCards(player.cards, player.shareCount, player.revealCount, compareFn);
    sortCards(player.cards, player.revealCount, player.groupCount, compareFn);
    sortCards(player.cards, player.groupCount, player.totalCount, compareFn);
    State.linkSpritesWithCards(previousGameState, gameState);
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

    const player = gameState.playerStates[gameState.playerIndex];
    if (player === undefined || player === null) throw new Error();

    const previousGameState = <Lib.GameState>JSON.parse(JSON.stringify(gameState));
    sortCards(player.cards, 0, player.shareCount, compareFn);
    sortCards(player.cards, player.shareCount, player.revealCount, compareFn);
    sortCards(player.cards, player.revealCount, player.groupCount, compareFn);
    sortCards(player.cards, player.groupCount, player.totalCount, compareFn);
    State.linkSpritesWithCards(previousGameState, gameState);
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