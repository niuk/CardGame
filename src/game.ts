import { Util } from "./util";

const cardSize = "4cm";

// get player name from request, because tabs share the same cookie
// and we want to be able to test using multiple tabs in the same browser instance
const playerName = Util.getParam("playerName");
if (playerName === undefined) {
    throw new Error("No player name!");
}

const gameId = Util.getCookie("gameId");
if (gameId === undefined) {
    throw new Error("No game id!");
}

// refreshing should rejoin the same game
window.history.pushState(undefined, gameId, `/game?gameId=${gameId}&playerName=${playerName}`);

// open websocket connection to get game state updates
let wsuri = `ws://${window.location.hostname}:${JSON.parse(window.location.port) + 1111}`;
console.log(`new WebSocket('${wsuri}')`);
let ws = new WebSocket(wsuri);

interface GameState {
    cardsInDeck: number;
    cardsInHand: Util.Card[];
    otherPlayerCardCounts: Record<string, number>;
}

function clear(element: HTMLElement | null) {
    while (element !== null && element.firstChild !== null) {
        element.removeChild(element.firstChild);
    }
}

ws.onmessage = ev => {
    const gameState = <GameState>JSON.parse(ev.data);
    console.log(gameState);

    const topRight = document.getElementById("top-right");
    clear(topRight);

    for (let i = 0; i < gameState.cardsInDeck; ++i) {
        let cardImg = document.createElement("img");
        cardImg.setAttribute("src", "assets/BackColor_Black.png");
        cardImg.setAttribute("class", "card-image");
        cardImg.setAttribute("style", `position: absolute; top: calc(${100 * i / gameState.cardsInDeck}% - ${i / gameState.cardsInDeck} * ${cardSize}); right: calc(${100 * i / gameState.cardsInDeck}% - ${i / gameState.cardsInDeck} * ${cardSize}); height: ${cardSize};`);
        topRight?.appendChild(cardImg);
    }

    const bottom = document.getElementById("bottom");
    clear(bottom);

    for (let i = 0; i < gameState.cardsInHand.length; ++i) {
        const cardInfo = gameState.cardsInHand[i];
        if (cardInfo === undefined) {
            throw new Error(`Bad index: ${i}, gameState.cardsInHand.length: ${gameState.cardsInHand.length}`);
        }

        const cardImg = document.createElement("img");
        if (cardInfo === Util.Joker.Big) {
            cardImg.setAttribute("src", "assets/Joker_Color.png");
        } else if (cardInfo == Util.Joker.Small) {
            cardImg.setAttribute("src", "assets/Joker_Monochrome.png");
        } else {
            const [suit, rank] = cardInfo;
            const rankString = rank < 10 ? `0${rank}` : rank.toString();
            cardImg.setAttribute("src", `assets/${Util.Suit[suit]}${rankString}.png`);
        }

        cardImg.setAttribute("class", "card-image");
        cardImg.setAttribute("style", `position: absolute; bottom: calc(50% - 0.5 * ${cardSize}); left: calc(${100 * i / gameState.cardsInHand.length}% - ${i / gameState.cardsInHand.length} * ${cardSize}); height: ${cardSize};`);
        bottom?.appendChild(cardImg);
    }

    console.log(gameState.otherPlayerCardCounts);

    const elementIds = ["left", "top", "right"];
    let elementIdIndex = 0;
    Object.entries(gameState.otherPlayerCardCounts).forEach(([playerName, count]) => {
        const elementId = elementIds[elementIdIndex];
        if (elementId === undefined) {
            throw new Error(`Unknown elementId for index: ${elementIdIndex}`);
        }

        elementIdIndex++;
        const element = document.getElementById(elementId);
        clear(element);

        const nameLabel = document.createElement("div");
        nameLabel.setAttribute("style", "position: absolute;");
        nameLabel.innerHTML = playerName;
        element?.appendChild(nameLabel);

        for (let i = 0; i < count; ++i) {
            let cardImg = document.createElement("img");
            cardImg.setAttribute("src", "assets/BackColor_Black.png");
            cardImg.setAttribute("class", "card-image");

            if (elementId === "left") {
                cardImg.setAttribute("style", `position: absolute; left: calc(50% - 0.5 * ${cardSize}); top: calc(${100 * i / count}% - ${i / count} * ${cardSize}); transform: rotate(90deg); height: ${cardSize}`);
            } else if (elementId === "top") {
                cardImg.setAttribute("style", `position: absolute; top: calc(50% - 0.5 * ${cardSize}); left: calc(${100 * i / count}% - ${i / count} * ${cardSize}); transform: rotate(180deg); height: ${cardSize}`);
            } else if (elementId === "right") {
                cardImg.setAttribute("style", `position: absolute; left: calc(50% - 0.5 * ${cardSize}); top: calc(${100 * i / count}% - ${i / count} * ${cardSize}); transform: rotate(-90deg); height: ${cardSize}`);
            }

            element?.appendChild(cardImg);
        }
    });
};

(async function() {
    while (true) {
        await Util.delay(1000);
        const data = {
            "playerName": playerName,
            "gameId": Util.getCookie("gameId"),
            "timestamp": new Date()
        };
        ws.send(JSON.stringify(data));
    }
})();
