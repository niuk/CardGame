import * as Lib from '../lib';
import * as State from './state';
import * as VP from './view-params';
import Vector from './vector';
import Sprite from './sprite';

interface ControlShiftClick {
    type: "ControlShiftClick";
    cardIndex: number;
}

interface ControlClick {
    type: "ControlClick";
    cardIndex: number;
}

interface ShiftClick {
    type: "ShiftClick";
    cardIndex: number;
}

interface Click {
    type: "Click";
    cardIndex: number;
}

export type Action =
    "None" |
    "SortBySuit" |
    "SortByRank" |
    "DrawFromDeck" |
    "WaitingForNewCard" |
    "ReturnToDeck" |
    "Reorder" |
    "Deselect" |
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

/*
function setDropAction(gameState: Lib.GameState, cardIndex: number) {
    const dropPosition = (State.faceSpritesForPlayer[gameState.playerIndex] ?? [])[State.selectedIndices[0] ?? 0]?.position;
    if (dropPosition === undefined) throw new Error(`${JSON.stringify(State.faceSpritesForPlayer)}`);
*/
    /*
    console.log(`dropPosition.x: ${dropPosition.x}, ${
        deckPositions[gameState.deckCount - 1].x - cardWidth / 2}, ${
        deckPositions[0].x + cardWidth / 2
    }`);
    console.log(`dropPosition.y: ${dropPosition.y}, ${
        deckPositions[gameState.deckCount - 1].y - cardHeight / 2}, ${
        deckPositions[0].y + cardHeight / 2
    }`);
    */
/*
    const hideDistance   = Math.abs(dropPosition.y - (VP.canvas.height -     VP.spriteHeight));
    const revealDistance = Math.abs(dropPosition.y - (VP.canvas.height - 2 * VP.spriteHeight));
    if (hideDistance < revealDistance) {
        action = { type: "Hide", cardIndex };
    } else {
        action = { type: "Reveal", cardIndex };
    }
}
*/

function getMousePosition(e: MouseEvent) {
    return new Vector(
        VP.canvas.width * (e.clientX - VP.canvasRect.left) / VP.canvasRect.width,
        VP.canvas.height * (e.clientY - VP.canvasRect.top) / VP.canvasRect.height
    );
}

VP.canvas.onmousedown = async (event: MouseEvent) => {
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
        } else if (deckPosition !== undefined &&
            deckPosition.x < mouseDownPosition.x && mouseDownPosition.x < deckPosition.x + VP.spriteWidth &&
            deckPosition.y < mouseDownPosition.y && mouseDownPosition.y < deckPosition.y + VP.spriteHeight
        ) {
            action = "DrawFromDeck";
        } else {
            // because we render left to right, the rightmost card under the mouse position is what we should return
            const sprites = State.faceSpritesForPlayer[<number>State.gameState?.playerIndex];
            if (sprites === undefined) return;

            let deselect = true;
            for (let i = sprites.length - 1; i >= 0; --i) {
                const position = sprites[i]?.position;
                if (position !== undefined &&
                    position.x < mouseDownPosition.x && mouseDownPosition.x < position.x + VP.spriteWidth &&
                    position.y < mouseDownPosition.y && mouseDownPosition.y < position.y + VP.spriteHeight
                ) {
                    deselect = false;

                    // check keys held down for click
                    if (holdingControl && holdingShift) {
                        action = { type: "ControlShiftClick", cardIndex: i };
                    } else if (holdingControl) {
                        action = { type: "ControlClick", cardIndex: i };
                    } else if (holdingShift) {
                        action = { type: "ShiftClick", cardIndex: i };
                    } else {
                        action = { type: "Click", cardIndex: i };
                    }
                    
                    break;
                }
            }

            if (deselect) {
                action = "Deselect";
            }
        }
    } finally {
        unlock();
    }
};

