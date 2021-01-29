import { customAlphabet } from 'nanoid';
const nanoid = customAlphabet('0123456789', 5);

import * as Lib from '../lib.js';
import Player from './player';

export default class Game {
    private static gamesById = new Map<string, Game>();

    public static get(gameId: string) {
        const game = this.gamesById.get(gameId);
        if (game === undefined) {
            throw new Error(`there's no game with id ${gameId}`);
        }

        return game;
    }

    private _gameId: string;

    public get gameId() {
        return this._gameId;
    }

    public players: Player[] = []
    public deckWithOrigins: [Lib.Card, Lib.Origin][] = [];

    public constructor() {
        do {
            this._gameId = nanoid();
        } while (Game.gamesById.has(this.gameId));

        Game.gamesById.set(this.gameId, this);

        for (let i = 0; i < 4; ++i) {
            for (let j = 1; j <= 13; ++j) {
                this.deckWithOrigins.push([[i, j], { origin: 'Deck' }]);
                this.deckWithOrigins.push([[i, j], { origin: 'Deck' }]);
            }
        }

        this.deckWithOrigins.push([[Lib.Suit.Joker, Lib.Rank.Big], { origin: 'Deck' }]);
        this.deckWithOrigins.push([[Lib.Suit.Joker, Lib.Rank.Big], { origin: 'Deck' }]);
        this.deckWithOrigins.push([[Lib.Suit.Joker, Lib.Rank.Small], { origin: 'Deck' }]);
        this.deckWithOrigins.push([[Lib.Suit.Joker, Lib.Rank.Small], { origin: 'Deck' }]);
    }
    
    public getStateForPlayerAt(playerIndex: number): Lib.GameState {
        const playerStates: (Lib.PlayerState | null)[] = [];    
        for (const player of this.players) {
            if (player.index === playerIndex) {
                playerStates.push({
                    name: player.name,
                    shareCount: player.shareCount,
                    revealCount: player.revealCount,
                    groupCount: player.groupCount,
                    cardsWithOrigins: player.cardsWithOrigins
                });
            } else {
                const hidden: [null, Lib.Origin][] = player.cardsWithOrigins
                    .slice(player.revealCount)
                    .map(([_, previousLocation]) => [null, previousLocation]);
                const cardsWithOrigins = player
                    .cardsWithOrigins.slice(0, player.revealCount)
                    .concat(...hidden);
                playerStates.push({
                    name: player.name,
                    shareCount: player.shareCount,
                    revealCount: player.revealCount,
                    groupCount: player.groupCount,
                    cardsWithOrigins
                });
            }
        }
        
        return {
            gameId: this.gameId,
            deckOrigins: this.deckWithOrigins.map(([_, origin]) => origin),
            playerIndex,
            playerStates
        };
    }

    public broadcastStateExceptToPlayerAt(playerIndex: number) {
        for (const player of this.players) {
            if (player.index !== playerIndex) {
                player.ws.send(JSON.stringify({
                    newGameState: this.getStateForPlayerAt(player.index),
                    methodResult: null
                }));
            }
        }
    }
}