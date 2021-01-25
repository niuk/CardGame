import * as PIXI from 'pixi.js-legacy';

import * as Lib from '../lib';
import Sprite from './sprite';

// indices of cards for drag & drop
// IMPORTANT: this array must always be sorted!
// Always use binarySearch to insert and delete or sort after manipulation
export const selectedIndices: number[] = [];

// for animating the deck
export let deckSprites: Sprite[] = [];

// associative arrays, one for each player at their player index
// each element corresponds to a back card by index
export let backSpritesForPlayer: Sprite[][] = [];
// each element corresponds to a face card by index
export let faceSpritesForPlayer: Sprite[][] = [];

export let deckContainer = Sprite.app.stage.addChild(new PIXI.Container());
export let playerContainers = [
    Sprite.app.stage.addChild(new PIXI.Container()),
    Sprite.app.stage.addChild(new PIXI.Container()),
    Sprite.app.stage.addChild(new PIXI.Container()),
    Sprite.app.stage.addChild(new PIXI.Container())
];

Sprite.app.stage.sortableChildren = true;
deckContainer.zIndex = 0;
for (const playerContainer of playerContainers) {
    playerContainer.zIndex = 1;
    playerContainer.sortableChildren = true;
}

let onSpritesLinkedWithCards = () => {};

export function getSpritesLinkedWithCardsPromise(): Promise<void> {
    return new Promise<void>(resolve => {
        onSpritesLinkedWithCards = () => {
            onSpritesLinkedWithCards = () => {};
            resolve();
        };
    });
}

