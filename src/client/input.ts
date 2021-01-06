import * as Lib from '../lib';
import * as State from './state';
import * as VP from './view-params';
import Vector from './vector';

interface ReturnToDeck {
    type: "returnToDeck";
    cardIndex: number;
}

interface Hide {
    type: "hide";
    cardIndex: number;
}

interface Reveal {
    type: "reveal";
    cardIndex: number;
}

interface Toggle {
    type: "toggle";
    cardIndex: number;
}

export type Action =
    "none" |
    "drawFromDeck" |
    "waitingForNewCard" |
    "sortBySuit" |
    "sortByRank" |
    ReturnToDeck |
    Hide |
    Reveal |
    Toggle;

export let action: Action = "none";

const moveThreshold = 0.5 * VP.pixelsPerCM;
let mouseDownPosition = <Vector>{ x: 0, y: 0 };
let mouseMovePosition = <Vector>{ x: 0, y: 0 };
let exceededMoveThreshold = false;

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
        action = { type: "hide", cardIndex };
    } else {
        action = { type: "reveal", cardIndex };
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
            action = "sortByRank";
        } else if (
            VP.sortBySuitBounds[0].x < mouseDownPosition.x && mouseDownPosition.x < VP.sortBySuitBounds[1].x &&
            VP.sortBySuitBounds[0].y < mouseDownPosition.y && mouseDownPosition.y < VP.sortBySuitBounds[1].y
        ) {
            action = "sortBySuit";
        } else if (deckPosition !== undefined &&
            deckPosition.x < mouseDownPosition.x && mouseDownPosition.x < deckPosition.x + VP.spriteWidth &&
            deckPosition.y < mouseDownPosition.y && mouseDownPosition.y < deckPosition.y + VP.spriteHeight
        ) {
            action = "drawFromDeck";
        } else {
            // because we render left to right, the rightmost card under the mouse position is what we should return
            for (let i = faceSprites.length - 1; i >= 0; --i) {
                const position = faceSprites[i]?.position;
                if (position !== undefined &&
                    position.x < mouseDownPosition.x && mouseDownPosition.x < position.x + VP.spriteWidth &&
                    position.y < mouseDownPosition.y && mouseDownPosition.y < position.y + VP.spriteHeight
                ) {
                    action = { type: "toggle", cardIndex: i };
                    break;
                }
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

        if (action === "none") {
            // do nothing
        } else if (action === "drawFromDeck" || action === "waitingForNewCard") {
            const deckSprite = State.deckSprites[State.deckSprites.length - 1];
            if (deckSprite === undefined) throw new Error();
            deckSprite.target = deckSprite.target.add(movement);

            if (action === "drawFromDeck" && exceededMoveThreshold) {
                action = "waitingForNewCard";

                // card drawing will try to lock the state, so we must attach a callback instead of awaiting
                State.drawCard().then(async result => {
                    if (result.errorDescription !== undefined) {
                        console.error(result.errorDescription);
                        if (action === "waitingForNewCard") {
                            action = "none";
                        }
                    } else {
                        const release = await State.lock();
                        try {
                            if (action === "waitingForNewCard") {
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
        } else if (action === "sortBySuit") {
            // TODO: check whether mouse position has left button bounds
        } else if (action === "sortByRank") {
            // TODO: check whether mouse position has left button bounds
        } else if (action.type === "toggle") {
            if (exceededMoveThreshold) {
                // dragging a card selects it
                let selectedIndexIndex = Lib.binarySearchNumber(State.selectedIndices, action.cardIndex);
                if (selectedIndexIndex < 0) {
                    selectedIndexIndex = ~selectedIndexIndex;
                    State.selectedIndices.splice(selectedIndexIndex, 0, action.cardIndex);
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
                        event.movementX + faceSpriteAtMouseDown.position.x + (i++ - selectedIndexIndex) * VP.spriteGap,
                        event.movementY + faceSpriteAtMouseDown.position.y
                    ).add(mouseMovePosition.sub(mouseDownPosition));
                }

                setDropAction(State.gameState, action.cardIndex);
            }
        } else if (action.type === "hide" || action.type === "reveal" || action.type === "returnToDeck") {
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

        if (action === "none" || action === "drawFromDeck" || action === "waitingForNewCard") {
            // do nothing
        } else if (action === "sortByRank") {
            const result = await State.sortByRank(State.gameState);
            if ('errorDescription' in result) {
                console.error(result.errorDescription);
            }
        } else if (action === "sortBySuit") {
            const result = await State.sortBySuit(State.gameState);
            if ('errorDescription' in result) {
                console.error(result.errorDescription);
            }
        } else if (action.type === "hide" || action.type === "reveal") {
            const result = await State.reorderCards(State.gameState);
            if ('errorDescription' in result) {
                console.error(result.errorDescription);
            }
        } else if (action.type === "toggle") {
            let selectedIndexIndex = Lib.binarySearchNumber(State.selectedIndices, action.cardIndex);
            if (selectedIndexIndex < 0) {
                State.selectedIndices.splice(~selectedIndexIndex, 0, action.cardIndex);
            } else {
                State.selectedIndices.splice(selectedIndexIndex, 1);
            }
        } else if (action.type === "returnToDeck") {
            const result = await State.returnCardsToDeck(State.gameState);
            if ('errorDescription' in result) {
                console.error(result.errorDescription);
            } else {
                // make the selected cards disappear
                State.selectedIndices.splice(0, State.selectedIndices.length);
            }
        }

        action = "none";
    } finally {
        unlock();
    }
};
