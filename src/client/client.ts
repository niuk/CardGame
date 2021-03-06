import * as Lib from '../lib';
import * as Input from './input';
import Sprite from './sprite';

// the most recently received game state, if any
export let gameState: Lib.GameState | undefined;

// open websocket connection to get game state updates
const webSocket = new WebSocket(`wss://${window.location.hostname}/`);

export async function connect(): Promise<void> {
    // wait for connection
    while (webSocket.readyState != WebSocket.OPEN) {
        console.log(`webSocket.readyState: ${webSocket.readyState}, WebSocket.OPEN: ${WebSocket.OPEN}`);

        await Lib.delay(100);
    }
}

webSocket.onmessage = async e => {
    const { newGameState,                       methodResult }:
          { newGameState: Lib.GameState | null, methodResult: Lib.Result | null } = JSON.parse(e.data);

    if (newGameState) {
        console.log('newGameState', newGameState);

        const previousGameState = gameState;
        gameState = newGameState;

        Lib.setCookie('gameId', gameState.gameId);

        Input.linkWithCards(gameState);
        await Sprite.linkWithCards(previousGameState, gameState);
    }

    if (methodResult) {
        const callbacks = callbacksForMethodType.get(methodResult.methodName);
        if (!callbacks || callbacks.length === 0) {
            throw new Error(`no callbacks found for method: ${methodResult.methodName}`);
        }

        const callback = callbacks.shift();
        if (!callback) {
            throw new Error(`callback is undefined for method: ${methodResult.methodName}`);
        }

        callback(methodResult);
    }
};

(async () => {
    while (true) {
        await Lib.delay(100);

        const statusElement = <HTMLDivElement | null>document.getElementById('status');
        if (!statusElement) continue;
        
        if (webSocket.readyState === WebSocket.CLOSED) {
            statusElement.innerHTML = 'WebSocket closed.';
        } else if (webSocket.readyState === WebSocket.CLOSING) {
            statusElement.innerHTML = 'WebSocket closing.';
        } else if (webSocket.readyState === WebSocket.CONNECTING) {
            statusElement.innerHTML = 'WebSocket connecting...';
        } else if (webSocket.readyState === WebSocket.OPEN) {
            if (gameState !== undefined) {
                statusElement.innerHTML = `Game: ${gameState.gameId}`;
            } else {
                statusElement.innerHTML = `WebSocket connected.`;
            }
        } else {
            throw new Error();
        }
    }
})();

const callbacksForMethodType = new Map<Lib.MethodName, ((result: Lib.Result) => void)[]>();
function addCallback(methodName: Lib.MethodName, resolve: () => void, reject: (reason: string) => void) {
    console.log(`adding callback for method '${methodName}'`);

    let callbacks = callbacksForMethodType.get(methodName);
    if (!callbacks) {
        callbacks = [];
        callbacksForMethodType.set(methodName, callbacks);
    }

    callbacks.push(result => {
        console.log(`invoking callback for method '${methodName}'`);
        if ('errorDescription' in result && result.errorDescription !== undefined) {
            reject(result.errorDescription);
        } else {
            resolve();
        }
    });
}

export function setPlayerName(playerName: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        addCallback('SetPlayerName', resolve, reject);
        webSocket.send(JSON.stringify(<Lib.SetPlayerName>{
            methodName: 'SetPlayerName',
            playerName
        }))
    })
}

export function joinGame(gameId: string): Promise<void> {
    // try to join the game
    return new Promise<void>((resolve, reject) => {
        addCallback('JoinGame', resolve, reject);
        webSocket.send(JSON.stringify(<Lib.JoinGame>{
            methodName: 'JoinGame',
            gameId
        }));
    });
}

export function newGame(numPlayers: 4 | 5 | 6, numDecks: 1 | 2 | 3): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        addCallback('NewGame', resolve, reject);
        webSocket.send(JSON.stringify(<Lib.NewGame>{
            methodName: 'NewGame',
            numPlayers,
            numDecks
        }));
    });
}

