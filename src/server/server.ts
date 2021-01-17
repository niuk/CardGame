import express from "express";
import https from "https";
import fs from "fs/promises";
import { customAlphabet } from "nanoid/async";
import WebSocket from "ws";
//import { Semaphore } from "await-semaphore";

import * as Lib from "../lib.js"; // would fail to locate the module without ".js"

const nanoid = customAlphabet('1234567890abcdef', 5);

class Player {
    game: Game;
    name: string;
    ws: WebSocket;
    index: number;
    //state: Lib.PlayerState;
    cards: Lib.Card[] = [];
    shareCount: number = 0;
    revealCount: number = 0;

    constructor(name: string, ws: WebSocket, game: Game, index: number) {
        this.name = name;
        this.ws = ws;
        this.game = game;
        this.index = index;
        //this.state = "Wait";
    }
    
    sendState() {
        const otherPlayers: (Lib.OtherPlayer | null)[] = [];
        for (const player of this.game.players) {
            if (player === this) {
                otherPlayers.push(null);
            } else {
                otherPlayers.push(<Lib.OtherPlayer>{
                    name: player.name,
                    shareCount: player.shareCount,
                    revealedCards: player.cards.slice(0, player.revealCount),
                    cardCount: player.cards.length,
                    //state: player.state
                });
            }
        }

        // send game state
        this.ws.send(JSON.stringify(<Lib.GameState>{
            deckCount: this.game.cardsInDeck.length,
            playerIndex: this.index,
            playerCards: this.cards,
            playerShareCount: this.shareCount,
            playerRevealCount: this.revealCount,
            //playerState: this.state,
            otherPlayers: otherPlayers,
        }));
    }
}

class Game {
    gameId: string;
    players: Player[] = []
    cardsInDeck: Lib.Card[] = [];
    //turn: number = 0;

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

