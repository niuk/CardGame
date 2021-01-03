import { Lib } from './lib';
import bs from 'binary-search';
import './StackBlur';

const playerName = Lib.getCookie('playerName');
if (playerName === undefined) {
    throw new Error('No player name!');
}

const gameId = Lib.getCookie('gameId');
if (gameId === undefined) {
    throw new Error('No game id!');
}

// refreshing should rejoin the same game
window.history.pushState(undefined, gameId, `/game?gameId=${gameId}&playerName=${playerName}`);

let gameStateMessage: Lib.GameStateMessage | undefined = undefined;

let onGameStateMessage: ((gameStateMessage: Lib.GameStateMessage) => void) | undefined = undefined;

// open websocket connection to get game state updates
let ws = new WebSocket(`ws://${window.location.hostname}:${JSON.parse(window.location.port) + 1111}`);
ws.onmessage = ev => {
    const obj = JSON.parse(ev.data);
    if ('errorDescription' in obj && typeof obj.errorDescription === 'string') {
        window.alert((<Lib.ErrorMessage>obj).errorDescription);
    } else {
        gameStateMessage = <Lib.GameStateMessage>obj;
        console.log(gameStateMessage);

        for (let i = 0; i < selectedIndices.length; ++i) {
            if (selectedIndices[i] >= gameStateMessage.hiddenCards.length) {
                selectedIndices.splice(i, selectedIndices.length - i);
                break;
            }
        }

        if (onGameStateMessage !== undefined) {
            onGameStateMessage(gameStateMessage);
        }
    }
};

// parameters for rendering
const canvas = <HTMLCanvasElement>document.getElementById('canvas');
const context = <CanvasRenderingContext2D>canvas.getContext('2d');
let canvasRect = canvas.getBoundingClientRect();
let pixelsPerPercent = 0;

// get pixels per centimeter
const testElement = document.createElement('div');
testElement.style.width = '1cm';
document.body.appendChild(testElement);
const pixelsPerCM = testElement.offsetWidth;
document.body.removeChild(testElement);

const cardImages = new Map<string, HTMLImageElement>();

const suits = ['Clubs', 'Dmnds', 'Hearts', 'Spades', 'Joker'];
const ranks = ['Small', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'Big'];

let cardWidth = 0;
let cardHeight = 0;
let cardGap = 0;

let sortBySuitBounds: [Vector, Vector];
let sortByRankBounds: [Vector, Vector];

function recalculateSizes() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - 0.5 * pixelsPerCM;
    canvasRect = canvas.getBoundingClientRect();

    pixelsPerPercent = canvas.height / 100;
    cardWidth = 12 * pixelsPerPercent;
    cardHeight = 18 * pixelsPerPercent;
    cardGap = 2 * pixelsPerPercent;

    sortBySuitBounds = [
        { x: canvas.width - 2.75 * pixelsPerCM, y: canvas.height - 3.5 * pixelsPerCM },
        { x: canvas.width, y: canvas.height - 2 * pixelsPerCM }
    ];
    sortByRankBounds = [
        { x: canvas.width - 2.75 * pixelsPerCM, y: canvas.height - 1.75 * pixelsPerCM },
        { x: canvas.width, y: canvas.height - 0.25 * pixelsPerCM }
    ];
}

window.onresize = recalculateSizes;

window.onscroll = async function () {
    canvasRect = canvas.getBoundingClientRect();
};

