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

        ws.onmessage = async messageEvent => {
            const release = await Game.mutex.acquire();
            let errorDescription: string | undefined = undefined;
            const method = <Lib.Method>JSON.parse(messageEvent.data.toString());
            try {
                this.game?.resetCardOrigins();
                await this.invoke(method);
            } catch (e) {
                console.error(e);
                errorDescription = e.message;
            } finally {
                ws.send(JSON.stringify({
                    newGameState: this.game?.getStateForPlayerAt(this.index),
                    methodResult: { methodName: method.methodName, errorDescription }
                }));
    
                this.game?.broadcastStateExceptToPlayerAt(this.index);

                release();
            }
        };
        
        ws.onclose = async closeEvent => {
            console.log('closed websocket connection');
        };
    }

    public resetCardOrigins(): void {
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
            this.game = new Game(method.numPlayers, method.numDecks);
            this.game.players[0] = this;
            this.index = 0;
            
            console.log(`player '${this.name}' created and joined game '${this.game.gameId}'`);
        } else if (method.methodName === 'JoinGame') {
            this.game = Game.get(method.gameId);
            this.game.resetCardOrigins();

            console.log(`player '${this.name}' is trying to join game '${this.game.gameId}'...`);

            let joined = false;

            // get unoccupied indices and indices of disconnected players
            const available = [];
            for (let i = 0; i < this.game.numPlayers; ++i) {
                const player = this.game.players[i];
                if (player === this) {
                    joined = true;
                    available.splice(0, available.length);
                    break;
                }

                if (!player || player.ws.readyState !== WebSocket.OPEN) {
                    available.push(i);
                }
            }

            // try to join at index of a disconnected player with the same name
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

            ++this.game.tick;
            console.log(`player '${this.name}' joined game '${this.game.gameId}' at ${this.index}`);
        } else {
            if (!this.game) {
                throw new Error('you are not in a game');
            }

            if (method.tick !== this.game.tick) {
                throw new Error(`method.tick ${method.tick} != game.tick ${this.game.tick}`);
            }

            if (method.methodName === 'TakeFromOtherPlayer') {
                const otherPlayer = this.game.players[method.playerIndex];
                if (!otherPlayer) {
                    throw new Error(`game ${this.game.gameId} has no player at index ${method.playerIndex}`);
                }

                if (method.cardIndex < 0 || otherPlayer.shareCount <= method.cardIndex) {
                    throw new Error(`player '${otherPlayer.name}' doesn't have a shared card at index ${method.cardIndex}`);
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

                this.cardsWithOrigins.push([card, {
                    origin: 'Hand',
                    playerIndex: method.playerIndex,
                    cardIndex: method.cardIndex
                }]);

                console.log(`player '${this.name}' took card ${card} from player '${otherPlayer.name}'`);
            } else if (method.methodName === 'DrawFromDeck') {
                const deckIndex = this.game.deckCardsWithOrigins.length - 1;
                const card = this.game.deckCardsWithOrigins.splice(deckIndex, 1)[0]?.[0];
                if (!card) {
                    throw new Error(`deck has no cards (${this.game.deckCardsWithOrigins.length} remaining)`);
                }

                this.cardsWithOrigins.push([card, { origin: 'Deck', deckIndex }]);
                
                console.log(`player '${this.name}' drew card ${
                    JSON.stringify(card)
                }, cardsWithOrigins: ${JSON.stringify(this.cardsWithOrigins)}`);
            } else if (method.methodName === 'GiveToOtherPlayer') {
                const otherPlayer = this.game.players[method.playerIndex]
                if (!otherPlayer) throw new Error(`no player at index ${method.playerIndex}`);

                const disownedCardsWithOrigins = this.disownCardsWithOrigins(method.cardIndicesToGiveToOtherPlayer);

                otherPlayer.shareCount += disownedCardsWithOrigins.length;
                otherPlayer.revealCount += disownedCardsWithOrigins.length;
                otherPlayer.groupCount += disownedCardsWithOrigins.length;
                otherPlayer.cardsWithOrigins.unshift(...disownedCardsWithOrigins);

                console.log(
                    `player ${this.index} gave cards to player ${otherPlayer.index}:`, disownedCardsWithOrigins,
                    '\r\ncardsWithOrigins:', this.cardsWithOrigins,
                    'shareCount', this.shareCount,
                    'revealCount', this.revealCount,
                    'groupCount', this.groupCount
                );
            } else if (method.methodName === 'ReturnToDeck') {
                const disownedCardsWithOrigins = this.disownCardsWithOrigins(method.cardIndicesToReturnToDeck);

                this.game.deckCardsWithOrigins.push(...disownedCardsWithOrigins);

                console.log(`'${this.name}' returned cards: ${
                    JSON.stringify(disownedCardsWithOrigins)
                }, cards: ${
                    JSON.stringify(this.cardsWithOrigins)
                }`);
            } else if (method.methodName === 'Reorder') {
                const cardFlags: boolean[] = [];
                const newCardsWithOrigins: [Lib.Card | null, Lib.Origin][] = [];
                for (const cardIndex of method.newOriginIndices) {
                    const cardFlag = cardFlags[cardIndex];
                    if (cardFlag !== undefined && cardFlag) {
                        throw new Error(`already moved card at index ${cardIndex}`);
                    }

                    cardFlags[cardIndex] = true;

                    const newCard = this.cardsWithOrigins[cardIndex]?.[0];
                    if (!newCard) {
                        throw new Error(`no card at index ${cardIndex}`);
                    }

                    newCardsWithOrigins.push([newCard, {
                        origin: 'Hand',
                        playerIndex: this.index,
                        cardIndex
                    }]);
                }

                console.log('cardsWithOrigins', this.cardsWithOrigins);
                console.log('newOriginIndices', method.newOriginIndices);
                console.log('newCardsWithOrigins', newCardsWithOrigins);

                this.cardsWithOrigins = newCardsWithOrigins;
                this.shareCount = method.newShareCount;
                this.revealCount = method.newRevealCount;
                this.groupCount = method.newGroupCount;
                
                console.log(`player '${this.name}' reordered cards: ${
                    JSON.stringify(this.cardsWithOrigins)
                }\r\nshareCount: ${this.shareCount}, revealCount: ${this.revealCount}, groupCount: ${this.groupCount}`);
            } else if (method.methodName === 'ShuffleDeck') {
                this.game.shuffleDeck();
            } else if (method.methodName === 'Dispense') {
                this.game.dispense(this.index);
            } else {
                const _: never = method;
            }

            ++this.game.tick;
        }
    }

    private disownCardsWithOrigins(cardIndices: number[]): [Lib.Card, Lib.Origin][] {
        // use a set to for checking membership
        const cardIndexSet = new Set<number>(cardIndices);

        // the result
        const disownedCards: [Lib.Card, Lib.Origin][] = [];

        // use temporaries so that errors don't result in corrupt state
        const newCardsWithOrigins: [Lib.Card | null, Lib.Origin][] = [];
        let newShareCount = this.shareCount;
        let newRevealCount = this.revealCount;
        let newGroupCount = this.groupCount;

        let cardIndex = 0;
        for (const [card, origin] of this.cardsWithOrigins) {
            if (!card) throw new Error();

            const newOrigin: Lib.Origin = {
                origin: 'Hand',
                playerIndex: this.index,
                cardIndex
            };

            if (cardIndexSet.has(cardIndex)) {
                disownedCards.push([card, newOrigin]);

                if (cardIndex < this.shareCount) {
                    --newShareCount;
                }

                if (cardIndex < this.revealCount) {
                    --newRevealCount;
                }

                if (cardIndex < this.groupCount) {
                    --newGroupCount;
                }
            } else {
                newCardsWithOrigins.push([card, newOrigin]);
            }

            ++cardIndex;
        }

        this.cardsWithOrigins = newCardsWithOrigins;
        this.shareCount = newShareCount;
        this.revealCount = newRevealCount;
        this.groupCount = newGroupCount;

        return disownedCards;
    }
}
