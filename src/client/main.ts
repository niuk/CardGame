import * as PIXI from 'pixi.js-legacy';

import * as Lib from '../lib';
import * as Client from './client';
import * as State from './state';
import * as Input from './input';
import Sprite from './sprite';

const getPlayerNameElement = () => (<HTMLInputElement>document.getElementById('playerName'));
const getGameIdElement = () => (<HTMLInputElement>document.getElementById('gameId'));
const getFormElement = () => <HTMLDivElement>document.getElementById('form');
const getStatusElement = () => <HTMLDivElement>document.getElementById('status');

async function init() {
    const bar = <HTMLProgressElement>document.getElementById('loading-bar');
    bar.style.visibility = 'visible';
    await Sprite.load(progress => {
        bar.value = progress * 100;
        bar.max = 100;
    });
    bar.style.visibility = 'hidden';

    const gameState = Client.gameState;
    if (gameState) {
        State.setPlayerSpriteTargets(gameState);
    }
}

let currentTime: number = performance.now();

window.onload = async () => {
    (<HTMLButtonElement>document.getElementById('joinGame')).onclick = async e => {
        console.log(`joining game '${getGameIdElement().value}'...`);
    
        Lib.setCookie('playerName', getPlayerNameElement().value);
    
        try {
            await Client.setPlayerName(getPlayerNameElement().value);
            await Client.joinGame(getGameIdElement().value);
        } catch (e) {
            getStatusElement().innerHTML = `Error: ${JSON.stringify(e)}`;
            throw e;
        }
    
        getStatusElement().innerHTML = `Game: ${Client.gameState?.gameId}`;
        document.body.removeChild(getFormElement());
    
        init();
    };
    
    (<HTMLButtonElement>document.getElementById('newGame')).onclick = async e => {
        console.log(`creating new game...`);
    
        Lib.setCookie('playerName', getPlayerNameElement().value);
    
        try {
            await Client.setPlayerName(getPlayerNameElement().value);
            await Client.newGame();
        } catch (e) {
            getStatusElement().innerHTML = `Error: ${JSON.stringify(e)}`;
            throw e;
        }
    
        getStatusElement().innerHTML = `Game: ${Client.gameState?.gameId}`;
        document.body.removeChild(getFormElement());
    
        init();
    };
    
    let playerName = Lib.getCookie('playerName');
    if (!playerName) {
        playerName = '';
    }
    
    let gameId = Lib.getCookie('gameId');
    if (!gameId) {
        gameId = '';
    }
    
    getPlayerNameElement().value = decodeURI(playerName);
    getGameIdElement().value = gameId;

    getStatusElement().innerHTML = 'Connecting...';
    await Client.connect();
    getStatusElement().innerHTML = `Connected. Loading textures...`;

    const bar = <HTMLProgressElement>document.getElementById('loading-bar');
    bar.style.visibility = 'visible';
    await Sprite.load(progress => {
        bar.value = progress * 100;
        bar.max = 100;
    });
    bar.style.visibility = 'hidden';

    getStatusElement().innerHTML = 'Connected. Textures loaded.';

    const textStyle = new PIXI.TextStyle({
        fontFamily: 'sans-serif',
        fill: "white",
        dropShadow: true,
        dropShadowDistance: 0,
        dropShadowAngle: 0,
        dropShadowBlur: 3,
        padding: 3
    });
    const chars = '得分类牌持出底零一二三四五六七八九十百大小花色︵︶()';
    const 大字 = PIXI.BitmapFont.from('大字', { ...textStyle, fontSize: 26 }, { chars });
    const 小字 = PIXI.BitmapFont.from('小字', { ...textStyle, fontSize: 13 }, { chars });

    getFormElement().style.visibility = 'visible';

    Sprite.app.ticker.add(() => {
        currentTime = performance.now();
    });

    Sprite.app.ticker.add(renderDeck);
    Sprite.app.ticker.add(renderPlayer);
    Sprite.app.ticker.add(renderOtherPlayer);
}

const deckLabels: (PIXI.BitmapText | undefined)[] = [];

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
    
    let [i, y] = 上下(deckLabels, Sprite.deckContainer, 0,
        Sprite.app.view.width / 2 + Sprite.width / 2 + (1 + deckCount / 2) * Sprite.deckGap,
        Sprite.app.view.height / 2 - Sprite.height / 2,
        `︵${数(deckCount)}︶`, '小字');

    for (; i < deckLabels.length; ++i) {
        deckLabels[i]?.destroy();
    }
}

const goldenRatio = (1 + Math.sqrt(5)) / 2;

let playerLines: (PIXI.Graphics | undefined)[] = [];
let playerLabels: (PIXI.BitmapText | undefined)[] = [];

