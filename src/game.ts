import { Util } from "./util";
import interact from "interactjs";

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

function clear(element: HTMLElement) {
    while (element.firstChild !== null) {
        element.removeChild(element.firstChild);
    }
}

// open websocket connection to get game state updates
let wsuri = `ws://${window.location.hostname}:${JSON.parse(window.location.port) + 1111}`;
console.log(`new WebSocket('${wsuri}')`);
let ws = new WebSocket(wsuri);

// keep track of order of cards, selection, drag/drop
let hand: [Util.Card, boolean][] = [];
let held: Util.Card[] = [];
let playerTurn = false;

// create an element for dragging and dropping
const wrapper = document.getElementById("wrapper");
if (wrapper === null) { throw new Error(); }
const holder = document.createElement("div");
wrapper.appendChild(holder);
holder.style.position = "absolute";

// drag and drop parameters
let x: number = NaN;
let y: number = NaN;
let holdX: number = NaN;
let holdY: number = NaN;
let dragging = false;
let insertIndex: number = 0;
let playCards = false;

ws.onmessage = ev => {
    const obj = JSON.parse(ev.data);
    if ('errorDescription' in obj && typeof obj.errorDescription === 'string') {
        const errorMessage = <Util.ErrorMessage>obj;
        console.error(errorMessage.errorDescription);
    } else {
        const gameStateMessage = <Util.GameStateMessage>obj;
        console.log(gameStateMessage);

        renderGameState(gameStateMessage);
    }
};

function renderGameState(gameStateMessage: Util.GameStateMessage) {
    // render cards still in the deck
    const topRight = document.getElementById("top-right");
    if (topRight === null) { throw new Error(); }
    clear(topRight);

    for (let i = 0; i < gameStateMessage.cardsInDeck; ++i) {
        const cardImg = document.createElement("img");
        topRight.appendChild(cardImg);

        cardImg.src = "assets/BackColor_Black.png";
        cardImg.style.position = "absolute";
        cardImg.style.top = `calc(${100 * i / gameStateMessage.cardsInDeck}% - ${i / gameStateMessage.cardsInDeck} * ${cardSize})`;
        cardImg.style.right = `calc(${100 * i / gameStateMessage.cardsInDeck}% - ${i / gameStateMessage.cardsInDeck} * ${cardSize})`;
        cardImg.style.height = cardSize;
    }

    // render other players
    const elementIds = ["left", "top", "right"];
    for (let i = 1; i < 4; ++i) {
        const otherPlayerIndex = (gameStateMessage.playerIndex + i) % 4;
        const otherPlayer = gameStateMessage.otherPlayers[otherPlayerIndex];
        if (otherPlayer === undefined) {
            continue;
        }

        const elementId = elementIds[i - 1];
        if (elementId === undefined) { throw new Error(); }

        const element = document.getElementById(elementId);
        if (element === null) { throw new Error(); }
        clear(element);

        const otherPlayerTurn = gameStateMessage.activePlayerIndex == otherPlayerIndex;
        const nameLabel = document.createElement("div");
        element.appendChild(nameLabel);
        nameLabel.style.position = "absolute";
        nameLabel.innerHTML = `${otherPlayer.name}${otherPlayerTurn ? " (THEIR TURN)" : " (WAITING)"}`;

        for (let i = 0; i < otherPlayer.cardCount; ++i) {
            const cardImg = document.createElement("img");
            element.appendChild(cardImg);

            cardImg.src = "assets/BackColor_Black.png";
            cardImg.style.position = "absolute";
            cardImg.style.height = cardSize;

            if (elementId === "left") {
                cardImg.style.transform = "rotate(90deg)";
                cardImg.style.right = `calc(50% - 0.5 * ${cardSize})`;
                cardImg.style.top = `calc(${100 * i / otherPlayer.cardCount}% - ${i / otherPlayer.cardCount} * ${cardSize})`;
            } else if (elementId === "top") {
                cardImg.style.transform = "rotate(180deg)";
                cardImg.style.bottom = `calc(50% - 0.5 * ${cardSize})`;
                cardImg.style.right = `calc(${100 * i / otherPlayer.cardCount}% - ${i / otherPlayer.cardCount} * ${cardSize})`;
            } else if (elementId === "right") {
                cardImg.style.transform = "rotate(-90deg)";
                cardImg.style.left = `calc(50% - 0.5 * ${cardSize})`;
                cardImg.style.bottom = `calc(${100 * i / otherPlayer.cardCount}% - ${i / otherPlayer.cardCount} * ${cardSize})`;
            }
        }
    }

    // render played cards
    const center = document.getElementById("center");
    if (center === null) { throw new Error() }
    clear(center);

    for (let i = 0; i < gameStateMessage.cardsPlayed.length; ++i) {
        const cardImg = document.createElement("img");
        center.appendChild(cardImg);

        const card = gameStateMessage.cardsPlayed[i];
        if (card === undefined) { throw new Error(); }
        cardImg.src = getSrc(card);
        cardImg.style.position = "absolute";
        cardImg.style.height = cardSize;
        const col = (i % 25) / 25;
        const row = Math.floor(i / 25) / 4;
        cardImg.style.left = `calc(${100 * col}% - ${col} * ${cardSize})`;
        cardImg.style.top = `calc(${100 * row}% - ${row} * ${cardSize})`;
    }

    // update the player's hand
    let changed = false;
    for (let i = 0; i < Math.max(hand.length, gameStateMessage.cardsInHand.length); ++i) {
        const cardInHand = hand[i];
        if (cardInHand === undefined) {
            changed = true;
            break;
        }

        const card = gameStateMessage.cardsInHand[i];
        if (card === undefined) {
            changed = true;
            break;
        }

        if (JSON.stringify(cardInHand[0]) !== JSON.stringify(card)) {
            changed = true;
            break;
        }
    }

    if (changed) {
        console.log(`changed: ${changed}`);
        hand = [];
        for (let i = 0; i < gameStateMessage.cardsInHand.length; ++i) {
            const card = gameStateMessage.cardsInHand[i];
            if (card === undefined) {
                throw new Error();
            }

            hand.push([card, false]);
        }
    }

    playerTurn = gameStateMessage.activePlayerIndex == gameStateMessage.playerIndex;

    renderHand();
}

