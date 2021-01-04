import Vector from './vector';

// state for physics-based animations
export class Card {
    image: HTMLImageElement;
    target: Vector;
    position: Vector;
    velocity: Vector;

    constructor(image: HTMLImageElement, target: Vector, position: Vector, velocity: Vector) {
        this.image = image;
        this.target = target;
        this.position = position;
        this.velocity = velocity;
    }
}

//let n = 1000;
const springConstant = 1000;
const mass = 1;
const drag = Math.sqrt(4 * mass * springConstant);

export function animate(card: Card, deltaTime: number) {
    const springForce = Vector.scale(springConstant, Vector.sub(card.target, card.position));
    const dragForce = Vector.scale(-drag, card.velocity);
    const acceleration = Vector.scale(1 / mass, Vector.add(springForce, dragForce));

    //if (n-- > 0) {
        //console.log(`deltaTime: ${deltaTime}, springForce: ${JSON.stringify(springForce)}, dragForce: ${JSON.stringify(dragForce)}`);
        //console.log(`targetPosition: ${JSON.stringify(targetPosition)}, position: ${JSON.stringify(position)}, velocity: ${JSON.stringify(velocity)}, acceleration: ${JSON.stringify(acceleration)}`);
    //}
    
    card.velocity = Vector.add(card.velocity, Vector.scale(deltaTime / 1000, acceleration));
    card.position = Vector.add(card.position, Vector.scale(deltaTime / 1000, card.velocity));

    //if (n-- > 0) {
        //console.log(`new position: ${JSON.stringify(position)}, new velocity: ${JSON.stringify(velocity)}`);
    //}
}