function renderPlayer(deltaTime: number) {
    const gameState = Client.gameState;
    if (!gameState) return;

    const sprites = State.faceSpritesForPlayer[gameState.playerIndex];
    if (!sprites) throw new Error();

    let i = 0;
    for (const sprite of sprites) {
        sprite.selected = Lib.binarySearchNumber(State.selectedIndices, i) >= 0;
        sprite.zIndex = i + 2;
        sprite.animate(deltaTime);

        ++i;
    }

    const container = Sprite.playerContainers[gameState.playerIndex];
    if (!container) throw new Error();

    const playerState = gameState.playerStates[gameState.playerIndex];
    if (!playerState) throw new Error();

    addAllLines(playerLines, container, true);

    const j = addAllLabels(playerLabels, container, playerState, true);
    addLabel(playerLabels, container, j + 1, 0, Sprite.app.view.height - 1.5 * Sprite.pixelsPerCM, '分类(大小)', '大字');
    addLabel(playerLabels, container, j + 2, 0, Sprite.app.view.height - 0.75 * Sprite.pixelsPerCM, '分类(花色)', '大字');

    const sortByRankLabel = playerLabels[j + 1];
    if (!sortByRankLabel) throw new Error();
    sortByRankLabel.interactive = true;
    sortByRankLabel.cursor = 'pointer';
    sortByRankLabel.on('pointerup', () => Client.sortByRank(gameState));

    const sortBySuitLabel = playerLabels[j + 2];
    if (!sortBySuitLabel) throw new Error();
    sortBySuitLabel.interactive = true;
    sortBySuitLabel.cursor = 'pointer';
    sortBySuitLabel.on('pointerup', () => Client.sortBySuit(gameState));
}

let otherPlayerLines: (PIXI.Graphics | undefined)[][] = [];
let otherPlayerLabels: (PIXI.BitmapText | undefined)[][] = [];

function renderOtherPlayer(deltaTime: number) {
    const gameState = Client.gameState;
    if (gameState === undefined) return;

    for (let i = 1; i < 4; ++i) {
        const playerIndex = (gameState.playerIndex + i) % 4;

        const playerState = gameState.playerStates[playerIndex];
        if (!playerState) continue;

        const container = Sprite.playerContainers[playerIndex];
        if (!container) throw new Error();

        const goldenX = container.transform.rotation === 0 ? Sprite.app.view.width / goldenRatio :
            (Sprite.app.view.width - Sprite.app.view.height) / 2 + Sprite.app.view.height / goldenRatio;
        const centerY = Sprite.height + Sprite.gap;

        const faceSprites = State.faceSpritesForPlayer[playerIndex];
        if (!faceSprites) throw new Error();

        let j = 0;
        for (const faceSprite of faceSprites) {
            if (j < playerState.shareCount) {
                faceSprite.target = {
                    x: goldenX + (playerState.shareCount - j) * Sprite.gap,
                    y: centerY + Sprite.gap
                };
            } else {
                faceSprite.target = {
                    x: goldenX - Sprite.width - (1 + j - playerState.shareCount) * Sprite.gap,
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
                    x: goldenX + (localGroupCount - j) * Sprite.gap,
                    y: 0
                };
            } else {
                backSprite.target = {
                    x: goldenX - Sprite.width - (1 + j - localGroupCount) * Sprite.gap,
                    y: 0
                };
            }

            backSprite.zIndex = j;
            backSprite.animate(deltaTime);

            ++j;
        }

        let lines = otherPlayerLines[playerIndex];
        if (!lines) {
            lines = [];
            otherPlayerLines[playerIndex] = lines;
        }

        addAllLines(lines, container, false);

        let labels = otherPlayerLabels[playerIndex];
        if (!labels) {
            labels = [];
            otherPlayerLabels[playerIndex] = labels;
        }

        addAllLabels(labels, container, playerState, false);
    }
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
    line.lineStyle(0.05 * Sprite.pixelsPerCM, 0xFFD700, 0x01);
    line.moveTo(moveX, moveY);
    line.lineTo(lineX, lineY);
    line.zIndex = 0;
}

function addAllLines(
    lines: (PIXI.Graphics | undefined)[],
    container: PIXI.Container,
    playerIsYou: boolean
) {
    const left = (container.transform.rotation === 0 ? 0 : Sprite.app.view.width / 2 - Sprite.app.view.height / 2) + Sprite.height + Sprite.gap;
    const right = (container.transform.rotation === 0 ? Sprite.app.view.width : Sprite.app.view.width / 2 + Sprite.app.view.height / 2) - Sprite.height - Sprite.gap;
    const centerY = playerIsYou ? Sprite.app.view.height - Sprite.height - Sprite.gap : Sprite.height + Sprite.gap;
    addLine(lines, container, 0, left, centerY, right, centerY);
    const centerX = playerIsYou ? (1 - 1 / goldenRatio) * Sprite.app.view.width :
        container.transform.rotation === 0 ? Sprite.app.view.width / goldenRatio :
            (Sprite.app.view.width - Sprite.app.view.height) / 2 + Sprite.app.view.height / goldenRatio;
    const top = playerIsYou ? Sprite.app.view.height - 2 * (Sprite.height + Sprite.gap) : 0;
    const bottom = playerIsYou ? Sprite.app.view.height : 2 * (Sprite.height + Sprite.gap);
    addLine(lines, container, 1, centerX, top, centerX, bottom);
}

