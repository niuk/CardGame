import * as Lib from '../lib';
import * as Input from './input';
import Sprite from './sprite';
import { Capacitor } from '@capacitor/core';

// the most recently received game state, if any
export let gameState: Lib.GameState | undefined;

let webSocket: WebSocket | undefined = undefined;

// websocket connection to get game state updates
(async () => {
    let heartbeat: number = 0;
    let gameId: string | undefined = undefined;
    let playerIndex: number | undefined = undefined;
    
    while (true) {
        await Lib.delay(1000);

        if (heartbeat < Date.now() - 3 * 1000) {
            if (webSocket) {
                // abort existing connection attempt
                webSocket.close();
            }

            if (gameState) {
                // keep info for rejoins
                gameId = gameState.gameId;
                playerIndex = gameState.playerIndex;

                // clear previous gameState
                gameState = undefined;

                // also clear card sprites, since we'll be getting a competely new gameState
                Sprite.clearSprites();
            }

            // avoid immediately reconnecting if we haven't received a heartbeat yet
            heartbeat = Date.now();

            // reconnect
            const url = `wss://${Capacitor.isNative ? 'haruspex.io': window.location.hostname}/${gameId ?? ''}/${playerIndex ?? ''}`;
            console.log(`webSocket.url = ${url}, isNative = ${Capacitor.isNative}`);
            webSocket = new WebSocket(url);
            webSocket.onmessage = async e => {
                if (typeof(e.data) !== 'string') {
                    throw new Error();
                }

                if (e.data.startsWith('time = ')) {
                    //console.log(`received heartbeat: ${e.data}`);
                    heartbeat = Date.now();
                    return;
                }

                const { newGameState,                       methodResult }:
                      { newGameState: Lib.GameState | null, methodResult: Lib.Result | null } = JSON.parse(e.data);
        
                if (newGameState) {
                    console.log('newGameState', newGameState);
        
                    if (!gameState || gameState.tick === newGameState.tick - 1) {
                        const previousGameState = gameState;
                        gameState = newGameState;
                
                        Lib.setCookie('gameId', gameState.gameId);
                
                        Input.linkWithCards(gameState);
                        await Sprite.linkWithCards(previousGameState, gameState);
                    }
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
        }

        if (webSocket) {
            if (webSocket.readyState === WebSocket.OPEN) {
                //console.log('sending heartbeat');
                webSocket.send(`time = ${heartbeat}`);
            }

            const statusElement = <HTMLDivElement | null>document.getElementById('status');
            if (!statusElement) continue;

            if (webSocket.readyState === WebSocket.CLOSED) {
                statusElement.innerHTML = 'WebSocket closed.';
            } else if (webSocket.readyState === WebSocket.CLOSING) {
                statusElement.innerHTML = 'WebSocket closing...';
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
    }
})();

const callbacksForMethodType = new Map<Lib.MethodName, ((result: Lib.Result) => void)[]>();
function addCallback(methodName: Lib.MethodName, resolve: () => void, reject: (reason: string) => void) {
    //console.log(`adding callback for method '${methodName}'`);

    let callbacks = callbacksForMethodType.get(methodName);
    if (!callbacks) {
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
        if (!webSocket) {
            reject('not connected');
            return;
        }

        addCallback('SetPlayerName', resolve, reject);
        webSocket.send(JSON.stringify(<Lib.SetPlayerName>{
            methodName: 'SetPlayerName',
            playerName
        }));
    });
}

export function newGame(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        if (!webSocket) {
            reject('not connected');
            return;
        }

        addCallback('NewGame', resolve, reject);
        webSocket.send(JSON.stringify(<Lib.NewGame>{
            methodName: 'NewGame'
        }));
    });
}

export function joinGame(gameId: string): Promise<void> {
    // try to join the game
    return new Promise<void>((resolve, reject) => {
        if (!webSocket) {
            reject('not connected');
            return;
        }

        addCallback('JoinGame', resolve, reject);
        webSocket.send(JSON.stringify(<Lib.JoinGame>{
            methodName: 'JoinGame',
            gameId
        }));
    });
}

export function addDeck(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        if (!webSocket) {
            reject('not connected');
            return;
        }

        if (!gameState) {
            reject('not in a game');
            return;
        }

        addCallback('AddDeck', resolve, reject);
        webSocket.send(JSON.stringify(<Lib.AddDeck>{
            methodName: 'AddDeck',
            tick: gameState.tick
        }));
    });
}

