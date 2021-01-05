import * as Lib from '../lib';
import * as BS from '../binary-search';
import * as State from './state';
import * as VP from './view-params';
import * as Input from './input';
import Vector from './vector';
import Sprite from './sprite';

const deckDealDuration = 1000;
let deckDealTime: number | undefined = undefined;

let currentTime: number | undefined = undefined;
let deltaTime: number;

export function render(time: number) {
    deltaTime = time - (currentTime !== undefined ? currentTime : time);
    currentTime = time;

    if (State.gameState !== undefined) {
        // clear the screen
        VP.context.clearRect(0, 0, VP.canvas.width, VP.canvas.height);

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
    VP.context.fillStyle = '#000000ff';
    VP.context.font = '0.75cm Irregularis';
    VP.context.fillText(`Game: ${gameId}`, 0, 0.75 * VP.pixelsPerCM);
    VP.context.fillText(`Your name is: ${playerName}`, 0, VP.canvas.height);
    
    VP.context.setLineDash([4, 2]);
    VP.context.strokeRect(VP.spriteHeight, VP.spriteHeight, VP.canvas.width - 2 * VP.spriteHeight, VP.canvas.height - 2 * VP.spriteHeight);
}

function renderDeck(time: number, deckCount: number) {
    VP.context.save();
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
                // card not yet dealt; keep top left
                deckSprite.position = new Vector(-VP.spriteWidth, -VP.spriteHeight);
                deckSprite.target = new Vector(-VP.spriteWidth, -VP.spriteHeight);
            } else {
                deckSprite.target = new Vector(
                    VP.canvas.width / 2 - VP.spriteWidth / 2 - (i - deckCount / 2) * VP.spriteDeckGap,
                    VP.canvas.height / 2 - VP.spriteHeight / 2
                );
            }

            deckSprite.animate(deltaTime);
        }
    } finally {
        VP.context.restore();
    }
}

function renderOtherPlayers(gameState: Lib.GameState) {
    VP.context.save();
    try {
        VP.context.translate(0, (VP.canvas.width + VP.canvas.height) / 2);
        VP.context.rotate(-Math.PI / 2);
        renderOtherPlayer(gameState, (gameState.playerIndex + 1) % 4);
    } finally {
        VP.context.restore();
    }
    
    VP.context.save();
    try {
        renderOtherPlayer(gameState, (gameState.playerIndex + 2) % 4);
    } finally {
        VP.context.restore();
    }

    VP.context.save();
    try {
        VP.context.translate(VP.canvas.width, (VP.canvas.height - VP.canvas.width) / 2);
        VP.context.rotate(Math.PI);
        renderOtherPlayer(gameState, (gameState.playerIndex + 3) % 4);
    } finally {
        VP.context.restore();
    }
}

function renderOtherPlayer(gameState: Lib.GameState, playerIndex: number) {
    const player = gameState.otherPlayers[playerIndex];
    if (player === undefined) return;

    VP.context.fillStyle = '#000000ff';
    VP.context.font = `${VP.spriteGap}px Irregularis`;
    VP.context.fillText(player.name, VP.canvas.width / 2, VP.spriteHeight + VP.spriteGap);

    const deckPosition = State.deckSprites[State.deckSprites.length - 1]?.position ??
        new Vector(VP.canvas.width / 2 - VP.spriteWidth / 2, VP.canvas.height / 2 - VP.spriteHeight / 2);
    const deckPoint = VP.context.getTransform().inverse().transformPoint({
        w: 1,
        x: deckPosition.x,
        y: deckPosition.y,
        z: 0
    });

    let i = 0;
    const faceSprites = State.faceSpritesForPlayer[playerIndex];
    if (faceSprites === undefined) throw new Error();
    for (const faceSprite of faceSprites) {
        faceSprite.target = new Vector(VP.canvas.width / 2 - VP.spriteWidth / 2 + (i++ - faceSprites.length / 2) * VP.spriteGap, VP.spriteHeight);
        faceSprite.animate(deltaTime);
    }

    i = 0;
    const backSprites = State.backSpritesForPlayer[playerIndex];
    if (backSprites === undefined) throw new Error();
    for (const backSprite of backSprites) {
        backSprite.target = new Vector(VP.canvas.width / 2 - VP.spriteWidth / 2 + (i++ - backSprites.length / 2) * VP.spriteGap, 0);
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
            if (BS.binarySearchNumber(State.selectedIndices, i++) < 0) {
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
        const y = sprites.length < gameState.playerRevealCount ? 2 * VP.spriteHeight : VP.spriteHeight;
        reservedSprite.target = new Vector(
            VP.canvas.width / 2 - VP.spriteWidth / 2 + (i - j / 2) * VP.spriteGap,
            VP.canvas.height - y - (BS.binarySearchNumber(State.selectedIndices, sprites.length) < 0 ? 0 : 2 * VP.spriteGap)
        );

        reservedSprite.animate(deltaTime);
        sprites.push(reservedSprite);
    }
}

function renderButtons() {
    VP.context.save();
    try {
        // blur image behind
        //stackBlurCanvasRGBA('canvas', x, y, canvas.width - x, canvas.height - y, 16);

        const x = VP.sortBySuitBounds[0].x - 4 * VP.pixelsPerCM;
        const y = VP.sortBySuitBounds[0].y;
        VP.context.fillStyle = '#00ffff77';
        VP.context.fillRect(x, y, VP.canvas.width - x, VP.canvas.height - y);
        
        VP.context.fillStyle = '#000000ff';
        VP.context.font = '1.5cm Irregularis';
        VP.context.fillText('SORT', x + 0.25 * VP.pixelsPerCM, y + 2.25 * VP.pixelsPerCM);

        VP.context.font = '3cm Irregularis';
        VP.context.fillText('{', x + 3 * VP.pixelsPerCM, y + 2.75 * VP.pixelsPerCM);

        VP.context.font = '1.5cm Irregularis';
        VP.context.fillText('SUIT', VP.sortBySuitBounds[0].x, VP.sortBySuitBounds[1].y);

        VP.context.font = '1.5cm Irregularis';
        VP.context.fillText('RANK', VP.sortByRankBounds[0].x, VP.sortByRankBounds[1].y);

        //context.fillStyle = '#ff000077';
        //context.fillRect(VP.sortBySuitBounds[0].x, VP.sortBySuitBounds[0].y,
            //sortBySuitBounds[1].x - sortBySuitBounds[0].x, sortBySuitBounds[1].y - sortBySuitBounds[0].y);

        //context.fillStyle = '#0000ff77';
        //context.fillRect(sortByRankBounds[0].x, sortByRankBounds[0].y,
            //sortByRankBounds[1].x - sortByRankBounds[0].x, sortByRankBounds[1].y - sortByRankBounds[0].y);
    } finally {
        VP.context.restore();
    }
}
