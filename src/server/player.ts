import WebSocket from 'ws';
import Hand from './hand.js';

import * as Lib from '../lib.js';
import Game from './game.js';

export default class Player implements Lib.PlayerState {
    ws?: WebSocket;
    heartbeat: number;

    get present(): boolean {
        return Date.now() - this.heartbeat < 3 * 1000;
    }

    game: Game | undefined = undefined;
    hand = new Hand<number, Lib.Card>(new Map<number, Lib.Card>(), new Map<number, Lib.Card>());

    public get handCardIds(): number[] {
        return this.hand.slice();
    }

    public get index(): number {
        return this.game?.players.findIndex(player => this === player) ?? -1;
    }

    // Lib.PlayerState properties
    name: string;
    shareCount = 0;
    revealCount = 0;
    groupCount = 0;
    notes = '';

    constructor(name: string, ws?: WebSocket, gameId?: string) {
        this.name = name;
        this.ws = ws;
        this.heartbeat = Date.now();

        if (ws) {
            ws.onmessage = async (event: WebSocket.MessageEvent) => {
                let errorDescription: string | undefined = undefined;

                if (typeof(event.data) === 'string') {
                    if (event.data.startsWith('time = ')) {
                        this.heartbeat = Date.now();
                        if (this.game) {
                            this.game.heartbeat = Date.now();
                        }
                    } else {
                        console.log(`method: ${event.data}`);
                        const method = <Lib.Method>JSON.parse(event.data);
                        const release = await this.game?.mutex.acquire();
                        try {
                            await this.invoke(method);
                        } catch (e) {
                            console.error(e);
                            if (e instanceof Error) {
                                errorDescription = e.message;
                            }
                        } finally {
                            ws.send(JSON.stringify(<Lib.ServerResponse>{
                                newGameState: this.game?.getStateForPlayerAt(this.index),
                                methodResult: { index: method.index, errorDescription }
                            }));

                            this.game?.broadcastStateExceptToPlayerAt(this.index);

                            release?.();
                        }
                    }
                } else {
                    throw new Error();
                }
            };

            ws.onclose = async (event: WebSocket.CloseEvent) => {
                console.log('closed websocket connection: ', event.reason);
                this.game?.broadcastStateExceptToPlayerAt(this.index);
            };
        }

        if (gameId !== undefined) {
            this.joinGame(gameId);
            this.game?.broadcastStateExceptToPlayerAt(-1);
        }

        this.monitor();
    }

    private joinGame(gameId: string): void {
        console.log(`player (re)joining game ${gameId}...`);
        this.game = Game.get(gameId);
        this.hand = new Hand(this.game.stationaryCardsById, this.game.movingCardsById);

        console.log(`looking for existing player with name "${this.name}"...`);
        const i = this.game.players.findIndex(player => player?.name === this.name);
        const player = this.game.players[i];
        if (player) {
            console.log(`found existing player with name "${this.name}" at index ${i}...`);

            player.game = undefined; // disallow absent player from affecting game
            player.ws?.close(); // stop receiving messages from absent player

            this.hand = player.hand;
            this.shareCount = player.shareCount;
            this.revealCount = player.revealCount;
            this.groupCount = player.groupCount;
            this.notes = player.notes;

            this.game.players[i] = this;
            console.log(`player '${this.name}' rejoined ${this.game.gameId}`);
            return;
        }

        console.log('looking for empty slot...');
        for (let i = 0; i < this.game.players.length; ++i) {
            const player = this.game.players[i];
            if (!player || !player.present) {
                const player = this.game.players[i];
                if (player) {
                    player.game = undefined;
                    player.ws?.close();

                    this.hand = player.hand;
                    this.shareCount = player.shareCount;
                    this.revealCount = player.revealCount;
                    this.groupCount = player.groupCount;
                    this.notes = player.notes;
                }

                this.game.players[i] = this;
                console.log(`player '${this.name}' joined '${this.game.gameId} at empty index ${this.index}`);
                return;
            }
        }

        if (this.game.players.length < 9) {
            console.log('joining at new slot...');
            this.game.players[this.game.players.length] = this;
            console.log(`player '${this.name}' joined game '${this.game.gameId}' at new index ${this.index}`);
            return;
        }

        throw new Error(`can't join this game`);
    }

    private async monitor() {
        while (this.present) {
            await Lib.delay(1000);

            this.ws?.send(`time = ${this.heartbeat}`);
        }

        console.log(`'${this.name}' is no longer present`);
    }

