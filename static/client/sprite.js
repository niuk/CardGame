var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
define(["require", "exports", "./vector", "./view-params"], function (require, exports, vector_1, VP) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    vector_1 = __importDefault(vector_1);
    VP = __importStar(VP);
    const springConstant = 1000;
    const mass = 1;
    const drag = Math.sqrt(4 * mass * springConstant);
    // state for physics-based animations
    class Sprite {
        constructor(image) {
            this.bad = false;
            this.image = image;
            this.target = new vector_1.default(0, 0);
            this.position = new vector_1.default(0, 0);
            this.velocity = new vector_1.default(0, 0);
        }
        animate(deltaTime) {
            const springForce = this.target.sub(this.position).scale(springConstant);
            const dragForce = this.velocity.scale(-drag);
            const acceleration = springForce.add(dragForce).scale(1 / mass);
            const savedVelocity = this.velocity;
            const savedPosition = this.position;
            this.velocity = this.velocity.add(acceleration.scale(deltaTime / 1000));
            this.position = this.position.add(this.velocity.scale(deltaTime / 1000));
            if (!this.bad && (!isFinite(this.velocity.x) || isNaN(this.velocity.x) ||
                !isFinite(this.velocity.y) || isNaN(this.velocity.y) ||
                !isFinite(this.position.x) || isNaN(this.position.x) ||
                !isFinite(this.position.y) || isNaN(this.position.y))) {
                this.bad = true;
                console.log(`deltaTime: ${deltaTime}, springForce: ${JSON.stringify(springForce)}, dragForce: ${JSON.stringify(dragForce)}`);
                console.log(`target: ${JSON.stringify(this.target)}, position: ${JSON.stringify(savedPosition)}, velocity: ${JSON.stringify(savedVelocity)}, acceleration: ${JSON.stringify(acceleration)}`);
                console.log(`new position: ${JSON.stringify(this.position)}, new velocity: ${JSON.stringify(this.velocity)}`);
            }
            VP.context.drawImage(this.image, this.position.x, this.position.y, VP.spriteWidth, VP.spriteHeight);
        }
    }
    exports.default = Sprite;
});
