define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.recalculateParameters = exports.pixelsPerPercent = exports.canvasRect = exports.pixelsPerCM = exports.context = exports.canvas = void 0;
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
        Sprite.width = 12 * exports.pixelsPerPercent;
        Sprite.height = 18 * exports.pixelsPerPercent;
        Sprite.gap = 2 * exports.pixelsPerPercent;
        Sprite.deckGap = 0.5 * exports.pixelsPerPercent;
        sortBySuitBounds = [
            new Vector(exports.canvas.width - 2.75 * exports.pixelsPerCM, exports.canvas.height - 3.5 * exports.pixelsPerCM),
            new Vector(exports.canvas.width, exports.canvas.height - 2 * exports.pixelsPerCM)
        ];
        sortByRankBounds = [
            new Vector(exports.canvas.width - 2.75 * exports.pixelsPerCM, exports.canvas.height - 1.75 * exports.pixelsPerCM),
            new Vector(exports.canvas.width, exports.canvas.height - 0.25 * exports.pixelsPerCM)
        ];
    }
    exports.recalculateParameters = recalculateParameters;
});