window.onload = async function() {
    // wait for connection
    while (ws.readyState != WebSocket.OPEN) {
        await Lib.delay(1000);
        console.log(`ws.readyState: ${ws.readyState}`);
    }

    // try to join the game
    ws.send(JSON.stringify(<Lib.JoinMessage>{
        gameId: gameId,
        playerName: playerName
    }));

    // load card images asynchronously
    for (let suit = 0; suit <= 4; ++suit) {
        for (let rank = 0; rank <= 14; ++rank) {
            if (suit === Lib.Suit.Joker) {
                if (0 < rank && rank < 14) {
                    continue;
                }
            } else {
                if (rank < 1 || 13 < rank) {
                    continue;
                }
            }

            const image = new Image();
            image.src = `PaperCards/${suits[suit]}/${ranks[rank]}of${suits[suit]}.png`;
            image.onload = () => {
                console.log(`loaded '${image.src}'`);
                cardImages.set(JSON.stringify([suit, rank]), image);
            };
        }
    }

    for (let i = 0; i < 4; ++i) {
        const image = new Image();
        image.src = `PaperCards/CardBack${i}.png`;
        image.onload = () => {
            console.log(`loaded '${image.src}'`);
            cardImages.set(`Back${i}`, image);
        };
    }

    const blankImage = new Image();
    blankImage.src = 'PaperCards/Blank Card.png';
    blankImage.onload = () => {
        console.log(`loaded '${blankImage.src}'`);
        cardImages.set('Blank', blankImage);
    };

    while (cardImages.size < 4 * 13 + 7) {
        await Lib.delay(10);
    }

    console.log('all card images loaded');

    recalculateSizes();

    // rendering must be synchronous, or else it flickers
    window.requestAnimationFrame(render);
};

let currentTime: number | undefined = undefined;
let deltaTime: number;

function render(time: number) {
    deltaTime = time - (currentTime !== undefined ? currentTime : time);
    currentTime = time;

    if (gameStateMessage !== undefined) {
        const gameState = gameStateMessage; // cache the game state in case it changes

        // clear the screen
        context.clearRect(0, 0, canvas.width, canvas.height);

        renderBasics(<string>gameId, <string>playerName);
        renderDeck(gameState.deckCount);
        renderOtherPlayers(gameState.playerIndex, gameState.otherPlayers);
        renderPlayer(gameState.hiddenCards);
        renderButtons();
        
        window.requestAnimationFrame(render);
    } else {
        // wait until we have a game state
        setTimeout(() => {
            window.requestAnimationFrame(render);
        }, 100);
    }
}

function renderBasics(gameId: string, playerName: string) {
    context.fillStyle = '#000000ff';
    context.font = '0.75cm Irregularis';
    context.fillText(`Game: ${gameId}`, 0, 0.75 * pixelsPerCM);
    context.fillText(`Your name is: ${playerName}`, 0, canvas.height);
    
    context.setLineDash([4, 2]);
    context.strokeRect(cardHeight, cardHeight, canvas.width - 2 * cardHeight, canvas.height - 2 * cardHeight);
}

let deckTopBounds: [Vector, Vector] = [{ x: 0, y: 0}, { x: 0, y: 0}];

function renderDeck(deckCount: number) {
    context.save();
    try {
        for (let i = 0; i < deckCount; ++i) {
            const cardImage = <HTMLImageElement>cardImages.get('Back0');
            const x = canvas.width / 2 - cardWidth / 2 - (i - deckCount / 2);
            const y = canvas.height / 2 - cardHeight / 2 + 0.5 * (i - deckCount / 2);
            context.drawImage(
                cardImage,
                x,
                y,
                cardWidth,
                cardHeight
            );

            deckTopBounds = [{ x, y }, { x: x + cardWidth, y: y + cardHeight }];
        }
    } finally {
        context.restore();
    }
}

function renderOtherPlayers(playerIndex: number, otherPlayers: Record<number, Lib.OtherPlayer>) {
    context.save();
    try {
        context.translate(0, (canvas.width + canvas.height) / 2);
        context.rotate(-90 * radiansPerDegree);
        renderOtherPlayer(1, otherPlayers[(playerIndex + 1) % 4]);
    } finally {
        context.restore();
    }
    
    context.save();
    try {
        renderOtherPlayer(2, otherPlayers[(playerIndex + 2) % 4]);
    } finally {
        context.restore();
    }

    context.save();
    try {
        context.translate(canvas.width, (canvas.height - canvas.width) / 2);
        context.rotate(90 * radiansPerDegree);
        renderOtherPlayer(3, otherPlayers[(playerIndex + 3) % 4]);
    } finally {
        context.restore();
    }
}

