import * as PIXI from 'pixi.js';

import * as Lib from '../lib';
import * as Client from './client';
import * as State from './state';
import * as Input from './input';
import Sprite from './sprite';

let playerName = Lib.getCookie('playerName');
if (!playerName) {
    playerName = '';
}

let gameId = Lib.getCookie('gameId');
if (!gameId) {
    gameId = '';
}

const playerNameElement = (<HTMLInputElement>document.getElementById('playerName'));
playerNameElement.value = decodeURI(playerName);

const gameIdElement = (<HTMLInputElement>document.getElementById('gameId'));
gameIdElement.value = gameId;

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

const deckLabels: (PIXI.Text | undefined)[] = [];

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
        if (!deckSprite) throw new Error();

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
    
    let [i, y] = 上下(deckLabels, State.deckContainer, 0,
        Sprite.app.view.width / 2 + Sprite.width / 2 + (1 + deckCount / 2) * Sprite.deckGap,
        Sprite.app.view.height / 2 - Sprite.height / 2,
        `︵${数(deckCount)}︶`, 13);

    for (; i < deckLabels.length; ++i) {
        // workaround for bug
        if (deckLabels[i]?.texture) deckLabels[i]?.destroy();
    }
}

let playerLines: (PIXI.Graphics | undefined)[] = [];
let playerLabels: (PIXI.Text | undefined)[] = [];

function renderPlayer(deltaTime: number) {
    const gameState = Client.gameState;
    if (!gameState) return;

    const sprites = State.faceSpritesForPlayer[gameState.playerIndex];
    if (!sprites) throw new Error();

    let i = 0;
    for (const sprite of sprites) {
        sprite.selected = Lib.binarySearchNumber(State.selectedIndices, i) >= 0;
        sprite.zIndex = i;
        sprite.animate(deltaTime);

        ++i;
    }

    const container = State.playerContainers[gameState.playerIndex];
    if (!container) throw new Error();

    const centerX = Sprite.app.view.width / 2;
    const centerY = Sprite.app.view.height - Sprite.height - Sprite.gap;

    const playerState = gameState.playerStates[gameState.playerIndex];
    if (!playerState) throw new Error();

    addAllLines(playerLines, container, centerX, centerY);
    addAllLabels(playerLabels, container, centerX, centerY, playerState, true);
}

function addLine(
    lines: (PIXI.Graphics | undefined)[],
    container: PIXI.Container,
    i: number,
    moveX: number, moveY: number,
    lineX: number, lineY: number
) {
    let line = lines[i];
    if (!line) {
        line = container.addChild(new PIXI.Graphics());
        lines[i] = line;
    }

    line.clear();
    line.lineStyle(0.05 * Sprite.pixelsPerCM, 0xffffff, 0xff);
    line.moveTo(moveX, moveY);
    line.lineTo(moveX + lineX, moveY + lineY);
}

function addAllLines(
    lines: (PIXI.Graphics | undefined)[],
    container: PIXI.Container,
    centerX: number,
    centerY: number
) {
    const horizontal = container.transform.rotation === 0 ?
        Sprite.app.view.width / 2 - Sprite.height - Sprite.gap :
        Sprite.app.view.height / 2 - Sprite.height - Sprite.gap;
    addLine(lines, container, 0, centerX, centerY, horizontal, 0);
    addLine(lines, container, 1, centerX, centerY, -horizontal, 0);
    addLine(lines, container, 2, centerX, centerY, 0, Sprite.height + Sprite.gap);
    addLine(lines, container, 3, centerX, centerY, 0, -Sprite.height - Sprite.gap);
}

function addLabel(
    labels: (PIXI.Text | undefined)[],
    container: PIXI.Container,
    i: number,
    positionX: number, positionY: number,
    s: string,
    fontSize?: number
) {
    let label = labels[i];
    // check for transform and texture to work around bug
    if (!label || !label.transform || !label.texture) {
        label = container.addChild(new PIXI.Text(s, { fill: 'white' }));
        labels[i] = label;
    }
    
    label.text = s;
    // workaround for bug
    if (label.transform) label.position.set(positionX, positionY);
    if (label.style) {
        if (fontSize) {
            label.style.fontSize = fontSize;
        } else {
            label.style.fontSize = 26;
        }
    }
}

