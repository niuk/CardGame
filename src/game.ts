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

let previousGameState: Lib.GameState | undefined = undefined;;
let gameState: Lib.GameState | undefined = undefined;

const temporaryTargets: Vector[] = [];
const temporaryPositions: Vector[] = [];
const temporaryVelocities: Vector[] = [];

let wsMessageCallback: ((result: Lib.ErrorMessage | Lib.GameState) => void) | null = null;

// open websocket connection to get game state updates
let ws = new WebSocket(`wss://${window.location.hostname}/`);
ws.onmessage = ev => {
    const obj = JSON.parse(ev.data);
    if ('errorDescription' in obj) {
        if (wsMessageCallback !== null) { 
            wsMessageCallback(<Lib.ErrorMessage>obj);
            wsMessageCallback = null;
        }
    } else {
        previousGameState = gameState;
        gameState = <Lib.GameState>obj;

        if (previousGameState !== undefined) {
            for (let i = 0; i < selectedIndices.length; ++i) {
                if (gameState.playerCards[selectedIndices[i]] !== previousGameState.playerCards[selectedIndices[i]]) {
                    let found = false;
                    for (let j = 0; j < gameState.playerCards.length; ++j) {
                        if (gameState.playerCards[j] === previousGameState.playerCards[selectedIndices[i]]) {
                            selectedIndices[i] = j;
                            found = true;
                            break;
                        }
                    }

                    if (!found) { 
                        selectedIndices.splice(i, 1);
                        --i;
                    }
                }
            }

            selectedIndices.sort();

            for (let i = 0; i < previousGameState.playerCards.length; ++i) {
                temporaryTargets[i] = cardTargets[0][i];
                temporaryPositions[i] = cardPositions[0][i];
                temporaryVelocities[i] = cardPositions[0][i];
            }

            for (let i = 0; i < gameState.playerCards.length; ++i) {
                if (gameState.playerCards[i] !== previousGameState.playerCards[i]) {
                    /*console.log(`[${i}]: ${
                        Lib.cardToString(gameState.playerCards[i])
                    } !== ${
                        Lib.cardToString(previousGameState.playerCards[i])
                    }`);*/

                    for (let j = 0; j < previousGameState.playerCards.length; ++j) {
                        if (gameState.playerCards[i] === previousGameState.playerCards[j]) {
                            cardTargets[0][i] = temporaryTargets[j];
                            cardPositions[0][i] = temporaryPositions[j];
                            cardVelocities[0][i] = temporaryVelocities[j];
                            break;
                        }
                    }
                }
            }
        }

        if (wsMessageCallback !== null) {
            wsMessageCallback(gameState);
            wsMessageCallback = null;
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
    const result = await new Promise<Lib.ErrorMessage | Lib.GameState>(resolve => {
        wsMessageCallback = resolve;
        ws.send(JSON.stringify(<Lib.JoinMessage>{
            gameId: gameId,
            playerName: playerName
        }));
    });
    
    if ('errorDescription' in result) {
        window.alert(result.errorDescription);
        throw new Error(result.errorDescription);
    }

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

    if (gameState !== undefined) {
        // clear the screen
        context.clearRect(0, 0, canvas.width, canvas.height);

        renderBasics(<string>gameId, <string>playerName);
        renderDeck(time, gameState.deckCount);
        renderOtherPlayers(gameState);
        gameState.playerRevealCount = renderPlayer(
            gameState.playerCards,
            gameState.playerRevealCount,
            gameState.playerIndex
        );
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

let deckTargets: Vector[] = [];
let deckPositions: Vector[] = [];
let deckVelocities: Vector[] = []
let deckGap = 1;
let dealTime: number | undefined = undefined;
let dealDuration = 1000;

function renderDeck(time: number, deckCount: number) {
    context.save();
    try {
        if (dealTime === undefined) {
            dealTime = time;
        }

        const cardImage = <HTMLImageElement>cardImages.get('Back0');
        const y = canvas.height / 2 - cardHeight / 2;
        for (let i = 0; i < deckCount; ++i) {
            if (deckPositions[i] === undefined) {
                deckPositions[i] = { x: 0, y: 0 };
            }

            // deckTopTarget set by onmousemove
            if (deckVelocities[i] === undefined) {
                deckVelocities[i] = { x: 0, y: 0 };
            }

            if (onDeckAtMouseDown && i === deckCount - 1) {
                // set in onmousemove
            } else if (time - dealTime < i * dealDuration / deckCount) {
                deckTargets[i] = { x: -cardWidth, y: -cardHeight };
            } else {
                deckTargets[i] = {
                    x: canvas.width / 2 - cardWidth / 2 - (i - deckCount / 2) * deckGap,
                    y
                };
            }

            [deckPositions[i], deckVelocities[i]] = slide(deckTargets[i], deckPositions[i], deckVelocities[i]);

            context.drawImage(
                cardImage,
                deckPositions[i].x,
                deckPositions[i].y,
                cardWidth,
                cardHeight
            );
        }
    } finally {
        context.restore();
    }
}

function renderOtherPlayers(gameState: Lib.GameState) {
    context.save();
    try {
        context.translate(0, (canvas.width + canvas.height) / 2);
        context.rotate(-90 * radiansPerDegree);
        renderOtherPlayer(gameState, (gameState.playerIndex + 1) % 4);
    } finally {
        context.restore();
    }
    
    context.save();
    try {
        renderOtherPlayer(gameState, (gameState.playerIndex + 2) % 4);
    } finally {
        context.restore();
    }

    context.save();
    try {
        context.translate(canvas.width, (canvas.height - canvas.width) / 2);
        context.rotate(90 * radiansPerDegree);
        renderOtherPlayer(gameState, (gameState.playerIndex + 3) % 4);
    } finally {
        context.restore();
    }
}

const cardTargets: Vector[][] = [[], [], [], []];
const cardPositions: Vector[][] = [[], [], [], []];
const cardVelocities: Vector[][] = [[], [], [], []];

function renderOtherPlayer(gameState: Lib.GameState, playerIndex: number) {
    const player = gameState.otherPlayers[playerIndex];
    if (player === undefined) { 
        return;
    }

    const previousPlayer = previousGameState?.otherPlayers[playerIndex];

    context.fillStyle = '#000000ff';
    context.font = `${cardGap}px Irregularis`;
    context.fillText(player.name, canvas.width / 2, cardHeight + cardGap);

    const deckPosition = context.getTransform().inverse().transformPoint({
        w: 1,
        x: deckPositions[gameState.deckCount - 1].x,
        y: deckPositions[gameState.deckCount - 1].y,
        z: 0
    });

    for (let i = 0; i < player.cardCount; ++i) {
        let j: number;
        let count: number;
        let cardImage: HTMLImageElement;
        let y: number;
        if (i < player.revealedCards.length) {
            j = i;
            count = player.revealedCards.length;
            cardImage = <HTMLImageElement>cardImages.get(Lib.cardToString(player.revealedCards[i]));
            y = cardHeight;
        } else {
            j = i - player.revealedCards.length;
            count = player.cardCount - j;
            cardImage = <HTMLImageElement>cardImages.get(`Back${playerIndex}`);
            y = 0;
        }

        if (cardPositions[playerIndex][i] === undefined) {
            cardPositions[playerIndex][i] = {
                x: canvas.width / 2 - cardWidth / 2,
                y: y
            };

            if (previousGameState !== undefined && previousGameState.deckCount > gameState.deckCount) {
                cardPositions[playerIndex][i] = deckPosition;
            }
            
            if (previousPlayer != undefined && previousPlayer.cardCount == player.cardCount) {
                if (previousPlayer.revealedCards.length < player.revealedCards.length) {
                    cardPositions[playerIndex][i] = {
                        x: canvas.width / 2 - cardWidth / 2,
                        y: 0
                    };
                } else if (previousPlayer.revealedCards.length > player.revealedCards.length) {
                    cardPositions[playerIndex][i] = {
                        x: canvas.width / 2 - cardWidth / 2,
                        y: cardHeight
                    };
                }
            }
        }

        if (cardVelocities[playerIndex][i] === undefined) {
            cardVelocities[playerIndex][i] = { x: 0, y: 0 };
        }
        
        cardTargets[playerIndex][i] = {
            x: canvas.width / 2 - cardWidth / 2 + (j - count / 2) * cardGap,
            y: y
        };

        [cardPositions[playerIndex][i], cardVelocities[playerIndex][i]] = slide(
            cardTargets[playerIndex][i],
            cardPositions[playerIndex][i],
            cardVelocities[playerIndex][i]
        );

        context.drawImage(
            cardImage,
            cardPositions[playerIndex][i].x,
            cardPositions[playerIndex][i].y,
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
const selectedIndices: number[] = [];

const movingCards: Lib.Card[] = [];
const movingCardTargets: Vector[] = [];
const movingCardPositions: Vector[] = [];
const movingCardVelocities: Vector[] = [];

const reservedCards: Lib.Card[] = [];
const reservedCardTargets: Vector[] = [];
const reservedCardPositions: Vector[] = [];
const reservedCardVelocities: Vector[] = [];

const moveThreshold = 0.2 * pixelsPerCM;
const springConstant = 1000;
const mass = 1;
const drag = Math.sqrt(4 * mass * springConstant);

//let n = 1000;

function slide(target: Vector, position: Vector, velocity: Vector): [Vector, Vector] {
    const springForce = scale(springConstant, sub(target, position));
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
    Return,
    DeselectHidden,
    DeselectRevealed,
    SelectHidden,
    SelectRevealed,
    Toggle
}

function getDropAction(gameState: Lib.GameState): Action {
    const dropPosition = cardPositions[gameState.playerIndex][selectedIndices[0]];

    if (deckPositions[gameState.deckCount - 1].x - cardWidth / 2 < dropPosition.x && dropPosition.x < deckPositions[0].x + cardWidth / 2 &&
        deckPositions[gameState.deckCount - 1].y - cardHeight / 2 < dropPosition.y && dropPosition.y < deckPositions[0].y + cardHeight / 2
    ) {
        return Action.Return;
    }

    const deselectHiddenDistance   = Math.abs(dropPosition.y - (canvas.height -     cardHeight));
    const deselectRevealedDistance = Math.abs(dropPosition.y - (canvas.height - 2 * cardHeight));
    const selectHiddenDistance     = Math.abs(dropPosition.y - (canvas.height -     cardHeight - 2 * cardGap));
    const selectRevealedDistance   = Math.abs(dropPosition.y - (canvas.height - 2 * cardHeight - 2 * cardGap));
    const deselectDistance = Math.min(deselectHiddenDistance, deselectRevealedDistance);
    const selectDistance = Math.min(selectHiddenDistance, selectRevealedDistance);
    if (deselectDistance < selectDistance) {
        if (deselectHiddenDistance < deselectRevealedDistance) {
            return Action.DeselectHidden;
        } else {
            return Action.DeselectRevealed;
        }
    } else {
        if (selectHiddenDistance < selectRevealedDistance) {
            return Action.SelectHidden;
        } else {
            return Action.SelectRevealed;
        }
    }
}

let mouseDownPosition = <Vector>{ x: 0, y: 0 };
let mouseMovePosition = <Vector>{ x: 0, y: 0 };
let exceededMoveTreshold = false;
let onDeckAtMouseDown = false;
let cardIndexAtMouseDown = -1;
let action = Action.None;

function getMousePosition(e: MouseEvent) {
    return {
        x: canvas.width * (e.clientX - canvasRect.left) / canvasRect.width,
        y: canvas.height * (e.clientY - canvasRect.top) / canvasRect.height
    };
}

canvas.onmousedown = function(e) {
    mouseDownPosition = getMousePosition(e);
    exceededMoveTreshold = false;
    action = Action.None;

    cardIndexAtMouseDown = -1;

    if (gameState === undefined) {
        return;
    }
    
    onDeckAtMouseDown =
        deckPositions[gameState.deckCount - 1].x < mouseDownPosition.x && mouseDownPosition.x < deckPositions[gameState.deckCount - 1].x + cardWidth &&
        deckPositions[gameState.deckCount - 1].y < mouseDownPosition.y && mouseDownPosition.y < deckPositions[gameState.deckCount - 1].y + cardHeight;

    for (let i = cardPositions[gameState.playerIndex].length - 1; i >= 0; --i) {
        const x0 = cardPositions[gameState.playerIndex][i].x;
        const y0 = cardPositions[gameState.playerIndex][i].y;
        const x1 = x0 + cardWidth;
        const y1 = y0 + cardHeight;
        if (x0 < mouseDownPosition.x && mouseDownPosition.x < x1 &&
            y0 < mouseDownPosition.y && mouseDownPosition.y < y1
        ) {
            cardIndexAtMouseDown = i;
            action = Action.Toggle;
            break;
        }
    }
};

canvas.onmousemove = function(e) {
    mouseMovePosition = getMousePosition(e);

    let movement = { x: e.movementX, y: e.movementY };
    exceededMoveTreshold = exceededMoveTreshold || distance(mouseMovePosition, mouseDownPosition) > moveThreshold;

    if (gameState === undefined) {
        return;
    }

    if (action === Action.Toggle && exceededMoveTreshold) {
        // dragging a card selects it
        let selectedIndexIndex = binarySearch(selectedIndices, cardIndexAtMouseDown);
        if (selectedIndexIndex < 0) {
            selectedIndexIndex = ~selectedIndexIndex;
            selectedIndices.splice(selectedIndexIndex, 0, cardIndexAtMouseDown);
        }

        // start of movement
        action = getDropAction(gameState);

        // movement threshold needs to be accounted for
        movement = add(movement, sub(mouseMovePosition, mouseDownPosition));

        // gather together selected cards around the card under the mouse
        for (let i = 0; i < selectedIndices.length; ++i) {
            movingCardTargets[i] = add(movement, {
                x: cardPositions[gameState.playerIndex][cardIndexAtMouseDown].x + (i - selectedIndexIndex) * cardGap,
                y: cardPositions[gameState.playerIndex][cardIndexAtMouseDown].y
            });
        }
    }
    
    if (action === Action.Return ||
        action === Action.DeselectHidden   || action === Action.SelectHidden ||
        action === Action.DeselectRevealed || action === Action.SelectRevealed
    ) {
        action = getDropAction(gameState);
    
        // move all selected cards
        for (let i = 0; i < selectedIndices.length; ++i) {
            movingCardTargets[i] = add(movingCardTargets[i], movement);
        }
    }
    
    if (onDeckAtMouseDown) {
        if (action === Action.None && exceededMoveTreshold) {
            action = Action.Draw;

            drawCard();
        }

        // move the deck's top card
        deckTargets[gameState.deckCount - 1] = add(deckTargets[gameState.deckCount - 1], movement);
    }
};

canvas.onmouseup = function(e) {
    if (action === Action.Toggle) {
        if (cardIndexAtMouseDown < 0) {
            throw new Error();
        }

        let selectedIndexIndex = binarySearch(selectedIndices, cardIndexAtMouseDown);
        if (selectedIndexIndex < 0) {
            selectedIndices.splice(~selectedIndexIndex, 0, cardIndexAtMouseDown);
        } else {
            selectedIndices.splice(selectedIndexIndex, 1);
        }
    }
    
    if (gameState === undefined) {
        return;
    }

    if (action === Action.Return) {
        returnCards(gameState);
    }

    if (action === Action.DeselectHidden || action === Action.DeselectRevealed) {
        selectedIndices.splice(0, selectedIndices.length);

        reorderCards(gameState);
    }
    
    if (action === Action.SelectHidden || action === Action.SelectRevealed) {
        let selectedIndexIndex = binarySearch(selectedIndices, cardIndexAtMouseDown);
        if (selectedIndexIndex < 0) {
            selectedIndexIndex = ~selectedIndexIndex;
            selectedIndices.splice(selectedIndexIndex, 0, cardIndexAtMouseDown);
        }

        reorderCards(gameState);
    }
    
    if (sortBySuitBounds[0].x < mouseDownPosition.x && mouseDownPosition.x < sortBySuitBounds[1].x &&
        sortBySuitBounds[0].y < mouseDownPosition.y && mouseDownPosition.y < sortBySuitBounds[1].y
    ) {
        sortBySuit(gameState.playerIndex);
    }
    
    if (sortByRankBounds[0].x < mouseDownPosition.x && mouseDownPosition.x < sortByRankBounds[1].x &&
        sortByRankBounds[0].y < mouseDownPosition.y && mouseDownPosition.y < sortByRankBounds[1].y
    ) {
        sortByRank(gameState);
    }

    onDeckAtMouseDown = false;
    cardIndexAtMouseDown = -1;
    action = Action.None;
};

function drawCard() {
    wsMessageCallback = result => {
        if ('errorDescription' in result) {
            console.error(result.errorDescription);
        } else {
            // transition to moving state
            onDeckAtMouseDown = false;
            cardIndexAtMouseDown = result.playerCards.length - 1;
            selectedIndices.splice(0, selectedIndices.length, cardIndexAtMouseDown);
            cardTargets[result.playerIndex][cardIndexAtMouseDown] = add(deckPositions[result.deckCount - 1], sub(mouseMovePosition, mouseDownPosition));
            cardPositions[result.playerIndex][cardIndexAtMouseDown] = deckPositions[result.deckCount - 1];
            cardVelocities[result.playerIndex][cardIndexAtMouseDown] = { x: 0, y: 0 };
            movingCardTargets[0] = cardTargets[result.playerIndex][cardIndexAtMouseDown];

            if (action !== Action.None) { // only set the action if the mouse button is still down
                action = getDropAction(result);
            }
        }
    };

    ws.send(JSON.stringify(<Lib.DrawMessage>{
        draw: null
    }));
}

function returnCards(gameState: Lib.GameState) {
    wsMessageCallback = result => {
        if ('errorDescription' in result) {
            console.error(result.errorDescription);
        } else {
            // make the selected cards disappear
            selectedIndices.splice(0, selectedIndices.length);
        }
    };

    ws.send(JSON.stringify(<Lib.ReturnMessage>{
        cardsToReturn: selectedIndices.map(i => gameState.playerCards[i])
    }));
}

function reorderCards(gameState: Lib.GameState) {
    wsMessageCallback = result => {
        if ('errorDescription' in result) {
            console.error(result.errorDescription);
        }
    };

    ws.send(JSON.stringify(<Lib.ReorderMessage>{
        cards: gameState.playerCards,
        revealCount: gameState.playerRevealCount
    }));
}

// returns the adjusted reveal index
function renderPlayer(playerCards: Lib.Card[], revealCount: number, playerIndex: number): number {
    // initialize state
    for (let i = 0; i < playerCards.length; ++i) {
        if (cardTargets[playerIndex][i] === undefined) {
            cardTargets[playerIndex][i] = { x: 0, y: 0 };
        }
        
        if (cardPositions[playerIndex][i] === undefined) {
            cardPositions[playerIndex][i] = { x: 0, y: 0 };
        }

        if (cardVelocities[playerIndex][i] === undefined) {
            cardVelocities[playerIndex][i] = { x: 0, y: 0 };
        }
    }

    let splitIndex: number;
    let movingCardCount: number;
    let reservedCardCount: number;
    if (action === Action.Return ||
        action === Action.DeselectHidden   || action === Action.SelectHidden ||
        action === Action.DeselectRevealed || action === Action.SelectRevealed
    ) {
        // extract moving cards
        let revealCountAdjustment = 0;

        movingCardCount = 0;
        for (let i = 0; i < selectedIndices.length; ++i) {
            movingCards[movingCardCount] = playerCards[selectedIndices[i]];
            // movingCardTargets[movingCardCount] is set in onmousemove
            movingCardPositions[movingCardCount] = cardPositions[playerIndex][selectedIndices[i]];
            movingCardVelocities[movingCardCount] = cardVelocities[playerIndex][selectedIndices[i]];
            ++movingCardCount;

            if (selectedIndices[i] < revealCount) {
                ++revealCountAdjustment;
            }
        }

        revealCount -= revealCountAdjustment;

        // extract reserved cards
        reservedCardCount = 0;
        for (let i = 0; i < playerCards.length; ++i) {
            if (binarySearch(selectedIndices, i) < 0) {
                reservedCards[reservedCardCount] = playerCards[i];
                reservedCardTargets[reservedCardCount] = cardTargets[playerIndex][i];
                reservedCardPositions[reservedCardCount] = cardPositions[playerIndex][i];
                reservedCardVelocities[reservedCardCount] = cardVelocities[playerIndex][i];
                ++reservedCardCount;
            }
        }

        // determine whether the moving cards are closer to the revealed cards or to the hidden cards
        const splitRevealed = action === Action.DeselectRevealed || action === Action.SelectRevealed;
        const start = splitRevealed ? 0 : revealCount;
        const end = splitRevealed ? revealCount : reservedCardCount;

        // find the held cards, if any, overlapped by the dragged cards
        let leftIndex: number | undefined = undefined;
        let rightIndex: number | undefined = undefined;
        for (let i = start; i < end; ++i) {
            if (movingCardPositions[0].x < reservedCardTargets[i].x &&
                reservedCardTargets[i].x < movingCardPositions[movingCardCount - 1].x
            ) {
                if (leftIndex === undefined) {
                    leftIndex = i;
                }

                rightIndex = i;
            }
        }

        if (leftIndex !== undefined && rightIndex !== undefined) {
            const leftGap = reservedCardTargets[leftIndex].x - movingCardPositions[0].x;
            const rightGap = movingCardPositions[movingCardCount - 1].x - reservedCardTargets[rightIndex].x;

            if (leftGap < rightGap) {
                splitIndex = leftIndex;
            } else {
                splitIndex = rightIndex + 1;
            }
        } else {
            // no overlapped cards, so the index is the first reserved card to the right of the moving cards
            for (splitIndex = start; splitIndex < end; ++splitIndex) {
                if (movingCardPositions[movingCardCount - 1].x < reservedCardTargets[splitIndex].x) {
                    break;
                }
            }
        }

        // adjust selected indices
        for (let i = 0; i < selectedIndices.length; ++i) {
            selectedIndices[i] = splitIndex + i;
        }

        //context.fillStyle = '#ff0000ff';
        //context.fillText(`${splitIndex}`, 0.75 * canvas.width, canvas.height / 2 - 36);

        // adjust the reveal count
        if (splitIndex < revealCount ||
            splitIndex === revealCount && splitRevealed
        ) {
            revealCount += movingCardCount;
        }
    } else {
        // every card is reserved
        splitIndex = playerCards.length;
        movingCardCount = 0;
        reservedCardCount = playerCards.length;
        for (let i = 0; i < playerCards.length; ++i) {
            reservedCards[i] = playerCards[i];
            reservedCardTargets[i] = cardTargets[playerIndex][i];
            reservedCardPositions[i] = cardPositions[playerIndex][i];
            reservedCardVelocities[i] = cardVelocities[playerIndex][i];
        }
    }

    // draw reserved cards to the left of the moving cards
    for (let i = 0; i < splitIndex; ++i) {
        let cardImage = <HTMLImageElement>getCardImage(reservedCards[i]);

        const j = i < revealCount ? i : i - revealCount;
        const count = i < revealCount ? revealCount : playerCards.length - revealCount;
        const yOffset = i < revealCount ? 2 * cardHeight : cardHeight;
        reservedCardTargets[i] = {
            x: canvas.width / 2 - cardWidth / 2 + (j - count / 2) * cardGap,
            y: canvas.height - yOffset - (binarySearch(selectedIndices, i) < 0 ? 0 : 2 * cardGap)
        };

        [reservedCardPositions[i], reservedCardVelocities[i]] = slide(
            reservedCardTargets[i],
            reservedCardPositions[i],
            reservedCardVelocities[i]
        );

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
        cardTargets[playerIndex][i] = reservedCardTargets[i];
        cardPositions[playerIndex][i] = reservedCardPositions[i];
        cardVelocities[playerIndex][i] = reservedCardVelocities[i];
    }

    // render dragged cards
    for (let i = 0; i < movingCardCount; ++i) {
        let cardImage = <HTMLImageElement>getCardImage(movingCards[i]);

        [movingCardPositions[i], movingCardVelocities[i]] = slide(
            movingCardTargets[i],
            movingCardPositions[i],
            movingCardVelocities[i]
        );

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

        const j = splitIndex + i;
        playerCards[j] = movingCards[i];
        cardTargets[playerIndex][j] = movingCardTargets[i];
        cardPositions[playerIndex][j] = movingCardPositions[i];
        cardVelocities[playerIndex][j] = movingCardVelocities[i];
    }

    // render remaining held cards
    for (let i = splitIndex; i < reservedCardCount; ++i) {
        let cardImage = <HTMLImageElement>getCardImage(reservedCards[i]);

        let j = movingCardCount + i;
        let k = j < revealCount ? j : j - revealCount;
        const count = j < revealCount ? revealCount : playerCards.length - revealCount;
        const yOffset = j < revealCount ? 2 * cardHeight : cardHeight;
        reservedCardTargets[i] = {
            x: canvas.width / 2 - cardWidth / 2 + (k - count / 2) * cardGap,
            y: canvas.height - yOffset
        };
        
        [reservedCardPositions[i], reservedCardVelocities[i]] = slide(
            reservedCardTargets[i],
            reservedCardPositions[i],
            reservedCardVelocities[i]
        );

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

        playerCards[j] = reservedCards[i];
        cardTargets[playerIndex][j] = reservedCardTargets[i];
        cardPositions[playerIndex][j] = reservedCardPositions[i];
        cardVelocities[playerIndex][j] = reservedCardVelocities[i];
    }

    //context.fillStyle = '#ff0000ff';
    //context.fillText(`${revealCount}`, 0.75 * canvas.width, canvas.height / 2 + 12);

    return revealCount;
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

function sortBySuit(playerIndex: number) {
    if (gameState === undefined) {
        return;
    }

    const cardsWithIndex: [Lib.Card, number][] = gameState.playerCards.map((card, index) => [card, index]);
    cardsWithIndex.sort(([a, i], [b, j]) => {
        if (Lib.getSuit(a) === Lib.getSuit(b)) {
            return Lib.getRank(a) - Lib.getRank(b);
        } else {
            return Lib.getSuit(a) - Lib.getSuit(b);
        }
    });

    remap(gameState, cardsWithIndex);

    reorderCards(gameState);
}

function sortByRank(gameState: Lib.GameState) {
    const cardsWithIndex: [Lib.Card, number][] = gameState.playerCards.map((card, index) => [card, index]);
    cardsWithIndex.sort(([a, i], [b, j]) => {
        if (Lib.getRank(a) === Lib.getRank(b)) {
            return Lib.getSuit(a) - Lib.getSuit(b);
        } else {
            return Lib.getRank(a) - Lib.getRank(b);
        }
    });

    remap(gameState, cardsWithIndex);

    reorderCards(gameState);
}

function remap(gameState: Lib.GameState, cardsWithIndex: [Lib.Card, number][]) {
    console.log(`${JSON.stringify(gameState.playerCards.map(
        (card, index) => `[${Lib.cardToString(card)}, ${index}]`
    ))}`);
    console.log(`${JSON.stringify(cardsWithIndex.map(
        ([card, index]) => `[${Lib.cardToString(card)}, ${index}]`
    ))}`);

    for (let i = 0; i < cardsWithIndex.length; ++i) {
        const [card, _] = cardsWithIndex[i];
        gameState.playerCards[i] = card;
    }

    for (let i = 0; i < cardsWithIndex.length; ++i) {
        const [_, j] = cardsWithIndex[i];
        temporaryTargets[i] = cardTargets[gameState.playerIndex][j];
        temporaryPositions[i] = cardPositions[gameState.playerIndex][j];
        temporaryVelocities[i] = cardVelocities[gameState.playerIndex][j];
    }

    for (let i = 0; i < cardPositions[gameState.playerIndex].length; ++i) {
        cardTargets[gameState.playerIndex][i] = temporaryTargets[i];
        cardPositions[gameState.playerIndex][i] = temporaryPositions[i];
        cardVelocities[gameState.playerIndex][i] = temporaryVelocities[i];
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