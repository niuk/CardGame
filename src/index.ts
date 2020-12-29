import express from "express";
import fs from "fs/promises";
import { customAlphabet } from "nanoid/async";
import WebSocket from "ws";
import { Mutex, Semaphore } from "async-mutex";

import { Util } from "./util";

const nanoid = customAlphabet('1234567890abcdef', 5);

const app = express();
const port = 8888;

class Player {
    name: string;
    ws: WebSocket;
    cardsInHand: Util.Card[] = [];
    endTurn = new Semaphore(1);

    constructor(name: string, ws: WebSocket) {
        this.name = name;
        this.ws = ws;
        this.endTurn.acquire(); // so that it can be waited on
    }
}

class Game {
    gameId: string;
    stateMutex = new Mutex();
    players: (Player | undefined)[] = [undefined, undefined, undefined, undefined]
    cardsInDeck: Util.Card[] = [];
    cardsPlayed: Util.Card[] = [];
    turn: number = 0;

    constructor(gameId: string) {
        this.gameId = gameId;

        for (let i = 0; i < 4; ++i) {
            for (let j = 1; j <= 13; ++j) {
                this.cardsInDeck.push([<Util.Suit>i, <Util.Rank>j]);
                this.cardsInDeck.push([<Util.Suit>i, <Util.Rank>j]);
            }
        }

        this.cardsInDeck.push(Util.Joker.Big);
        this.cardsInDeck.push(Util.Joker.Big);
        this.cardsInDeck.push(Util.Joker.Small);
        this.cardsInDeck.push(Util.Joker.Small);

        this.run();
    }

    private get activePlayerIndex(): number {
        return this.turn % this.players.length;
    }

    private async run() {
        while (true) {
            let full = true;

            // we must allow the endTurn mutex to be acquired before we send the gamestate
            let activePlayer: Player | undefined = undefined;
            while (activePlayer === undefined) {
                console.log(`waiting for player ${this.activePlayerIndex}...`);
                await Util.delay(1000);
                activePlayer = this.players[this.activePlayerIndex];
            }

            console.log(`player ${this.activePlayerIndex} is ${activePlayer.name}`);

            const release = await this.stateMutex.acquire();
            try {
                // only execute game logic and advance turns when all player slots are filled
                for (let i = 0; i < this.players.length; ++i) {
                    if (this.players[i] === undefined) {
                        full = false;
                    }
                }

                console.log(`full: ${full}`);

                if (full) {
                    if (this.turn == 0) {
                        // first turn; draw cards for each player
                        for (let i = 0; i < this.players.length; ++i) {
                            let player = this.players[i];
                            if (player === undefined) {
                                throw new Error(`Player at index ${i} left.`);
                            }

                            // each player gets 25 cards
                            for (let i = 0; i < 25; ++i) {
                                const index = Math.floor(Math.random() * this.cardsInDeck.length);
                                const [card] = this.cardsInDeck.splice(index, 1);
                                
                                if (card === undefined) {
                                    throw new Error(`Bad index: ${index}, this.cardsInDeck.length: ${this.cardsInDeck.length}`);
                                }

                                player.cardsInHand.push(card);
                                console.log(`player ${player.name} given ${card}`);
                            }
                        }
                    }
                }
                
                for (let i = 0; i < this.players.length; ++i) {
                    this.sendStateToPlayerWithIndex(i);
                }
            } finally {
                release();
            }

            if (full) {
                // wait for active player to play cards
                await activePlayer.endTurn.acquire();
            } else {
                // still waiting for players to join
                await Util.delay(1000);
            }
        }
    }

    sendStateToPlayerWithIndex(i: number) {
        let otherPlayers: Record<number, Util.OtherPlayer> = {};

        for (let j = 0; j < this.players.length; ++j) {
            if (i !== j) {
                let otherPlayer = this.players[j];
                if (otherPlayer !== undefined) {
                    otherPlayers[j] = {
                        name: otherPlayer.name,
                        cardCount: otherPlayer.cardsInHand.length
                    };
                }
            }
        }

        // send game state
        let player = this.players[i];
        if (player !== undefined) {
            player.ws.send(JSON.stringify(<Util.GameStateMessage>{
                playerIndex: i,
                cardsInDeck: this.cardsInDeck.length,
                cardsInHand: player.cardsInHand,
                cardsPlayed: this.cardsPlayed,
                otherPlayers: otherPlayers,
                activePlayerIndex: this.activePlayerIndex
            }));
        }
    }
}

const gamesById = new Map<string, Game>();

const wssPort = port + 1111;
const wss = new WebSocket.Server({ port: wssPort });
console.log(`WebSocket listening on port ${wssPort}`);

wss.on('connection', function(ws) {
    console.log(`new websocket connection`);

    ws.on('message', async function incoming(message) {
        if (typeof message === 'string') {
            const obj = JSON.parse(message);
            if ('gameId' in obj && typeof obj.gameId === 'string' &&
                'playerName' in obj && typeof obj.playerName === 'string'
            ) {
                console.log(`joinMessage: ${JSON.stringify(obj)}`);

                const joinMessage = <Util.JoinMessage>obj;
                const game = gamesById.get(joinMessage.gameId);
                if (game !== undefined) {
                    const release = await game.stateMutex.acquire();
                    try {
                        let joined = false;
                        for (let i = 0; i < game.players.length; ++i) {
                            if (game.players[i] === undefined) {
                                game.players[i] = new Player(joinMessage.playerName, ws);
                                joined = true;
                                game.sendStateToPlayerWithIndex(i);
                                break;
                            }
                        }

                        if (!joined) {
                            ws.send(JSON.stringify(<Util.ErrorMessage>{
                                errorDescription: "game is full"
                            }));
                        }
                    } finally {
                        release();
                    }
                } else {
                    ws.send(JSON.stringify(<Util.ErrorMessage>{
                        errorDescription: "no such game"
                    }));
                }
            } else {
                ws.send(JSON.stringify(<Util.ErrorMessage>{
                    errorDescription: "bad message"
                }));
            }
        } else {
            throw new Error(`typeof message === '${typeof message}'`);
        }
    });
});

app.use(express.static('static'));

app.get("/", async (_, response) => {
    response.contentType("text/html").send(await fs.readFile("static/html/lobby.html"));
});

app.get("/game", async (request, response) => {
    try {
        console.log(`playerName=${request.query.playerName}`);
        console.log(`newGame=${request.query.newGame}`);
        response.contentType("text/html");
        response.cookie("playerName", request.query.playerName, { sameSite: "strict"});

        let gameId: string;
        if (request.query.newGame === 'true') {
            console.log(`creating a new game...`)

            do {
                gameId = await nanoid();
            } while (gamesById.has(gameId));

            gamesById.set(gameId, new Game(gameId));
        } else {
            if (typeof request.query.gameId === 'string') {
                console.log("joining an existing game...");
        
                gameId = request.query.gameId;
                if (!gamesById.has(gameId)) {
                    response.status(404);
                    throw { "gameId": gameId };
                }
            } else {
                response.status(400);
                throw { "typeof gameId": typeof request.query.gameId };
            }
        }

        response.cookie("gameId", gameId, { sameSite: "strict"});
        response.send(await fs.readFile("static/html/game.html"));
    } catch (e) {
        response.send(JSON.stringify(e));
    }
});

app.listen(port, () => {
    console.log(`listening on port ${port}`);
});