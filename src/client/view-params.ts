import Vector from './vector';

export const canvas = <HTMLCanvasElement>document.getElementById('canvas');
export const context = <CanvasRenderingContext2D>canvas.getContext('2d');

// get pixels per centimeter, which is constant
const testElement = document.createElement('div');
testElement.style.width = '1cm';
document.body.appendChild(testElement);
export const pixelsPerCM = testElement.offsetWidth;
document.body.removeChild(testElement);

// these parameters change with resizing
export let canvasRect = canvas.getBoundingClientRect();
export let pixelsPerPercent = 0;

export let spriteWidth: number;
export let spriteHeight: number;
export let spriteGap: number;
export let spriteDeckGap: number;

export let sortBySuitBounds: [Vector, Vector];
export let sortByRankBounds: [Vector, Vector];

export function recalculateParameters() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - 0.5 * pixelsPerCM;
    canvasRect = canvas.getBoundingClientRect();

    pixelsPerPercent = canvas.height / 100;
    spriteWidth = 12 * pixelsPerPercent;
    spriteHeight = 18 * pixelsPerPercent;
    spriteGap = 2 * pixelsPerPercent;
    spriteDeckGap = 0.5 * pixelsPerPercent;

    sortBySuitBounds = [
        new Vector(canvas.width - 2.75 * pixelsPerCM, canvas.height - 3.5 * pixelsPerCM),
        new Vector(canvas.width, canvas.height - 2 * pixelsPerCM)
    ];
    sortByRankBounds = [
        new Vector(canvas.width - 2.75 * pixelsPerCM, canvas.height - 1.75 * pixelsPerCM),
        new Vector(canvas.width, canvas.height - 0.25 * pixelsPerCM)
    ];
}
