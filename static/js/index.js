"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const promises_1 = __importDefault(require("fs/promises"));
const nanoid_1 = require("nanoid");
const ws_1 = __importDefault(require("ws"));
const moment_1 = __importDefault(require("moment"));
const util_1 = require("./util");
const app = express_1.default();
const port = 8888;
class Game {
    constructor(gameId) {
        this.players = new Map();
        this.cardsInDeck = [];
        this.turn = 0;
        this.gameId = gameId;
        for (let i = 0; i < 4; ++i) {
            for (let j = 1; j <= 13; ++j) {
                this.cardsInDeck.push([i, j]);
                this.cardsInDeck.push([i, j]);
            }
        }
        this.cardsInDeck.push(util_1.Util.Joker.Big);
        this.cardsInDeck.push(util_1.Util.Joker.Big);
        this.cardsInDeck.push(util_1.Util.Joker.Small);
        this.cardsInDeck.push(util_1.Util.Joker.Small);
        this.run();
    }
    async run() {
        while (true) {
            await util_1.Util.delay(1000);
            // broadcast game state and kick inactive players
            const timedOutPlayers = [];
            this.players.forEach((player, playerName) => {
                const timeout = moment_1.default(player.state.timestamp).add(2, 'seconds');
                //console.log(`${gameId}.${player} heartbeat timestamp is ${timestamp.toString()}; timeout at ${timeout.toString()}; moment is ${moment().toString()}`);
                if (timeout.isBefore(moment_1.default())) {
                    timedOutPlayers.push(playerName);
                }
            });
            timedOutPlayers.forEach(player => {
                console.log(`${player} in ${this.gameId} timed out`);
                this.players.delete(player);
            });
            process.stdout.write(`gameId: ${this.gameId}, game.players.size: ${this.players.size}\r`);
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
                    });
                }
                this.turn++;
                this.players.forEach((player, playerName) => {
                    let otherPlayerCardCounts = {};
                    this.players.forEach((otherPlayer, otherPlayerName) => {
                        if (playerName !== otherPlayerName) {
                            otherPlayerCardCounts[otherPlayerName] = otherPlayer.cardsInHand.length;
                        }
                    });
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
    constructor(ws, state) {
        this.ws = ws;
        this.state = state;
        this.cardsInHand = [];
    }
}
const gamesById = new Map();
const wssPort = port + 1111;
const wss = new ws_1.default.Server({ port: wssPort });
console.log(`WebSocket listening on port ${wssPort}`);
wss.on('connection', function (ws) {
    console.log(`new websocket connection from ${ws}`);
    // new websocket connection
    ws.on('message', function incoming(message) {
        // received heartbeat
        if (typeof message === 'string') {
            const obj = JSON.parse(message);
            if ('timestamp' in obj) {
                const playerState = obj;
                console.log(playerState);
                const game = gamesById.get(playerState.gameId);
                if (game !== undefined) {
                    const player = game.players.get(playerState.playerName);
                    if (player === undefined) {
                        game.players.set(playerState.playerName, new Player(ws, playerState));
                    }
                    else {
                        player.ws = ws;
                        player.state = playerState;
                    }
                }
            }
            else {
                console.log("asdf");
            }
        }
    });
});
app.get("/", async (_, response) => {
    response.contentType("text/html").send(await promises_1.default.readFile("static/html/lobby.html"));
});
app.get("/game", async (request, response) => {
    try {
        console.log(`playerName=${request.query.playerName}`);
        console.log(`newGame=${request.query.newGame}`);
        response.contentType("text/html");
        response.cookie("playerName", request.query.playerName, { sameSite: "strict" });
        let gameId;
        if (request.query.newGame === 'true') {
            console.log(`creating a new game...`);
            do {
                gameId = nanoid_1.nanoid(5);
            } while (gamesById.has(gameId));
            gamesById.set(gameId, new Game(gameId));
        }
        else {
            if (typeof request.query.gameId === 'string') {
                console.log("joining an existing game...");
                gameId = request.query.gameId;
                if (!gamesById.has(gameId)) {
                    response.status(404);
                    throw { "gameId": gameId };
                }
            }
            else {
                response.status(400);
                throw { "typeof gameId": typeof request.query.gameId };
            }
        }
        response.cookie("gameId", gameId, { sameSite: "strict" });
        response.send(await promises_1.default.readFile("static/html/game.html"));
    }
    catch (e) {
        response.send(JSON.stringify(e));
    }
});
app.use(express_1.default.static('static'));
app.listen(port, () => {
    console.log(`listening on port ${port}`);
});