function getSrc(card: Util.Card): string {
    if (card === Util.Joker.Big) {
        return "assets/Joker_Color.png";
    } else if (card == Util.Joker.Small) {
        return "assets/Joker_Monochrome.png";
    } else {
        const [suit, rank] = card;
        const rankString = rank < 10 ? `0${rank}` : rank.toString();
        return `assets/${Util.Suit[suit]}${rankString}.png`;
    }
}

function renderHand() {
    const bottom = document.getElementById("bottom");
    if (bottom === null) { throw new Error(); }
    clear(bottom);

    playCards = holdY < bottom.getBoundingClientRect().top;

    const nameLabel = document.createElement("div");
    bottom.appendChild(nameLabel);
    nameLabel.style.position = "absolute";
    nameLabel.innerHTML = `${playerName}${playerTurn ? " (YOUR TURN)" : " (WAITING)"}`;

    insertIndex = -1;
    for (let i = 0; i < hand.length; ++i) {
        const cardInHand = hand[i];
        if (cardInHand === undefined) {
            throw new Error();
        }

        const [card, selected] = cardInHand;
        const cardImg = document.createElement("img");
        bottom.appendChild(cardImg);

        cardImg.src = getSrc(card);
        cardImg.id = `${i}`;
        cardImg.className = "interactable";
        cardImg.style.position = "absolute";
        cardImg.style.height = cardSize;
        cardImg.style.left = `calc(${100 * i / hand.length}% - ${i / hand.length} * ${cardSize})`;
        const rect = cardImg.getBoundingClientRect();
        const leftShift = !playCards && rect.left < holdX ? 1 : 0;
        const rightShift = !playCards && holdX < rect.left ? 1 : 0;
        if (leftShift) {
            insertIndex = i;
        }

        cardImg.style.left = `calc(${100 * i / hand.length}% - ${(i + leftShift - rightShift) / hand.length} * ${cardSize})`;
        cardImg.style.top = `calc(50% - 0.5 * ${cardSize}${selected ? " - 20px" : ""})`;
        cardImg.style.touchAction = "none";
        cardImg.addEventListener('click', selectCard);
    }
}

