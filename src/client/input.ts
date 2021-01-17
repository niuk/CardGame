import * as Lib from '../lib';
import * as State from './state';
import * as VP from './view-params';
import Vector from './vector';
import Sprite from './sprite';

interface TakeFromOtherPlayer {
    type: "TakeFromOtherPlayer";
    mousePositionToSpritePosition: Vector;
    otherPlayerIndex: number;
    cardIndex: number;
    card: Lib.Card;
}

interface DrawFromDeck {
    type: "DrawFromDeck";
    mousePositionToSpritePosition: Vector;
}

interface WaitingForNewCard {
    type: "WaitingForNewCard";
    mousePositionToSpritePosition: Vector;
}

interface ReturnToDeck {
    type: "ReturnToDeck";
    cardIndex: number;
    mousePositionToSpritePosition: Vector;
}

interface Reorder {
    type: "Reorder";
    cardIndex: number;
    mousePositionToSpritePosition: Vector;
}

interface ControlShiftClick {
    type: "ControlShiftClick";
    cardIndex: number;
    mousePositionToSpritePosition: Vector;
}

interface ControlClick {
    type: "ControlClick";
    cardIndex: number;
    mousePositionToSpritePosition: Vector;
}

interface ShiftClick {
    type: "ShiftClick";
    cardIndex: number;
    mousePositionToSpritePosition: Vector;
}

interface Click {
    type: "Click";
    cardIndex: number;
    mousePositionToSpritePosition: Vector;
}

export type Action =
    "None" |
    "SortBySuit" |
    "SortByRank" |
    "Wait" |
    "Proceed" |
    "Deselect" |
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
const moveThreshold = 0.5 * VP.pixelsPerCM;

export let action: Action = "None";

let previousClickTime = -1;
let previousClickIndex = -1;
let mouseDownPosition = <Vector>{ x: 0, y: 0 };
let mouseMovePosition = <Vector>{ x: 0, y: 0 };
let exceededDragThreshold = false;

let holdingControl = false;
let holdingShift = false;
window.onkeydown = (e: KeyboardEvent) => {
    if (e.key === "Control") {
        holdingControl = true;
    } else if (e.key === "Shift") {
        holdingShift = true;
    }
};

window.onkeyup = (e: KeyboardEvent) => {
    if (e.key === "Control") {
        holdingControl = false;
    } else if (e.key === "Shift") {
        holdingShift = false;
    }
};

interface HasClientPosition {
    clientX: number;
    clientY: number;
}

interface HasMovement {
    movementX: number;
    movementY: number;
}

function getMousePosition(e: HasClientPosition) {
    return new Vector(
        VP.canvas.width * (e.clientX - VP.canvasRect.left) / VP.canvasRect.width,
        VP.canvas.height * (e.clientY - VP.canvasRect.top) / VP.canvasRect.height
    );
}

let previousTouch: Touch | undefined;
VP.canvas.onmousedown = async event => {
    await onDown(event);
}

VP.canvas.ontouchstart = async event => {
    const touch = event.touches[0];
    if (touch !== undefined) {
        await onDown(touch);
        previousTouch = touch;
    }
};