function addLabel(
    labels: (PIXI.BitmapText | undefined)[],
    container: PIXI.Container,
    i: number,
    positionX: number, positionY: number,
    text: string,
    fontName: string
) {
    let label = labels[i];
    // check for transform and texture to work around bug
    if (!label || !label.transform) {
        label = container.addChild(new PIXI.BitmapText(text, { fontName }));
        labels[i] = label;
    }
    
    if (label.text !== text) {
        label.text = text;
    }

    if (label.zIndex !== 1) {
        label.zIndex = 1;
    }

    // workaround for bug
    if (label.transform && (
        label.position.x !== positionX ||
        label.position.y !== positionY
    )) {
        label.position.set(positionX, positionY);
    }
}

function addAllLabels(
    labels: (PIXI.BitmapText | undefined)[],
    container: PIXI.Container,
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

    const topY = playerIsYou ? Sprite.app.view.height - 2 * (Sprite.height + Sprite.gap) : 0;
    const goldenX = playerIsYou ? (1 - 1 / goldenRatio) * Sprite.app.view.width :
        container.transform.rotation === 0 ? Sprite.app.view.width / goldenRatio :
            (Sprite.app.view.width - Sprite.app.view.height) / 2 + Sprite.app.view.height / goldenRatio;
    const topLeftCount = playerIsYou ? shareCount : totalCount - groupCount;
    const topLeftX = goldenX - (topLeftCount > 0 ? Sprite.width + topLeftCount * Sprite.gap + Sprite.fixedGap : Sprite.gap) - 0.75 * Sprite.pixelsPerCM;
    let i = 0, y;
    [i, y] = 上下(labels, container, i, topLeftX, topY, playerIsYou ? '得分' : '持牌', '大字');
    
    const topLeftRight數 = `︵${数(playerIsYou ?
        playerState.cards.slice(0, shareCount).map(([suit, rank]) => Math.min(10, rank)).reduce((a, b) => a + b, 0) :
        topLeftCount
    )}︶`;
    [i, y] = 上下(labels, container, i, topLeftX - 0.375 * Sprite.pixelsPerCM, topY, topLeftRight數, '小字');

    const topRightCount = playerIsYou ? revealCount - shareCount : groupCount - revealCount;
    const topRightX = goldenX + (topRightCount > 0 ? Sprite.width + topRightCount * Sprite.gap + Sprite.fixedGap : Sprite.gap);
    [i, y] = 上下(labels, container, i, topRightX, topY, playerIsYou ? '出牌' : '底牌', '大字');

    const bottomY = playerIsYou ? Sprite.app.view.height - Sprite.height : Sprite.height + 2 * Sprite.gap;

    const bottomLeftCount = playerIsYou ? groupCount - revealCount : revealCount - shareCount;
    const bottomLeftX = goldenX - (bottomLeftCount > 0 ? Sprite.width + bottomLeftCount * Sprite.gap + Sprite.fixedGap : Sprite.gap) - 0.75 * Sprite.pixelsPerCM;
    [i, y] = 上下(labels, container, i, bottomLeftX, bottomY, playerIsYou ? '底牌' : '出牌', '大字');
    
    const bottomRightCount = playerIsYou ? totalCount - groupCount : shareCount;
    const bottomRightX = goldenX + (bottomRightCount > 0 ? Sprite.width + bottomRightCount * Sprite.gap + Sprite.fixedGap : Sprite.gap);
    [i, y] = 上下(labels, container, i, bottomRightX, bottomY, playerIsYou ? '持牌' : '得分', '大字');

    const bottomRight數 = `︵${数(playerIsYou ?
        bottomRightCount :
        playerState.cards.slice(0, shareCount).map(([suit, rank]) => Math.min(10, rank)).reduce((a, b) => a + b, 0)
    )}︶`;
    [i, y] = 上下(labels, container, i, bottomRightX + 0.75 * Sprite.pixelsPerCM, bottomY, bottomRight數, '小字');

    for (; i < labels.length; ++i) {
        labels[i]?.destroy();
    }

    return i;
}

function 上下(
    labels: (PIXI.BitmapText | undefined)[],
    container: PIXI.Container,
    i: number,
    x: number,
    y: number,
    詞: string,
    fontName: string
): [number, number] {
    for (const 字 of 詞) {
        addLabel(labels, container, i, x, y, 字, fontName);
        ++i;
        if (fontName === '大字') {
            y += 0.75 * Sprite.pixelsPerCM;
        } else if (fontName === '小字') {
            y += 0.375 * Sprite.pixelsPerCM;
        } else {
            throw new Error(`unknown font '${fontName}'`);
        }
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