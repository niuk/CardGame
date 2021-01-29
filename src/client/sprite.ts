import * as PIXI from 'pixi.js-legacy';
import * as Lib from '../lib';
import * as V from './vector';

const decayPerSecond = 1 / 5;

const colors = ['Black', 'Blue', 'Red', 'Green', 'Cyan', 'Purple', 'Yellow'];
const suits = ['Club', 'Diamond', 'Heart', 'Spade', 'Joker'];

const textures = new Map<string, PIXI.Texture>();
const sprites = new Set<Sprite>();

let background: PIXI.Sprite;
let backgroundIndex = 0;
const backgroundTextures = [
    PIXI.Texture.from('wood-364693.jpg'),
    PIXI.Texture.from('wooden-plank-textured-background-material.jpg'),
    PIXI.Texture.from('wooden-boards.jpg'),
    PIXI.Texture.from('marble-black.jpg'),
    PIXI.Texture.from('marble-black-gold.jpg'),
    PIXI.Texture.from('kalle-kortelainen-7JtgUEYVOu0-unsplash.jpg'),
    PIXI.Texture.from('scott-webb-S_eu4NqJt5Y-unsplash.jpg')
];

let loadedTextureCount = 0;
let totalTextureCount = 4 * 13 + 2 + colors.length;

async function loadTexture(key: string, src: string) {
    await new Promise(resolve => {
        Sprite.app.loader.add(src).load(resolve);
    });

    textures.set(key, new PIXI.Texture(
        PIXI.BaseTexture.from(src),
        new PIXI.Rectangle(
            397, 54,
            1248, 1935
        )
    ));
}

let loading = false;
let onTickAdded: (deltaTime: number) => void | undefined;

export default class Sprite {
    public static app: PIXI.Application;

    public static onTick: (deltaTime: number) => void;
    public static onDragStart: (position: V.IVector2, sprite: Sprite) => void;
    public static onDragMove: (position: V.IVector2, sprite: Sprite) => void;
    public static onDragEnd: (position: V.IVector2, sprite: Sprite) => void;

    // these parameters change with resizing
    public static pixelsPerCM = 0;
    public static pixelsPerPercentWidth = 0;
    public static pixelsPerPercentHeight = 0;
    public static dragThreshold = 0;
    public static fixedGap = 0;
    public static deckGap = 0;
    public static gap = 0;
    public static width = 0;
    public static height = 0;

    public static deckContainer: PIXI.Container;
    public static playerContainers: PIXI.Container[];

    public static async load(gameState: Lib.GameState) {
        if (loading) return;
        loading = true;

        if (!this.app) {
            this.app = new PIXI.Application(<PIXI.IApplicationOptions>{
                view: <HTMLCanvasElement>document.getElementById('canvas')
            });

            this.deckContainer = Sprite.app.stage.addChild(new PIXI.Container());
            this.deckContainer.zIndex = 1;
            this.playerContainers = [
                Sprite.app.stage.addChild(new PIXI.Container()),
                Sprite.app.stage.addChild(new PIXI.Container()),
                Sprite.app.stage.addChild(new PIXI.Container()),
                Sprite.app.stage.addChild(new PIXI.Container())
            ];

            for (const playerContainer of this.playerContainers) {
                playerContainer.zIndex = 2;
                playerContainer.sortableChildren = true;
            }

            this.app.stage.sortableChildren = true;
        }

        if (loadedTextureCount < totalTextureCount) {
            const bar = <HTMLProgressElement>document.getElementById('loading-bar');
            bar.style.visibility = 'visible';
            bar.value = loadedTextureCount;
            bar.max = totalTextureCount;

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

                    await loadTexture(
                        JSON.stringify([suit, rank]),
                        `PlayingCards/${suits[suit]}${rank < 10 ? '0' : ''}${rank}.png`
                    );
                    bar.value = ++loadedTextureCount;
                }
            }

            let i = 0;
            for (const color of colors) {
                await loadTexture(`Back${i++}`, `PlayingCards/BackColor_${color}.png`);
                bar.value = ++loadedTextureCount;
            }