async function onDown(event: HasClientPosition) {
    const unlock = await State.lock();
    try {
        mouseDownPosition = getMousePosition(event);
        mouseMovePosition = mouseDownPosition;
        exceededDragThreshold = false;

        const deckPosition = State.deckSprites[State.deckSprites.length - 1]?.position;

        if (VP.sortByRankBounds[0].x < mouseDownPosition.x && mouseDownPosition.x < VP.sortByRankBounds[1].x &&
            VP.sortByRankBounds[0].y < mouseDownPosition.y && mouseDownPosition.y < VP.sortByRankBounds[1].y
        ) {
            action = "SortByRank";
        } else if (
            VP.sortBySuitBounds[0].x < mouseDownPosition.x && mouseDownPosition.x < VP.sortBySuitBounds[1].x &&
            VP.sortBySuitBounds[0].y < mouseDownPosition.y && mouseDownPosition.y < VP.sortBySuitBounds[1].y
        ) {
            action = "SortBySuit";
        } else if (
            VP.waitBounds[0].x < mouseDownPosition.x && mouseDownPosition.x < VP.waitBounds[1].x &&
            VP.waitBounds[0].y < mouseDownPosition.y && mouseDownPosition.y < VP.waitBounds[1].y
        ) {
            action = "Wait";
        } else if (
            VP.proceedBounds[0].x < mouseDownPosition.x && mouseDownPosition.x < VP.proceedBounds[1].x &&
            VP.proceedBounds[0].y < mouseDownPosition.y && mouseDownPosition.y < VP.proceedBounds[1].y
        ) {
            action = "Proceed";
        } else if (deckPosition !== undefined &&
            deckPosition.x < mouseDownPosition.x && mouseDownPosition.x < deckPosition.x + VP.spriteWidth &&
            deckPosition.y < mouseDownPosition.y && mouseDownPosition.y < deckPosition.y + VP.spriteHeight
        ) {
            action = {
                mousePositionToSpritePosition: deckPosition.sub(mouseDownPosition),
                type: "DrawFromDeck"
            };
        } else {
            const gameState = State.gameState;
            if (gameState === undefined) return;

            // because we render left to right, the rightmost card under the mouse position is what we should return
            const sprites = State.faceSpritesForPlayer[gameState.playerIndex];
            if (sprites === undefined) return;

            let deselect = true;
            for (let i = sprites.length - 1; i >= 0; --i) {
                const position = sprites[i]?.position;
                if (position !== undefined &&
                    position.x < mouseDownPosition.x && mouseDownPosition.x < position.x + VP.spriteWidth &&
                    position.y < mouseDownPosition.y && mouseDownPosition.y < position.y + VP.spriteHeight
                ) {
                    deselect = false;

                    action = {
                        cardIndex: i,
                        mousePositionToSpritePosition: position.sub(mouseDownPosition),
                        type: holdingControl && holdingShift ? "ControlShiftClick" :
                            holdingControl ? "ControlClick" :
                            holdingShift ? "ShiftClick" : "Click"
                    };
                    
                    break;
                }
            }

            for (let i = 0; i < 4; ++i) {
                const otherPlayer = gameState.otherPlayers[i];
                if (otherPlayer !== null && otherPlayer !== undefined) {
                    const transform = VP.getTransformForPlayer(VP.getRelativePlayerIndex(i, gameState.playerIndex));
                    transform.invertSelf();
                    const transformedPosition = transform.transformPoint(mouseDownPosition);

                    for (let j = otherPlayer.shareCount - 1; j >= 0; --j) {
                        const sprite = State.faceSpritesForPlayer[i]?.[j];
                        if (sprite === undefined) throw new Error();
                        if (sprite.position.x < transformedPosition.x && transformedPosition.x < sprite.position.x + VP.spriteWidth &&
                            sprite.position.y < transformedPosition.y && transformedPosition.y < sprite.position.y + VP.spriteHeight
                        ) {
                            console.log(`mouse down on ${i}'s card ${j}`);

                            const card = otherPlayer.revealedCards[j];
                            if (card === undefined) throw new Error();
                            action = {
                                type: "TakeFromOtherPlayer",
                                mousePositionToSpritePosition: new Vector(0, 0),
                                otherPlayerIndex: i,
                                cardIndex: j,
                                card
                            };

                            deselect = false;

                            break;
                        }
                    }
                }
            }

            if (deselect) {
                action = "Deselect";
            }
        }
    } finally {
        unlock();
    }
}

VP.canvas.onmousemove = async event => {
    await onMove(event, event);
};

VP.canvas.ontouchmove = async event => {
    const touch = event.touches[0];
    if (touch !== undefined) {
        await onMove(touch, {
            movementX: touch.clientX - (previousTouch?.clientX ?? touch.clientX),
            movementY: touch.clientY - (previousTouch?.clientY ?? touch.clientY)
        });
        previousTouch = touch;
    }
};

