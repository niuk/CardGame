var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
define(["require", "exports", "./vector"], function (require, exports, vector_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.recalculateParameters = exports.sortByRankBounds = exports.sortBySuitBounds = exports.spriteDeckGap = exports.spriteGap = exports.spriteHeight = exports.spriteWidth = exports.pixelsPerPercent = exports.canvasRect = exports.pixelsPerCM = exports.context = exports.canvas = void 0;
    vector_1 = __importDefault(vector_1);
    exports.canvas = document.getElementById('canvas');
    exports.context = exports.canvas.getContext('2d');
    // get pixels per centimeter, which is constant
    const testElement = document.createElement('div');
    testElement.style.width = '1cm';
    document.body.appendChild(testElement);
    exports.pixelsPerCM = testElement.offsetWidth;
    document.body.removeChild(testElement);
    // these parameters change with resizing
    exports.canvasRect = exports.canvas.getBoundingClientRect();
    exports.pixelsPerPercent = 0;
    function recalculateParameters() {
        exports.canvas.width = window.innerWidth;
        exports.canvas.height = window.innerHeight - 0.5 * exports.pixelsPerCM;
        exports.canvasRect = exports.canvas.getBoundingClientRect();
        exports.pixelsPerPercent = exports.canvas.height / 100;
        exports.spriteWidth = 12 * exports.pixelsPerPercent;
        exports.spriteHeight = 18 * exports.pixelsPerPercent;
        exports.spriteGap = 2 * exports.pixelsPerPercent;
        exports.spriteDeckGap = 0.5 * exports.pixelsPerPercent;
        exports.sortBySuitBounds = [
            new vector_1.default(exports.canvas.width - 2.75 * exports.pixelsPerCM, exports.canvas.height - 3.5 * exports.pixelsPerCM),
            new vector_1.default(exports.canvas.width, exports.canvas.height - 2 * exports.pixelsPerCM)
        ];
        exports.sortByRankBounds = [
            new vector_1.default(exports.canvas.width - 2.75 * exports.pixelsPerCM, exports.canvas.height - 1.75 * exports.pixelsPerCM),
            new vector_1.default(exports.canvas.width, exports.canvas.height - 0.25 * exports.pixelsPerCM)
        ];
    }
    exports.recalculateParameters = recalculateParameters;
});
