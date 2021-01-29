import WebSocket from 'ws';

import * as Lib from '../lib';
import Game from './game.js';

export default class Player implements Lib.PlayerState {
    ws: WebSocket;

    game: Game | undefined = undefined;
    index = -1;

    // Lib.PlayerState properties
    name = '';
    shareCount = 0;
    revealCount = 0;
    groupCount = 0;
    cardsWithOrigins: [Lib.Card | null, Lib.Origin][] = [];

    constructor(ws: WebSocket) {
        this.ws = ws;

        ws.onmessage = async message => {
            const method = <Lib.Method>JSON.parse(message.data.toString());
            let errorDescription: string | undefined = undefined
            try {
                this.game?.resetDeckCardOrigins();
                this.resetCardOrigins();
                await this.invoke(method);
            } catch (e) {
                console.error(e);
                
                errorDescription = JSON.stringify(e);
            }

            ws.send(JSON.stringify({
                newGameState: this.game?.getStateForPlayerAt(this.index),
                methodResult: { methodName: method.methodName, errorDescription }
            }));

            this.game?.broadcastStateExceptToPlayerAt(this.index);
        };
        
        ws.onclose = async event => {
            console.log('closed websocket connection');
        };
    }

    private resetCardOrigins() {
        let cardIndex = 0;
        for (const cardWithOrigin of this.cardsWithOrigins) {
            cardWithOrigin[1] = {
                origin: 'Hand',
                playerIndex: this.index,
                cardIndex
            };

            cardIndex++;
        }
    }
    
