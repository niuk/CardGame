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
        console.log(newGameState);

        const previousGameState = gameState;
        gameState = newGameState;

        Lib.setCookie('gameId', gameState.gameId);

        await Sprite.load(gameState);

        Input.linkWithCards(gameState);
        Sprite.linkWithCards(previousGameState, gameState);
    }

    if (methodResult) {
        const callbacks = callbacksForMethodType.get(methodResult.methodName);
        if (callbacks === undefined || callbacks.length === 0) {
            throw new Error(`no callbacks found for method: ${methodResult.methodName}`);
        }

        const callback = callbacks.shift();
        if (callback === undefined) {
            throw new Error(`callback is undefined for method: ${methodResult.methodName}`);
        }

        callback(methodResult);
    }
};

const callbacksForMethodType = new Map<Lib.MethodName, ((result: Lib.Result) => void)[]>();
function addCallback(methodName: Lib.MethodName, resolve: () => void, reject: (reason: string) => void) {
    //console.log(`adding callback for method '${methodName}'`);

    let callbacks = callbacksForMethodType.get(methodName);
    if (callbacks === undefined) {
        callbacks = [];
        callbacksForMethodType.set(methodName, callbacks);
    }

    callbacks.push(result => {
        //console.log(`invoking callback for method '${methodName}'`);
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

export function newGame(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        addCallback('NewGame', resolve, reject);
        webSocket.send(JSON.stringify(<Lib.NewGame>{
            methodName: 'NewGame'
        }));
    });
}

export function takeFromOtherPlayer(otherPlayerIndex: number, cardIndex: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        addCallback('TakeFromOtherPlayer', resolve, reject);
        webSocket.send(JSON.stringify(<Lib.TakeFromOtherPlayer>{
            methodName: 'TakeFromOtherPlayer',
            otherPlayerIndex,
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

export function giveToOtherPlayer(otherPlayerIndex: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        addCallback('GiveToOtherPlayer', resolve, reject);
        webSocket.send(JSON.stringify(<Lib.GiveToOtherPlayer>{
            methodName: 'GiveToOtherPlayer',
            otherPlayerIndex,
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
    newCardsWithOrigins: [Lib.Card, Lib.Origin][]
): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        addCallback('Reorder', resolve, reject);
        webSocket.send(JSON.stringify(<Lib.Reorder>{
            methodName: 'Reorder',
            newShareCount,
            newRevealCount,
            newGroupCount,
            newCardsWithOrigins
        }));
    });
}

export function sortBySuit(gameState: Lib.GameState): Promise<void> {
    return sortCards(gameState, (
        [[aSuit, aRank], aOrigin]: [Lib.Card, Lib.Origin],
        [[bSuit, bRank], bOrigin]: [Lib.Card, Lib.Origin]
    ) => {
        if (aSuit !== bSuit) {
            return aSuit - bSuit;
        } else {
            return aRank - bRank;
        }
    });
}

export function sortByRank(gameState: Lib.GameState): Promise<void> {
    return sortCards(gameState, (
        [[aSuit, aRank], aOrigin]: [Lib.Card, Lib.Origin],
        [[bSuit, bRank], bOrigin]: [Lib.Card, Lib.Origin]
    ) => {
        if (aRank !== bRank) {
            return aRank - bRank;
        } else {
            return aSuit - bSuit;
        }
    });
}

function sortCards(gameState: Lib.GameState, compareFn: (a: [Lib.Card, Lib.Origin], b: [Lib.Card, Lib.Origin]) => number) {
    const player = gameState.playerStates[gameState.playerIndex];
    if (!player) throw new Error();

    const newShareCount = player.shareCount;
    const newRevealCount = player.revealCount;
    const newGroupCount = player.groupCount;
    const newCardsWithOrigins: [Lib.Card, Lib.Origin][] = player.cardsWithOrigins.map(([card, origin], index) => {
        if (!card) throw new Error();
        return [card, {
            origin: 'Hand',
            playerIndex: gameState.playerIndex,
            cardIndex: index
        }];
    });

    sortSection(newCardsWithOrigins, 0, player.shareCount, compareFn);
    sortSection(newCardsWithOrigins, player.shareCount, player.revealCount, compareFn);
    sortSection(newCardsWithOrigins, player.revealCount, player.groupCount, compareFn);
    sortSection(newCardsWithOrigins, player.groupCount, player.cardsWithOrigins.length, compareFn);
    return reorderCards(newShareCount, newRevealCount, newGroupCount, newCardsWithOrigins);
}

function sortSection(
    cards: [Lib.Card, Lib.Origin][],
    start: number,
    end: number,
    compareFn: (a: [Lib.Card, Lib.Origin], b: [Lib.Card, Lib.Origin]) => number
) {
    const section = cards.slice(start, end);
    section.sort(compareFn);
    cards.splice(start, end - start, ...section);
}