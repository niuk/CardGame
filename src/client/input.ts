import SortedSet from 'collections/sorted-set';
import * as PIXI from 'pixi.js-legacy';

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
}

interface Take {
    action: 'Take';
    playerIndex: number;
    cardIndex: number;
}

interface Give {
    action: 'Give';
    playerIndex: number;
    cardIndex: number;
}

interface Return {
    action: 'Return';
    cardIndex: number;
}

interface Reorder {
    action: 'Reorder';
    cardIndex: number;
}

interface ControlShiftClick {
    action: 'ControlShiftClick';
    cardIndex: number;
}

interface ControlClick {
    action: 'ControlClick';
    cardIndex: number;
}

interface ShiftClick {
    action: 'ShiftClick';
    cardIndex: number;
}

interface Click {
    action: 'Click';
    cardIndex: number;
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
let drewFromDeck = false;

// indices of cards for drag & drop
export const selectedIndices = new SortedSet<number>();

export function linkWithCards(gameState: Lib.GameState): void {
    const newSelectedIndices: number[] = [];
    let newActionCardIndex: number | undefined = undefined;

    for (let playerIndex = 0; playerIndex < gameState.playerStates.length; ++playerIndex) {
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
                        console.log(`selected index: ${origin.cardIndex} to ${cardIndex}`);
                        newSelectedIndices.push(cardIndex);
                    }
                }
                
                if ('cardIndex' in action && action.cardIndex === origin.cardIndex) {
                    if (playerIndex === gameState.playerIndex) {
                        console.log(`action index: ${origin.cardIndex} to ${cardIndex}`);
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
    console.log(Sprite.deckSprites.indexOf(sprite));
    mouseDownPosition = position
    mouseMovePosition = position;
    exceededDragThreshold = false;

    const gameState = Client.gameState;
    if (!gameState) return;

    if (sprite === Sprite.deckSprites[Sprite.deckSprites.length - 1]) {
        sprite.setAnchorAt(position);
        action = { action: 'Draw' };
        drewFromDeck = true;
    } else {
        action = { action: 'Deselect' };

        for (let playerIndex = 0; playerIndex < gameState.playerStates.length; ++playerIndex) {
            const sprites = Sprite.playerFaceSprites[playerIndex];
            if (!sprites) continue;

            const cardIndex = sprites.indexOf(sprite);
            if (cardIndex >= 0) {
                if (playerIndex === gameState.playerIndex) {
                    // this player's own card
                    if (selectedIndices.has(cardIndex)) {
                        selectedIndices.forEach((selectedIndex: number) => {
                            const selectedSprite = sprites[selectedIndex];
                            if (!selectedSprite) throw new Error();
                            selectedSprite.setAnchorAt(position);
                        });
                    } else {
                        sprite.setAnchorAt(position);
                    }

                    action = {
                        action: holdingControl && holdingShift ? 'ControlShiftClick' :
                                holdingControl                 ? 'ControlClick' :
                                                  holdingShift ? 'ShiftClick' :
                                                                 'Click',
                        cardIndex
                    };
                } else {
                    // another player's shared card
                    const playerState = gameState.playerStates[playerIndex];
                    if (!playerState) throw new Error();

                    if (cardIndex < playerState.shareCount) {
                        sprite.setAnchorAt(position);
                        action = {
                            action: 'Take',
                            playerIndex,
                            cardIndex
                        };
                    }
                }
            }
        }
    }
}

let promise = new Promise<void>(resolve => resolve());

Sprite.onDragMove = async (position, sprite) => {
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
            // cache because the action might have changed after await
            if (await Lib.isDone(promise)) {
                promise = (async () => {
                    if (action.action === 'Take') {
                        await Client.takeFromOtherPlayer(
                            action.playerIndex,
                            action.cardIndex
                        );
                    } else if (action.action === 'Draw') {
                        await Client.drawFromDeck();
                    } else {
                        const _: never = action;
                    }

                    const gameState = Client.gameState;
                    if (!gameState) return;

                    const playerState = gameState.playerStates[gameState.playerIndex];
                    if (!playerState) throw new Error();

                    // immediately select newly acquired card
                    const cardIndex = playerState.cardsWithOrigins.length - 1;
                    selectedIndices.clear();
                    selectedIndices.add(cardIndex);
                    action = { action: 'Reorder', cardIndex };
                    await drag();
                })();
            }
        }
    } else if (
        action.action === 'Give' ||
        action.action === 'Return' ||
        action.action === 'Reorder'
    ) {
        if (await Lib.isDone(promise)) {
            promise = drag();
        }
    } else if (
        action.action === 'ControlShiftClick' ||
        action.action === 'ControlClick' ||
        action.action === 'ShiftClick' ||
        action.action === 'Click'
    ) {
        if (exceededDragThreshold) {
            if (await Lib.isDone(promise)) {
                promise = (async () => {
                    const gameState = Client.gameState;
                    if (!gameState) return;

                    if (selectedIndices.has(action.cardIndex)) {
                        const container = Sprite.containers[gameState.playerIndex];
                        const faceSprites = Sprite.playerFaceSprites[gameState.playerIndex];
                        if (!container || !faceSprites) throw new Error();

                        // dragging a selected card causes other selected cards to "gather" around it
                        const i = selectedIndices.indexOf(action.cardIndex);
                        let j = 0;
                        selectedIndices.forEach((selectedIndex: number) => {
                            const selectedSprite = faceSprites[selectedIndex];
                            if (!selectedSprite) throw new Error();
                            selectedSprite.setAnchorAt(V.add(V.add(
                                selectedSprite.getTopLeftInWorld(),
                                V.sub(
                                    container.transform.worldTransform.apply(sprite.position),
                                    sprite.getTopLeftInWorld()
                                )), {
                                    x: (j - i) * Sprite.gap,
                                    y: 0
                                })
                            );

                            ++j;
                        });
                    } else {
                        // dragging a non-selected card selects it and only it
                        selectedIndices.clear();
                        selectedIndices.add(action.cardIndex);
                    }

                    await drag();
                })();
            }
        }
    } else {
        const _: never = action;
    }
}

