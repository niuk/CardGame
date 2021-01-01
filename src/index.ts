import express from "express";
import fs from "fs/promises";
import { customAlphabet } from "nanoid/async";
import WebSocket from "ws";
import { Mutex, Semaphore } from "await-semaphore";

import { Util } from "./util";

const nanoid = customAlphabet('1234567890abcdef', 5);

const app = express();
const port = 8888;

const playersByWebSocket = new Map<WebSocket, Player>();

class Player {
    name: string;
    ws: WebSocket;
    cards: Util.Card[] = [];
    endTurn = new Semaphore(1);
    releaseEndTurn: () => void;
    game: Game;
    index: number;

    constructor(name: string, ws: WebSocket, game: Game, index: number) {
        this.name = name;
        this.ws = ws;
        this.game = game;
        this.index = index;
        this.releaseEndTurn = () => {};
        this.endTurn.acquire().then(releaseEndTurn => {
            this.releaseEndTurn = releaseEndTurn;
        });

        //this.reportWebSocketState();
    }

    /*private async reportWebSocketState() {
        while (true) {
            await Util.delay(1000);
            console.log(`Player("${this.name}").ws.readyState: ${this.ws.readyState}`);
        }
    }*/
}

class Game {
    gameId: string;
    stateMutex = new Mutex();
    playersByIndex: (Player | undefined)[] = [undefined, undefined, undefined, undefined]
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

    get activePlayerIndex(): number {
        return this.turn % this.playersByIndex.length;
    }

    private async run() {
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

                                player.cards.push(card);
                                //console.log(`player ${player.name} given ${card}`);
                            }
                        }
                    }
                }
                
                for (let i = 0; i < this.playersByIndex.length; ++i) {
                    this.sendStateToPlayerWithIndex(i);
                }
            } finally {
                release();
            }

            let activePlayer = this.playersByIndex[this.activePlayerIndex];
            if (full && activePlayer !== undefined) {
                // wait for active player to play cards
                console.log(`waiting for player ${this.activePlayerIndex} ('${activePlayer.name}', ${activePlayer.endTurn.count})...`);
                activePlayer.releaseEndTurn = await activePlayer.endTurn.acquire();
                this.turn++;
            } else {
                // still waiting for playersByIndex to join
                await Util.delay(1000);
            }
        }
    }

    sendStateToPlayerWithIndex(i: number) {
        let otherPlayers: Record<number, Util.OtherPlayer> = {};

        for (let j = 0; j < this.playersByIndex.length; ++j) {
            if (i !== j) {
                let otherPlayer = this.playersByIndex[j];
                if (otherPlayer !== undefined) {
                    otherPlayers[j] = {
                        name: otherPlayer.name,
                        cardCount: otherPlayer.cards.length
                    };
                }
            }
        }

        // send game state
        let player = this.playersByIndex[i];
        if (player !== undefined) {
            player.ws.send(JSON.stringify(<Util.GameStateMessage>{
                playerIndex: i,
                deckCount: this.cardsInDeck.length,
                playerCards: player.cards,
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
            console.log(`message: ${message}`);

            const obj = JSON.parse(message);
            if ('gameId' in obj && typeof obj.gameId === 'string' &&
                'playerName' in obj && typeof obj.playerName === 'string'
            ) {
                const joinMessage = <Util.JoinMessage>obj;
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
                            } else if (player.ws.readyState !== WebSocket.OPEN) {
                                player.name = joinMessage.playerName;
                                player.ws = ws;
                                playersByWebSocket.set(ws, player);
                                game.sendStateToPlayerWithIndex(i);
                                return;
                            }
                        }

                        ws.send(JSON.stringify(<Util.ErrorMessage>{
                            errorDescription: "game is full"
                        }));
                    } finally {
                        release();
                    }
                } else {
                    ws.send(JSON.stringify(<Util.ErrorMessage>{
                        errorDescription: "no such game"
                    }));
                }
            } else if ('cardsToPlay' in obj) {
                const player = playersByWebSocket.get(ws);
                if (player === undefined) {
                    ws.send(JSON.stringify(<Util.ErrorMessage>{
                        errorDescription: "no such player"
                    }));
                } else {
                    const release = await player.game.stateMutex.acquire();
                    try {
                        if (player.game.activePlayerIndex !== player.index) {
                            ws.send(JSON.stringify(<Util.ErrorMessage>{
                                errorDescription: "you are not the active player"
                            }));
                        } else {
                            const playMessage = <Util.PlayMessage>obj;
                            
                            let canPlay = true;
                            let newCards = player.cards.slice();
                            for (let i = 0; i < playMessage.cardsToPlay.length; ++i) {
                                let found = false;
                                for (let j = 0; j < newCards.length; ++j) {
                                    if (JSON.stringify(playMessage.cardsToPlay[i]) === JSON.stringify(newCards[j])) {
                                        newCards.splice(j, 1);
                                        found = true;
                                        break;
                                    }
                                }

                                if (!found) {
                                    ws.send(JSON.stringify(<Util.ErrorMessage>{
                                        errorDescription: `you don't have this card: ${playMessage.cardsToPlay[i]}`
                                    }));
                                    canPlay = false;
                                    break;
                                }
                            }

                            if (canPlay) {
                                console.log(`${player.index} canPlay`);
                                player.game.cardsPlayed = player.game.cardsPlayed.concat(playMessage.cardsToPlay);
                                player.cards = newCards;
                                player.releaseEndTurn();
                            }
                        }

                        player.game.sendStateToPlayerWithIndex(player.index);
                    } finally {
                        release();
                    }
                }
            } else if ('cardsToShuffle' in obj) {
                const player = playersByWebSocket.get(ws);
                if (player === undefined) {
                    ws.send(JSON.stringify(<Util.ErrorMessage>{
                        errorDescription: "not such player"
                    }))
                } else {
                    const release = await player.game.stateMutex.acquire();
                    try {
                        const shuffleMessage = <Util.ShuffleMessage>obj;
        
                        let canShuffle = true;
                        let oldCards = player.cards.slice();
                        let newCards: Util.Card[] = [];
                        for (let i = 0; i < shuffleMessage.cardsToShuffle.length; ++i) {
                            let found = false;
                            for (let j = 0; j < oldCards.length; ++j) {
                                if (JSON.stringify(shuffleMessage.cardsToShuffle[i]) === JSON.stringify(oldCards[j])) {
                                    const [card] = oldCards.splice(j, 1);
                                    if (card === undefined) { throw Error() }
                                    newCards.push(card);
                                    found = true;
                                    break;
                                }
                            }

                            if (!found) {
                                ws.send(JSON.stringify(<Util.ErrorMessage>{
                                    errorDescription: `you don't have this card: ${shuffleMessage.cardsToShuffle[i]}`
                                }));
                                canShuffle = false;
                                break;
                            }
                        }

                        if (canShuffle) {
                            player.cards = newCards;
                        }

                        player.game.sendStateToPlayerWithIndex(player.index);
                    } finally {
                        release();
                    }
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