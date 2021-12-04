import * as PIXI from 'pixi.js-legacy';
import * as Lib from '../lib';
import * as V from './vector';

const decayPerSecond = 1 / 5;

const colors = [0x000000, 0x0000ff, 0xff0000, 0x00ff00, 0x00ffff, 0xff00ff, 0xffff00];
const colorNames = ['Black', 'Blue', 'Red', 'Green', 'Cyan', 'Purple', 'Yellow'];
const suits = ['Club', 'Heart', 'Spade', 'Diamond', 'Joker'];

const textures = new Map<string, PIXI.Texture>();
const sprites = new Set<Sprite>();

let background: PIXI.Sprite;
let backgroundIndex = 0;
const backgroundTextureNames = [
    'wood-364693',
    'wooden-plank-textured-background-material',
    'wooden-boards',
    'marble-black',
    'marble-black-gold',
    'kalle-kortelainen-7JtgUEYVOu0-unsplash',
    'scott-webb-S_eu4NqJt5Y-unsplash'
];

let loadedTextureCount = 0;
const totalTextureCount = backgroundTextureNames.length + 4 * 13 + 2 + colorNames.length;

function loadTexture(key: string, src: string, frame?: PIXI.Rectangle) {
    Sprite.app.loader.add(src, resource => {
        textures.set(key, new PIXI.Texture(PIXI.BaseTexture.from(src), frame));
    });
}

