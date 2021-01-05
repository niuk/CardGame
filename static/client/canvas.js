define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.pixelsPerCM = exports.pixelsPerPercent = exports.canvasRect = exports.context = exports.canvas = void 0;
    exports.canvas = document.getElementById('canvas');
    exports.context = exports.canvas.getContext('2d');
    exports.canvasRect = exports.canvas.getBoundingClientRect();
    exports.pixelsPerPercent = 0;
    // get pixels per centimeter
    const testElement = document.createElement('div');
    testElement.style.width = '1cm';
    document.body.appendChild(testElement);
    exports.pixelsPerCM = testElement.offsetWidth;
    document.body.removeChild(testElement);
});
