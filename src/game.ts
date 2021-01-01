import { Util } from './util';
import bs from 'binary-search';

const playerName = Util.getCookie('playerName');
if (playerName === undefined) {
    throw new Error('No player name!');
}

const gameId = Util.getCookie('gameId');
if (gameId === undefined) {
    throw new Error('No game id!');
}

// refreshing should rejoin the same game
window.history.pushState(undefined, gameId, `/game?gameId=${gameId}&playerName=${playerName}`);

let gameStateMessage: Util.GameStateMessage | undefined = undefined;

// open websocket connection to get game state updates
let ws = new WebSocket(`ws://${window.location.hostname}:${JSON.parse(window.location.port) + 1111}`);
ws.onmessage = ev => {
    const obj = JSON.parse(ev.data);
    if ('errorDescription' in obj && typeof obj.errorDescription === 'string') {
        window.alert((<Util.ErrorMessage>obj).errorDescription);
    } else {
        gameStateMessage = <Util.GameStateMessage>obj;
        console.log(gameStateMessage);
    }
};

// parameters for rendering
const canvas = <HTMLCanvasElement>document.getElementById('canvas');
const canvasRect = canvas.getBoundingClientRect();
canvas.width = canvasRect.right - canvasRect.left;
canvas.height = canvasRect.bottom - canvasRect.top;
const context = <CanvasRenderingContext2D>canvas.getContext('2d');

// get pixels per centimeter
const testElement = document.createElement('div');
testElement.style.width = '1cm';
document.body.appendChild(testElement);
const pixelsPerCM = testElement.offsetWidth;
document.body.removeChild(testElement);

console.log(`canvas: ${canvas}, context: ${context}, pixelsPerCM: ${pixelsPerCM}`);

const cardImages = new Map<string, HTMLImageElement>();

const suits = ['Clubs', 'Dmnds', 'Hearts', 'Spades'];
const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

let cardWidth = 3 * pixelsPerCM;
let cardHeight = 5 * pixelsPerCM;

