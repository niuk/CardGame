import express from "express";
import fs from "fs/promises";
import { customAlphabet } from "nanoid/async";
import WebSocket from "ws";
import { Mutex, Semaphore } from "await-semaphore";

import { Lib } from "./lib";

const nanoid = customAlphabet('1234567890abcdef', 5);

const app = express();
const port = 8888;

const playersByWebSocket = new Map<WebSocket, Player>();

class Player {
    name: string;
    ws: WebSocket;
    cards: Lib.Card[] = [];
    revealIndex: number = 0;
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
    players: (Player | undefined)[] = [undefined, undefined, undefined, undefined]
    cardsInDeck: Lib.Card[] = [];
    turn: number = 0;

    constructor(gameId: string) {
        this.gameId = gameId;

        for (let i = 0; i < 4; ++i) {
            for (let j = 1; j <= 13; ++j) {
                this.cardsInDeck.push(Lib.card(i, j));
                this.cardsInDeck.push(Lib.card(i, j));
            }
        }

        this.cardsInDeck.push(Lib.card(Lib.Suit.Joker, Lib.Rank.Big));
        this.cardsInDeck.push(Lib.card(Lib.Suit.Joker, Lib.Rank.Big));
        this.cardsInDeck.push(Lib.card(Lib.Suit.Joker, Lib.Rank.Small));
        this.cardsInDeck.push(Lib.card(Lib.Suit.Joker, Lib.Rank.Small));

        this.run();
    }

    get activePlayerIndex(): number {
        return this.turn % this.players.length;
    }

    private async run() {
        while (true) {
            let full = true;

            const release = await this.stateMutex.acquire();
            try {
                // only execute game logic and advance turns when all player slots are filled
                for (let i = 0; i < this.players.length; ++i) {
                    if (this.players[i] === undefined) {
                        full = false;
                    }
                }

                if (full) {
                    if (this.turn == 0) {
                        // first turn; draw cards for each player
                        for (let i = 0; i < this.players.length; ++i) {
                            let player = this.players[i];
                            if (player === undefined) {
                                throw new Error(`Player at index ${i} left.`);
                            }

                            /*
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
                            */
                        }
                    }
                }
            } finally {
                release();
            }

            let activePlayer = this.players[this.activePlayerIndex];
            if (full && activePlayer !== undefined) {
                // wait for active player to play cards
                console.log(`waiting for player '${activePlayer.name}' in slot ${this.activePlayerIndex}...`);
                activePlayer.releaseEndTurn = await activePlayer.endTurn.acquire();
                this.turn++;
            } else {
                // still waiting for playersByIndex to join
                await Lib.delay(1000);
            }
        }
    }

    public sendStateToPlayerAtIndex(i: number) {
        let otherPlayers: Record<number, Lib.OtherPlayer> = {};

        for (let j = 0; j < this.players.length; ++j) {
            if (i !== j) {
                let otherPlayer = this.players[j];
                if (otherPlayer !== undefined) {
                    otherPlayers[j] = {
                        name: otherPlayer.name,
                        hiddenCardCount: otherPlayer.cards.length - otherPlayer.revealIndex,
                        revealedCards: otherPlayer.cards.slice(otherPlayer.revealIndex),
                    };
                }
            }
        }

        // send game state
        let player = this.players[i];
        if (player !== undefined) {
            player.ws.send(JSON.stringify(<Lib.GameStateMessage>{
                deckCount: this.cardsInDeck.length,
                playerIndex: i,
                playerCards: player.cards,
                revealIndex: player.revealIndex,
                otherPlayers: otherPlayers,
                activePlayerIndex: this.activePlayerIndex
            }));
        }
    }

    public broadcastState() {
        for (let i = 0; i < this.players.length; ++i) {
            this.sendStateToPlayerAtIndex(i);
        }
    }
}

const gamesById = new Map<string, Game>();

const wssPort = port + 1111;
const wss = new WebSocket.Server({ port: wssPort });
console.log(`WebSocket listening on port ${wssPort}`);

function logAndSendError(ws: WebSocket, errorDescription: string) {
    console.error(`ERROR: ${errorDescription}`);
    ws.send(JSON.stringify(<Lib.ErrorMessage>{ errorDescription }))
}

