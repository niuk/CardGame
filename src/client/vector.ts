export default class Vector {
    readonly x: number = 0;
    readonly y: number = 0;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    /*
    assign(v: Vector) {
        this.x = v.x;
        this.y = v.y;
    }
    */

    add(v: Vector) {
        return new Vector(this.x + v.x, this.y + v.y);
    }

    /*
    addSelf(v: Vector) {
        this.x += v.x;
        this.y += v.y;
    }
    */
    
    sub(v: Vector) {
        return new Vector(this.x - v.x, this.y - v.y);
    }

    /*
    subSelf(v: Vector) {
        this.x -= v.x;
        this.y -= v.y;
    }
    */
    
    get length() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    
    distance(v: Vector): number {
        return this.sub(v).length;
    }
    
    scale(s: number): Vector {
        return new Vector(s * this.x, s * this.y);
    }

    /*
    scaleSelf(s: number) {
        this.x *= s;
        this.y *= s;
    }
    */
}