function selectCard(this: HTMLImageElement, event: MouseEvent) {
    const canvas = document.createElement("canvas");
    canvas.width = this.width;
    canvas.height = this.height;

    const context = canvas.getContext("2d");
    if (context === null) {
        throw new Error(`no 2d context for canvas ${JSON.stringify(canvas)}`);
    }
    
    context.drawImage(this, 0, 0, canvas.width, canvas.height);
    const alpha = context.getImageData(event.offsetX, event.offsetY, 1, 1).data[3];
    if (alpha !== undefined && alpha > 0) {
        const id = this.id;
        if (id === null) {
            throw new Error(`could not get id for ${this.src}`);
        }

        const handIndex = parseInt(id);
        const cardInHand = hand[handIndex];
        if (cardInHand === undefined) {
            throw new Error(`card at index ${handIndex} not in hand`);
        }

        console.log(`selected hand index ${handIndex}`);
        cardInHand[1] = !cardInHand[1];

        renderHand();
    } else {
        this.style.pointerEvents = "none";
        try {
            const peekElement = document.elementFromPoint(event.clientX, event.clientY);
            if (peekElement !== null && peekElement instanceof HTMLImageElement) {
                const peekEvent = new MouseEvent('click', <MouseEventInit>{
                    button: event.button,
                    buttons: event.buttons,
                    clientX: event.clientX,
                    clientY: event.clientY,
                    movementX: event.movementX,
                    movementY: event.movementY,
                    relatedTarget: event.relatedTarget,
                    screenX: event.screenX,
                    screenY: event.screenY,
                });
                peekElement.dispatchEvent(peekEvent);
            }
        } finally {
            this.style.pointerEvents = "auto";
        }
    }
}

interact(".interactable").draggable({
    listeners: {
        start(event) {
            x = event.x0;
            y = event.y0;
        },
        move(event) {
            x += event.dx;
            y += event.dy;
            const dx = x - event.x0;
            const dy = y - event.y0;
            if (dragging || Math.sqrt(dx * dx + dy * dy) > 10) {
                // threshold reached
                dragging = true;

                let newHand: [Util.Card, boolean][] = [];
                for (let i = 0; i < hand.length; ++i) {
                    const cardInHand = hand[i];
                    if (cardInHand === undefined) {
                        throw new Error();
                    }

                    const [card, selected] = cardInHand;
                    if (selected) {
                        held.push(card);

                        const cardImg = document.getElementById(`${i}`);
                        if (cardImg === null || cardImg.parentElement === null) { throw new Error(); }
                        holder.appendChild(cardImg);
                    } else {
                        newHand.push(cardInHand);
                    }
                }

                hand = newHand;

                for (let i = 0; i < holder.children.length; ++i) {
                    const child = holder.children.item(holder.children.length - i - 1);
                    if (child === null) { throw new Error(); }
                    const cardImg = <HTMLImageElement>child;
                    cardImg.style.left = `calc(-5 * ${cardSize} / 6 - ${i} * ${cardSize} / 8)`;
                    cardImg.style.top = `-${cardSize}`;
                    console.log(cardImg.getAttribute("style"));
                }
                
                holder.style.transform = `translate(${x}px, ${y}px)`;

                if (holder.children.length > 0) {
                    const child = holder.children.item(0);
                    if (child === null) { throw new Error(); }
                    const rect = (<HTMLImageElement>child).getBoundingClientRect();
                    holdX = rect.left;
                    holdY = rect.bottom;
                }

                renderHand();
            }
        },
        end() {
            if (dragging) {
                if (playCards) {
                    ws.send(JSON.stringify(<Util.PlayMessage>{
                        cardsToPlay: held
                    }));
                } else {
                    for (let i = 0; i < held.length; ++i) {
                        const card = held[i];
                        if (card === undefined) {
                            throw new Error();
                        }
        
                        hand.splice(++insertIndex, 0, [card, false]);
                    }
        
                    let newCardsInHand: Util.Card[] = [];
                    for (let i = 0; i < hand.length; ++i) {
                        const cardInHand = hand[i];
                        if (cardInHand === undefined) { throw new Error(); }
                        newCardsInHand.push(cardInHand[0]);
                    }
        
                    ws.send(JSON.stringify(<Util.ShuffleMessage>{
                        cardsInHand: newCardsInHand
                    }));
                }
        
                held = [];
                clear(holder);
                renderHand();
            }

            x = NaN;
            y = NaN;
            holdX = NaN;
            holdY = NaN;
            dragging = false;
        }
    }
});

(async function() {
    while (ws.readyState != WebSocket.OPEN) {
        await Util.delay(1000);
        console.log(`ws.readyState: ${ws.readyState}`);
    }

    ws.send(JSON.stringify(<Util.JoinMessage>{
        gameId: gameId,
        playerName: playerName
    }));
    
    while (true) {
        await Util.delay(1000);
    }
})();
