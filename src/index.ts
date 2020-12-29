import express from "express";
import fs from "fs/promises";
import { nanoid } from "nanoid";
import WebSocket from "ws";
import moment from "moment";

import { Util } from "./util";

const app = express();
const port = 8888;

class Game {
    gameId: string;
    players = new Map<string, Player>();
    cardsInDeck: Util.Card[] = [];
    turn = 0;

    constructor(gameId: string) {
        this.gameId = gameId;

        let cardId = 0;
        for (let i = 0; i < 4; ++i) {
            for (let j = 1; j <= 13; ++j) {
                this.cardsInDeck.push([cardId++, [<Util.Suit>i, <Util.Rank>j]]);
                this.cardsInDeck.push([cardId++, [<Util.Suit>i, <Util.Rank>j]]);
            }
        }

        this.cardsInDeck.push([cardId++, Util.Joker.Big]);
        this.cardsInDeck.push([cardId++, Util.Joker.Big]);
        this.cardsInDeck.push([cardId++, Util.Joker.Small]);
        this.cardsInDeck.push([cardId++, Util.Joker.Small]);

        this.run();
    }

    async run() {
        while (true) {
            await Util.delay(1000);

            // broadcast game state and kick inactive players
            const timedOutPlayers: string[] = [];
            this.players.forEach((player: Player, playerName: string) => {
                const timeout = moment(player.state.timestamp).add(2, 'seconds');
                //console.log(`${gameId}.${player} heartbeat timestamp is ${timestamp.toString()}; timeout at ${timeout.toString()}; moment is ${moment().toString()}`);
    
                if (timeout.isBefore(moment())) {
                    timedOutPlayers.push(playerName);
                }
            });
    
            timedOutPlayers.forEach(player => {
                console.log(`${player} in ${this.gameId} timed out`);
                this.players.delete(player);
            });

            process.stdout.write(`gameId: ${this.gameId}, game.players.size: ${this.players.size}\r`)
            if (this.players.size == 4) {
                if (this.turn == 0) {
                    // draw cards for each player
                    this.players.forEach(player => {
                        for (let i = 0; i < 25; ++i) {
                            const index = Math.floor(Math.random() * this.cardsInDeck.length);
                            const [card] = this.cardsInDeck.splice(index, 1);
                            
                            if (card === undefined) {
                                throw new Error(`Bad index: ${index}, this.cardsInDeck.length: ${this.cardsInDeck.length}`);
                            }

                            player.cardsInHand.push(card);
                            console.log(`player ${player.state.playerName} given ${card}`);
                        }
                    })
                }

                this.turn++;

                this.players.forEach((player, playerName) => {
                    const otherPlayerCardCounts = new Map<string, number>();
                    this.players.forEach((otherPlayer, otherPlayerName) => {
                        if (playerName !== otherPlayerName) {
                            otherPlayerCardCounts.set(otherPlayerName, otherPlayer.cardsInHand.length);
                        }
                    })

                    // send game state
                    player.ws.send(JSON.stringify({
                        cardsInDeck: this.cardsInDeck.length,
                        cardsInHand: player.cardsInHand,
                        otherPlayerCardCounts: otherPlayerCardCounts
                    }));
                });
            }
        }
    }
}

class Player {
    ws: WebSocket;
    state: PlayerState;
    cardsInHand: Util.Card[];

    constructor(ws: WebSocket, state: PlayerState) {
        this.ws = ws;
        this.state = state;
        this.cardsInHand = [];
    }
}

interface PlayerState {
    playerName: string;
    gameId: string;
    timestamp: Date;
}

const gamesById = new Map<string, Game>();

const wssPort = port + 1111;
const wss = new WebSocket.Server({ port: wssPort });
console.log(`WebSocket listening on port ${wssPort}`);

wss.on('connection', function(ws) {
    // new websocket connection
    ws.on('message', function incoming(message) {
        // received heartbeat
        if (typeof message === 'string') {
            const obj = JSON.parse(message);
            if ('timestamp' in obj) {
                const playerState = <PlayerState>obj;
                //console.log(playerState);

                const game = gamesById.get(playerState.gameId);
                if (game !== undefined) {
                    const player = game.players.get(playerState.playerName);
                    if (player === undefined) {
                        game.players.set(playerState.playerName, new Player(ws, playerState));
                    } else {
                        player.state = playerState;
                    }
                }
            } else {
                console.log("asdf");
            }
        }
    });
});

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
                gameId = nanoid(5);
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

app.use(express.static('static'));

app.listen(port, () => {
    console.log(`listening on port ${port}`);
});