async function _load(gameState: Lib.GameState | undefined): Promise<void> {
    if (Sprite.app === undefined) {
        Sprite.app = new PIXI.Application(<PIXI.IApplicationOptions>{
            view: <HTMLCanvasElement>document.getElementById('canvas')
        });
        Sprite.app.stage.sortableChildren = true;

        Sprite.deckContainer = Sprite.app.stage.addChild(new PIXI.Container());
        Sprite.deckContainer.zIndex = 1;
        Sprite.deckContainer.sortableChildren = true;
    }

    if (loadedTextureCount < totalTextureCount) {
        const bar = <HTMLProgressElement>document.getElementById('loadingBar');
        bar.style.visibility = 'visible';
        bar.max = totalTextureCount;

        // load background textures
        for (const backgroundTextureName of backgroundTextureNames) {
            loadTexture(backgroundTextureName, `${backgroundTextureName}.jpg`);
        }

        // load textures for card faces
        const cardTextureFrame = new PIXI.Rectangle(
            397, 54,
            1248, 1935
        );
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

                loadTexture(
                    JSON.stringify([suit, rank]),
                    `PlayingCards/${suits[suit]}${rank < 10 ? '0' : ''}${rank}.png`,
                    cardTextureFrame
                );
            }
        }

        // load textures for card backs
        let i = 0;
        for (const color of colorNames) {
            loadTexture(
                `Back${i++}`,
                `PlayingCards/BackColor_${color}.png`,
                cardTextureFrame
            );
        }

        Sprite.app.loader.onProgress.add(() => {
            bar.value = ++loadedTextureCount;
        });

        await new Promise(resolve => Sprite.app.loader.load(resolve));

        bar.style.visibility = 'hidden';
        console.log('all textures loaded');
    }

    // both the view (the canvas element) and the renderer must be resized
    Sprite.app.view.width = document.body.clientWidth;
    Sprite.app.view.height = document.body.clientHeight;
    Sprite.app.renderer.resize(
        document.body.clientWidth,
        document.body.clientHeight
    );

    if (background === undefined) {
        const dummySprite = new Sprite(new PIXI.Container(), new PIXI.Texture(new PIXI.BaseTexture()));
        dummySprite.position = { x: -Sprite.width, y: -Sprite.height };

        backgroundIndex = JSON.parse(Lib.getCookie('backgroundIndex') ?? '0');

        const backgroundTextureName = backgroundTextureNames[backgroundIndex];
        if (backgroundTextureName === undefined) throw new Error();
        background = Sprite.app.stage.addChild(new PIXI.Sprite(Sprite.getTexture(backgroundTextureName)));
        background.zIndex = 0;
        background.position.set(0, 0);
        background.interactive = true;
        background.on('pointerdown', (event: PIXI.InteractionEvent) => Sprite.onDragStart(event.data.global, dummySprite), { passive: true });
        background.on('pointerup', (event: PIXI.InteractionEvent) => Sprite.onDragEnd(event.data.global, dummySprite), { passive: true });

        console.log('background set');
    }

    background.width = Sprite.app.view.width;
    background.height = Sprite.app.view.height;

    // get pixels per centimeter, which is constant
    if (Sprite.pixelsPerCM === 0) {
        const testElement = document.createElement('div');
        testElement.style.width = '1cm';
        document.body.appendChild(testElement);
        Sprite.pixelsPerCM = testElement.offsetWidth;
        document.body.removeChild(testElement);
    }

    Sprite.dragThreshold = 0.5 * Sprite.pixelsPerCM;
    Sprite.pixelsPerPercent = Math.sqrt(Sprite.app.view.width * Sprite.app.view.height) / 100;
    Sprite.fixedGap = 0.15 * Sprite.pixelsPerCM;
    Sprite.deckGap = 0.1 * Sprite.pixelsPerPercent;
    Sprite.gap = 0.8 * Sprite.pixelsPerPercent;
    Sprite.width = 5 * Sprite.pixelsPerPercent;
    Sprite.height = 8 * Sprite.pixelsPerPercent;
    for (const sprite of sprites) {
        sprite.updateSize();
    }

    if (gameState) {
        let playerContainer = Sprite.containers[gameState.playerIndex];
        console.log(`playerContainer.index = ${gameState.playerIndex}`);
        if (!playerContainer) {
            playerContainer = new PIXI.Container();
            playerContainer.zIndex = 3;
            playerContainer.sortableChildren = true;
            Sprite.containers[gameState.playerIndex] = playerContainer;
            Sprite.app.stage.addChild(playerContainer);
        }

        for (let i = 1; i < gameState.playerStates.length; ++i) {
            const playerIndex = (gameState.playerIndex + i) % gameState.playerStates.length;
            let playerContainer = Sprite.containers[playerIndex];
            if (!playerContainer) {
                playerContainer = new PIXI.Container();
                playerContainer.zIndex = 2;
                playerContainer.sortableChildren = true;
                Sprite.containers[playerIndex] = playerContainer;
                Sprite.app.stage.addChild(playerContainer);
            }
        }

        if (gameState.playerStates.length === 6) {
            //    \______/
            //    /      \
            // __/        \__
            //   \        /
            //    \______/
            //    /      \

            // |<-arm->|<-leg->|
            // |_|     \     |_|<-hand
            // |\       \w     |t
            // | \       \i    |o
            // |  \       \d   |r
            // |   \       \t  |s
            // |    \       \h |o
            // |     \       \ |
            // |      \       \|_________width_________
            // |       \       |he
            // |               |ig
            // |_______________|ht_____________________

            const height = 2 * Sprite.height;
            const torso = Sprite.app.view.height / 2 - height;

            // let h = height, t = torso, and w = width
            // using the pythagorean:
            // w^2 = leg^2 + t^2
            // leg = sqrt(w^2 - t^2)
            // we also have two similar triangles, with hypothenuses at height and width:
            // arm/t = h/w
            // arm = t*h/w
            // the top center and bottom center players take up width amount of screen space, so
            // W = 2*arm + 2*leg + w
            // where W is the width of the screen
            // substituting arm and leg using formulas from above,
            // W = 2*(t*h/w) + 2*sqrt(w^2 - t^2) + w
            // W - 2*(t*h/w) - w = 2*sqrt(w^2 - t^2)
            // W/2 - t*h/w - w/2 = sqrt(w^2 - t^2)
            // h^2*t^2/w^2 - h*t*W/w + h*t + w^2/4 - w*W/2 + W^2/4 = w^2 - t^2
            // we have to solve for the zeros of the polynomial:
            // 0 = h^2*t^2/w^2 - h*t*W/w + h*t + t^2 - 3*w^2/4 - w*W/2 + W^2/4
            // derivative w.r.t. w, so that we can apply newton's method:
            // -2*h^2*t^2/w^3 + h*t*W/w^2 - 3*w/2 - W/2
            const W = Sprite.app.view.width;
            const h = height;
            const t = torso;
            const f = (w: number) => h*h*t*t/(w*w) - h*t*W/w + h*t + t*t - 3*w*w/4 - w*W/2 + W*W/4;
            const df = (w: number) => -2*h*h*t*t/(w*w*w) + h*t*W/(w*w) - 3*w/2 - W/2;
            let w0 = Sprite.app.view.width / 2; // an arbitrary starting point
            let width = w0;
            for (let i = 0; i < 100; ++i) {
                //console.log(w0, '->', width);
                width = w0 - f(w0)/df(w0);
                if (Math.abs(width - w0) < 1) {
                    break;
                }

                w0 = width;
            }

            const arm = torso*height/width;
            const leg = Math.sqrt(width*width - torso*torso);
            const hand = Math.sqrt(height*height - arm*arm);
            const tilt = Math.acos(leg / width);

            Sprite.reverse[gameState.playerIndex] = false;
            Sprite.widths[gameState.playerIndex] = width;
            playerContainer.position.set(arm + leg, Sprite.app.view.height - 2 * Sprite.height);

            const bottomLeftIndex = (gameState.playerIndex + 1) % gameState.playerStates.length;
            Sprite.reverse[bottomLeftIndex] = false;
            Sprite.widths[bottomLeftIndex] = width;
            const bottomLeftContainer = Sprite.containers[bottomLeftIndex];
            if (!bottomLeftContainer) throw new Error();
            bottomLeftContainer.position.set(arm, Sprite.app.view.height / 2);
            bottomLeftContainer.rotation = tilt;

            const topLeftIndex = (gameState.playerIndex + 2) % gameState.playerStates.length;
            Sprite.reverse[topLeftIndex] = true;
            Sprite.widths[topLeftIndex] = width;
            const topLeftContainer = Sprite.containers[topLeftIndex];
            if (!topLeftContainer) throw new Error();
            topLeftContainer.position.set(0, Sprite.app.view.height / 2 - hand);
            topLeftContainer.rotation = -tilt;

            const topIndex = (gameState.playerIndex + 3) % gameState.playerStates.length;
            Sprite.reverse[topIndex] = true;
            Sprite.widths[topIndex] = width;
            const topContainer = Sprite.containers[topIndex];
            if (!topContainer) throw new Error();
            topContainer.position.set(arm + leg, 0);
            topContainer.rotation = 0;

            const topRightIndex = (gameState.playerIndex + 4) % gameState.playerStates.length;
            Sprite.reverse[topRightIndex] = true;
            Sprite.widths[topRightIndex] = width;
            const topRightContainer = Sprite.containers[topRightIndex];
            if (!topRightContainer) throw new Error();
            const topRightPosition = V.sub({
                x: arm + leg + width,
                y: height
            }, V.rotateClockwise(tilt, { x: 0, y: height }));
            topRightContainer.position.set(topRightPosition.x, topRightPosition.y);
            topRightContainer.rotation = tilt;

            const bottomRightIndex = (gameState.playerIndex + 5) % gameState.playerStates.length;
            Sprite.reverse[bottomRightIndex] = false;
            Sprite.widths[bottomRightIndex] = width;
            const bottomRightContainer = Sprite.containers[bottomRightIndex];
            if (!bottomRightContainer) throw new Error();
            bottomRightContainer.position.set(arm + leg + width, Sprite.app.view.height - height);
            bottomRightContainer.rotation = -tilt;
        } else {
            const height = 2 * Sprite.height;
            Sprite.reverse[gameState.playerIndex] = false;
            Sprite.widths[gameState.playerIndex] = Sprite.app.view.width - 2 * height;
            playerContainer.position.set(height, Sprite.app.view.height - height);

            const leftIndex = (gameState.playerIndex + 1) % gameState.playerStates.length;
            const leftContainer = Sprite.containers[leftIndex];
            console.log(`leftContainer.index = ${leftIndex}`);
            if (!leftContainer) throw new Error();
            leftContainer.position.set(0, Sprite.app.view.height);
            leftContainer.rotation = -Math.PI / 2;
            Sprite.reverse[leftIndex] = true;
            Sprite.widths[leftIndex] = Sprite.app.view.height;
            if (gameState.playerStates.length > 4) {
                Sprite.widths[leftIndex] -= height;
            }

            const rightIndex = (gameState.playerIndex + gameState.playerStates.length - 1) % gameState.playerStates.length;
            const rightContainer = Sprite.containers[rightIndex];
            if (!rightContainer) throw new Error();
            console.log(`rightContainer.index = ${rightIndex}`);
            rightContainer.rotation = Math.PI / 2;
            rightContainer.position.set(Sprite.app.view.width, 0);
            playerContainer.rotation = 0;
            Sprite.reverse[rightIndex] = true;
            Sprite.widths[rightIndex] = Sprite.app.view.height;
            if (gameState.playerStates.length > 4) {
                rightContainer.position.y += height
                Sprite.widths[rightIndex] -= height;
            }

            console.log(`gameState.playerStates.length = ${gameState.playerStates.length}`);
            for (let i = 0; i < gameState.playerStates.length - 3; ++i) {
                const playerIndex = (leftIndex + i + 1) % gameState.playerStates.length;
                const playerContainer = Sprite.containers[playerIndex];
                if (!playerContainer) throw new Error();

                Sprite.reverse[playerIndex] = true;

                if (gameState.playerStates.length > 4) {
                    const width = Sprite.app.view.width / (gameState.playerStates.length - 3);
                    playerContainer.position.set(i * width, 0);
                    playerContainer.rotation = 0;
                    Sprite.widths[playerIndex] = width;
                } else {
                    playerContainer.position.set(height, 0);
                    playerContainer.rotation = 0;
                    Sprite.widths[playerIndex] = Sprite.app.view.width - 2 * height;
                }
            }

            for (let i = gameState.playerStates.length; i < Sprite.containers.length; ++i) {
                if (Sprite.containers[i]) {
                    Sprite.containers[i]?.destroy();
                }
            }
        }
    }

    if (cachedOnTick !== Sprite.onTick) {
        if (cachedOnTick !== undefined) {
            Sprite.app.ticker.remove(cachedOnTick);
        }
        
        Sprite.app.ticker.add(Sprite.onTick);
        cachedOnTick = Sprite.onTick;
    }
}