function renderOtherPlayer(index: number, otherPlayer: Lib.OtherPlayer | undefined) {
    if (otherPlayer === undefined) {
        return;
    }

    context.fillStyle = '#000000ff';
    context.font = `${cardGap}px Irregularis`;
    context.fillText(otherPlayer.name, canvas.width / 2, cardHeight + cardGap);

    const cardImage = <HTMLImageElement>cardImages.get(`Back${index}`);
    for (let i = 0; i < otherPlayer.hiddenCardCount; ++i) {
        context.drawImage(
            cardImage,
            canvas.width / 2 + (i - otherPlayer.hiddenCardCount / 2) * cardGap - cardWidth / 2,
            0,
            cardWidth,
            cardHeight
        );
    }
}

function binarySearch(haystack: number[], needle: number) {
    return bs(haystack, needle, (a, b) => a - b);
}

class Vector {
    readonly x: number = 0;
    readonly y: number = 0;
}

function add(u: Vector, v: Vector) {
    return { x: u.x + v.x, y: u.y + v.y };
}

function sub(u: Vector, v: Vector) {
    return { x: u.x - v.x, y: u.y - v.y };
}

function len(u: Vector) {
    return Math.sqrt(u.x * u.x + u.y * u.y);
}

function distance(u: Vector, v: Vector): number {
    return len(sub(u, v));
}

function scale(s: number, v: Vector): Vector {
    return { x: s * v.x, y: s * v.y };
}

// extra state for the player's card
const playerCardTargets: Vector[] = [];
const playerCardPositions: Vector[] = [];
const playerCardVelocities: Vector[] = [];

const selectedIndices: number[] = [];

const movingCards: Lib.Card[] = [];
const movingCardTargets: Vector[] = [];
const movingCardPositions: Vector[] = [];
const movingCardVelocities: Vector[] = [];

const reservedCards: Lib.Card[] = [];
const reservedCardTargets: Vector[] = [];
const reservedCardPositions: Vector[] = [];
const reservedCardVelocities: Vector[] = [];

const moveThreshold = 0.2 * pixelsPerPercent;
const springConstant = 1000;
const mass = 1;
const drag = Math.sqrt(4 * mass * springConstant);

//let n = 1000;

function dampSpring(targetPosition: Vector, position: Vector, velocity: Vector): [Vector, Vector] {
    const springForce = scale(springConstant, sub(targetPosition, position));
    const dragForce = scale(-drag, velocity);
    const acceleration = scale(1 / mass, add(springForce, dragForce));

    //if (n-- > 0) {
        //console.log(`deltaTime: ${deltaTime}, springForce: ${JSON.stringify(springForce)}, dragForce: ${JSON.stringify(dragForce)}`);
        //console.log(`targetPosition: ${JSON.stringify(targetPosition)}, position: ${JSON.stringify(position)}, velocity: ${JSON.stringify(velocity)}, acceleration: ${JSON.stringify(acceleration)}`);
    //}
    
    velocity = add(velocity, scale(deltaTime / 1000, acceleration));
    position = add(position, scale(deltaTime / 1000, velocity));

    //if (n-- > 0) {
        //console.log(`new position: ${JSON.stringify(position)}, new velocity: ${JSON.stringify(velocity)}`);
    //}

    return [position, velocity];
}

enum Action {
    None,
    Draw,
    Select,
    Deselect,
    Toggle,
    Reveal,
    Hide
}

function getDropAction(): Action {
    const dropY = playerCardTargets[selectedIndices[0]].y;
    if (dropY < canvas.height - 2 * cardHeight) {
        return Action.Reveal;
    }

    const deselectDistance = Math.abs(dropY - (canvas.height - cardHeight));
    const selectDistance = Math.abs(dropY - (canvas.height - cardHeight - 2 * cardGap));
    if (deselectDistance < selectDistance) {
        return Action.Deselect;
    } else {
        return Action.Select;
    }
}

