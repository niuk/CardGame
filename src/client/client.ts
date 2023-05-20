import * as Lib from '../lib';
import * as Input from './input';
import Sprite from './sprite';
import { Capacitor } from '@capacitor/core';

// the most recently received game state, if any
export let gameState: Lib.GameState | undefined;
export let cardsById: Map<number, Lib.Card> | undefined;

let webSocket: WebSocket | undefined = undefined;

let nextCallbackIndex = 0;
const callbacks = new Map<number, (result: Lib.MethodResult) => void>();

// websocket connection to get game state updates
(async () => {
    let heartbeat = 0;
    let gameId: string | undefined;
    let playerName: string | undefined;

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
                playerName = gameState.playerStates[gameState.playerIndex]?.name;

                // clear previous gameState
                gameState = undefined;

                // also clear card sprites, since we'll be getting a competely new gameState
                //Sprite.clearSprites();
            }

            // avoid immediately reconnecting if we haven't received a heartbeat yet
            heartbeat = Date.now();

            // reconnect
            console.log(window.location.protocol)
            const url = `${
                window.location.protocol === 'https:' ? 'wss:' : 'ws:'
            }//${
                Capacitor.isNative !== undefined && Capacitor.isNative ? 'haruspex.io': window.location.hostname
            }/${
                gameId !== undefined ? gameId : ''
            }/${
                playerName !== undefined ? playerName : ''
            }`;
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
                      { newGameState: Lib.GameState | null, methodResult: Lib.MethodResult | null } = JSON.parse(e.data);

                if (newGameState) {
                    //console.log('newGameState', newGameState);

                    gameState = newGameState;
                    cardsById = new Map<number, Lib.Card>(gameState.cardsById);

                    Lib.setCookie('gameId', gameState.gameId);

                    Input.linkWithCards(gameState);
                    await Sprite.linkWithCards(gameState, cardsById);
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
                statusElement.innerHTML = '关闭了。';
            } else if (webSocket.readyState === WebSocket.CLOSING) {
                statusElement.innerHTML = '关闭……';
            } else if (webSocket.readyState === WebSocket.CONNECTING) {
                statusElement.innerHTML = '链接……';
            } else if (webSocket.readyState === WebSocket.OPEN) {
                if (gameState !== undefined) {
                    statusElement.innerHTML = `游戏号：${gameState.gameId}`;
                } else {
                    statusElement.innerHTML = `连接了。`;
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
            if (result.errorDescription !== undefined) {
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

export function addDeck(): Promise<void> {
    return setup<Lib.AddDeck>({
        methodName: 'AddDeck'
    });
}

export function removeDeck(): Promise<void> {
    return setup<Lib.RemoveDeck>({
        methodName: 'RemoveDeck'
    });
}

export function takeFromOtherPlayer(playerIndex: number, cardId: number): Promise<void> {
    return setup<Lib.TakeFromOtherPlayer>({
        methodName: 'TakeFromOtherPlayer',
        playerIndex,
        cardId
    });
}

export function drawFromDeck(): Promise<void> {
    return setup<Lib.DrawFromDeck>({
        methodName: 'DrawFromDeck'
    });
}

export function giveToOtherPlayer(playerIndex: number): Promise<void> {
    return setup<Lib.GiveToOtherPlayer>({
        methodName: 'GiveToOtherPlayer',
        playerIndex,
        cardIds: Array.from(Input.selectedCardIds)
    });
}

export function returnToDeck(): Promise<void> {
    return setup<Lib.ReturnToDeck>({
        methodName: 'ReturnToDeck',
        cardIds: Array.from(Input.selectedCardIds)
    });
}

export function shuffleDeck(): Promise<void> {
    return setup<Lib.ShuffleDeck>({
        methodName: 'ShuffleDeck'
    });
}

export function dispense(): Promise<void> {
    return setup<Lib.Dispense>({
        methodName: 'Dispense'
    });
}

export function reset(): Promise<void> {
    return setup<Lib.Reset>({
        methodName: 'Reset'
    });
}

export function kickPlayer(playerIndex: number): Promise<void> {
    return setup<Lib.Kick>({
        methodName: 'Kick',
        playerIndex
    });
}

export function setPlayerNotes(notes: string): Promise<void> {
    return setup<Lib.SetPlayerNotes>({
        methodName: 'SetPlayerNotes',
        notes
    });
}

export function reorderCards(
    newShareCount: number,
    newRevealCount: number,
    newGroupCount: number,
    newCardIds: number[]
): Promise<void> {
    return setup<Lib.Reorder>({
        methodName: 'Reorder',
        newShareCount,
        newRevealCount,
        newGroupCount,
        newCardIds
    });
}

export function takeFromScore(cardId: number): Promise<void> {
    return setup<Lib.TakeFromScore>({
        methodName: 'TakeFromScore',
        cardId,
    });
}

export function addToScore(): Promise<void> {
    return setup<Lib.AddToScore>({
        methodName: 'AddToScore',
        cardIds: Array.from(Input.selectedCardIds)
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

    const cardsWithIds: [Lib.Card, number][] = player.handCardIds.map(cardId => {
        const card = cardsById?.get(cardId);
        if (!card) throw new Error();
        return [card, cardId];
    });

    sortSection(cardsWithIds, 0, player.shareCount, compareFn);
    sortSection(cardsWithIds, player.shareCount, player.revealCount, compareFn);
    sortSection(cardsWithIds, player.revealCount, player.groupCount, compareFn);
    sortSection(cardsWithIds, player.groupCount, cardsWithIds.length, compareFn);
    await reorderCards(
        player.shareCount,
        player.revealCount,
        player.groupCount,
        cardsWithIds.map(([card, index]) => index)
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