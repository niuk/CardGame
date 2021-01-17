import * as Lib from '../lib';
import * as VP from './view-params';
import Vector from './vector';

const decayPerSecond = 1/60;

const colors = ['Black', 'Blue', 'Red', 'Green', 'Cyan', 'Purple', 'Yellow'];
const suits = ['Club', 'Diamond', 'Heart', 'Spade', 'Joker'];

export default class Sprite {
    image: HTMLImageElement;
    target: Vector;
    position: Vector;

    public constructor(image: HTMLImageElement) {
        this.image = image;
        this.target = new Vector(0, 0);
        this.position = new Vector(0, 0);
    }

    animate(deltaTime: number) {
        this.position = this.position.add(this.target.sub(this.position).scale(
            1 - Math.pow(1 - decayPerSecond, deltaTime)
        ));

        VP.context.drawImage(
            this.image,
            397, 54, 1248, 1935,
            this.position.x, this.position.y, VP.spriteWidth, VP.spriteHeight
        );
    }

    private static images = new Map<string, HTMLImageElement>();

    static getImage(stringForCard: string) {
        const image = this.images.get(stringForCard);
        if (image === undefined) {
            throw new Error(`couldn't get sprite '${stringForCard}'`);
        }

        return image;
    }

    private static async loadImage(key: string, src: string) {
        const image = new Image();
        image.src = src;
        await new Promise(resolve => {
            image.onload = resolve;
        });
        console.log(`loaded ${image.src}`);
        this.images.set(key, image);
    }

    static async load() {
        const loads: Promise<void>[] = [];
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

                loads.push(this.loadImage(
                    JSON.stringify([suit, rank]),
                    `PlayingCards/${suits[suit]}${rank < 10 ? '0' : ''}${rank}.png`
                ));
            }
        }

        let i = 0;
        for (const color of colors) {
            loads.push(this.loadImage(`Back${i++}`, `PlayingCards/BackColor_${color}.png`));
        }

        await Promise.all(loads);

        console.log('all card images loaded');
    }
}