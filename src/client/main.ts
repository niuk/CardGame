import * as PIXI from 'pixi.js-legacy';

import * as Lib from '../lib';
import * as Client from './client';
import * as Input from './input';
import Sprite from './sprite';

// because we can't get the callback from the label, we need to record it in a dictionary
// otherwise, this would just be a set
const labelsUsingCurrentFontsWithCallbacks = new Map<PIXI.BitmapText, (() => void) | undefined>();

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

        labelsUsingCurrentFontsWithCallbacks.clear();
    }
}

window.onload = async () => {
    console.log('Page loaded.');

    // connected; now we can activate buttons
    const backgroundLeftElement = <HTMLInputElement>document.getElementById('backgroundLeft');
    backgroundLeftElement.onclick = () => Sprite.backgroundBackward();

    const backgroundRightElement = <HTMLInputElement>document.getElementById('backgroundRight');
    backgroundRightElement.onclick = () => Sprite.backgroundForward();

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

    Sprite.onTick = (deltaTime: number) => {
        renderDeck(deltaTime);
        renderPlayers(deltaTime);
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

    playerNameElement.value = playerName;
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

    if (Client.gameState) {
        let i = 上下(deckLabels, Sprite.deckContainer, 0,
            Sprite.app.view.width / 2 - Sprite.width / 2 - Sprite.deckSprites.length / 2 * Sprite.deckGap - 0.75 * Sprite.pixelsPerCM,
            Sprite.app.view.height / 2 - Sprite.height / 2,
            '洗牌',
            '大字',
            26,
            Client.shuffleDeck
        );

        i = 上下(deckLabels, Sprite.deckContainer, i,
            Sprite.app.view.width / 2 - Sprite.width / 2 - Sprite.deckSprites.length / 2 * Sprite.deckGap - 1.5 * Sprite.pixelsPerCM,
            Sprite.app.view.height / 2 - Sprite.height / 2,
            Client.gameState.dispensing ? '停牌' : '发牌',
            '大字',
            26,
            Client.dispense
        );

        i = 上下(deckLabels, Sprite.deckContainer, i,
            Sprite.app.view.width / 2 - Sprite.width / 2 - Sprite.deckSprites.length / 2 * Sprite.deckGap - 2.25 * Sprite.pixelsPerCM,
            Sprite.app.view.height / 2 - Sprite.height / 2,
            '回牌',
            '大字',
            26,
            Client.reset
        );
    
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
const playerLines: (PIXI.Graphics | undefined)[][] = [];
const playerLabels: (PIXI.BitmapText | undefined)[][] = [];
const playerKickers: ((() => void) | undefined)[] = [];

let playerNotesElement: HTMLInputElement | undefined = undefined;
let playerNotesPosition = new PIXI.Point();
let previousNotes = '';

function renderPlayers(deltaTime: number) {
    const gameState = Client.gameState;
    if (!gameState) return;

    for (let playerIndex = 0; playerIndex < gameState.playerStates.length; ++playerIndex) {
        const playerState = gameState.playerStates[playerIndex];

        if (playerState && !playerState.present) {
            if (!playerKickers[playerIndex]) {
                playerKickers[playerIndex] = () => Client.kickPlayer(playerIndex);
            }
        } else {
            if (playerKickers[playerIndex]) {
                playerKickers[playerIndex] = undefined;
            }
        }

        if (!playerState) {
            const lines = playerLines[playerIndex];
            if (lines) {
                removeAllLines(lines);
            }

            const labels = playerLabels[playerIndex];
            if (labels) {
                removeAllLabels(labels);
            }

            continue;
        }

        const width = Sprite.widths[playerIndex];
        const container = Sprite.containers[playerIndex];
        const reverse = Sprite.reverse[playerIndex];
        const faceSprites = Sprite.playerFaceSprites[playerIndex];
        const backSprites = Sprite.playerBackSprites[playerIndex];
        if (width === undefined || !container || reverse === undefined || !faceSprites || !backSprites) throw new Error();

        const goldenX = reverse ? width / goldenRatio : width * (1 - 1 / goldenRatio);

        for (let cardIndex = 0; cardIndex < playerState.cardsWithOrigins.length; ++cardIndex) {
            let sprite: Sprite | undefined;
            if (cardIndex < playerState.revealCount || playerIndex === gameState.playerIndex) {
                sprite = faceSprites[cardIndex];
            } else {
                sprite = backSprites[cardIndex - playerState.revealCount];
            }

            if (!sprite) throw new Error();

            if (Input.action.action === 'Take' &&
                Input.action.playerIndex === playerIndex &&
                Input.action.cardIndex === cardIndex ||
                playerIndex === gameState.playerIndex && ((
                    Input.action.action === 'ControlShiftClick' ||
                    Input.action.action === 'ControlClick' ||
                    Input.action.action === 'ShiftClick' ||
                    Input.action.action === 'Click'
                ) && (
                    Input.action.cardIndex === cardIndex ||
                    Input.selectedIndices.has(Input.action.cardIndex) && Input.selectedIndices.has(cardIndex)
                ) || (
                    Input.action.action === 'Give' ||
                    Input.action.action === 'Return' ||
                    Input.action.action === 'Reorder'
                ) && (
                    Input.selectedIndices.has(cardIndex)
                )
            )) {
                sprite.target = container.transform.worldTransform.applyInverse(Input.mouseMovePosition);
            } else {
                const count = cardIndex < playerState.revealCount ?
                    cardIndex - playerState.shareCount :
                    cardIndex - playerState.groupCount;

                if (reverse) {
                    if (count < 0) {
                        sprite.target.x = goldenX - (count + 1) * Sprite.gap;
                    } else {
                        sprite.target.x = goldenX - count * Sprite.gap - Sprite.width;
                    }
                } else {
                    if (count < 0) {
                        sprite.target.x = goldenX + (count + 1) * Sprite.gap - Sprite.width;
                    } else {
                        sprite.target.x = goldenX + count * Sprite.gap;
                    }
                }
    
                sprite.target.y = (cardIndex < playerState.revealCount) === reverse ? Sprite.height : 0;    

                sprite.resetAnchor();
            }

            sprite.selected = gameState.playerIndex === playerIndex && Input.selectedIndices.has(cardIndex);
            sprite.zIndex = cardIndex;
            sprite.animate(deltaTime);
        }

        let lines = playerLines[playerIndex];
        if (!lines) {
            lines = [];
            playerLines[playerIndex] = lines;
        }

        addAllLines(lines, 0, container, reverse, width);

        let labels = playerLabels[playerIndex];
        if (!labels) {
            labels = [];
            playerLabels[playerIndex] = labels;
        }

        addAllLabels(
            labels,
            container,
            reverse,
            width,
            playerIndex,
            playerState,
            playerState.shareCount,
            playerState.revealCount,
            playerState.groupCount,
            playerState.cardsWithOrigins.length,
            playerIndex === gameState.playerIndex
        );
    }
}

function addLine(
    lines: (PIXI.Graphics | undefined)[],
    container: PIXI.Container,
    i: number,
    moveX: number, moveY: number,
    lineX: number, lineY: number
): number {
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

    return i + 1;
}

function addAllLines(
    lines: (PIXI.Graphics | undefined)[],
    i: number,
    container: PIXI.Container,
    reverse: boolean,
    width: number
) {
    const goldenX = reverse ?
        width / goldenRatio :
        width * (1 - 1 / goldenRatio);
    i = addLine(lines, container, i, 0, 0, width, 0);
    i = addLine(lines, container, i, 0, 0, 0, 2 * Sprite.height);
    i = addLine(lines, container, i, width, 0, width, 2 * Sprite.height);
    i = addLine(lines, container, i, 0, 2 * Sprite.height, width, 2 * Sprite.height);
    i = addLine(lines, container, i, 0, Sprite.height, width, Sprite.height);
    i = addLine(lines, container, i, goldenX, 0, goldenX, 2 * Sprite.height);
}

function removeAllLines(lines: (PIXI.Graphics | undefined)[]) {
    lines.map(line => line?.destroy());
    lines.fill(undefined);
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

    if (label && !labelsUsingCurrentFontsWithCallbacks.has(label)) {
        label.destroy();
        label = undefined;
        labels[i] = undefined;
        console.log(`destroyed ${text} at ${i} because fonts changed`);
    }

    // workaround for a bug
    if (label && label.transform === null) {
        labelsUsingCurrentFontsWithCallbacks.delete(label);
        label.destroy();
        label = undefined;
        labels[i] = undefined;
        console.log(`destroyed ${text} at ${i} because of bug`);
    }

    if (!label) {
        console.log(`creating ${text} at ${i} because of null or undefined label`, label, labelsUsingCurrentFontsWithCallbacks);
        label = container.addChild(new PIXI.BitmapText(text, { fontName }));
        labels[i] = label;
        labelsUsingCurrentFontsWithCallbacks.set(label, undefined);
    }

    if (label.zIndex !== 1) {
        label.zIndex = 1;
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

    if (labelsUsingCurrentFontsWithCallbacks.get(label) !== onClick) {
        labelsUsingCurrentFontsWithCallbacks.set(label, onClick);

        // remove previous callback
        label.off('pointerup');

        if (onClick) {
            label.on('pointerup', onClick);
            label.interactive = true;
            label.cursor = 'pointer';
            console.log(`${text} at ${i} has onClick`, onClick);
        } else {
            label.interactive = false;
            label.cursor = 'auto';
            console.log(`${text} at ${i} has no onClick`);
        }
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

function 上下(
    labels: (PIXI.BitmapText | undefined)[],
    container: PIXI.Container,
    i: number,
    x: number,
    y: number,
    詞: string,
    fontName: string,
    fontSize: number,
    onClick?: () => void
): number {
    for (const 字 of 詞) {
        i = addLabel(labels, container, i, x, y, 字, fontName, fontSize, onClick);

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

function addAllLabels(
    labels: (PIXI.BitmapText | undefined)[],
    container: PIXI.Container,
    reverse: boolean,
    width: number,
    playerIndex: number,
    playerState: Lib.PlayerState,
    shareCount: number,
    revealCount: number,
    groupCount: number,
    totalCount: number,
    playerIsMe: boolean
) {
    const score = playerState.cardsWithOrigins.slice(0, shareCount).map(([card, origin]) => {
        if (card) {
            const [suit, rank] = card;
            return Math.min(10, rank);
        }

        return 0;
    }).reduce((a, b) => a + b, 0);
    
    let i = 0;
    const goldenX = reverse ? width / goldenRatio : width * (1 - 1 / goldenRatio);

    let name = playerState.name + (playerState.present ? '' : '(踢?)');
    const nameMetrics = PIXI.TextMetrics.measureText(name, textStyle);
    const nameX = goldenX - nameMetrics.width - Sprite.gap;
    const nameY = reverse ? 2 * Sprite.height : -nameMetrics.height;
    i = addLabel(labels, container, i,
        nameX,
        nameY,
        name,
        '大字',
        26,
        playerKickers[playerIndex]
    );

    if (playerIsMe) {
        if (!playerNotesElement) {
            playerNotesElement = document.createElement('input');
            playerNotesElement.style.position = 'absolute'
            playerNotesElement.style.zIndex = '1';

            document.body.appendChild(playerNotesElement);

            (async () => {
                while (true) {
                    await Lib.delay(1000);

                    const notes = playerNotesElement.value;
                    if (previousNotes !== notes) {
                        previousNotes = notes;
                        await Client.setPlayerNotes(notes);
                    }
                }
            })();
        }

        container.toGlobal({ x: goldenX + Sprite.gap, y: nameY }, playerNotesPosition);
        playerNotesElement.style.left = `${playerNotesPosition.x}px`;
        playerNotesElement.style.top = `${playerNotesPosition.y}px`;
    } else {
        i = addLabel(labels, container, i,
            goldenX + Sprite.gap,
            nameY,
            playerState.notes,
            '大字',
            26
        );
    }

    const getOffset = (x: number) => x > 0 ? (x - 1) * Sprite.gap + Sprite.width : 0;

    const outerY = reverse ? Sprite.height : 0;
    const shareX = reverse ?
        goldenX + getOffset(shareCount) :
        goldenX - getOffset(shareCount) - 0.548 * Sprite.pixelsPerCM;
    i = 上下(labels, container, i, shareX, outerY, '得分', '中字', 19);

    const 得分X = reverse ?
        shareX + 0.548 * Sprite.pixelsPerCM :
        shareX - 0.375 * Sprite.pixelsPerCM;
    i = 上下(labels, container, i, 得分X, outerY, `︵${数(score)}︶`, '小字', 13);

    const 出牌X = reverse ?
        goldenX - getOffset(revealCount - shareCount) - 0.548 * Sprite.pixelsPerCM :
        goldenX + getOffset(revealCount - shareCount);
    i = 上下(labels, container, i, 出牌X, outerY, '出牌', '中字', 19);

    const innerY = reverse ? 0 : Sprite.height;
    const 底牌X = reverse ?
        goldenX + getOffset(groupCount - revealCount) :
        goldenX - getOffset(groupCount - revealCount) - 0.548 * Sprite.pixelsPerCM;
    i = 上下(labels, container, i, 底牌X, innerY, '底牌', '中字', 19);

    const 持牌X = reverse ?
        goldenX - getOffset(totalCount - groupCount) -  0.548 * Sprite.pixelsPerCM :
        goldenX + getOffset(totalCount - groupCount);
    i = 上下(labels, container, i, 持牌X, innerY, '持牌', '中字', 19);

    const hiddenX = reverse ?
        持牌X - 0.375 * Sprite.pixelsPerCM :
        持牌X + 0.548 * Sprite.pixelsPerCM;
    i = 上下(labels, container, i, hiddenX, innerY, `︵${数(totalCount - groupCount)}︶`, '小字', 13);

    const gameState = Client.gameState;
    if (gameState && gameState.playerIndex == playerIndex) {
        i = addLabel(labels, container, i,
            -3.25 * Sprite.pixelsPerCM,
            2 * Sprite.height - 1.5 * Sprite.pixelsPerCM,
            '分类(大小)',
            '大字',
            26,
            Client.sortByRank
        );

        i = addLabel(labels, container, i,
            -3.25 * Sprite.pixelsPerCM,
            2 * Sprite.height - 0.75 * Sprite.pixelsPerCM,
            '分类(花色)',
            '大字',
            26,
            Client.sortBySuit
        );
    }

    for (; i < labels.length; ++i) {
        labels[i]?.destroy();
        labels[i] = undefined;
    }

    return i;
}

function removeAllLabels(labels: (PIXI.BitmapText | undefined)[]) {
    labels.map(label => label?.destroy());
    labels.fill(undefined);
}
