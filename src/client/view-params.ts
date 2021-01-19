import * as PIXI from 'pixi.js'
import Vector from './vector';

// setup according to https://www.npmjs.com/package/pixi.js/v/5.0.0-rc
export const app = new PIXI.Application();
document.body.appendChild(app.view);

// get pixels per centimeter, which is constant
const testElement = document.createElement('div');
testElement.style.width = '1cm';
document.body.appendChild(testElement);
export const pixelsPerCM = testElement.offsetWidth;
document.body.removeChild(testElement);

// these parameters change with resizing
export let pixelsPerPercent = 0;

export let spriteWidth: number;
export let spriteHeight: number;
export let spriteGap: number;
export let spriteDeckGap: number;

export let sortByRankFont: string;
export let sortByRankBounds: [Vector, Vector];

export let sortBySuitFont: string;
export let sortBySuitBounds: [Vector, Vector];

export let waitFont: string;
export let waitBounds: [Vector, Vector];

export let proceedFont: string;
export let proceedBounds: [Vector, Vector];

export let readyFont: string;
export let readyBounds: [Vector, Vector];

export let countdownFont: string;
export let countdownBounds: [Vector, Vector];

export function recalculateParameters() {
/*
    pixelsPerPercent = canvas.height / 100;
    spriteWidth = 12 * pixelsPerPercent;
    spriteHeight = 18 * pixelsPerPercent;
    spriteGap = 2 * pixelsPerPercent;
    spriteDeckGap = 0.5 * pixelsPerPercent;

    sortByRankBounds = [new Vector(0, 0), new Vector(0, 0)];

    sortBySuitBounds = [new Vector(0, 0), new Vector(0, 0)];

    const approvePosition = new Vector(canvas.width - 2 * spriteHeight, canvas.height - 11 * spriteHeight / 12);
    waitFont = `${spriteHeight / 3}px Sugarlike`;
    waitBounds = [approvePosition, getBottomRight('Wait!', waitFont, approvePosition)];

    const disapprovePosition = new Vector(canvas.width - 2 * spriteHeight, canvas.height - 5 * spriteHeight / 12);
    proceedFont = `${spriteHeight / 3}px Sugarlike`;
    proceedBounds = [disapprovePosition, getBottomRight('Proceed.', proceedFont, disapprovePosition)];

    const readyPosition = new Vector(canvas.width - 2 * spriteHeight, canvas.height - 3 * spriteHeight / 4);
    readyFont = `${spriteHeight / 2}px Sugarlike`;
    readyBounds = [readyPosition, getBottomRight('Ready!', readyFont, readyPosition)];

    const countdownPosition = new Vector(canvas.width - 3.5 * spriteHeight, canvas.height - 2 * spriteHeight / 3);
    countdownFont = `${spriteHeight / 2}px Sugarlike`;
    countdownBounds = [countdownPosition, getBottomRight('Waiting 10 seconds...', countdownFont, countdownPosition)];
*/
}
/*
function getBottomRight(text: string, font: string, position: Vector): Vector {
    context.font = font;
    context.textBaseline = 'top';
    const textMetrics = context.measureText(text);
    return position.add(new Vector(textMetrics.width, textMetrics.actualBoundingBoxDescent));
}

export function getTransformForPlayer(relativeIndex: number): DOMMatrix {
    context.save();
    try {
        if (relativeIndex === 0) {
            return context.getTransform();
        } else if (relativeIndex === 1) {
            context.translate(0, (canvas.width + canvas.height) / 2);
            context.rotate(-Math.PI / 2);
            return context.getTransform();
        } else if (relativeIndex === 2) {
            // no transform
            return context.getTransform();
        } else if (relativeIndex === 3) {
            context.translate(canvas.width, (canvas.height - canvas.width) / 2);
            context.rotate(Math.PI / 2);
            return context.getTransform();
        } else {
            throw new Error(`index must be 0, 1, 2, or 3; got: ${relativeIndex}`);
        }
    } finally {
        context.restore();
    }
}
*/
export function getRelativePlayerIndex(otherPlayerIndex: number, playerIndex: number) {
    let relativeIndex = otherPlayerIndex - playerIndex;
    if (relativeIndex >= 0) {
        return relativeIndex;
    }

    return otherPlayerIndex - (playerIndex - 4);
}