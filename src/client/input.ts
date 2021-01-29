import SortedSet from 'collections/sorted-set';

import * as Lib from '../lib';
import * as Client from './client';
import * as V from './vector';
import Sprite from './sprite';

interface None {
    action: 'None';
}

interface SortBySuit {
    action: 'SortBySuit';
}

interface SortByRank {
    action: 'SortByRank';
}

interface Deselect {
    action: 'Deselect';
}

interface Draw {
    action: 'Draw';
    spriteOffset: V.IVector2;
}

interface Take {
    action: 'Take';
    spriteOffset: V.IVector2;
    otherPlayerIndex: number;
    cardIndex: number;
}

interface Give {
    action: 'Give';
    otherPlayerIndex: number;
    cardIndex: number;
    spriteOffset: V.IVector2;
}

interface Return {
    action: 'Return';
    cardIndex: number;
    spriteOffset: V.IVector2;
}

interface Reorder {
    action: 'Reorder';
    cardIndex: number;
    spriteOffset: V.IVector2;
}

interface ControlShiftClick {
    action: 'ControlShiftClick';
    cardIndex: number;
    spriteOffset: V.IVector2;
    selectedSpriteOffsets: V.IVector2[];
}

interface ControlClick {
    action: 'ControlClick';
    cardIndex: number;
    spriteOffset: V.IVector2;
    selectedSpriteOffsets: V.IVector2[];
}

interface ShiftClick {
    action: 'ShiftClick';
    cardIndex: number;
    spriteOffset: V.IVector2;
    selectedSpriteOffsets: V.IVector2[];
}

interface Click {
    action: 'Click';
    cardIndex: number;
    spriteOffset: V.IVector2;
    selectedSpriteOffsets: V.IVector2[];
}

export type Action =
    None |
    SortBySuit |
    SortByRank |
    Deselect |
    Draw |
    Take |
    Give |
    Return |
    Reorder |
    ControlShiftClick |
    ControlClick |
    ShiftClick |
    Click;

export let action: Action = { action: 'None' };

// indices of cards for drag & drop
export const selectedIndices = new SortedSet<number>();

export function linkWithCards(gameState: Lib.GameState): void {
    const newSelectedIndices: number[] = [];
    let newActionCardIndex: number | undefined = undefined;

    for (let playerIndex = 0; playerIndex < 4; ++playerIndex) {
        const playerState = gameState.playerStates[playerIndex];
        if (!playerState) continue;

        let cardIndex = 0;
        for (const [card, origin] of playerState.cardsWithOrigins) {
            if (origin.origin === 'Hand' &&
                origin.playerIndex === gameState.playerIndex
            ) {
                if (selectedIndices.has(origin.cardIndex)) {
                    selectedIndices.remove(origin.cardIndex);

                    if (playerIndex === gameState.playerIndex) {
                        newSelectedIndices.push(cardIndex);
                    }
                }
                
                if ('cardIndex' in action && action.cardIndex === origin.cardIndex) {
                    if (playerIndex === gameState.playerIndex) {
                        newActionCardIndex = cardIndex;
                    } else {
                        action = { action: 'None' };
                    }
                }
            }
    
            ++cardIndex;
        }
    }

    for (const origin of gameState.deckOrigins) {
        if (origin.origin === 'Hand' &&
            origin.playerIndex === gameState.playerIndex
        ) {
            if (selectedIndices.has(origin.cardIndex)) {
                selectedIndices.remove(origin.cardIndex);
            }

            if ('cardIndex' in action && action.cardIndex === origin.cardIndex) {
                action = { action: 'None' };
            }
        }
    }

    selectedIndices.push(...newSelectedIndices);
    if ('cardIndex' in action && newActionCardIndex !== undefined) {
        action.cardIndex = newActionCardIndex;
    }
}

const goldenRatio = (1 + Math.sqrt(5)) / 2;

//const doubleClickThreshold = 500; // milliseconds

