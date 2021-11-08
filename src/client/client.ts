import * as Lib from '../lib';
import * as Input from './input';
import Sprite from './sprite';
import { Capacitor } from '@capacitor/core';

// the most recently received game state, if any
export let gameState: Lib.GameState | undefined;

let webSocket: WebSocket | undefined = undefined;

let nextCallbackIndex = 0;
const callbacks = new Map<number, (result: Lib.Result) => void>();

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
                    callbacks.get(methodResult.index)?.(methodResult);
                    callbacks.delete(methodResult.index);
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

function setup<TMethod extends Lib.Method>(method: Omit<TMethod, 'index'>): Promise<void> {
    return new Promise((resolve, reject) => {
        if (!webSocket) {
            reject('not connected');
            return;
        }

        const index = nextCallbackIndex++;
        callbacks.set(index, result => {
            if (result.errorDescription) {
                console.error(result.errorDescription);
                reject(result.errorDescription);
            } else {
                resolve();
            }
        });

        webSocket.send(JSON.stringify(<TMethod>{ index, ...method }));

        // timeout
        (async () => {
            await Lib.delay(3000);

            callbacks.get(index)?.({ index, errorDescription: 'timed out' });
            callbacks.delete(index);
        })();
    });
}

export function setPlayerName(playerName: string): Promise<void> {
    return setup<Lib.SetPlayerName>({
        methodName: 'SetPlayerName',
        playerName
    });
}

export function newGame(): Promise<void> {
    return setup<Lib.NewGame>({
        methodName: 'NewGame'
    });
}

export function joinGame(gameId: string): Promise<void> {
    return setup<Lib.JoinGame>({
        methodName: 'JoinGame',
        gameId
    });
}

export function addDeck(gameState: Lib.GameState): Promise<void> {
    return setup<Lib.AddDeck>({
        methodName: 'AddDeck',
        tick: gameState.tick
    });
}

export function removeDeck(gameState: Lib.GameState): Promise<void> {
    return setup<Lib.RemoveDeck>({
        methodName: 'RemoveDeck',
        tick: gameState.tick
    });
}

export function takeFromOtherPlayer(playerIndex: number, cardIndex: number, gameState: Lib.GameState): Promise<void> {
    return setup<Lib.TakeFromOtherPlayer>({
        methodName: 'TakeFromOtherPlayer',
        playerIndex,
        cardIndex,
        tick: gameState.tick
    });
}

export function drawFromDeck(gameState: Lib.GameState): Promise<void> {
    return setup<Lib.DrawFromDeck>({
        methodName: 'DrawFromDeck',
        tick: gameState.tick
    });
}

export function giveToOtherPlayer(playerIndex: number, gameState: Lib.GameState): Promise<void> {
    return setup<Lib.GiveToOtherPlayer>({
        methodName: 'GiveToOtherPlayer',
        playerIndex,
        cardIndicesToGiveToOtherPlayer: Input.selectedIndices.slice(),
        tick: gameState.tick
    });
}

export function returnToDeck(gameState: Lib.GameState): Promise<void> {
    return setup<Lib.ReturnToDeck>({
        methodName: 'ReturnToDeck',
        cardIndicesToReturnToDeck: Input.selectedIndices.slice(),
        tick: gameState.tick
    });
}

export function shuffleDeck(gameState: Lib.GameState): Promise<void> {
    return setup<Lib.ShuffleDeck>({
        methodName: 'ShuffleDeck',
        tick: gameState.tick
    });
}

export function dispense(gameState: Lib.GameState): Promise<void> {
    return setup<Lib.Dispense>({
        methodName: 'Dispense',
        tick: gameState.tick
    });
}

export function reset(gameState: Lib.GameState): Promise<void> {
    return setup<Lib.Reset>({
        methodName: 'Reset',
        tick: gameState.tick
    });
}

export function kickPlayer(playerIndex: number, gameState: Lib.GameState): Promise<void> {
    return setup<Lib.Kick>({
        methodName: 'Kick',
        playerIndex,
        tick: gameState.tick
    });
}

export function setPlayerNotes(notes: string, gameState: Lib.GameState): Promise<void> {
    return setup<Lib.SetPlayerNotes>({
        methodName: 'SetPlayerNotes',
        notes,
        tick: gameState.tick
    });
}

export function reorderCards(
    newShareCount: number,
    newRevealCount: number,
    newGroupCount: number,
    newOriginIndices: number[],
    gameState: Lib.GameState
): Promise<void> {
    return setup<Lib.Reorder>({
        methodName: 'Reorder',
        newShareCount,
        newRevealCount,
        newGroupCount,
        newOriginIndices,
        tick: gameState.tick
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
        cardsWithOriginIndices.map(([card, index]) => index),
        gameState
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