export function takeFromOtherPlayer(playerIndex: number, cardIndex: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        addCallback('TakeFromOtherPlayer', resolve, reject);
        webSocket.send(JSON.stringify(<Lib.TakeFromOtherPlayer>{
            methodName: 'TakeFromOtherPlayer',
            playerIndex,
            cardIndex
        }));
    });
}

export function drawFromDeck(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        addCallback('DrawFromDeck', resolve, reject);
        webSocket.send(JSON.stringify(<Lib.DrawFromDeck>{
            methodName: 'DrawFromDeck'
        }));
    });
}

export function giveToOtherPlayer(playerIndex: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        addCallback('GiveToOtherPlayer', resolve, reject);
        webSocket.send(JSON.stringify(<Lib.GiveToOtherPlayer>{
            methodName: 'GiveToOtherPlayer',
            playerIndex,
            cardIndicesToGiveToOtherPlayer: Input.selectedIndices.slice()
        }));
    })
}

export function returnToDeck(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        addCallback('ReturnToDeck', resolve, reject);
        webSocket.send(JSON.stringify(<Lib.ReturnToDeck>{
            methodName: 'ReturnToDeck',
            cardIndicesToReturnToDeck: Input.selectedIndices.slice()
        }));
    });
}

export function reorderCards(
    newShareCount: number,
    newRevealCount: number,
    newGroupCount: number,
    newOriginIndices: number[]
): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        addCallback('Reorder', resolve, reject);
        webSocket.send(JSON.stringify(<Lib.Reorder>{
            methodName: 'Reorder',
            newShareCount,
            newRevealCount,
            newGroupCount,
            newOriginIndices
        }));
    });
}

function adjust(rank: number): number {
    if (rank === 1) {
        return 13;
    } else if (rank <= 13) {
        return rank - 1;
    } else {
        return rank;
    }
}

export function sortBySuit(): Promise<void> {
    return sortCards(([[aSuit, aRank], aIndex], [[bSuit, bRank], bIndex]) => {
        if (aSuit !== bSuit) {
            return aSuit - bSuit;
        } else {
            aRank = adjust(aRank);
            bRank = adjust(bRank);
            return aRank - bRank;
        }
    });
}

export function sortByRank(): Promise<void> {
    return sortCards(([[aSuit, aRank], aIndex], [[bSuit, bRank], bIndex]) => {
        if (aRank !== bRank) {
            aRank = adjust(aRank);
            bRank = adjust(bRank);
            return aRank - bRank;
        } else {
            return aSuit - bSuit;
        }
    });
}

async function sortCards(compareFn: (a: [Lib.Card, number], b: [Lib.Card, number]) => number): Promise<void> {
    if (!gameState) {
        return;
    }

    const player = gameState.playerStates[gameState.playerIndex];
    if (!player) throw new Error();

    const cardsWithOriginIndices: [Lib.Card, number][] = player.cardsWithOrigins.map(([card, origin], index) => {
        if (!card) throw new Error();
        return [card, index];
    });

    sortSection(cardsWithOriginIndices, 0, player.shareCount, compareFn);
    sortSection(cardsWithOriginIndices, player.shareCount, player.revealCount, compareFn);
    sortSection(cardsWithOriginIndices, player.revealCount, player.groupCount, compareFn);
    sortSection(cardsWithOriginIndices, player.groupCount, player.cardsWithOrigins.length, compareFn);
    await reorderCards(
        player.shareCount,
        player.revealCount,
        player.groupCount,
        cardsWithOriginIndices.map(([card, index]) => index)
    );
}

function sortSection(
    cards: [Lib.Card, number][],
    start: number,
    end: number,
    compareFn: (a: [Lib.Card, number], b: [Lib.Card, number]) => number
): void {
    const section = cards.slice(start, end);
    section.sort(compareFn);
    cards.splice(start, end - start, ...section);
}

export function shuffleDeck(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        addCallback('ShuffleDeck', resolve, reject);
        webSocket.send(JSON.stringify(<Lib.ShuffleDeck>{
            methodName: 'ShuffleDeck'
        }));
    });
}

export function dispense(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        addCallback('Dispense', resolve, reject);
        webSocket.send(JSON.stringify(<Lib.Dispense>{
            methodName: 'Dispense'
        }));
    });
}