//let previousClickTime = -1;
let previousClickIndex = -1;
let mouseDownPosition = { x: 0, y: 0 };
export let mouseMovePosition = { x: 0, y: 0 };
let exceededDragThreshold = false;

let holdingControl = false;
let holdingShift = false;

window.onkeydown = (e: KeyboardEvent) => {
    if (e.key === 'Control') {
        holdingControl = true;
    } else if (e.key === 'Shift') {
        holdingShift = true;
    } else if (e.key === 'ArrowLeft') {
        Sprite.backgroundBackward();
    } else if (e.key === 'ArrowRight') {
        Sprite.backgroundForward();
    }
};

window.onkeyup = (e: KeyboardEvent) => {
    if (e.key === 'Control') {
        holdingControl = false;
    } else if (e.key === 'Shift') {
        holdingShift = false;
    }
};

Sprite.onDragStart = (position, sprite) => {
    mouseDownPosition = position
    mouseMovePosition = position;
    exceededDragThreshold = false;

    const gameState = Client.gameState;
    if (gameState === undefined) return;

    const mySprites = Sprite.faceSpritesForPlayer[gameState.playerIndex];
    if (mySprites === undefined) throw new Error();

    if (Sprite.deckSprites[Sprite.deckSprites.length - 1] === sprite) {
        action = {
            action: 'Draw',
            spriteOffset: V.sub(sprite.position, position)
        };
    } else {
        action = { action: 'Deselect' };

        for (let playerIndex = 0; playerIndex < 4; ++playerIndex) {
            const sprites = Sprite.faceSpritesForPlayer[playerIndex];
            if (!sprites) continue;

            const cardIndex = sprites.indexOf(sprite);
            if (cardIndex >= 0) {
                if (playerIndex === gameState.playerIndex) {
                    const selectedSpriteOffsets: V.IVector2[] = [];
                    selectedIndices.forEach((selectedIndex: number) => {
                        const selectedSprite = sprites[selectedIndex];
                        if (!selectedSprite) throw new Error();
                        selectedSpriteOffsets[selectedIndex] = V.sub(selectedSprite.position, position);
                    });

                    // this player's own card
                    action = {
                        action: holdingControl && holdingShift ? 'ControlShiftClick' :
                                holdingControl                 ? 'ControlClick' :
                                                  holdingShift ? 'ShiftClick' :
                                                                 'Click',
                        cardIndex,
                        spriteOffset: V.sub(sprite.position, position),
                        selectedSpriteOffsets
                    };
                } else {
                    // another player's shared card
                    const playerState = gameState.playerStates[playerIndex];
                    if (!playerState) throw new Error();

                    if (cardIndex < playerState.shareCount) {
                        action = {
                            action: 'Take',
                            spriteOffset: sprite.getOffsetInParentTransform(position),
                            otherPlayerIndex: playerIndex,
                            cardIndex
                        };
                    }
                }
            }
        }
    }
}

let promise: Promise<void> | undefined;