let promise = Promise.resolve();
let cachedOnTick: (deltaTime: number) => void | undefined;

export default class Sprite {
    public static app: PIXI.Application;

    public static onTick: (deltaTime: number) => void;
    public static onDragStart: (position: V.IVector2, sprite: Sprite) => void;
    public static onDragMove: (position: V.IVector2, sprite: Sprite) => void;
    public static onDragEnd: (position: V.IVector2, sprite: Sprite) => void;

    // these parameters change with resizing
    public static pixelsPerCM = 0;
    public static pixelsPerPercent = 0;
    public static dragThreshold = 0;
    public static fixedGap = 0;
    public static deckGap = 0;
    public static gap = 0;
    public static width = 0;
    public static height = 0;

    public static deckContainer: PIXI.Container;
    public static containers: PIXI.Container[] = [];
    public static reverse: boolean[] = [];
    public static widths: number[] = [];

    // for animating the deck
    public static deckSprites: Sprite[] = [];
    // associative arrays, one for each player at their player index
    // each element corresponds to a back card by index
    public static playerBackSprites: Sprite[][] = [];
    // each element corresponds to a face card by index
    public static playerFaceSprites: Sprite[][] = [];

    public static cardForCardId = new Map<number, Lib.Card>();
    public static spriteForCardId = new Map<number, Sprite>();

