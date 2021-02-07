import * as PIXI from 'pixi.js-legacy';

import * as Lib from '../lib';
import * as Client from './client';
import * as Input from './input';
import * as V from './vector';
import Sprite from './sprite';
import { Spritesheet } from 'pixi.js-legacy';

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
    const joinGameButton = <HTMLButtonElement>document.getElementById('joinGame');
    const newGameButton = <HTMLButtonElement>document.getElementById('newGame');
    const numPlayersSelection = <HTMLSelectElement>document.getElementById('numPlayers');
    const numDecksSelection = <HTMLSelectElement>document.getElementById('numDecks');
    joinGameButton.onclick = async e => {
        playerNameElement.disabled = true;
        gameIdElement.disabled = true;
        joinGameButton.disabled = true;
        newGameButton.disabled = true;
        numPlayersSelection.disabled = true;
        numDecksSelection.disabled = true;
        try {
            Lib.setCookie('playerName', playerNameElement.value);

            await Client.setPlayerName(playerNameElement.value);
            await Client.joinGame(gameIdElement.value);

            while (!Client.gameState) {
                await Lib.delay(100);
            }

            document.body.removeChild(formElement);
        } finally {
            playerNameElement.disabled = false;
            gameIdElement.disabled = false;
            joinGameButton.disabled = false;
            newGameButton.disabled = false;
            numPlayersSelection.disabled = false;
            numDecksSelection.disabled = false;
        }
    };

    newGameButton.onclick = async e => {
        playerNameElement.disabled = true;
        gameIdElement.disabled = true;
        joinGameButton.disabled = true;
        newGameButton.disabled = true;
        numPlayersSelection.disabled = true;
        numDecksSelection.disabled = true;
        try {
            Lib.setCookie('playerName', playerNameElement.value);

            await Client.setPlayerName(playerNameElement.value);
            await Client.newGame(
                JSON.parse(numPlayersSelection.value),
                JSON.parse(numDecksSelection.value)
            );

            while (!Client.gameState) {
                await Lib.delay(100);
            }

            document.body.removeChild(formElement);
        } finally {
            playerNameElement.disabled = false;
            gameIdElement.disabled = false;
            joinGameButton.disabled = false;
            newGameButton.disabled = false;
            numPlayersSelection.disabled = false;
            numDecksSelection.disabled = false;
        }
    };

    Sprite.onTick = deltaTime => {
        renderDeck(deltaTime);
        renderPlayer(deltaTime);
        renderOtherPlayers(deltaTime);
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

    await Client.connect();

    await spriteLoad;
}

// it takes a while for page elements to render at their new size,
// so we must wait a bit before observing their sizes
let resizeTime = Infinity;
let resizePromise = Promise.resolve();