    private async invoke(method: Lib.Method) {
        if (method.methodName === 'SetPlayerName') {
            this.name = method.playerName;
        } else if (method.methodName === 'NewGame') {
            this.game = new Game();
            this.game.players[0] = this;
            this.index = 0;
            
            console.log(`player '${this.name}' created and joined game '${this.game.gameId}'`);
        } else if (method.methodName === 'JoinGame') {
            this.game = Game.get(method.gameId);

            console.log(`player '${this.name}' is trying to join game '${this.game.gameId}'...`);

            // get unoccupied indices and indices of disconnected players
            const available = [];
            for (let i = 0; i < 4; ++i) {
                const player = this.game.players[i];
                if (!player || player.ws.readyState !== WebSocket.OPEN) {
                    available.push(i);
                }
            }

            // try to join at index of a disconnected player with the same name
            let joined = false;
            for (const i of available) {
                const player = this.game.players[i];
                if (player && player.name === this.name) {
                    this.shareCount = player.shareCount;
                    this.revealCount = player.revealCount;
                    this.groupCount = player.groupCount;
                    this.cardsWithOrigins = player.cardsWithOrigins;
                    this.game.players[i] = this;
                    this.index = i;
                    joined = true;
                    break;
                }
            }

            // just try to join at any available index
            if (!joined) {
                const i = available[0];
                if (i !== undefined) {
                    const player = this.game.players[i];
                    if (player) {
                        this.shareCount = player.shareCount;
                        this.revealCount = player.revealCount;
                        this.groupCount = player.groupCount;
                        this.cardsWithOrigins = player.cardsWithOrigins;
                    }

                    this.game.players[i] = this;
                    this.index = i;
                    joined = true;
                }
            }

            if (!joined) {
                throw new Error(`could not join game '${this.game.gameId}'`);
            }

            console.log(`player '${this.name}' joined game '${this.game.gameId}'`);
        } else {
            if (!this.game) throw new Error('you are not in a game');

            if (method.methodName === 'TakeFromOtherPlayer') {
                const otherPlayer = this.game.players[method.otherPlayerIndex];
                if (otherPlayer === undefined) {
                    throw new Error(`game ${this.game.gameId} has no player at index ${method.otherPlayerIndex}`);
                }

                if (method.cardIndex < 0 || otherPlayer.shareCount <= method.cardIndex) {
                    throw new Error(`player '${otherPlayer.name}' at index ${otherPlayer.index} doesn't have a shared card at index ${method.cardIndex}`);
                }

                if (method.cardIndex < otherPlayer.shareCount) {
                    --otherPlayer.shareCount;
                }

                if (method.cardIndex < otherPlayer.revealCount) {
                    --otherPlayer.revealCount;
                }

                if (method.cardIndex < otherPlayer.groupCount) {
                    --otherPlayer.groupCount;
                }

                const card = otherPlayer.cardsWithOrigins.splice(method.cardIndex, 1)[0]?.[0];
                if (!card) throw new Error();

                this.resetCardOrigins();
                this.cardsWithOrigins.push([card, {
                    origin: 'Hand',
                    playerIndex: method.otherPlayerIndex,
                    cardIndex: method.cardIndex
                }]);

                console.log(`player '${this.name}' at index ${this.index} took card ${card} from player '${otherPlayer.name}' at index ${otherPlayer.index}`);
            } else if (method.methodName === 'DrawFromDeck') {
                const card = this.game.deckCardsWithOrigins.splice(Math.floor(Math.random() * this.game.deckCardsWithOrigins.length), 1)[0]?.[0];
                if (card === undefined) {
                    throw new Error(`deck has no cards (${this.game.deckCardsWithOrigins.length} remaining)`);
                }

                this.cardsWithOrigins.push([card, { origin: 'Deck' }]);
                
                console.log(`player '${this.name}' drew card ${
                    JSON.stringify(card)
                }, cardsWithOrigins: ${JSON.stringify(this.cardsWithOrigins)}`);
            } else if (method.methodName === 'GiveToOtherPlayer') {
                const otherPlayer = this.game.players[method.otherPlayerIndex]
                if (!otherPlayer) throw new Error(`no player at index ${method.otherPlayerIndex}`);

                const disownedCardsWithOrigins = this.disownCardsWithOrigins(method.cardIndicesToGiveToOtherPlayer);

                otherPlayer.shareCount += method.cardIndicesToGiveToOtherPlayer.length;
                otherPlayer.revealCount += method.cardIndicesToGiveToOtherPlayer.length;
                otherPlayer.groupCount += method.cardIndicesToGiveToOtherPlayer.length;

                otherPlayer.cardsWithOrigins.unshift(...disownedCardsWithOrigins);

                console.log(`'${this.name}' gave cards to '${otherPlayer.name}': ${
                    JSON.stringify(disownedCardsWithOrigins)
                }, cardsWithOrigins: ${
                    JSON.stringify(this.cardsWithOrigins)
                }`);
            } else if (method.methodName === 'ReturnToDeck') {
                const disownedCardsWithOrigins = this.disownCardsWithOrigins(method.cardIndicesToReturnToDeck);

                this.game.deckCardsWithOrigins.push(...disownedCardsWithOrigins);

                console.log(`'${this.name}' returned cards: ${
                    JSON.stringify(disownedCardsWithOrigins)
                }, cards: ${
                    JSON.stringify(this.cardsWithOrigins)
                }`);
            } else if (method.methodName === 'Reorder') {
                console.log(method.newCardsWithOrigins);

                const cardFlags: boolean[] = [];
                for (const [card, origin] of method.newCardsWithOrigins) {
                    if (origin.origin !== 'Hand') {
                        throw new Error(`tried to reorder with bad origin: ${JSON.stringify(method.newCardsWithOrigins)}`);
                    }

                    const cardFlag = cardFlags[origin.cardIndex];
                    if (cardFlag !== undefined && cardFlag) {
                        throw new Error(`already moved card at index ${origin.cardIndex}`);
                    }

                    cardFlags[origin.cardIndex] = true;

                    const newCard = this.cardsWithOrigins[origin.cardIndex]?.[0];
                    if (!newCard) {
                        throw new Error(`no card at index ${origin.cardIndex}`);
                    }

                    if (JSON.stringify(card) !== JSON.stringify(newCard)) {
                        throw new Error(`card at index ${origin.cardIndex} doesn't match card at new index`);
                    }
                }

                this.cardsWithOrigins = method.newCardsWithOrigins;
                this.shareCount = method.newShareCount;
                this.revealCount = method.newRevealCount;
                this.groupCount = method.newGroupCount;
                
                console.log(`player '${this.name}' reordered cards: ${
                    JSON.stringify(this.cardsWithOrigins)
                }\r\nshareCount: ${this.shareCount}, revealCount: ${this.revealCount}, groupCount: ${this.groupCount}`);
            } else {
                const _: never = method;
            }
        }
    }

    private disownCardsWithOrigins(cardIndices: number[]): [Lib.Card, Lib.Origin][] {
        // use temporaries so that errors don't result in corrupt state
        const newCardsWithOrigins = this.cardsWithOrigins.slice();
        let newShareCount = this.shareCount;
        let newRevealCount = this.revealCount;
        let newGroupCount = this.groupCount;

        const disownedCards: [Lib.Card, Lib.Origin][] = [];
    
        for (const cardIndex of cardIndices) {
            const cardToMove = this.cardsWithOrigins[cardIndex]?.[0];
            if (!cardToMove) throw new Error();

            if (cardIndex < newShareCount) {
                --newShareCount;
            }

            if (cardIndex < newRevealCount) {
                --newRevealCount;
            }

            if (cardIndex < newGroupCount) {
                --newGroupCount;
            }

            newCardsWithOrigins.splice(cardIndex, 1);
            disownedCards.push([cardToMove, {
                origin: 'Hand',
                playerIndex: this.index,
                cardIndex
            }]);
        }

        this.cardsWithOrigins = newCardsWithOrigins;
        this.shareCount = newShareCount;
        this.revealCount = newRevealCount;
        this.groupCount = newGroupCount;

        return disownedCards;
    }
}