            bar.style.visibility = 'hidden';
            console.log('all card images loaded');
        }

        if (!background) {
            const dummySprite = new Sprite(new PIXI.Container(), new PIXI.Texture(new PIXI.BaseTexture()));
            dummySprite.position = { x: -this.width, y: -this.height };

            background = this.app.stage.addChild(PIXI.Sprite.from(<PIXI.Texture>backgroundTextures[backgroundIndex]));
            background.zIndex = 0;
            background.position.set(0, 0);
            background.interactive = true;
            background.on('pointerdown', (event: PIXI.InteractionEvent) => this.onDragStart(event.data.global, dummySprite));
            background.on('pointerup', (event: PIXI.InteractionEvent) => this.onDragEnd(event.data.global, dummySprite));

            console.log('background loaded');
        }

        // get pixels per centimeter, which is constant
        if (this.pixelsPerCM === 0) {
            const testElement = document.createElement('div');
            testElement.style.width = '1cm';
            document.body.appendChild(testElement);
            this.pixelsPerCM = testElement.offsetWidth;
            document.body.removeChild(testElement);
        }

        this.dragThreshold = 0.5 * this.pixelsPerCM;

        // both the view (the canvas element) and the renderer must be resized
        this.app.view.width = document.body.clientWidth;
        this.app.view.height = document.body.clientHeight;
        this.app.renderer.resize(
            document.body.clientWidth,
            document.body.clientHeight
        );

        this.pixelsPerPercentWidth = this.app.view.width / 100;
        this.pixelsPerPercentHeight = this.app.view.height / 100;
        this.fixedGap = 0.15 * this.pixelsPerCM;
        this.deckGap = 0.1 * this.pixelsPerPercentHeight;
        this.gap = 1.8 * this.pixelsPerPercentHeight;
        this.width = 10 * this.pixelsPerPercentHeight;
        this.height = 16 * this.pixelsPerPercentHeight;
        for (const sprite of sprites) {
            sprite._sprite.width = this.width;
            sprite._sprite.height = this.height;
        }

        background.width = this.app.view.width;
        background.height = this.app.view.height;

        if (gameState) {
            const playerContainer = this.playerContainers[gameState.playerIndex];
            if (!playerContainer) throw new Error();
            playerContainer.zIndex = 2;
    
            const leftPlayerContainer = <PIXI.Container>this.playerContainers[(gameState.playerIndex + 1) % 4];
            leftPlayerContainer.position.y = (Sprite.app.view.width + Sprite.app.view.height) / 2;
            leftPlayerContainer.rotation = -Math.PI / 2;
        
            const rightPlayerContainer = <PIXI.Container>this.playerContainers[(gameState.playerIndex + 3) % 4];
            rightPlayerContainer.position.x = Sprite.app.view.width;
            rightPlayerContainer.position.y = (Sprite.app.view.height - Sprite.app.view.width) / 2;
            rightPlayerContainer.rotation = Math.PI / 2;
        }

        if (onTickAdded !== this.onTick) {
            if (onTickAdded) {
                this.app.ticker.remove(onTickAdded);
            }
            
            this.app.ticker.add(this.onTick);
            onTickAdded = this.onTick;
        }

        loading = false;
    }

    public static getTexture(stringForCard: string) {
        const image = textures.get(stringForCard);
        if (image === undefined) {
            throw new Error(`couldn't get sprite '${stringForCard}'`);
        }

        return image;
    }

    public static backgroundBackward() {
        backgroundIndex = (backgroundIndex + 1) % backgroundTextures.length;
        background.texture = <PIXI.Texture>backgroundTextures[backgroundIndex];
    }
    
    public static backgroundForward() {
        --backgroundIndex;
        if (backgroundIndex < 0) {
            backgroundIndex = backgroundTextures.length - 1;
        }
    
        background.texture = <PIXI.Texture>backgroundTextures[backgroundIndex];
    }
    
    private _sprite: PIXI.Sprite;

    public get texture() {
        return this._sprite.texture;
    }

    public get position(): V.IVector2 {
        return this._sprite.position;
    }

    public set position(value) {
        this._sprite.position.set(value.x, value.y);
    }

    public get rotation() {
        return this._sprite.rotation;
    }

    public set rotation(value) {
        this._sprite.rotation = value;
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

    public get zIndex() {
        return this._sprite.zIndex;
    }

    public set zIndex(value) {
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
        this._sprite.cursor = 'pointer';

        sprites.add(this);

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

    public getOffsetInParentTransform(point: V.IVector2): V.IVector2 {
        const offset = V.sub(this.position, this._sprite.parent.localTransform.applyInverse(point));
        this._sprite.pivot.set(
            (offset.x - this.position.x) / Sprite.width,
            (offset.y - this.position.y) / Sprite.height
        );
        return offset;
    }

    public transfer(parent: PIXI.Container, texture: PIXI.Texture) {
        const oldParent = this._sprite.parent;

        // save this sprite's world transform position and rotation
        const position = oldParent.localTransform.apply(this.position);
        const rotation = oldParent.rotation;

        parent.addChild(this._sprite);
        this._sprite.texture = texture;
        this._sprite.tint = 0xffffff;

        // reapply saved world transform position and rotation
        this.position = parent.transform.localTransform.applyInverse(position);
        this.rotation = rotation - parent.transform.rotation;
    }

    animate(deltaTime: number) {
        const scale = 1 - Math.pow(1 - decayPerSecond, deltaTime);
        this.position = V.add(this.position, V.scale(scale, V.sub(this.target, this.position)));
        this.rotation = this.rotation + scale * (0 - this.rotation);
    }
}