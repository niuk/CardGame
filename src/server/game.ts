import { Mutex } from 'async-mutex';
import { customAlphabet } from 'nanoid';
const nanoid = customAlphabet('0123456789', 5);

import * as Lib from '../lib.js';
import Player from './player';

export default class Game {
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

    public mutex = new Mutex();
    public tick = 0;
    public numPlayers: 4 | 5 | 6;
    public numDecks: 1 | 2 | 3;
    public players: (Player | undefined)[] = []
    public deckCardsWithOrigins: [Lib.Card, Lib.Origin][] = [];
    public dispensing = false;

    public constructor(numPlayers: 4 | 5 | 6, numDecks: 1 | 2 | 3) {
        do {
            this._gameId = nanoid();
        } while (Game.gamesById.has(this.gameId));
        Game.gamesById.set(this.gameId, this);

        this.numPlayers = numPlayers;
        this.numDecks = numDecks;

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

    public async dispense(playerIndex: number): Promise<void> {
        if (this.dispensing) {
            this.dispensing = false;
            return;
        }

        this.dispensing = true;
        try {
            let remainder: number;
            if (this.numPlayers === 4) {
                if (this.numDecks === 1) {
                    remainder = 6;
                } else if (this.numDecks === 2) {
                    remainder = 8;
                } else if (this.numDecks === 3) {
                    remainder = 8;
                } else {
                    const _: never = this.numDecks;
                    throw new Error();
                }
            } else if (this.numPlayers === 5) {
                if (this.numDecks === 1) {
                    remainder = 9;
                } else if (this.numDecks === 2) {
                    remainder = 8;
                } else if (this.numDecks === 3) {
                    remainder = 7;
                } else {
                    const _: never = this.numDecks;
                    throw new Error();
                }
            } else if (this.numPlayers === 6) {
                if (this.numDecks === 1) {
                    remainder = 6;
                } else if (this.numDecks === 2) {
                    remainder = 6;
                } else if (this.numDecks === 3) {
                    remainder = 6;
                } else {
                    const _: never = this.numDecks;
                    throw new Error();
                }
            } else {
                const _: never = this.numPlayers;
                throw new Error();
            }

            while (this.dispensing && this.deckCardsWithOrigins.length > remainder) {
                if (playerIndex < 0) {
                    playerIndex = this.numPlayers + playerIndex;
                }

                const player = this.players[playerIndex % this.numPlayers];
                if (player) {
                    const release = await this.mutex.acquire();
                    try {
                        this.resetCardOrigins();
                        const deckIndex = this.deckCardsWithOrigins.length - 1;
                        const card = this.deckCardsWithOrigins.splice(deckIndex, 1)[0]?.[0];
                        if (!card) {
                            throw new Error(`deck ran out of cards!`);
                        }
                        
                        player.cardsWithOrigins.push([card, { origin: 'Deck', deckIndex }]);
                        ++this.tick;
                        this.broadcastStateExceptToPlayerAt(-1);
                    } finally {
                        release();
                    }

                    await Lib.delay(500);
                }

                --playerIndex;
            }
        } finally {
            this.dispensing = false;
            this.resetCardOrigins();
            ++this.tick;
            this.broadcastStateExceptToPlayerAt(-1);
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
                    cardsWithOrigins: player.cardsWithOrigins,
                    present: player.present,
                    notes: player.notes
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
                            .map(([_, previousLocation]) => [null, previousLocation])),
                    present: player.present,
                    notes: player.notes
                });
            }
        }
        
        return {
            gameId: this.gameId,
            deckOrigins: this.deckCardsWithOrigins.map(([_, origin]) => origin),
            playerIndex,
            playerStates,
            tick: this.tick,
            dispensing: this.dispensing
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