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
            playerContainer: PIXI.Container,
            backTexture: PIXI.Texture
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

            const container = Sprite.playerContainers[i];
            if (!container) throw new Error();
            const backTexture = Sprite.getTexture(`Back${i}`);    

            const control = callback(
                i,
                playerState,
                previousPlayerState,
                faceSprites,
                previousFaceSprites,
                backSprites,
                previousBackSprites,
                container,
                backTexture
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

    // (1)
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

            for (let j = 0; j < previousPlayerState.cards.length; ++j) {
                if (JSON.stringify(playerState.cards[i]) === JSON.stringify(previousPlayerState.cards[j])) {
                    if (previousPlayerState.shareCount > j) {
                        previousPlayerState.shareCount--;
                    }

                    if (previousPlayerState.revealCount > j) {
                        previousPlayerState.revealCount--;
                    }

                    if (previousPlayerState.groupCount> j) {
                        previousPlayerState.groupCount--;
                    }

                    previousPlayerState.totalCount--;
                    previousPlayerState.cards.splice(j, 1);

                    const faceSprite = previousFaceSprites.splice(j, 1)[0];
                    if (faceSprite === undefined) throw new Error();
                    faceSprites[i] = faceSprite;

                    break;
                }
            }
        }

        return 'continue';
    });

    // (2)
    forEachPlayer((
        playerIndex,
        playerState,
        previousPlayerState,
        faceSprites,
        previousFaceSprites,
        backSprites,
        previousBackSprites,
        container
    ) => {
        for (let i = 0; i < playerState.cards.length; ++i) {
            if (faceSprites[i]) continue;

            const texture = Sprite.getTexture(JSON.stringify(playerState.cards[i]));

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

                for (let j = 0; j < otherPreviousPlayerState.cards.length; ++j) {
                    if (JSON.stringify(playerState.cards[i]) === JSON.stringify(otherPreviousPlayerState.cards[j])) {
                        if (otherPreviousPlayerState.shareCount > j) {
                            otherPreviousPlayerState.shareCount--;
                        }

                        if (otherPreviousPlayerState.revealCount > j) {
                            otherPreviousPlayerState.revealCount--;
                        }

                        if (otherPreviousPlayerState.groupCount > j) {
                            otherPreviousPlayerState.groupCount--;
                        }

                        otherPreviousPlayerState.totalCount--;
                        otherPreviousPlayerState.cards.splice(j, 1);
    
                        const sprite = otherPreviousFaceSprites.splice(j, 1)[0];
                        if (!sprite) throw new Error();
                        faceSprites[i] = sprite;

                        sprite.transfer(container, texture);

                        return 'break';
                    }
                }

                return 'continue';
            });
        }

        return 'continue';
    });

    // (3)
    forEachPlayer((
        playerIndex,
        playerState,
        previousPlayerState,
        faceSprites,
        previousFaceSprites,
        backSprites,
        previousBackSprites,
        container,
        backTexture
    ) => {
        for (let i = playerState.cards.length + backSprites.length; i < playerState.totalCount; ++i) {
            if (previousPlayerState.totalCount > previousPlayerState.cards.length) {
                if (previousPlayerState.groupCount > previousPlayerState.cards.length) {
                    previousPlayerState.groupCount--;
                }
                
                previousPlayerState.totalCount--;

                const sprite = previousBackSprites.splice(0, 1)[0];
                if (!sprite) throw new Error();
                backSprites.push(sprite);

                sprite.transfer(container, backTexture);
            }
        }

        return 'continue';
    });

    // link each player's face cards with their previous back cards
    forEachPlayer((
        playerIndex,
        playerState,
        previousPlayerState,
        faceSprites,
        previousFaceSprites,
        backSprites,
        previousBackSprites,
        container
    ) => {
        for (let i = 0; i < playerState.cards.length; ++i) {
            if (faceSprites[i]) continue;

            const texture = Sprite.getTexture(JSON.stringify(playerState.cards[i]));

            if (previousPlayerState.totalCount > previousPlayerState.cards.length) {
                if (previousPlayerState.groupCount > previousPlayerState.cards.length) {
                    previousPlayerState.groupCount--;
                }

                previousPlayerState.totalCount--;

                const sprite = previousBackSprites.splice(0, 1)[0];
                if (!sprite) throw new Error();
                faceSprites[i] = sprite;

                sprite.transfer(container, texture);
            }
        }

        return 'continue';
    });

    // link each player's back cards with their previous face cards
    forEachPlayer((
        playerIndex,
        playerState,
        previousPlayerState,
        faceSprites,
        previousFaceSprites,
        backSprites,
        previousBackSprites,
        container,
        backTexture
    ) => {
        for (let i = playerState.cards.length + backSprites.length; i < playerState.totalCount; ++i) {
            if (previousPlayerState.cards.length > 0) {
                previousPlayerState.shareCount = Math.max(0, previousPlayerState.shareCount - 1);
                previousPlayerState.revealCount = Math.max(0, previousPlayerState.revealCount - 1);
                previousPlayerState.groupCount = Math.max(0, previousPlayerState.groupCount - 1);
                previousPlayerState.totalCount--;
                previousPlayerState.cards.splice(0, 1);

                const sprite = previousFaceSprites.splice(0, 1)[0];
                if (!sprite) throw new Error();
                backSprites.push(sprite);

                sprite.transfer(container, backTexture);
            }
        }

        return 'continue';
    });

    // link the player's back cards with other player's previous cards
    forEachPlayer((
        playerIndex,
        playerState,
        previousPlayerState,
        faceSprites,
        previousFaceSprites,
        backSprites,
        previousBackSprites,
        container,
        backTexture
    ) => {
        for (let i = playerState.cards.length + backSprites.length; i < playerState.totalCount; ++i) {
            forEachPlayer((
                otherPlayerIndex,
                otherPlayerState,
                otherPreviousPlayerState,
                otherFaceSprites,
                otherPreviousFaceSprites,
                otherBackSprites,
                otherPreviousBackSprites
            ) => {
                if (otherPreviousPlayerState.cards.length > 0) {
                    otherPreviousPlayerState.shareCount = Math.max(0, otherPreviousPlayerState.shareCount - 1);
                    otherPreviousPlayerState.revealCount = Math.max(0, otherPreviousPlayerState.revealCount - 1);
                    otherPreviousPlayerState.groupCount = Math.max(0, otherPreviousPlayerState.groupCount - 1);
                    otherPreviousPlayerState.totalCount--;
                    otherPreviousPlayerState.cards.splice(0, 1);

                    const sprite = otherPreviousFaceSprites.splice(0, 1)[0];
                    if (!sprite) throw new Error();
                    backSprites.push(sprite);

                    sprite.transfer(container, backTexture);

                    return 'break';
                }

                return 'continue';
            });
        }

        return 'continue';
    });

    // link the player's back cards with cards previously in the deck
    forEachPlayer((
        playerIndex,
        playerState,
        previousPlayerState,
        faceSprites,
        previousFaceSprites,
        backSprites,
        previousBackSprites,
        container,
        backTexture
    ) => {
        for (let i = playerState.cards.length + backSprites.length; i < playerState.totalCount; ++i) {
            if (previousGameState &&
                previousGameState.deckCount > 0
            ) {
                previousGameState.deckCount--;

                const sprite = previousDeckSprites.splice(previousDeckSprites.length - 1, 1)[0];
                if (!sprite) throw new Error();
                backSprites.push(sprite);

                sprite.transfer(container, backTexture);
            }
        }

        return 'continue';
    });

    // link the player's face cards with cards previously in the deck
    forEachPlayer((
        playerIndex,
        playerState,
        previousPlayerState,
        faceSprites,
        previousFaceSprites,
        backSprites,
        previousBackSprites,
        container
    ) => {
        for (let i = 0; i < playerState.cards.length; ++i) {
            if (faceSprites[i]) continue;

            const texture = Sprite.getTexture(JSON.stringify(playerState.cards[i]));

            if (previousGameState &&
                previousGameState.deckCount > 0
            ) {
                // ... a card drawn from the deck
                previousGameState.deckCount--;

                const sprite = previousDeckSprites.splice(previousDeckSprites.length - 1, 1)[0];
                if (!sprite) throw new Error();
                faceSprites[i] = sprite;

                sprite.transfer(container, texture);
            }
        }

        return 'continue';
    });
    
    // create new sprites for each unlinked face card
    forEachPlayer((
        playerIndex,
        playerState,
        previousPlayerState,
        faceSprites,
        previousFaceSprites,
        backSprites,
        previousBackSprites,
        container
    ) => {
        for (let i = 0; i < playerState.cards.length; ++i) {
            if (faceSprites[i]) continue;

            const texture = Sprite.getTexture(JSON.stringify(playerState.cards[i]));

            faceSprites[i] = new Sprite(container, texture);
        }

        return 'continue';
    });

    // create new sprites for each unlinked back card
    forEachPlayer((
        playerIndex,
        playerState,
        previousPlayerState,
        faceSprites,
        previousFaceSprites,
        backSprites,
        previousBackSprites,
        container,
        backTexture
    ) => {
        for (let i = playerState.cards.length + backSprites.length; i < playerState.totalCount; ++i) {
            backSprites.push(new Sprite(container, backTexture));
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
                deckSprites.push(sprite);

                sprite.transfer(Sprite.deckContainer, texture);

                return 'break';
            } else if (previousPlayerState.totalCount > 0) {
                // ... a player's back card
                --previousPlayerState.totalCount;

                const sprite = previousBackSprites.splice(0, 1)[0];
                if (!sprite) throw new Error();
                deckSprites.push(sprite);

                sprite.transfer(Sprite.deckContainer, texture);

                return 'break';
            } else {
                return 'continue';
            }
        });

        if (deckSprites.length === i) {
            // ... or nothing
            deckSprites.push(new Sprite(Sprite.deckContainer, texture));
        }
    }

    for (const previousDeckSprite of previousDeckSprites) {
        previousDeckSprite.destroy();
    }

    onSpritesLinkedWithCards();
}

