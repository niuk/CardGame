import * as Render from './render';
import * as State from './state';
import * as Lib from '../lib';
import Vector from './vector';

const canvas = <HTMLCanvasElement>document.getElementById('canvas');

const moveThreshold = 0.2 * Render.pixelsPerCM;

// used by both rendering and input
export let onDeckAtMouseDown = false;
export let cardIndexAtMouseDown = -1;
let mouseDownPosition = <Vector>{ x: 0, y: 0 };
let mouseMovePosition = <Vector>{ x: 0, y: 0 };
let exceededMoveTreshold = false;

export enum Action {
    None,
    Draw,
    Return,
    DeselectHidden,
    DeselectRevealed,
    SelectHidden,
    SelectRevealed,
    Toggle
}

export let action = Action.None;

function getDropAction(gameState: Lib.GameState): Action {
    const dropPosition = (State.faceSpritesForPlayer[gameState.playerIndex] ?? [])[State.selectedIndices[0] ?? 0]?.position;
    if (dropPosition === undefined) throw new Error();
    
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

    const deselectHiddenDistance   = Math.abs(dropPosition.y - (canvas.height -     Render.spriteHeight));
    const deselectRevealedDistance = Math.abs(dropPosition.y - (canvas.height - 2 * Render.spriteHeight));
    const selectHiddenDistance     = Math.abs(dropPosition.y - (canvas.height -     Render.spriteHeight - 2 * Render.spriteGap));
    const selectRevealedDistance   = Math.abs(dropPosition.y - (canvas.height - 2 * Render.spriteHeight - 2 * Render.spriteGap));
    const deselectDistance = Math.min(deselectHiddenDistance, deselectRevealedDistance);
    const selectDistance = Math.min(selectHiddenDistance, selectRevealedDistance);
    if (deselectDistance < selectDistance) {
        if (deselectHiddenDistance < deselectRevealedDistance) {
            return Action.DeselectHidden;
        } else {
            return Action.DeselectRevealed;
        }
    } else {
        if (selectHiddenDistance < selectRevealedDistance) {
            return Action.SelectHidden;
        } else {
            return Action.SelectRevealed;
        }
    }
}

function getMousePosition(e: MouseEvent) {
    return new Vector(
        canvas.width * (e.clientX - Render.canvasRect.left) / Render.canvasRect.width,
        canvas.height * (e.clientY - Render.canvasRect.top) / Render.canvasRect.height
    );
}

canvas.onmousedown = async (event: MouseEvent) => {
    try {
        mouseDownPosition = getMousePosition(event);

        exceededMoveTreshold = false;
        action = Action.None;

        cardIndexAtMouseDown = -1;

        if (State.gameState === undefined) throw new Error();

        const deckTopPosition = State.deckSprites[State.deckSprites.length - 1]?.position;
        onDeckAtMouseDown = deckTopPosition !== undefined &&
            deckTopPosition.x < mouseDownPosition.x && mouseDownPosition.x < deckTopPosition.x + Render.spriteWidth &&
            deckTopPosition.y < mouseDownPosition.y && mouseDownPosition.y < deckTopPosition.y + Render.spriteHeight;

        // because we render left to right, the rightmost card under the mouse position is what we should return
        const faceSprites = State.faceSpritesForPlayer[State.gameState.playerIndex] ?? [];
        for (let i = faceSprites.length - 1; i >= 0; --i) {
            const position = faceSprites[i]?.position;
            if (position !== undefined &&
                position.x < mouseDownPosition.x && mouseDownPosition.x < position.x + Render.spriteWidth &&
                position.y < mouseDownPosition.y && mouseDownPosition.y < position.y + Render.spriteHeight
            ) {
                cardIndexAtMouseDown = i;
                action = Action.Toggle;
                break;
            }
        }
    } catch (error) {
        console.error(error);
    }
};

