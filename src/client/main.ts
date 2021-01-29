import * as PIXI from 'pixi.js-legacy';

import * as Lib from '../lib';
import * as Client from './client';
import * as Input from './input';
import * as V from './vector';
import Sprite from './sprite';

const labelsUsingCurrentFonts = new Set<PIXI.BitmapText>();

let 大字: PIXI.BitmapFont | undefined;
let 中字: PIXI.BitmapFont | undefined;
let 小字: PIXI.BitmapFont | undefined;

const characters = new Set<string>();
const textStyle = new PIXI.TextStyle({
    fontFamily: 'sans-serif',
    fill: 'white',
    dropShadow: true,
    dropShadowDistance: 0,
    dropShadowAngle: 0,
    dropShadowBlur: 3,
    padding: 3
});

function addCharsFromText(text: string) {
    let missing = false;
    for (const c of text) {
        if (!characters.has(c)) {
            characters.add(c);
            missing = true;
        }
    }

    if (missing) {
        const chars = Array.from(characters);
    
        大字?.destroy();
        大字 = PIXI.BitmapFont.from('大字', { ...textStyle, fontSize: 26 }, { chars });

        中字?.destroy();
        中字 = PIXI.BitmapFont.from('中字', { ...textStyle, fontSize: 19 }, { chars });

        小字?.destroy();
        小字 = PIXI.BitmapFont.from('小字', { ...textStyle, fontSize: 13 }, { chars });

        labelsUsingCurrentFonts.clear();
    }
}

window.onload = async () => {
    // connected; now we can activate buttons
    const playerNameElement = <HTMLInputElement>document.getElementById('playerName');
    const gameIdElement = <HTMLInputElement>document.getElementById('gameId');
    const formElement = <HTMLDivElement>document.getElementById('form');
    const statusElement = <HTMLDivElement>document.getElementById('status');
    const joinGameButton = <HTMLButtonElement>document.getElementById('joinGame');
    const newGameButton = <HTMLButtonElement>document.getElementById('newGame');
    joinGameButton.onclick = async e => {
        playerNameElement.disabled = true;
        gameIdElement.disabled = true;
        joinGameButton.disabled = true;
        newGameButton.disabled = true;
        try {
            statusElement.innerHTML = `Joining game: ${gameIdElement.value}...`;

            Lib.setCookie('playerName', playerNameElement.value);

            await Sprite.load(undefined);

            try {
                await Client.setPlayerName(playerNameElement.value);
                await Client.joinGame(gameIdElement.value);
            } catch (e) {
                statusElement.innerHTML = `Error: ${JSON.stringify(e)}`;
                throw e;
            }

            while (!Client.gameState) {
                await Lib.delay(100);
            }

            statusElement.innerHTML = `Game: ${Client.gameState.gameId}`;
            document.body.removeChild(formElement);
        
            await Sprite.load(Client.gameState);
        } finally {
            playerNameElement.disabled = false;
            gameIdElement.disabled = false;
            joinGameButton.disabled = false;
            newGameButton.disabled = false;
        }
    };

    newGameButton.onclick = async e => {
        playerNameElement.disabled = true;
        gameIdElement.disabled = true;
        joinGameButton.disabled = true;
        newGameButton.disabled = true;
        try {
            statusElement.innerHTML = `Creating a new game...`;

            Lib.setCookie('playerName', playerNameElement.value);

            await Sprite.load(undefined);

            try {
                await Client.setPlayerName(playerNameElement.value);
                await Client.newGame();
            } catch (e) {
                statusElement.innerHTML = `Error: ${JSON.stringify(e)}`;
                throw e;
            }

            while (!Client.gameState) {
                await Lib.delay(100);
            }

            statusElement.innerHTML = `Game: ${Client.gameState.gameId}`;
            document.body.removeChild(formElement);

            await Sprite.load(Client.gameState);
        } finally {
            playerNameElement.disabled = false;
            gameIdElement.disabled = false;
            joinGameButton.disabled = false;
            newGameButton.disabled = false;
        }
    };

    Sprite.onTick = deltaTime => {
        renderDeck(deltaTime);
        renderPlayer(deltaTime);
        renderOtherPlayer(deltaTime);
    };

    const spriteLoad = Sprite.load(undefined);

    let playerName = Lib.getCookie('playerName');
    if (playerName === undefined) {
        playerName = '';
    }
    
    let gameId = Lib.getCookie('gameId');
    if (gameId === undefined) {
        gameId = '';
    }

    playerNameElement.value = decodeURI(playerName);
    gameIdElement.value = gameId;

    // connect before we allow creating or joining games
    statusElement.innerHTML = 'Connecting...';
    await Client.connect();
    statusElement.innerHTML = `Connected.`;

    await spriteLoad;
}

