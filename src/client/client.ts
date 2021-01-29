import * as Lib from '../lib';
import * as Input from './input';
import * as State from './state';
import Sprite from './sprite';

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

webSocket.onmessage = async e => {
    const { newGameState,                       methodResult }:
          { newGameState: Lib.GameState | null, methodResult: Lib.Result | null } = JSON.parse(e.data);

    if (newGameState) {
        const previousGameState = gameState;
        gameState = newGameState;

        console.log(`received gameState: ${JSON.stringify(gameState)}`);

        Lib.setCookie('gameId', gameState.gameId);

        await Sprite.load(gameState);

        Input.linkInputWithCards(gameState);
        State.linkSpritesWithCards(previousGameState, gameState);
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

export function takeCard(otherPlayerIndex: number, cardIndex: number) {
    return new Promise<void>((resolve, reject) => {
        addCallback('TakeCard', resolve, reject);
        webSocket.send(JSON.stringify(<Lib.TakeCard>{
            methodName: 'TakeCard',
            otherPlayerIndex,
            cardIndex
        }));
    });
}

export function drawCard(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        addCallback('DrawCard', resolve, reject);
        webSocket.send(JSON.stringify(<Lib.DrawCard>{
            methodName: 'DrawCard'
        } as Lib.DrawCard));
    });
}

export function giveToOtherPlayer(otherPlayerIndex: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        addCallback('GiveCardsToOtherPlayer', resolve, reject);
        webSocket.send(JSON.stringify(<Lib.GiveCardsToOtherPlayer>{
            methodName: 'GiveCardsToOtherPlayer',
            otherPlayerIndex,
            cardIndicesToGiveToOtherPlayer: Array.from(Input.selectedIndices.iterator())
        }));
    })
}

export function returnCardsToDeck(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        addCallback('ReturnCardsToDeck', resolve, reject);
        webSocket.send(JSON.stringify(<Lib.ReturnCardsToDeck>{
            methodName: 'ReturnCardsToDeck',
            cardIndicesToReturnToDeck: Array.from(Input.selectedIndices.iterator())
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
        addCallback('ReorderCards', resolve, reject);
        webSocket.send(JSON.stringify(<Lib.ReorderCards>{
            methodName: 'ReorderCards',
            newShareCount,
            newRevealCount,
            newGroupCount,
            newCardsWithOrigins
        }));
    });
}

export function sortBySuit(gameState: Lib.GameState) {
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

export function sortByRank(gameState: Lib.GameState) {
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