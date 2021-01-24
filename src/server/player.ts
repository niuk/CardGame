import WebSocket from 'ws';

import * as Lib from '../lib';
import Game from './game.js';

export default class Player {
    ws: WebSocket;

    game: Game | undefined = undefined;
    name = '';
    index = -1;
    cards: Lib.Card[] = [];
    shareCount: number = 0;
    revealCount: number = 0;

    constructor(ws: WebSocket) {
        this.ws = ws;

        ws.onmessage = async message => {
            const method = <Lib.Method>JSON.parse(message.data.toString());
            let errorDescription: string | undefined = undefined
            try {
                await this.invoke(method);
            } catch (e) {
                errorDescription = JSON.stringify(e);
            }
            
            ws.send(JSON.stringify(<Lib.Result>{
                methodName: method.methodName,
                errorDescription
            }));

            this.game?.broadcastState();
        };
        
        ws.onclose = async event => {
            console.log('closed websocket connection');

            this.leaveGame();
        };
    }

    public sendState() {
        if (!this.game) {
            throw new Error(`player '${this.name}' is not in a game`);
        }

        const playerStates: (Lib.PlayerState | null)[] = [];    
        for (const otherPlayer of this.game.players) {
            if (this === otherPlayer) {
                playerStates.push({
                    name: this.name,
                    shareCount: this.shareCount,
                    revealCount: this.revealCount,
                    totalCount: this.cards.length,
                    cards: this.cards
                });
            } else {
                playerStates.push({
                    name: otherPlayer.name,
                    shareCount: otherPlayer.shareCount,
                    revealCount: otherPlayer.revealCount,
                    totalCount: otherPlayer.cards.length,
                    cards: otherPlayer.cards.slice(0, otherPlayer.revealCount)
                });
            }
        }

        this.ws.send(JSON.stringify(<Lib.GameState>{
            gameId: this.game.gameId,
            deckCount: this.game.cardsInDeck.length,
            playerIndex: this.index,
            playerStates
        }));
    }

    private async invoke(method: Lib.Method) {
        if (method.methodName === 'SetPlayerName') {
            this.name = method.playerName;
        } else if (method.methodName === 'NewGame') {
            this.game = new Game();
            this.game.players.push(this);
            this.index = 0;
        } else if (method.methodName === 'JoinGame') {
            this.game = Game.get(method.gameId);

            for (let i = 0; i < this.game.players.length; ++i) {
                const player = this.game.players[i];
                if (player !== undefined && player.name === this.name) {
                    this.game.players[i] = this;
                    this.index = i;
                }
            }

            for (let i = 0; i < this.game.players.length; ++i) {
                const player = this.game.players[i];
                if (this.game.players[i] === undefined) {
                    this.game.players[i] = this;
                    this.index = i;
                }
            }

            throw new Error(`could not join game '${this.game.gameId}'`);
        } else {
            if (!this.game) throw new Error('you are not in a game');

            if (method.methodName === 'TakeCard') {
                const otherPlayer = this.game.players[method.otherPlayerIndex];
                if (otherPlayer === undefined) {
                    throw new Error(`game ${this.game.gameId} has no player at index ${method.otherPlayerIndex}`);
                }

                if (method.cardIndex < 0 || otherPlayer.shareCount <= method.cardIndex) {
                    throw new Error(`player '${otherPlayer.name}' at index ${otherPlayer.index} doesn't have a shared card at index ${method.cardIndex}`);
                }

                if (JSON.stringify(otherPlayer.cards[method.cardIndex]) !== JSON.stringify(method.card)) {
                    throw new Error(`player '${otherPlayer.name}' at index ${otherPlayer.index} does not have card ${JSON.stringify(method.card)} at ${method.cardIndex}`);
                }

                if (method.cardIndex < otherPlayer.shareCount) {
                    --otherPlayer.shareCount;
                }

                if (method.cardIndex < otherPlayer.revealCount) {
                    --otherPlayer.revealCount;
                }

                otherPlayer.cards.splice(method.cardIndex, 1);
                this.cards.push(method.card);

                console.log(`player '${this.name}' at index ${this.index} took card ${method.card} from player '${otherPlayer.name}' at index ${otherPlayer.index}`);
            } else if (method.methodName === 'DrawCard') {
                const card = this.game.cardsInDeck.splice(Math.floor(Math.random() * this.game.cardsInDeck.length), 1)[0];
                if (card === undefined) {
                    throw new Error(`deck has no cards (${this.game.cardsInDeck.length} remaining)`);
                }

                this.cards.push(card);
                
                console.log(`player '${this.name}' in slot ${this.index} drew card ${
                    JSON.stringify(card)
                }, cards: ${JSON.stringify(this.cards)}`);
            } else if (method.methodName === 'ReturnCardsToDeck') {
                const newCards = this.cards.slice();
                let newShareCount = this.shareCount;
                let newRevealCount = this.revealCount;
                for (let i = 0; i < method.cardsToReturnToDeck.length; ++i) {
                    for (let j = 0; j < newCards.length; ++j) {
                        if (JSON.stringify(method.cardsToReturnToDeck[i]) === JSON.stringify(newCards[j])) {
                            newCards.splice(j, 1);

                            if (j < newShareCount) {
                                --newShareCount;
                            }

                            if (j < newRevealCount) {
                                --newRevealCount;
                            }

                            break;
                        }
                    }
                }

                if (this.cards.length - newCards.length != method.cardsToReturnToDeck.length) {
                    throw new Error(`could not find all cards to return: ${
                        JSON.stringify(method.cardsToReturnToDeck)
                    }, cards.length: ${this.cards.length}, newCards.length: ${newCards.length}`);
                }

                this.cards = newCards;
                this.shareCount = newShareCount;
                this.revealCount = newRevealCount;
                this.game.cardsInDeck.push(...method.cardsToReturnToDeck);

                console.log(`'${this.name}' in slot ${this.index} returned cards: ${
                    JSON.stringify(method.cardsToReturnToDeck)
                }, cards: ${
                    JSON.stringify(this.cards)
                }`);        
            } else if (method.methodName === 'ReorderCards') {
                let oldCards = this.cards.slice();
                let newCards: Lib.Card[] = [];
                for (const card of method.reorderedCards) {
                    for (let i = 0; i < oldCards.length; ++i) {
                        if (JSON.stringify(card) === JSON.stringify(oldCards[i])) {
                            newCards.push(...oldCards.splice(i, 1));
                            break;
                        }
                    }
                }

                if (newCards.length != this.cards.length || oldCards.length > 0) {
                    throw new Error(`bad reorder:\r\n${
                        JSON.stringify(method.reorderedCards)
                    }\r\nnewCards.length: ${
                        newCards.length
                    }\r\ncards.length: ${
                        this.cards.length
                    }\r\noldCards.length: ${oldCards.length}`);
                }

                this.cards = newCards;
                this.shareCount = method.newShareCount;
                this.revealCount = method.newRevealCount;
                
                console.log(`player '${this.name}' in slot ${this.index} reordered cards:\r\n${
                    JSON.stringify(this.cards.map(card => JSON.stringify(card)))
                }\r\nshareCount: ${this.shareCount}, revealCount: ${this.revealCount}`);
            } else {
                const _: never = method;
            }
        }
    }

    private leaveGame() {
        if (this.game) {
            const index = this.game.players.indexOf(this);
            if (index >= 0) {
                this.game.players.splice(index, 1);
                this.index = -1;
                this.game = undefined;
            }
        }
    }
}