window.onload = async function() {
    // wait for connection
    while (ws.readyState != WebSocket.OPEN) {
        await Util.delay(1000);
        console.log(`ws.readyState: ${ws.readyState}`);
    }

    // try to join the game
    ws.send(JSON.stringify(<Util.JoinMessage>{
        gameId: gameId,
        playerName: playerName
    }));

    // load card images asynchronously
    for (let suit = 0; suit < 4; ++suit) {
        for (let rank = 1; rank <= 13; ++rank) {
            const image = new Image();
            image.src = `PaperCards/${suits[suit]}/${ranks[rank - 1]}of${suits[suit]}.png`;
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

    const grayJokerImage = new Image();
    grayJokerImage.src = 'PaperCards/Joker0.png';
    grayJokerImage.onload = () => {
        console.log(`loaded '${grayJokerImage.src}'`);
        cardImages.set('GrayJoker', grayJokerImage);
    };

    const colorJokerImage = new Image();
    colorJokerImage.src = 'PaperCards/Joker1.png';
    colorJokerImage.onload = () => {
        console.log(`loaded '${colorJokerImage.src}'`);
        cardImages.set('ColorJoker', colorJokerImage);
    };

    const blankImage = new Image();
    blankImage.src = 'PaperCards/Blank Card.png';
    blankImage.onload = () => {
        console.log(`loaded '${blankImage.src}'`);
        cardImages.set('Blank', blankImage);
    };

    while (cardImages.size < 4 * 13 + 7) {
        await Util.delay(10);
    }

    console.log('all card images loaded');

    // initialize render context
    console.log(`initial transform: ${context.getTransform()}`);

    // rendering must be synchronous, or else it flickers
    window.requestAnimationFrame(render);
}

let previousTime: number | undefined = undefined;
function render(time: number) {
    if (previousTime === undefined) {
        previousTime = time;
    }

    if (gameStateMessage !== undefined) {
        const gameState = gameStateMessage; // cache the game state in case it changes

        // clear the screen
        context.clearRect(0, 0, canvas.width, canvas.height);

        renderDeck(gameState.deckCount);
        renderOtherPlayers(gameState.playerIndex, gameState.otherPlayers);
        renderPlayer(time - previousTime, gameState.playerCards);
        
        window.requestAnimationFrame(render);
    } else {
        // wait until we have a game state
        setTimeout(() => {
            window.requestAnimationFrame(render);
        }, 100);
    }
}

function renderDeck(deckCount: number) {
    context.save();
    try {
        context.translate(canvas.width, 0);
        context.rotate(90 * radiansPerDegree);

        const gap = 0.01 * pixelsPerCM;
        for (let i = 0; i < deckCount; ++i) {
            const cardImage = <HTMLImageElement>cardImages.get('Back0');
            context.drawImage(
                cardImage,
                i * gap,
                i * gap,
                cardWidth,
                cardHeight
            );
        }
    } finally {
        context.restore();
    }
}

function renderOtherPlayers(playerIndex: number, otherPlayers: Record<number, Util.OtherPlayer>) {
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

const gap = 0.5 * pixelsPerCM;

function renderOtherPlayer(index: number, otherPlayer: Util.OtherPlayer | undefined) {
    if (otherPlayer === undefined) {
        return;
    }

    const cardImage = <HTMLImageElement>cardImages.get(`Back${index}`);
    for (let i = 0; i < otherPlayer.cardCount; ++i) {
        context.drawImage(
            cardImage,
            canvas.width / 2 + (i - otherPlayer.cardCount / 2) * gap - cardWidth / 2,
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
    x: number = 0;
    y: number = 0;
}

// extra state for the player's card
const target0s: Vector[] = [];
const card0s: Vector[] = [];
const card1s: Vector[] = []; 
const selectedIndices: number[] = [];
let indexAtMouseDown = -1;
let dragging = false;
let mouseDownPosition: Vector;
const dragThreshold = 0.2 * pixelsPerCM;

function getMousePosition(e: MouseEvent): Vector {
    const rect = canvas.getBoundingClientRect();
    return {
        x: canvas.width * (e.clientX - rect.left) / rect.width,
        y: canvas.height * (e.clientY - rect.top) / rect.height
    };
}

function distance(u: Vector, v: Vector): number {
    const dx = u.x - v.x;
    const dy = u.y - v.y;
    return Math.sqrt(dx * dx + dy * dy);
}

canvas.addEventListener("mousedown", function(e) {
    mouseDownPosition = getMousePosition(e);
    const { x, y } = mouseDownPosition;

    indexAtMouseDown = -1;
    for (let i = 0; i < card0s.length; ++i) {
        const { x: x0, y: y0 } = card0s[i];
        const { x: x1, y: y1 } = card1s[i];
        if (x0 < x && x < x1 && y0 < y && y < y1) {
            indexAtMouseDown = i;
        }
    }
});

canvas.addEventListener("mousemove", function(e) {
    if (indexAtMouseDown >= 0) {
        const mousePosition = getMousePosition(e);
        if (dragging || distance(mousePosition, mouseDownPosition) > dragThreshold) {
            let dx = e.movementX;
            let dy = e.movementY;
            if (!dragging) {
                dragging = true;
                dx += mousePosition.x - mouseDownPosition.x;
                dy += mousePosition.y - mouseDownPosition.y;

                // dragging a card selects it
                let selectedIndexIndex = binarySearch(selectedIndices, indexAtMouseDown);
                if (selectedIndexIndex < 0) {
                    selectedIndexIndex = ~selectedIndexIndex;
                    selectedIndices.splice(selectedIndexIndex, 0, indexAtMouseDown);
                }

                // gather together selected cards around the card under the mouse
                const { x, y } = card0s[indexAtMouseDown];
                for (let i = 0; i < selectedIndices.length; ++i) {
                    const x0 = x + (i - selectedIndexIndex) * gap;
                    const x1 = x0 + cardWidth;
                    const y0 = y;
                    const y1 = y0 + cardHeight;
                    const selectedIndex = selectedIndices[i];
                    card0s[selectedIndex] = { x: x0, y: y0 };
                    card1s[selectedIndex] = { x: x1, y: y1 };
                }
            }

            // move all selected cards
            for (let i = 0; i < selectedIndices.length; ++i) {
                const selectedIndex = selectedIndices[i];
                const { x: x0, y: y0 } = card0s[selectedIndex];
                const { x: x1, y: y1 } = card1s[selectedIndex];
                card0s[selectedIndex] = { x: x0 + dx, y: y0 + dy };
                card1s[selectedIndex] = { x: x1 + dx, y: y1 + dy };
            }
        }
    }
});

canvas.addEventListener("mouseup", function(e) {
    if (indexAtMouseDown >= 0) {
        if (dragging) {
            dragging = false;

            const dropY = card0s[selectedIndices[0]].y;
            const deselectDistance = Math.abs(dropY - (canvas.height - cardHeight));
            const selectDistance = Math.abs(dropY - (canvas.height - cardHeight - 2 * gap));
            const playDistance = Math.abs(dropY - canvas.height / 2);
            const shortest = [deselectDistance, selectDistance, playDistance].sort((a, b) => a - b)[0];
            if (shortest === deselectDistance) {
                selectedIndices.splice(0, selectedIndices.length);
            } else if (shortest === playDistance) {
            }
        } else {
            let selectedIndexIndex = binarySearch(selectedIndices, indexAtMouseDown);
            if (selectedIndexIndex < 0) {
                // select
                selectedIndices.splice(~selectedIndexIndex, 0, indexAtMouseDown);
            } else {
                // deselect
                selectedIndices.splice(selectedIndexIndex, 1);
            }
        }

        indexAtMouseDown = -1;
    }
});

function renderPlayer(deltaTime: number, cards: Util.Card[]) {
    context.save();
    try {
        const cardCount = cards.length;

        const hand: Util.Card[] = [];
        const hand0s: Vector[] = [];
        const hand1s: Vector[] = [];
        let index: number;
        if (dragging) {
            // extract dragged cards
            for (let i = 0; i < selectedIndices.length; ++i) {
                const selectedIndex = selectedIndices[i];
                hand.push(...cards.splice(selectedIndex - i, 1));
                hand0s.push(...card0s.splice(selectedIndex - i, 1));
                hand1s.push(...card1s.splice(selectedIndex - i, 1));
            }

            selectedIndices.splice(0, selectedIndices.length);
            
            // find the last card overlapped by the hand
            let leftIndex: number | undefined = undefined;
            let rightIndex: number | undefined = undefined;
            for (let i = 0; i < cards.length; ++i) {
                if (hand0s[0].x < card0s[i].x && card0s[i].x < hand0s[hand0s.length - 1].x) {
                    if (leftIndex === undefined) {
                        leftIndex = i;
                    }

                    rightIndex = i;
                }
            }

            if (leftIndex !== undefined && rightIndex !== undefined) {
                const leftGap = card0s[leftIndex].x - hand0s[0].x;
                const rightGap = hand0s[hand0s.length - 1].x - card0s[rightIndex].x;

                if (leftGap < rightGap) {
                    index = leftIndex;
                } else {
                    index = rightIndex + 1;
                }
            } else {
                // no overlapped cards, so the index is where it was before
                for (index = 0; index < cards.length; ++index) {
                    if (hand0s[hand0s.length - 1].x <= card0s[index].x) {
                        break;
                    }
                }
            }
        } else {
            index = cards.length;
        }

        context.font = '12px sans';

        // render cards to the left of the dragged hand
        for (let i = 0; i < index; ++i) {
            let cardImage = <HTMLImageElement>getCardImage(cards[i]);
    
            const selected = binarySearch(selectedIndices, i) >= 0;
            const x = canvas.width / 2 - cardCount / 2 * gap - cardWidth / 2 + i * gap;
            const y = canvas.height - cardHeight - (selected ? 2 * gap : 0);

            context.drawImage(
                cardImage,
                x,
                y,
                cardWidth,
                cardHeight
            );

            card0s[i] = { x, y };
            card1s[i] = { x: x + cardWidth, y: y + cardHeight };

            context.fillStyle = '#ff0000ff';
            context.fillText(`${x}`, x, y - 24);

            context.fillStyle = '#0000ffff';
            context.fillText(`${y}`, x, y - 12);
        }

        // splice dragged cards into position
        cards.splice(index, 0, ...hand);
        card0s.splice(index, 0, ...hand0s);
        card1s.splice(index, 0, ...hand1s);

        // render selection
        for (let i = index; i < index + hand.length; ++i) {
            selectedIndices.push(i);

            let cardImage = <HTMLImageElement>getCardImage(cards[i]);    

            const { x, y } = card0s[i];
            context.drawImage(
                cardImage,
                x,
                y,
                cardWidth,
                cardHeight
            );

            context.fillStyle = '#ff0000ff';
            context.fillText(`${x}`, x, y - 24);

            context.fillStyle = '#0000ffff';
            context.fillText(`${y}`, x, y - 12);
        }

        // render remaining cards
        for (let i = index + hand.length; i < cards.length; ++i) {
            let cardImage = <HTMLImageElement>getCardImage(cards[i]);
    
            const x = canvas.width / 2 - cardCount / 2 * gap - cardWidth / 2 + i * gap;
            const y = canvas.height - cardHeight;
    
            context.drawImage(
                cardImage,
                x,
                y,
                cardWidth,
                cardHeight
            );

            card0s[i] = { x, y };
            card1s[i] = { x: x + cardWidth, y: y + cardHeight };

            context.fillStyle = '#ff0000ff';
            context.fillText(`${x}`, x, y - 24);

            context.fillStyle = '#0000ffff';
            context.fillText(`${y}`, x, y - 12);
        }
    } finally {
        context.restore();
    }
}

function getCardImage(card: Util.Card) {
    if (card === Util.Joker.Big) {
        return cardImages.get('ColorJoker');
    } else if (card === Util.Joker.Small) {
        return cardImages.get('GrayJoker');
    } else {
        const [suit, rank] = card;
        return cardImages.get(`[${suit},${rank}]`);
    }
}

const radiansPerDegree: number = 0.01745329252;