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
const totalTextureCount = backgroundTextureNames.length + 4 * 13 + 2 + colors.length;

let currentLoadingTexture = '';
async function loadTexture(key: string, src: string, frame?: PIXI.Rectangle) {
    currentLoadingTexture = src;
    await new Promise(resolve => {
        Sprite.app.loader.add(src).load(resolve);
    });
    textures.set(key, new PIXI.Texture(PIXI.BaseTexture.from(src), frame));
    currentLoadingTexture = '';
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
        bar.value = loadedTextureCount;
        bar.max = totalTextureCount;

        // load background textures
        for (const backgroundTextureName of backgroundTextureNames) {
            await loadTexture(backgroundTextureName, `${backgroundTextureName}.jpg`);
            bar.value = ++loadedTextureCount;
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

                await loadTexture(
                    JSON.stringify([suit, rank]),
                    `PlayingCards/${suits[suit]}${rank < 10 ? '0' : ''}${rank}.png`,
                    cardTextureFrame
                );
                bar.value = ++loadedTextureCount;
            }
        }

        // load textures for card backs
        let i = 0;
        for (const color of colors) {
            await loadTexture(
                `Back${i++}`,
                `PlayingCards/BackColor_${color}.png`,
                cardTextureFrame
            );
            bar.value = ++loadedTextureCount;
        }

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
    Sprite.pixelsPerPercent = Math.min(Sprite.app.view.width / 100, Sprite.app.view.height / 100);
    Sprite.fixedGap = 0.15 * Sprite.pixelsPerCM;
    Sprite.deckGap = 0.1 * Sprite.pixelsPerPercent;
    Sprite.gap = 1.8 * Sprite.pixelsPerPercent;
    Sprite.width = 10 * Sprite.pixelsPerPercent;
    Sprite.height = 16 * Sprite.pixelsPerPercent;
    for (const sprite of sprites) {
        sprite.updateSize();
    }

    if (gameState) {
        const playerHeight = 2 * (Sprite.height + Sprite.gap);

        const leftPlayerIndex = (gameState.playerIndex + 1) % gameState.playerStates.length;
        let leftPlayerContainer = Sprite.playerContainers[leftPlayerIndex];
        if (!leftPlayerContainer) {
            leftPlayerContainer = new PIXI.Container();
            leftPlayerContainer.zIndex = 2;
            leftPlayerContainer.sortableChildren = true;
            Sprite.playerContainers[leftPlayerIndex] = leftPlayerContainer;
            Sprite.app.stage.addChild(leftPlayerContainer);
        }

        leftPlayerContainer.position.set(0, Sprite.app.view.height);
        leftPlayerContainer.rotation = -Math.PI / 2;
        Sprite.playerWidths[leftPlayerIndex] = Sprite.app.view.height;
        if (gameState.playerStates.length > 4) {
            Sprite.playerWidths[leftPlayerIndex] -= playerHeight;
        }

        const rightPlayerIndex = (gameState.playerIndex + gameState.playerStates.length - 1) % gameState.playerStates.length;
        let rightPlayerContainer = Sprite.playerContainers[rightPlayerIndex];
        if (!rightPlayerContainer) {
            rightPlayerContainer = new PIXI.Container();
            rightPlayerContainer.zIndex = 2;
            rightPlayerContainer.sortableChildren = true;
            Sprite.playerContainers[rightPlayerIndex] = rightPlayerContainer;
            Sprite.app.stage.addChild(rightPlayerContainer);
        }

        rightPlayerContainer.rotation = Math.PI / 2;
        rightPlayerContainer.position.set(Sprite.app.view.width, 0);
        Sprite.playerWidths[rightPlayerIndex] = Sprite.app.view.height;

        if (gameState.playerStates.length > 4) {
            rightPlayerContainer.position.y += playerHeight
            Sprite.playerWidths[rightPlayerIndex] -= playerHeight;
        }

        for (let i = 0; i < gameState.playerStates.length - 3; ++i) {
            const playerIndex = (leftPlayerIndex + i + 1) % gameState.playerStates.length;
            let playerContainer = Sprite.playerContainers[playerIndex];
            if (!playerContainer) {
                playerContainer = new PIXI.Container();
                playerContainer.zIndex = 2;
                playerContainer.sortableChildren = true;
                Sprite.playerContainers[playerIndex] = playerContainer;
                Sprite.app.stage.addChild(playerContainer);
            }

            if (gameState.playerStates.length > 4) {
                const width = Sprite.app.view.width / (gameState.playerStates.length - 3);
                playerContainer.position.set(i * width, 0);
                Sprite.playerWidths[playerIndex] = width;
            } else {
                playerContainer.position.set(playerHeight, 0);
                Sprite.playerWidths[playerIndex] = Sprite.app.view.width - 2 * playerHeight;
            }
        }

        let playerContainer = Sprite.playerContainers[gameState.playerIndex];
        if (!playerContainer) {
            playerContainer = new PIXI.Container();
            playerContainer.zIndex = 3;
            playerContainer.sortableChildren = true;
            Sprite.playerContainers[gameState.playerIndex] = playerContainer;
            Sprite.app.stage.addChild(playerContainer);
        }

        Sprite.playerWidths[gameState.playerIndex] = Sprite.app.view.width - 2 * playerHeight;
        playerContainer.position.set(playerHeight, 0);
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
    public static playerContainers: PIXI.Container[] = [];
    public static playerWidths: number[] = [];

    // for animating the deck
    public static deckSprites: Sprite[] = [];
    // associative arrays, one for each player at their player index
    // each element corresponds to a back card by index
    public static playerBackSprites: Sprite[][] = [];
    // each element corresponds to a face card by index
    public static playerFaceSprites: Sprite[][] = [];

    public static get currentLoadingTexture(): string {
        return currentLoadingTexture;
    }

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

    public static async linkWithCards(previousGameState: Lib.GameState | undefined, gameState: Lib.GameState): Promise<void> {
        await this.load(gameState);

        const previousDeckSprites = this.deckSprites;
        this.deckSprites = [];
    
        const previousPlayerBackSprites = this.playerBackSprites;
        this.playerBackSprites = [];
    
        const previousPlayerFaceSprites = this.playerFaceSprites;
        this.playerFaceSprites = [];
    
        const getSpriteWithOrigin = (origin: Lib.Origin) => {
            let sprite: Sprite | undefined;
            if (origin.origin === 'Deck') {
                sprite = previousDeckSprites.splice(previousDeckSprites.length - 1, 1)[0];
            } else if (origin.origin === 'Hand') {
                if (origin.playerIndex === gameState.playerIndex) {
                    sprite = previousPlayerFaceSprites[gameState.playerIndex]?.[origin.cardIndex];
                } else {
                    const originPlayer = previousGameState?.playerStates[origin.playerIndex];
                    if (originPlayer) {
                        if (origin.cardIndex < originPlayer.revealCount) {
                            sprite = previousPlayerFaceSprites[origin.playerIndex]?.[origin.cardIndex];
                        } else {
                            sprite = previousPlayerBackSprites[origin.playerIndex]?.[origin.cardIndex - originPlayer.revealCount];
                        }
                    }
                }
            } else {
                const _: never = origin;
            }

            return sprite;
        };
    
        for (let playerIndex = 0; playerIndex < gameState.playerStates.length; ++playerIndex) {
            const playerState = gameState.playerStates[playerIndex];
            if (!playerState) continue;
    
            const faceSprites = this.playerFaceSprites[playerIndex] ?? [];
            this.playerFaceSprites[playerIndex] = faceSprites;
            const previousFaceSprites = previousPlayerFaceSprites[playerIndex] ?? [];
            previousPlayerFaceSprites[playerIndex] = previousFaceSprites;
    
            const backSprites = this.playerBackSprites[playerIndex] ?? [];
            this.playerBackSprites[playerIndex] = backSprites;
            const previousBackSprites = previousPlayerBackSprites[playerIndex] ?? [];
            previousPlayerBackSprites[playerIndex] = previousBackSprites;
    
            let container = Sprite.playerContainers[playerIndex];
            if (!container) {
                container = new PIXI.Container();
                Sprite.playerContainers[playerIndex] = container;
            }

            const backTexture = Sprite.getTexture(`Back${playerIndex + 1}`);
            
            for (const [card, origin] of playerState.cardsWithOrigins) {
                let sprite = getSpriteWithOrigin(origin);
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
    
        for (const origin of gameState.deckOrigins.reverse()) {
            let sprite = getSpriteWithOrigin(origin);
            const deckTexture = Sprite.getTexture('Back0');
            if (sprite) {
                sprite.transfer(Sprite.deckContainer, deckTexture);
            } else {
                sprite = new Sprite(Sprite.deckContainer, deckTexture);
            }
    
            this.deckSprites.unshift(sprite);
        }
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
            this._sprite.tint = 0xd0d0d0;
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
            console.log(event.type, dragging);
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
        const offset = V.sub(this.position, this._sprite.parent.worldTransform.applyInverse(point));
        this._sprite.pivot.set(
            (offset.x - this.position.x) / Sprite.width,
            (offset.y - this.position.y) / Sprite.height
        );
        return offset;
    }

    public transfer(parent: PIXI.Container, texture: PIXI.Texture): void {
        const oldParent = this._sprite.parent;
        if (parent !== oldParent) console.log(oldParent.position);
        if (parent !== oldParent) console.log(parent.position);

        // save this sprite's world transform position and rotation
        const target = oldParent.worldTransform.apply(this.target);
        const position = oldParent.worldTransform.apply(this.position);
        const rotation = oldParent.rotation;
        if (parent !== oldParent) console.log(this.position);

        oldParent.removeChild(this._sprite);
        parent.addChild(this._sprite);
        this._sprite.texture = texture;
        this._sprite.tint = 0xffffff;

        // reapply saved world transform position and rotation
        this.target = parent.transform.worldTransform.applyInverse(target);
        this.position = parent.transform.worldTransform.applyInverse(position);
        this.rotation = rotation - parent.transform.rotation;
        if (parent !== oldParent) console.log(this.position);
    }

    animate(deltaTime: number): void {
        const scale = 1 - Math.pow(1 - decayPerSecond, deltaTime);
        this.position = V.add(this.position, V.scale(scale, V.sub(this.target, this.position)));
        this.rotation = this.rotation + scale * (0 - this.rotation);
    }
}