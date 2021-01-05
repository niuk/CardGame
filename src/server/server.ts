import express from "express";
import https from "https";
import fs from "fs/promises";
import { customAlphabet } from "nanoid/async";
import WebSocket from "ws";
import { Mutex, Semaphore } from "await-semaphore";

import * as Lib from "../lib.js"; // would fail to locate the module without ".js"

const nanoid = customAlphabet('1234567890abcdef', 5);

class Player {
    game: Game;
    name: string;
    ws: WebSocket;
    index: number;
    cards: Lib.Card[] = [];
    revealCount: number = 0;
    endTurn = new Semaphore(1);
    releaseEndTurn: () => void;

    constructor(name: string, ws: WebSocket, game: Game, index: number) {
        this.name = name;
        this.ws = ws;
        this.game = game;
        this.index = index;
        this.releaseEndTurn = () => {};
        this.endTurn.acquire().then(releaseEndTurn => {
            this.releaseEndTurn = releaseEndTurn;
        });
    }
    
    sendState() {
        const otherPlayers: (Lib.OtherPlayer | null)[] = [];
        for (const player of this.game.players) {
            if (player === this) {
                otherPlayers.push(null);
            } else {
                otherPlayers.push(<Lib.OtherPlayer>{
                    name: player.name,
                    cardCount: player.cards.length,
                    revealedCards: player.cards.slice(0, player.revealCount)
                });
            }
        }

        // send game state
        this.ws.send(JSON.stringify(<Lib.GameState>{
            deckCount: this.game.cardsInDeck.length,
            activePlayerIndex: this.game.activePlayerIndex,
            playerIndex: this.index,
            playerCards: this.cards,
            playerRevealCount: this.revealCount,
            otherPlayers: otherPlayers,
        }));
    }
}

class Game {
    gameId: string;
    stateMutex = new Mutex();
    players: Player[] = []
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
            let activePlayer = this.players[this.activePlayerIndex];
            if (activePlayer !== undefined) {
                // wait for active player to end their turn
                console.log(`waiting for player '${activePlayer.name}' in slot ${this.activePlayerIndex}...`);
                activePlayer.releaseEndTurn = await activePlayer.endTurn.acquire();
                this.turn++;
            } else {
                // still waiting for playersByIndex to join
                await Lib.delay(1000);
            }
        }
    }

    public broadcastState() {
        for (const player of this.players) {
            player.sendState();
        }
    }
}

const gamesById = new Map<string, Game>();

const playersByWebSocket = new Map<WebSocket, Player>();

function logAndSendError(ws: WebSocket, errorDescription: string) {
    console.error(`ERROR: ${errorDescription}`);
    ws.send(JSON.stringify(<Lib.ErrorMessage>{ errorDescription }))
}

const app = express();

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