    private async run() {
        while (this.players.length === 0) {
            await Lib.delay(100);
        }

        /*
        for (this.turn = 0; ; ++this.turn) {
            for (let i = 0; i < this.players.length; ++i) {
                const player = this.players[i];
                if (player === undefined) throw new Error();
                
                if (this.turn % this.players.length === i) {
                    console.log(`active player is: ${player.name}`);

                    player.state = { type: "Active", activeTime: Date.now() };
                } else {
                    player.state = "Wait";
                }
            }

            this.broadcastState();

            let waiting: boolean;
            do {
                await Lib.delay(100);

                waiting = false;
                for (const player of this.players) {
                    if (player.state !== "Wait" &&
                        player.state !== "Proceed" &&
                        player.state !== "Ready" &&
                        player.state.activeTime + Lib.activeCooldown < Date.now()
                    ) {
                        player.state = "Ready";
                        player.sendState();
                    }

                    if (player.state !== "Ready" && player.state !== "Proceed") {
                        waiting = true;
                    }
                }
            } while (waiting);
        }
        */
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

function wsOnMessage(e: WebSocket.MessageEvent) {
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

    if ('otherPlayerIndex' in obj && 'card' in obj) {
        const takeCardMessage = <Lib.TakeCardMessage>obj;

        const player = playersByWebSocket.get(e.target);
        if (player === undefined) {
            sendMethodResult(e.target, 'takeCard', 'you are not in a game');
            return;
        }

        const otherPlayer = player.game.players[takeCardMessage.otherPlayerIndex];
        if (otherPlayer === undefined) {
            sendMethodResult(e.target, 'takeCard', `player with index ${takeCardMessage.otherPlayerIndex} doesn't exist`);
            return;
        }

        if (takeCardMessage.cardIndex < 0 || otherPlayer.shareCount <= takeCardMessage.cardIndex) {
            sendMethodResult(e.target, 'takeCard', `player '${otherPlayer.name}' at index ${takeCardMessage.otherPlayerIndex} doesn't have a shared card at index ${takeCardMessage.cardIndex}`);
            return;
        }

        if (JSON.stringify(otherPlayer.cards[takeCardMessage.cardIndex]) !== JSON.stringify(takeCardMessage.card)) {
            console.log(`have: ${otherPlayer.cards[takeCardMessage.cardIndex]}`);
            console.log(`want: ${takeCardMessage.card}`);
            sendMethodResult(e.target, 'takeCard', `player '${otherPlayer.name}' at index ${takeCardMessage.otherPlayerIndex} does not have card ${JSON.stringify(takeCardMessage.card)} at ${takeCardMessage.cardIndex}`);
            return;
        }

        console.log(`player '${player.name}' at index ${player.index} took card ${takeCardMessage.card} from player '${otherPlayer.name}' at index ${otherPlayer.index}`);

        sendMethodResult(e.target, 'takeCard');

        if (takeCardMessage.cardIndex < otherPlayer.shareCount) {
            --otherPlayer.shareCount;
        }

        if (takeCardMessage.cardIndex < otherPlayer.revealCount) {
            --otherPlayer.revealCount;
        }

        otherPlayer.cards.splice(takeCardMessage.cardIndex, 1);
        player.cards.push(takeCardMessage.card);
        player.game.broadcastState();
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

        /*if (player.state === "Wait" || player.state === "Proceed") {
            sendMethodResult(e.target, 'drawCard', 'you are not the active player');
            return;
        }*/

        const index = Math.floor(Math.random() * player.game.cardsInDeck.length);
        const card = player.game.cardsInDeck.splice(index, 1)[0];
        if (card === undefined) {
            sendMethodResult(e.target, 'drawCard', 'deck has no cards');
            return;
        }

        console.log(`player '${player.name}' in slot ${player.index} drew card ${JSON.stringify(card)}`);

        sendMethodResult(e.target, 'drawCard');
        //player.state = { type: "Active", activeTime: Date.now() };
        player.cards.push(card);
        player.game.broadcastState();
        return;
    }

    if ('cardsToReturnToDeck' in obj) {
        const returnCardsToDeckMessage = <Lib.ReturnCardsToDeckMessage>obj;

        const player = playersByWebSocket.get(e.target);
        if (player === undefined) {
            sendMethodResult(e.target, 'returnCardsToDeck', 'you are not in a game');
            return;
        }

        /*if (player.state === "Wait" || player.state === "Proceed") {
            sendMethodResult(e.target, 'returnCardsToDeck', 'you are not the active player');
            return;
        }*/

        const newCards = player.cards.slice();
        let newShareCount = player.shareCount;
        let newRevealCount = player.revealCount;
        for (let i = 0; i < returnCardsToDeckMessage.cardsToReturnToDeck.length; ++i) {
            for (let j = 0; j < newCards.length; ++j) {
                if (JSON.stringify(returnCardsToDeckMessage.cardsToReturnToDeck[i]) === JSON.stringify(newCards[j])) {
                    newCards.splice(j, 1);

                    if (j < newShareCount) {
                        --newShareCount;
                    }

                    if (j < newRevealCount) {
                        --newRevealCount;
                    }

                    break;
                }
            }
        }
    
        if (player.cards.length - newCards.length != returnCardsToDeckMessage.cardsToReturnToDeck.length) {
            sendMethodResult(e.target, 'returnCardsToDeck', `could not find all cards to return: ${
                JSON.stringify(returnCardsToDeckMessage.cardsToReturnToDeck.map(card => JSON.stringify(card)))
            }`);

            return;
        }
    
        console.log(`'${player.name}' in slot ${player.index} returned cards: ${
            JSON.stringify(returnCardsToDeckMessage.cardsToReturnToDeck.map(card => JSON.stringify(card)))
        }`);

        sendMethodResult(e.target, 'returnCardsToDeck');
        //player.state = { type: "Active", activeTime: Date.now() };
        player.cards = newCards;
        player.shareCount = newShareCount;
        player.revealCount = newRevealCount;
        player.game.cardsInDeck.push(...returnCardsToDeckMessage.cardsToReturnToDeck);
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

        let oldCards = player.cards.slice();
        let newCards: Lib.Card[] = [];
        for (const card of reorderMessage.reorderedCards) {
            for (let i = 0; i < oldCards.length; ++i) {
                if (JSON.stringify(card) === JSON.stringify(oldCards[i])) {
                    newCards.push(...oldCards.splice(i, 1));
                    break;
                }
            }
        }

        if (newCards.length != player.cards.length || oldCards.length > 0) {
            sendMethodResult(e.target, 'reorderCards', `bad reorder:\r\n${JSON.stringify(reorderMessage.reorderedCards)}\r\nnewCards.length: ${newCards.length}\r\nnewCards: ${JSON.stringify(newCards)}\r\nplayer.cards.length: ${player.cards.length}, player.cards: ${JSON.stringify(player.cards)}`);
            player.sendState();
            return;
        }

        /*if (falseplayer.state === "Wait" || player.state === "Proceed") {
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

            // we must also validate that the shared/non-shared cards stay the same
            // TODO
        } else {
            // active player must reset active time
            player.state = { type: "Active", activeTime: Date.now() };
        }*/
        
        console.log(`player '${player.name}' in slot ${player.index} reordered cards: ${
            JSON.stringify(newCards.map(card => JSON.stringify(card)))
        }, revealCount: ${player.revealCount}`);

        sendMethodResult(e.target, 'reorderCards');
        player.cards = newCards;
        player.shareCount = reorderMessage.newShareCount;
        player.revealCount = reorderMessage.newRevealCount;
        player.game.broadcastState();
        return;
    }

    /*
    if ('wait' in obj) {
        const waitMessage = <Lib.WaitMessage>obj;
        if (waitMessage.wait !== null) {
            sendMethodResult(e.target, 'wait', 'bad message');
            return;
        }

        const player = playersByWebSocket.get(e.target);
        if (player === undefined) {
            sendMethodResult(e.target, 'wait', 'you are not in a game');
            return;
        }

        if (player.state !== "Proceed" && player.state !== "Wait") {
            sendMethodResult(e.target, 'wait', 'you are the active player');
        }

        console.log(`player '${player.name}' in slot ${player.index} is waiting.`)

        sendMethodResult(e.target, 'wait');
        //player.state = "Wait";
        player.game.broadcastState();
        return;
    }

    if ('proceed' in obj) {
        const proceedMessage = <Lib.ProceedMessage>obj;
        if (proceedMessage.proceed !== null) {
            sendMethodResult(e.target, 'proceed', 'bad message');
        }

        const player = playersByWebSocket.get(e.target);
        if (player === undefined) {
            sendMethodResult(e.target, 'proceed', 'you are not in a game');
            return;
        }

        if (player.state !== "Proceed" && player.state !== "Wait") {
            sendMethodResult(e.target, 'proceed', 'you are the active player');
        }

        console.log(`player '${player.name}' in slot ${player.index} can proceed.`)

        sendMethodResult(e.target, 'proceed');
        //player.state = "Proceed";
        player.game.broadcastState();
        return;
    }
    */
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