Sprite.onDragEnd = async (position, sprite) => {
    const gameState = Client.gameState;
    if (!gameState) return;

    try {
        let endedOnBackground = true;
        for (const deckSprite of Sprite.deckSprites) {
            if (deckSprite === sprite) {
                endedOnBackground = false;
                break;
            }
        }

        if (endedOnBackground) {
            for (const backSprites of Sprite.playerBackSprites) {
                for (const backSprite of backSprites) {
                    if (backSprite === sprite) {
                        endedOnBackground = false;
                        break;
                    }
                }
            }
        }

        if (endedOnBackground) {
            for (const faceSprites of Sprite.playerFaceSprites) {
                for (const faceSprite of faceSprites) {
                    if (faceSprite === sprite) {
                        endedOnBackground = false;
                        break;
                    }
                }
            }
        }

        if (action.action === 'None') {
            // do nothing
        } else if (action.action === 'SortByRank') {
            Client.sortByRank(gameState);
        } else if (action.action === 'SortBySuit') {
            Client.sortBySuit(gameState);
        } else if (action.action === 'Deselect') {
            selectedIndices.clear();
        } else if (action.action === 'Draw' || action.action === 'Take') {
            // taking from other players or the deck are placeholder states until mouse movement reaches threshold
        } else if (action.action === 'Reorder') {
            // reordering happens in onDragMove
            previousClickIndex = action.cardIndex;
        } else if (action.action === 'Give') {
            previousClickIndex = -1;
            if (!endedOnBackground) {
                const playerIndex = action.playerIndex;
                await promise;
                promise = Client.giveToOtherPlayer(playerIndex);
            }
        } else if (action.action === 'Return') {
            if (drewFromDeck) {
                previousClickIndex = action.cardIndex;
            } else {
                previousClickIndex = -1;
                if (!endedOnBackground) {
                    await promise;
                    promise = Client.returnToDeck();
                }
            }
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
        drewFromDeck = false;
    }
}

async function drag(): Promise<void> {
    const gameState = Client.gameState;
    if (!gameState) throw new Error();

    const player = gameState.playerStates[gameState.playerIndex];
    const container = Sprite.containers[gameState.playerIndex];
    const sprites = Sprite.playerFaceSprites[gameState.playerIndex];
    const width = Sprite.widths[gameState.playerIndex];
    if (!player || !container || !sprites || width === undefined) throw new Error();

    const moving: [Sprite, [Lib.Card, Lib.Origin]][] = [];
    const reserved: [Sprite, [Lib.Card, Lib.Origin]][] = [];

    let newShareCount = player.shareCount;
    let newRevealCount = player.revealCount;
    let newGroupCount = player.groupCount;

    // extract moving and reserved sprites
    for (let i = 0; i < player.cardsWithOrigins.length; ++i) {
        const card = player.cardsWithOrigins[i]?.[0];
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
    }

    // find the held sprites, if any, overlapped by the dragged sprites
    const leftMovingSprite = moving[0]?.[0];
    const rightMovingSprite = moving[moving.length - 1]?.[0];
    if (!leftMovingSprite || !rightMovingSprite) {
        throw new Error();
    }

    // construct a box with which to intersect other action boxes
    // these include the deck and each player's cards (or where they would be if they have no cards)
    const cardSize = { x: Sprite.width, y: Sprite.height };
    const dragMin = V.add(
        container.transform.worldTransform.apply(leftMovingSprite.target),
        V.sub(leftMovingSprite.getTopLeftInWorld(), container.transform.worldTransform.apply(leftMovingSprite.position))
    );
    const dragMax = V.add(
        V.add(container.transform.worldTransform.apply(rightMovingSprite.target), cardSize),
        V.sub(rightMovingSprite.getTopLeftInWorld(), container.transform.worldTransform.apply(rightMovingSprite.position))
    );

    let deckMin: V.IVector2;
    let deckMax: V.IVector2;
    if (Sprite.deckSprites.length > 0) {
        const top = Sprite.deckSprites[Sprite.deckSprites.length - 1];
        if (!top) throw new Error();
        deckMin = top.getTopLeftInWorld();
        
        const bottom = Sprite.deckSprites[0];
        if (!bottom) throw new Error();
        deckMax = V.add(bottom.getTopLeftInWorld(), cardSize);
    } else {
        const center = { x: Sprite.app.view.width / 2, y: Sprite.app.view.height / 2 };
        const halfCardSize = V.scale(0.5, cardSize);
        deckMin = V.sub(center, halfCardSize);
        deckMax = V.add(center, halfCardSize);
    }

    if (intersectBox(dragMin, dragMax, deckMin, deckMax)) {
        if ('cardIndex' in action) {
            action = {
                action: 'Return',
                cardIndex: action.cardIndex
            };
        }

        return;
    }

    for (let i = 1; i < gameState.playerStates.length; ++i) {
        const playerIndex = (gameState.playerIndex + i) % gameState.playerStates.length;

        const playerState = gameState.playerStates[playerIndex];
        if (!playerState) continue;

        const playerContainer = Sprite.containers[playerIndex];
        const playerWidth = Sprite.widths[playerIndex];
        if (!playerContainer || playerWidth === undefined) throw new Error();

        const above = playerContainer.y < Sprite.app.view.height / 2;

        const cardsMin = {
            x: above ? playerWidth / goldenRatio : 0,
            y: above ? Sprite.height : 0
        };
        const cardsMax = {
            x: above ? playerWidth : playerWidth * (1 - 1 / goldenRatio),
            y: above ? 2 * Sprite.height : Sprite.height
        };

        const dragMinInContainer = playerContainer.transform.worldTransform.applyInverse(dragMin);
        const dragMaxInContainer = playerContainer.transform.worldTransform.applyInverse(dragMax);
        if (intersectBox(dragMinInContainer, dragMaxInContainer, cardsMin, cardsMax)) {
            if ('cardIndex' in action) {
                action = {
                    action: 'Give',
                    playerIndex: playerIndex,
                    cardIndex: action.cardIndex
                };
            }

            return;
        }
    }

    if ('cardIndex' in action) {
        action = {
            action: 'Reorder',
            cardIndex: action.cardIndex
        };
    } else {
        return;
    }

    const dragMinInContainer = container.transform.worldTransform.applyInverse(dragMin);
    const dragMaxInContainer = container.transform.worldTransform.applyInverse(dragMax);
    const rightMovingCardTarget =  container.transform.worldTransform.applyInverse(V.add(
        container.transform.worldTransform.apply(rightMovingSprite.target),
        V.sub(rightMovingSprite.getTopLeftInWorld(), container.transform.worldTransform.apply(rightMovingSprite.position))
    ));

    // determine whether the moving sprites are closer to the revealed sprites or to the hidden sprites
    const goldenX = (1 - 1 / goldenRatio) * width;
    const midY = (dragMinInContainer.y + dragMaxInContainer.y) / 2;

    const splitTop = !drewFromDeck && midY < Sprite.height;
    const splitLeft = (dragMinInContainer.x + dragMaxInContainer.x) / 2 < goldenX;
    let splitIndex: number | undefined = undefined;
    let start: number;
    let end: number;
    if (splitTop) {
        if (dragMinInContainer.x < goldenX && goldenX < dragMaxInContainer.x) {
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
        if (dragMinInContainer.x < goldenX && goldenX < dragMaxInContainer.x) {
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
            if (!reservedSprite) throw new Error();

            if (dragMinInContainer.x < reservedSprite.target.x &&
                reservedSprite.target.x < rightMovingCardTarget.x
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
            if (!leftReservedSprite || !rightReservedSprite) throw new Error();

            const leftGap = leftReservedSprite.target.x - dragMinInContainer.x;
            const rightGap = rightMovingCardTarget.x - rightReservedSprite.target.x;
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
            if (!reservedSprite) throw new Error();

            if (rightMovingCardTarget.x < reservedSprite.target.x) {
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
    const newOriginIndices: number[] = [];
    const compareAndPushCardWithIndex = ([sprite, [card, origin]]: [Sprite, [Lib.Card, Lib.Origin]]) => {
        if (origin.origin === 'Deck' || origin.playerIndex !== gameState.playerIndex) throw new Error();

        if (JSON.stringify(card) !== JSON.stringify(player.cardsWithOrigins[newOriginIndices.length]?.[0])) {
            reorder = true;
        }

        newOriginIndices.push(origin.cardIndex);
    };

    reserved.slice(0, splitIndex).map(compareAndPushCardWithIndex);
    moving.map(compareAndPushCardWithIndex);
    reserved.splice(splitIndex).map(compareAndPushCardWithIndex);

    if (newShareCount !== player.shareCount ||
        newRevealCount !== player.revealCount ||
        newGroupCount !== player.groupCount ||
        reorder
    ) {
        await Client.reorderCards(newShareCount, newRevealCount, newGroupCount, newOriginIndices);
    }
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