// it takes a while for page elements to render at their new size,
// so we must wait a bit before observing their sizes
let resizeTime = Infinity;
let resize: Promise<void> | undefined;

window.onresize = async () => {
    resizeTime = performance.now() + 500;

    if (!resize) {
        resize = (async () => {
            while (!Client.gameState || performance.now() < resizeTime) {
                await Lib.delay(100);
            }

            Sprite.load(Client.gameState);

            resize = undefined;
        })();
    }
};

const deckLabels: (PIXI.BitmapText | undefined)[] = [];

const deckDealDuration = 1000;
let deckDealTime: number | undefined = undefined;
function renderDeck(deltaTime: number) {
    if (deckDealTime === undefined) {
        deckDealTime = performance.now();
    }

    for (let i = 0; i < Sprite.deckSprites.length; ++i) {
        const deckSprite = Sprite.deckSprites[i];
        if (!deckSprite) throw new Error();

        if (i === Sprite.deckSprites.length - 1 &&
            Input.action.action === 'Draw'
        ) {
            deckSprite.target = V.add(Input.mouseMovePosition, Input.action.spriteOffset);
        } else if (performance.now() - deckDealTime < i * deckDealDuration / Sprite.deckSprites.length) {
            // card not yet dealt; keep top left
            deckSprite.position = { x: -Sprite.width, y: -Sprite.height };
            deckSprite.target = { x: -Sprite.width, y: -Sprite.height };
        } else {
            deckSprite.target = {
                x: Sprite.app.view.width / 2 - Sprite.width / 2 - (i - Sprite.deckSprites.length / 2) * Sprite.deckGap,
                y: Sprite.app.view.height / 2 - Sprite.height / 2
            };
        }

        deckSprite.zIndex = i;
        deckSprite.animate(deltaTime);
    }
    
    if (Client.gameState) {
        let [i, y] = 上下(deckLabels, Sprite.deckContainer, 0,
            Sprite.app.view.width / 2 + Sprite.width / 2 + (1 + Sprite.deckSprites.length / 2) * Sprite.deckGap,
            Sprite.app.view.height / 2 - Sprite.height / 2,
            `︵${数(Sprite.deckSprites.length)}︶`,
            '小字',
            13);

        y = y;

        for (; i < deckLabels.length; ++i) {
            deckLabels[i]?.destroy();
            deckLabels[i] = undefined;
        }
    }
}

const goldenRatio = (1 + Math.sqrt(5)) / 2;

const playerLines: (PIXI.Graphics | undefined)[] = [];
const playerLabels: (PIXI.BitmapText | undefined)[] = [];