let mouseDownPosition = <Vector>{ x: 0, y: 0 };
let mouseMovePosition = <Vector>{ x: 0, y: 0 };
let exceededMoveTreshold = false;
let onDeckAtMouseDown = false;
let hiddenCardIndexAtMouseDown = -1;
let revealedCardIndexAtMouseDown = -1;
let action = Action.None;

function getMousePosition(e: MouseEvent) {
    return {
        x: canvas.width * (e.clientX - canvasRect.left) / canvasRect.width,
        y: canvas.height * (e.clientY - canvasRect.top) / canvasRect.height
    };
}

function getIndexAtMouseDownPosition(cardPositions: Vector[]) {
    for (let i = cardPositions.length - 1; i >= 0; --i) {
        const x0 = cardPositions[i].x;
        const y0 = cardPositions[i].y;
        const x1 = x0 + cardWidth;
        const y1 = y0 + cardHeight;
        if (x0 < mouseDownPosition.x && mouseDownPosition.x < x1 &&
            y0 < mouseDownPosition.y && mouseDownPosition.y < y1
        ) {
            return i;
        }
    }

    return -1;
}

canvas.onmousedown = function(e) {
    mouseDownPosition = getMousePosition(e);

    onDeckAtMouseDown =
        deckTopBounds[0].x < mouseDownPosition.x && mouseDownPosition.x < deckTopBounds[1].x &&
        deckTopBounds[0].y < mouseDownPosition.y && mouseDownPosition.y < deckTopBounds[1].y;

    hiddenCardIndexAtMouseDown = getIndexAtMouseDownPosition(playerCardPositions);
    if (hiddenCardIndexAtMouseDown >= 0) {
        action = Action.Toggle;
    }
};

function startMovingCards(e: MouseEvent) {
    let delta = { x: e.movementX, y: e.movementY };

    if (action === Action.Toggle) {
        // start of movement
        delta = add(delta, sub(mouseMovePosition, mouseDownPosition));

        // dragging a card selects it
        let selectedIndexIndex = binarySearch(selectedIndices, hiddenCardIndexAtMouseDown);
        if (selectedIndexIndex < 0) {
            selectedIndexIndex = ~selectedIndexIndex;
            selectedIndices.splice(selectedIndexIndex, 0, hiddenCardIndexAtMouseDown);
        }

        // gather together selected cards around the card under the mouse
        for (let i = 0; i < selectedIndices.length; ++i) {
            movingCardTargets[i] = {
                x: playerCardPositions[hiddenCardIndexAtMouseDown].x + (i - selectedIndexIndex) * cardGap,
                y: playerCardPositions[hiddenCardIndexAtMouseDown].y
            };
        }
    }

    action = getDropAction();

    // move all selected cards
    for (let i = 0; i < selectedIndices.length; ++i) {
        movingCardTargets[i] = add(movingCardTargets[i], delta);
    }
}

canvas.onmousemove = function(e) {
    mouseMovePosition = getMousePosition(e);
    exceededMoveTreshold = exceededMoveTreshold || distance(mouseMovePosition, mouseDownPosition) > moveThreshold;
    if (!exceededMoveTreshold) {
        return;
    }

    if (onDeckAtMouseDown) {
        if (action === Action.None) {
            action = Action.Draw;

            onGameStateMessage = gameStateMessage => {
                // transition to moving state
                onDeckAtMouseDown = false;
                hiddenCardIndexAtMouseDown = gameStateMessage.hiddenCards.length - 1;
                selectedIndices.splice(0, selectedIndices.length, hiddenCardIndexAtMouseDown);
                playerCardTargets[hiddenCardIndexAtMouseDown] = add(deckTopBounds[0], sub(mouseMovePosition, mouseDownPosition));
                playerCardPositions[hiddenCardIndexAtMouseDown] = deckTopBounds[0];
                playerCardVelocities[hiddenCardIndexAtMouseDown] = { x: 0, y: 0 };
                movingCardTargets[0] = playerCardTargets[hiddenCardIndexAtMouseDown];

                if (action !== Action.None) { // only set the action if the mouse button is still down
                    action = getDropAction();
                }

                onGameStateMessage = undefined;
            };
        
            ws.send(JSON.stringify(<Lib.DrawMessage>{
                drawCard: null
            }));
        }
    } else if (hiddenCardIndexAtMouseDown >= 0) {
        startMovingCards(e);
    } else if (revealedCardIndexAtMouseDown >= 0) {
        startMovingCards(e);
    }
};