export function removeDeck(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        if (!webSocket) {
            reject('not connected');
            return;
        }

        if (!gameState) {
            reject('not in a game');
            return;
        }

        addCallback('RemoveDeck', resolve, reject);
        webSocket.send(JSON.stringify(<Lib.RemoveDeck>{
            methodName: 'RemoveDeck',
            tick: gameState.tick
        }));
    });
}

export function takeFromOtherPlayer(playerIndex: number, cardIndex: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        if (!webSocket) {
            reject('not connected');
            return;
        }

        if (!gameState) {
            reject('not in a game');
            return;
        }

        addCallback('TakeFromOtherPlayer', resolve, reject);
        webSocket.send(JSON.stringify(<Lib.TakeFromOtherPlayer>{
            methodName: 'TakeFromOtherPlayer',
            playerIndex,
            cardIndex,
            tick: gameState.tick
        }));
    });
}

export function drawFromDeck(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        if (!webSocket) {
            reject('not connected');
            return;
        }

        if (!gameState) {
            reject('not in a game');
            return;
        }

        addCallback('DrawFromDeck', resolve, reject);
        webSocket.send(JSON.stringify(<Lib.DrawFromDeck>{
            methodName: 'DrawFromDeck',
            tick: gameState.tick
        }));
    });
}

export function giveToOtherPlayer(playerIndex: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        if (!webSocket) {
            reject('not connected');
            return;
        }

        if (!gameState) {
            reject('not in a game');
            return;
        }

        addCallback('GiveToOtherPlayer', resolve, reject);
        webSocket.send(JSON.stringify(<Lib.GiveToOtherPlayer>{
            methodName: 'GiveToOtherPlayer',
            playerIndex,
            cardIndicesToGiveToOtherPlayer: Input.selectedIndices.slice(),
            tick: gameState.tick
        }));
    });
}

export function returnToDeck(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        if (!webSocket) {
            reject('not connected');
            return;
        }

        if (!gameState) {
            reject('not in a game');
            return;
        }

        addCallback('ReturnToDeck', resolve, reject);
        webSocket.send(JSON.stringify(<Lib.ReturnToDeck>{
            methodName: 'ReturnToDeck',
            cardIndicesToReturnToDeck: Input.selectedIndices.slice(),
            tick: gameState.tick
        }));
    });
}

export function shuffleDeck(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        if (!webSocket) {
            reject('not connected');
            return;
        }

        if (!gameState) {
            reject('not in a game');
            return;
        }

        addCallback('ShuffleDeck', resolve, reject);
        webSocket.send(JSON.stringify(<Lib.ShuffleDeck>{
            methodName: 'ShuffleDeck',
            tick: gameState.tick
        }));
    });
}

export function dispense(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        if (!webSocket) {
            reject('not connected');
            return;
        }

        if (!gameState) {
            reject('not in a game');
            return;
        }

        addCallback('Dispense', resolve, reject);
        webSocket.send(JSON.stringify(<Lib.Dispense>{
            methodName: 'Dispense',
            tick: gameState.tick
        }));
    });
}

export function reset(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        if (!webSocket) {
            reject('not connected');
            return;
        }

        if (!gameState) {
            reject('not in a game');
            return;
        }

        addCallback('Reset', resolve, reject);
        webSocket.send(JSON.stringify(<Lib.Reset>{
            methodName: 'Reset',
            tick: gameState.tick
        }));
    });
}

export function kickPlayer(playerIndex: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        if (!webSocket) {
            reject('not connected');
            return;
        }

        if (!gameState) {
            reject('not in a game');
            return;
        }

        addCallback('Kick', resolve, reject);
        webSocket.send(JSON.stringify(<Lib.Kick>{
            methodName: 'Kick',
            playerIndex,
            tick: gameState.tick
        }));
    });
}

export function setPlayerNotes(notes: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        if (!webSocket) {
            reject('not connected');
            return;
        }

        if (!gameState) {
            reject('not in a game');
            return;
        }

        addCallback('SetPlayerNotes', resolve, reject);
        webSocket.send(JSON.stringify(<Lib.SetPlayerNotes>{
            methodName: 'SetPlayerNotes',
            notes,
            tick: gameState.tick
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
        if (!webSocket) {
            reject('not connected');
            return;
        }

        if (!gameState) {
            reject('not in a game');
            return;
        }

        addCallback('Reorder', resolve, reject);
        webSocket.send(JSON.stringify(<Lib.Reorder>{
            methodName: 'Reorder',
            newShareCount,
            newRevealCount,
            newGroupCount,
            newOriginIndices,
            tick: gameState.tick
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