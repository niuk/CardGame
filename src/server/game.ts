import { Mutex } from 'async-mutex';
import { customAlphabet } from 'nanoid';
const nanoid = customAlphabet('0123456789', 5);

import * as Lib from '../lib.js';
import Player from './player';

export default class Game {
    public static mutex = new Mutex();
    private static gamesById = new Map<string, Game>();

    public static get(gameId: string): Game {
        const game = this.gamesById.get(gameId);
        if (!game) {
            throw new Error(`there's no game with id ${gameId}`);
        }

        return game;
    }

    private _gameId: string;

    public get gameId(): string {
        return this._gameId;
    }

    public numPlayers: 4 | 5 | 6;
    public players: (Player | undefined)[] = []
    public deckCardsWithOrigins: [Lib.Card, Lib.Origin][] = [];

    public constructor(numPlayers: 4 | 5 | 6, numDecks: number) {
        do {
            this._gameId = nanoid();
        } while (Game.gamesById.has(this.gameId));
        Game.gamesById.set(this.gameId, this);

        this.numPlayers = numPlayers;

        for (let i = 0; i < numPlayers; ++i) {
            this.players[i] = undefined;
        }

        for (let i = 0; i < numDecks; ++i) {
            for (let j = 0; j < 4; ++j) {
                for (let k = 0; k < 13; ++k) {
                    this.deckCardsWithOrigins.push([[j, k + 1], {
                        origin: 'Deck',
                        deckIndex: this.deckCardsWithOrigins.length
                    }]);
                }
            }

            this.deckCardsWithOrigins.push([[Lib.Suit.Joker, Lib.Rank.Big], {
                origin: 'Deck',
                deckIndex: this.deckCardsWithOrigins.length
            }]);
            this.deckCardsWithOrigins.push([[Lib.Suit.Joker, Lib.Rank.Small], {
                origin: 'Deck',
                deckIndex: this.deckCardsWithOrigins.length
            }]);
        }

        this.shuffleDeck();
    }

    public shuffleDeck(): void {
        for (let i = this.deckCardsWithOrigins.length - 1; i >= 1; --i) {
            const j = Math.floor(Math.random() * i);
            //console.log(`${i} <-> ${j}`);

            const iCardWithOrigin = this.deckCardsWithOrigins[i];
            if (!iCardWithOrigin) throw new Error();
            
            const jCardWithOrigin = this.deckCardsWithOrigins[j];
            if (!jCardWithOrigin) throw new Error();

            this.deckCardsWithOrigins[i] = jCardWithOrigin;
            this.deckCardsWithOrigins[j] = iCardWithOrigin;
        }
    }

    public async dispense(): Promise<void> {
        let playerIndex = 0;
        while (this.deckCardsWithOrigins.length > 8) {
            const player = this.players[playerIndex % this.numPlayers];
            if (player) {
                const release = await Game.mutex.acquire();
                try {
                    this.resetCardOrigins();
                    const deckIndex = this.deckCardsWithOrigins.length - 1;
                    const card = this.deckCardsWithOrigins.splice(deckIndex, 1)[0]?.[0];
                    if (!card) {
                        throw new Error(`deck ran out of cards!`);
                    }
                    
                    player.cardsWithOrigins.push([card, { origin: 'Deck', deckIndex }]);
                    this.broadcastStateExceptToPlayerAt(-1);
                } finally {
                    release();
                }

                await Lib.delay(500);
            }

            ++playerIndex;
        }
    }

    public resetCardOrigins(): void {
        let deckIndex = 0;
        for (const deckCardWithOrigin of this.deckCardsWithOrigins) {
            deckCardWithOrigin[1] = { origin: 'Deck', deckIndex };
            ++deckIndex;
        }

        for (const player of this.players) {
            player?.resetCardOrigins();
        }
    }
    
    public getStateForPlayerAt(playerIndex: number): Lib.GameState {
        const playerStates: (Lib.PlayerState | null)[] = [];
        for (const player of this.players) {
            if (!player) {
                playerStates.push(null);
            } else if (player.index === playerIndex) {
                playerStates.push({
                    name: player.name,
                    shareCount: player.shareCount,
                    revealCount: player.revealCount,
                    groupCount: player.groupCount,
                    cardsWithOrigins: player.cardsWithOrigins
                });
            } else {
                playerStates.push({
                    name: player.name,
                    shareCount: player.shareCount,
                    revealCount: player.revealCount,
                    groupCount: player.groupCount,
                    cardsWithOrigins: player.cardsWithOrigins
                        .slice(0, player.revealCount)
                        .concat(player.cardsWithOrigins
                            .slice(player.revealCount)
                            .map(([_, previousLocation]) => [null, previousLocation]))
                });
            }
        }
        
        return {
            gameId: this.gameId,
            deckOrigins: this.deckCardsWithOrigins.map(([_, origin]) => origin),
            playerIndex,
            playerStates
        };
    }

    public broadcastStateExceptToPlayerAt(playerIndex: number): void {
        for (const player of this.players) {
            if (player !== undefined && player.index !== playerIndex) {
                player.ws.send(JSON.stringify({
                    newGameState: this.getStateForPlayerAt(player.index),
                    methodResult: null
                }));
            }
        }
    }
}