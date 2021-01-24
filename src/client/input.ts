import * as Lib from '../lib';
import * as State from './state';
import * as Client from './client';
import * as V from './vector';
import Sprite from './sprite';

interface TakeFromOtherPlayer {
    type: 'TakeFromOtherPlayer';
    mousePositionToSpritePosition: V.IVector2;
    otherPlayerIndex: number;
    cardIndex: number;
    card: Lib.Card;
}

interface DrawFromDeck {
    type: 'DrawFromDeck';
    mousePositionToSpritePosition: V.IVector2;
}

interface WaitingForNewCard {
    type: 'WaitingForNewCard';
    mousePositionToSpritePosition: V.IVector2;
}

interface ReturnToDeck {
    type: 'ReturnToDeck';
    cardIndex: number;
    mousePositionToSpritePosition: V.IVector2;
}

interface Reorder {
    type: 'Reorder';
    cardIndex: number;
    mousePositionToSpritePosition: V.IVector2;
}

interface ControlShiftClick {
    type: 'ControlShiftClick';
    cardIndex: number;
    mousePositionToSpritePosition: V.IVector2;
}

interface ControlClick {
    type: 'ControlClick';
    cardIndex: number;
    mousePositionToSpritePosition: V.IVector2;
}

interface ShiftClick {
    type: 'ShiftClick';
    cardIndex: number;
    mousePositionToSpritePosition: V.IVector2;
}

interface Click {
    type: 'Click';
    cardIndex: number;
    mousePositionToSpritePosition: V.IVector2;
}

export type Action =
    'None' |
    'SortBySuit' |
    'SortByRank' |
    //'Wait' |
    //'Proceed' |
    'Deselect' |
    TakeFromOtherPlayer |
    DrawFromDeck |
    WaitingForNewCard |
    ReturnToDeck |
    Reorder |
    ControlShiftClick |
    ControlClick |
    ShiftClick |
    Click;

const doubleClickThreshold = 500; // milliseconds
const moveThreshold = 0.5 * Sprite.pixelsPerCM;

export let action: Action = 'None';

let previousClickTime = -1;
let previousClickIndex = -1;
let mouseDownPosition = { x: 0, y: 0 };
let mouseMovePosition = { x: 0, y: 0 };
let exceededDragThreshold = false;

let holdingControl = false;
let holdingShift = false;