function renderPlayer(deltaTime: number) {
    const gameState = Client.gameState;
    if (!gameState) return;

    const container = Sprite.playerContainers[gameState.playerIndex];
    if (!container) throw new Error();

    const playerState = gameState.playerStates[gameState.playerIndex];
    if (!playerState) throw new Error();

    const sprites = Sprite.faceSpritesForPlayer[gameState.playerIndex];
    if (!sprites) throw new Error();

    const goldenX = (1 - 1 / goldenRatio) * Sprite.app.view.width;

    let cardIndex = 0;
    const dragSprites: Sprite[] = [];
    for (const sprite of sprites) {
        if (Input.selectedIndices.has(cardIndex) && (
            Input.action.action === 'Give' ||
            Input.action.action === 'Return' ||
            Input.action.action === 'Reorder'
        )) {
            if (cardIndex <= Input.action.cardIndex) {
                for (const previousDragSprite of dragSprites) {
                    previousDragSprite.target = V.sub(previousDragSprite.target, { x: Sprite.gap, y: 0 });
                }

                sprite.target = V.add(Input.mouseMovePosition, Input.action.spriteOffset);
                dragSprites.push(sprite);
            } else {
                const lastDragSprite = dragSprites[dragSprites.length - 1];
                if (!lastDragSprite) throw new Error();
                sprite.target = V.add(lastDragSprite.target, { x: Sprite.gap, y: 0 });
                dragSprites.push(sprite);
            }
        } else if (Input.selectedIndices.has(cardIndex) && (
            Input.action.action === 'ControlShiftClick' ||
            Input.action.action === 'ControlClick' ||
            Input.action.action === 'ShiftClick' ||
            Input.action.action === 'Click'
        ) && (Input.action.cardIndex === cardIndex || Input.selectedIndices.has(Input.action.cardIndex))) {
            if (Input.action.cardIndex === cardIndex) {
                sprite.target = V.add(Input.mouseMovePosition, Input.action.spriteOffset);
            } else {
                const offset = Input.action.selectedSpriteOffsets[cardIndex];
                if (!offset) throw new Error();
                sprite.target = V.add(Input.mouseMovePosition, offset);
            }
        } else {
            if (cardIndex < playerState.shareCount) {
                sprite.target = {
                    x: goldenX - Sprite.width + (cardIndex - playerState.shareCount) * Sprite.gap,
                    y: Sprite.app.view.height - 2 * Sprite.height - 2 * Sprite.gap
                };
            } else if (cardIndex < playerState.revealCount) {
                sprite.target = {
                    x: goldenX + (1 + cardIndex - playerState.shareCount) * Sprite.gap,
                    y: Sprite.app.view.height - 2 * Sprite.height - 2 * Sprite.gap
                };
            } else {
                if (cardIndex < playerState.groupCount) {
                    sprite.target = {
                        x: goldenX - Sprite.width + (cardIndex - playerState.revealCount - (playerState.groupCount - playerState.revealCount)) * Sprite.gap,
                        y: Sprite.app.view.height - Sprite.height
                    };
                } else {
                    sprite.target = {
                        x: goldenX + (1 + cardIndex - playerState.groupCount) * Sprite.gap,
                        y: Sprite.app.view.height - Sprite.height
                    };
                }
            }    
        }

        // 0 is for lines, 1 is for labels, so + 2 to draw on top of them
        sprite.zIndex = 2 + cardIndex;
        sprite.selected = Input.selectedIndices.has(cardIndex);

        ++cardIndex;
    }

    // since we might shift dragSprites to the left in each iteration, we can't animate inside the previous loop
    // instead, we must animate after the previous loop is done setting targets
    for (const sprite of sprites) {
        sprite.animate(deltaTime);
    }

    addAllLines(playerLines, goldenX, container, true);

    let shareCount = playerState.shareCount;
    let revealCount = playerState.revealCount;
    let groupCount = playerState.groupCount;
    let totalCount = playerState.cardsWithOrigins.length;
    if (Input.action.action === 'Return' ||
        Input.action.action === 'Give'
    ) {
        Input.selectedIndices.forEach((selectedIndex: number) => {
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
        });
    }

    const j = addAllLabels(
        playerLabels,
        goldenX,
        container,
        playerState,
        true,
        shareCount,
        revealCount,
        groupCount,
        totalCount
    );

    const k = addLabel(playerLabels, container, j,
        Sprite.fixedGap,
        Sprite.app.view.height - 1.5 * Sprite.pixelsPerCM - 2 * Sprite.fixedGap,
        '分类(大小)',
        '大字',
        26
    );
    addLabel(playerLabels, container, k,
        Sprite.fixedGap,
        Sprite.app.view.height - 0.75 * Sprite.pixelsPerCM - Sprite.fixedGap,
        '分类(花色)',
        '大字',
        26
    );

    const sortByRankLabel = playerLabels[j];
    if (!sortByRankLabel) throw new Error();
    sortByRankLabel.interactive = true;
    sortByRankLabel.cursor = 'pointer';
    sortByRankLabel.on('pointerup', () => Client.sortByRank(gameState));

    const sortBySuitLabel = playerLabels[k];
    if (!sortBySuitLabel) throw new Error();
    sortBySuitLabel.interactive = true;
    sortBySuitLabel.cursor = 'pointer';
    sortBySuitLabel.on('pointerup', () => Client.sortBySuit(gameState));
}