canvas.onmouseup = function(e) {
    if (onDeckAtMouseDown) {
    } else if (hiddenCardIndexAtMouseDown >= 0) {
        if (action === Action.Toggle) {
            let selectedIndexIndex = binarySearch(selectedIndices, hiddenCardIndexAtMouseDown);
            if (selectedIndexIndex < 0) {
                // select
                selectedIndices.splice(~selectedIndexIndex, 0, hiddenCardIndexAtMouseDown);
            } else {
                // deselect
                selectedIndices.splice(selectedIndexIndex, 1);
            }
        } else if (action === Action.Deselect) {
            selectedIndices.splice(0, selectedIndices.length);
            reorderCards();
        } else if (action === Action.Select) {
            // onmousemove should have already selected the card
            reorderCards();
        } else if (action === Action.Reveal) {
            if (gameStateMessage !== undefined) {
                const gameState = gameStateMessage; // needed to help TS with flow analysis
                ws.send(JSON.stringify(<Lib.RevealMessage>{
                    cardsToReveal: selectedIndices.map(i => gameState.hiddenCards[i])
                }));
            }
        }
    } else {
        if (sortBySuitBounds[0].x < mouseDownPosition.x && mouseDownPosition.x < sortBySuitBounds[1].x &&
            sortBySuitBounds[0].y < mouseDownPosition.y && mouseDownPosition.y < sortBySuitBounds[1].y
        ) {
            sortBySuit();
        }

        if (sortByRankBounds[0].x < mouseDownPosition.x && mouseDownPosition.x < sortByRankBounds[1].x &&
            sortByRankBounds[0].y < mouseDownPosition.y && mouseDownPosition.y < sortByRankBounds[1].y
        ) {
            sortByRank();
        }
    }

    onDeckAtMouseDown = false;
    hiddenCardIndexAtMouseDown = -1;
    revealedCardIndexAtMouseDown = -1;
    exceededMoveTreshold = false;
    action = Action.None;
};

function reorderCards() {
    if (gameStateMessage !== undefined) {
        ws.send(JSON.stringify(<Lib.ReorderMessage>{
            cardsToReorder: gameStateMessage.hiddenCards
        }));
    }
}

