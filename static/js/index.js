"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const promises_1 = __importDefault(require("fs/promises"));
const async_1 = require("nanoid/async");
const ws_1 = __importDefault(require("ws"));
const await_semaphore_1 = require("await-semaphore");
const util_1 = require("./util");
const nanoid = async_1.customAlphabet('1234567890abcdef', 5);
const app = express_1.default();
const port = 8888;
const playersByWebSocket = new Map();
class Player {
    constructor(name, ws, game, index) {
        this.cardsInHand = [];
        this.endTurn = new await_semaphore_1.Semaphore(1);
        this.name = name;
        this.ws = ws;
        this.game = game;
        this.index = index;
        this.releaseEndTurn = () => { };
        this.endTurn.acquire().then(releaseEndTurn => {
            this.releaseEndTurn = releaseEndTurn;
        });
        //this.reportWebSocketState();
    }
}
class Game {
    constructor(gameId) {
        this.stateMutex = new await_semaphore_1.Mutex();
        this.playersByIndex = [undefined, undefined, undefined, undefined];
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
        return this.turn % this.playersByIndex.length;
    }
    async run() {
        while (true) {
            let full = true;
            const release = await this.stateMutex.acquire();
            try {
                // only execute game logic and advance turns when all player slots are filled
                for (let i = 0; i < this.playersByIndex.length; ++i) {
                    if (this.playersByIndex[i] === undefined) {
                        full = false;
                    }
                }
                console.log(`full: ${full}, turn: ${this.turn}, activePlayerIndex: ${this.activePlayerIndex}`);
                if (full) {
                    if (this.turn == 0) {
                        // first turn; draw cards for each player
                        for (let i = 0; i < this.playersByIndex.length; ++i) {
                            let player = this.playersByIndex[i];
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
                                //console.log(`player ${player.name} given ${card}`);
                            }
                        }
                    }
                }
                for (let i = 0; i < this.playersByIndex.length; ++i) {
                    this.sendStateToPlayerWithIndex(i);
                }
            }
            finally {
                release();
            }
            let activePlayer = this.playersByIndex[this.activePlayerIndex];
            if (full && activePlayer !== undefined) {
                // wait for active player to play cards
                console.log(`waiting for player ${this.activePlayerIndex} (${activePlayer.name}, ${activePlayer.endTurn.count})...`);
                activePlayer.releaseEndTurn = await activePlayer.endTurn.acquire();
                this.turn++;
            }
            else {
                // still waiting for playersByIndex to join
                await util_1.Util.delay(1000);
            }
        }
    }
    sendStateToPlayerWithIndex(i) {
        let otherPlayers = {};
        for (let j = 0; j < this.playersByIndex.length; ++j) {
            if (i !== j) {
                let otherPlayer = this.playersByIndex[j];
                if (otherPlayer !== undefined) {
                    otherPlayers[j] = {
                        name: otherPlayer.name,
                        cardCount: otherPlayer.cardsInHand.length
                    };
                }
            }
        }
        // send game state
        let player = this.playersByIndex[i];
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
            console.log(`message: ${message}`);
            const obj = JSON.parse(message);
            if ('gameId' in obj && typeof obj.gameId === 'string' &&
                'playerName' in obj && typeof obj.playerName === 'string') {
                const joinMessage = obj;
                const game = gamesById.get(joinMessage.gameId);
                if (game !== undefined) {
                    const release = await game.stateMutex.acquire();
                    try {
                        for (let i = 0; i < game.playersByIndex.length; ++i) {
                            let player = game.playersByIndex[i];
                            if (player === undefined) {
                                player = new Player(joinMessage.playerName, ws, game, i);
                                playersByWebSocket.set(ws, player);
                                game.playersByIndex[i] = player;
                                game.sendStateToPlayerWithIndex(i);
                                return;
                            }
                            else if (player.ws.readyState !== ws_1.default.OPEN) {
                                player.name = joinMessage.playerName;
                                player.ws = ws;
                                playersByWebSocket.set(ws, player);
                                game.sendStateToPlayerWithIndex(i);
                                return;
                            }
                        }
                        ws.send(JSON.stringify({
                            errorDescription: "game is full"
                        }));
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
            else if ('cardsToPlay' in obj) {
                const player = playersByWebSocket.get(ws);
                if (player === undefined) {
                    ws.send(JSON.stringify({
                        errorDescription: "no such player"
                    }));
                }
                else {
                    const release = await player.game.stateMutex.acquire();
                    try {
                        if (player.game.activePlayerIndex !== player.index) {
                            ws.send(JSON.stringify({
                                errorDescription: "you are not the active player"
                            }));
                        }
                        else {
                            const playMessage = obj;
                            let canPlay = true;
                            let newCardsInHand = player.cardsInHand.slice();
                            for (let i = 0; i < playMessage.cardsToPlay.length; ++i) {
                                let found = false;
                                for (let j = 0; j < newCardsInHand.length; ++j) {
                                    if (JSON.stringify(playMessage.cardsToPlay[i]) === JSON.stringify(newCardsInHand[j])) {
                                        newCardsInHand.splice(j, 1);
                                        found = true;
                                        break;
                                    }
                                }
                                if (!found) {
                                    ws.send(JSON.stringify({
                                        errorDescription: `you don't have this card: ${playMessage.cardsToPlay[i]}`
                                    }));
                                    canPlay = false;
                                    break;
                                }
                            }
                            if (canPlay) {
                                console.log(`${player.index} canPlay`);
                                player.game.cardsPlayed = player.game.cardsPlayed.concat(playMessage.cardsToPlay);
                                player.cardsInHand = newCardsInHand;
                                player.releaseEndTurn();
                            }
                        }
                        player.game.sendStateToPlayerWithIndex(player.index);
                    }
                    finally {
                        release();
                    }
                }
            }
            else if ('cardsInHand' in obj) {
                const player = playersByWebSocket.get(ws);
                if (player === undefined) {
                    ws.send(JSON.stringify({
                        errorDescription: "not such player"
                    }));
                }
                else {
                    const release = await player.game.stateMutex.acquire();
                    try {
                        const shuffleMessage = obj;
                        let canShuffle = true;
                        let oldCardsInHand = player.cardsInHand.slice();
                        let newCardsInHand = [];
                        for (let i = 0; i < shuffleMessage.cardsInHand.length; ++i) {
                            let found = false;
                            for (let j = 0; j < oldCardsInHand.length; ++j) {
                                if (JSON.stringify(shuffleMessage.cardsInHand[i]) === JSON.stringify(oldCardsInHand[j])) {
                                    const [card] = oldCardsInHand.splice(j, 1);
                                    if (card === undefined) {
                                        throw Error();
                                    }
                                    newCardsInHand.push(card);
                                    found = true;
                                    break;
                                }
                            }
                            if (!found) {
                                ws.send(JSON.stringify({
                                    errorDescription: `you don't have this card: ${shuffleMessage.cardsInHand[i]}`
                                }));
                                canShuffle = false;
                                break;
                            }
                        }
                        if (canShuffle) {
                            player.cardsInHand = newCardsInHand;
                        }
                        player.game.sendStateToPlayerWithIndex(player.index);
                    }
                    finally {
                        release();
                    }
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