Sprite.onDragMove = (position, sprite) => {
    mouseMovePosition = position;
    exceededDragThreshold = exceededDragThreshold ||
        V.distance(mouseMovePosition, mouseDownPosition) > Sprite.dragThreshold;

    if (action.action === 'None') {
        // do nothing
    } else if (action.action === 'SortBySuit') {
        // TODO: check whether mouse position has left button bounds
    } else if (action.action === 'SortByRank') {
        // TODO: check whether mouse position has left button bounds
    } else if (action.action === 'Deselect') {
        // TODO: box selection?
    } else if (
        action.action === 'Take' ||
        action.action === 'Draw'
    ) {
        if (exceededDragThreshold) {
            if (promise === undefined) {
                promise = (async () => {
                    if (action.action === 'Take') {
                        await Client.takeFromOtherPlayer(
                            action.otherPlayerIndex,
                            action.cardIndex
                        );
                    } else if (action.action === 'Draw') {
                        await Client.drawFromDeck();
                    } else {
                        const _: never = action;
                    }

                    const gameState = Client.gameState;
                    if (gameState === undefined) return;
        
                    const playerState = gameState.playerStates[gameState.playerIndex];
                    if (!playerState) throw new Error();
        
                    // immediately select newly acquired card
                    console.log(`selecting ${playerState.cardsWithOrigins.length - 1}`);
                    const cardIndex = playerState.cardsWithOrigins.length - 1;
                    selectedIndices.clear();
                    selectedIndices.add(cardIndex);

                    await drag(cardIndex, action.spriteOffset);

                    promise = undefined;
                })();
            }
        }
    } else if (
        action.action === 'Give' ||
        action.action === 'Return' ||
        action.action === 'Reorder'
    ) {
        if (promise === undefined) {
            promise = (async () => {
                await drag(action.cardIndex, action.spriteOffset);

                promise = undefined;
            })();
        }
    } else if (
        action.action === 'ControlShiftClick' ||
        action.action === 'ControlClick' ||
        action.action === 'ShiftClick' ||
        action.action === 'Click'
    ) {
        if (exceededDragThreshold) {
            if (promise === undefined) {
                promise = (async () => {
                    // dragging a non-selected card selects it and only it
                    if (!selectedIndices.has(action.cardIndex)) {
                        selectedIndices.clear();
                        selectedIndices.add(action.cardIndex);
                    }
        
                    await drag(action.cardIndex, action.spriteOffset);

                    promise = undefined;
                })();
            }
        }
    } else {
        const _: never = action;
    }
}

Sprite.onDragEnd = async () => {
    try {
        if (promise !== undefined) {
            await promise;
        }

        const gameState = Client.gameState;
        if (gameState === undefined) return;

        if (action.action === 'None') {
            // do nothing
        } else if (
            action.action === 'SortByRank'
        ) {
            Client.sortByRank(gameState);
        } else if (
            action.action === 'SortBySuit'
        ) {
            Client.sortBySuit(gameState);
        } else if (
            action.action === 'Deselect'
        ) {
            selectedIndices.clear();
        } else if (
            action.action === 'Draw' ||
            action.action === 'Take' ||
            action.action === 'Reorder'
        ) {
            // taking from other players or the deck are placeholder states until mouse movement reaches threshold
            // reordering happens in onDragMove
        } else if (action.action === 'Give') {
            previousClickIndex = -1;
            await Client.giveToOtherPlayer(action.otherPlayerIndex);
        } else if (action.action === 'Return') {
            previousClickIndex = -1;
            await Client.returnToDeck();
        } else if (action.action === 'ControlShiftClick') {
            if (previousClickIndex === -1) {
                previousClickIndex = action.cardIndex;
            }

            const start = Math.min(action.cardIndex, previousClickIndex);
            const end = Math.max(action.cardIndex, previousClickIndex);
            for (let i = start; i <= end; ++i) {
                selectedIndices.add(i);
            }
        } else if (action.action === 'ControlClick') {
            previousClickIndex = action.cardIndex;

            if (selectedIndices.has(action.cardIndex)) {
                selectedIndices.remove(action.cardIndex);
            } else {
                selectedIndices.add(action.cardIndex);
            }
        } else if (action.action === 'ShiftClick') {
            if (previousClickIndex === -1) {
                previousClickIndex = action.cardIndex;
            }

            const start = Math.min(action.cardIndex, previousClickIndex);
            const end = Math.max(action.cardIndex, previousClickIndex);
            selectedIndices.clear();
            for (let i = start; i <= end; ++i) {
                selectedIndices.add(i);
            }
        } else if (action.action === 'Click') {
            previousClickIndex = action.cardIndex;

            selectedIndices.clear();
            selectedIndices.add(action.cardIndex);
        } else {
            const _: never = action;
        }
    } finally {
        action = { action: 'None' };
    }
}

