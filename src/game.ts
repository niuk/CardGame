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

// open websocket connection to get game state updates
let ws = new WebSocket(`ws://${window.location.hostname}:${JSON.parse(window.location.port) + 1111}`);
ws.onmessage = ev => {
    const obj = JSON.parse(ev.data);
    if ('errorDescription' in obj && typeof obj.errorDescription === 'string') {
        window.alert((<Lib.ErrorMessage>obj).errorDescription);
    } else {
        gameStateMessage = <Lib.GameStateMessage>obj;
        //console.log(gameStateMessage);
    }
};

// parameters for rendering
const canvas = <HTMLCanvasElement>document.getElementById('canvas');
const context = <CanvasRenderingContext2D>canvas.getContext('2d');
let canvasRect = canvas.getBoundingClientRect();

// get pixels per centimeter
const testElement = document.createElement('div');
testElement.style.width = '1cm';
document.body.appendChild(testElement);
const pixelsPerCM = testElement.offsetWidth;
document.body.removeChild(testElement);

console.log(`canvas: ${canvas}, context: ${context}, pixelsPerCM: ${pixelsPerCM}`);

const cardImages = new Map<string, HTMLImageElement>();

const suits = ['Clubs', 'Dmnds', 'Hearts', 'Spades', 'Joker'];
const ranks = ['Small', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'Big'];

let cardWidth = 3 * pixelsPerCM;
let cardHeight = 5 * pixelsPerCM;

//                    [x0,     y0,     x1,     y1    ]
let sortBySuitBounds: [number, number, number, number];
let sortByRankBounds: [number, number, number, number];

function calculateButtonBounds() {
    sortBySuitBounds = [
        canvas.width - 3.25 * pixelsPerCM,
        canvas.height - 4.25 * pixelsPerCM,
        canvas.width,
        canvas.height - 3 * pixelsPerCM,
    ];
    sortByRankBounds = [
        canvas.width - 3.25 * pixelsPerCM,
        canvas.height - 2.25 * pixelsPerCM,
        canvas.width,
        canvas.height - 1 * pixelsPerCM,
    ];    
}

function calculateCanvasSize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - 1 * pixelsPerCM;
    canvasRect = canvas.getBoundingClientRect();
}

window.onresize = async function() {
    calculateCanvasSize();
    calculateButtonBounds();
};

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
            if (suit == Lib.Suit.Joker) {
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

    calculateCanvasSize();
    calculateButtonBounds();

    // rendering must be synchronous, or else it flickers
    window.requestAnimationFrame(render);
};

let currentTime: number;

function render(time: number) {
    currentTime = time;

    if (gameStateMessage !== undefined) {
        const gameState = gameStateMessage; // cache the game state in case it changes

        // clear the screen
        context.clearRect(0, 0, canvas.width, canvas.height);

        drawDeck(gameState.deckCount);
        drawOtherPlayers(gameState.playerIndex, gameState.otherPlayers);
        drawPlayer(time, gameState.playerCards);
        drawButtons();
        
        window.requestAnimationFrame(render);
    } else {
        // wait until we have a game state
        setTimeout(() => {
            window.requestAnimationFrame(render);
        }, 100);
    }
}

