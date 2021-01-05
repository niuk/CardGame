define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class Vector {
        constructor(x, y) {
            this.x = 0;
            this.y = 0;
            this.x = x;
            this.y = y;
        }
        /*
        assign(v: Vector) {
            this.x = v.x;
            this.y = v.y;
        }
        */
        add(v) {
            return new Vector(this.x + v.x, this.y + v.y);
        }
        /*
        addSelf(v: Vector) {
            this.x += v.x;
            this.y += v.y;
        }
        */
        sub(v) {
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
        distance(v) {
            return this.sub(v).length;
        }
        scale(s) {
            return new Vector(s * this.x, s * this.y);
        }
    }
    exports.default = Vector;
});
