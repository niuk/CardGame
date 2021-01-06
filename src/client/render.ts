import * as Lib from '../lib';
import * as State from './state';
import * as Input from './input';
import * as VP from './view-params';
import Vector from './vector';
import Sprite from './sprite';

const deckDealDuration = 1000;
let deckDealTime: number | undefined = undefined;

let currentTime: number | undefined = undefined;
let deltaTime: number;

export async function render(time: number) {
    deltaTime = time - (currentTime !== undefined ? currentTime : time);
    currentTime = time;

    if (State.gameState !== undefined) {
        const unlock = await State.lock();
        try {
            // clear the screen
            VP.context.clearRect(0, 0, VP.canvas.width, VP.canvas.height);

            renderBasics(State.gameId, State.playerName);
            renderDeck(time, State.gameState.deckCount);
            renderOtherPlayers(State.gameState);
            renderPlayer(State.gameState);
            renderButtons();
        } finally {
            unlock();
        }

        window.requestAnimationFrame(render);
    } else {
        // wait until we have a game state
        await Lib.delay(100);
        window.requestAnimationFrame(render);
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

            if (i === deckCount - 1 && (
                Input.action === "drawFromDeck" ||
                Input.action === "waitingForNewCard"
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
    const cards = gameState.playerCards;
    const sprites = State.faceSpritesForPlayer[gameState.playerIndex];
    if (sprites === undefined) return;

    const oldCards = JSON.stringify(cards);
    const oldCardsLength = cards.length;
    const oldSprites = JSON.stringify(sprites);
    const oldSpritesLength = sprites.length;

    const movingSpritesAndCards: [Sprite, Lib.Card][] = [];
    const reservedSpritesAndCards: [Sprite, Lib.Card][] = [];

    let splitIndex: number;
    if (Input.action !== "none" &&
        Input.action !== "drawFromDeck" &&
        Input.action !== "waitingForNewCard" &&
        Input.action !== "sortBySuit" &&
        Input.action !== "sortByRank" && (
            Input.action.type === "returnToDeck" ||
            Input.action.type === "hide" ||
            Input.action.type === "reveal"
        )
    ) {
        let revealCountAdjustment = 0;

        // extract moving sprites
        for (const i of State.selectedIndices) {
            const sprite = sprites[i];
            const card = cards[i];
            if (sprite === undefined || card === undefined) throw new Error();
            movingSpritesAndCards.push([sprite, card]);

            if (i < gameState.playerRevealCount) {
                ++revealCountAdjustment;
            }
        }

        gameState.playerRevealCount -= revealCountAdjustment;

        // extract reserved sprites
        for (let i = 0; i < sprites.length; ++i) {
            if (Lib.binarySearchNumber(State.selectedIndices, i) < 0) {
                const sprite = sprites[i];
                const card = cards[i];
                if (sprite === undefined || card === undefined) throw new Error();
                reservedSpritesAndCards.push([sprite, card]);
            }
        }

        // determine whether the moving sprites are closer to the revealed sprites or to the hidden sprites
        const splitRevealed = Input.action.type === "reveal";
        const start = splitRevealed ? 0 : gameState.playerRevealCount;
        const end = splitRevealed ? gameState.playerRevealCount : reservedSpritesAndCards.length;

        // find the held sprites, if any, overlapped by the dragged sprites
        const leftMovingSprite = movingSpritesAndCards[0]?.[0];
        const rightMovingSprite = movingSpritesAndCards[movingSpritesAndCards.length - 1]?.[0];
        if (leftMovingSprite === undefined || rightMovingSprite === undefined) {
            throw new Error();
        }

        let leftIndex: number | undefined = undefined;
        let rightIndex: number | undefined = undefined;
        for (let i = start; i < end; ++i) {
            const reservedSprite = reservedSpritesAndCards[i]?.[0];
            if (reservedSprite === undefined) throw new Error();
            // use targets instead of positions or else the sprites will "wobble"
            if (leftMovingSprite.position.x < reservedSprite.target.x &&
                reservedSprite.target.x < rightMovingSprite.position.x
            ) {
                if (leftIndex === undefined) {
                    leftIndex = i;
                }

                rightIndex = i;
            }
        }

        if (leftIndex !== undefined && rightIndex !== undefined) {
            const leftReservedSprite = reservedSpritesAndCards[leftIndex]?.[0];
            const rightReservedSprite = reservedSpritesAndCards[rightIndex]?.[0];
            if (leftReservedSprite === undefined || rightReservedSprite === undefined) throw new Error();
            // again, use targets instead of positions to avoid "wobbling"
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
                const reservedSprite = reservedSpritesAndCards[splitIndex]?.[0];
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
            gameState.playerRevealCount += movingSpritesAndCards.length;
        }
    } else {
        // every sprite is reserved
        splitIndex = sprites.length;
        reservedSpritesAndCards.push(...sprites.map((sprite, index) => <[Sprite, Lib.Card]>[sprite, cards[index]]));
    }

    // clear for reinsertion
    sprites.splice(0, sprites.length);
    cards.splice(0, cards.length);

    for (const [reservedSprite, reservedCard] of reservedSpritesAndCards) {
        if (sprites.length === splitIndex) {
            for (const [movingSprite, movingCard] of movingSpritesAndCards) {
                movingSprite.animate(deltaTime);
                sprites.push(movingSprite);
                cards.push(movingCard);
            }
        }

        const i = sprites.length < gameState.playerRevealCount ? sprites.length : sprites.length - gameState.playerRevealCount;
        const j = sprites.length < gameState.playerRevealCount ? gameState.playerRevealCount : reservedSpritesAndCards.length - gameState.playerRevealCount;
        const y = sprites.length < gameState.playerRevealCount ? 2 * VP.spriteHeight : VP.spriteHeight;
        reservedSprite.target = new Vector(
            VP.canvas.width / 2 - VP.spriteWidth / 2 + (i - j / 2) * VP.spriteGap,
            VP.canvas.height - y - (Lib.binarySearchNumber(State.selectedIndices, sprites.length) < 0 ? 0 : 2 * VP.spriteGap)
        );

        reservedSprite.animate(deltaTime);
        sprites.push(reservedSprite);
        cards.push(reservedCard);
    }

    if (sprites.length === splitIndex) {
        for (const [movingSprite, movingCard] of movingSpritesAndCards) {
            movingSprite.animate(deltaTime);
            sprites.push(movingSprite);
            cards.push(movingCard);
        }
    }

    if (cards.length !== oldCardsLength || sprites.length !== oldSpritesLength) {
        throw new Error(`oldCards: ${oldCards}${oldSprites}\nnewCards: ${JSON.stringify(cards)}\noldSprites: ${oldSprites}\nnewSprites: ${JSON.stringify(sprites)}`);
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
