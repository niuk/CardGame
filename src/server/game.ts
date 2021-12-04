import { Mutex } from 'async-mutex';
import { customAlphabet } from 'nanoid';
const nanoid = customAlphabet('0123456789', 5);

import * as Lib from '../lib.js';
import Hand from './hand.js';
import Player from './player';

export default class Game {
    static gamesById = new Map<string, Game>();

    public static get(gameId: string): Game {
        const game = this.gamesById.get(gameId);
        if (!game) {
            throw new Error(`there's no game with id ${gameId}`);
        }

        return game;
    }

    _gameId: string;
    get gameId(): string {
        return this._gameId;
    }

    players: (Player | undefined)[] = [undefined, undefined, undefined, undefined];
    get numPlayers(): number {
        return this.players.filter(player => player != undefined).length;
    }

    mutex = new Mutex();
    stationaryCardsById = new Map<number, Lib.Card>();
    movingCardsById = new Map<number, Lib.Card>();
    nextCardId = 0;
    deck = new Hand<number, Lib.Card>(this.stationaryCardsById, this.movingCardsById);

    get numDecks(): number {
        return (this.stationaryCardsById.size + this.movingCardsById.size) / 54;
    }

    dispensing = false;

    public constructor() {
        do {
            this._gameId = nanoid();
        } while (Game.gamesById.has(this.gameId));

        this.addDeck();

        Game.gamesById.set(this.gameId, this);
    }

    public addDeck(): void {
        for (const suit of [Lib.Suit.Club, Lib.Suit.Diamond, Lib.Suit.Heart, Lib.Suit.Spade]) {
            for (let rank = Lib.Rank.Small + 1; rank < Lib.Rank.Big; ++rank) {
                const cardId = this.nextCardId++;
                this.deck.add(cardId, [suit, rank]);
            }
        }

        let cardId = this.nextCardId++;
        this.deck.add(cardId, [Lib.Suit.Joker, Lib.Rank.Small]);

        cardId = this.nextCardId++;
        this.deck.add(cardId, [Lib.Suit.Joker, Lib.Rank.Big]);
    }

    public removeDeck(): void {
        for (let i = 0; i < 54; ++i) {
            const cardId = --this.nextCardId;
            this.deck.remove(cardId);
        }
    }

    public shuffleDeck(): void {
        for (let i = this.deck.length - 1; i >= 1; --i) {
            const j = Math.floor(Math.random() * i);
            //console.log(`${i} <-> ${j}`);

            const [iCardId] = this.deck.splice(i, 1);
            if (iCardId === undefined) {
                throw new Error();
            }

            const [jCardId] = this.deck.splice(j, 1, iCardId);
            if (jCardId === undefined) {
                throw new Error();
            }

            this.deck.splice(i, 0, jCardId);
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
                        return;
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
                        return;
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
                        return;
                    }
                } else {
                    return;
                }
    
                if (playerIndex < 0) {
                    playerIndex = this.numPlayers + playerIndex;
                }

                const player = this.players[playerIndex % this.numPlayers];
                if (player) {
                    const release = await this.mutex.acquire();
                    try {
                        const deckIndex = this.deck.length - 1;
                        const [card] = this.deck.splice(deckIndex, 1);
                        if (card === undefined) {
                            throw new Error(`deck ran out of cards!`);
                        }

                        player.hand.push(card);
                        this.broadcastStateExceptToPlayerAt(-1);
                    } finally {
                        release();
                    }

                    await Lib.delay(500);
                }

                --playerIndex;
            } while (this.dispensing && this.deck.length > remainder);
        } finally {
            this.dispensing = false;
            this.broadcastStateExceptToPlayerAt(-1);
        }
    }
    
    public getStateForPlayerAt(playerIndex: number): Lib.GameState {
        const playerStates: (Lib.PlayerState | null)[] = [];
        for (const player of this.players) {
            if (!player) {
                playerStates.push(null);
            } else {
                playerStates.push({
                    name: player.name,
                    shareCount: player.shareCount,
                    revealCount: player.revealCount,
                    groupCount: player.groupCount,
                    handCardIds: player.handCardIds,
                    present: player.present,
                    notes: player.notes
                } as Lib.PlayerState);
            }
        }

        return {
            gameId: this.gameId,
            deckCardIds: this.deck.slice(),
            cardsById: [...this.stationaryCardsById, ...this.movingCardsById],
            playerIndex,
            playerStates,
            dispensing: this.dispensing
        };
    }

    public broadcastStateExceptToPlayerAt(playerIndex: number): void {
        for (const player of this.players) {
            if (player !== undefined && player.index !== playerIndex) {
                player.ws.send(JSON.stringify(<Lib.ServerResponse>{
                    newGameState: this.getStateForPlayerAt(player.index)
                }));
            }
        }
    }
}