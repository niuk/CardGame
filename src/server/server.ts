import express from "express";
import https from "https";
import fs from "fs/promises";
import { customAlphabet } from "nanoid/async";
import WebSocket from "ws";
import { Semaphore } from "await-semaphore";

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
    players: Player[] = []
    cardsInDeck: Lib.Card[] = [];
    turn: number = 0;

    constructor(gameId: string) {
        this.gameId = gameId;

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

function sendMethodResult(ws: WebSocket, methodName: Lib.MethodName, errorDescription?: string) {
    if (errorDescription !== undefined) {
        console.error(`methodName: ${methodName}, errorDescription: ${errorDescription}}`);
    }

    ws.send(JSON.stringify(<Lib.MethodResult>{ methodName, errorDescription }));
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
            console.log(`creating a new game...`);

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
        console.error(`bad message type: ${e.type}`);
        e.target.send(`bad message type: ${e.type}`);
        return;
    }

    const obj = JSON.parse(e.data.toString());
    if ('gameId' in obj && 'playerName' in obj) {
        const joinGameMessage = <Lib.JoinGameMessage>obj;
        const game = gamesById.get(joinGameMessage.gameId);
        if (game === undefined) {
            sendMethodResult(e.target, 'joinGame', `game '${joinGameMessage.gameId}' does not exist`);
            return;
        }

        console.log(`player '${joinGameMessage.playerName}' is attempting to join game '${game.gameId}'...`);

        let i = 0;
        for (const player of game.players) {
            if (player.ws.readyState !== WebSocket.OPEN) {
                player.name = joinGameMessage.playerName;
                player.ws = e.target;
                playersByWebSocket.set(e.target, player);

                console.log(`player '${joinGameMessage.playerName}' took over slot ${i} in game '${game.gameId}'`);

                sendMethodResult(e.target, 'joinGame');
                game.broadcastState();
                return;
            }

            ++i;
        }

        if (game.players.length >= 4) {
            sendMethodResult(e.target, 'joinGame', `game '${joinGameMessage.gameId}' is full`);
            return;
        }

        const player = new Player(joinGameMessage.playerName, e.target, game, game.players.length);
        playersByWebSocket.set(e.target, player);
        game.players.push(player);

        console.log(`player '${joinGameMessage.playerName}' filled slot ${game.players.length - 1} in game '${game.gameId}'`);

        sendMethodResult(e.target, 'joinGame');
        game.broadcastState();
        return;
    }

    if ('drawCard' in obj) {
        if ((<Lib.DrawCardMessage>obj).drawCard !== null) {
            sendMethodResult(e.target, 'drawCard', 'bad message');
            return;
        }

        const player = playersByWebSocket.get(e.target);
        if (player === undefined) {
            sendMethodResult(e.target, 'drawCard', 'you are not in a game');
            return;
        }

        if (player.game.activePlayerIndex !== player.index) {
            sendMethodResult(e.target, 'drawCard', 'you are not the active player');
            return;
        }

        const index = Math.floor(Math.random() * player.game.cardsInDeck.length);
        const [card] = player.game.cardsInDeck.splice(index, 1);
        if (card === undefined) {
            sendMethodResult(e.target, 'drawCard', 'deck has no cards');
            return;
        }

        console.log(`player '${player.name}' in slot ${player.index} drew card ${JSON.stringify(card)}`);

        sendMethodResult(e.target, 'drawCard');
        player.cards.push(card);
        player.releaseEndTurn();
        player.game.broadcastState();
        return;
    }

    if ('returnCardsToDeck' in obj) {
        const deckMessage = <Lib.ReturnCardsToDeckMessage>obj;

        const player = playersByWebSocket.get(e.target);
        if (player === undefined) {
            sendMethodResult(e.target, 'returnCardsToDeck', 'you are not in a game');
            return;
        }

        if (player.game.activePlayerIndex !== player.index) {
            sendMethodResult(e.target, 'returnCardsToDeck', 'you are not the active player');
            return;
        }

        const newCards = player.cards.slice();
        let newRevealCount = player.revealCount;
        for (let i = 0; i < deckMessage.cardsToReturnToDeck.length; ++i) {
            for (let j = 0; j < newCards.length; ++j) {
                if (JSON.stringify(deckMessage.cardsToReturnToDeck[i]) === JSON.stringify(newCards[j])) {
                    newCards.splice(j, 1);

                    if (j < newRevealCount) {
                        --newRevealCount;
                    }

                    break;
                }
            }
        }
    
        if (player.cards.length - newCards.length != deckMessage.cardsToReturnToDeck.length) {
            sendMethodResult(e.target, 'returnCardsToDeck', `could not find all cards to return: ${
                JSON.stringify(deckMessage.cardsToReturnToDeck.map(card => JSON.stringify(card)))
            }`);

            return;
        }
    
        console.log(`'${player.name}' in slot ${player.index} returned cards: ${
            JSON.stringify(deckMessage.cardsToReturnToDeck.map(card => JSON.stringify(card)))
        }`);

        sendMethodResult(e.target, 'returnCardsToDeck');
        player.cards = newCards;
        player.revealCount = newRevealCount;
        player.releaseEndTurn();
        player.game.broadcastState();
        return;
    }

    if ('reorderedCards' in obj && 'newRevealCount' in obj) {
        const reorderMessage = <Lib.ReorderCardsMessage>obj;

        const player = playersByWebSocket.get(e.target);
        if (player === undefined) {
            sendMethodResult(e.target, 'reorderCards', 'you are not in a game');
            return;
        }

        let newCards: Lib.Card[] = [];
        for (const card of reorderMessage.reorderedCards) {
            for (const oldCard of player.cards) {
                if (JSON.stringify(card) === JSON.stringify(oldCard)) {
                    newCards.push(card);
                }
            }
        }

        if (newCards.length != player.cards.length) {
            sendMethodResult(e.target, 'reorderCards', `bad reorder`);
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
                for (let j = 0; j < reorderMessage.newRevealCount; ++j) {
                    if (JSON.stringify(player.cards[i]) === JSON.stringify(newCards[j])) {
                        found = true;
                        break;
                    }
                }

                if (!found) {
                    sendMethodResult(e.target, 'reorderCards', 'you are not the active player');
                    player.sendState();
                    return;
                }
            }

            for (let i = 0; i < reorderMessage.newRevealCount; ++i) {
                let found = false;
                for (let j = 0; j < player.revealCount; ++j) {
                    if (JSON.stringify(newCards[i]) === JSON.stringify(player.cards[j])) {
                        found = true;
                        break;
                    }
                }

                if (!found) {
                    sendMethodResult(e.target, 'reorderCards', 'you are not the active player');
                    player.sendState();
                    return;
                }
            }
        }
        
        console.log(`player '${player.name}' in slot ${player.index} reordered cards: ${
            JSON.stringify(newCards.map(card => JSON.stringify(card)))
        }, revealCount: ${player.revealCount}`);

        sendMethodResult(e.target, 'reorderCards');
        player.cards = newCards;
        player.revealCount = reorderMessage.newRevealCount;
        player.game.broadcastState();
        return;
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