"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("./util");
const cardSize = "4cm";
// get player name from request, because tabs share the same cookie
// and we want to be able to test using multiple tabs in the same browser instance
const playerName = util_1.Util.getParam("playerName");
if (playerName === undefined) {
    throw new Error("No player name!");
}
const gameId = util_1.Util.getCookie("gameId");
if (gameId === undefined) {
    throw new Error("No game id!");
}
// refreshing should rejoin the same game
window.history.pushState(undefined, gameId, `/game?gameId=${gameId}&playerName=${playerName}`);
function clear(element) {
    while (element !== null && element.firstChild !== null) {
        element.removeChild(element.firstChild);
    }
}
// open websocket connection to get game state updates
let wsuri = `ws://${window.location.hostname}:${JSON.parse(window.location.port) + 1111}`;
console.log(`new WebSocket('${wsuri}')`);
let ws = new WebSocket(wsuri);
function renderGameState(gameStateMessage) {
    // render cards still in the deck
    const topRight = document.getElementById("top-right");
    clear(topRight);
    for (let i = 0; i < gameStateMessage.cardsInDeck; ++i) {
        let cardImg = document.createElement("img");
        cardImg.setAttribute("src", "assets/BackColor_Black.png");
        cardImg.setAttribute("class", "card-image");
        cardImg.setAttribute("style", `position: absolute; top: calc(${100 * i / gameStateMessage.cardsInDeck}% - ${i / gameStateMessage.cardsInDeck} * ${cardSize}); right: calc(${100 * i / gameStateMessage.cardsInDeck}% - ${i / gameStateMessage.cardsInDeck} * ${cardSize}); height: ${cardSize};`);
        topRight?.appendChild(cardImg);
    }
    // render the player's cards
    const bottom = document.getElementById("bottom");
    clear(bottom);
    for (let i = 0; i < gameStateMessage.cardsInHand.length; ++i) {
        const cardInfo = gameStateMessage.cardsInHand[i];
        if (cardInfo === undefined) {
            throw new Error(`Bad index: ${i}, gameState.cardsInHand.length: ${gameStateMessage.cardsInHand.length}`);
        }
        const cardImg = document.createElement("img");
        if (cardInfo === util_1.Util.Joker.Big) {
            cardImg.setAttribute("src", "assets/Joker_Color.png");
        }
        else if (cardInfo == util_1.Util.Joker.Small) {
            cardImg.setAttribute("src", "assets/Joker_Monochrome.png");
        }
        else {
            const [suit, rank] = cardInfo;
            const rankString = rank < 10 ? `0${rank}` : rank.toString();
            cardImg.setAttribute("src", `assets/${util_1.Util.Suit[suit]}${rankString}.png`);
        }
        cardImg.setAttribute("class", "card-image");
        cardImg.setAttribute("style", `position: absolute; bottom: calc(50% - 0.5 * ${cardSize}); left: calc(${100 * i / gameStateMessage.cardsInHand.length}% - ${i / gameStateMessage.cardsInHand.length} * ${cardSize}); height: ${cardSize};`);
        bottom?.appendChild(cardImg);
    }
    // render other players
    const elementIds = ["left", "top", "right"];
    for (let i = 1; i < 4; ++i) {
        const otherPlayerIndex = (gameStateMessage.playerIndex + i) % 4;
        const otherPlayer = gameStateMessage.otherPlayers[otherPlayerIndex];
        if (otherPlayer === undefined) {
            continue;
        }
        const nameLabel = document.createElement("div");
        nameLabel.setAttribute("style", "position: absolute;");
        nameLabel.innerHTML = otherPlayer.name;
        const elementId = elementIds[i - 1];
        if (elementId === undefined) {
            throw new Error(`Unknown elementId for index: ${i - 1}`);
        }
        const element = document.getElementById(elementId);
        clear(element);
        element?.appendChild(nameLabel);
        for (let i = 0; i < otherPlayer.cardCount; ++i) {
            let cardImg = document.createElement("img");
            cardImg.setAttribute("src", "assets/BackColor_Black.png");
            cardImg.setAttribute("class", "card-image");
            if (elementId === "left") {
                cardImg.setAttribute("style", `position: absolute; left: calc(50% - 0.5 * ${cardSize}); top: calc(${100 * i / otherPlayer.cardCount}% - ${i / otherPlayer.cardCount} * ${cardSize}); transform: rotate(90deg); height: ${cardSize}`);
            }
            else if (elementId === "top") {
                cardImg.setAttribute("style", `position: absolute; top: calc(50% - 0.5 * ${cardSize}); left: calc(${100 * i / otherPlayer.cardCount}% - ${i / otherPlayer.cardCount} * ${cardSize}); transform: rotate(180deg); height: ${cardSize}`);
            }
            else if (elementId === "right") {
                cardImg.setAttribute("style", `position: absolute; left: calc(50% - 0.5 * ${cardSize}); top: calc(${100 * i / otherPlayer.cardCount}% - ${i / otherPlayer.cardCount} * ${cardSize}); transform: rotate(-90deg); height: ${cardSize}`);
            }
            element?.appendChild(cardImg);
        }
    }
}
ws.onmessage = ev => {
    const obj = JSON.parse(ev.data);
    if ('errorDescription' in obj && typeof obj.errorDescription === 'string') {
        const errorMessage = obj;
        console.error(errorMessage.errorDescription);
    }
    else {
        const gameStateMessage = obj;
        console.log(gameStateMessage);
        renderGameState(gameStateMessage);
    }
};
(async function () {
    while (ws.readyState != ws.OPEN) {
        await util_1.Util.delay(1000);
        console.log(`ws.readyState: ${ws.readyState}`);
    }
    console.log(`ws.OPEN: ${ws.OPEN}`);
    ws.send(JSON.stringify({
        gameId: gameId,
        playerName: playerName
    }));
    while (true) {
        await util_1.Util.delay(1000);
        ws.send(JSON.stringify({
            timestamp: new Date()
        }));
    }
})();
