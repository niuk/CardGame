import Vector from './vector';
import * as VP from './view-params';

const springConstant = 33;
const mass = 1;
const drag = Math.sqrt(4 * mass * springConstant);

// state for physics-based animations
export default class Sprite {
    image: HTMLImageElement;
    target: Vector;
    position: Vector;
    velocity: Vector;

    //bad = false;

    constructor(image: HTMLImageElement) {
        this.image = image;
        this.target = new Vector(0, 0);
        this.position = new Vector(0, 0);
        this.velocity = new Vector(0, 0);
    }

    animate(deltaTime: number) {
        const springForce = this.target.sub(this.position).scale(springConstant);
        const dragForce = this.velocity.scale(drag);
        const acceleration = springForce.sub(dragForce).scale(1 / mass);

        //const savedVelocity = this.velocity;
        //const savedPosition = this.position;
        
        this.velocity = this.velocity.add(acceleration.scale(deltaTime / 1000));
        this.position = this.position.add(this.velocity.scale(deltaTime / 1000));

        /*
        if (!this.bad && (
            !isFinite(this.velocity.x) || isNaN(this.velocity.x) ||
            !isFinite(this.velocity.y) || isNaN(this.velocity.y) ||
            !isFinite(this.position.x) || isNaN(this.position.x) ||
            !isFinite(this.position.y) || isNaN(this.position.y)
        )) {
            this.bad = true;
            
            console.log(`deltaTime: ${deltaTime}, springForce: ${JSON.stringify(springForce)}, dragForce: ${JSON.stringify(dragForce)}`);
            console.log(`target: ${JSON.stringify(this.target)}, position: ${JSON.stringify(savedPosition)}, velocity: ${JSON.stringify(savedVelocity)}, acceleration: ${JSON.stringify(acceleration)}`);
            console.log(`new position: ${JSON.stringify(this.position)}, new velocity: ${JSON.stringify(this.velocity)}`);
        }
        */

        VP.context.drawImage(this.image, this.position.x, this.position.y, VP.spriteWidth, VP.spriteHeight);
    }
}