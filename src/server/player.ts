import WebSocket from 'ws';
import Hand from '../hand.js';

import * as Lib from '../lib.js';
import Game from './game.js';

export default class Player implements Lib.PlayerState {
    ws: WebSocket;
    heartbeat: number;

    get present(): boolean {
        return Date.now() - this.heartbeat < 3 * 1000;
    }

    game: Game | undefined = undefined;
    index = -1;
    hand = new Hand<number, Lib.Card>(new Map<number, Lib.Card>(), new Map<number, Lib.Card>());

    public get handCardIds(): number[] {
        return this.hand.slice();
    }

    // Lib.PlayerState properties
    name = '';
    shareCount = 0;
    revealCount = 0;
    groupCount = 0;
    notes = '';

    constructor(ws: WebSocket, rejoin?: {gameId: string, playerIndex: number}) {
        this.ws = ws;
        this.heartbeat = Date.now();

        ws.onmessage = async (event: WebSocket.MessageEvent) => {
            let errorDescription: string | undefined = undefined;

            if (typeof(event.data) === 'string') {
                if (event.data.startsWith('time = ')) {
                    //console.log(`received heartbeat from '${this.name}': ${event.data}`);
                    this.heartbeat = Date.now();
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

        if (rejoin) {
            console.log(`player rejoining game ${rejoin.gameId} at index ${rejoin.playerIndex}`);
            this.game = Game.get(rejoin.gameId);
            this.hand = new Hand(this.game.stationaryCardsById, this.game.movingCardsById);
            const existingPlayer = this.game.players[rejoin.playerIndex];
            if (existingPlayer) {
                existingPlayer.game = undefined; // disallow absent player from affecting game
                existingPlayer.ws.close(); // stop receiving messages for absent player

                // copy all fields
                this.index = existingPlayer.index;
                this.name = existingPlayer.name;
                this.shareCount = existingPlayer.shareCount;
                this.revealCount = existingPlayer.revealCount;
                this.groupCount = existingPlayer.groupCount;
                this.hand = existingPlayer.hand;
                this.notes = existingPlayer.notes;
            }

            this.game.players[rejoin.playerIndex] = this;
            this.game.broadcastStateExceptToPlayerAt(-1);
        }

        this.monitor();
    }

    private async monitor() {
        while (this.present) {
            await Lib.delay(1000);

            // send heartbeat
            //console.log(`sending heartbeat to '${this.name}'...`);
            this.ws.send(`time = ${this.heartbeat}`);
        }

        console.log(`'${this.name}' is no longer present`);
    }
    
    private async invoke(method: Lib.Method) {
        if (method.methodName === 'SetPlayerName') {
            this.name = method.playerName;
        } else if (method.methodName === 'NewGame') {
            this.game = new Game();
            this.hand = new Hand(this.game.stationaryCardsById, this.game.movingCardsById);
            this.game.players[0] = this;
            this.index = 0;
            
            console.log(`player '${this.name}' created and joined game '${this.game.gameId}'`);
        } else if (method.methodName === 'JoinGame') {
            this.game = Game.get(method.gameId);
            this.hand = new Hand(this.game.stationaryCardsById, this.game.movingCardsById);

            console.log(`player '${this.name}' is trying to join game '${this.game.gameId}'...`);

            let joined = false;

            // get unoccupied indices and indices of disconnected players
            const available = [];
            for (let i = 0; i < this.game.players.length; ++i) {
                const player = this.game.players[i];
                if (player === this) {
                    joined = true;
                    break;
                }

                if (!player || !player.present) {
                    available.push(i);
                }
            }

            if (!joined) {
                // try to join at index of a disconnected player with the same name
                for (const i of available) {
                    const player = this.game.players[i];
                    if (player && player.name === this.name) {
                        this.shareCount = player.shareCount;
                        this.revealCount = player.revealCount;
                        this.groupCount = player.groupCount;
                        this.hand = player.hand;
                        this.game.players[i] = this;
                        this.index = i;
                        joined = true;
                        console.log(`player '${this.name}' rejoined '${this.game.gameId} at ${this.index}`);
                        break;
                    }
                }
            }

            if (!joined) {
                // just try to join at any available index
                const i = available[0];
                if (i !== undefined) {
                    const player = this.game.players[i];
                    if (player) {
                        this.shareCount = player.shareCount;
                        this.revealCount = player.revealCount;
                        this.groupCount = player.groupCount;
                        this.hand = player.hand;
                    }

                    this.game.players[i] = this;
                    this.index = i;
                    joined = true;
                    console.log(`player '${this.name}' joined '${this.game.gameId} at empty index ${this.index}`);
                }
            }

            if (!joined) {
                // join as an extra player
                const i = this.game.players.length;
                this.game.players[i] = this;
                this.index = i;
                joined = true;
                console.log(`player '${this.name}' joined game '${this.game.gameId}' at new index ${this.index}`);
            }
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
                if (cardIndex === undefined) {
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
                if (!cardId) throw new Error();

                this.hand.push(cardId);

                console.log(`player '${this.name}' took card ${cardId} from player '${otherPlayer.name}'`);
            } else if (method.methodName === 'DrawFromDeck') {
                const deckIndex = this.game.deck.length - 1;
                const [cardId] = this.game.deck.splice(deckIndex, 1);
                if (!cardId) {
                    throw new Error(`deck has no cards (${this.game.deck.length} remaining)`);
                }

                this.hand.push(cardId);
                
                console.log(`player '${this.name}' drew card ${
                    JSON.stringify(cardId)
                }, cards: ${JSON.stringify(this.hand)}`);
            } else if (method.methodName === 'GiveToOtherPlayer') {
                const otherPlayer = this.game.players[method.playerIndex]
                if (!otherPlayer) throw new Error(`no player at index ${method.playerIndex}`);

                this.disown(method.cardIds);

                otherPlayer.shareCount += method.cardIds.length;
                otherPlayer.revealCount += method.cardIds.length;
                otherPlayer.groupCount += method.cardIds.length;
                otherPlayer.hand.unshift(...method.cardIds);

                console.log(
                    `player ${this.index} gave cards to player ${otherPlayer.index}:`, method.cardIds,
                    '\r\ncards:', this.handCardIds,
                    'shareCount', this.shareCount,
                    'revealCount', this.revealCount,
                    'groupCount', this.groupCount
                );
            } else if (method.methodName === 'ReturnToDeck') {
                this.disown(method.cardIds);

                this.game.deck.push(...method.cardIds);

                console.log(`'${this.name}' returned cards: ${
                    JSON.stringify(method.cardIds)
                }, cards: ${
                    JSON.stringify(this.handCardIds)
                }`);
            } else if (method.methodName === 'Reorder') {
                if (JSON.stringify(this.handCardIds.sort()) !== JSON.stringify(method.newCardIds.sort())) {
                    throw new Error(`new card order isn't a permutation of the old`);
                }

                for (const newCard of method.newCardIds) {
                    const cardIndex = this.hand.indexOf(newCard);
                    if (cardIndex === undefined) {
                        throw new Error();
                    }

                    this.hand.splice(cardIndex, 1);
                    this.hand.push(newCard);
                }

                this.shareCount = method.newShareCount;
                this.revealCount = method.newRevealCount;
                this.groupCount = method.newGroupCount;

                console.log(`player '${this.name}' reordered cards: ${
                    JSON.stringify(this.handCardIds)
                }\r\nshareCount: ${this.shareCount}, revealCount: ${this.revealCount}, groupCount: ${this.groupCount}`);
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

                    console.log(`'${player.name}' returned cards (reset): ${
                        JSON.stringify(cardIds)
                    }, cards: ${
                        JSON.stringify(player.handCardIds)
                    }`);
                }
            } else if (method.methodName === 'Kick') {
                const player = this.game.players[method.playerIndex];
                if (!player) return;

                const cardIds = player.handCardIds;
                player.disown(player.handCardIds);
                this.game.deck.push(...cardIds);

                this.game.players.splice(method.playerIndex, 1);
                for (let i = 0; i < this.game.players.length; ++i) {
                    const player = this.game.players[i];
                    if (player) {
                        player.index = i;
                    }
                }

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
            } else {
                const _: never = method;
            }
        }
    }

    private disown(cardIds: number[]) {
        const cardIndices = [];
        for (const cardId of cardIds) {
            const cardIndex = this.hand.indexOf(cardId);
            if (cardIndex === undefined) {
                throw new Error(`player ${this.name} doesn't own card ${cardId}`);
            }

            cardIndices.push(cardIndex);
        }

        for (const cardIndex of cardIndices) {
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
