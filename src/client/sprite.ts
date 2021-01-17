import Vector from './vector';
import * as VP from './view-params';

const decayPerSecond = 1/60;

export default class Sprite {
    image: HTMLImageElement;
    target: Vector;
    position: Vector;

    constructor(image: HTMLImageElement) {
        this.image = image;
        this.target = new Vector(0, 0);
        this.position = new Vector(0, 0);
        //this.velocity = new Vector(0, 0);
    }

    animate(deltaTime: number) {
        this.position = this.position.add(this.target.sub(this.position).scale(
            1 - Math.pow(1 - decayPerSecond, deltaTime)
        ));

        VP.context.drawImage(this.image, this.position.x, this.position.y, VP.spriteWidth, VP.spriteHeight);
    }
}