    public static async load(gameState: Lib.GameState | undefined): Promise<void> {
        const previousPromise = promise;
        promise = (async () => {
            await previousPromise;
            await _load(gameState);
        })();
        await promise;
    }

    public static getTexture(textureName: string): PIXI.Texture {
        const image = textures.get(textureName);
        if (!image) {
            throw new Error(`couldn't get sprite '${textureName}'`);
        }

        return image;
    }

    public static backgroundBackward(): void {
        backgroundIndex = (backgroundIndex + 1) % backgroundTextureNames.length;

        const backgroundTextureName = backgroundTextureNames[backgroundIndex];
        if (backgroundTextureName === undefined) throw new Error();
        background.texture = this.getTexture(backgroundTextureName);

        Lib.setCookie('backgroundIndex', JSON.stringify(backgroundIndex));
    }
    
    public static backgroundForward(): void {
        --backgroundIndex;
        if (backgroundIndex < 0) {
            backgroundIndex = backgroundTextureNames.length - 1;
        }
    
        const backgroundTextureName = backgroundTextureNames[backgroundIndex];
        if (backgroundTextureName === undefined) throw new Error();
        background.texture = this.getTexture(backgroundTextureName);

        Lib.setCookie('backgroundIndex', JSON.stringify(backgroundIndex));
    }