function drawDeck(deckCount: number) {
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

function drawOtherPlayers(playerIndex: number, otherPlayers: Record<number, Lib.OtherPlayer>) {
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

function renderOtherPlayer(index: number, otherPlayer: Lib.OtherPlayer | undefined) {
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

// extra state for the player's card
const animationStartTimes: number[] = [];
const animationStartPositions: number[] = [];
const playerCardPositions: number[] = [];

const selectedIndices: number[] = [];

const dragCards: Lib.Card[] = [];
const dragCardPositions: number[] = [];

const holdCards: Lib.Card[] = [];
const holdCardPositions: number[] = [];

let indexAtMouseDown = -1;
let dragging = false;
let mouseDownX: number;
let mouseDownY: number;
const dragThreshold = 0.2 * pixelsPerCM;

function getMouseX(e: MouseEvent) {
    return canvas.width * (e.clientX - canvasRect.left) / canvasRect.width;
}

function getMouseY(e: MouseEvent) {
    return canvas.height * (e.clientY - canvasRect.top) / canvasRect.height;
}

function distance(x0: number, y0: number, x1: number, y1: number): number {
    const dx = x1 - x0;
    const dy = y1 - y0;
    return Math.sqrt(dx * dx + dy * dy);
}

canvas.onmousedown = function(e) {
    mouseDownX = getMouseX(e);
    mouseDownY = getMouseY(e);

    indexAtMouseDown = -1;
    for (let i = 0; i < playerCardPositions.length; i += 2) {
        const x0 = playerCardPositions[i    ];
        const y0 = playerCardPositions[i + 1];
        const x1 = x0 + cardWidth;
        const y1 = y0 + cardHeight;
        if (x0 < mouseDownX && mouseDownX < x1 && y0 < mouseDownY && mouseDownY < y1) {
            indexAtMouseDown = i / 2;
        }
    }
};

canvas.onmousemove = function(e) {
    if (indexAtMouseDown >= 0) {
        const mouseX = getMouseX(e);
        const mouseY = getMouseY(e);
        if (dragging || distance(mouseX, mouseY, mouseDownX, mouseDownY) > dragThreshold) {
            let dx = e.movementX;
            let dy = e.movementY;

            if (!dragging) {
                dragging = true;
                dx += mouseX - mouseDownX;
                dy += mouseY - mouseDownY;

                // dragging a card selects it
                let selectedIndexIndex = binarySearch(selectedIndices, indexAtMouseDown);
                if (selectedIndexIndex < 0) {
                    selectedIndexIndex = ~selectedIndexIndex;
                    selectedIndices.splice(selectedIndexIndex, 0, indexAtMouseDown);
                }

                // gather together selected cards around the card under the mouse
                for (let i = 0; i < selectedIndices.length; ++i) {
                    playerCardPositions[2 * selectedIndices[i]    ] = playerCardPositions[2 * indexAtMouseDown    ] + (i - selectedIndexIndex) * gap;
                    playerCardPositions[2 * selectedIndices[i] + 1] = playerCardPositions[2 * indexAtMouseDown + 1];
                }
            }

            // move all selected cards
            for (let i = 0; i < selectedIndices.length; ++i) {
                playerCardPositions[2 * selectedIndices[i]    ] = playerCardPositions[2 * selectedIndices[i]    ] + dx;
                playerCardPositions[2 * selectedIndices[i] + 1] = playerCardPositions[2 * selectedIndices[i] + 1] + dy;
            }
        }
    }
};

canvas.onmouseup = function(e) {
    if (indexAtMouseDown >= 0) {
        if (dragging) {
            dragging = false;

            const dropY = playerCardPositions[selectedIndices[0] + 1];
            const deselectDistance = Math.abs(dropY - (canvas.height - cardHeight));
            const selectDistance = Math.abs(dropY - (canvas.height - cardHeight - 2 * gap));
            const playDistance = Math.abs(dropY - canvas.height / 2);
            const shortest = [deselectDistance, selectDistance, playDistance].sort((a, b) => a - b)[0];
            if (shortest === deselectDistance) {
                selectedIndices.splice(0, selectedIndices.length);
            } else if (shortest === playDistance) {
                // TODO
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
    } else {
        if (sortBySuitBounds[0] < mouseDownX && mouseDownX < sortBySuitBounds[2] &&
            sortBySuitBounds[1] < mouseDownY && mouseDownY < sortBySuitBounds[3]
        ) {
            sortBySuit();
        }

        if (sortByRankBounds[0] < mouseDownX && mouseDownX < sortByRankBounds[2] &&
            sortByRankBounds[1] < mouseDownY && mouseDownY < sortByRankBounds[3]
        ) {
            sortByRank();
        }
    }

    for (let i = 0; i < animationStartTimes.length; ++i) {
        animationStartTimes[i] = currentTime;
        animationStartPositions[2 * i    ] = playerCardPositions[2 * i    ];
        animationStartPositions[2 * i + 1] = playerCardPositions[2 * i + 1];
    }
};

function drawPlayer(time: number, playerCards: Lib.Card[]) {
    context.save();
    try {
        let splitIndex: number;
        if (dragging) {
            // extract dragged cards
            for (let i = 0; i < selectedIndices.length; ++i) {
                dragCards[i] = playerCards[selectedIndices[i]];
                dragCardPositions[2 * i    ] = playerCardPositions[2 * selectedIndices[i]    ];
                dragCardPositions[2 * i + 1] = playerCardPositions[2 * selectedIndices[i] + 1];
            }

            // extract held cards
            let j = 0;
            for (let i = 0; i < playerCards.length; ++i) {
                if (binarySearch(selectedIndices, i) < 0) {
                    holdCards[j] = playerCards[i];
                    holdCardPositions[2 * j    ] = playerCardPositions[2 * i    ];
                    holdCardPositions[2 * j + 1] = playerCardPositions[2 * i + 1];
                    ++j;
                }
            }

            // find the held cards, if any, overlapped by the dragged cards
            let leftIndex: number | undefined = undefined;
            let rightIndex: number | undefined = undefined;
            for (let i = 0; i < playerCards.length - selectedIndices.length; ++i) {
                if (dragCardPositions[0] < holdCardPositions[2 * i] && holdCardPositions[2 * i] < dragCardPositions[dragCardPositions.length - 2]) {
                    if (leftIndex === undefined) {
                        leftIndex = i;
                    }

                    rightIndex = i;
                }
            }

            if (leftIndex !== undefined && rightIndex !== undefined) {
                const leftGap = holdCardPositions[2 * leftIndex] - dragCardPositions[0];
                const rightGap = dragCardPositions[dragCardPositions.length - 2] - holdCardPositions[2 * rightIndex];

                if (leftGap < rightGap) {
                    splitIndex = leftIndex;
                } else {
                    splitIndex = rightIndex + 1;
                }
                context.fillStyle = '#0000ff77';
            } else {
                context.fillStyle = '#ff000077';
                // no overlapped cards, so the index is the first held card to the right of the dragged cards
                for (splitIndex = 0; splitIndex < playerCards.length - selectedIndices.length; ++splitIndex) {
                    if (dragCardPositions[dragCardPositions.length - 2] < holdCardPositions[2 * splitIndex]) {
                        break;
                    }
                }
            }
        } else {
            // not dragging, so every card is being held
            for (let i = 0; i < playerCards.length; ++i) {
                holdCards[i] = playerCards[i];
                holdCardPositions[2 * i    ] = playerCardPositions[2 * i    ];
                holdCardPositions[2 * i + 1] = playerCardPositions[2 * i + 1];
            }

            splitIndex = playerCards.length;
        }

        // render held cards to the left of the dragged hand
        for (let i = 0; i < splitIndex; ++i) {
            let cardImage = <HTMLImageElement>getCardImage(holdCards[i]);
    
            holdCardPositions[2 * i    ] = canvas.width / 2 - playerCards.length / 2 * gap - cardWidth / 2 + i * gap;
            holdCardPositions[2 * i + 1] = canvas.height - cardHeight - (!dragging && binarySearch(selectedIndices, i) >= 0 ? 2 * gap : 0);

            context.drawImage(
                cardImage,
                holdCardPositions[2 * i    ],
                holdCardPositions[2 * i + 1],
                cardWidth,
                cardHeight
            );

            //context.fillStyle = '#ff0000ff';
            //context.fillText(`${x}`, x, y - 24);

            //context.fillStyle = '#0000ffff';
            //context.fillText(`${y}`, x, y - 12);
            
            playerCards[i] = holdCards[i];
            playerCardPositions[2 * i    ] = holdCardPositions[2 * i    ];
            playerCardPositions[2 * i + 1] = holdCardPositions[2 * i + 1];
        }

        if (dragging) {
            // render dragged cards
            for (let i = 0; i < selectedIndices.length; ++i) {
                let cardImage = <HTMLImageElement>getCardImage(dragCards[i]);
    
                context.drawImage(
                    cardImage,
                    dragCardPositions[2 * i    ],
                    dragCardPositions[2 * i + 1],
                    cardWidth,
                    cardHeight
                );
    
                //context.fillStyle = '#ff0000ff';
                //context.fillText(`${x}`, x, y - 24);
    
                //context.fillStyle = '#0000ffff';
                //context.fillText(`${y}`, x, y - 12);
            }

            // render remaining held cards
            for (let i = splitIndex; i < playerCards.length - selectedIndices.length; ++i) {
                let cardImage = <HTMLImageElement>getCardImage(holdCards[i]);

                holdCardPositions[2 * i    ] = canvas.width / 2 - playerCards.length / 2 * gap - cardWidth / 2 + (i + selectedIndices.length) * gap,
                holdCardPositions[2 * i + 1] = canvas.height - cardHeight;

                context.drawImage(
                    cardImage,
                    holdCardPositions[2 * i    ],
                    holdCardPositions[2 * i + 1],
                    cardWidth,
                    cardHeight
                );

                //context.fillStyle = '#ff0000ff';
                //context.fillText(`${x}`, x, y - 24);
    
                //context.fillStyle = '#0000ffff';
                //context.fillText(`${y}`, x, y - 12);

                context.fillRect(holdCardPositions[2 * i], holdCardPositions[2 * i + 1], cardWidth, cardHeight);
            }

            // fix state
            for (let i = 0; i < selectedIndices.length; ++i) {
                playerCards[splitIndex + i] = dragCards[i];
                playerCardPositions[2 * (splitIndex + i)    ] = dragCardPositions[2 * i    ];
                playerCardPositions[2 * (splitIndex + i) + 1] = dragCardPositions[2 * i + 1];
            }

            for (let i = splitIndex; i < playerCards.length - selectedIndices.length; ++i) {
                playerCards[selectedIndices.length + i] = holdCards[i];
                playerCardPositions[2 * (selectedIndices.length + i)    ] = holdCardPositions[2 * i    ];
                playerCardPositions[2 * (selectedIndices.length + i) + 1] = holdCardPositions[2 * i + 1];
            }

            for (let i = 0; i < selectedIndices.length; ++i) {
                selectedIndices[i] = splitIndex + i;
            }
        }
    } finally {
        context.restore();
    }
}

function getCardImage(card: Lib.Card) {
    return cardImages.get(`[${Lib.getSuit(card)},${Lib.getRank(card)}]`);
}

const animationDuration = 1000;
const animationExponent = 10;
function animate(start: number, end: number, startTime: number, time: number): number {
    return start + (1 - Math.pow(2, animationExponent * (startTime - time) / animationDuration)) * (end - start);
}

const radiansPerDegree: number = 0.01745329252;

function drawButtons() {
    context.save();
    try {
        const x = canvas.width - 7.5 * pixelsPerCM;
        const y = canvas.height - 5 * pixelsPerCM;

        // blur image behind
        //stackBlurCanvasRGBA('canvas', x, y, canvas.width - x, canvas.height - y, 16);

        context.fillStyle = '#00ffff77';
        context.fillRect(x, y, canvas.width - x, canvas.height - y);
        
        context.fillStyle = '#000000ff';
        context.font = '1.5cm Irregularis';
        context.fillText('SORT', x + 0.5 * pixelsPerCM, y + 3 * pixelsPerCM);

        context.font = '3cm Irregularis';
        context.fillText('{', canvas.width - 4.25 * pixelsPerCM, canvas.height - 1.5 * pixelsPerCM);

        context.font = '1.5cm Irregularis';
        context.fillText('SUIT', sortBySuitBounds[0], sortBySuitBounds[3]);

        context.font = '1.5cm Irregularis';
        context.fillText('RANK', sortByRankBounds[0], sortByRankBounds[3]);

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

    const cardsWithIndex: [Lib.Card, number][] = gameStateMessage.playerCards.map((card, index) => [card, index]);
    cardsWithIndex.sort(([a, i], [b, j]) => {
        if (Lib.getSuit(a) === Lib.getSuit(b)) {
            return Lib.getRank(a) - Lib.getRank(b);
        } else {
            return Lib.getSuit(a) - Lib.getSuit(b);
        }
    });

    remap(cardsWithIndex);
}

function sortByRank() {
    if (gameStateMessage === undefined) {
        return;
    }

    const cardsWithIndex: [Lib.Card, number][] = gameStateMessage.playerCards.map((card, index) => [card, index]);
    cardsWithIndex.sort(([a, i], [b, j]) => {
        if (Lib.getRank(a) === Lib.getRank(b)) {
            return Lib.getSuit(a) - Lib.getSuit(b);
        } else {
            return Lib.getRank(a) - Lib.getRank(b);
        }
    });

    remap(cardsWithIndex);
}

const temporaryPositions: number[] = [];

function remap(cardsWithIndex: [Lib.Card, number][]) {
    if (gameStateMessage === undefined) {
        return;
    }

    for (let i = 0; i < cardsWithIndex.length; ++i) {
        const [card, _] = cardsWithIndex[i];
        gameStateMessage.playerCards[i] = card;
    }

    for (let i = 0; i < cardsWithIndex.length; ++i) {
        const [_, j] = cardsWithIndex[i];
        temporaryPositions[2 * i    ] = playerCardPositions[2 * j    ];
        temporaryPositions[2 * i + 1] = playerCardPositions[2 * j + 1];
    }

    for (let i = 0; i < temporaryPositions.length; ++i) {
        playerCardPositions[i] = temporaryPositions[i];
    }
}