import * as Lib from '../lib';
import * as Client from './client';
import * as V from './vector';
import Sprite from './sprite';

import { Mutex } from 'async-mutex';

interface None {
    action: 'None';
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
    cardId: number;
}

interface Give {
    action: 'Give';
    playerIndex: number;
    cardId: number;
}

interface Return {
    action: 'Return';
    cardId: number;
}

interface Reorder {
    action: 'Reorder';
    cardId: number;
}

interface ControlShiftClick {
    action: 'ControlShiftClick';
    cardId: number;
}

interface ControlClick {
    action: 'ControlClick';
    cardId: number;
}

interface ShiftClick {
    action: 'ShiftClick';
    cardId: number;
}

interface Click {
    action: 'Click';
    cardId: number;
}

interface AddToScore {
    action: 'AddToScore';
    cardId: number;
}

interface TakeFromScore {
    action: 'TakeFromScore';
    cardId: number;
}

export type Action =
    None |
    Deselect |
    Draw |
    Take |
    Give |
    Return |
    Reorder |
    ControlShiftClick |
    ControlClick |
    ShiftClick |
    Click |
    AddToScore |
    TakeFromScore;

export let action: Action = { action: 'None' };

// so that a card drawn from the deck goes into 持牌
let drewFromDeck = false;

// so that a card taken from the score doesn't immediately go back
let tookFromScore = false;

// indices of cards for drag & drop
export const selectedCardIds = new Set<number>();

export function linkWithCards(gameState: Lib.GameState): void {
    const faceCardIdSet = new Set(gameState.playerStates.flatMap((playerState, index) => {
        if (playerState !== null) {
            if (index === gameState.playerIndex) {
                return playerState.handCardIds;
            } else {
                return playerState.handCardIds.slice(0, playerState.shareCount);
            }
        } else {
            return [];
        }
    }));

    for (const selectedCardId of Array.from(selectedCardIds)) {
        if (!faceCardIdSet.has(selectedCardId)) {
            selectedCardIds.delete(selectedCardId);
            if ('cardId' in action && action.cardId === selectedCardId) {
                action = { action: 'None' };
            }
        }
    }
}

export const handRatio = 0.25;
export const deckRatio = 1 - 2 / (1 + Math.sqrt(5));

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
    if (!gameState) return;

    if (sprite === Sprite.deckSprites[Sprite.deckSprites.length - 1]) {
        sprite.setAnchorAt(position);
        action = { action: 'Draw' };
        drewFromDeck = true;
        //console.log(`action is now Draw`);
    } else {
        const cardIndex = Sprite.scoreSprites.indexOf(sprite);
        if (cardIndex >= 0) {
            const cardId = gameState.scoreCardIds[cardIndex];
            if (cardId === undefined) throw new Error();

            sprite.setAnchorAt(position);
            action = {
                action: 'TakeFromScore',
                cardId
            };
            tookFromScore = true;
            //console.log(`action is now TakeFromScore`);
        } else {
            action = { action: 'Deselect' };

            for (let playerIndex = 0; playerIndex < gameState.playerStates.length; ++playerIndex) {
                const playerState = gameState.playerStates[playerIndex];
                if (!playerState) continue;

                const sprites = Sprite.playerFaceSprites[playerIndex];
                if (!sprites) continue;

                const cardIndex = sprites.indexOf(sprite);
                if (cardIndex >= 0) {
                    const cardId = playerState.handCardIds[cardIndex];
                    if (cardId === undefined) throw new Error();

                    if (playerIndex === gameState.playerIndex) {
                        // this player's own card
                        if (selectedCardIds.has(cardId)) {
                            selectedCardIds.forEach((selectedCardId: number) => {
                                const selectedSprite = Sprite.spriteForCardId.getB(selectedCardId);
                                if (selectedSprite === undefined) throw new Error();
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
                            cardId
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
                                cardId
                            };
                        }
                    }
                }
            }
        }
    }
}

const actionMutex = new Mutex();