    private async invoke(method: Lib.Method) {
        if (method.methodName === 'SetPlayerName') {
            this.name = method.playerName;

            console.log(`player name set to "${method.playerName}"`);
        } else if (method.methodName === 'NewGame') {
            if (method.password !== 'pukepai1990') {
                throw new Error('incorrect password');
            }

            this.game = new Game();
            this.hand = new Hand(this.game.stationaryCardsById, this.game.movingCardsById);
            this.game.players[0] = this;

            console.log(`player '${this.name}' created and joined game '${this.game.gameId}'`);
        } else if (method.methodName === 'JoinGame') {
            this.joinGame(method.gameId);
        } else {
            if (!this.game) {
                throw new Error('you are not in a game');
            }

            if (method.methodName === 'TakeFromOtherPlayer') {
                const otherPlayer = this.game.players[method.playerIndex];
                if (!otherPlayer) {
                    throw new Error(`game ${this.game.gameId} has no player at index ${method.playerIndex}`);
                }

                const cardIndex = otherPlayer.hand.indexOf(method.cardId);
                if (cardIndex === -1) {
                    throw new Error(`player '${otherPlayer.name}' doesn't have card with id ${method.cardId}`);
                }

                if (cardIndex < 0 || otherPlayer.shareCount <= cardIndex) {
                    throw new Error(`player '${otherPlayer.name}' doesn't share card at index ${cardIndex}`);
                }

                if (cardIndex < otherPlayer.shareCount) {
                    --otherPlayer.shareCount;
                }

                if (cardIndex < otherPlayer.revealCount) {
                    --otherPlayer.revealCount;
                }

                if (cardIndex < otherPlayer.groupCount) {
                    --otherPlayer.groupCount;
                }

                const [cardId] = otherPlayer.hand.splice(cardIndex, 1);
                if (cardId === undefined) throw new Error();

                this.hand.push(cardId);
            } else if (method.methodName === 'DrawFromDeck') {
                const deckIndex = this.game.deck.length - 1;
                const [cardId] = this.game.deck.splice(deckIndex, 1);
                if (cardId === undefined) {
                    throw new Error(`deck has no cards (${this.game.deck.length} remaining)`);
                }

                this.hand.push(cardId);
            } else if (method.methodName === 'GiveToOtherPlayer') {
                const otherPlayer = this.game.players[method.playerIndex]
                if (!otherPlayer) throw new Error(`no player at index ${method.playerIndex}`);

                this.disown(method.cardIds);

                otherPlayer.shareCount += method.cardIds.length;
                otherPlayer.revealCount += method.cardIds.length;
                otherPlayer.groupCount += method.cardIds.length;
                otherPlayer.hand.unshift(...method.cardIds);
            } else if (method.methodName === 'ReturnToDeck') {
                this.disown(method.cardIds);
                this.game.deck.push(...method.cardIds);
            } else if (method.methodName === 'Reorder') {
                if (JSON.stringify(this.handCardIds.sort()) !== JSON.stringify(method.newCardIds.slice().sort())) {
                    throw new Error(`new card order isn't a permutation of the old`);
                }

                let i = 0;
                for (const newCard of method.newCardIds) {
                    const cardIndex = this.hand.indexOf(newCard);
                    if (cardIndex === -1) {
                        throw new Error();
                    }

                    this.hand.splice(cardIndex, 1);
                    this.hand.push(newCard);
                    ++i;
                }

                this.shareCount = method.newShareCount;
                this.revealCount = method.newRevealCount;
                this.groupCount = method.newGroupCount;
            } else if (method.methodName === 'ShuffleDeck') {
                this.game.shuffleDeck();
            } else if (method.methodName === 'Dispense') {
                this.game.dispense(this.index);
            } else if (method.methodName === 'Reset') {
                for (const player of this.game.players) {
                    if (!player) continue;

                    const cardIds = player.handCardIds;
                    player.disown(cardIds);
                    this.game.deck.push(...cardIds);
                }

                const cardIds = this.game.score.splice(0, this.game.score.length);
                this.game.deck.push(...cardIds);
            } else if (method.methodName === 'Kick') {
                const player = this.game.players[method.playerIndex];
                if (!player) return;

                const cardIds = player.handCardIds;
                player.disown(player.handCardIds);
                this.game.deck.push(...cardIds);

                this.game.players.splice(method.playerIndex, 1);

                console.log(`'${this.name}' kicked player '${player.name}', returning cards: ${
                    JSON.stringify(cardIds)
                }`);
            } else if (method.methodName === 'SetPlayerNotes') {
                this.notes = method.notes;

                console.log(`'${this.name}' noted: ${method.notes}`);
            } else if (method.methodName === 'AddDeck') {
                this.game.addDeck();

                console.log(`'${this.name}' added a deck.`);
            } else if (method.methodName === 'RemoveDeck') {
                this.game.removeDeck();

                console.log(`'${this.name}' removed a deck.`);
            } else if (method.methodName === 'AddToScore') {
                this.disown(method.cardIds);
                this.game.score.push(...method.cardIds);
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            } else if (method.methodName === 'TakeFromScore') {
                const cardIndex = this.game.score.indexOf(method.cardId);
                if (cardIndex === -1) {
                    throw new Error(`score doesn't have card with id ${method.cardId}`);
                }

                const [cardId] = this.game.score.splice(cardIndex, 1);
                if (cardId === undefined) throw new Error();

                this.hand.push(cardId);
            } else {
                const _: never = method;
            }
        }
    }

    private disown(cardIds: number[]) {
        for (const cardId of cardIds) {
            const cardIndex = this.hand.indexOf(cardId);
            this.hand.splice(cardIndex, 1);

            if (cardIndex < this.shareCount) {
                --this.shareCount;
            }

            if (cardIndex < this.revealCount) {
                --this.revealCount;
            }

            if (cardIndex < this.groupCount) {
                --this.groupCount;
            }
        }
    }
}