    public static async linkWithCards(gameState: Lib.GameState, cardsById: Map<number, Lib.Card>): Promise<void> {
        await this.load(gameState);

        this.deckSprites = [];
        this.playerBackSprites = [];
        this.playerFaceSprites = [];
    
        for (const cardId of gameState.deckCardIds) {
            let sprite = Sprite.spriteForCardId.get(cardId);
            const deckTexture = Sprite.getTexture('Back0');
            if (sprite) {
                sprite.transfer(Sprite.deckContainer, deckTexture);
            } else {
                sprite = new Sprite(Sprite.deckContainer, deckTexture);
                Sprite.spriteForCardId.set(cardId, sprite);
                console.log(`added sprite for card ${cardId}`);
            }
    
            this.deckSprites.push(sprite);
        }
    
        for (let playerIndex = 0; playerIndex < gameState.playerStates.length; ++playerIndex) {
            const playerState = gameState.playerStates[playerIndex];
            if (!playerState) continue;
    
            const faceSprites = this.playerFaceSprites[playerIndex] ?? [];
            this.playerFaceSprites[playerIndex] = faceSprites;
    
            const backSprites = this.playerBackSprites[playerIndex] ?? [];
            this.playerBackSprites[playerIndex] = backSprites;
    
            let container = Sprite.containers[playerIndex];
            if (!container) {
                container = new PIXI.Container();
                Sprite.containers[playerIndex] = container;
            }

            const backTexture = Sprite.getTexture(`Back${playerIndex + 1}`);

            for (const cardId of playerState.handCardIds) {
                let sprite = Sprite.spriteForCardId.get(cardId);
                console.log(`added sprite for card ${cardId}`);
                const card = cardsById.get(cardId);
                if (card) {
                    const faceTexture = Sprite.getTexture(JSON.stringify(card));
                    if (sprite) {
                        sprite.transfer(container, faceTexture);
                    } else {
                        sprite = new Sprite(container, faceTexture);
                    }
    
                    faceSprites.push(sprite);
                } else {
                    if (sprite) {
                        sprite.transfer(container, backTexture);
                    } else {
                        sprite = new Sprite(container, backTexture);
                    }
    
                    backSprites.push(sprite);
                }
            }
        }
    }

    public static async clearSprites(): Promise<void> {
        for (const sprite of sprites) {
            sprite.destroy();
        }
        
        sprites.clear();
        
        this.deckSprites = [];
        this.playerBackSprites = [];
        this.playerFaceSprites = [];
    }

    private _sprite: PIXI.Sprite;

    public get texture(): PIXI.Texture {
        return this._sprite.texture;
    }

    public get position(): V.IVector2 {
        return this._sprite.position;
    }

    public set position(value: V.IVector2) {
        this._sprite.position.set(value.x, value.y);
    }

    public get rotation(): number {
        return this._sprite.rotation;
    }

    public set rotation(value: number) {
        this._sprite.rotation = value;
    }

    public destroy(): void {
        this._sprite.destroy();
    }

    public get selected(): boolean {
        return this._sprite.tint == 0xffffff;
    }

    public set selected(value: boolean) {
        if (value) {
            this._sprite.tint = 0xd0d0ff;
        } else {
            this._sprite.tint = 0xffffff;
        }
    }

    public get zIndex(): number {
        return this._sprite.zIndex;
    }

    public set zIndex(value: number) {
        this._sprite.zIndex = value;
    }