function addAllLabels(
    labels: (PIXI.Text | undefined)[],
    container: PIXI.Container,
    centerX: number,
    centerY: number,
    playerState: Lib.PlayerState,
    playerIsYou: boolean
) {
    let shareCount = playerState.shareCount;
    let revealCount = playerState.revealCount;
    let groupCount = playerState.groupCount;
    let totalCount = playerState.totalCount;
    if (playerIsYou &&
        Input.action !== 'Deselect' &&
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

    const topY = centerY - Sprite.height - Sprite.gap - 0.075 * Sprite.pixelsPerCM;
    const topLeftCount = playerIsYou ? shareCount : totalCount - groupCount;
    const topLeftX = centerX - (topLeftCount > 0 ? Sprite.width + topLeftCount * Sprite.gap + Sprite.deckGap : Sprite.gap) - 0.75 * Sprite.pixelsPerCM;
    let i = 0, y;
    [i, y] = 上下(labels, container, i, topLeftX, topY, playerIsYou ? '得分' : '持牌', 26);
    
    const topLeftRight數 = `︵${数(playerIsYou ?
        playerState.cards.slice(0, shareCount).map(([suit, rank]) => Math.min(10, rank)).reduce((a, b) => a + b, 0) :
        topLeftCount
    )}︶`;
    [i, y] = 上下(labels, container, i, topLeftX - 0.375 * Sprite.pixelsPerCM, topY, topLeftRight數, 13);

    const topRightCount = playerIsYou ? revealCount - shareCount : groupCount - revealCount;
    const topRightX = centerX + (topRightCount > 0 ? Sprite.width + topRightCount * Sprite.gap + Sprite.deckGap : Sprite.gap);
    [i, y] = 上下(labels, container, i, topRightX, topY, playerIsYou ? '出牌' : '底牌', 26);

    const bottomY = centerY + Sprite.gap - 0.125 * Sprite.pixelsPerCM;

    const bottomLeftCount = playerIsYou ? groupCount - revealCount : revealCount - shareCount;
    const bottomLeftX = centerX - (bottomLeftCount > 0 ? Sprite.width + bottomLeftCount * Sprite.gap + Sprite.deckGap : Sprite.gap) - 0.75 * Sprite.pixelsPerCM;
    [i, y] = 上下(labels, container, i, bottomLeftX, bottomY, playerIsYou ? '底牌' : '出牌', 26);
    
    const bottomRightCount = playerIsYou ? totalCount - groupCount : shareCount;
    const bottomRightX = centerX + (bottomRightCount > 0 ? Sprite.width + bottomRightCount * Sprite.gap + Sprite.deckGap : Sprite.gap);
    [i, y] = 上下(labels, container, i, bottomRightX, bottomY, playerIsYou ? '持牌' : '得分', 26);

    const bottomRight數 = `︵${数(playerIsYou ?
        bottomRightCount :
        playerState.cards.slice(0, shareCount).map(([suit, rank]) => rank).reduce((a, b) => a + b, 0)
    )}︶`;
    [i, y] = 上下(labels, container, i, bottomRightX + 0.75 * Sprite.pixelsPerCM, bottomY, bottomRight數, 13);

    for (; i < labels.length; ++i) {
        // workaround for bug
        if (labels[i]?.texture) labels[i]?.destroy();
    }
}

function 上下(
    labels: (PIXI.Text | undefined)[],
    container: PIXI.Container,
    i: number,
    x: number,
    y: number,
    詞: string,
    fontSize: number
): [number, number] {
    for (const 字 of 詞) {
        addLabel(labels, container, i, x, y, 字, fontSize);
        ++i;
        y += fontSize * 0.03 * Sprite.pixelsPerCM;
    }

    return [i, y];
}

const digits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
function 数(n: number): string {
    if (n <= 10) {
        const digit = digits[n];
        if (!digit) throw new Error();
        return digit;
    } else if (n <= 19) {
        return `十${digits[n % 10]}`;
    } else if (n <= 99) {
        const m = n % 10;
        return `${digits[Math.floor(n / 10)]}十${m > 0 ? digits[m] : ''}`;
    } else if (n % 100 === 0) {
        return `${digits[Math.floor(n / 100)]}百`;
    } else {
        const c = Math.floor(n / 100);
        n = n % 100;
        if (n <= 9) {
            return `${digits[c]}百零${digits[n]}`;
        } else {
            const m = n % 10;
            return `${digits[c]}百${digits[Math.floor(n / 10)]}十${m > 0 ? digits[m] : ''}`;
        }
    }
}

let otherPlayerLines: (PIXI.Graphics | undefined)[][] = [];
let otherPlayerLabels: (PIXI.Text | undefined)[][] = [];

function renderOtherPlayer(deltaTime: number) {
    const gameState = Client.gameState;
    if (gameState === undefined) return;

    for (let i = 1; i < 4; ++i) {
        const playerIndex = (gameState.playerIndex + i) % 4;

        const playerState = gameState.playerStates[playerIndex];
        if (!playerState) continue;

        const faceSprites = State.faceSpritesForPlayer[playerIndex];
        if (!faceSprites) throw new Error();

        const centerX = Sprite.app.view.width / 2;
        const centerY = Sprite.height + Sprite.gap;

        let j = 0;
        for (const faceSprite of faceSprites) {
            if (j < playerState.shareCount) {
                faceSprite.target = {
                    x: centerX + (playerState.shareCount - j) * Sprite.gap,
                    y: centerY + Sprite.gap
                };
            } else {
                faceSprite.target = {
                    x: centerX - Sprite.width - (1 + j - playerState.shareCount) * Sprite.gap,
                    y: centerY + Sprite.gap
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
                    x: centerX + (localGroupCount - j) * Sprite.gap,
                    y: 0
                };
            } else {
                backSprite.target = {
                    x: centerX - Sprite.width - (1 + j - localGroupCount) * Sprite.gap,
                    y: 0
                };
            }

            backSprite.zIndex = j;
            backSprite.animate(deltaTime);

            ++j;
        }

        const container = State.playerContainers[playerIndex];
        if (!container) throw new Error();

        let lines = otherPlayerLines[playerIndex];
        if (!lines) {
            lines = [];
            otherPlayerLines[playerIndex] = lines;
        }

        addAllLines(lines, container, centerX, centerY);

        let labels = otherPlayerLabels[playerIndex];
        if (!labels) {
            labels = [];
            otherPlayerLabels[playerIndex] = labels;
        }

        addAllLabels(labels, container, centerX, centerY, playerState, false);
    }
}