const goldenRatio = (1 + Math.sqrt(5)) / 2;

export function setPlayerSpriteTargets(
    gameState: Lib.GameState,
    reservedSpritesAndCards?: [Sprite, Lib.Card][],
    movingSpritesAndCards?: [Sprite, Lib.Card][],
    shareCount?: number,
    revealCount?: number,
    groupCount?: number,
    splitIndex?: number
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

        const goldenX = (1 - 1 / goldenRatio) * Sprite.app.view.width;
        if (player.cards.length < shareCount) {
            reservedSprite.target = {
                x: goldenX - Sprite.width + (player.cards.length - shareCount) * Sprite.gap,
                y: Sprite.app.view.height - 2 * Sprite.height - 2 * Sprite.gap
            };
        } else if (player.cards.length < revealCount) {
            reservedSprite.target = {
                x: goldenX + (1 + player.cards.length - shareCount) * Sprite.gap,
                y: Sprite.app.view.height - 2 * Sprite.height - 2 * Sprite.gap
            };
        } else {
            if (player.cards.length < groupCount) {
                reservedSprite.target = {
                    x: goldenX - Sprite.width + (player.cards.length - revealCount - (groupCount - revealCount)) * Sprite.gap,
                    y: Sprite.app.view.height - Sprite.height
                };
            } else {
                reservedSprite.target = {
                    x: goldenX + (1 + player.cards.length - groupCount) * Sprite.gap,
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