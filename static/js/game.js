"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("./util");
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
// open websocket connection to get game state updates
let wsuri = `ws://${window.location.hostname}:${JSON.parse(window.location.port) + 1111}`;
console.log(`new WebSocket('${wsuri}')`);
let ws = new WebSocket(wsuri);
const cardImgForId = new Map();
ws.onmessage = ev => {
    const gameState = JSON.parse(ev.data);
    console.log(gameState);
    gameState.cardsInHand.forEach(([cardId, cardInfo]) => {
        let cardImg = cardImgForId.get(cardId);
        if (cardImg === undefined) {
            cardImg = document.createElement("img");
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
            document.getElementById("bottom")?.appendChild(cardImg);
            cardImgForId.set(cardId, cardImg);
        }
    });
};
(async function () {
    while (true) {
        await util_1.Util.delay(1000);
        const data = {
            "playerName": playerName,
            "gameId": util_1.Util.getCookie("gameId"),
            "timestamp": new Date()
        };
        ws.send(JSON.stringify(data));
    }
})();