    public updateSize(): void {
        this._sprite.width = Sprite.width;
        this._sprite.height = Sprite.height;
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

        const onPointerDown = (event: PIXI.InteractionEvent) => {
            dragging = true;
            Sprite.onDragStart?.(event.data.global.clone(), this);
        };

        const onPointerMove = (event: PIXI.InteractionEvent) => {
            if (dragging) {
                Sprite.onDragMove?.(event.data.global.clone(), this);
            }
        };

        const onPointerUp = (event: PIXI.InteractionEvent) => {
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

    public transfer(parent: PIXI.Container, texture: PIXI.Texture): void {
        const oldParent = this._sprite.parent;
        //if (parent !== oldParent) console.log(oldParent.position);
        //if (parent !== oldParent) console.log(parent.position);

        // save this sprite's world transform position and rotation
        const targetInWorld = oldParent.worldTransform.apply(this.target);
        const positionInWorld = oldParent.worldTransform.apply(this.position);
        const rotationInWorld = this.rotation + oldParent.rotation;
        //if (parent !== oldParent) console.log(this.position);
        //if (parent !== oldParent) console.log('old rotation', this.rotation);

        oldParent.removeChild(this._sprite);
        parent.addChild(this._sprite);
        this._sprite.texture = texture;
        this._sprite.tint = 0xffffff;

        // reapply saved world transform position and rotation
        this.target = parent.transform.worldTransform.applyInverse(targetInWorld);
        this.position = parent.transform.worldTransform.applyInverse(positionInWorld);
        this.rotation = rotationInWorld - parent.transform.rotation;

        if (parent !== oldParent) {
            this.easePositionStart = this.position;
            this.easeRotationStart = this.rotation;
            this.easePositionTime = 0;
            this.easeRotationTime = 0;
        }
        //if (parent !== oldParent) console.log(this.position);
        //if (parent !== oldParent) console.log('new rotation', this.rotation);
    }

    /*drawWorldDot(dot: PIXI.Graphics, position: V.IVector2, color: number): void {
        dot.zIndex = 200;
        dot.clear();
        dot.beginFill(color, 0xff);
        dot.drawCircle(position.x, position.y, 10);
        dot.endFill();
        Sprite.app.stage.addChild(dot);
    }*/
    //targetDot = new PIXI.Graphics();
    //positionDot = new PIXI.Graphics();

    private easePositionTime = 0;
    private easePositionDuration = 0;
    private easePositionStart = { x: 0, y: 0 };

    private easeRotationTime = 0;
    private easeRotationDuration = 0;
    private easeRotationStart = 0;

    public animate(deltaTime: number): void {
        /*
        const distance = V.distance(this.target, this.position);
        if (distance < 1) {
            this.position = this.target;
            this.easePositionTime = 0;
            this.easePositionStart = this.position;
        } else {
            if (this.easePositionTime === 0) {
                this.easePositionDuration = 500;
            }

            this.easePositionTime += deltaTime;
            this.position = V.add(this.easePositionStart, V.scale(this.easeInOut(this.easePositionTime / this.easePositionDuration), V.sub(this.target, this.easePositionStart)));
        }

        const delta = Math.abs(this.rotation);
        if (delta === 0) {
            this.rotation = 0;
            this.easeRotationTime = 0;
            this.easeRotationStart = this.rotation;
        } else {
            if (this.easeRotationTime === 0) {
                this.easeRotationDuration = 200;
            }
            
            this.easeRotationTime += deltaTime;
            this.rotation = this.easeRotationStart - this.easeInOut(this.easeRotationTime / this.easeRotationDuration) * this.easeRotationStart;
        }
        */

        const scale = 1 - Math.pow(1 - decayPerSecond, deltaTime);
        this.position = V.add(this.position, V.scale(scale, V.sub(this.target, this.position)));
        this.rotation = this.rotation + scale * (0 - this.rotation);

        //const worldTarget = this._sprite.parent.transform.worldTransform.apply(this.target);
        //this.drawWorldDot(this.targetDot, worldTarget, 0x00ff00);
        //const worldPosition = this._sprite.parent.transform.worldTransform.apply(this.position);
        //this.drawWorldDot(this.positionDot, worldPosition, 0x0000ff);
    }

    private easeInOut(x: number): number {
        return 10 * Math.atan(2 * Math.PI * (x - 0.5)) / (9 * Math.PI) + 0.4466;
    }

    //anchorDot = new PIXI.Graphics();
    public setAnchorAt(worldPosition: V.IVector2): void {
        const localPosition = this._sprite.transform.worldTransform.applyInverse(worldPosition);
        this._sprite.anchor.set(
            this._sprite.anchor.x + localPosition.x / this._sprite.texture.width,
            this._sprite.anchor.y + localPosition.y / this._sprite.texture.height
        );

        this.position = this._sprite.parent.worldTransform.applyInverse(worldPosition);

        //console.log('setAnchorAt', worldPosition, 'localPosition', localPosition, 'anchor', this._sprite.anchor);
        //this.drawWorldDot(this.anchorDot, worldPosition, 0xff0000);
    }

    public resetAnchor(): void {
        this.setAnchorAt(this.getTopLeftInWorld());
    }

    public getTopLeftInWorld(): V.IVector2 {
        return this._sprite.transform.worldTransform.apply({
            x: -this._sprite.anchor.x * this._sprite.texture.width,
            y: -this._sprite.anchor.y * this._sprite.texture.height
        });
    }
}