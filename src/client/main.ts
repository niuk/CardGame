import * as PIXI from 'pixi.js';

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

const formElement = <HTMLDivElement>document.getElementById('form');
const statusElement = <HTMLDivElement>document.getElementById('status');

(<HTMLButtonElement>document.getElementById('joinGame')).onclick = async e => {
    console.log(`joining game '${gameIdElement.value}'...`);

    Lib.setCookie('playerName', playerNameElement.value);

    try {
        await Client.setPlayerName(playerNameElement.value);
        await Client.joinGame(gameIdElement.value);
    } catch (e) {
        statusElement.innerHTML = `Error: ${JSON.stringify(e)}`;
        throw e;
    }

    statusElement.innerHTML = `Game: ${Client.gameState?.gameId}`;
    document.body.removeChild(formElement);
    document.body.appendChild(Sprite.app.view);
};

(<HTMLButtonElement>document.getElementById('newGame')).onclick = async e => {
    console.log(`creating new game...`);

    Lib.setCookie('playerName', playerNameElement.value);

    await Client.setPlayerName(playerNameElement.value);
    await Client.newGame();

    statusElement.innerHTML = `Game: ${Client.gameState?.gameId}`;
    document.body.removeChild(formElement);
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
    statusElement.innerHTML = 'Connecting...';
    await Client.connect();
    statusElement.innerHTML = `Connected. Loading textures...`;
    await Sprite.load();
    statusElement.innerHTML = 'Connected. Textures loaded.';

    formElement.style.visibility = 'visible';

    Sprite.recalculatePixels();

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

let playerLine: PIXI.Graphics | undefined;
let playerLabels: (PIXI.Text | undefined)[] = [];

function renderPlayer(deltaTime: number) {
    const gameState = Client.gameState;
    if (gameState === undefined) return;

    const sprites = State.faceSpritesForPlayer[gameState.playerIndex];
    if (sprites === undefined) throw new Error();

    let i = 0;
    for (const sprite of sprites) {
        sprite.selected = Lib.binarySearchNumber(State.selectedIndices, i) >= 0;
        sprite.zIndex = i;
        sprite.animate(deltaTime);

        ++i;
    }

    const container = State.playerContainers[gameState.playerIndex];
    if (!container) throw new Error();

    if (!playerLine) {
        playerLine = container.addChild(new PIXI.Graphics());
    }

    const centerX = Sprite.app.view.width / 2;
    const centerY = Sprite.app.view.height - Sprite.height - Sprite.gap;
    
    playerLine.clear();
    playerLine.lineStyle(0.05 * Sprite.pixelsPerCM, 0xffffff, 0xff);
    playerLine.moveTo(centerX, Sprite.app.view.height - Sprite.height * 2 - Sprite.gap * 2);
    playerLine.lineTo(centerX, Sprite.app.view.height);
    playerLine.moveTo(Math.max(0, centerX - Sprite.app.view.height / 2) + Sprite.height + Sprite.gap, centerY);
    playerLine.lineTo(Math.min(centerX + Sprite.app.view.height / 2, Sprite.app.view.width) - Sprite.height - Sprite.gap, centerY);

    const addLabel = (i: number, anchorX: number, anchorY: number, positionX: number, positionY: number, s: string) => {
        let label = playerLabels[i];
        if (!label) {
            label = container.addChild(new PIXI.Text(s, { fill: 'white' }));
            playerLabels[i] = label;
        }
        
        label.text = s;
        label.anchor.set(anchorX, anchorY);
        label.position.set(positionX, positionY);
    };

    const playerState = gameState.playerStates[gameState.playerIndex];
    if (!playerState) throw new Error();

    let shareCount = playerState.shareCount;
    let revealCount = playerState.revealCount;
    let groupCount = playerState.groupCount;
    let totalCount = playerState.totalCount;
    if (Input.action !== 'Deselect' &&
        Input.action !== 'None' &&
        Input.action !== 'SortByRank' &&
        Input.action !== 'SortBySuit' &&
        Input.action.type === 'ReturnToDeck'
    ) {
        for (const selectedIndex of State.selectedIndices) {
            if (shareCount > selectedIndex) {
                shareCount--;
            }

            if (revealCount > selectedIndex) {
                revealCount--;
            }

            if (groupCount > selectedIndex) {
                groupCount--;
            }

            totalCount--;
        }
    }

    const 上上 = centerY - Sprite.height - Sprite.gap - 0.075 * Sprite.pixelsPerCM;
    const 上下 = centerY - Sprite.height - Sprite.gap + 0.675 * Sprite.pixelsPerCM;

    const topLeftShift = centerX - (shareCount > 0 ? Sprite.width + shareCount * Sprite.gap : Sprite.gap);
    addLabel(0, 1, 0, topLeftShift, 上上, '得');
    addLabel(1, 1, 0, topLeftShift, 上下, '分');

    const topRightCount = revealCount - shareCount;
    const topRightShift = centerX + (topRightCount > 0 ? Sprite.width + topRightCount * Sprite.gap : Sprite.gap);
    addLabel(2, 0, 0, topRightShift, 上上, '出');
    addLabel(3, 0, 0, topRightShift, 上下, '牌');

    const 下上 = centerY + Sprite.gap - 0.125 * Sprite.pixelsPerCM;
    const 下下 = centerY + Sprite.gap + 0.625 * Sprite.pixelsPerCM;

    const bottomLeftCount = groupCount - revealCount;
    const bottomLeftShift = centerX - (bottomLeftCount > 0 ? Sprite.width + bottomLeftCount * Sprite.gap : Sprite.gap);
    addLabel(4, 1, 0, bottomLeftShift, 下上, '底');
    addLabel(5, 1, 0, bottomLeftShift, 下下, '牌');
    
    const bottomRightCount = totalCount - groupCount;
    const bottomRightShift = centerX + (bottomRightCount > 0 ? Sprite.width + bottomRightCount * Sprite.gap : Sprite.gap);
    const bottomRight數 = 數(bottomRightCount);
    if (!bottomRight數) throw new Error();

    addLabel(6, 0, 0, bottomRightShift, 下上, <string>bottomRight數[0]);

    if (bottomRight數.length > 1) {
        addLabel(7, 0, 0, bottomRightShift, 下下, <string>bottomRight數[1]);
    } else {
        playerLabels[7]?.destroy();
        playerLabels[7] = undefined;
    }

    if (bottomRight數.length > 2) {
        addLabel(8, 0, 0, bottomRightShift, 下下 + 0.75 * Sprite.pixelsPerCM, <string>bottomRight數[2]);
    } else {
        playerLabels[8]?.destroy();
        playerLabels[8] = undefined;
    }
}

const digits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
function 數(n: number) {
    if (n <= 10) {
        return digits[n];
    } else if (n <= 19) {
        return `十${digits[n % 10]}`;
    } else if (n <= 99) {
        const m = n % 10;
        return `${digits[Math.floor(n / 10)]}十${m > 0 ? digits[m] : ''}`;
    } else if (n === 100) {
        return '一百';
    } else {
        n -= 100;
        if (n <= 9) {
            return `一百零${digits[n]}`;
        } else {
            const m = n % 10;
            return `一百${digits[Math.floor(m / 10)]}十${m > 0 ? digits[m] : ''}`;
        }
    }
}

let otherPlayerLines: PIXI.Graphics[] = [];
let otherPlayerLabels: PIXI.Text[][] = [];

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
                    y: Sprite.height + 2 * Sprite.gap
                };
            } else {
                faceSprite.target = {
                    x: Sprite.app.view.width / 2 - Sprite.width - (1 + j - playerState.shareCount) * Sprite.gap,
                    y: Sprite.height + 2 * Sprite.gap
                };
            }

            faceSprite.zIndex = j;
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
                    x: Sprite.app.view.width / 2 - Sprite.width - (1 + j - localGroupCount) * Sprite.gap,
                    y: 0
                };
            }

            backSprite.zIndex = j;
            backSprite.animate(deltaTime);

            ++j;
        }
        
        let otherPlayerLine = otherPlayerLines[playerIndex];
        if (!otherPlayerLine) {
            otherPlayerLine = new PIXI.Graphics();
            State.playerContainers[playerIndex]?.addChild(otherPlayerLine);
            otherPlayerLines[playerIndex] = otherPlayerLine;
        
            otherPlayerLine.lineStyle(0.1 * Sprite.pixelsPerCM, 0xffffff, 0xff);
            otherPlayerLine.moveTo(Sprite.app.view.width / 2, 0);
            otherPlayerLine.lineTo(Sprite.app.view.width / 2, 2 * Sprite.height + 2 * Sprite.gap);
            otherPlayerLine.moveTo(Sprite.height + Sprite.gap, Sprite.height + Sprite.gap);
            otherPlayerLine.lineTo(Sprite.app.view.width - Sprite.height - Sprite.gap, Sprite.height + Sprite.gap);
        }
    }
}