async function onMove(event: HasClientPosition, movement: HasMovement) {
    const gameState = State.gameState;
    if (gameState === undefined) return;

    const unlock = await State.lock();
    try {
        mouseMovePosition = getMousePosition(event);
        exceededDragThreshold = exceededDragThreshold || mouseMovePosition.distance(mouseDownPosition) > moveThreshold;

        if (action === "None") {
            // do nothing
        } else if (action === "SortBySuit") {
            // TODO: check whether mouse position has left button bounds
        } else if (action === "SortByRank") {
            // TODO: check whether mouse position has left button bounds
        } else if (action === "Wait") {
            // TODO: check whether mouse position has left button bounds
        } else if (action === "Proceed") {
            // TODO: check whether mouse position has left button bounds
        } else if (action === "Deselect") {
            // TODO: box selection?
        } else if (
            action.type === "TakeFromOtherPlayer" ||
            action.type === "DrawFromDeck" ||
            action.type === "WaitingForNewCard"
        ) {
            if (exceededDragThreshold) {
                let promise: Promise<void> | undefined;
                let sprite: Sprite | undefined;
                if (action.type === "TakeFromOtherPlayer") {
                    promise = State.takeCard(
                        action.otherPlayerIndex,
                        action.cardIndex,
                        action.card
                    );

                    sprite = State.faceSpritesForPlayer[action.otherPlayerIndex]?.[action.cardIndex];
                } else if (action.type === "DrawFromDeck") {
                    // card drawing will try to lock the state, so we must attach a callback instead of awaiting
                    promise = State.drawCard();

                    sprite = State.deckSprites[State.deckSprites.length - 1];
                }

                if (promise !== undefined) {
                    if (sprite === undefined) throw new Error();
                    sprite.target = mouseMovePosition.add(action.mousePositionToSpritePosition);

                    action = { ...action, type: "WaitingForNewCard" };
                    promise.then(onCardDrawn(sprite)).catch(_ => {
                        if (action !== "None" &&
                            action !== "Deselect" &&
                            action !== "SortByRank" &&
                            action !== "SortBySuit" &&
                            action !== "Wait" &&
                            action !== "Proceed" &&
                            action.type === "WaitingForNewCard"
                        ) {
                            action = "None";
                        }
                    });
                }
            }
        } else if (action.type === "ReturnToDeck" || action.type === "Reorder" ) {
            drag(gameState, action.cardIndex, action.mousePositionToSpritePosition);
        } else if (
            action.type === "ControlShiftClick" ||
            action.type === "ControlClick" ||
            action.type === "ShiftClick" ||
            action.type === "Click"
        ) {
            let i = Lib.binarySearchNumber(State.selectedIndices, action.cardIndex);
            if (exceededDragThreshold) {
                // dragging a non-selected card selects it and only it
                if (i < 0) {
                    State.selectedIndices.splice(0, State.selectedIndices.length, action.cardIndex);
                }

                drag(gameState, action.cardIndex, action.mousePositionToSpritePosition);
            } else {
                const sprites = State.faceSpritesForPlayer[gameState.playerIndex];
                if (sprites === undefined) throw new Error();
    
                if (i < 0) {
                    const sprite = sprites[action.cardIndex];
                    if (sprite === undefined) throw new Error();
                    sprite.target = sprite.target.add(new Vector(movement.movementX, movement.movementY));
                } else {
                    for (const j of State.selectedIndices) {
                        const sprite = sprites[j];
                        if (sprite === undefined) throw new Error();
                        sprite.target = sprite.target.add(new Vector(movement.movementX, movement.movementY));
                    }
                }
            }
        } else {
            const _: never = action;
        }
    } finally {
        unlock();
    }
};

VP.canvas.onmouseup = async event => {
    await onUp();
};

VP.canvas.ontouchend = async event => {
    await onUp();
};

async function onUp() {
    const gameState = State.gameState;
    if (gameState === undefined) return;

    const unlock = await State.lock();
    try {
        if (action === "None") {
            // do nothing
        } else if (action === "SortByRank") {
            await State.sortByRank(gameState);
        } else if (action === "SortBySuit") {
            await State.sortBySuit(gameState);
        } else if (action === "Wait") {
            console.log('waiting');
            await State.wait();
        } else if (action === "Proceed") {
            console.log('proceeding');
            await State.proceed();
        } else if (action === "Deselect") {
            State.selectedIndices.splice(0, State.selectedIndices.length);
        } else if (action.type === "DrawFromDeck" || action.type === "WaitingForNewCard") {
            // do nothing
        } else if (action.type === "Reorder") {
            previousClickIndex = action.cardIndex;
            await State.reorderCards(gameState);
        } else if (action.type === "ReturnToDeck") {
            previousClickIndex = -1;
            await State.returnCardsToDeck(gameState);
        } else if (action.type === "ControlShiftClick") {
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
        } else if (action.type === "ControlClick") {
            previousClickIndex = action.cardIndex;
            let i = Lib.binarySearchNumber(State.selectedIndices, action.cardIndex);
            if (i < 0) {
                State.selectedIndices.splice(~i, 0, action.cardIndex);
            } else {
                State.selectedIndices.splice(i, 1);
            }
        } else if (action.type === "ShiftClick") {
            if (previousClickIndex === -1) {
                previousClickIndex = action.cardIndex;
            }

            const start = Math.min(action.cardIndex, previousClickIndex);
            const end = Math.max(action.cardIndex, previousClickIndex);
            State.selectedIndices.splice(0, State.selectedIndices.length);
            for (let i = start; i <= end; ++i) {
                State.selectedIndices.push(i);
            }
        } else if (action.type === "Click") {
            previousClickIndex = action.cardIndex;
            State.selectedIndices.splice(0, State.selectedIndices.length, action.cardIndex);
        }

        State.setSpriteTargets(gameState);

        action = "None";
    } finally {
        unlock();
    }
};

