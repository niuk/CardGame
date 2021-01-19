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
    public cardsInDeck: Lib.Card[] = [];

    public constructor() {
        do {
            this._gameId = nanoid();
        } while (Game.gamesById.has(this.gameId));

        Game.gamesById.set(this.gameId, this);

        for (let i = 0; i < 4; ++i) {
            for (let j = 1; j <= 13; ++j) {
                this.cardsInDeck.push([i, j]);
                this.cardsInDeck.push([i, j]);
            }
        }

        this.cardsInDeck.push([Lib.Suit.Joker, Lib.Rank.Big]);
        this.cardsInDeck.push([Lib.Suit.Joker, Lib.Rank.Big]);
        this.cardsInDeck.push([Lib.Suit.Joker, Lib.Rank.Small]);
        this.cardsInDeck.push([Lib.Suit.Joker, Lib.Rank.Small]);
    }

    public addPlayer(player: Player) {
        player.game = this;
        player.index = this.players.length;
        this.players.push(player);
    }

    public broadcastState() {
        for (const player of this.players) {
            player.sendState();
        }
    }
}