import * as PIXI from 'pixi.js';

import * as Lib from '../lib';
import * as V from './vector';

const decayPerSecond = 1 / 3;

const colors = ['Black', 'Blue', 'Red', 'Green', 'Cyan', 'Purple', 'Yellow'];
const suits = ['Club', 'Diamond', 'Heart', 'Spade', 'Joker'];

// get pixels per centimeter, which is constant
const testElement = document.createElement('div');
testElement.style.width = '1cm';
document.body.appendChild(testElement);

export default class Sprite {
    public static pixelsPerCM = testElement.offsetWidth;

    public static app = new PIXI.Application({ resizeTo: document.body });

    public static onDragStart: (position: V.IVector2, sprite: Sprite) => void;
    public static onDragMove: (position: V.IVector2, sprite: Sprite) => void;
    public static onDragEnd: (position: V.IVector2, sprite: Sprite) => void;

    // these parameters change with resizing
    public static pixelsPerPercentWidth = 0;
    public static pixelsPerPercentHeight = 0;

    public static deckGap: number;
    public static width: number;
    public static height: number;
    public static gap: number;
    
    public static recalculatePixels() {
        this.pixelsPerPercentWidth = this.app.view.width / 100;
        this.pixelsPerPercentHeight = this.app.view.height / 100;
        
        this.deckGap = 0.15 * this.pixelsPerCM;
        this.width = 10 * this.pixelsPerPercentHeight;
        this.height = 16 * this.pixelsPerPercentHeight;
        this.gap = 1.8 * this.pixelsPerPercentHeight;
    }

    private static textures = new Map<string, PIXI.Texture>();

    public static getTexture(stringForCard: string) {
        const image = this.textures.get(stringForCard);
        if (image === undefined) {
            throw new Error(`couldn't get sprite '${stringForCard}'`);
        }

        return image;
    }

    private static async loadTexture(key: string, src: string) {
        await new Promise(resolve => {
            Sprite.app.loader.add(src).load(resolve);
        });

        this.textures.set(key, new PIXI.Texture(
            PIXI.BaseTexture.from(src),
            new PIXI.Rectangle(
                397, 54,
                1248, 1935
            )
        ));
    }

    static async load() {
        for (let suit = 0; suit <= 4; ++suit) {
            for (let rank = 0; rank <= 14; ++rank) {
                if (suit === Lib.Suit.Joker) {
                    if (0 < rank && rank < 14) {
                        continue;
                    }
                } else {
                    if (rank < 1 || 13 < rank) {
                        continue;
                    }
                }

                await this.loadTexture(
                    JSON.stringify([suit, rank]),
                    `PlayingCards/${suits[suit]}${rank < 10 ? '0' : ''}${rank}.png`
                );
            }
        }

        let i = 0;
        for (const color of colors) {
            await this.loadTexture(`Back${i++}`, `PlayingCards/BackColor_${color}.png`);
        }

        console.log('all card images loaded');
    }

    private _sprite: PIXI.Sprite;

    public get position(): V.IVector2 {
        return this._sprite.position;
    }

    public set position(value) {
        this._sprite.position.set(value.x, value.y);
    }

    public transfer(parent: PIXI.Container, texture: PIXI.Texture) {
        parent.addChild(this._sprite);
        this._sprite.texture = texture;
    }

    public destroy() {
        this._sprite.destroy();
    }

    public get selected() {
        return this._sprite.tint == 0xffffff;
    }

    public set selected(value) {
        if (value) {
            this._sprite.tint = 0xd0d0d0;
        } else {
            this._sprite.tint = 0xffffff;
        }
    }

    public get index() {
        return this._sprite.zIndex;
    }

    public set index(value) {
        this._sprite.zIndex = value;
    }

    public target: V.IVector2;

    public constructor(parent: PIXI.Container, texture: PIXI.Texture) {
        this.target = { x: 0, y: 0 };

        this._sprite = new PIXI.Sprite(texture);
        this._sprite.anchor.set(0, 0);
        this._sprite.width = Sprite.width;
        this._sprite.height = Sprite.height;
        this._sprite.interactive = true;

        // wrapper functions are needed because, initially, the static callbacks are undefined
        // also, we only want to fire onDragMove when this sprite is the one the pointer was down on
        let dragging = false;
        let onPointerDown = (event: PIXI.InteractionEvent) => {
            dragging = true;
            Sprite.onDragStart?.(event.data.global.clone(), this);
        };
        let onPointerMove = (event: PIXI.InteractionEvent) => {
            if (dragging) {
                Sprite.onDragMove?.(event.data.global.clone(), this);
            }
        };
        let onPointerUp = (event: PIXI.InteractionEvent) => {
            if (dragging) {
                dragging = false;
                Sprite.onDragEnd?.(event.data.global.clone(), this);
            }
        };

        this._sprite.on('pointerdown', onPointerDown);
        this._sprite.on('pointermove', onPointerMove);
        this._sprite.on('pointerup', onPointerUp);
        this._sprite.on('pointerupoutside', onPointerUp);

        parent.addChild(this._sprite);
    }

    animate(deltaTime: number) {
        this.position = V.add(
            this.position,
            V.scale(1 - Math.pow(1 - decayPerSecond, deltaTime), V.sub(this.target, this.position))
        );
    }
}

document.body.removeChild(testElement);