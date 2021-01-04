import * as Render from './render';
import * as State from './state';
import * as Lib from './lib';
import Vector from './vector';

const canvas = <HTMLCanvasElement>document.getElementById('canvas');

const moveThreshold = 0.2 * Render.pixelsPerCM;

// used by both rendering and input
export let onDeckAtMouseDown = false;
export let cardIndexAtMouseDown = -1;
let mouseDownPosition = <Vector>{ x: 0, y: 0 };
let mouseMovePosition = <Vector>{ x: 0, y: 0 };
let exceededMoveTreshold = false;

enum Action {
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
    if (State.animations === undefined) {
        throw new Error();
    }

    const dropPosition = State.animations[gameState.playerIndex][State.selectedIndices[0]].position;

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

    const deselectHiddenDistance   = Math.abs(dropPosition.y - (canvas.height -     Render.cardHeight));
    const deselectRevealedDistance = Math.abs(dropPosition.y - (canvas.height - 2 * Render.cardHeight));
    const selectHiddenDistance     = Math.abs(dropPosition.y - (canvas.height -     Render.cardHeight - 2 * Render.cardGap));
    const selectRevealedDistance   = Math.abs(dropPosition.y - (canvas.height - 2 * Render.cardHeight - 2 * Render.cardGap));
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

export function onMouseDown(e: MouseEvent) {
    mouseDownPosition = getMousePosition(e);

    exceededMoveTreshold = false;
    action = Action.None;

    cardIndexAtMouseDown = -1;

    if (State.gameState === undefined || State.animations === undefined) {
        throw new Error();
    }
    
    const deckTopPosition = Render.deck[Render.deck.length - 1].position;
    onDeckAtMouseDown = 
        deckTopPosition.x < mouseDownPosition.x && mouseDownPosition.x < deckTopPosition.x + Render.cardWidth &&
        deckTopPosition.y < mouseDownPosition.y && mouseDownPosition.y < deckTopPosition.y + Render.cardHeight;

    // because we render left to right, the rightmost card under the mouse position is what we should return
    const animations = State.animations[State.gameState.playerIndex];
    for (let i = animations.length - 1; i >= 0; --i) {
        const position = animations[i].position;
        if (position.x < mouseDownPosition.x && mouseDownPosition.x < position.x + Render.cardWidth &&
            position.y < mouseDownPosition.y && mouseDownPosition.y < position.y + Render.cardHeight
        ) {
            cardIndexAtMouseDown = i;
            action = Action.Toggle;
            break;
        }
    }
}

export async function onMouseMove(e: MouseEvent) {
    mouseMovePosition = getMousePosition(e);

    let movement = new Vector(e.movementX, e.movementY);
    exceededMoveTreshold = exceededMoveTreshold || mouseMovePosition.distance(mouseDownPosition) > moveThreshold;

    if (State.gameState === undefined || State.animations === undefined) {
        throw new Error();
    }

    const animations = State.animations[State.gameState.playerIndex];

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
        for (let i = 0; i < State.selectedIndices.length; ++i) {
            animations[i].target = new Vector(
                animations[cardIndexAtMouseDown].position.x + (i - selectedIndexIndex) * Render.cardGap,
                animations[cardIndexAtMouseDown].position.y
            ).add(movement);
        }
    }
    
    if (action === Action.Return ||
        action === Action.DeselectHidden   || action === Action.SelectHidden ||
        action === Action.DeselectRevealed || action === Action.SelectRevealed
    ) {
        action = getDropAction(State.gameState);

        // move all selected cards
        for (let i = 0; i < State.selectedIndices.length; ++i) {
            animations[i].target = animations[i].target.add(movement);
        }
    }
    
    if (onDeckAtMouseDown) {
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
                animations[cardIndexAtMouseDown].target =
                    Render.deck[Render.deck.length - 1].position.add(mouseMovePosition.sub(mouseDownPosition));
                animations[cardIndexAtMouseDown].position = Render.deck[Render.deck.length - 1].position;
                animations[cardIndexAtMouseDown].velocity = Render.deck[Render.deck.length - 1].velocity;
    
                action = getDropAction(result);
            }
        }

        // move the deck's top card
        Render.deck[Render.deck.length - 1].target = Render.deck[Render.deck.length - 1].target.add(movement);
    }
}

export async function onMouseUp(e: MouseEvent) {
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
    
    if (State.gameState === undefined) {
        throw new Error();
    }

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
}