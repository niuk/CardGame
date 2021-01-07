import * as Lib from '../lib';
import * as State from './state';
import * as VP from './view-params';
import Vector from './vector';

let rangeStart = -1;

interface Select {
    type: "Select";
    cardIndex: number;
}

interface Toggle {
    type: "Toggle";
    cardIndex: number;
}

interface SelectRange {
    type: "SelectRange";
    cardIndex: number;
}

interface ExpandRange {
    type: "ExpandRange";
    cardIndex: number;
}

interface Hide {
    type: "Hide";
    cardIndex: number;
}

interface Reveal {
    type: "Reveal";
    cardIndex: number;
}

interface ReturnToDeck {
    type: "ReturnToDeck";
    cardIndex: number;
}

export type Action =
    "None" |
    "DrawFromDeck" |
    "WaitingForNewCard" |
    "SortBySuit" |
    "SortByRank" |
    "Deselect" |
    Select |
    SelectRange |
    ExpandRange |
    Toggle |
    Hide |
    Reveal |
    ReturnToDeck;

export let action: Action = "None";

const moveThreshold = 0.5 * VP.pixelsPerCM;
let mouseDownPosition = <Vector>{ x: 0, y: 0 };
let mouseMovePosition = <Vector>{ x: 0, y: 0 };
let exceededMoveThreshold = false;

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

function setDropAction(gameState: Lib.GameState, cardIndex: number) {
    const dropPosition = (State.faceSpritesForPlayer[gameState.playerIndex] ?? [])[State.selectedIndices[0] ?? 0]?.position;
    if (dropPosition === undefined) throw new Error(`${JSON.stringify(State.faceSpritesForPlayer)}`);
    
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

    const hideDistance   = Math.abs(dropPosition.y - (VP.canvas.height -     VP.spriteHeight));
    const revealDistance = Math.abs(dropPosition.y - (VP.canvas.height - 2 * VP.spriteHeight));
    if (hideDistance < revealDistance) {
        action = { type: "Hide", cardIndex };
    } else {
        action = { type: "Reveal", cardIndex };
    }
}

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
        exceededMoveThreshold = false;

        if (State.gameState === undefined) throw new Error();

        const deckPosition = State.deckSprites[State.deckSprites.length - 1]?.position;
        const faceSprites = State.faceSpritesForPlayer[State.gameState.playerIndex] ?? [];

        if (
            VP.sortByRankBounds[0].x < mouseDownPosition.x && mouseDownPosition.x < VP.sortByRankBounds[1].x &&
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
            let hit = false;
            for (let i = faceSprites.length - 1; i >= 0; --i) {
                const position = faceSprites[i]?.position;
                if (position !== undefined &&
                    position.x < mouseDownPosition.x && mouseDownPosition.x < position.x + VP.spriteWidth &&
                    position.y < mouseDownPosition.y && mouseDownPosition.y < position.y + VP.spriteHeight
                ) {
                    // found the card; check modifiers for selection
                    if (holdingShift && holdingControl) {
                        action = { type: "ExpandRange", cardIndex: i };
                    } else if (holdingShift) {
                        action = { type: "SelectRange", cardIndex: i };
                    } else if (holdingControl) {
                        action = { type: "Toggle", cardIndex: i };
                    } else {
                        action = { type: "Select", cardIndex: i };
                    }

                    hit = true;
                    break;
                }
            }

            if (!hit) {
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
        exceededMoveThreshold = exceededMoveThreshold || mouseMovePosition.distance(mouseDownPosition) > moveThreshold;

        let movement = new Vector(event.movementX, event.movementY);

        if (State.gameState === undefined) return;

        const faceSprites = State.faceSpritesForPlayer[State.gameState.playerIndex] ?? [];

        if (action === "None") {
            // do nothing
        } else if (action === "DrawFromDeck" || action === "WaitingForNewCard") {
            const deckSprite = State.deckSprites[State.deckSprites.length - 1];
            if (deckSprite === undefined) throw new Error();
            deckSprite.target = deckSprite.target.add(movement);

            if (action === "DrawFromDeck" && exceededMoveThreshold) {
                action = "WaitingForNewCard";

                // card drawing will try to lock the state, so we must attach a callback instead of awaiting
                State.drawCard().then(async result => {
                    if (result.errorDescription !== undefined) {
                        console.error(result.errorDescription);
                        if (action === "WaitingForNewCard") {
                            action = "None";
                        }
                    } else {
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
                                setDropAction(State.gameState, cardIndex);
                            }
                        } finally {
                            release();
                        }
                    }
                });
            }
        } else if (action === "SortBySuit") {
            // TODO: check whether mouse position has left button bounds
        } else if (action === "SortByRank") {
            // TODO: check whether mouse position has left button bounds
        } else if (action === "Deselect") {
            // TODO: box selection?
        } else if (action.type === "Select" || action.type === "Toggle" || action.type === "SelectRange" || action.type === "ExpandRange") {
            if (exceededMoveThreshold) {
                // moving a selected card moves the entire selection
                // moving a non-selected card selects it and only it
                let cardIndexIndex = Lib.binarySearchNumber(State.selectedIndices, action.cardIndex);
                if (cardIndexIndex < 0) {
                    cardIndexIndex = 0;
                    State.selectedIndices.splice(0, State.selectedIndices.length, action.cardIndex);
                }

                // gather together selected cards around the card under the mouse
                const faceSpriteAtMouseDown = faceSprites[action.cardIndex];
                if (faceSpriteAtMouseDown === undefined) throw new Error();

                let i = 0;
                for (const selectedIndex of State.selectedIndices) {
                    const faceSprite = faceSprites[selectedIndex];
                    if (faceSprite === undefined) throw new Error();

                    // account for movement threshold
                    faceSprite.target = new Vector(
                        event.movementX + faceSpriteAtMouseDown.position.x + (i++ - cardIndexIndex) * VP.spriteGap,
                        event.movementY + faceSpriteAtMouseDown.position.y
                    ).add(mouseMovePosition.sub(mouseDownPosition));
                }

                setDropAction(State.gameState, action.cardIndex);
            }
        } else if (action.type === "Hide" || action.type === "Reveal" || action.type === "ReturnToDeck") {
            // move all selected cards
            for (const i of State.selectedIndices) {
                const faceSprite = faceSprites[i];
                if (faceSprite === undefined) throw new Error();
                faceSprite.target = faceSprite.target.add(new Vector(event.movementX, event.movementY));
            }

            setDropAction(State.gameState, action.cardIndex);
        }
    } finally {
        unlock();
    }
};

