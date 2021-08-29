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

    public get numPlayers(): number {
        return this.players.filter(player => player != undefined).length;
    }

    public mutex = new Mutex();
    public tick = 0;
    public numDecks = 0;
    public players: (Player | undefined)[] = [undefined, undefined, undefined, undefined]
    public deckCardsWithOrigins: [Lib.Card, Lib.Origin][] = [];
    public dispensing = false;

    public constructor() {
        do {
            this._gameId = nanoid();
        } while (Game.gamesById.has(this.gameId));

        this.addDeck();
        this.resetCardOrigins();
        //this.shuffleDeck();

        Game.gamesById.set(this.gameId, this);
    }

    public addDeck(): void {
        for (const suit of [Lib.Suit.Club, Lib.Suit.Diamond, Lib.Suit.Heart, Lib.Suit.Spade]) {
            for (let rank = Lib.Rank.Small + 1; rank < Lib.Rank.Big; ++rank) {
                this.deckCardsWithOrigins.push([[suit, rank], {
                    origin: 'Deck',
                    deckIndex: this.deckCardsWithOrigins.length
                }]);
            }
        }
        
        this.deckCardsWithOrigins.push([[Lib.Suit.Joker, Lib.Rank.Small], {
            origin: 'Deck',
            deckIndex: this.deckCardsWithOrigins.length
        }]);

        this.deckCardsWithOrigins.push([[Lib.Suit.Joker, Lib.Rank.Big], {
            origin: 'Deck',
            deckIndex: this.deckCardsWithOrigins.length
        }]);

        ++this.numDecks;
    }

    public removeDeck(): void {
        for (const player of this.players) {
            if (player && player.cardsWithOrigins.length > 0) {
                throw new Error(`Can't remove a deck when player ${player.index} has cards!`);
            }
        }

        let index = this.deckCardsWithOrigins.findIndex(([[suit, rank], _]) => suit === Lib.Suit.Joker && rank === Lib.Rank.Big);
        if (index >= 0) {
            this.deckCardsWithOrigins.splice(index, 1);
        } else {
            throw new Error(`Could not find [${Lib.Suit.Joker}, ${Lib.Rank.Big}] in ${this.deckCardsWithOrigins.map(([card, origin]) => `[${card}]`)}`);
        }

        index = this.deckCardsWithOrigins.findIndex(([[suit, rank], _]) => suit === Lib.Suit.Joker && rank === Lib.Rank.Small);
        if (index >= 0) {
            this.deckCardsWithOrigins.splice(index, 1);
        } else {
            throw new Error(`Could not find [${Lib.Suit.Joker}, ${Lib.Rank.Small}] in ${this.deckCardsWithOrigins.map(([card, origin]) => `[${card}]`)}`);
        }

        for (let needleSuit of [Lib.Suit.Club, Lib.Suit.Diamond, Lib.Suit.Heart, Lib.Suit.Spade]) {
            for (let needleRank = Lib.Rank.Small + 1; needleRank < Lib.Rank.Big; ++needleRank) {
                index = this.deckCardsWithOrigins.findIndex(([[suit, rank], _]) => suit === needleSuit && rank === needleRank)
                if (index >= 0) {
                    this.deckCardsWithOrigins.splice(index, 1);
                } else {
                    throw new Error(`Could not find [${needleSuit}, ${needleRank}] in ${this.deckCardsWithOrigins.map(([card, origin]) => `[${card}]`)}`);
                }
            }
        }

        --this.numDecks;

        console.log(`${this.deckCardsWithOrigins.length}`);
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
            do {
                if (this.numPlayers === 4) {
                    if (this.numDecks === 1) {
                        remainder = 6;
                    } else if (this.numDecks === 2) {
                        remainder = 8;
                    } else if (this.numDecks === 3) {
                        remainder = 6;
                    } else if (this.numDecks === 4) {
                        remainder = 8;
                    } else {
                        throw new Error();
                    }
                } else if (this.numPlayers === 5) {
                    if (this.numDecks === 1) {
                        remainder = 9;
                    } else if (this.numDecks === 2) {
                        remainder = 8;
                    } else if (this.numDecks === 3) {
                        remainder = 7;
                    } else if (this.numDecks === 4) {
                        remainder = 6;
                    } else {
                        throw new Error();
                    }
                } else if (this.numPlayers === 6) {
                    if (this.numDecks === 1) {
                        remainder = 6;
                    } else if (this.numDecks === 2) {
                        remainder = 6;
                    } else if (this.numDecks === 3) {
                        remainder = 6;
                    } else if (this.numDecks === 4) {
                        remainder = 6;
                    } else {
                        throw new Error();
                    }
                } else {
                    throw new Error();
                }
    
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
            } while (this.dispensing && this.deckCardsWithOrigins.length > remainder);
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