const otherPlayerLines: (PIXI.Graphics | undefined)[][] = [];
const otherPlayerLabels: (PIXI.BitmapText | undefined)[][] = [];

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

        const faceSprites = Sprite.faceSpritesForPlayer[playerIndex];
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

        const backSprites = Sprite.backSpritesForPlayer[playerIndex];
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

        addAllLines(lines, goldenX, container, false);

        let labels = otherPlayerLabels[playerIndex];
        if (!labels) {
            labels = [];
            otherPlayerLabels[playerIndex] = labels;
        }

        addAllLabels(
            labels,
            goldenX,
            container,
            playerState,
            false,
            playerState.shareCount,
            playerState.revealCount,
            playerState.groupCount,
            playerState.cardsWithOrigins.length
        );
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
    goldenX: number,
    container: PIXI.Container,
    playerIsYou: boolean
) {
    const left = (container.transform.rotation === 0 ? 0 : Sprite.app.view.width / 2 - Sprite.app.view.height / 2) + Sprite.height + Sprite.gap;
    const right = (container.transform.rotation === 0 ? Sprite.app.view.width : Sprite.app.view.width / 2 + Sprite.app.view.height / 2) - Sprite.height - Sprite.gap;
    const centerY = playerIsYou ? Sprite.app.view.height - Sprite.height - Sprite.gap : Sprite.height + Sprite.gap;
    addLine(lines, container, 0, left, centerY, right, centerY);
    const top = playerIsYou ? Sprite.app.view.height - 2 * (Sprite.height + Sprite.gap) : 0;
    const bottom = playerIsYou ? Sprite.app.view.height : 2 * (Sprite.height + Sprite.gap);
    addLine(lines, container, 1, goldenX, top, goldenX, bottom);
}

function addLabel(
    labels: (PIXI.BitmapText | undefined)[],
    container: PIXI.Container,
    i: number,
    positionX: number, positionY: number,
    text: string,
    fontName: string,
    fontSize: number
): number {
    addCharsFromText(text);

    let label = labels[i];

    if (label && !labelsUsingCurrentFonts.has(label)) {
        label.destroy();
        label = undefined;
        labels[i] = undefined;
    }

    // workaround for a bug
    if (label && label.transform === null) {
        labelsUsingCurrentFonts.delete(label);
        label.destroy();
        label = undefined;
        labels[i] = undefined;
    }

    if (!label) {
        label = container.addChild(new PIXI.BitmapText(text, { fontName }));
        label.zIndex = 1;
        labels[i] = label;
        labelsUsingCurrentFonts.add(label);
    }
    
    if (label.text !== text) {
        label.text = text;
    }

    if (label.fontName !== fontName) {
        label.fontName = fontName;
    }

    if (label.fontSize !== fontSize) {
        label.fontSize = fontSize;
    }

    // check for valid transform to work around a bug
    if (label.transform !== null && (
        label.position.x !== positionX ||
        label.position.y !== positionY
    )) {
        label.position.set(positionX, positionY);
    }

    return i + 1;
}