Sprite.onDragMove = async (position, sprite) => {
    mouseMovePosition = position;
    exceededDragThreshold = exceededDragThreshold ||
        V.distance(mouseMovePosition, mouseDownPosition) > Sprite.dragThreshold;

    if (action.action === 'None') {
        // do nothing
    } else if (action.action === 'Deselect') {
        // TODO: box selection?
    } else if (
        action.action === 'Draw' ||
        action.action === 'Take' ||
        action.action === 'TakeFromScore'
    ) {
        if (exceededDragThreshold) {
            (async () => {
                if (actionMutex.isLocked()) return;
                await actionMutex.acquire();
                try {
                    // the action might have changed after await
                    if (action.action === 'Take') {
                        await Client.takeFromOtherPlayer(
                            action.playerIndex,
                            action.cardId
                        );
                    } else if (action.action === 'Draw') {
                        //console.log(`drawing...`);
                        await Client.drawFromDeck();
                        //console.log(`drew`);
                    } else if (action.action === 'TakeFromScore') {
                        //console.log(`taking from score...`);
                        await Client.takeFromScore(action.cardId);
                        //console.log(`took from score`);
                    } else {
                        const _: never = action;
                    }

                    const gameState = Client.gameState;
                    if (!gameState) throw new Error();

                    const playerState = gameState.playerStates[gameState.playerIndex];
                    if (!playerState) throw new Error();

                    // immediately select newly acquired card
                    const cardId = playerState.handCardIds[playerState.handCardIds.length - 1];
                    if (cardId === undefined) throw new Error();
                    selectedCardIds.clear();
                    selectedCardIds.add(cardId);
                    action = { action: 'Reorder', cardId };
                    //console.log(`set action to reorder`);
                    await drag();
                } finally {
                    actionMutex.release();
                }
            })();
        }
    } else if (
        action.action === 'Give' ||
        action.action === 'Return' ||
        action.action === 'Reorder' ||
        action.action === 'AddToScore'
    ) {
        (async () => {
            if (actionMutex.isLocked()) return;
            await actionMutex.acquire();
            try {
                await drag();
            } finally {
                actionMutex.release();
            }
        })();
    } else if (
        action.action === 'ControlShiftClick' ||
        action.action === 'ControlClick' ||
        action.action === 'ShiftClick' ||
        action.action === 'Click'
    ) {
        if (exceededDragThreshold) {
            (async () => {
                if (actionMutex.isLocked()) return;
                await actionMutex.acquire();
                try {
                    const gameState = Client.gameState;
                    if (!gameState) return;

                    if (selectedCardIds.has(action.cardId)) {
                        const playerState = gameState.playerStates[gameState.playerIndex];
                        const container = Sprite.containers[gameState.playerIndex];
                        const faceSprites = Sprite.playerFaceSprites[gameState.playerIndex];
                        if (!playerState || !container || !faceSprites) throw new Error();

                        // dragging a selected card causes other selected cards to "gather" around it
                        const selectedCardIdsAndIndices: [number, number][] = [];
                        selectedCardIds.forEach(selectedCardId => {
                            selectedCardIdsAndIndices.push([
                                selectedCardId,
                                playerState.handCardIds.indexOf(selectedCardId)
                            ]);
                        });
                        selectedCardIdsAndIndices.sort(([x, a], [y, b]) => a - b);

                        const i = selectedCardIdsAndIndices.map(([x, a]) => x).indexOf(action.cardId);
                        let j = 0;
                        selectedCardIdsAndIndices.forEach(([selectedCardId, selectedIndex]) => {
                            const selectedSprite = faceSprites[selectedIndex];
                            if (!selectedSprite) throw new Error();
                            selectedSprite.setAnchorAt(V.add(V.add(
                                selectedSprite.getTopLeftInWorld(),
                                V.sub(
                                    container.transform.worldTransform.apply(sprite.position),
                                    sprite.getTopLeftInWorld()
                                )), {
                                    x: (i - j) * Sprite.gap,
                                    y: 0
                                })
                            );

                            ++j;
                        });
                    } else {
                        // dragging a non-selected card selects it and only it
                        selectedCardIds.clear();
                        selectedCardIds.add(action.cardId);
                    }

                    await drag();
                } finally {
                    actionMutex.release();
                }
            })();
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

        //console.log('endedOnBackground', endedOnBackground);

        const playerState = gameState.playerStates[gameState.playerIndex];
        if (!playerState) throw new Error();

        if (action.action === 'None') {
            // do nothing
        } else if (action.action === 'Deselect') {
            selectedCardIds.clear();
        } else if (action.action === 'Draw' || action.action === 'Take' || action.action === 'TakeFromScore') {
            // taking from other players or the deck are placeholder states until mouse movement reaches threshold
        } else if (action.action === 'Reorder') {
            // reordering happens in onDragMove
            previousClickIndex = playerState.handCardIds.indexOf(action.cardId);
        } else if (action.action === 'Give') {
            previousClickIndex = -1;
            if (!endedOnBackground) {
                const playerIndex = action.playerIndex;
                actionMutex.runExclusive(() => Client.giveToOtherPlayer(playerIndex));
            }
        } else if (action.action === 'Return') {
            if (drewFromDeck) {
                previousClickIndex = playerState.handCardIds.indexOf(action.cardId);
            } else {
                previousClickIndex = -1;
                if (!endedOnBackground) {
                    actionMutex.runExclusive(() => Client.returnToDeck());
                }
            }
        } else if (action.action === 'AddToScore') {
            if (tookFromScore) {
                previousClickIndex = playerState.handCardIds.indexOf(action.cardId);
            } else {
                previousClickIndex = -1;
                if (!endedOnBackground) {
                    actionMutex.runExclusive(() => Client.addToScore());
                }
            }
        } else if (action.action === 'ControlShiftClick') {
            if (previousClickIndex === -1) {
                previousClickIndex = playerState.handCardIds.indexOf(action.cardId);
            }

            const clickIndex = playerState.handCardIds.indexOf(action.cardId);
            const start = Math.min(clickIndex, previousClickIndex);
            const end = Math.max(clickIndex, previousClickIndex);
            for (let i = start; i <= end; ++i) {
                const cardId = playerState.handCardIds[i];
                if (cardId === undefined) throw new Error();
                selectedCardIds.add(cardId);
            }
        } else if (action.action === 'ControlClick') {
            previousClickIndex = playerState.handCardIds.indexOf(action.cardId);

            if (selectedCardIds.has(action.cardId)) {
                selectedCardIds.delete(action.cardId);
            } else {
                selectedCardIds.add(action.cardId);
            }
        } else if (action.action === 'ShiftClick') {
            if (previousClickIndex === -1) {
                previousClickIndex = playerState.handCardIds.indexOf(action.cardId);
            }

            const clickIndex = playerState.handCardIds.indexOf(action.cardId);
            const start = Math.min(clickIndex, previousClickIndex);
            const end = Math.max(clickIndex, previousClickIndex);
            selectedCardIds.clear();
            for (let i = start; i <= end; ++i) {
                const cardId = playerState.handCardIds[i];
                if (cardId === undefined) throw new Error();
                selectedCardIds.add(cardId);
            }
        } else if (action.action === 'Click') {
            previousClickIndex = playerState.handCardIds.indexOf(action.cardId);

            selectedCardIds.clear();
            selectedCardIds.add(action.cardId);
        } else {
            const _: never = action;
        }
    } finally {
        action = { action: 'None' };
        drewFromDeck = false;
        tookFromScore = false;
    }
}

async function drag(): Promise<void> {
    const gameState = Client.gameState;
    if (!gameState) throw new Error();

    const playerState = gameState.playerStates[gameState.playerIndex];
    const container = Sprite.containers[gameState.playerIndex];
    const sprites = Sprite.playerFaceSprites[gameState.playerIndex];
    const width = Sprite.widths[gameState.playerIndex];
    if (!playerState || !container || !sprites || width === undefined) throw new Error();

    const movingSpritesAndCardIds: [Sprite, number][] = [];
    const reservedSpritesAndCardIds: [Sprite, number][] = [];

    let newShareCount = playerState.shareCount;
    let newRevealCount = playerState.revealCount;
    let newGroupCount = playerState.groupCount;

    // extract moving and reserved sprites
    for (let i = 0; i < playerState.handCardIds.length; ++i) {
        const sprite = sprites[i];
        const cardId = playerState.handCardIds[i];
        if (sprite === undefined || cardId === undefined) throw new Error();

        if (selectedCardIds.has(cardId)) {
            movingSpritesAndCardIds.push([sprite, cardId]);

            if (i < playerState.shareCount) {
                --newShareCount;
            }

            if (i < playerState.revealCount) {
                --newRevealCount;
            }

            if (i < playerState.groupCount) {
                --newGroupCount;
            }
        } else {
            reservedSpritesAndCardIds.push([sprite, cardId]);
        }
    }

    // find the held sprites, if any, overlapped by the dragged sprites
    const leftMovingSprite = movingSpritesAndCardIds[0]?.[0];
    const rightMovingSprite = movingSpritesAndCardIds[movingSpritesAndCardIds.length - 1]?.[0];
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

    const deckMin = {
        x: deckRatio * Sprite.app.view.width - (Sprite.width + Sprite.spriteForCardId.size * Sprite.deckGap) / 2,
        y: Sprite.app.view.height / 2 - Sprite.height - Sprite.gap,
    };
    const deckMax = {
        x: deckRatio * Sprite.app.view.width + (Sprite.width + Sprite.spriteForCardId.size * Sprite.deckGap) / 2,
        y: Sprite.app.view.height / 2 - Sprite.gap,
    };

    if (intersectBox(dragMin, dragMax, deckMin, deckMax)) {
        if ('cardId' in action && !drewFromDeck) {
            action = {
                action: 'Return',
                cardId: action.cardId
            };
        }

        return;
    }

    const scoreMin = {
        x: (deckRatio - (0.5 - deckRatio)) * Sprite.app.view.width,
        y: Sprite.app.view.height / 2 + Sprite.gap,
    };
    const scoreMax = {
        x: 0.5 * Sprite.app.view.width,
        y: Sprite.app.view.height /2 + Sprite.gap + Sprite.height,
    };

    if (intersectBox(dragMin, dragMax, scoreMin, scoreMax)) {
        if ('cardId' in action && !drewFromDeck && !tookFromScore) {
            action = {
                action: 'AddToScore',
                cardId: action.cardId
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
        const above = Sprite.reverse[playerIndex];

        if (!playerContainer || playerWidth === undefined || above == undefined) throw new Error();

        const sharedCardsMin = {
            x: above ? (1 - handRatio) * playerWidth : 0,
            y: above ? Sprite.height : 0
        };
        const sharedCardsMax = {
            x: above ? playerWidth : handRatio * playerWidth,
            y: above ? 2 * Sprite.height : Sprite.height
        };

        const dragMinInContainer = playerContainer.transform.worldTransform.applyInverse(dragMin);
        const dragMaxInContainer = playerContainer.transform.worldTransform.applyInverse(dragMax);
        if (intersectBox(dragMinInContainer, dragMaxInContainer, sharedCardsMin, sharedCardsMax)) {
            if ('cardId' in action) {
                action = {
                    action: 'Give',
                    playerIndex: playerIndex,
                    cardId: action.cardId
                };
            }

            return;
        }
    }

    if ('cardId' in action) {
        action = {
            action: 'Reorder',
            cardId: action.cardId
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
    const handX = handRatio * width;
    const midY = (dragMinInContainer.y + dragMaxInContainer.y) / 2;

    const splitTop = !drewFromDeck && midY < Sprite.height;
    const splitLeft = (dragMinInContainer.x + dragMaxInContainer.x) / 2 < handX;
    let splitIndex: number | undefined = undefined;
    let start: number;
    let end: number;
    if (splitTop) {
        if (dragMinInContainer.x < handX && handX < dragMaxInContainer.x) {
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
        if (dragMinInContainer.x < handX && handX < dragMaxInContainer.x) {
            splitIndex = newGroupCount;
        }

        if (splitLeft) {
            start = newRevealCount;
            end = newGroupCount;
        } else {
            start = newGroupCount;
            end = reservedSpritesAndCardIds.length;
        }
    }

    if (splitIndex === undefined) {
        let leftIndex: number | undefined = undefined;
        let rightIndex: number | undefined = undefined;
        for (let i = start; i < end; ++i) {
            const reservedSprite = reservedSpritesAndCardIds[i]?.[0];
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
            const leftReservedSprite = reservedSpritesAndCardIds[leftIndex]?.[0];
            const rightReservedSprite = reservedSpritesAndCardIds[rightIndex]?.[0];
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
            const reservedSprite = reservedSpritesAndCardIds[splitIndex]?.[0];
            if (!reservedSprite) throw new Error();

            if (rightMovingCardTarget.x < reservedSprite.target.x) {
                break;
            }
        }
    }

    //console.log(`BEFORE: splitIndex: ${splitIndex}, shareCount: ${shareCount}, revealCount: ${revealCount}, groupCount: ${groupCount}, splitLeft: ${splitLeft}`);

    if (splitIndex < newShareCount || splitIndex === newShareCount && splitTop && splitLeft) {
        newShareCount += movingSpritesAndCardIds.length;
    }

    if (splitIndex < newRevealCount || splitIndex === newRevealCount && splitTop) {
        newRevealCount += movingSpritesAndCardIds.length;
    }

    if (splitIndex < newGroupCount || splitIndex === newGroupCount && (splitTop || splitLeft)) {
        newGroupCount += movingSpritesAndCardIds.length;
    }

    //console.log(`AFTER: splitIndex: ${splitIndex}, shareCount: ${shareCount}, revealCount: ${revealCount}, groupCount: ${groupCount}, splitLeft: ${splitLeft}`);

    const newCardIds: number[] = [];
    const compareAndPushCardId = ([sprite, cardId]: [Sprite, number]) => {
        newCardIds.push(cardId);
    };

    reservedSpritesAndCardIds.slice(0, splitIndex).map(compareAndPushCardId);
    movingSpritesAndCardIds.map(compareAndPushCardId);
    reservedSpritesAndCardIds.splice(splitIndex).map(compareAndPushCardId);

    if (newShareCount !== playerState.shareCount ||
        newRevealCount !== playerState.revealCount ||
        newGroupCount !== playerState.groupCount ||
        JSON.stringify(newCardIds) !== JSON.stringify(playerState.handCardIds)
    ) {
        await Client.reorderCards(newShareCount, newRevealCount, newGroupCount, newCardIds);
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