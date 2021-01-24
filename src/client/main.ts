import * as Lib from '../lib';
import * as Client from './client';
import * as State from './state';
import * as Input from './input';
import Sprite from './sprite';

const playerNameFromCookie = Lib.getCookie('playerName');
if (playerNameFromCookie === undefined) throw new Error('No player name!');
const playerNameElement = (<HTMLInputElement>document.getElementById('playerName'));
playerNameElement.value = decodeURI(playerNameFromCookie);

const gameIdFromCookie = Lib.getCookie('gameId');
if (gameIdFromCookie === undefined) throw new Error('No game id!');
const gameIdElement = (<HTMLInputElement>document.getElementById('gameId'));
gameIdElement.value = gameIdFromCookie;

(<HTMLButtonElement>document.getElementById('joinGame')).onclick = async e => {
    console.log(`joining game '${gameIdElement.value}'...`);

    Lib.setCookie('playerName', playerNameElement.value);

    try {
        await Client.setPlayerName(playerNameElement.value);
        await Client.joinGame(gameIdElement.value);
    } catch (e) {
        (<HTMLDivElement>document.getElementById('errorDescription')).innerHTML = JSON.stringify(e);
        throw e;
    }

    document.body.removeChild(<HTMLDivElement>document.getElementById('form'));
    document.body.removeChild(<HTMLDivElement>document.getElementById('errorDescription'));
    document.body.appendChild(Sprite.app.view);
};

(<HTMLButtonElement>document.getElementById('newGame')).onclick = async e => {
    console.log(`creating new game...`);

    Lib.setCookie('playerName', playerNameElement.value);

    await Client.setPlayerName(playerNameElement.value);
    await Client.newGame();

    document.body.removeChild(<HTMLDivElement>document.getElementById('form'));
    document.body.removeChild(<HTMLDivElement>document.getElementById('errorDescription'));
    document.body.appendChild(Sprite.app.view);
};

window.onresize = () => {
    Sprite.recalculatePixels();

    const gameState = Client.gameState;
    if (gameState) {
        State.setPlayerSpriteTargets(gameState);
    }
};

let currentTime: number = performance.now();

window.onload = async () => {
    Sprite.recalculatePixels();

    await Sprite.load();

    Sprite.app.ticker.add(() => {
        currentTime = performance.now();
    });
    Sprite.app.ticker.add(renderDeck);
    Sprite.app.ticker.add(renderPlayer);
    Sprite.app.ticker.add(renderOtherPlayer);
}

const deckDealDuration = 1000;
let deckDealTime: number | undefined = undefined;
function renderDeck(deltaTime: number) {
    const deckCount = Client.gameState?.deckCount;
    if (deckCount === undefined) return;

    if (deckDealTime === undefined) {
        deckDealTime = currentTime;
    }

    for (let i = 0; i < State.deckSprites.length; ++i) {
        const deckSprite = State.deckSprites[i];
        if (deckSprite === undefined) throw new Error();

        if (i === deckCount - 1 &&
            Input.action !== "None" &&
            Input.action !== "SortBySuit" &&
            Input.action !== "SortByRank" &&
            Input.action !== "Deselect" && (
            Input.action.type === "DrawFromDeck" ||
            Input.action.type === "WaitingForNewCard"
        )) {
            // set in onmousemove
        } else if (currentTime - deckDealTime < i * deckDealDuration / deckCount) {
            // card not yet dealt; keep top left
            deckSprite.position = { x: -Sprite.width, y: -Sprite.height };
            deckSprite.target = { x: -Sprite.width, y: -Sprite.height };
        } else {
            deckSprite.target = {
                x: Sprite.app.view.width / 2 - Sprite.width / 2 - (i - deckCount / 2) * Sprite.deckGap,
                y: Sprite.app.view.height / 2 - Sprite.height / 2
            };
        }

        deckSprite.animate(deltaTime);
    }
}

function renderPlayer(deltaTime: number) {
    const gameState = Client.gameState;
    if (gameState === undefined) return;

    const sprites = State.faceSpritesForPlayer[gameState.playerIndex];
    if (sprites === undefined) throw new Error();

    let i = 0;
    for (const sprite of sprites) {
        sprite.selected = Lib.binarySearchNumber(State.selectedIndices, i) >= 0;
        sprite.index = i;
        sprite.animate(deltaTime);

        ++i;
    }
}

function renderOtherPlayer(deltaTime: number) {
    const gameState = Client.gameState;
    if (gameState === undefined) return;

    for (let i = 1; i < 4; ++i) {
        const playerIndex = (gameState.playerIndex + i) % 4;

        const playerState = gameState.playerStates[playerIndex];
        if (!playerState) continue;

        const faceSprites = State.faceSpritesForPlayer[playerIndex];
        if (!faceSprites) throw new Error();

        let j = 0;
        for (const faceSprite of faceSprites) {
            if (j < playerState.shareCount) {
                faceSprite.target = {
                    x: Sprite.app.view.width / 2 + (playerState.shareCount - j) * Sprite.gap,
                    y: Sprite.height
                };
            } else {
                faceSprite.target = {
                    x: Sprite.app.view.width / 2 - Sprite.width - (j - playerState.shareCount) * Sprite.gap,
                    y: Sprite.height
                };
            }

            faceSprite.index = j;
            faceSprite.animate(deltaTime);

            ++j;
        }

        const backSprites = State.backSpritesForPlayer[playerIndex];
        if (!backSprites) throw new Error();

        j = 0;
        for (const backSprite of backSprites) {
            const localGroupCount = playerState.groupCount - playerState.revealCount;
            if (j < localGroupCount) {
                backSprite.target = {
                    x: Sprite.app.view.width / 2 + (localGroupCount - j) * Sprite.gap,
                    y: 0
                };
            } else {
                backSprite.target = {
                    x: Sprite.app.view.width / 2 - Sprite.width - (j - localGroupCount) * Sprite.gap,
                    y: 0
                };
            }

            backSprite.index = j;
            backSprite.animate(deltaTime);

            ++j;
        }
    }
}