function renderPlayer(playerCards: Lib.Card[]) {
    // initialize state
    for (let i = 0; i < playerCards.length; ++i) {
        if (playerCardTargets[i] === undefined) {
            playerCardTargets[i] = { x: 0, y: 0 };
        }
        
        if (playerCardPositions[i] === undefined) {
            playerCardPositions[i] = { x: 0, y: 0 };
        }

        if (playerCardVelocities[i] === undefined) {
            playerCardVelocities[i] = { x: 0, y: 0 };
        }
    }

    let splitIndex: number;
    if (action === Action.Select || action === Action.Deselect || action === Action.Reveal) {
        // extract dragged cards
        for (let i = 0; i < selectedIndices.length; ++i) {
            movingCards[i] = playerCards[selectedIndices[i]];
            // movingCardTargets[i] is set in onmousemove
            movingCardPositions[i] = playerCardPositions[selectedIndices[i]];
            movingCardVelocities[i] = playerCardVelocities[selectedIndices[i]];
        }

        // extract held cards
        let j = 0;
        for (let i = 0; i < playerCards.length; ++i) {
            if (binarySearch(selectedIndices, i) < 0) {
                reservedCards[j] = playerCards[i];
                reservedCardTargets[j] = playerCardTargets[i];
                reservedCardPositions[j] = playerCardPositions[i];
                reservedCardVelocities[j] = playerCardVelocities[i];
                ++j;
            }
        }

        if (action === Action.Reveal) {
            splitIndex = playerCards.length - selectedIndices.length;
        } else {
            // find the held cards, if any, overlapped by the dragged cards
            let leftIndex: number | undefined = undefined;
            let rightIndex: number | undefined = undefined;
            for (let i = 0; i < playerCards.length - selectedIndices.length; ++i) {
                if (movingCardPositions[0].x < reservedCardTargets[i].x && reservedCardTargets[i].x < movingCardPositions[selectedIndices.length - 1].x) {
                    if (leftIndex === undefined) {
                        leftIndex = i;
                    }

                    rightIndex = i;
                }
            }

            if (leftIndex !== undefined && rightIndex !== undefined) {
                const leftGap = reservedCardTargets[leftIndex].x - movingCardPositions[0].x;
                const rightGap = movingCardPositions[selectedIndices.length - 1].x - reservedCardTargets[rightIndex].x;

                if (leftGap < rightGap) {
                    splitIndex = leftIndex;
                } else {
                    splitIndex = rightIndex + 1;
                }
            } else {
                // no overlapped cards, so the index is the first held card to the right of the dragged cards
                for (splitIndex = 0; splitIndex < playerCards.length - selectedIndices.length; ++splitIndex) {
                    if (movingCardPositions[selectedIndices.length - 1].x < reservedCardTargets[splitIndex].x) {
                        break;
                    }
                }
            }

            //context.fillStyle = '#000000ff';
            //context.fillText(`${playerCards.length - selectedIndices.length}`, canvas.width / 2, canvas.height / 2 - 48);
            //context.fillText(`${splitIndex}`, canvas.width / 2, canvas.height / 2 - 36);
            //context.fillText(`${leftIndex}`, canvas.width / 2, canvas.height / 2 - 24);
            //context.fillText(`${rightIndex}`, canvas.width / 2, canvas.height / 2 - 12);
            //context.fillText(`${dragCardPositions[0].x}`, canvas.width / 2, canvas.height / 2);
            //context.fillText(`${leftIndex !== undefined ? holdCardPositions[leftIndex].x : undefined}`, canvas.width / 2, canvas.height / 2 + 12);
            //context.fillText(`${rightIndex !== undefined ? holdCardPositions[rightIndex].x : undefined}`, canvas.width / 2, canvas.height / 2 + 24);
            //context.fillText(`${dragCardPositions[selectedIndices.length - 1].x}`, canvas.width / 2, canvas.height / 2 + 36);
            //context.fillText(`${holdCardPositions[splitIndex].x}`, canvas.width / 2, canvas.height / 2 + 48);
        }
    } else {
        // every card is reserved
        for (let i = 0; i < playerCards.length; ++i) {
            reservedCards[i] = playerCards[i];
            reservedCardTargets[i] = playerCardTargets[i];
            reservedCardPositions[i] = playerCardPositions[i];
            reservedCardVelocities[i] = playerCardVelocities[i];
        }

        splitIndex = playerCards.length;
    }

    // draw reserved cards to the left of the moving cards
    for (let i = 0; i < splitIndex; ++i) {
        let cardImage = <HTMLImageElement>getCardImage(reservedCards[i]);

        reservedCardTargets[i] = {
            x: canvas.width / 2 - (playerCards.length - (action === Action.Reveal ? selectedIndices.length : 0)) / 2 * cardGap - cardWidth / 2 + i * cardGap,
            y: canvas.height - cardHeight - (splitIndex < playerCards.length || binarySearch(selectedIndices, i) < 0 ? 0 : 2 * cardGap)
        };
        [reservedCardPositions[i], reservedCardVelocities[i]] = dampSpring(reservedCardTargets[i], reservedCardPositions[i], reservedCardVelocities[i]);

        context.drawImage(
            cardImage,
            reservedCardPositions[i].x,
            reservedCardPositions[i].y,
            cardWidth,
            cardHeight
        );

        //context.fillStyle = '#ff0000ff';
        //context.fillText(`${Math.floor(holdCardPositions[i].x)}`, holdCardPositions[i].x, holdCardPositions[i].y - 24);
        //context.fillStyle = '#0000ffff';
        //context.fillText(`${Math.floor(holdCardPositions[i].y)}`, holdCardPositions[i].x, holdCardPositions[i].y - 12);
        
        playerCards[i] = reservedCards[i];
        playerCardTargets[i] = reservedCardTargets[i];
        playerCardPositions[i] = reservedCardPositions[i];
        playerCardVelocities[i] = reservedCardVelocities[i];
    }

    if (splitIndex < playerCards.length) {
        // render dragged cards
        for (let i = 0; i < selectedIndices.length; ++i) {
            let cardImage = <HTMLImageElement>getCardImage(movingCards[i]);

            [movingCardPositions[i], movingCardVelocities[i]] = dampSpring(movingCardTargets[i], movingCardPositions[i], movingCardVelocities[i]);

            context.drawImage(
                cardImage,
                movingCardPositions[i].x,
                movingCardPositions[i].y,
                cardWidth,
                cardHeight
            );

            //context.fillStyle = '#ff0000ff';
            //context.fillText(`${Math.floor(dragCardPositions[i].x)}`, dragCardPositions[i].x, dragCardPositions[i].y - 24);
            //context.fillStyle = '#0000ffff';
            //context.fillText(`${Math.floor(dragCardPositions[i].y)}`, dragCardPositions[i].x, dragCardPositions[i].y - 12);

            playerCards[splitIndex + i] = movingCards[i];
            playerCardTargets[splitIndex + i] = movingCardTargets[i];
            playerCardPositions[splitIndex + i] = movingCardPositions[i];
            playerCardVelocities[splitIndex + i] = movingCardVelocities[i];
            
            // also fix selection state
            selectedIndices[i] = splitIndex + i;
        }

        // render remaining held cards
        for (let i = splitIndex; i < playerCards.length - selectedIndices.length; ++i) {
            let cardImage = <HTMLImageElement>getCardImage(reservedCards[i]);

            reservedCardTargets[i] = {
                x: canvas.width / 2 - playerCards.length / 2 * cardGap - cardWidth / 2 + (i + selectedIndices.length) * cardGap,
                y: canvas.height - cardHeight
            };
            [reservedCardPositions[i], reservedCardVelocities[i]] = dampSpring(reservedCardTargets[i], reservedCardPositions[i], reservedCardVelocities[i]);

            context.drawImage(
                cardImage,
                reservedCardPositions[i].x,
                reservedCardPositions[i].y,
                cardWidth,
                cardHeight
            );

            //context.fillStyle = '#ff0000ff';
            //context.fillText(`${Math.floor(holdCardPositions[i].x)}`, holdCardPositions[i].x, holdCardPositions[i].y - 24);
            //context.fillStyle = '#0000ffff';
            //context.fillText(`${Math.floor(holdCardPositions[i].y)}`, holdCardPositions[i].x, holdCardPositions[i].y - 12);

            playerCards[selectedIndices.length + i] = reservedCards[i];
            playerCardTargets[selectedIndices.length + i] = reservedCardTargets[i];
            playerCardPositions[selectedIndices.length + i] = reservedCardPositions[i];
            playerCardVelocities[selectedIndices.length + i] = reservedCardVelocities[i];
        }
    }
}

