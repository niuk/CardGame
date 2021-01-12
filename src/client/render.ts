import * as Lib from '../lib';
import * as State from './state';
import * as Input from './input';
import * as VP from './view-params';
import Vector from './vector';
import Sprite from './sprite';
import { random } from 'nanoid';

const deckDealDuration = 1000;
let deckDealTime: number | undefined = undefined;
let currentTime: number | undefined = undefined;

export async function render(time: number) {
    while (State.gameState === undefined) {
        await Lib.delay(100);
    }

    const deltaTime = time - (currentTime !== undefined ? currentTime : time);
    currentTime = time;

    const unlock = await State.lock();
    try {
        // clear the screen
        VP.context.clearRect(0, 0, VP.canvas.width, VP.canvas.height);

        renderBasics(State.gameId, State.playerName);
        renderDeck(time, deltaTime, State.gameState.deckCount);
        renderOtherPlayers(deltaTime, State.gameState);
        renderPlayer(deltaTime, State.gameState);
        renderButtons(time, State.gameState);
    } finally {
        unlock();
    }

    window.requestAnimationFrame(render);
}

function renderBasics(gameId: string, playerName: string) {
    VP.context.fillStyle = '#000000ff';
    VP.context.textAlign = 'left';
    VP.context.font = `${VP.spriteHeight / 4}px Oliver`;
    VP.context.fillStyle = 'font-variant-east-asian: full-width';

    VP.context.textBaseline = 'top';
    VP.context.fillText(`Game: ${gameId}`, 0, 1 * VP.pixelsPerPercent);

    VP.context.textBaseline = 'bottom';
    VP.context.fillText(`Your name is: ${playerName}`, 0, VP.canvas.height);

    VP.context.setLineDash([4, 1]);
    VP.context.strokeRect(VP.spriteHeight, VP.spriteHeight, VP.canvas.width - 2 * VP.spriteHeight, VP.canvas.height - 2 * VP.spriteHeight);
}

