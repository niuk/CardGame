var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
define(["require", "exports", "../binary-search", "./state", "./view-params", "./vector"], function (require, exports, BS, State, VP, vector_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.action = exports.Action = exports.cardIndexAtMouseDown = exports.onDeckAtMouseDown = void 0;
    BS = __importStar(BS);
    State = __importStar(State);
    VP = __importStar(VP);
    vector_1 = __importDefault(vector_1);
    const moveThreshold = 0.2 * VP.pixelsPerCM;
    // used by both rendering and input
    exports.onDeckAtMouseDown = false;
    exports.cardIndexAtMouseDown = -1;
    let mouseDownPosition = { x: 0, y: 0 };
    let mouseMovePosition = { x: 0, y: 0 };
    let exceededMoveTreshold = false;
    var Action;
    (function (Action) {
        Action[Action["None"] = 0] = "None";
        Action[Action["Draw"] = 1] = "Draw";
        Action[Action["Return"] = 2] = "Return";
        Action[Action["DeselectHidden"] = 3] = "DeselectHidden";
        Action[Action["DeselectRevealed"] = 4] = "DeselectRevealed";
        Action[Action["SelectHidden"] = 5] = "SelectHidden";
        Action[Action["SelectRevealed"] = 6] = "SelectRevealed";
        Action[Action["Toggle"] = 7] = "Toggle";
    })(Action = exports.Action || (exports.Action = {}));
    exports.action = Action.None;
    function getDropAction(gameState) {
        const dropPosition = (State.faceSpritesForPlayer[gameState.playerIndex] ?? [])[State.selectedIndices[0] ?? 0]?.position;
        if (dropPosition === undefined)
            throw new Error();
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
        const deselectHiddenDistance = Math.abs(dropPosition.y - (VP.canvas.height - VP.spriteHeight));
        const deselectRevealedDistance = Math.abs(dropPosition.y - (VP.canvas.height - 2 * VP.spriteHeight));
        const selectHiddenDistance = Math.abs(dropPosition.y - (VP.canvas.height - VP.spriteHeight - 2 * VP.spriteGap));
        const selectRevealedDistance = Math.abs(dropPosition.y - (VP.canvas.height - 2 * VP.spriteHeight - 2 * VP.spriteGap));
        const deselectDistance = Math.min(deselectHiddenDistance, deselectRevealedDistance);
        const selectDistance = Math.min(selectHiddenDistance, selectRevealedDistance);
        if (deselectDistance < selectDistance) {
            if (deselectHiddenDistance < deselectRevealedDistance) {
                return Action.DeselectHidden;
            }
            else {
                return Action.DeselectRevealed;
            }
        }
        else {
            if (selectHiddenDistance < selectRevealedDistance) {
                return Action.SelectHidden;
            }
            else {
                return Action.SelectRevealed;
            }
        }
    }
    function getMousePosition(e) {
        return new vector_1.default(VP.canvas.width * (e.clientX - VP.canvasRect.left) / VP.canvasRect.width, VP.canvas.height * (e.clientY - VP.canvasRect.top) / VP.canvasRect.height);
    }
    VP.canvas.onmousedown = async (event) => {
        try {
            mouseDownPosition = getMousePosition(event);
            exceededMoveTreshold = false;
            exports.action = Action.None;
            exports.cardIndexAtMouseDown = -1;
            if (State.gameState === undefined)
                throw new Error();
            const deckPosition = State.deckSprites[State.deckSprites.length - 1]?.position;
            exports.onDeckAtMouseDown = deckPosition !== undefined &&
                deckPosition.x < mouseDownPosition.x && mouseDownPosition.x < deckPosition.x + VP.spriteWidth &&
                deckPosition.y < mouseDownPosition.y && mouseDownPosition.y < deckPosition.y + VP.spriteHeight;
            // because we render left to right, the rightmost card under the mouse position is what we should return
            const faceSprites = State.faceSpritesForPlayer[State.gameState.playerIndex] ?? [];
            for (let i = faceSprites.length - 1; i >= 0; --i) {
                const position = faceSprites[i]?.position;
                if (position !== undefined &&
                    position.x < mouseDownPosition.x && mouseDownPosition.x < position.x + VP.spriteWidth &&
                    position.y < mouseDownPosition.y && mouseDownPosition.y < position.y + VP.spriteHeight) {
                    exports.cardIndexAtMouseDown = i;
                    exports.action = Action.Toggle;
                    break;
                }
            }
        }
        catch (error) {
            console.error(error);
        }
    };
    VP.canvas.onmousemove = async (event) => {
        try {
            mouseMovePosition = await getMousePosition(event);
            let movement = new vector_1.default(event.movementX, event.movementY);
            exceededMoveTreshold = exceededMoveTreshold || mouseMovePosition.distance(mouseDownPosition) > moveThreshold;
            if (State.gameState === undefined)
                throw new Error();
            const faceSprites = State.faceSpritesForPlayer[State.gameState.playerIndex] ?? [];
            if (exports.action === Action.Toggle && exceededMoveTreshold) {
                // dragging a card selects it
                let selectedIndexIndex = BS.binarySearchNumber(State.selectedIndices, exports.cardIndexAtMouseDown);
                if (selectedIndexIndex < 0) {
                    selectedIndexIndex = ~selectedIndexIndex;
                    State.selectedIndices.splice(selectedIndexIndex, 0, exports.cardIndexAtMouseDown);
                }
                // start of movement
                exports.action = getDropAction(State.gameState);
                // movement threshold needs to be accounted for
                movement = movement.add(mouseMovePosition.sub(mouseDownPosition));
                // gather together selected cards around the card under the mouse
                const faceSpriteAtMouseDown = faceSprites[exports.cardIndexAtMouseDown];
                if (faceSpriteAtMouseDown === undefined)
                    throw new Error();
                for (let i = 0; i < State.selectedIndices.length; ++i) {
                    const faceSprite = faceSprites[i];
                    if (faceSprite === undefined)
                        throw new Error();
                    faceSprite.target = new vector_1.default(faceSpriteAtMouseDown.position.x + (i - selectedIndexIndex) * VP.spriteGap, faceSpriteAtMouseDown.position.y);
                }
            }
            if (exports.action === Action.Return ||
                exports.action === Action.DeselectHidden || exports.action === Action.SelectHidden ||
                exports.action === Action.DeselectRevealed || exports.action === Action.SelectRevealed) {
                exports.action = getDropAction(State.gameState);
                // move all selected cards
                for (let i = 0; i < State.selectedIndices.length; ++i) {
                    const faceSprite = faceSprites[i];
                    if (faceSprite === undefined)
                        throw new Error();
                    faceSprite.target = faceSprite.target.add(movement);
                }
            }
            if (exports.onDeckAtMouseDown) {
                const deckSprite = State.deckSprites[State.deckSprites.length - 1];
                if (deckSprite === undefined)
                    throw new Error();
                if (exports.action === Action.None && exceededMoveTreshold) {
                    exports.action = Action.Draw;
                    const result = await State.drawCard();
                    if ('errorDescription' in result) {
                        console.error(result.errorDescription);
                    }
                    else {
                        // mouse button is still down; transition to select/deselect state
                        exports.onDeckAtMouseDown = false;
                        exports.cardIndexAtMouseDown = result.playerCards.length - 1;
                        State.selectedIndices.splice(0, State.selectedIndices.length, exports.cardIndexAtMouseDown);
                        const faceSpriteAtMouseDown = faceSprites[exports.cardIndexAtMouseDown];
                        if (faceSpriteAtMouseDown === undefined)
                            throw new Error();
                        faceSpriteAtMouseDown.target = deckSprite.position.add(mouseMovePosition.sub(mouseDownPosition));
                        faceSpriteAtMouseDown.position = deckSprite.position;
                        faceSpriteAtMouseDown.velocity = deckSprite.velocity;
                        exports.action = getDropAction(result);
                    }
                }
                deckSprite.target = deckSprite.target.add(movement);
            }
        }
        catch (error) {
            console.error(error);
        }
    };
    VP.canvas.onmouseup = async () => {
        try {
            if (exports.action === Action.Toggle) {
                if (exports.cardIndexAtMouseDown < 0) {
                    throw new Error();
                }
                let selectedIndexIndex = BS.binarySearchNumber(State.selectedIndices, exports.cardIndexAtMouseDown);
                if (selectedIndexIndex < 0) {
                    State.selectedIndices.splice(~selectedIndexIndex, 0, exports.cardIndexAtMouseDown);
                }
                else {
                    State.selectedIndices.splice(selectedIndexIndex, 1);
                }
            }
            if (State.gameState === undefined)
                throw new Error();
            if (exports.action === Action.Return) {
                const result = await State.returnCards(State.gameState);
                if ('errorDescription' in result) {
                    console.error(result.errorDescription);
                }
                else {
                    // make the selected cards disappear
                    State.selectedIndices.splice(0, State.selectedIndices.length);
                }
            }
            if (exports.action === Action.DeselectHidden || exports.action === Action.DeselectRevealed) {
                State.selectedIndices.splice(0, State.selectedIndices.length);
                const result = await State.reorderCards(State.gameState);
                if ('errorDescription' in result) {
                    console.error(result.errorDescription);
                }
            }
            if (exports.action === Action.SelectHidden || exports.action === Action.SelectRevealed) {
                let selectedIndexIndex = BS.binarySearchNumber(State.selectedIndices, exports.cardIndexAtMouseDown);
                if (selectedIndexIndex < 0) {
                    selectedIndexIndex = ~selectedIndexIndex;
                    State.selectedIndices.splice(selectedIndexIndex, 0, exports.cardIndexAtMouseDown);
                }
                const result = await State.reorderCards(State.gameState);
                if ('errorDescription' in result) {
                    console.error(result.errorDescription);
                }
            }
            if (VP.sortBySuitBounds[0].x < mouseDownPosition.x && mouseDownPosition.x < VP.sortBySuitBounds[1].x &&
                VP.sortBySuitBounds[0].y < mouseDownPosition.y && mouseDownPosition.y < VP.sortBySuitBounds[1].y) {
                const result = await State.sortBySuit(State.gameState);
                if ('errorDescription' in result) {
                    console.error(result.errorDescription);
                }
            }
            if (VP.sortByRankBounds[0].x < mouseDownPosition.x && mouseDownPosition.x < VP.sortByRankBounds[1].x &&
                VP.sortByRankBounds[0].y < mouseDownPosition.y && mouseDownPosition.y < VP.sortByRankBounds[1].y) {
                const result = await State.sortByRank(State.gameState);
                if ('errorDescription' in result) {
                    console.error(result.errorDescription);
                }
            }
            exports.onDeckAtMouseDown = false;
            exports.cardIndexAtMouseDown = -1;
            exports.action = Action.None;
        }
        catch (error) {
            console.error(error);
        }
    };
});