function getCardImage(card: Lib.Card) {
    return cardImages.get(Lib.cardToString(card));
}

const radiansPerDegree: number = 0.01745329252;

function renderButtons() {
    context.save();
    try {
        // blur image behind
        //stackBlurCanvasRGBA('canvas', x, y, canvas.width - x, canvas.height - y, 16);

        const x = sortBySuitBounds[0].x - 4 * pixelsPerCM;
        const y = sortBySuitBounds[0].y;
        context.fillStyle = '#00ffff77';
        context.fillRect(x, y, canvas.width - x, canvas.height - y);
        
        context.fillStyle = '#000000ff';
        context.font = '1.5cm Irregularis';
        context.fillText('SORT', x + 0.25 * pixelsPerCM, y + 2.25 * pixelsPerCM);

        context.font = '3cm Irregularis';
        context.fillText('{', x + 3 * pixelsPerCM, y + 2.75 * pixelsPerCM);

        context.font = '1.5cm Irregularis';
        context.fillText('SUIT', sortBySuitBounds[0].x, sortBySuitBounds[1].y);

        context.font = '1.5cm Irregularis';
        context.fillText('RANK', sortByRankBounds[0].x, sortByRankBounds[1].y);

        //context.fillStyle = '#ff000077';
        //context.fillRect(sortBySuitBounds[0].x, sortBySuitBounds[0].y,
            //sortBySuitBounds[1].x - sortBySuitBounds[0].x, sortBySuitBounds[1].y - sortBySuitBounds[0].y);

        //context.fillStyle = '#0000ff77';
        //context.fillRect(sortByRankBounds[0].x, sortByRankBounds[0].y,
            //sortByRankBounds[1].x - sortByRankBounds[0].x, sortByRankBounds[1].y - sortByRankBounds[0].y);
    } finally {
        context.restore();
    }
}