VP.canvas.onmousemove = async (event: MouseEvent) => {
    let unlock = await State.lock();
    try {
        mouseMovePosition = getMousePosition(event);
        exceededDragThreshold = exceededDragThreshold || mouseMovePosition.distance(mouseDownPosition) > moveThreshold;

        let movement = new Vector(event.movementX, event.movementY);

        if (action === "None") {
            // do nothing
        } else if (action === "SortBySuit") {
            // TODO: check whether mouse position has left button bounds
        } else if (action === "SortByRank") {
            // TODO: check whether mouse position has left button bounds
        } else if (action === "DrawFromDeck" || action === "WaitingForNewCard") {
            const deckSprite = State.deckSprites[State.deckSprites.length - 1];
            if (deckSprite === undefined) return;
            deckSprite.target = deckSprite.target.add(movement);

            if (action === "DrawFromDeck" && exceededDragThreshold) {
                action = "WaitingForNewCard";

                // card drawing will try to lock the state, so we must attach a callback instead of awaiting
                State.drawCard().then(onCardDrawn(deckSprite)).catch(_ => {
                    if (action === "WaitingForNewCard") {
                        action = "None";
                    }
                });
            }
        } else if (action === "ReturnToDeck" || action === "Reorder" ) {
            if (State.gameState === undefined) throw new Error();

            const sprites = State.faceSpritesForPlayer[State.gameState.playerIndex];
            if (sprites === undefined) throw new Error();

            // move all selected cards
            for (const selectedIndex of State.selectedIndices) {
                const faceSprite = sprites[selectedIndex];
                if (faceSprite === undefined) throw new Error();
                faceSprite.target = faceSprite.target.add(new Vector(event.movementX, event.movementY));
            }

            drag(State.gameState);
        } else if (action === "Deselect") {
            // TODO: box selection?
        } else if (
            action.type === "ControlShiftClick" ||
            action.type === "ControlClick" ||
            action.type === "ShiftClick" ||
            action.type === "Click"
        ) {
            if (exceededDragThreshold) {
                // dragging a non-selected card selects it and only it
                let i = Lib.binarySearchNumber(State.selectedIndices, action.cardIndex);
                if (i < 0) {
                    i = 0;
                    State.selectedIndices.splice(i, State.selectedIndices.length, action.cardIndex);
                }

                if (State.gameState === undefined) throw new Error();

                // gather together selected cards around the selected card
                const sprites = State.faceSpritesForPlayer[State.gameState.playerIndex];
                const selectedSprite = sprites?.[action.cardIndex];
                if (selectedSprite === undefined) throw new Error();

                let j = 0;
                for (const selectedIndex of State.selectedIndices) {
                    const sprite = sprites?.[selectedIndex];
                    if (sprite === undefined) throw new Error();

                    // account for movement threshold
                    sprite.target = new Vector(
                        event.movementX + selectedSprite.position.x + (j++ - i) * VP.spriteGap,
                        event.movementY + selectedSprite.position.y
                    ).add(mouseMovePosition.sub(mouseDownPosition));
                }

                // no longer a click, but a drag
                drag(State.gameState);
            }
        } else {
            const _: never = action;
        }
    } finally {
        unlock();
    }
};

