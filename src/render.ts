import * as Lib from './lib';
import * as State from './state';
import * as Input from './input';
import Vector from './vector';

export let spriteWidth = 0;
export let spriteHeight = 0;
export let spriteGap = 0;
export let deckSpriteGap = 0;

const deckDealDuration = 1000;
let deckDealTime: number | undefined = undefined;

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

export let sortBySuitBounds: [Vector, Vector];
export let sortByRankBounds: [Vector, Vector];

let currentTime: number | undefined = undefined;
let deltaTime: number;

export function recalculateParameters() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - 0.5 * pixelsPerCM;
    canvasRect = canvas.getBoundingClientRect();

    pixelsPerPercent = canvas.height / 100;
    spriteWidth = 12 * pixelsPerPercent;
    spriteHeight = 18 * pixelsPerPercent;
    spriteGap = 2 * pixelsPerPercent;
    deckSpriteGap = 0.5 * pixelsPerPercent;

    sortBySuitBounds = [
        new Vector(canvas.width - 2.75 * pixelsPerCM, canvas.height - 3.5 * pixelsPerCM),
        new Vector(canvas.width, canvas.height - 2 * pixelsPerCM)
    ];
    sortByRankBounds = [
        new Vector(canvas.width - 2.75 * pixelsPerCM, canvas.height - 1.75 * pixelsPerCM),
        new Vector(canvas.width, canvas.height - 0.25 * pixelsPerCM)
    ];
}

export function render(time: number) {
    deltaTime = time - (currentTime !== undefined ? currentTime : time);
    currentTime = time;

    if (State.gameState !== undefined) {
        // clear the screen
        context.clearRect(0, 0, canvas.width, canvas.height);

        renderBasics(State.gameId, State.playerName);
        renderDeck(time, State.gameState.deckCount);
        renderOtherPlayers(State.gameState);
        State.gameState.playerRevealCount = renderPlayer(
            State.gameState.playerCards,
            State.gameState.playerRevealCount,
            State.gameState.playerIndex
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
    context.strokeRect(spriteHeight, spriteHeight, canvas.width - 2 * spriteHeight, canvas.height - 2 * spriteHeight);
}

function renderDeck(time: number, deckCount: number) {
    context.save();
    try {
        if (deckDealTime === undefined) {
            deckDealTime = time;
        }

        for (let i = 0; i < State.deckSprites.length; ++i) {
            const deckSprite = State.deckSprites[i];
            if (deckSprite === undefined) throw new Error();

            if (Input.onDeckAtMouseDown && i === deckCount - 1) {
                // set in onmousemove
            } else if (time - deckDealTime < i * deckDealDuration / deckCount) {
                deckSprite.target = new Vector(-spriteWidth, -spriteHeight);
            } else {
                deckSprite.target = new Vector(
                    canvas.width / 2 - spriteWidth / 2 - (i - deckCount / 2) * deckSpriteGap,
                    canvas.height / 2 - spriteHeight / 2
                );
            }

            deckSprite.animate(deltaTime);
        }
    } finally {
        context.restore();
    }
}

function renderOtherPlayers(gameState: Lib.GameState) {
    context.save();
    try {
        context.translate(0, (canvas.width + canvas.height) / 2);
        context.rotate(-Math.PI / 2);
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
        context.rotate(Math.PI);
        renderOtherPlayer(gameState, (gameState.playerIndex + 3) % 4);
    } finally {
        context.restore();
    }
}

function renderOtherPlayer(gameState: Lib.GameState, playerIndex: number) {
    const player = gameState.otherPlayers[playerIndex];
    if (player === undefined) return;

    context.fillStyle = '#000000ff';
    context.font = `${spriteGap}px Irregularis`;
    context.fillText(player.name, canvas.width / 2, spriteHeight + spriteGap);

    const deckPosition = State.deckSprites[State.deckSprites.length - 1]?.position ??
        new Vector(canvas.width / 2 - spriteWidth / 2, canvas.height / 2 - spriteHeight / 2);
    const deckPoint = context.getTransform().inverse().transformPoint({
        w: 1,
        x: deckPosition.x,
        y: deckPosition.y,
        z: 0
    });

    const faceSprites = State.faceSpritesForPlayer[playerIndex];
    if (faceSprites === undefined) throw new Error();
    for (let i = 0; i < faceSprites.length; ++i) {
        const faceSprite = faceSprites[i];
        if (faceSprite === undefined) throw new Error();
        faceSprite.target = new Vector(canvas.width / 2 - spriteWidth / 2 + (i - faceSprites.length / 2) * spriteGap, spriteHeight);
        faceSprite.animate(deltaTime);
    }

    const backSprites = State.backSpritesForPlayer[playerIndex];
    if (backSprites === undefined) throw new Error();
    for (let i = 0; i < backSprites.length; ++i) {
        const backSprite = backSprites[i];
        if (backSprite === undefined) throw new Error();
        backSprite.target = new Vector(canvas.width / 2 - spriteWidth / 2 + (i - backSprites.length / 2) * spriteGap, 0);
        backSprite.animate(deltaTime);
    }
}

// returns the adjusted reveal index
function renderPlayer(playerCards: Lib.Card[], revealCount: number, playerIndex: number): number {
    let splitIndex: number;
    let movingCardCount: number;
    let reservedCardCount: number;
    if (Input.action === Input.Action.Return ||
        Input.action === Input.Action.DeselectHidden   || Input.action === Input.Action.SelectHidden ||
        Input.action === Input.Action.DeselectRevealed || Input.action === Input.Action.SelectRevealed
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
        const yOffset = i < revealCount ? 2 * spriteHeight : spriteHeight;
        const selected = binarySearch(selectedIndices, i) >= 0;
        reservedCardTargets[i] = {
            x: canvas.width / 2 - spriteWidth / 2 + (j - count / 2) * spriteGap,
            y: canvas.height - yOffset - (selected ? 2 * spriteGap : 0)
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
            spriteWidth,
            spriteHeight
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
            spriteWidth,
            spriteHeight
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
        const yOffset = j < revealCount ? 2 * spriteHeight : spriteHeight;
        reservedCardTargets[i] = {
            x: canvas.width / 2 - spriteWidth / 2 + (k - count / 2) * spriteGap,
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
            spriteWidth,
            spriteHeight
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
