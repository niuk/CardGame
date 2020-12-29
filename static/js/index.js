"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const promises_1 = __importDefault(require("fs/promises"));
const async_1 = require("nanoid/async");
const ws_1 = __importDefault(require("ws"));
const async_mutex_1 = require("async-mutex");
const util_1 = require("./util");
const nanoid = async_1.customAlphabet('1234567890abcdef', 5);
const app = express_1.default();
const port = 8888;
class Player {
    constructor(name, ws) {
        this.cardsInHand = [];
        this.endTurn = new async_mutex_1.Semaphore(1);
        this.name = name;
        this.ws = ws;
        this.endTurn.acquire(); // so that it can be waited on
    }
}
class Game {
    constructor(gameId) {
        this.stateMutex = new async_mutex_1.Mutex();
        this.players = [undefined, undefined, undefined, undefined];
        this.cardsInDeck = [];
        this.cardsPlayed = [];
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
    get activePlayerIndex() {
        return this.turn % this.players.length;
    }
    async run() {
        while (true) {
            let full = true;
            // we must allow the endTurn mutex to be acquired before we send the gamestate
            let activePlayer = undefined;
            while (activePlayer === undefined) {
                console.log(`waiting for player ${this.activePlayerIndex}...`);
                await util_1.Util.delay(1000);
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
            }
            finally {
                release();
            }
            if (full) {
                // wait for active player to play cards
                await activePlayer.endTurn.acquire();
            }
            else {
                // still waiting for players to join
                await util_1.Util.delay(1000);
            }
        }
    }
    sendStateToPlayerWithIndex(i) {
        let otherPlayers = {};
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
            player.ws.send(JSON.stringify({
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
const gamesById = new Map();
const wssPort = port + 1111;
const wss = new ws_1.default.Server({ port: wssPort });
console.log(`WebSocket listening on port ${wssPort}`);
wss.on('connection', function (ws) {
    console.log(`new websocket connection`);
    ws.on('message', async function incoming(message) {
        if (typeof message === 'string') {
            const obj = JSON.parse(message);
            if ('gameId' in obj && typeof obj.gameId === 'string' &&
                'playerName' in obj && typeof obj.playerName === 'string') {
                console.log(`joinMessage: ${JSON.stringify(obj)}`);
                const joinMessage = obj;
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
                            ws.send(JSON.stringify({
                                errorDescription: "game is full"
                            }));
                        }
                    }
                    finally {
                        release();
                    }
                }
                else {
                    ws.send(JSON.stringify({
                        errorDescription: "no such game"
                    }));
                }
            }
            else {
                ws.send(JSON.stringify({
                    errorDescription: "bad message"
                }));
            }
        }
        else {
            throw new Error(`typeof message === '${typeof message}'`);
        }
    });
});
app.use(express_1.default.static('static'));
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
                gameId = await nanoid();
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
app.listen(port, () => {
    console.log(`listening on port ${port}`);
});
