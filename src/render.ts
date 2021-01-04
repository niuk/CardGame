import * as Animation from './animation';
import Vector from './vector';

const canvas = <HTMLCanvasElement>document.getElementById('canvas');
const context = <CanvasRenderingContext2D>canvas.getContext('2d');
export let canvasRect = canvas.getBoundingClientRect();
export let pixelsPerPercent = 0;

// get pixels per centimeter
const testElement = document.createElement('div');
testElement.style.width = '1cm';
document.body.appendChild(testElement);
export const pixelsPerCM = testElement.offsetWidth;
document.body.removeChild(testElement);

export let cardWidth = 0;
export let cardHeight = 0;
export let cardGap = 0;

const deckGap = 1;
const dealTime: number | undefined = undefined;
const dealDuration = 1000;
export let deck: Animation.Card[];

export let sortBySuitBounds: [Vector, Vector];
export let sortByRankBounds: [Vector, Vector];

let currentTime: number | undefined = undefined;
let deltaTime: number;

export function recalculateParameters() {
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

export function render(time: number) {
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
        const selected = binarySearch(selectedIndices, i) >= 0;
        reservedCardTargets[i] = {
            x: canvas.width / 2 - cardWidth / 2 + (j - count / 2) * cardGap,
            y: canvas.height - yOffset - (selected ? 2 * cardGap : 0)
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