window.onresize = async () => {
    resizeTime = performance.now() + 500;

    if (await Lib.isDone(resizePromise)) {
        resizePromise = (async () => {
            while (performance.now() < resizeTime) {
                await Lib.delay(100);
            }

            await Sprite.load(Client.gameState);
        })();
    }

    await resizePromise;
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
            deckSprite.target = Input.mouseMovePosition;
            deckSprite.rotation += 0.1 * deltaTime;
        } else if (performance.now() - deckDealTime < i * deckDealDuration / Sprite.deckSprites.length) {
            // card not yet dealt; keep top left
            deckSprite.position = { x: -Sprite.width, y: -Sprite.height };
            deckSprite.target = { x: -Sprite.width, y: -Sprite.height };
        } else {
            deckSprite.resetAnchor();
            deckSprite.target = {
                x: Sprite.app.view.width / 2 - Sprite.width / 2 - (i - Sprite.deckSprites.length / 2) * Sprite.deckGap,
                y: Sprite.app.view.height / 2 - Sprite.height / 2
            };
        }

        deckSprite.zIndex = i;
        deckSprite.animate(deltaTime);
    }

    let i = 0;
    if (Sprite.deckSprites.length > 0) {
        i = addLabel(deckLabels, Sprite.deckContainer, i,
            Sprite.app.view.width / 2 - 0.75 * Sprite.pixelsPerCM,
            Sprite.app.view.height / 2 - Sprite.height / 2 - Sprite.fixedGap - 0.75 * Sprite.pixelsPerCM,
            '洗牌',
            '大字',
            26,
            Client.shuffleDeck
        );
    }

    if (Client.gameState) {
        i = 上下(deckLabels, Sprite.deckContainer, i,
            Sprite.app.view.width / 2 + Sprite.width / 2 + (1 + Sprite.deckSprites.length / 2) * Sprite.deckGap,
            Sprite.app.view.height / 2 - Sprite.height / 2,
            `︵${数(Sprite.deckSprites.length)}︶`,
            '小字',
            13);

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

    const playerState = gameState.playerStates[gameState.playerIndex];
    const container = Sprite.playerContainers[gameState.playerIndex];
    const width = Sprite.playerWidths[gameState.playerIndex];
    const sprites = Sprite.playerFaceSprites[gameState.playerIndex];
    if (!playerState || !container || width === undefined || !sprites) throw new Error();

    const goldenX = (1 - 1 / goldenRatio) * width;

    const mouseMovePositionInContainer = container.transform.worldTransform.applyInverse(Input.mouseMovePosition);

    let cardIndex = 0;
    for (const sprite of sprites) {
        if ((
            Input.action.action === 'Give' ||
            Input.action.action === 'Return' ||
            Input.action.action === 'Reorder'
        ) && Input.selectedIndices.has(cardIndex)) {
            const i = Input.selectedIndices.indexOf(cardIndex);
            const j = Input.selectedIndices.indexOf(Input.action.cardIndex);

            const mainSprite = sprites[Input.action.cardIndex];
            if (!mainSprite) throw new Error();

            sprite.setAnchorAt(V.add(V.add(
                sprite.getTopLeftInWorld(),
                V.sub(
                    container.transform.worldTransform.apply(mainSprite.position),
                    mainSprite.getTopLeftInWorld()
                )), {
                    x: (j - i) * Sprite.gap,
                    y: 0
                })
            );

            sprite.target = mouseMovePositionInContainer;
        } else if ((
            Input.action.action === 'ControlShiftClick' ||
            Input.action.action === 'ControlClick' ||
            Input.action.action === 'ShiftClick' ||
            Input.action.action === 'Click'
        ) && (
            Input.action.cardIndex === cardIndex ||
            Input.selectedIndices.has(Input.action.cardIndex) && Input.selectedIndices.has(cardIndex)
        )) {
            sprite.target = mouseMovePositionInContainer;
        } else {
            sprite.resetAnchor();
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

    addAllLines(playerLines, goldenX, container, width, true);

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
        26,
        () => Client.sortByRank(gameState)
    );

    addLabel(playerLabels, container, k,
        Sprite.fixedGap,
        Sprite.app.view.height - 0.75 * Sprite.pixelsPerCM - Sprite.fixedGap,
        '分类(花色)',
        '大字',
        26,
        () => Client.sortBySuit(gameState)
    );
}

const otherPlayerLines: (PIXI.Graphics | undefined)[][] = [];
const otherPlayerLabels: (PIXI.BitmapText | undefined)[][] = [];

function renderOtherPlayers(deltaTime: number) {
    const gameState = Client.gameState;
    if (!gameState) return;

    for (let i = 1; i < gameState.playerStates.length; ++i) {
        const playerIndex = (gameState.playerIndex + i) % gameState.playerStates.length;

        const playerState = gameState.playerStates[playerIndex];
        if (!playerState) continue;

        const container = Sprite.playerContainers[playerIndex];
        const width = Sprite.playerWidths[playerIndex];
        const faceSprites = Sprite.playerFaceSprites[playerIndex];
        if (!container || width === undefined || !faceSprites) throw new Error();

        const goldenX = width / goldenRatio;
        const centerY = Sprite.height + Sprite.gap;

        let j = 0;
        for (const faceSprite of faceSprites) {
            if (j < playerState.shareCount) {
                if (Input.action.action === 'Take' &&
                    Input.action.playerIndex === playerIndex &&
                    Input.action.cardIndex === j
                ) {
                    faceSprite.target = container.transform.worldTransform.applyInverse(Input.mouseMovePosition);
                } else {
                    faceSprite.resetAnchor();
                    faceSprite.target = {
                        x: goldenX + (playerState.shareCount - j) * Sprite.gap,
                        y: centerY + Sprite.gap
                    };
                }
            } else {
                faceSprite.resetAnchor();
                faceSprite.target = {
                    x: goldenX - Sprite.width - (1 + j - playerState.shareCount) * Sprite.gap,
                    y: centerY + Sprite.gap
                };
            }

            faceSprite.zIndex = j;
            faceSprite.animate(deltaTime);

            ++j;
        }

        const backSprites = Sprite.playerBackSprites[playerIndex];
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

        addAllLines(lines, goldenX, container, width, false);

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
    width: number,
    playerIsYou: boolean
) {
    const centerY = playerIsYou ? Sprite.app.view.height - Sprite.height - Sprite.gap : Sprite.height + Sprite.gap;
    addLine(lines, container, 0, 1.25 * Sprite.pixelsPerCM, centerY, width - 1.25 * Sprite.pixelsPerCM, centerY);
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
    fontSize: number,
    onClick?: () => void
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
        if (onClick) {
            label.on('pointerup', onClick);
            label.interactive = true;
            label.cursor = 'pointer';
        }
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
    
    let i = 0
    let y: number;

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

    const topY = playerIsYou ? Sprite.app.view.height - 2 * (Sprite.height + Sprite.gap) : 0;
    const topLeftCount = playerIsYou ? shareCount : playerState.cardsWithOrigins.length - groupCount;
    const topLeftX = goldenX - (topLeftCount > 0 ? Sprite.width + topLeftCount * Sprite.gap + Sprite.fixedGap : Sprite.gap) - 0.548 * Sprite.pixelsPerCM;
    i = 上下(labels, container, i, topLeftX, topY, playerIsYou ? '得分' : '持牌', '中字', 19);
    
    const topLeftRight數 = `︵${数(playerIsYou ? score : topLeftCount)}︶`;
    i = 上下(labels, container, i, topLeftX - 0.375 * Sprite.pixelsPerCM, topY, topLeftRight數, '小字', 13);

    const topRightCount = playerIsYou ? revealCount - shareCount : groupCount - revealCount;
    const topRightX = goldenX + (topRightCount > 0 ? Sprite.width + topRightCount * Sprite.gap + Sprite.fixedGap : Sprite.gap);
    i = 上下(labels, container, i, topRightX, topY, playerIsYou ? '出牌' : '底牌', '中字', 19);

    const bottomY = playerIsYou ? Sprite.app.view.height - Sprite.height : Sprite.height + 2 * Sprite.gap;

    const bottomLeftCount = playerIsYou ? groupCount - revealCount : revealCount - shareCount;
    const bottomLeftX = goldenX - (bottomLeftCount > 0 ? Sprite.width + bottomLeftCount * Sprite.gap + Sprite.fixedGap : Sprite.gap) - 0.548 * Sprite.pixelsPerCM;
    i = 上下(labels, container, i, bottomLeftX, bottomY, playerIsYou ? '底牌' : '出牌', '中字', 19);
    
    const bottomRightCount = playerIsYou ? totalCount - groupCount : shareCount;
    const bottomRightX = goldenX + (bottomRightCount > 0 ? Sprite.width + bottomRightCount * Sprite.gap + Sprite.fixedGap : Sprite.gap);
    i = 上下(labels, container, i, bottomRightX, bottomY, playerIsYou ? '持牌' : '得分', '中字', 19);

    const bottomRight數 = `︵${数(playerIsYou ? bottomRightCount : score)}︶`;
    i = 上下(labels, container, i, bottomRightX + 0.548 * Sprite.pixelsPerCM, bottomY, bottomRight數, '小字', 13);

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
): number {
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

    return i;
}

const digits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
function 数(n: number): string {
    if (n < 0) {
        return `负${数(-n)}`;
    } else if (n <= 10) {
        const digit = digits[n];
        if (digit === undefined) throw new Error(`no digit character found for ${n}`);
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