async function drag(cardIndex: number, spriteOffset: V.IVector2): Promise<void> {
    const gameState = Client.gameState;
    if (gameState === undefined) throw new Error();

    const sprites = Sprite.faceSpritesForPlayer[gameState.playerIndex];
    const player = gameState.playerStates[gameState.playerIndex];
    if (!sprites || !player) throw new Error();

    const moving: [Sprite, [Lib.Card, Lib.Origin]][] = [];
    const reserved: [Sprite, [Lib.Card, Lib.Origin]][] = [];

    let newShareCount = player.shareCount;
    let newRevealCount = player.revealCount;
    let newGroupCount = player.groupCount;

    // extract moving and reserved sprites
    let i = 0;
    for (const [card, origin] of player.cardsWithOrigins) {
        const sprite = sprites[i];
        if (!card || !sprite) throw new Error();
        const origin: Lib.Origin = {
            origin: 'Hand',
            playerIndex: gameState.playerIndex,
            cardIndex: i
        };

        if (selectedIndices.has(i)) {
            moving.push([sprite, [card, origin]]);
    
            if (i < player.shareCount) {
                --newShareCount;
            }
    
            if (i < player.revealCount) {
                --newRevealCount;
            }
    
            if (i < player.groupCount) {
                --newGroupCount;
            }
        } else {
            reserved.push([sprite, [card, origin]]);
        }

        ++i;
    }

    // find the held sprites, if any, overlapped by the dragged sprites
    const leftMovingSprite = moving[0]?.[0];
    const rightMovingSprite = moving[moving.length - 1]?.[0];
    if (leftMovingSprite === undefined || rightMovingSprite === undefined) {
        throw new Error();
    }

    // construct a box with which to intersect other action boxes
    // these include the deck and each player's cards (or where they would be if they have no cards)
    const cardSize = { x: Sprite.width, y: Sprite.height };
    const drag0 = leftMovingSprite.target;
    const drag1 = V.add(rightMovingSprite.target, cardSize);

    let deck0: V.IVector2;
    let deck1: V.IVector2;
    if (Sprite.deckSprites.length > 0) {
        const top = Sprite.deckSprites[Sprite.deckSprites.length - 1];
        if (!top) throw new Error();
        deck0 = top.target;
        
        const bottom = Sprite.deckSprites[0];
        if (!bottom) throw new Error();
        deck1 = V.add(bottom.target, cardSize);
    } else {
        const center = { x: Sprite.app.view.width / 2, y: Sprite.app.view.height / 2 };
        const halfCardSize = V.scale(0.5, cardSize);
        deck0 = V.sub(center, halfCardSize);
        deck1 = V.add(center, halfCardSize);
    }

    const leftPlayerIndex = (gameState.playerIndex + 1) % 4;
    const leftPlayerState = gameState.playerStates[leftPlayerIndex];
    const left0 = leftPlayerState ? {
        x: 0,
        y: (1 - 1 / goldenRatio) * Sprite.app.view.height - getLeftExtent(leftPlayerState) * Sprite.gap - Sprite.width
    } : undefined;
    const left1 = leftPlayerState ? {
        x: 2 * (Sprite.height + Sprite.gap),
        y: (1 - 1 / goldenRatio) * Sprite.app.view.height + getRightExtent(leftPlayerState) * Sprite.gap + Sprite.width
    } : undefined;

    const topPlayerIndex = (gameState.playerIndex + 2) % 4;
    const topPlayerState = gameState.playerStates[topPlayerIndex];
    const top0 = topPlayerState ? {
        x: Sprite.app.view.width / goldenRatio - getLeftExtent(topPlayerState) * Sprite.gap - Sprite.width,
        y: 0
    } : undefined;
    const top1 = topPlayerState ? {
        x: Sprite.app.view.width / goldenRatio + getRightExtent(topPlayerState) * Sprite.gap + Sprite.width,
        y: 2 * (Sprite.height + Sprite.gap)
    } : undefined;

    const rightPlayerIndex = (gameState.playerIndex + 3) % 4;
    const rightPlayerState = gameState.playerStates[rightPlayerIndex];
    const right0 = rightPlayerState ? {
        x: Sprite.app.view.width - 2 * (Sprite.height + Sprite.gap),
        y: Sprite.app.view.height / goldenRatio - getRightExtent(rightPlayerState) * Sprite.gap - Sprite.width
    } : undefined;
    const right1 = rightPlayerState ? {
        x: Sprite.app.view.width,
        y: Sprite.app.view.height / goldenRatio + getLeftExtent(rightPlayerState) * Sprite.gap + Sprite.width
    } : undefined;

    if (intersectBox(drag0, drag1, deck0, deck1)) {
        action = {
            action: 'Return',
            cardIndex,
            spriteOffset
        };
    } else if (left0 && left1 && intersectBox(drag0, drag1, left0, left1)) {
        action = {
            action: 'Give',
            otherPlayerIndex: leftPlayerIndex,
            cardIndex,
            spriteOffset
        };
    } else if (top0 && top1 && intersectBox(drag0, drag1, top0, top1)) {
        action = {
            action: 'Give',
            otherPlayerIndex: topPlayerIndex,
            cardIndex,
            spriteOffset
        };
    } else if (right0 && right1 && intersectBox(drag0, drag1, right0, right1)) {
        action = {
            action: 'Give',
            otherPlayerIndex: rightPlayerIndex,
            cardIndex,
            spriteOffset
        };
    } else {
        action = {
            action: 'Reorder',
            cardIndex,
            spriteOffset
        };

        // determine whether the moving sprites are closer to the revealed sprites or to the hidden sprites
        const goldenX = (1 - 1 / goldenRatio) * Sprite.app.view.width;
        const revealDistance = Math.abs(leftMovingSprite.target.y - (Sprite.app.view.height - 2 * Sprite.height));
        const hideDistance = Math.abs(leftMovingSprite.target.y - (Sprite.app.view.height - Sprite.height));
        
        const splitTop = revealDistance < hideDistance;
        const splitLeft = (leftMovingSprite.target.x + rightMovingSprite.target.x + Sprite.width) / 2 < goldenX;
        let splitIndex: number | undefined = undefined;
        let start: number;
        let end: number;
        if (splitTop) {
            if (leftMovingSprite.target.x < goldenX && goldenX < rightMovingSprite.target.x + Sprite.width) {
                splitIndex = newShareCount;
            }
            
            if (splitLeft) {
                start = 0;
                end = newShareCount;
            } else {
                start = newShareCount;
                end = newRevealCount;
            }
        } else {
            if (leftMovingSprite.target.x < goldenX && goldenX < rightMovingSprite.target.x + Sprite.width) {
                splitIndex = newGroupCount;
            }

            if (splitLeft) {
                start = newRevealCount;
                end = newGroupCount;
            } else {
                start = newGroupCount;
                end = reserved.length;
            }
        }

        if (splitIndex === undefined) {
            let leftIndex: number | undefined = undefined;
            let rightIndex: number | undefined = undefined;
            for (let i = start; i < end; ++i) {
                const reservedSprite = reserved[i]?.[0];
                if (reservedSprite === undefined) throw new Error();
                if (leftMovingSprite.target.x < reservedSprite.target.x &&
                    reservedSprite.target.x < rightMovingSprite.target.x
                ) {
                    if (leftIndex === undefined) {
                        leftIndex = i;
                    }
        
                    rightIndex = i;
                }
            }
        
            if (leftIndex !== undefined && rightIndex !== undefined) {
                const leftReservedSprite = reserved[leftIndex]?.[0];
                const rightReservedSprite = reserved[rightIndex]?.[0];
                if (leftReservedSprite === undefined || rightReservedSprite === undefined) throw new Error();
                const leftGap = leftReservedSprite.target.x - leftMovingSprite.target.x;
                const rightGap = rightMovingSprite.target.x - rightReservedSprite.target.x;
                if (leftGap < rightGap) {
                    splitIndex = leftIndex;
                } else {
                    splitIndex = rightIndex + 1;
                }
            }
        }
        
        if (splitIndex === undefined) {
            // no overlapped sprites, so the index is the first reserved sprite to the right of the moving sprites
            for (splitIndex = start; splitIndex < end; ++splitIndex) {
                const reservedSprite = reserved[splitIndex]?.[0];
                if (reservedSprite === undefined) throw new Error();
                if (rightMovingSprite.target.x < reservedSprite.target.x) {
                    break;
                }
            }
        }

        //console.log(`BEFORE: splitIndex: ${splitIndex}, shareCount: ${shareCount}, revealCount: ${revealCount}, groupCount: ${groupCount}, splitLeft: ${splitLeft}`);

        if (splitIndex < newShareCount || splitIndex === newShareCount && splitTop && splitLeft) {
            newShareCount += moving.length;
        }

        if (splitIndex < newRevealCount || splitIndex === newRevealCount && splitTop) {
            newRevealCount += moving.length;
        }

        if (splitIndex < newGroupCount || splitIndex === newGroupCount && (splitTop || splitLeft)) {
            newGroupCount += moving.length;
        }
        
        //console.log(`AFTER: splitIndex: ${splitIndex}, shareCount: ${shareCount}, revealCount: ${revealCount}, groupCount: ${groupCount}, splitLeft: ${splitLeft}`);

        let reorder = false;
        const newCardsWithOrigins: [Lib.Card, Lib.Origin][] = [];
        const compareAndPushCard = ([sprite, [card, origin]]: [Sprite, [Lib.Card, Lib.Origin]]) => {
            if (JSON.stringify(card) !== JSON.stringify(player.cardsWithOrigins[newCardsWithOrigins.length]?.[0])) {
                reorder = true;
            }

            newCardsWithOrigins.push([card, origin]);
        };

        reserved.slice(0, splitIndex).map(compareAndPushCard);
        moving.map(compareAndPushCard);
        reserved.splice(splitIndex).map(compareAndPushCard);

        if (newShareCount !== player.shareCount ||
            newRevealCount !== player.revealCount ||
            newGroupCount !== player.groupCount ||
            reorder
        ) {
            await Client.reorderCards(newShareCount, newRevealCount, newGroupCount, newCardsWithOrigins);
        }
    }
}

function getLeftExtent(playerState: Lib.PlayerState) {
    return Math.max(
        playerState.shareCount,
        playerState.groupCount - playerState.revealCount
    );
}

function getRightExtent(playerState: Lib.PlayerState) {
    return Math.max(
        playerState.revealCount - playerState.shareCount,
        playerState.cardsWithOrigins.length - playerState.groupCount
    );
}

function intersectBox(u0: V.IVector2, u1: V.IVector2, v0: V.IVector2, v1: V.IVector2) {
    const xs: [string, number][] = [['u', u0.x], ['u', u1.x], ['v', v0.x], ['v', v1.x]];
    const ys: [string, number][] = [['u', u0.y], ['u', u1.y], ['v', v0.y], ['v', v1.y]];
    xs.sort(([s, a], [t, b]) => a - b);
    ys.sort(([s, a], [t, b]) => a - b);

    let s = undefined;
    let xSwitches = 0;
    for (const [t, _] of xs) {
        if (s !== t) {
            s = t;
            ++xSwitches;
        }
    }

    s = undefined;
    let ySwitches = 0;
    for (const [t, _] of ys) {
        if (s !== t) {
            s = t;
            ++ySwitches;
        }
    }

    return xSwitches > 2 && ySwitches > 2;
}