function sortBySuit() {
    if (gameStateMessage === undefined) {
        return;
    }

    const cardsWithIndex: [Lib.Card, number][] = gameStateMessage.hiddenCards.map((card, index) => [card, index]);
    cardsWithIndex.sort(([a, i], [b, j]) => {
        if (Lib.getSuit(a) === Lib.getSuit(b)) {
            return Lib.getRank(a) - Lib.getRank(b);
        } else {
            return Lib.getSuit(a) - Lib.getSuit(b);
        }
    });

    remap(cardsWithIndex);

    reorderCards();
}

function sortByRank() {
    if (gameStateMessage === undefined) {
        return;
    }

    const cardsWithIndex: [Lib.Card, number][] = gameStateMessage.hiddenCards.map((card, index) => [card, index]);
    cardsWithIndex.sort(([a, i], [b, j]) => {
        if (Lib.getRank(a) === Lib.getRank(b)) {
            return Lib.getSuit(a) - Lib.getSuit(b);
        } else {
            return Lib.getRank(a) - Lib.getRank(b);
        }
    });

    remap(cardsWithIndex);

    reorderCards();
}

const temporaryTargets: Vector[] = [];
const temporaryPositions: Vector[] = [];
const temporaryVelocities: Vector[] = [];

function remap(cardsWithIndex: [Lib.Card, number][]) {
    if (gameStateMessage === undefined) {
        return;
    }

    console.log(`${JSON.stringify(gameStateMessage.hiddenCards.map(
        (card, index) => `[${Lib.cardToString(card)}, ${index}]`
    ))}`);
    console.log(`${JSON.stringify(cardsWithIndex.map(
        ([card, index]) => `[${Lib.cardToString(card)}, ${index}]`
    ))}`);

    for (let i = 0; i < cardsWithIndex.length; ++i) {
        const [card, _] = cardsWithIndex[i];
        gameStateMessage.hiddenCards[i] = card;
    }

    for (let i = 0; i < cardsWithIndex.length; ++i) {
        const [_, j] = cardsWithIndex[i];
        temporaryTargets[i] = playerCardTargets[j];
        temporaryPositions[i] = playerCardPositions[j];
        temporaryVelocities[i] = playerCardVelocities[j];
    }

    for (let i = 0; i < playerCardPositions.length; ++i) {
        playerCardTargets[i] = temporaryTargets[i];
        playerCardPositions[i] = temporaryPositions[i];
        playerCardVelocities[i] = temporaryVelocities[i];
    }

    for (let i = 0; i < selectedIndices.length; ++i) {
        console.log(`selectedIndices[${i}]: ${selectedIndices[i]}`);
    
        for (let j = 0; j < cardsWithIndex.length; ++j) {
            const [_, k] = cardsWithIndex[j];
            if (k === selectedIndices[i]) {
                selectedIndices[i] = j;
                console.log(`k: ${k}, selectedIndices[${i}] = ${j}`);
                break;
            }
        }
    }

    selectedIndices.sort((a, b) => a - b);
}