import * as Lib from '../lib';
import * as State from './state';
import * as Input from './input';
import Vector from './vector';
import Sprite from './sprite';

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
        renderPlayer(State.gameState);
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

    let i = 0;
    const faceSprites = State.faceSpritesForPlayer[playerIndex];
    if (faceSprites === undefined) throw new Error();
    for (const faceSprite of faceSprites) {
        faceSprite.target = new Vector(canvas.width / 2 - spriteWidth / 2 + (i++ - faceSprites.length / 2) * spriteGap, spriteHeight);
        faceSprite.animate(deltaTime);
    }

    i = 0;
    const backSprites = State.backSpritesForPlayer[playerIndex];
    if (backSprites === undefined) throw new Error();
    for (const backSprite of backSprites) {
        backSprite.target = new Vector(canvas.width / 2 - spriteWidth / 2 + (i++ - backSprites.length / 2) * spriteGap, 0);
        backSprite.animate(deltaTime);
    }
}

// returns the adjusted reveal index
function renderPlayer(gameState: Lib.GameState) {
    const sprites = State.faceSpritesForPlayer[gameState.playerIndex];
    if (sprites === undefined) return;

    const movingSprites: Sprite[] = [];
    const reservedSprites: Sprite[] = [];

    let splitIndex: number;
    if (Input.action === Input.Action.Return ||
        Input.action === Input.Action.DeselectHidden   || Input.action === Input.Action.SelectHidden ||
        Input.action === Input.Action.DeselectRevealed || Input.action === Input.Action.SelectRevealed
    ) {
        let revealCountAdjustment = 0;

        // extract moving sprites
        for (const i of State.selectedIndices) {
            const sprite = sprites[i];
            if (sprite === undefined) throw new Error();
            movingSprites.push(sprite);

            if (i < gameState.playerRevealCount) {
                ++revealCountAdjustment;
            }
        }

        gameState.playerRevealCount -= revealCountAdjustment;

        // extract reserved sprites
        let i = 0;
        for (const sprite of sprites) {
            if (Lib.binarySearch(State.selectedIndices, i++) < 0) {
                reservedSprites.push(sprite);
            }
        }

        // determine whether the moving sprites are closer to the revealed sprites or to the hidden sprites
        const splitRevealed = Input.action === Input.Action.DeselectRevealed || Input.action === Input.Action.SelectRevealed;
        const start = splitRevealed ? 0 : gameState.playerRevealCount;
        const end = splitRevealed ? gameState.playerRevealCount : reservedSprites.length;

        // find the held sprites, if any, overlapped by the dragged sprites
        const leftMovingSprite = movingSprites[0];
        const rightMovingSprite = movingSprites[movingSprites.length - 1];
        if (leftMovingSprite === undefined || rightMovingSprite === undefined) throw new Error();

        let leftIndex: number | undefined = undefined;
        let rightIndex: number | undefined = undefined;
        for (let i = start; i < end; ++i) {
            const reservedSprite = reservedSprites[i];
            if (reservedSprite === undefined) throw new Error();
            if (leftMovingSprite.position.x < reservedSprite.position.x && reservedSprite.position.x < rightMovingSprite.position.x) {
                if (leftIndex === undefined) {
                    leftIndex = i;
                }

                rightIndex = i;
            }
        }

        if (leftIndex !== undefined && rightIndex !== undefined) {
            const leftReservedSprite = reservedSprites[leftIndex];
            const rightReservedSprite = reservedSprites[rightIndex];
            if (leftReservedSprite === undefined || rightReservedSprite === undefined) throw new Error();
            // use targets instead of positions for reserved sprites or else they will "wobble"
            const leftGap = leftReservedSprite.target.x - leftMovingSprite.position.x;
            const rightGap = rightMovingSprite.position.x - rightReservedSprite.target.x;
            if (leftGap < rightGap) {
                splitIndex = leftIndex;
            } else {
                splitIndex = rightIndex + 1;
            }
        } else {
            // no overlapped sprites, so the index is the first reserved sprite to the right of the moving sprites
            for (splitIndex = start; splitIndex < end; ++splitIndex) {
                const reservedSprite = reservedSprites[splitIndex];
                if (reservedSprite === undefined) throw new Error();
                if (rightMovingSprite.position.x < reservedSprite.target.x) {
                    break;
                }
            }
        }

        // adjust selected indices
        for (let i = 0; i < State.selectedIndices.length; ++i) {
            State.selectedIndices[i] = splitIndex + i;
        }

        // adjust the reveal count
        if (splitIndex < gameState.playerRevealCount || splitIndex === gameState.playerRevealCount && splitRevealed) {
            gameState.playerRevealCount += movingSprites.length;
        }
    } else {
        // every sprite is reserved
        splitIndex = sprites.length;
        reservedSprites.push(...sprites);
    }

    sprites.splice(0, sprites.length);

    for (const reservedSprite of reservedSprites) {
        if (sprites.length === splitIndex) {
            for (const movingSprite of movingSprites) {
                movingSprite.animate(deltaTime);
                sprites.push(movingSprite);
            }
        }

        const i = sprites.length < gameState.playerRevealCount ? sprites.length : sprites.length - gameState.playerRevealCount;
        const j = sprites.length < gameState.playerRevealCount ? gameState.playerRevealCount : reservedSprites.length - gameState.playerRevealCount;
        const y = sprites.length < gameState.playerRevealCount ? 2 * spriteHeight : spriteHeight;
        reservedSprite.target = new Vector(
            canvas.width / 2 - spriteWidth / 2 + (i - j / 2) * spriteGap,
            canvas.height - y - (Lib.binarySearch(State.selectedIndices, sprites.length) < 0 ? 0 : 2 * spriteGap)
        );

        reservedSprite.animate(deltaTime);
        sprites.push(reservedSprite);
    }
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