VP.canvas.onmouseup = async () => {
    const unlock = await State.lock();
    try {
        if (State.gameState === undefined) throw new Error();

        if (action === "None" || action === "DrawFromDeck" || action === "WaitingForNewCard") {
            // didn't click on a card; deselect everything
            State.selectedIndices.splice(0, State.selectedIndices.length);
        } else if (action === "SortByRank") {
            const result = await State.sortByRank(State.gameState);
            if ('errorDescription' in result) {
                console.error(result.errorDescription);
            }
        } else if (action === "SortBySuit") {
            const result = await State.sortBySuit(State.gameState);
            if ('errorDescription' in result) {
                console.error(result.errorDescription);
            }
        } else if (action === "Deselect") {
            State.selectedIndices.splice(0, State.selectedIndices.length);
        } else if (action.type === "Select") {
            rangeStart = action.cardIndex;
            State.selectedIndices.splice(0, State.selectedIndices.length, action.cardIndex);
        } else if (action.type === "Toggle") {
            rangeStart = action.cardIndex;
            let cardIndexIndex = Lib.binarySearchNumber(State.selectedIndices, action.cardIndex);
            if (cardIndexIndex < 0) {
                State.selectedIndices.splice(~cardIndexIndex, 0, action.cardIndex);
            } else {
                State.selectedIndices.splice(cardIndexIndex, 1);
            }
        } else if (action.type === "SelectRange") {
            if (rangeStart === -1) {
                rangeStart = action.cardIndex;
            }

            const start = Math.min(action.cardIndex, rangeStart);
            const end = Math.max(action.cardIndex, rangeStart);
            State.selectedIndices.splice(0, State.selectedIndices.length);
            for (let i = start; i <= end; ++i) {
                State.selectedIndices.push(i);
            }
        } else if (action.type === "ExpandRange") {
            const start = Math.min(action.cardIndex, ...State.selectedIndices);
            const end = Math.max(action.cardIndex, ...State.selectedIndices);
            State.selectedIndices.splice(0, State.selectedIndices.length);
            for (let i = start; i <= end; ++i) {
                State.selectedIndices.push(i);
            }
        } else if (action.type === "Hide" || action.type === "Reveal") {
            const result = await State.reorderCards(State.gameState);
            if ('errorDescription' in result) {
                console.error(result.errorDescription);
            }
        } else if (action.type === "ReturnToDeck") {
            const result = await State.returnCardsToDeck(State.gameState);
            if ('errorDescription' in result) {
                console.error(result.errorDescription);
            } else {
                // make the selected cards disappear
                State.selectedIndices.splice(0, State.selectedIndices.length);
            }
        }

        action = "None";
    } finally {
        unlock();
    }
};