function renderDeck(time: number, deltaTime: number, deckCount: number) {
    VP.context.save();
    try {
        if (deckDealTime === undefined) {
            deckDealTime = time;
        }

        for (let i = 0; i < State.deckSprites.length; ++i) {
            const deckSprite = State.deckSprites[i];
            if (deckSprite === undefined) throw new Error();

            if (i === deckCount - 1 &&
                Input.action !== "None" &&
                Input.action !== "SortBySuit" &&
                Input.action !== "SortByRank" &&
                Input.action !== "Wait" &&
                Input.action !== "Proceed" &&
                Input.action !== "Deselect" && (
                Input.action.type === "DrawFromDeck" ||
                Input.action.type === "WaitingForNewCard"
            )) {
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

function renderOtherPlayers(deltaTime: number, gameState: Lib.GameState) {
    VP.context.save();
    try {
        VP.context.setTransform(VP.getTransformForPlayer(1));
        //VP.context.translate(0, (VP.canvas.width + VP.canvas.height) / 2);
        //VP.context.rotate(-Math.PI / 2);
        renderOtherPlayer(deltaTime, gameState, (gameState.playerIndex + 1) % 4);
    } finally {
        VP.context.restore();
    }
    
    VP.context.save();
    try {
        VP.context.setTransform(VP.getTransformForPlayer(2));
        renderOtherPlayer(deltaTime, gameState, (gameState.playerIndex + 2) % 4);
    } finally {
        VP.context.restore();
    }

    VP.context.save();
    try {
        VP.context.setTransform(VP.getTransformForPlayer(3));
        //VP.context.translate(VP.canvas.width, (VP.canvas.height - VP.canvas.width) / 2);
        //VP.context.rotate(Math.PI / 2);
        renderOtherPlayer(deltaTime, gameState, (gameState.playerIndex + 3) % 4);
    } finally {
        VP.context.restore();
    }
}

function renderOtherPlayer(deltaTime: number, gameState: Lib.GameState, playerIndex: number) {
    const player = gameState.otherPlayers[playerIndex];
    if (player === undefined) return;

    const deckPosition = State.deckSprites[State.deckSprites.length - 1]?.position ??
        new Vector(VP.canvas.width / 2 - VP.spriteWidth / 2, VP.canvas.height / 2 - VP.spriteHeight / 2);
    const deckPoint = VP.context.getTransform().inverse().transformPoint({
        w: 1,
        x: deckPosition.x,
        y: deckPosition.y,
        z: 0
    });

    const faceSprites = State.faceSpritesForPlayer[playerIndex] ?? [];
    let i = 0;
    for (const faceSprite of faceSprites) {
        if (i < player.shareCount) {
            faceSprite.target = new Vector(
                VP.canvas.width / 2 + (player.shareCount - i) * VP.spriteGap,
                VP.spriteHeight + VP.spriteGap
            );
        } else {
            faceSprite.target = new Vector(
                VP.canvas.width / 2 - VP.spriteWidth - (i - player.shareCount) * VP.spriteGap,
                VP.spriteHeight
            );
        }

        faceSprite.animate(deltaTime);

        ++i;
    }

    const backSprites = State.backSpritesForPlayer[playerIndex] ?? [];
    i = 0;
    for (const backSprite of backSprites) {
        backSprite.target = new Vector(VP.canvas.width / 2 - VP.spriteWidth / 2 + (i - backSprites.length / 2) * VP.spriteGap, 0);
        backSprite.animate(deltaTime);

        ++i;
    }
    
    VP.context.fillStyle = '#000000ff';
    VP.context.font = `${VP.spriteHeight / 2}px Oliver`;
    VP.context.textBaseline = "middle";
    VP.context.textAlign = "center";
    VP.context.fillText(player.name, VP.canvas.width / 2, VP.spriteHeight / 2);
}

// returns the adjusted reveal index
function renderPlayer(deltaTime: number, gameState: Lib.GameState) {
    const sprites = State.faceSpritesForPlayer[gameState.playerIndex];
    if (sprites === undefined) return;

    let i = 0;
    for (const sprite of sprites) {
        sprite.animate(deltaTime);

        if (Lib.binarySearchNumber(State.selectedIndices, i++) >= 0) {
            VP.context.fillStyle = '#00808040';
            VP.context.fillRect(sprite.position.x, sprite.position.y, VP.spriteWidth, VP.spriteHeight);
        }
    }
}

function renderButtons(time: number, gameState: Lib.GameState) {
    VP.context.save();
    try {
        // blur image behind
        //stackBlurCanvasRGBA('canvas', x, y, canvas.width - x, canvas.height - y, 16);
        /*
        const x = VP.sortBySuitBounds[0].x - 4 * VP.pixelsPerCM;
        const y = VP.sortBySuitBounds[0].y;
        VP.context.fillStyle = '#00ffff77';
        VP.context.fillRect(x, y, VP.canvas.width - x, VP.canvas.height - y);
        
        VP.context.fillStyle = '#000000ff';
        VP.context.font = '1.5cm Oliver';
        VP.context.fillText('SORT', x + 0.25 * VP.pixelsPerCM, y + 2.25 * VP.pixelsPerCM);

        VP.context.font = '3cm Oliver';
        VP.context.fillText('{', x + 3 * VP.pixelsPerCM, y + 2.75 * VP.pixelsPerCM);

        VP.context.font = '1.5cm Oliver';
        VP.context.fillText('SUIT', VP.sortBySuitBounds[0].x, VP.sortBySuitBounds[1].y);

        VP.context.font = '1.5cm Oliver';
        VP.context.fillText('RANK', VP.sortByRankBounds[0].x, VP.sortByRankBounds[1].y);
        */
        //context.fillStyle = '#ff000077';
        //context.fillRect(VP.sortBySuitBounds[0].x, VP.sortBySuitBounds[0].y,
            //sortBySuitBounds[1].x - sortBySuitBounds[0].x, sortBySuitBounds[1].y - sortBySuitBounds[0].y);

        //context.fillStyle = '#0000ff77';
        //context.fillRect(sortByRankBounds[0].x, sortByRankBounds[0].y,
            //sortByRankBounds[1].x - sortByRankBounds[0].x, sortByRankBounds[1].y - sortByRankBounds[0].y);

        /*if (gameState.playerState === "Proceed" || gameState.playerState === "Wait") {
            VP.context.textBaseline = 'top';

            if (gameState.playerState === "Wait") {
                VP.context.fillStyle = '#00ffff60';
                VP.context.fillRect(
                    VP.waitBounds[0].x, VP.waitBounds[0].y,
                    VP.waitBounds[1].x - VP.waitBounds[0].x, VP.waitBounds[1].y - VP.waitBounds[0].y
                );
            }
            
            VP.context.fillStyle = '#000000ff';
            VP.context.font = VP.waitFont;
            VP.context.fillText('Wait!', VP.waitBounds[0].x, VP.waitBounds[0].y);
            boundsRect(VP.waitBounds);

            if (gameState.playerState === "Proceed") {
                VP.context.fillStyle = '#00ffff60';
                VP.context.fillRect(
                    VP.proceedBounds[0].x, VP.proceedBounds[0].y,
                    VP.proceedBounds[1].x - VP.proceedBounds[0].x, VP.proceedBounds[1].y - VP.proceedBounds[0].y
                );
            }

            VP.context.fillStyle = '#000000ff';
            VP.context.font = VP.proceedFont;
            VP.context.fillText('Proceed.', VP.proceedBounds[0].x, VP.proceedBounds[0].y);
            boundsRect(VP.proceedBounds);
        } else {
            if (gameState.playerState === 'Ready') {
                VP.context.fillStyle = '#000000ff';
                VP.context.font = VP.readyFont;
                VP.context.fillText('Ready!', VP.readyBounds[0].x, VP.readyBounds[0].y);
            } else {
                VP.context.fillStyle = '#000000ff';
                VP.context.font = VP.countdownFont;
                VP.context.fillText(`Waiting ${
                    Math.floor(1 + (gameState.playerState.activeTime + Lib.activeCooldown - Date.now()) / 1000)
                } seconds...`, VP.countdownBounds[0].x, VP.countdownBounds[0].y);
            }
        }*/
    } finally {
        VP.context.restore();
    }
}

function boundsRect([topLeft, bottomRight]: [Vector, Vector]) {
    VP.context.strokeRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
}