async function wsOnMessage(e: WebSocket.MessageEvent) {
    if (e.type !== 'message') {
        logAndSendError(e.target, `bad message type: ${e.type}`);
        return;
    }

    console.log(`message: ${e}`);

    const obj = JSON.parse(e.data.toString());
    if ('gameId' in obj && 'playerName' in obj) {
        const joinMessage = <Lib.JoinMessage>obj;
        const game = gamesById.get(joinMessage.gameId);
        if (game === undefined) {
            logAndSendError(e.target, "no such game");
            return;
        }

        console.log(`player '${joinMessage.playerName}' is attempting to join game '${game.gameId}'...`);

        const release = await game.stateMutex.acquire();
        try {
            let i = 0;
            for (const player of game.players) {
                if (player.ws.readyState !== WebSocket.OPEN) {
                    player.name = joinMessage.playerName;
                    player.ws = e.target;
                    playersByWebSocket.set(e.target, player);
                    game.broadcastState();

                    console.log(`player '${joinMessage.playerName}' took over slot ${i} in game '${game.gameId}'`);

                    return;
                }

                ++i;
            }

            if (game.players.length >= 4) {
                logAndSendError(e.target, "game is full");
                return;
            }

            const player = new Player(joinMessage.playerName, e.target, game, game.players.length);
            playersByWebSocket.set(e.target, player);
            game.players.push(player);
            game.broadcastState();

            console.log(`player '${joinMessage.playerName}' filled slot ${game.players.length - 1} in game '${game.gameId}'`);

            return;
        } finally {
            release();
        }
    }
    
    const player = playersByWebSocket.get(e.target);
    if (player === undefined) {
        logAndSendError(e.target, "you are not in a game");
        return;
    }

    const release = await player.game.stateMutex.acquire();
    try {
        if ('cards' in obj && 'revealCount' in obj) {
            const reorderMessage = <Lib.ReorderMessage>obj;

            let oldCards = player.cards.slice();
            let newCards: Lib.Card[] = [];
            for (let i = 0; i < reorderMessage.cards.length; ++i) {
                for (let j = 0; j < oldCards.length; ++j) {
                    if (reorderMessage.cards[i] === oldCards[j]) {
                        newCards.push(...oldCards.splice(j, 1));
                        break;
                    }
                }
            }

            if (oldCards.length > 0) {
                logAndSendError(e.target, `bad reorder: ${oldCards.map(Lib.cardToString)}`);
                player.sendState();
                return;
            }

            if (player.game.activePlayerIndex === player.index) {
                // only the active player can reveal/hide cards, which advances the turn
                player.releaseEndTurn();
            } else {
                // we must validate that the revealed/hidden cards stay the same for inactive players
                for (let i = 0; i < player.revealCount; ++i) {
                    let found = false;
                    for (let j = 0; j < reorderMessage.revealCount; ++j) {
                        if (player.cards[i] === newCards[j]) {
                            found = true;
                            break;
                        }
                    }

                    if (!found) {
                        logAndSendError(e.target, "you are not the active player");
                        player.sendState();
                        return;
                    }
                }

                for (let i = 0; i < reorderMessage.revealCount; ++i) {
                    let found = false;
                    for (let j = 0; j < player.revealCount; ++j) {
                        if (newCards[i] === player.cards[j]) {
                            found = true;
                            break;
                        }
                    }

                    if (!found) {
                        logAndSendError(e.target, "you are not the active player");
                        player.sendState();
                        return;
                    }
                }
            }
            
            console.log(`player '${player.name}' in slot ${player.index} reordered cards: ${
                JSON.stringify(newCards.map(Lib.cardToString))
            }, revealCount: ${player.revealCount}`);

            player.cards = newCards;
            player.revealCount = reorderMessage.revealCount;
            player.game.broadcastState();

            return;
        }

        if (player.game.activePlayerIndex !== player.index) {
            logAndSendError(e.target, "you are not the active player");
            return;
        }

        if ('draw' in obj) {
            if ((<Lib.DrawMessage>obj).draw !== null) {
                logAndSendError(e.target, 'bad draw message');
                return;
            }

            const index = Math.floor(Math.random() * player.game.cardsInDeck.length);
            const [card] = player.game.cardsInDeck.splice(index, 1);
            if (card === undefined) {
                logAndSendError(e.target, `deck has no card at index ${index}`);
                return;
            }

            console.log(`player '${player.name}' in slot ${player.index} drew card ${Lib.cardToString(card)}`);

            player.cards.push(card);
            player.releaseEndTurn();
            player.game.broadcastState();

            return;
        }

        if ('cardsToReturn' in obj) {
            const returnMessage = <Lib.ReturnMessage>obj;

            const newCards = player.cards.slice();
            let newRevealCount = player.revealCount;
            for (let i = 0; i < returnMessage.cardsToReturn.length; ++i) {
                for (let j = 0; j < newCards.length; ++j) {
                    if (returnMessage.cardsToReturn[i] === newCards[j]) {
                        newCards.splice(j, 1);

                        if (j < newRevealCount) {
                            --newRevealCount;
                        }

                        break;
                    }
                }
            }
        
            if (player.cards.length - newCards.length != returnMessage.cardsToReturn.length) {
                logAndSendError(e.target, `could not find all cards to return: ${
                    JSON.stringify(returnMessage.cardsToReturn.map(Lib.cardToString))
                }`);

                return;
            }
        
            console.log(`'${player.name}' in slot ${player.index} returned cards: ${
                JSON.stringify(returnMessage.cardsToReturn.map(Lib.cardToString))
            }`);

            player.cards = newCards;
            player.revealCount = newRevealCount;
            player.releaseEndTurn();
            player.game.broadcastState();

            return;
        }
    } finally {
        release();
    }
}

(async () => {
    const httpsServer = https.createServer({
        key: await fs.readFile('../key.pem'),
        cert: await fs.readFile('../cert.pem'),
    }, app);

    const webSocketServer = new WebSocket.Server({ server: httpsServer });
    webSocketServer.on('connection', function(ws) {
        console.log(`new websocket connection`);

        ws.onmessage = wsOnMessage;
    });

    const port = 443;
    console.log(`listening on port ${port}...`);
    httpsServer.listen(port);
})();