export function linkSpritesWithCards(previousGameState: Lib.GameState | undefined, gameState: Lib.GameState) {
    const container = playerContainers[gameState.playerIndex];
    if (!container) throw new Error();
    container.zIndex = 2;

    const previousDeckSprites = deckSprites;
    deckSprites = [];

    for (let i = 0; i < gameState.deckCount; ++i) {
        if (previousGameState &&
            previousGameState.deckCount > 0
        ) {
            previousGameState.deckCount--;
            deckSprites.push(...previousDeckSprites.splice(0, 1));
        }
    }

    const previousBackSpritesForPlayer = backSpritesForPlayer;
    backSpritesForPlayer = [];

    const previousFaceSpritesForPlayer = faceSpritesForPlayer;
    faceSpritesForPlayer = [];

    // convenience function for iterating through players, which we will be doing a lot
    function forEachPlayer(
        callback: (
            playerIndex: number,
            playerState: Lib.PlayerState,
            previousPlayerState: Lib.PlayerState,
            faceSprites: Sprite[],
            previousFaceSprites: Sprite[],
            backSprites: Sprite[],
            previousBackSprites: Sprite[],
        ) => 'break' | 'continue'
    ) {
        for (let i = 0; i < 4; ++i) {
            const playerState = gameState.playerStates[i];
            if (!playerState) continue;

            let previousPlayerState = previousGameState?.playerStates[i];
            if (!previousPlayerState) {
                previousPlayerState = {
                    name: playerState.name,
                    shareCount: 0,
                    revealCount: 0,
                    groupCount: 0,
                    totalCount: 0,
                    cards: []
                };
            }

            const faceSprites = faceSpritesForPlayer[i] ?? [];
            faceSpritesForPlayer[i] = faceSprites;
            const previousFaceSprites = previousFaceSpritesForPlayer[i] ?? [];
            previousFaceSpritesForPlayer[i] = previousFaceSprites;

            const backSprites = backSpritesForPlayer[i] ?? [];
            backSpritesForPlayer[i] = backSprites;
            const previousBackSprites = previousBackSpritesForPlayer[i] ?? [];
            previousBackSpritesForPlayer[i] = previousBackSprites;

            const control = callback(
                i,
                playerState,
                previousPlayerState,
                faceSprites,
                previousFaceSprites,
                backSprites,
                previousBackSprites,
            );

            if (control === 'break') {
                break;
            } else if (control === 'continue') {
                continue;
            } else {
                const _: never = control;
            }
        }
    }

    // try to link the player's face cards with those he had previously
    forEachPlayer((
        playerIndex,
        playerState,
        previousPlayerState,
        faceSprites,
        previousFaceSprites,
        backSprites,
        previousBackSprites
    ) => {
        // iterate backwards to reserve as many cards as possible for sharing with other players
        // the outer loop must also loop backwards so that our links are 'stable' w.r.t. duplicate cards
        for (let i = playerState.cards.length - 1; i >= 0; --i) {
            if (faceSprites[i]) continue;

            for (let j = previousPlayerState.cards.length - 1; j >= 0; --j) {
                if (JSON.stringify(playerState.cards[i]) === JSON.stringify(previousPlayerState.cards[j])) {
                    previousPlayerState.cards.splice(j, 1);

                    if (j < previousPlayerState.shareCount) {
                        --previousPlayerState.shareCount;
                    }

                    if (j < previousPlayerState.revealCount) {
                        --previousPlayerState.revealCount;
                    }

                    if (j < previousPlayerState.groupCount) {
                        --previousPlayerState.groupCount;
                    }

                    --previousPlayerState.totalCount;

                    const faceSprite = previousFaceSprites.splice(j, 1)[0];
                    if (faceSprite === undefined) throw new Error();
                    faceSprites[i] = faceSprite;

                    break;
                }
            }
        }

        return 'continue';
    });

    // try to link each face card with...
    forEachPlayer((
        playerIndex,
        playerState,
        previousPlayerState,
        faceSprites,
        previousFaceSprites,
        backSprites,
        previousBackSprites
    ) => {
        for (let i = 0; i < playerState.cards.length; ++i) {
            if (faceSprites[i]) continue;

            const container = playerContainers[playerIndex];
            if (!container) throw new Error();

            const texture = Sprite.getTexture(JSON.stringify(playerState.cards[i]));

            // ... the previously shared cards of other players
            forEachPlayer((
                otherPlayerIndex,
                otherPlayerState,
                otherPreviousPlayerState,
                otherFaceSprites,
                otherPreviousFaceSprites,
                otherBackSprites,
                otherPreviousBackSprites
            ) => {
                if (playerIndex === otherPlayerIndex) {
                    return 'continue';
                }

                for (let k = 0; k < otherPreviousPlayerState.shareCount; ++k) {
                    if (JSON.stringify(playerState.cards[i]) === JSON.stringify(otherPreviousPlayerState.cards[k])) {
                        otherPreviousPlayerState.shareCount--;
                        otherPreviousPlayerState.revealCount--;
                        otherPreviousPlayerState.groupCount--;
                        otherPreviousPlayerState.totalCount--;
                        otherPreviousPlayerState.cards.splice(k, 1);
    
                        const sprite = otherPreviousFaceSprites.splice(k, 1)[0];
                        if (!sprite) throw new Error();

                        sprite.transfer(container, texture);

                        faceSprites[i] = sprite;

                        return 'break';
                    }
                }

                return 'continue';
            });

            // ... a card drawn from the deck
            if (!faceSprites[i] &&
                previousGameState &&
                previousGameState.deckCount > 0
            ) {
                previousGameState.deckCount--;
                const sprite = previousDeckSprites.splice(previousDeckSprites.length - 1, 1)[0];
                if (!sprite) throw new Error();

                sprite.transfer(container, texture);

                faceSprites[i] = sprite;
            }
        }

        return 'continue';
    });

    // link each of the player's back cards with...
    forEachPlayer((
        playerIndex,
        playerState,
        previousPlayerState,
        faceSprites,
        previousFaceSprites,
        backSprites,
        previousBackSprites
    ) => {
        const container = playerContainers[playerIndex];
        if (container === undefined) throw new Error();

        const texture = Sprite.getTexture(`Back${playerIndex + 1}`);

        for (let i = playerState.cards.length; i < playerState.totalCount; ++i) {
            if (previousPlayerState.totalCount > previousPlayerState.cards.length) {
                // ... his previous back cards
                previousPlayerState.totalCount--;

                const sprite = previousBackSprites.splice(0, 1)[0];
                if (!sprite) throw new Error();
                sprite.transfer(container, texture);

                backSprites.push(sprite);
            } else if (
                previousGameState &&
                previousGameState.deckCount > 0
            ) {
                // ... any cards previously in the deck
                previousGameState.deckCount--;

                const sprite = previousDeckSprites.splice(0, 1)[0];
                if (!sprite) throw new Error();
                sprite.transfer(container, texture);

                backSprites.push(sprite);
            } else {
                // ... previously shared cards of other players
                forEachPlayer((
                    otherPlayerIndex,
                    otherPlayerState,
                    otherPreviousPlayerState,
                    otherFaceSprites,
                    otherPreviousFaceSprites,
                    otherBackSprites,
                    otherPreviousBackSprites
                ) => {
                    if (otherPreviousPlayerState.shareCount > 0) {
                        otherPreviousPlayerState.shareCount--;
                        otherPreviousPlayerState.revealCount--;
                        otherPreviousPlayerState.groupCount--;
                        otherPreviousPlayerState.totalCount--;
                        otherPreviousPlayerState.cards.splice(0, 1);

                        const sprite = otherPreviousFaceSprites.splice(0, 1)[0];
                        if (!sprite) throw new Error();
                        sprite.transfer(container, texture);

                        backSprites.push(sprite);

                        return 'break';
                    }

                    return 'continue';
                });
            }
        }

        return 'continue';
    });

    forEachPlayer((
        playerIndex,
        playerState,
        previousPlayerState,
        faceSprites,
        previousFaceSprites,
        backSprites,
        previousBackSprites
    ) => {
        const container = playerContainers[playerIndex];
        if (container === undefined) throw new Error();

        // link the player's remaining face cards with...
        for (let i = 0; i < playerState.cards.length; ++i) {
            const texture = Sprite.getTexture(JSON.stringify(playerState.cards[i]));
    
            if (faceSprites[i]) continue;

            if (previousPlayerState.totalCount > previousPlayerState.cards.length) {
                // ... his previous back cards
                previousPlayerState.totalCount--;

                const sprite = previousBackSprites.splice(0, 1)[0];
                if (!sprite) throw new Error();
                sprite.transfer(container, texture);

                faceSprites[i] = sprite;
            } else {
                // ... or nothing
                faceSprites[i] = new Sprite(container, texture);
            }
        }

        // link the player's remaining back cards with...
        for (let i = playerState.cards.length + backSprites.length; i < playerState.totalCount; ++i) {
            const texture = Sprite.getTexture(`Back${playerIndex + 1}`);

            if (previousPlayerState.cards.length > 0) {
                // ... his previous face cards
                previousPlayerState.shareCount = Math.max(0, previousPlayerState.shareCount - 1);
                previousPlayerState.revealCount = Math.max(0, previousPlayerState.revealCount - 1);
                previousPlayerState.groupCount = Math.max(0, previousPlayerState.groupCount - 1);
                previousPlayerState.totalCount--;
                previousPlayerState.cards.splice(0, 1);

                const sprite = previousFaceSprites.splice(0, 1)[0];
                if (!sprite) throw new Error();
                sprite.transfer(container, texture);

                backSprites.push(sprite);
            } else {
                // ... or nothing
                backSprites.push(new Sprite(container, texture));
            }
        }

        return 'continue';
    });

    // link cards in the deck with...
    for (let i = deckSprites.length; i < gameState.deckCount; ++i) {
        const texture = Sprite.getTexture('Back0');

        forEachPlayer((
            playerIndex,
            playerState,
            previousPlayerState,
            faceSprites,
            previousFaceSprites,
            backSprites,
            previousBackSprites
        ) => {
            if (previousPlayerState.cards.length > 0) {
                // ... a player's face card
                previousPlayerState.shareCount = Math.max(0, previousPlayerState.shareCount - 1);
                previousPlayerState.revealCount = Math.max(0, previousPlayerState.revealCount - 1);
                previousPlayerState.groupCount = Math.max(0, previousPlayerState.groupCount - 1);
                previousPlayerState.totalCount--;
                previousPlayerState.cards.splice(0, 1);

                const sprite = previousFaceSprites.splice(0, 1)[0];
                if (!sprite) throw new Error();
                sprite.transfer(deckContainer, texture);

                deckSprites.push(sprite);

                return 'break';
            } else if (previousPlayerState.totalCount > 0) {
                // ... a player's back card
                --previousPlayerState.totalCount;

                const sprite = previousBackSprites.splice(0, 1)[0];
                if (!sprite) throw new Error();
                sprite.transfer(deckContainer, texture);

                deckSprites.push(sprite);

                return 'break';
            } else {
                return 'continue';
            }
        });

        if (deckSprites.length === i) {
            // ... or nothing
            deckSprites.push(new Sprite(deckContainer, texture));
        }
    }

    for (const previousDeckSprite of previousDeckSprites) {
        previousDeckSprite.destroy();
    }

    onSpritesLinkedWithCards();
}