wss.on('connection', function(ws) {
    console.log(`new websocket connection`);

    ws.on('message', async function incoming(message) {
        if (typeof message !== 'string') {
            logAndSendError(ws, 'bad message');
            return;
        }

        console.log(`message: ${message}`);

        const obj = JSON.parse(message);
        if ('gameId' in obj && 'playerName' in obj) {
            const joinMessage = <Lib.JoinMessage>obj;
            const game = gamesById.get(joinMessage.gameId);
            if (game === undefined) {
                logAndSendError(ws, "no such game");
                return;
            }

            console.log(`player '${joinMessage.playerName}' is attempting to join game '${game.gameId}'...`);

            const release = await game.stateMutex.acquire();
            try {
                for (let i = 0; i < game.players.length; ++i) {
                    let player = game.players[i];
                    if (player === undefined) {
                        player = new Player(joinMessage.playerName, ws, game, i);
                        playersByWebSocket.set(ws, player);
                        game.players[i] = player;
                        game.broadcastState();

                        console.log(`player '${joinMessage.playerName}' filled slot ${i} in game '${game.gameId}'`);

                        return;
                    } else if (player.ws.readyState !== WebSocket.OPEN) {
                        player.name = joinMessage.playerName;
                        player.ws = ws;
                        playersByWebSocket.set(ws, player);
                        game.broadcastState();

                        console.log(`player '${joinMessage.playerName}' took over slot ${i} in game '${game.gameId}'`);

                        return;
                    }
                }

                logAndSendError(ws, "game is full");
                return;
            } finally {
                release();
            }
        }
        
        const player = playersByWebSocket.get(ws);
        if (player === undefined) {
            logAndSendError(ws, "you are not in a game");
            return;
        }

        const release = await player.game.stateMutex.acquire();
        try {
            if ('cardsToReorder' in obj) {
                const reorderMessage = <Lib.ReorderMessage>obj;

                let oldCards = player.cards.slice();
                let newCards: Lib.Card[] = [];
                for (let i = 0; i < reorderMessage.cardsToReorder.length; ++i) {
                    for (let j = 0; j < oldCards.length; ++j) {
                        if (reorderMessage.cardsToReorder[i] === oldCards[j]) {
                            newCards.push(...oldCards.splice(j, 1));
                            break;
                        }
                    }
                }

                if (oldCards.length > 0) {
                    logAndSendError(ws, `bad reorder: ${oldCards.map(Lib.cardToString)}`);
                    return;
                }

                console.log(`player '${player.name}' in slot ${player.index} reordered cards: ${
                    JSON.stringify(newCards.map(Lib.cardToString))
                }`);

                player.cards = newCards;
                player.game.sendStateToPlayerAtIndex(player.index);
                return;
            }

            if (player.game.activePlayerIndex !== player.index) {
                logAndSendError(ws, "you are not the active player");
                return;
            }

            if ('drawCard' in obj) {
                const index = Math.floor(Math.random() * player.game.cardsInDeck.length);
                const [card] = player.game.cardsInDeck.splice(index, 1);

                console.log(`player '${player.name}' in slot ${player.index} drew card ${Lib.cardToString(card)}`);

                player.cards.push(card);
                player.releaseEndTurn();
                player.game.broadcastState();
                return;
            }

            if ('cardsToReturn' in obj && 'source' in obj) {
                const returnMessage = <Lib.ReturnMessage>JSON.parse(obj);
                
                const indices: number[] = [];
                for (let i = 0; i < returnMessage.cardsToReturn.length; ++i) {
                    for (let j = 0; j < player.cards.length; ++j) {
                        if (returnMessage.cardsToReturn[i] === player.cards[j]) {
                            indices.push(j);
                            break;
                        }
                    }
                }
            
                if (indices.length < returnMessage.cardsToReturn.length) {
                    logAndSendError(ws, `could not find all cards to return: ${
                        JSON.stringify(returnMessage.cardsToReturn.map(Lib.cardToString))
                    }`);

                    return;
                }
            
                console.log(`'${player.name}' in slot ${player.index} returned cards: ${
                    JSON.stringify(returnMessage.cardsToReturn.map(Lib.cardToString))
                }`);
            
                indices.sort((a, b) => a - b);
                for (let i = 0; i < indices.length; ++i) {
                    player.game.cardsInDeck.push(...player.cards.splice(indices[i] - i, 1))
                }

                return;
            }
        } finally {
            release();
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

            console.log(`created game '${gameId}'`);
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