canvas.onmousemove = async (event: MouseEvent) => {
    try {
        mouseMovePosition = getMousePosition(event);

        let movement = new Vector(event.movementX, event.movementY);
        exceededMoveTreshold = exceededMoveTreshold || mouseMovePosition.distance(mouseDownPosition) > moveThreshold;

        if (State.gameState === undefined) throw new Error();

        const faceSprites = State.faceSpritesForPlayer[State.gameState.playerIndex] ?? [];

        if (action === Action.Toggle && exceededMoveTreshold) {
            // dragging a card selects it
            let selectedIndexIndex = Lib.binarySearch(State.selectedIndices, cardIndexAtMouseDown);
            if (selectedIndexIndex < 0) {
                selectedIndexIndex = ~selectedIndexIndex;
                State.selectedIndices.splice(selectedIndexIndex, 0, cardIndexAtMouseDown);
            }

            // start of movement
            action = getDropAction(State.gameState);

            // movement threshold needs to be accounted for
            movement = movement.add(mouseMovePosition.sub(mouseDownPosition));

            // gather together selected cards around the card under the mouse
            const faceSpriteAtMouseDown = faceSprites[cardIndexAtMouseDown];
            if (faceSpriteAtMouseDown === undefined) throw new Error();
            for (let i = 0; i < State.selectedIndices.length; ++i) {
                const faceSprite = faceSprites[i];
                if (faceSprite === undefined) throw new Error();
                faceSprite.target = new Vector(
                    faceSpriteAtMouseDown.position.x + (i - selectedIndexIndex) * Render.spriteGap,
                    faceSpriteAtMouseDown.position.y
                );
            }
        }
        
        if (action === Action.Return ||
            action === Action.DeselectHidden   || action === Action.SelectHidden ||
            action === Action.DeselectRevealed || action === Action.SelectRevealed
        ) {
            action = getDropAction(State.gameState);

            // move all selected cards
            for (let i = 0; i < State.selectedIndices.length; ++i) {
                const faceSprite = faceSprites[i];
                if (faceSprite === undefined) throw new Error();
                faceSprite.target = faceSprite.target.add(movement);
            }
        }
        
        if (onDeckAtMouseDown) {
            const deckSprite = State.deckSprites[State.deckSprites.length - 1];
            if (deckSprite === undefined) throw new Error();

            if (action === Action.None && exceededMoveTreshold) {
                action = Action.Draw;

                const result = await State.drawCard();
                if ('errorDescription' in result) {
                    console.error(result.errorDescription);
                } else {
                    // mouse button is still down; transition to select/deselect state
                    onDeckAtMouseDown = false;
                    cardIndexAtMouseDown = result.playerCards.length - 1;
                    State.selectedIndices.splice(0, State.selectedIndices.length, cardIndexAtMouseDown);

                    const faceSpriteAtMouseDown = faceSprites[cardIndexAtMouseDown];
                    if (faceSpriteAtMouseDown === undefined) throw new Error();
                    faceSpriteAtMouseDown.target = deckSprite.position.add(mouseMovePosition.sub(mouseDownPosition));
                    faceSpriteAtMouseDown.position = deckSprite.position;
                    faceSpriteAtMouseDown.velocity = deckSprite.velocity;
        
                    action = getDropAction(result);
                }
            }
            
            deckSprite.target = deckSprite.target.add(movement);
        }
    } catch (error) {
        console.error(error);
    }
};

canvas.onmouseup = async () => {
    try {
        if (action === Action.Toggle) {
            if (cardIndexAtMouseDown < 0) {
                throw new Error();
            }

            let selectedIndexIndex = Lib.binarySearch(State.selectedIndices, cardIndexAtMouseDown);
            if (selectedIndexIndex < 0) {
                State.selectedIndices.splice(~selectedIndexIndex, 0, cardIndexAtMouseDown);
            } else {
                State.selectedIndices.splice(selectedIndexIndex, 1);
            }
        }
        
        if (State.gameState === undefined) throw new Error();

        if (action === Action.Return) {
            const result = await State.returnCards(State.gameState);
            if ('errorDescription' in result) {
                console.error(result.errorDescription);
            } else {
                // make the selected cards disappear
                State.selectedIndices.splice(0, State.selectedIndices.length);
            }
        }

        if (action === Action.DeselectHidden || action === Action.DeselectRevealed) {
            State.selectedIndices.splice(0, State.selectedIndices.length);

            const result = await State.reorderCards(State.gameState);
            if ('errorDescription' in result) {
                console.error(result.errorDescription);
            }
        }
        
        if (action === Action.SelectHidden || action === Action.SelectRevealed) {
            let selectedIndexIndex = Lib.binarySearch(State.selectedIndices, cardIndexAtMouseDown);
            if (selectedIndexIndex < 0) {
                selectedIndexIndex = ~selectedIndexIndex;
                State.selectedIndices.splice(selectedIndexIndex, 0, cardIndexAtMouseDown);
            }

            const result = await State.reorderCards(State.gameState);
            if ('errorDescription' in result) {
                console.error(result.errorDescription);
            }
        }
        
        if (Render.sortBySuitBounds[0].x < mouseDownPosition.x && mouseDownPosition.x < Render.sortBySuitBounds[1].x &&
            Render.sortBySuitBounds[0].y < mouseDownPosition.y && mouseDownPosition.y < Render.sortBySuitBounds[1].y
        ) {
            const result = await State.sortBySuit(State.gameState);
            if ('errorDescription' in result) {
                console.error(result.errorDescription);
            }
        }
        
        if (Render.sortByRankBounds[0].x < mouseDownPosition.x && mouseDownPosition.x < Render.sortByRankBounds[1].x &&
            Render.sortByRankBounds[0].y < mouseDownPosition.y && mouseDownPosition.y < Render.sortByRankBounds[1].y
        ) {
            const result = await State.sortByRank(State.gameState);
            if ('errorDescription' in result) {
                console.error(result.errorDescription);
            }
        }

        onDeckAtMouseDown = false;
        cardIndexAtMouseDown = -1;
        action = Action.None;
    } catch (error) {
        console.error(error);
    }
};