export function setPlayerSpriteTargets(
    gameState: Lib.GameState,
    reservedSpritesAndCards?: [Sprite, Lib.Card][],
    movingSpritesAndCards?: [Sprite, Lib.Card][],
    shareCount?: number,
    revealCount?: number,
    groupCount?: number,
    splitIndex?: number,
    returnToDeck?: boolean
) {
    const sprites = faceSpritesForPlayer[gameState.playerIndex];
    if (sprites === undefined) throw new Error();

    const player = gameState.playerStates[gameState.playerIndex];
    if (player === undefined || player === null) throw new Error();

    reservedSpritesAndCards = reservedSpritesAndCards ?? player.cards.map((card, index) => <[Sprite, Lib.Card]>[sprites[index], card]);
    movingSpritesAndCards = movingSpritesAndCards ?? [];
    shareCount = shareCount ?? player.shareCount;
    revealCount = revealCount ?? player.revealCount;
    groupCount = groupCount ?? player.groupCount;
    splitIndex = splitIndex ?? player.cards.length;
    returnToDeck = returnToDeck ?? false;

    // clear for reinsertion
    sprites.splice(0, sprites.length);
    player.cards.splice(0, player.cards.length);

    for (const [reservedSprite, reservedCard] of reservedSpritesAndCards) {
        if (player.cards.length === splitIndex) {
            for (const [movingSprite, movingCard] of movingSpritesAndCards) {
                sprites.push(movingSprite);
                player.cards.push(movingCard);
            }
        }

        if (player.cards.length < shareCount) {
            reservedSprite.target = {
                x: Sprite.app.view.width / 2 - Sprite.width + (player.cards.length - shareCount) * Sprite.gap,
                y: Sprite.app.view.height - 2 * Sprite.height - 2 * Sprite.gap
            };
        } else if (player.cards.length < revealCount) {
            reservedSprite.target = {
                x: Sprite.app.view.width / 2 + (1 + player.cards.length - shareCount) * Sprite.gap,
                y: Sprite.app.view.height - 2 * Sprite.height - 2 * Sprite.gap
            };
        } else {
            if (player.cards.length < groupCount) {
                reservedSprite.target = {
                    x: Sprite.app.view.width / 2 - Sprite.width + (player.cards.length - revealCount - (groupCount - revealCount)) * Sprite.gap,
                    y: Sprite.app.view.height - Sprite.height
                };
            } else {
                reservedSprite.target = {
                    x: Sprite.app.view.width / 2 + (1 + player.cards.length - groupCount) * Sprite.gap,
                    y: Sprite.app.view.height - Sprite.height
                };
            }
        }
        
        sprites.push(reservedSprite);
        player.cards.push(reservedCard);
    }

    if (player.cards.length === splitIndex) {
        for (const [movingSprite, movingCard] of movingSpritesAndCards) {
            sprites.push(movingSprite);
            player.cards.push(movingCard);
        }
    }

    player.shareCount = shareCount;
    player.revealCount = revealCount;
    player.groupCount = groupCount;
}

export function transformPlayerContainers(gameState: Lib.GameState) {
    let container: PIXI.Container;

    container = <PIXI.Container>playerContainers[(gameState.playerIndex + 1) % 4];
    container.position.y = (Sprite.app.view.width + Sprite.app.view.height) / 2;
    container.rotation = -Math.PI / 2;

    container = <PIXI.Container>playerContainers[(gameState.playerIndex + 3) % 4];
    container.position.x = Sprite.app.view.width;
    container.position.y = (Sprite.app.view.height - Sprite.app.view.width) / 2;
    container.rotation = Math.PI / 2;
}