window.onkeydown = (e: KeyboardEvent) => {
    if (e.key === 'Control') {
        holdingControl = true;
    } else if (e.key === 'Shift') {
        holdingShift = true;
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

    const mySprites = State.faceSpritesForPlayer[gameState.playerIndex];
    if (mySprites === undefined) throw new Error();

    if (State.deckSprites[State.deckSprites.length - 1] === sprite) {
        action = {
            mousePositionToSpritePosition: V.sub(sprite.position, position),
            type: 'DrawFromDeck'
        };
    } else {
        action = 'Deselect';

        for (let i = 0; i < 4; ++i) {
            const sprites = State.faceSpritesForPlayer[i];
            if (!sprites) continue;

            const cardIndex = sprites.indexOf(sprite);
            if (cardIndex >= 0) {
                if (i === gameState.playerIndex) {
                    action = {
                        cardIndex,
                        mousePositionToSpritePosition: V.sub(sprite.position, position),
                        type: holdingControl && holdingShift ? 'ControlShiftClick' :
                            holdingControl ? 'ControlClick' :
                            holdingShift ? 'ShiftClick' : 'Click'
                    };
                } else {
                    const playerState = gameState.playerStates[i];
                    if (!playerState) throw new Error();

                    if (cardIndex < playerState.shareCount) {
                        const card = playerState.cards[cardIndex];
                        if (!card) throw new Error();

                        action = {
                            type: 'TakeFromOtherPlayer',
                            mousePositionToSpritePosition: V.sub(sprite.position, position),
                            otherPlayerIndex: i,
                            cardIndex,
                            card
                        };
                    }
                }
            }
        }
    }
}

Sprite.onDragMove = (position, sprite) => {
    const movement = V.sub(position, mouseMovePosition);
    mouseMovePosition = position;
    exceededDragThreshold = exceededDragThreshold ||
        V.distance(mouseMovePosition, mouseDownPosition) > moveThreshold;

    const gameState = Client.gameState;
    if (gameState === undefined) return;

    if (action === 'None') {
        // do nothing
    } else if (action === 'SortBySuit') {
        // TODO: check whether mouse position has left button bounds
    } else if (action === 'SortByRank') {
        // TODO: check whether mouse position has left button bounds
    } else if (action === 'Deselect') {
        // TODO: box selection?
    } else if (
        action.type === 'TakeFromOtherPlayer' ||
        action.type === 'DrawFromDeck' ||
        action.type === 'WaitingForNewCard'
    ) {
        sprite.target = V.add(sprite.target, movement);

        if (exceededDragThreshold) {
            let promise: Promise<void> | undefined;
            if (action.type === 'TakeFromOtherPlayer') {
                promise = Client.takeCard(
                    action.otherPlayerIndex,
                    action.cardIndex,
                    action.card
                );
            } else if (action.type === 'DrawFromDeck') {
                promise = Client.drawCard();
            }

            if (promise !== undefined) {
                sprite.target = V.add(mouseMovePosition, action.mousePositionToSpritePosition);

                action = { ...action, type: 'WaitingForNewCard' };
                promise.then(onCardDrawn).catch(_ => {
                    if (action !== 'None' &&
                        action !== 'Deselect' &&
                        action !== 'SortByRank' &&
                        action !== 'SortBySuit' &&
                        action.type === 'WaitingForNewCard'
                    ) {
                        action = 'None';
                    }
                });
            }
        }
    } else if (action.type === 'ReturnToDeck' || action.type === 'Reorder' ) {
        drag(gameState, action.cardIndex, action.mousePositionToSpritePosition);
    } else if (
        action.type === 'ControlShiftClick' ||
        action.type === 'ControlClick' ||
        action.type === 'ShiftClick' ||
        action.type === 'Click'
    ) {
        let i = Lib.binarySearchNumber(State.selectedIndices, action.cardIndex);
        if (exceededDragThreshold) {
            // dragging a non-selected card selects it and only it
            if (i < 0) {
                State.selectedIndices.splice(0, State.selectedIndices.length, action.cardIndex);
            }

            drag(gameState, action.cardIndex, action.mousePositionToSpritePosition);
        } else {
            if (i < 0) {
                sprite.target = V.add(sprite.target, movement);
            } else {
                for (const j of State.selectedIndices) {
                    const sprite = State.faceSpritesForPlayer[gameState.playerIndex]?.[j];
                    if (sprite === undefined) throw new Error();
                    sprite.target = V.add(sprite.target, movement);
                }
            }
        }
    } else {
        const _: never = action;
    }
}

Sprite.onDragEnd = async () => {
    const gameState = Client.gameState;
    if (gameState === undefined) return;

    if (action === 'None') {
        // do nothing
    } else if (action === 'SortByRank') {
        Client.sortByRank(gameState);
    } else if (action === 'SortBySuit') {
        Client.sortBySuit(gameState);
    } else if (action === 'Deselect') {
        State.selectedIndices.splice(0, State.selectedIndices.length);
    } else if (action.type === 'DrawFromDeck' || action.type === 'WaitingForNewCard') {
        // do nothing
    } else if (action.type === 'Reorder') {
        previousClickIndex = action.cardIndex;
        await Client.reorderCards(gameState);
    } else if (action.type === 'ReturnToDeck') {
        previousClickIndex = -1;
        console.log('PRE returnCardsToDeck', gameState.playerStates[gameState.playerIndex]?.cards.length);
        await Client.returnCardsToDeck(gameState);
        console.log('POST returnCardsToDeck', gameState.playerStates[gameState.playerIndex]?.cards.length);
    } else if (action.type === 'ControlShiftClick') {
        if (previousClickIndex === -1) {
            previousClickIndex = action.cardIndex;
        }

        const start = Math.min(action.cardIndex, previousClickIndex);
        const end = Math.max(action.cardIndex, previousClickIndex);
        for (let i = start; i <= end; ++i) {
            let j = Lib.binarySearchNumber(State.selectedIndices, i);
            if (j < 0) {
                State.selectedIndices.splice(~j, 0, i);
            }
        }
    } else if (action.type === 'ControlClick') {
        previousClickIndex = action.cardIndex;
        let i = Lib.binarySearchNumber(State.selectedIndices, action.cardIndex);
        if (i < 0) {
            State.selectedIndices.splice(~i, 0, action.cardIndex);
        } else {
            State.selectedIndices.splice(i, 1);
        }
    } else if (action.type === 'ShiftClick') {
        if (previousClickIndex === -1) {
            previousClickIndex = action.cardIndex;
        }

        const start = Math.min(action.cardIndex, previousClickIndex);
        const end = Math.max(action.cardIndex, previousClickIndex);
        State.selectedIndices.splice(0, State.selectedIndices.length);
        for (let i = start; i <= end; ++i) {
            State.selectedIndices.push(i);
        }
    } else if (action.type === 'Click') {
        previousClickIndex = action.cardIndex;
        State.selectedIndices.splice(0, State.selectedIndices.length, action.cardIndex);
    }

    State.setPlayerSpriteTargets(gameState);

    action = 'None';
}

function onCardDrawn() {
    if (action !== 'None' &&
        action !== 'SortBySuit' &&
        action !== 'SortByRank' &&
        action !== 'Deselect' &&
        action.type === 'WaitingForNewCard'
    ) {
        const gameState = Client.gameState;
        if (gameState === undefined) throw new Error();

        const player = gameState.playerStates[gameState.playerIndex];
        if (player === undefined || player === null) throw new Error();        

        // immediately select newly acquired card
        const cardIndex = player.cards.length - 1;
        State.selectedIndices.splice(0, State.selectedIndices.length, cardIndex);
        drag(gameState, cardIndex, action.mousePositionToSpritePosition);
    }
}

function drag(gameState: Lib.GameState, cardIndex: number, mousePositionToSpritePosition: V.IVector2) {
    const sprites = State.faceSpritesForPlayer[gameState.playerIndex];
    if (sprites === undefined) throw new Error();

    const player = gameState.playerStates[gameState.playerIndex];
    if (player === undefined || player === null) throw new Error();
    const cards = player.cards;

    const movingSpritesAndCards: [Sprite, Lib.Card][] = [];
    const reservedSpritesAndCards: [Sprite, Lib.Card][] = [];

    let splitIndex: number | undefined = undefined;
    let shareCount = player.shareCount;
    let revealCount = player.revealCount;
    let groupCount = player.groupCount;

    // extract moving sprites
    for (const i of State.selectedIndices) {
        const sprite = sprites[i];
        const card = cards[i];
        if (sprite === undefined || card === undefined) throw new Error();
        movingSpritesAndCards.push([sprite, card]);

        if (i < player.shareCount) {
            --shareCount;
        }

        if (i < player.revealCount) {
            --revealCount;
        }

        if (i < player.groupCount) {
            --groupCount;
        }
    }

    // extract reserved sprites
    for (let i = 0; i < sprites.length; ++i) {
        if (Lib.binarySearchNumber(State.selectedIndices, i) < 0) {
            const sprite = sprites[i];
            const card = cards[i];
            if (sprite === undefined || card === undefined) throw new Error();
            reservedSpritesAndCards.push([sprite, card]);
        }
    }

    // find the held sprites, if any, overlapped by the dragged sprites
    const leftMovingSprite = movingSpritesAndCards[0]?.[0];
    const rightMovingSprite = movingSpritesAndCards[movingSpritesAndCards.length - 1]?.[0];
    if (leftMovingSprite === undefined || rightMovingSprite === undefined) {
        throw new Error();
    }

    const deckDistance = Math.abs(leftMovingSprite.target.y - (Sprite.app.view.height / 2 - Sprite.height / 2));
    const revealDistance = Math.abs(leftMovingSprite.target.y - (Sprite.app.view.height - 2 * Sprite.height));
    const hideDistance = Math.abs(leftMovingSprite.target.y - (Sprite.app.view.height - Sprite.height));

    // set the action for onmouseup
    if (deckDistance < revealDistance && deckDistance < hideDistance) {
        action = { cardIndex, mousePositionToSpritePosition, type: 'ReturnToDeck' };

        splitIndex = reservedSpritesAndCards.length;
    } else {
        action = { cardIndex, mousePositionToSpritePosition, type: 'Reorder' };

        // determine whether the moving sprites are closer to the revealed sprites or to the hidden sprites
        const splitRevealed = revealDistance < hideDistance;
        let splitLeft = leftMovingSprite.target.x + rightMovingSprite.target.x + Sprite.width < Sprite.app.view.width;
        let start: number;
        let end: number;
        if (splitRevealed) {
            if (leftMovingSprite.target.x < Sprite.app.view.width / 2 &&
                Sprite.app.view.width / 2 < rightMovingSprite.target.x + Sprite.width
            ) {
                splitIndex = shareCount;
            }
            
            if (splitLeft) {
                start = 0;
                end = shareCount;
            } else {
                start = shareCount;
                end = revealCount;
            }
        } else {
            if (leftMovingSprite.target.x < Sprite.app.view.width / 2 &&
                Sprite.app.view.width / 2 < rightMovingSprite.target.x + Sprite.width
            ) {
                splitIndex = groupCount;
            }

            if (splitLeft) {
                start = revealCount;
                end = groupCount;
            } else {
                start = groupCount;
                end = reservedSpritesAndCards.length;
            }
        }

        if (splitIndex === undefined) {
            let leftIndex: number | undefined = undefined;
            let rightIndex: number | undefined = undefined;
            for (let i = start; i < end; ++i) {
                const reservedSprite = reservedSpritesAndCards[i]?.[0];
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
                const leftReservedSprite = reservedSpritesAndCards[leftIndex]?.[0];
                const rightReservedSprite = reservedSpritesAndCards[rightIndex]?.[0];
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
                const reservedSprite = reservedSpritesAndCards[splitIndex]?.[0];
                if (reservedSprite === undefined) throw new Error();
                if (rightMovingSprite.target.x < reservedSprite.target.x) {
                    break;
                }
            }
        }

        console.log(`BEFORE: splitIndex: ${splitIndex}, shareCount: ${shareCount}, revealCount: ${revealCount}, groupCount: ${groupCount}, splitLeft: ${splitLeft}`);

        if (splitIndex < shareCount || splitIndex === shareCount && splitRevealed && splitLeft) {
            shareCount += movingSpritesAndCards.length;
        }

        if (splitIndex < revealCount || splitIndex === revealCount && splitRevealed) {
            revealCount += movingSpritesAndCards.length;
        }

        if (splitIndex < groupCount || splitIndex === groupCount && (splitRevealed || splitLeft)) {
            groupCount += movingSpritesAndCards.length;
        }
        
        console.log(`AFTER: splitIndex: ${splitIndex}, shareCount: ${shareCount}, revealCount: ${revealCount}, groupCount: ${groupCount}, splitLeft: ${splitLeft}`);
    }

    // adjust selected indices
    // modifying action.cardIndex directly in the loop would cause us to
    // check its adjusted value against old indices, which is incorrect
    let newCardIndex = action.cardIndex;
    for (let i = 0; i < State.selectedIndices.length; ++i) {
        if (action.cardIndex === State.selectedIndices[i]) {
            newCardIndex = splitIndex + i;
        }

        State.selectedIndices[i] = splitIndex + i;
    }

    action.cardIndex = newCardIndex;

    // drag all selected cards as a group around the card under the mouse position
    for (const selectedIndex of State.selectedIndices) {
        const movingSpriteAndCard = movingSpritesAndCards[selectedIndex - splitIndex];
        if (movingSpriteAndCard === undefined) throw new Error();
        const [movingSprite, movingCard] = movingSpriteAndCard;
        movingSprite.target = V.add(
            V.add(mouseMovePosition, mousePositionToSpritePosition),
            { x: (selectedIndex - action.cardIndex) * Sprite.gap, y: 0 });
    }

    State.setPlayerSpriteTargets(
        gameState,
        reservedSpritesAndCards,
        movingSpritesAndCards,
        shareCount,
        revealCount,
        groupCount,
        splitIndex,
        action.type === 'ReturnToDeck'
    );
}