VP.canvas.onmouseup = async () => {
    const unlock = await State.lock();
    try {
        if (State.gameState === undefined) throw new Error();

        if (action === "None") {
            // do nothing
        } else if (action === "SortByRank") {
            await State.sortByRank(State.gameState);
        } else if (action === "SortBySuit") {
            await State.sortBySuit(State.gameState);
        } else if (action === "DrawFromDeck" || action === "WaitingForNewCard") {
            // do nothing
        } else if (action === "Reorder") {
            await State.reorderCards(State.gameState);
        } else if (action === "ReturnToDeck") {
            await State.returnCardsToDeck(State.gameState);
        } else if (action === "Deselect") {
            State.selectedIndices.splice(0, State.selectedIndices.length);
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

        const sprites = State.faceSpritesForPlayer[State.gameState.playerIndex];
        if (sprites === undefined) throw new Error();
        const cards = State.gameState.playerCards;
        const spritesAndCards = cards.map((card, index) => <[Sprite, Lib.Card]>[sprites[index], card]);
        setSpriteTargets(sprites, cards, spritesAndCards, [], cards.length, State.gameState.playerRevealCount);

        action = "None";
    } finally {
        unlock();
    }
};

function onCardDrawn(deckSprite: Sprite) {
    return async () => {
        const release = await State.lock();
        try {
            if (action === "WaitingForNewCard") {
                if (State.gameState === undefined) throw new Error();

                // immediately select newly acquired card
                const cardIndex = State.gameState.playerCards.length - 1;
                State.selectedIndices.splice(0, State.selectedIndices.length);
                State.selectedIndices.push(cardIndex);

                // new card should appear in place of dragged card from deck without animation
                const faceSpriteAtMouseDown = State.faceSpritesForPlayer[State.gameState.playerIndex]?.[cardIndex];
                if (faceSpriteAtMouseDown === undefined) throw new Error();
                faceSpriteAtMouseDown.target = deckSprite.position;
                faceSpriteAtMouseDown.position = deckSprite.position;
                faceSpriteAtMouseDown.velocity = deckSprite.velocity;
                
                // transition to hide/reveal/returnToDeck
                drag(State.gameState);
            }
        } finally {
            release();
        }
    };
}

function drag(gameState: Lib.GameState) {
    const sprites = State.faceSpritesForPlayer[gameState.playerIndex];
    if (sprites === undefined) throw new Error();

    const cards = gameState.playerCards;

    const movingSpritesAndCards: [Sprite, Lib.Card][] = [];
    const reservedSpritesAndCards: [Sprite, Lib.Card][] = [];

    let splitIndex: number;
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

    // find the held sprites, if any, overlapped by the dragged sprites
    const leftMovingSprite = movingSpritesAndCards[0]?.[0];
    const rightMovingSprite = movingSpritesAndCards[movingSpritesAndCards.length - 1]?.[0];
    if (leftMovingSprite === undefined || rightMovingSprite === undefined) {
        throw new Error();
    }

    const deckDistance = Math.abs(leftMovingSprite.target.y - (State.deckSprites[0]?.position.y ?? Infinity));
    const reorderDistance = Math.abs(leftMovingSprite.target.y - (VP.canvas.height - 2 * VP.spriteHeight));
    if (deckDistance < reorderDistance) {
        action = "ReturnToDeck";
    } else {
        action = "Reorder";
    }

    // determine whether the moving sprites are closer to the revealed sprites or to the hidden sprites
    const splitRevealed = reorderDistance < Math.abs(leftMovingSprite.target.y - (VP.canvas.height - VP.spriteHeight));
    const start = splitRevealed ? 0 : gameState.playerRevealCount;
    const end = splitRevealed ? gameState.playerRevealCount : reservedSpritesAndCards.length;

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
    } else {
        // no overlapped sprites, so the index is the first reserved sprite to the right of the moving sprites
        for (splitIndex = start; splitIndex < end; ++splitIndex) {
            const reservedSprite = reservedSpritesAndCards[splitIndex]?.[0];
            if (reservedSprite === undefined) throw new Error();
            if (rightMovingSprite.target.x < reservedSprite.target.x) {
                break;
            }
        }
    }

    // adjust selected indices
    for (let i = 0; i < State.selectedIndices.length; ++i) {
        State.selectedIndices[i] = splitIndex + i;
    }

    // adjust the reveal count
    if (splitIndex < gameState.playerRevealCount ||
        splitIndex === gameState.playerRevealCount && splitRevealed
    ) {
        gameState.playerRevealCount += movingSpritesAndCards.length;
    }

    setSpriteTargets(sprites, cards, reservedSpritesAndCards, movingSpritesAndCards, splitIndex, gameState.playerRevealCount);
}

export function setSpriteTargets(
    sprites: Sprite[],
    cards: Lib.Card[],
    reservedSpritesAndCards: [Sprite, Lib.Card][],
    movingSpritesAndCards: [Sprite, Lib.Card][],
    splitIndex: number,
    revealCount: number
) {
    // clear for reinsertion
    sprites.splice(0, sprites.length);
    cards.splice(0, cards.length);

    for (const [reservedSprite, reservedCard] of reservedSpritesAndCards) {
        if (cards.length === splitIndex) {
            for (const [movingSprite, movingCard] of movingSpritesAndCards) {
                sprites.push(movingSprite);
                cards.push(movingCard);
            }
        }

        const i = cards.length < revealCount ? cards.length : cards.length - revealCount;
        const j = cards.length < revealCount ? revealCount : reservedSpritesAndCards.length - revealCount;
        const y = cards.length < revealCount ? 2 * VP.spriteHeight : VP.spriteHeight;
        reservedSprite.target = new Vector(
            VP.canvas.width / 2 - VP.spriteWidth / 2 + (i - j / 2) * VP.spriteGap,
            VP.canvas.height - y
        );

        sprites.push(reservedSprite);
        cards.push(reservedCard);
    }

    if (cards.length === splitIndex) {
        for (const [movingSprite, movingCard] of movingSpritesAndCards) {
            sprites.push(movingSprite);
            cards.push(movingCard);
        }
    }
}