function onCardDrawn(deckSprite: Sprite) {
    return async () => {
        const gameState = State.gameState;
        if (gameState === undefined) throw new Error();

        const unlock = await State.lock();
        try {
            if (action !== "None" &&
                action !== "SortBySuit" &&
                action !== "SortByRank" &&
                action !== "Wait" &&
                action !== "Proceed" &&
                action !== "Deselect" &&
                action.type === "WaitingForNewCard"
            ) {
                // immediately select newly acquired card
                const cardIndex = gameState.playerCards.length - 1;
                State.selectedIndices.splice(0, State.selectedIndices.length);
                State.selectedIndices.push(cardIndex);

                // new card should appear in place of dragged card from deck without animation
                const faceSpriteAtMouseDown = State.faceSpritesForPlayer[gameState.playerIndex]?.[cardIndex];
                if (faceSpriteAtMouseDown === undefined) throw new Error();
                faceSpriteAtMouseDown.target = deckSprite.position;
                faceSpriteAtMouseDown.position = deckSprite.position;
                //faceSpriteAtMouseDown.velocity = deckSprite.velocity;
                
                drag(gameState, cardIndex, action.mousePositionToSpritePosition);
            }
        } finally {
            unlock();
        }
    };
}

function drag(gameState: Lib.GameState, cardIndex: number, mousePositionToSpritePosition: Vector) {
    const sprites = State.faceSpritesForPlayer[gameState.playerIndex];
    if (sprites === undefined) throw new Error();

    const cards = gameState.playerCards;

    const movingSpritesAndCards: [Sprite, Lib.Card][] = [];
    const reservedSpritesAndCards: [Sprite, Lib.Card][] = [];

    let splitIndex: number | undefined = undefined;
    let shareCount = gameState.playerShareCount;
    let revealCount = gameState.playerRevealCount;

    // extract moving sprites
    for (const i of State.selectedIndices) {
        const sprite = sprites[i];
        const card = cards[i];
        if (sprite === undefined || card === undefined) throw new Error();
        movingSpritesAndCards.push([sprite, card]);

        if (i < gameState.playerShareCount) {
            --shareCount;
        }

        if (i < gameState.playerRevealCount) {
            --revealCount;
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

    const deckDistance = Math.abs(leftMovingSprite.target.y - (VP.canvas.height / 2 - VP.spriteHeight / 2));
    const revealDistance = Math.abs(leftMovingSprite.target.y - (VP.canvas.height - 2 * VP.spriteHeight));
    const hideDistance = Math.abs(leftMovingSprite.target.y - (VP.canvas.height - VP.spriteHeight));

    // set the action for onmouseup
    if (deckDistance < revealDistance && deckDistance < hideDistance) {
        action = { cardIndex, mousePositionToSpritePosition, type: "ReturnToDeck" };

        splitIndex = reservedSpritesAndCards.length;
    } else {
        action = { cardIndex, mousePositionToSpritePosition, type: "Reorder" };

        // determine whether the moving sprites are closer to the revealed sprites or to the hidden sprites
        const splitRevealed = revealDistance < hideDistance;
        let splitShared: boolean;
        let specialSplit: boolean;
        let start: number;
        let end: number;
        if (splitRevealed) {
            if (leftMovingSprite.target.x < VP.canvas.width / 2 &&
                VP.canvas.width / 2 < rightMovingSprite.target.x + VP.spriteWidth
            ) {
                splitIndex = shareCount;
            }
            
            splitShared = (leftMovingSprite.target.x + rightMovingSprite.target.x + VP.spriteWidth) / 2 < VP.canvas.width / 2;
            if (splitShared) {
                start = 0;
                end = shareCount;
            } else {
                start = shareCount;
                end = revealCount;
            }
        } else {
            splitShared = false;
            specialSplit = false;
            start = revealCount;
            end = reservedSpritesAndCards.length;
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

        // adjust share count
        if (splitIndex < shareCount || splitIndex === shareCount && splitShared) {
            shareCount += movingSpritesAndCards.length;
            console.log(`set shareCount to ${shareCount}`);
        }
    
        // adjust reveal count
        if (splitIndex < revealCount || splitIndex === revealCount && splitRevealed) {
            revealCount += movingSpritesAndCards.length;
            console.log(`set revealCount to ${revealCount}`);
        }
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
        movingSprite.target = mouseMovePosition
            .add(mousePositionToSpritePosition)
            .add(new Vector((selectedIndex - action.cardIndex) * VP.spriteGap, 0));
        console.log(`rearranged sprite ${selectedIndex}`);
    }

    State.setSpriteTargets(
        gameState,
        reservedSpritesAndCards,
        movingSpritesAndCards,
        shareCount,
        revealCount,
        splitIndex,
        action.type === "ReturnToDeck"
    );
}