import * as Render from './render';
import Vector from './vector';

const context = <CanvasRenderingContext2D>(<HTMLCanvasElement>document.getElementById('canvas')).getContext('2d');

//let n = 1000;
const springConstant = 1;
const mass = 1;
const drag = Math.sqrt(4 * mass * springConstant);

// state for physics-based animations
export default class Sprite {
    image: HTMLImageElement;
    target: Vector;
    position: Vector;
    velocity: Vector;

    constructor(image: HTMLImageElement) {
        this.image = image;
        this.target = new Vector(0, 0);
        this.position = new Vector(0, 0);
        this.velocity = new Vector(0, 0);
    }

    animate(deltaTime: number) {
        const springForce = this.target.sub(this.position).scale(springConstant);
        const dragForce = this.velocity.scale(-drag);
        const acceleration = springForce.add(dragForce).scale(1 / mass);
    
        //if (n-- > 0) {
            //console.log(`deltaTime: ${deltaTime}, springForce: ${JSON.stringify(springForce)}, dragForce: ${JSON.stringify(dragForce)}`);
            //console.log(`targetPosition: ${JSON.stringify(targetPosition)}, position: ${JSON.stringify(position)}, velocity: ${JSON.stringify(velocity)}, acceleration: ${JSON.stringify(acceleration)}`);
        //}
        
        this.velocity = this.velocity.add(acceleration.scale(deltaTime));
        this.position = this.position.add(this.velocity.scale(deltaTime));
    
        //if (n-- > 0) {
            //console.log(`new position: ${JSON.stringify(position)}, new velocity: ${JSON.stringify(velocity)}`);
        //}

        context.drawImage(this.image, this.position.x, this.position.y, Render.spriteWidth, Render.spriteHeight);
    }
}