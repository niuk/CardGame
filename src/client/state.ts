import * as Lib from '../lib';
import Sprite from './sprite';

// for animating the deck
export let deckSprites: Sprite[] = [];

// associative arrays, one for each player at their player index
// each element corresponds to a back card by index
export let backSpritesForPlayer: Sprite[][] = [];
// each element corresponds to a face card by index
export let faceSpritesForPlayer: Sprite[][] = [];

export function linkSpritesWithCards(previousGameState: Lib.GameState | undefined, gameState: Lib.GameState) {
    const previousDeckSprites = deckSprites;
    deckSprites = [];

    const previousBackSpritesForPlayer = backSpritesForPlayer;
    backSpritesForPlayer = [];

    const previousFaceSpritesForPlayer = faceSpritesForPlayer;
    faceSpritesForPlayer = [];

    for (let playerIndex = 0; playerIndex < 4; ++playerIndex) {
        const playerState = gameState.playerStates[playerIndex];
        if (!playerState) continue;

        const faceSprites = faceSpritesForPlayer[playerIndex] ?? [];
        faceSpritesForPlayer[playerIndex] = faceSprites;
        const previousFaceSprites = previousFaceSpritesForPlayer[playerIndex] ?? [];
        previousFaceSpritesForPlayer[playerIndex] = previousFaceSprites;

        const backSprites = backSpritesForPlayer[playerIndex] ?? [];
        backSpritesForPlayer[playerIndex] = backSprites;
        const previousBackSprites = previousBackSpritesForPlayer[playerIndex] ?? [];
        previousBackSpritesForPlayer[playerIndex] = previousBackSprites;

        const container = Sprite.playerContainers[playerIndex];
        if (!container) throw new Error();
        const backTexture = Sprite.getTexture(`Back${playerIndex}`);    

        for (const cardWithOrigin of playerState.cardsWithOrigins) {
            const [card, origin] = cardWithOrigin;

            let sprite: Sprite | undefined;
            if (origin.origin === 'Deck') {
                sprite = previousDeckSprites.splice(previousDeckSprites.length - 1, 1)[0];
            } else if (origin.origin === 'Hand') {
                if (playerIndex === origin.playerIndex) {
                    sprite = previousFaceSprites[origin.cardIndex];
                } else {
                    const originPlayer = previousGameState?.playerStates[origin.playerIndex];
                    if (originPlayer) {
                        if (origin.cardIndex < originPlayer.revealCount) {
                            sprite = previousFaceSpritesForPlayer[origin.playerIndex]?.[origin.cardIndex];
                        } else {
                            sprite = previousBackSpritesForPlayer[origin.playerIndex]?.[origin.cardIndex - originPlayer.revealCount];
                        }
                    }
                }
            } else {
                const _: never = origin;
            }

            if (card) {
                const faceTexture = Sprite.getTexture(JSON.stringify(card));
                if (sprite) {
                    sprite.transfer(container, faceTexture);
                } else {
                    sprite = new Sprite(container, faceTexture);
                }

                faceSprites.push(sprite);
            } else {
                if (sprite) {
                    sprite.transfer(container, backTexture);
                } else {
                    sprite = new Sprite(container, backTexture);
                }

                backSprites.push(sprite);
            }
        }
    }

    console.log(gameState.deckOrigins.length, previousDeckSprites.length);
    for (const origin of gameState.deckOrigins) {
        let sprite: Sprite | undefined;
        if (origin.origin === 'Deck') {
            sprite = previousDeckSprites.splice(0, 1)[0];
        } else if (origin.origin === 'Hand') {
            const originPlayer = previousGameState?.playerStates[origin.playerIndex];
            if (originPlayer) {
                if (origin.cardIndex < originPlayer.revealCount) {
                    sprite = previousFaceSpritesForPlayer[origin.playerIndex]?.[origin.cardIndex];
                } else {
                    sprite = previousBackSpritesForPlayer[origin.playerIndex]?.[origin.cardIndex - originPlayer.revealCount];
                }
            }
        } else {
            const _: never = origin;
        }

        const deckTexture = Sprite.getTexture('Back0');
        if (sprite) {
            sprite.transfer(Sprite.deckContainer, deckTexture);
        } else {
            sprite = new Sprite(Sprite.deckContainer, deckTexture);
        }

        deckSprites.push(sprite);
    }

    // cleanup shouldn't be necessary since no cards can be destroyed
    /*
    for (const previousFaceSprites of previousFaceSpritesForPlayer) {
        for (const previousFaceSprite of previousFaceSprites) {
            previousFaceSprite.destroy();
        }
    }

    for (const previousBackSprites of previousBackSpritesForPlayer) {
        for (const previousBackSprite of previousBackSprites) {
            previousBackSprite.destroy();
        }
    }

    for (const previousDeckSprite of previousDeckSprites) {
        previousDeckSprite.destroy();
    }
    */
}