function addAllLabels(
    labels: (PIXI.BitmapText | undefined)[],
    goldenX: number,
    container: PIXI.Container,
    playerState: Lib.PlayerState,
    playerIsYou: boolean,
    shareCount: number,
    revealCount: number,
    groupCount: number,
    totalCount: number
) {
    const score = playerState.cardsWithOrigins.slice(0, shareCount).map(([card, origin]) => {
        if (card) {
            const [suit, rank] = card;
            return Math.min(10, rank);
        }

        return 0;
    }).reduce((a, b) => a + b, 0);

    const topY = playerIsYou ? Sprite.app.view.height - 2 * (Sprite.height + Sprite.gap) : 0;
    const topLeftCount = playerIsYou ? shareCount : playerState.cardsWithOrigins.length - groupCount;
    const topLeftX = goldenX - (topLeftCount > 0 ? Sprite.width + topLeftCount * Sprite.gap + Sprite.fixedGap : Sprite.gap) - 0.548 * Sprite.pixelsPerCM;
    let i = 0, y;
    [i, y] = 上下(labels, container, i, topLeftX, topY, playerIsYou ? '得分' : '持牌', '中字', 19);
    
    const topLeftRight數 = `︵${数(playerIsYou ? score : topLeftCount)}︶`;
    [i, y] = 上下(labels, container, i, topLeftX - 0.375 * Sprite.pixelsPerCM, topY, topLeftRight數, '小字', 13);

    const topRightCount = playerIsYou ? revealCount - shareCount : groupCount - revealCount;
    const topRightX = goldenX + (topRightCount > 0 ? Sprite.width + topRightCount * Sprite.gap + Sprite.fixedGap : Sprite.gap);
    [i, y] = 上下(labels, container, i, topRightX, topY, playerIsYou ? '出牌' : '底牌', '中字', 19);

    const bottomY = playerIsYou ? Sprite.app.view.height - Sprite.height : Sprite.height + 2 * Sprite.gap;

    const bottomLeftCount = playerIsYou ? groupCount - revealCount : revealCount - shareCount;
    const bottomLeftX = goldenX - (bottomLeftCount > 0 ? Sprite.width + bottomLeftCount * Sprite.gap + Sprite.fixedGap : Sprite.gap) - 0.548 * Sprite.pixelsPerCM;
    [i, y] = 上下(labels, container, i, bottomLeftX, bottomY, playerIsYou ? '底牌' : '出牌', '中字', 19);
    
    const bottomRightCount = playerIsYou ? totalCount - groupCount : shareCount;
    const bottomRightX = goldenX + (bottomRightCount > 0 ? Sprite.width + bottomRightCount * Sprite.gap + Sprite.fixedGap : Sprite.gap);
    [i, y] = 上下(labels, container, i, bottomRightX, bottomY, playerIsYou ? '持牌' : '得分', '中字', 19);

    const bottomRight數 = `︵${数(playerIsYou ? bottomRightCount : score)}︶`;
    [i, y] = 上下(labels, container, i, bottomRightX + 0.548 * Sprite.pixelsPerCM, bottomY, bottomRight數, '小字', 13);
    
    const nameMetrics = PIXI.TextMetrics.measureText(playerState.name, textStyle);
    const nameY = playerIsYou ?
        Sprite.app.view.height - 2 * (Sprite.height + Sprite.gap) - 0.75 * Sprite.pixelsPerCM - Sprite.fixedGap :
        2 * (Sprite.height + Sprite.gap) + Sprite.fixedGap;
    i = addLabel(labels, container, i,
        goldenX - nameMetrics.width / 2,
        nameY,
        playerState.name,
        '大字',
        26
    );

    for (; i < labels.length; ++i) {
        labels[i]?.destroy();
        labels[i] = undefined;
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
    fontName: string,
    fontSize: number
): [number, number] {
    for (const 字 of 詞) {
        i = addLabel(labels, container, i, x, y, 字, fontName, fontSize);

        if (fontName === '大字') {
            y += 0.75 * Sprite.pixelsPerCM;
        } else if (fontName === '中字') {
            y += 0.548 * Sprite.pixelsPerCM;
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
        if (digit === undefined) throw new Error();
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