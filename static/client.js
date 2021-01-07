(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function (process,setImmediate){(function (){
"use strict";
class Semaphore {
    constructor(count) {
        this.tasks = [];
        this.count = count;
    }
    sched() {
        if (this.count > 0 && this.tasks.length > 0) {
            this.count--;
            let next = this.tasks.shift();
            if (next === undefined) {
                throw "Unexpected undefined value in tasks list";
            }
            next();
        }
    }
    acquire() {
        return new Promise((res, rej) => {
            var task = () => {
                var released = false;
                res(() => {
                    if (!released) {
                        released = true;
                        this.count++;
                        this.sched();
                    }
                });
            };
            this.tasks.push(task);
            if (process && process.nextTick) {
                process.nextTick(this.sched.bind(this));
            }
            else {
                setImmediate(this.sched.bind(this));
            }
        });
    }
    use(f) {
        return this.acquire()
            .then(release => {
            return f()
                .then((res) => {
                release();
                return res;
            })
                .catch((err) => {
                release();
                throw err;
            });
        });
    }
}
exports.Semaphore = Semaphore;
class Mutex extends Semaphore {
    constructor() {
        super(1);
    }
}
exports.Mutex = Mutex;

}).call(this)}).call(this,require('_process'),require("timers").setImmediate)

},{"_process":3,"timers":4}],2:[function(require,module,exports){
module.exports = function(haystack, needle, comparator, low, high) {
  var mid, cmp;

  if(low === undefined)
    low = 0;

  else {
    low = low|0;
    if(low < 0 || low >= haystack.length)
      throw new RangeError("invalid lower bound");
  }

  if(high === undefined)
    high = haystack.length - 1;

  else {
    high = high|0;
    if(high < low || high >= haystack.length)
      throw new RangeError("invalid upper bound");
  }

  while(low <= high) {
    // The naive `low + high >>> 1` could fail for array lengths > 2**31
    // because `>>>` converts its operands to int32. `low + (high - low >>> 1)`
    // works for array lengths <= 2**32-1 which is also Javascript's max array
    // length.
    mid = low + ((high - low) >>> 1);
    cmp = +comparator(haystack[mid], needle, mid, haystack);

    // Too low.
    if(cmp < 0.0)
      low  = mid + 1;

    // Too high.
    else if(cmp > 0.0)
      high = mid - 1;

    // Key found.
    else
      return mid;
  }

  // Key not found.
  return ~low;
}

},{}],3:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],4:[function(require,module,exports){
(function (setImmediate,clearImmediate){(function (){
var nextTick = require('process/browser.js').nextTick;
var apply = Function.prototype.apply;
var slice = Array.prototype.slice;
var immediateIds = {};
var nextImmediateId = 0;

// DOM APIs, for completeness

exports.setTimeout = function() {
  return new Timeout(apply.call(setTimeout, window, arguments), clearTimeout);
};
exports.setInterval = function() {
  return new Timeout(apply.call(setInterval, window, arguments), clearInterval);
};
exports.clearTimeout =
exports.clearInterval = function(timeout) { timeout.close(); };

function Timeout(id, clearFn) {
  this._id = id;
  this._clearFn = clearFn;
}
Timeout.prototype.unref = Timeout.prototype.ref = function() {};
Timeout.prototype.close = function() {
  this._clearFn.call(window, this._id);
};

// Does not start the time, just sets up the members needed.
exports.enroll = function(item, msecs) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = msecs;
};

exports.unenroll = function(item) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = -1;
};

exports._unrefActive = exports.active = function(item) {
  clearTimeout(item._idleTimeoutId);

  var msecs = item._idleTimeout;
  if (msecs >= 0) {
    item._idleTimeoutId = setTimeout(function onTimeout() {
      if (item._onTimeout)
        item._onTimeout();
    }, msecs);
  }
};

// That's not how node.js implements it but the exposed api is the same.
exports.setImmediate = typeof setImmediate === "function" ? setImmediate : function(fn) {
  var id = nextImmediateId++;
  var args = arguments.length < 2 ? false : slice.call(arguments, 1);

  immediateIds[id] = true;

  nextTick(function onNextTick() {
    if (immediateIds[id]) {
      // fn.call() is faster so we optimize for the common use-case
      // @see http://jsperf.com/call-apply-segu
      if (args) {
        fn.apply(null, args);
      } else {
        fn.call(null);
      }
      // Prevent ids from leaking
      exports.clearImmediate(id);
    }
  });

  return id;
};

exports.clearImmediate = typeof clearImmediate === "function" ? clearImmediate : function(id) {
  delete immediateIds[id];
};
}).call(this)}).call(this,require("timers").setImmediate,require("timers").clearImmediate)

},{"process/browser.js":3,"timers":4}],5:[function(require,module,exports){
"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.get = exports.load = void 0;
const Lib = __importStar(require("../lib"));
const suits = ['Clubs', 'Dmnds', 'Hearts', 'Spades', 'Joker'];
const ranks = ['Small', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'Big'];
const cardImages = new Map();
async function load() {
    // load card images asynchronously
    for (let suit = 0; suit <= 4; ++suit) {
        for (let rank = 0; rank <= 14; ++rank) {
            if (suit === Lib.Suit.Joker) {
                if (0 < rank && rank < 14) {
                    continue;
                }
            }
            else {
                if (rank < 1 || 13 < rank) {
                    continue;
                }
            }
            const image = new Image();
            image.src = `PaperCards/${suits[suit]}/${ranks[rank]}of${suits[suit]}.png`;
            image.onload = () => {
                console.log(`loaded '${image.src}'`);
                cardImages.set(JSON.stringify([suit, rank]), image);
            };
        }
    }
    for (let i = 0; i < 4; ++i) {
        const image = new Image();
        image.src = `PaperCards/CardBack${i}.png`;
        image.onload = () => {
            console.log(`loaded '${image.src}'`);
            cardImages.set(`Back${i}`, image);
        };
    }
    const blankImage = new Image();
    blankImage.src = 'PaperCards/Blank Card.png';
    blankImage.onload = () => {
        console.log(`loaded '${blankImage.src}'`);
        cardImages.set('Blank', blankImage);
    };
    while (cardImages.size < 4 * 13 + 7) {
        await Lib.delay(10);
    }
    console.log('all card images loaded');
}
exports.load = load;
function get(stringFromCard) {
    const image = cardImages.get(stringFromCard);
    if (image === undefined) {
        throw new Error(`couldn't find image: ${stringFromCard}`);
    }
    return image;
}
exports.get = get;
},{"../lib":14}],6:[function(require,module,exports){
"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const Lib = __importStar(require("../lib"));
const State = __importStar(require("./state"));
const VP = __importStar(require("./view-params"));
const CardImages = __importStar(require("./card-images"));
const Render = __importStar(require("./render"));
// refreshing should rejoin the same game
window.history.pushState(undefined, State.gameId, `/game?gameId=${State.gameId}&playerName=${State.playerName}`);
window.onresize = VP.recalculateParameters;
window.onscroll = VP.recalculateParameters;
window.game = async function game() {
    const joinPromise = State.joinGame(State.gameId, State.playerName);
    await CardImages.load(); // concurrently
    await joinPromise;
    VP.recalculateParameters();
    // rendering must be synchronous, or else it flickers
    window.requestAnimationFrame(Render.render);
    // initialize input
    while (State.gameState === undefined) {
        await Lib.delay(100);
    }
    const unlock = await State.lock();
    try {
        State.setSpriteTargets(State.gameState);
    }
    finally {
        unlock();
    }
};
},{"../lib":14,"./card-images":5,"./render":9,"./state":11,"./view-params":13}],7:[function(require,module,exports){
"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.action = void 0;
const Lib = __importStar(require("../lib"));
const State = __importStar(require("./state"));
const VP = __importStar(require("./view-params"));
const vector_1 = __importDefault(require("./vector"));
const doubleClickThreshold = 500; // milliseconds
const moveThreshold = 0.5 * VP.pixelsPerCM;
exports.action = "None";
let previousClickTime = -1;
let previousClickIndex = -1;
let mouseDownPosition = { x: 0, y: 0 };
let mouseMovePosition = { x: 0, y: 0 };
let exceededDragThreshold = false;
let holdingControl = false;
let holdingShift = false;
window.onkeydown = (e) => {
    if (e.key === "Control") {
        holdingControl = true;
    }
    else if (e.key === "Shift") {
        holdingShift = true;
    }
};
window.onkeyup = (e) => {
    if (e.key === "Control") {
        holdingControl = false;
    }
    else if (e.key === "Shift") {
        holdingShift = false;
    }
};
function getMousePosition(e) {
    return new vector_1.default(VP.canvas.width * (e.clientX - VP.canvasRect.left) / VP.canvasRect.width, VP.canvas.height * (e.clientY - VP.canvasRect.top) / VP.canvasRect.height);
}
VP.canvas.onmousedown = async (event) => {
    const unlock = await State.lock();
    try {
        mouseDownPosition = getMousePosition(event);
        mouseMovePosition = mouseDownPosition;
        exceededDragThreshold = false;
        const deckPosition = State.deckSprites[State.deckSprites.length - 1]?.position;
        if (VP.sortByRankBounds[0].x < mouseDownPosition.x && mouseDownPosition.x < VP.sortByRankBounds[1].x &&
            VP.sortByRankBounds[0].y < mouseDownPosition.y && mouseDownPosition.y < VP.sortByRankBounds[1].y) {
            exports.action = "SortByRank";
        }
        else if (VP.sortBySuitBounds[0].x < mouseDownPosition.x && mouseDownPosition.x < VP.sortBySuitBounds[1].x &&
            VP.sortBySuitBounds[0].y < mouseDownPosition.y && mouseDownPosition.y < VP.sortBySuitBounds[1].y) {
            exports.action = "SortBySuit";
        }
        else if (deckPosition !== undefined &&
            deckPosition.x < mouseDownPosition.x && mouseDownPosition.x < deckPosition.x + VP.spriteWidth &&
            deckPosition.y < mouseDownPosition.y && mouseDownPosition.y < deckPosition.y + VP.spriteHeight) {
            exports.action = {
                mousePositionToSpritePosition: deckPosition.sub(mouseDownPosition),
                type: "DrawFromDeck"
            };
        }
        else {
            // because we render left to right, the rightmost card under the mouse position is what we should return
            const sprites = State.faceSpritesForPlayer[State.gameState?.playerIndex];
            if (sprites === undefined)
                return;
            let deselect = true;
            for (let i = sprites.length - 1; i >= 0; --i) {
                const position = sprites[i]?.position;
                if (position !== undefined &&
                    position.x < mouseDownPosition.x && mouseDownPosition.x < position.x + VP.spriteWidth &&
                    position.y < mouseDownPosition.y && mouseDownPosition.y < position.y + VP.spriteHeight) {
                    deselect = false;
                    exports.action = {
                        cardIndex: i,
                        mousePositionToSpritePosition: position.sub(mouseDownPosition),
                        type: holdingControl && holdingShift ? "ControlShiftClick" :
                            holdingControl ? "ControlClick" :
                                holdingShift ? "ShiftClick" : "Click"
                    };
                    break;
                }
            }
            if (deselect) {
                exports.action = "Deselect";
            }
        }
    }
    finally {
        unlock();
    }
};
VP.canvas.onmousemove = async (event) => {
    if (State.gameState === undefined)
        throw new Error();
    const unlock = await State.lock();
    try {
        mouseMovePosition = getMousePosition(event);
        exceededDragThreshold = exceededDragThreshold || mouseMovePosition.distance(mouseDownPosition) > moveThreshold;
        if (exports.action === "None") {
            // do nothing
        }
        else if (exports.action === "SortBySuit") {
            // TODO: check whether mouse position has left button bounds
        }
        else if (exports.action === "SortByRank") {
            // TODO: check whether mouse position has left button bounds
        }
        else if (exports.action === "Deselect") {
            // TODO: box selection?
        }
        else if (exports.action.type === "DrawFromDeck" || exports.action.type === "WaitingForNewCard") {
            const deckSprite = State.deckSprites[State.deckSprites.length - 1];
            if (deckSprite === undefined)
                return;
            deckSprite.target = mouseMovePosition.add(exports.action.mousePositionToSpritePosition);
            if (exports.action.type === "DrawFromDeck" && exceededDragThreshold) {
                exports.action = { ...exports.action, type: "WaitingForNewCard" };
                // card drawing will try to lock the state, so we must attach a callback instead of awaiting
                State.drawCard().then(onCardDrawn(deckSprite)).catch(_ => {
                    if (exports.action !== "None" &&
                        exports.action !== "Deselect" &&
                        exports.action !== "SortByRank" &&
                        exports.action !== "SortBySuit" &&
                        exports.action.type === "WaitingForNewCard") {
                        exports.action = "None";
                    }
                });
            }
        }
        else if (exports.action.type === "ReturnToDeck" || exports.action.type === "Reorder") {
            const sprites = State.faceSpritesForPlayer[State.gameState.playerIndex];
            if (sprites === undefined)
                throw new Error();
            const mouseDownSprite = sprites[exports.action.cardIndex];
            if (mouseDownSprite === undefined)
                throw new Error();
            // move all selected cards as a group around the card under the mouse position
            for (const selectedIndex of State.selectedIndices) {
                const sprite = sprites[selectedIndex];
                if (sprite === undefined)
                    throw new Error();
                sprite.target = mouseMovePosition.add(exports.action.mousePositionToSpritePosition).add(new vector_1.default((selectedIndex - exports.action.cardIndex) * VP.spriteGap, 0));
            }
            drag(State.gameState, exports.action.cardIndex, exports.action.mousePositionToSpritePosition);
        }
        else if (exports.action.type === "ControlShiftClick" ||
            exports.action.type === "ControlClick" ||
            exports.action.type === "ShiftClick" ||
            exports.action.type === "Click") {
            if (exceededDragThreshold) {
                // dragging a non-selected card selects it and only it
                let i = Lib.binarySearchNumber(State.selectedIndices, exports.action.cardIndex);
                if (i < 0) {
                    i = 0;
                    State.selectedIndices.splice(i, State.selectedIndices.length, exports.action.cardIndex);
                }
                drag(State.gameState, exports.action.cardIndex, exports.action.mousePositionToSpritePosition);
            }
        }
        else {
            const _ = exports.action;
        }
    }
    finally {
        unlock();
    }
};
VP.canvas.onmouseup = async () => {
    if (State.gameState === undefined)
        throw new Error();
    const unlock = await State.lock();
    try {
        if (exports.action === "None") {
            // do nothing
        }
        else if (exports.action === "SortByRank") {
            await State.sortByRank(State.gameState);
        }
        else if (exports.action === "SortBySuit") {
            await State.sortBySuit(State.gameState);
        }
        else if (exports.action === "Deselect") {
            State.selectedIndices.splice(0, State.selectedIndices.length);
        }
        else if (exports.action.type === "DrawFromDeck" || exports.action.type === "WaitingForNewCard") {
            // do nothing
        }
        else if (exports.action.type === "Reorder") {
            previousClickIndex = exports.action.cardIndex;
            await State.reorderCards(State.gameState);
        }
        else if (exports.action.type === "ReturnToDeck") {
            previousClickIndex = -1;
            await State.returnCardsToDeck(State.gameState);
        }
        else if (exports.action.type === "ControlShiftClick") {
            if (previousClickIndex === -1) {
                previousClickIndex = exports.action.cardIndex;
            }
            const start = Math.min(exports.action.cardIndex, previousClickIndex);
            const end = Math.max(exports.action.cardIndex, previousClickIndex);
            for (let i = start; i <= end; ++i) {
                let j = Lib.binarySearchNumber(State.selectedIndices, i);
                if (j < 0) {
                    State.selectedIndices.splice(~j, 0, i);
                }
            }
        }
        else if (exports.action.type === "ControlClick") {
            previousClickIndex = exports.action.cardIndex;
            let i = Lib.binarySearchNumber(State.selectedIndices, exports.action.cardIndex);
            if (i < 0) {
                State.selectedIndices.splice(~i, 0, exports.action.cardIndex);
            }
            else {
                State.selectedIndices.splice(i, 1);
            }
        }
        else if (exports.action.type === "ShiftClick") {
            if (previousClickIndex === -1) {
                previousClickIndex = exports.action.cardIndex;
            }
            const start = Math.min(exports.action.cardIndex, previousClickIndex);
            const end = Math.max(exports.action.cardIndex, previousClickIndex);
            State.selectedIndices.splice(0, State.selectedIndices.length);
            for (let i = start; i <= end; ++i) {
                State.selectedIndices.push(i);
            }
        }
        else if (exports.action.type === "Click") {
            previousClickIndex = exports.action.cardIndex;
            State.selectedIndices.splice(0, State.selectedIndices.length, exports.action.cardIndex);
        }
        State.setSpriteTargets(State.gameState);
        exports.action = "None";
    }
    finally {
        unlock();
    }
};
function onCardDrawn(deckSprite) {
    return async () => {
        if (State.gameState === undefined)
            throw new Error();
        const unlock = await State.lock();
        try {
            if (exports.action !== "None" &&
                exports.action !== "SortBySuit" &&
                exports.action !== "SortByRank" &&
                exports.action !== "Deselect" &&
                exports.action.type === "WaitingForNewCard") {
                // immediately select newly acquired card
                const cardIndex = State.gameState.playerCards.length - 1;
                State.selectedIndices.splice(0, State.selectedIndices.length);
                State.selectedIndices.push(cardIndex);
                // new card should appear in place of dragged card from deck without animation
                const faceSpriteAtMouseDown = State.faceSpritesForPlayer[State.gameState.playerIndex]?.[cardIndex];
                if (faceSpriteAtMouseDown === undefined)
                    throw new Error();
                faceSpriteAtMouseDown.target = deckSprite.position;
                faceSpriteAtMouseDown.position = deckSprite.position;
                faceSpriteAtMouseDown.velocity = deckSprite.velocity;
                drag(State.gameState, cardIndex, exports.action.mousePositionToSpritePosition);
            }
        }
        finally {
            unlock();
        }
    };
}
function drag(gameState, cardIndex, mousePositionToSpritePosition) {
    const sprites = State.faceSpritesForPlayer[gameState.playerIndex];
    if (sprites === undefined)
        throw new Error();
    const cards = gameState.playerCards;
    const movingSpritesAndCards = [];
    const reservedSpritesAndCards = [];
    let splitIndex;
    let revealCount = gameState.playerRevealCount;
    // extract moving sprites
    for (const i of State.selectedIndices) {
        const sprite = sprites[i];
        const card = cards[i];
        if (sprite === undefined || card === undefined)
            throw new Error();
        movingSpritesAndCards.push([sprite, card]);
        if (i < gameState.playerRevealCount) {
            --revealCount;
        }
    }
    // extract reserved sprites
    for (let i = 0; i < sprites.length; ++i) {
        if (Lib.binarySearchNumber(State.selectedIndices, i) < 0) {
            const sprite = sprites[i];
            const card = cards[i];
            if (sprite === undefined || card === undefined)
                throw new Error();
            reservedSpritesAndCards.push([sprite, card]);
        }
    }
    // find the held sprites, if any, overlapped by the dragged sprites
    const leftMovingSprite = movingSpritesAndCards[0]?.[0];
    const rightMovingSprite = movingSpritesAndCards[movingSpritesAndCards.length - 1]?.[0];
    if (leftMovingSprite === undefined || rightMovingSprite === undefined) {
        throw new Error();
    }
    const deckDistance = Math.abs(leftMovingSprite.target.y - (State.deckSprites[0]?.position.y ?? Infinity));
    const revealDistance = Math.abs(leftMovingSprite.target.y - (VP.canvas.height - 2 * VP.spriteHeight));
    const hideDistance = Math.abs(leftMovingSprite.target.y - (VP.canvas.height - VP.spriteHeight));
    // set the action for onmouseup
    if (deckDistance < revealDistance && deckDistance < hideDistance) {
        exports.action = { cardIndex, mousePositionToSpritePosition, type: "ReturnToDeck" };
        splitIndex = reservedSpritesAndCards.length;
    }
    else {
        exports.action = { cardIndex, mousePositionToSpritePosition, type: "Reorder" };
        // determine whether the moving sprites are closer to the revealed sprites or to the hidden sprites
        const splitRevealed = revealDistance < hideDistance;
        const start = splitRevealed ? 0 : revealCount;
        const end = splitRevealed ? revealCount : reservedSpritesAndCards.length;
        let leftIndex = undefined;
        let rightIndex = undefined;
        for (let i = start; i < end; ++i) {
            const reservedSprite = reservedSpritesAndCards[i]?.[0];
            if (reservedSprite === undefined)
                throw new Error();
            if (leftMovingSprite.target.x < reservedSprite.target.x &&
                reservedSprite.target.x < rightMovingSprite.target.x) {
                if (leftIndex === undefined) {
                    leftIndex = i;
                }
                rightIndex = i;
            }
        }
        if (leftIndex !== undefined && rightIndex !== undefined) {
            const leftReservedSprite = reservedSpritesAndCards[leftIndex]?.[0];
            const rightReservedSprite = reservedSpritesAndCards[rightIndex]?.[0];
            if (leftReservedSprite === undefined || rightReservedSprite === undefined)
                throw new Error();
            const leftGap = leftReservedSprite.target.x - leftMovingSprite.target.x;
            const rightGap = rightMovingSprite.target.x - rightReservedSprite.target.x;
            if (leftGap < rightGap) {
                splitIndex = leftIndex;
            }
            else {
                splitIndex = rightIndex + 1;
            }
        }
        else {
            // no overlapped sprites, so the index is the first reserved sprite to the right of the moving sprites
            for (splitIndex = start; splitIndex < end; ++splitIndex) {
                const reservedSprite = reservedSpritesAndCards[splitIndex]?.[0];
                if (reservedSprite === undefined)
                    throw new Error();
                if (rightMovingSprite.target.x < reservedSprite.target.x) {
                    break;
                }
            }
        }
        // adjust reveal count
        if (splitIndex < revealCount ||
            splitIndex === revealCount && splitRevealed) {
            revealCount += movingSpritesAndCards.length;
        }
    }
    const savedCardIndex = exports.action.cardIndex;
    // adjust selected indices
    for (let i = 0; i < State.selectedIndices.length; ++i) {
        if (exports.action.cardIndex === State.selectedIndices[i]) {
            console.log(`set action.cardIndex to ${splitIndex + i}`);
            exports.action.cardIndex = splitIndex + i;
        }
        State.selectedIndices[i] = splitIndex + i;
    }
    console.log(savedCardIndex, exports.action.cardIndex, State.selectedIndices);
    State.setSpriteTargets(gameState, reservedSpritesAndCards, movingSpritesAndCards, revealCount, splitIndex, exports.action.type === "ReturnToDeck");
}
},{"../lib":14,"./state":11,"./vector":12,"./view-params":13}],8:[function(require,module,exports){
"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const Lib = __importStar(require("../lib"));
const playerNameElement = document.getElementById('playerName');
const playerNameValue = Lib.getCookie('playerName');
if (playerNameElement !== null && playerNameValue !== undefined) {
    playerNameElement.value = playerNameValue;
}
const gameIdElement = document.getElementById('gameId');
const gameIdValue = Lib.getCookie('gameId');
if (gameIdElement !== null && gameIdValue !== undefined) {
    gameIdElement.value = gameIdValue;
}
},{"../lib":14}],9:[function(require,module,exports){
"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.render = void 0;
const Lib = __importStar(require("../lib"));
const State = __importStar(require("./state"));
const Input = __importStar(require("./input"));
const VP = __importStar(require("./view-params"));
const vector_1 = __importDefault(require("./vector"));
const deckDealDuration = 1000;
let deckDealTime = undefined;
let currentTime = undefined;
async function render(time) {
    while (State.gameState === undefined) {
        await Lib.delay(100);
    }
    const deltaTime = time - (currentTime !== undefined ? currentTime : time);
    currentTime = time;
    const unlock = await State.lock();
    try {
        // clear the screen
        VP.context.clearRect(0, 0, VP.canvas.width, VP.canvas.height);
        renderBasics(State.gameId, State.playerName);
        renderDeck(time, deltaTime, State.gameState.deckCount);
        renderOtherPlayers(deltaTime, State.gameState);
        renderPlayer(deltaTime, State.gameState);
        renderButtons();
    }
    finally {
        unlock();
    }
    window.requestAnimationFrame(render);
}
exports.render = render;
function renderBasics(gameId, playerName) {
    VP.context.fillStyle = '#000000ff';
    VP.context.font = '0.75cm Irregularis';
    VP.context.fillText(`Game: ${gameId}`, 0, 0.75 * VP.pixelsPerCM);
    VP.context.fillText(`Your name is: ${playerName}`, 0, VP.canvas.height);
    VP.context.setLineDash([4, 2]);
    VP.context.strokeRect(VP.spriteHeight, VP.spriteHeight, VP.canvas.width - 2 * VP.spriteHeight, VP.canvas.height - 2 * VP.spriteHeight);
}
function renderDeck(time, deltaTime, deckCount) {
    VP.context.save();
    try {
        if (deckDealTime === undefined) {
            deckDealTime = time;
        }
        for (let i = 0; i < State.deckSprites.length; ++i) {
            const deckSprite = State.deckSprites[i];
            if (deckSprite === undefined)
                throw new Error();
            if (i === deckCount - 1 &&
                Input.action !== "None" &&
                Input.action !== "SortBySuit" &&
                Input.action !== "SortByRank" &&
                Input.action !== "Deselect" && (Input.action.type === "DrawFromDeck" ||
                Input.action.type === "WaitingForNewCard")) {
                // set in onmousemove
            }
            else if (time - deckDealTime < i * deckDealDuration / deckCount) {
                // card not yet dealt; keep top left
                deckSprite.position = new vector_1.default(-VP.spriteWidth, -VP.spriteHeight);
                deckSprite.target = new vector_1.default(-VP.spriteWidth, -VP.spriteHeight);
            }
            else {
                deckSprite.target = new vector_1.default(VP.canvas.width / 2 - VP.spriteWidth / 2 - (i - deckCount / 2) * VP.spriteDeckGap, VP.canvas.height / 2 - VP.spriteHeight / 2);
            }
            deckSprite.animate(deltaTime);
        }
    }
    finally {
        VP.context.restore();
    }
}
function renderOtherPlayers(deltaTime, gameState) {
    VP.context.save();
    try {
        VP.context.translate(0, (VP.canvas.width + VP.canvas.height) / 2);
        VP.context.rotate(-Math.PI / 2);
        renderOtherPlayer(deltaTime, gameState, (gameState.playerIndex + 1) % 4);
    }
    finally {
        VP.context.restore();
    }
    VP.context.save();
    try {
        renderOtherPlayer(deltaTime, gameState, (gameState.playerIndex + 2) % 4);
    }
    finally {
        VP.context.restore();
    }
    VP.context.save();
    try {
        VP.context.translate(VP.canvas.width, (VP.canvas.height - VP.canvas.width) / 2);
        VP.context.rotate(Math.PI);
        renderOtherPlayer(deltaTime, gameState, (gameState.playerIndex + 3) % 4);
    }
    finally {
        VP.context.restore();
    }
}
function renderOtherPlayer(deltaTime, gameState, playerIndex) {
    const player = gameState.otherPlayers[playerIndex];
    if (player === undefined)
        return;
    VP.context.fillStyle = '#000000ff';
    VP.context.font = `${VP.spriteGap}px Irregularis`;
    VP.context.fillText(player.name, VP.canvas.width / 2, VP.spriteHeight + VP.spriteGap);
    const deckPosition = State.deckSprites[State.deckSprites.length - 1]?.position ??
        new vector_1.default(VP.canvas.width / 2 - VP.spriteWidth / 2, VP.canvas.height / 2 - VP.spriteHeight / 2);
    const deckPoint = VP.context.getTransform().inverse().transformPoint({
        w: 1,
        x: deckPosition.x,
        y: deckPosition.y,
        z: 0
    });
    let i = 0;
    const faceSprites = State.faceSpritesForPlayer[playerIndex];
    if (faceSprites === undefined)
        throw new Error();
    for (const faceSprite of faceSprites) {
        faceSprite.target = new vector_1.default(VP.canvas.width / 2 - VP.spriteWidth / 2 + (i++ - faceSprites.length / 2) * VP.spriteGap, VP.spriteHeight);
        faceSprite.animate(deltaTime);
    }
    i = 0;
    const backSprites = State.backSpritesForPlayer[playerIndex];
    if (backSprites === undefined)
        throw new Error();
    for (const backSprite of backSprites) {
        backSprite.target = new vector_1.default(VP.canvas.width / 2 - VP.spriteWidth / 2 + (i++ - backSprites.length / 2) * VP.spriteGap, 0);
        backSprite.animate(deltaTime);
    }
}
// returns the adjusted reveal index
function renderPlayer(deltaTime, gameState) {
    const sprites = State.faceSpritesForPlayer[gameState.playerIndex];
    if (sprites === undefined)
        return;
    let i = 0;
    for (const sprite of sprites) {
        sprite.animate(deltaTime);
        if (Lib.binarySearchNumber(State.selectedIndices, i++) >= 0) {
            VP.context.fillStyle = '#00808040';
            VP.context.fillRect(sprite.position.x, sprite.position.y, VP.spriteWidth, VP.spriteHeight);
        }
    }
}
function renderButtons() {
    VP.context.save();
    try {
        // blur image behind
        //stackBlurCanvasRGBA('canvas', x, y, canvas.width - x, canvas.height - y, 16);
        const x = VP.sortBySuitBounds[0].x - 4 * VP.pixelsPerCM;
        const y = VP.sortBySuitBounds[0].y;
        VP.context.fillStyle = '#00ffff77';
        VP.context.fillRect(x, y, VP.canvas.width - x, VP.canvas.height - y);
        VP.context.fillStyle = '#000000ff';
        VP.context.font = '1.5cm Irregularis';
        VP.context.fillText('SORT', x + 0.25 * VP.pixelsPerCM, y + 2.25 * VP.pixelsPerCM);
        VP.context.font = '3cm Irregularis';
        VP.context.fillText('{', x + 3 * VP.pixelsPerCM, y + 2.75 * VP.pixelsPerCM);
        VP.context.font = '1.5cm Irregularis';
        VP.context.fillText('SUIT', VP.sortBySuitBounds[0].x, VP.sortBySuitBounds[1].y);
        VP.context.font = '1.5cm Irregularis';
        VP.context.fillText('RANK', VP.sortByRankBounds[0].x, VP.sortByRankBounds[1].y);
        //context.fillStyle = '#ff000077';
        //context.fillRect(VP.sortBySuitBounds[0].x, VP.sortBySuitBounds[0].y,
        //sortBySuitBounds[1].x - sortBySuitBounds[0].x, sortBySuitBounds[1].y - sortBySuitBounds[0].y);
        //context.fillStyle = '#0000ff77';
        //context.fillRect(sortByRankBounds[0].x, sortByRankBounds[0].y,
        //sortByRankBounds[1].x - sortByRankBounds[0].x, sortByRankBounds[1].y - sortByRankBounds[0].y);
    }
    finally {
        VP.context.restore();
    }
}
},{"../lib":14,"./input":7,"./state":11,"./vector":12,"./view-params":13}],10:[function(require,module,exports){
"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const vector_1 = __importDefault(require("./vector"));
const VP = __importStar(require("./view-params"));
const springConstant = 1000;
const mass = 1;
const drag = Math.sqrt(4 * mass * springConstant);
// state for physics-based animations
class Sprite {
    //bad = false;
    constructor(image) {
        this.image = image;
        this.target = new vector_1.default(0, 0);
        this.position = new vector_1.default(0, 0);
        this.velocity = new vector_1.default(0, 0);
    }
    animate(deltaTime) {
        const springForce = this.target.sub(this.position).scale(springConstant);
        const dragForce = this.velocity.scale(-drag);
        const acceleration = springForce.add(dragForce).scale(1 / mass);
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
exports.default = Sprite;
},{"./vector":12,"./view-params":13}],11:[function(require,module,exports){
"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.sortByRank = exports.sortBySuit = exports.reorderCards = exports.returnCardsToDeck = exports.drawCard = exports.joinGame = exports.setSpriteTargets = exports.faceSpritesForPlayer = exports.backSpritesForPlayer = exports.deckSprites = exports.selectedIndices = exports.gameState = exports.previousGameState = exports.lock = exports.gameId = exports.playerName = void 0;
const await_semaphore_1 = require("await-semaphore");
const Lib = __importStar(require("../lib"));
const CardImages = __importStar(require("./card-images"));
const VP = __importStar(require("./view-params"));
const sprite_1 = __importDefault(require("./sprite"));
const vector_1 = __importDefault(require("./vector"));
const playerNameFromCookie = Lib.getCookie('playerName');
if (playerNameFromCookie === undefined)
    throw new Error('No player name!');
exports.playerName = playerNameFromCookie;
const gameIdFromCookie = Lib.getCookie('gameId');
if (gameIdFromCookie === undefined)
    throw new Error('No game id!');
exports.gameId = gameIdFromCookie;
// some state-manipulating operations are asynchronous, so we need to guard against races
const stateMutex = new await_semaphore_1.Mutex();
async function lock() {
    //console.log(`acquiring state lock...\n${new Error().stack}`);
    const release = await stateMutex.acquire();
    //console.log(`acquired state lock\n${new Error().stack}`);
    return () => {
        release();
        //console.log(`released state lock`);
    };
}
exports.lock = lock;
// indices of cards for drag & drop
// IMPORTANT: this array must always be sorted!
// Always use binarySearch to insert and delete or sort after manipulation
exports.selectedIndices = [];
// for animating the deck
exports.deckSprites = [];
// associative arrays, one for each player at their player index
// each element corresponds to a face-down card by index
exports.backSpritesForPlayer = [];
// each element corresponds to a face-up card by index
exports.faceSpritesForPlayer = [];
// open websocket connection to get game state updates
let ws = new WebSocket(`wss://${window.location.hostname}/`);
const callbacksForMethodName = new Map();
function addCallback(methodName, resolve, reject) {
    console.log(`adding callback for method '${methodName}'`);
    let callbacks = callbacksForMethodName.get(methodName);
    if (callbacks === undefined) {
        callbacks = [];
        callbacksForMethodName.set(methodName, callbacks);
    }
    callbacks.push(result => {
        console.log(`invoking callback for method '${methodName}'`);
        if ('errorDescription' in result) {
            reject(result.errorDescription);
        }
        else {
            resolve();
        }
    });
}
ws.onmessage = async (e) => {
    const obj = JSON.parse(e.data);
    if ('methodName' in obj) {
        const returnMessage = obj;
        const methodName = returnMessage.methodName;
        const callbacks = callbacksForMethodName.get(methodName);
        if (callbacks === undefined || callbacks.length === 0) {
            throw new Error(`no callbacks found for method: ${methodName}`);
        }
        const callback = callbacks.shift();
        if (callback === undefined) {
            throw new Error(`callback is undefined for method: ${methodName}`);
        }
        callback(returnMessage);
    }
    else if ('deckCount' in obj &&
        'activePlayerIndex' in obj &&
        'playerIndex' in obj &&
        'playerCards' in obj &&
        'playerRevealCount' in obj &&
        'otherPlayers' in obj) {
        const unlock = await lock();
        try {
            exports.previousGameState = exports.gameState;
            exports.gameState = obj;
            if (exports.previousGameState !== undefined) {
                console.log(`previousGameState.playerCards: ${JSON.stringify(exports.previousGameState.playerCards)}`);
                console.log(`previous selectedIndices: ${JSON.stringify(exports.selectedIndices)}`);
                console.log(`previous selectedCards: ${JSON.stringify(exports.selectedIndices.map(i => exports.previousGameState?.playerCards[i]))}`);
            }
            // selected indices might have shifted
            for (let i = 0; i < exports.selectedIndices.length; ++i) {
                const selectedIndex = exports.selectedIndices[i];
                if (selectedIndex === undefined)
                    throw new Error();
                if (JSON.stringify(exports.gameState.playerCards[selectedIndex]) !== JSON.stringify(exports.previousGameState?.playerCards[selectedIndex])) {
                    let found = false;
                    for (let j = 0; j < exports.gameState.playerCards.length; ++j) {
                        if (JSON.stringify(exports.gameState.playerCards[j]) === JSON.stringify(exports.previousGameState?.playerCards[selectedIndex])) {
                            exports.selectedIndices[i] = j;
                            found = true;
                            break;
                        }
                    }
                    if (!found) {
                        exports.selectedIndices.splice(i, 1);
                        --i;
                    }
                }
            }
            // binary search still needs to work
            exports.selectedIndices.sort((a, b) => a - b);
            // initialize animation states
            associateAnimationsWithCards(exports.previousGameState, exports.gameState);
            console.log(`gameState.playerCards: ${JSON.stringify(exports.gameState.playerCards)}`);
            console.log(`selectedIndices: ${JSON.stringify(exports.selectedIndices)}`);
            console.log(`selectedCards: ${JSON.stringify(exports.selectedIndices.map(i => exports.gameState?.playerCards[i]))}`);
        }
        finally {
            unlock();
        }
    }
    else {
        throw new Error(JSON.stringify(e.data));
    }
};
let onAnimationsAssociated = () => { };
function associateAnimationsWithCards(previousGameState, gameState) {
    exports.deckSprites.splice(gameState.deckCount, exports.deckSprites.length - gameState.deckCount);
    for (let i = exports.deckSprites.length; i < gameState.deckCount; ++i) {
        exports.deckSprites[i] = new sprite_1.default(CardImages.get('Back0'));
    }
    const previousBackSpritesForPlayer = exports.backSpritesForPlayer;
    exports.backSpritesForPlayer = [];
    // reuse previous face sprites as much as possible to maintain continuity
    const previousFaceSpritesForPlayer = exports.faceSpritesForPlayer;
    exports.faceSpritesForPlayer = [];
    for (let i = 0; i < 4; ++i) {
        let previousFaceCards;
        let faceCards;
        let previousBackSprites = previousBackSpritesForPlayer[i] ?? [];
        let backSprites = [];
        exports.backSpritesForPlayer[i] = backSprites;
        if (i == gameState.playerIndex) {
            previousFaceCards = previousGameState?.playerCards ?? [];
            faceCards = gameState.playerCards;
        }
        else {
            let previousOtherPlayer = previousGameState?.otherPlayers[i];
            let otherPlayer = gameState.otherPlayers[i];
            previousFaceCards = previousOtherPlayer?.revealedCards ?? [];
            faceCards = otherPlayer?.revealedCards ?? [];
            for (let j = 0; j < (otherPlayer?.cardCount ?? 0) - (otherPlayer?.revealedCards?.length ?? 0); ++j) {
                backSprites[j] = new sprite_1.default(CardImages.get(`Back${i}`));
            }
        }
        let previousFaceSprites = previousFaceSpritesForPlayer[i] ?? [];
        let faceSprites = [];
        exports.faceSpritesForPlayer[i] = faceSprites;
        for (let j = 0; j < faceCards.length; ++j) {
            let found = false;
            for (let k = 0; k < previousFaceCards.length; ++k) {
                if (JSON.stringify(faceCards[j]) === JSON.stringify(previousFaceCards[k])) {
                    const previousFaceSprite = previousFaceSprites[k];
                    if (previousFaceSprite === undefined)
                        throw new Error();
                    faceSprites[j] = previousFaceSprite;
                    // remove to avoid associating another sprite with the same card
                    previousFaceSprites.splice(k, 1);
                    previousFaceCards.splice(k, 1);
                    found = true;
                    break;
                }
            }
            if (!found) {
                const faceCard = faceCards[j];
                if (faceCard === undefined)
                    throw new Error();
                faceSprites[j] = new sprite_1.default(CardImages.get(JSON.stringify(faceCard)));
            }
        }
    }
    setSpriteTargets(gameState);
    onAnimationsAssociated();
}
function setSpriteTargets(gameState, reservedSpritesAndCards, movingSpritesAndCards, revealCount, splitIndex, returnToDeck) {
    const sprites = exports.faceSpritesForPlayer[gameState.playerIndex];
    if (sprites === undefined)
        throw new Error();
    const cards = gameState.playerCards;
    reservedSpritesAndCards = reservedSpritesAndCards ?? cards.map((card, index) => [sprites[index], card]);
    movingSpritesAndCards = movingSpritesAndCards ?? [];
    revealCount = revealCount ?? gameState.playerRevealCount;
    splitIndex = splitIndex ?? cards.length;
    returnToDeck = returnToDeck ?? false;
    // clear for reinsertion
    sprites.splice(0, sprites.length);
    cards.splice(0, cards.length);
    for (const [reservedSprite, reservedCard] of reservedSpritesAndCards) {
        if (cards.length === splitIndex) {
            for (const [movingSprite, movingCard] of movingSpritesAndCards) {
                sprites.push(movingSprite);
                cards.push(movingCard);
            }
        }
        const i = cards.length < revealCount ? cards.length : cards.length - revealCount;
        const j = cards.length < revealCount ? revealCount : reservedSpritesAndCards.length + (returnToDeck ? 0 : movingSpritesAndCards.length) - revealCount;
        const y = cards.length < revealCount ? 2 * VP.spriteHeight : VP.spriteHeight;
        reservedSprite.target = new vector_1.default(VP.canvas.width / 2 - VP.spriteWidth / 2 + (i - j / 2) * VP.spriteGap, VP.canvas.height - y);
        sprites.push(reservedSprite);
        cards.push(reservedCard);
    }
    if (cards.length === splitIndex) {
        for (const [movingSprite, movingCard] of movingSpritesAndCards) {
            sprites.push(movingSprite);
            cards.push(movingCard);
        }
    }
    gameState.playerRevealCount = revealCount;
}
exports.setSpriteTargets = setSpriteTargets;
async function joinGame(gameId, playerName) {
    // wait for connection
    do {
        await Lib.delay(1000);
        console.log(`ws.readyState: ${ws.readyState}, WebSocket.OPEN: ${WebSocket.OPEN}`);
    } while (ws.readyState != WebSocket.OPEN);
    // try to join the game
    await new Promise((resolve, reject) => {
        addCallback('joinGame', resolve, reject);
        ws.send(JSON.stringify({ gameId, playerName }));
    });
}
exports.joinGame = joinGame;
async function drawCard() {
    const animationsAssociated = new Promise(resolve => {
        onAnimationsAssociated = () => {
            onAnimationsAssociated = () => { };
            resolve();
        };
    });
    await new Promise((resolve, reject) => {
        addCallback('drawCard', resolve, reject);
        ws.send(JSON.stringify({
            drawCard: null
        }));
    });
    await animationsAssociated;
}
exports.drawCard = drawCard;
async function returnCardsToDeck(gameState) {
    await new Promise((resolve, reject) => {
        addCallback('returnCardsToDeck', resolve, reject);
        ws.send(JSON.stringify({
            cardsToReturnToDeck: exports.selectedIndices.map(i => gameState.playerCards[i])
        }));
    });
    // make the selected cards disappear
    exports.selectedIndices.splice(0, exports.selectedIndices.length);
}
exports.returnCardsToDeck = returnCardsToDeck;
function reorderCards(gameState) {
    return new Promise((resolve, reject) => {
        addCallback('reorderCards', resolve, reject);
        ws.send(JSON.stringify({
            reorderedCards: gameState.playerCards,
            newRevealCount: gameState.playerRevealCount
        }));
    });
}
exports.reorderCards = reorderCards;
function sortBySuit(gameState) {
    let compareFn = ([aSuit, aRank], [bSuit, bRank]) => {
        if (aSuit !== bSuit) {
            return aSuit - bSuit;
        }
        else {
            return aRank - bRank;
        }
    };
    exports.previousGameState = JSON.parse(JSON.stringify(gameState));
    sortCards(gameState.playerCards, 0, gameState.playerRevealCount, compareFn);
    sortCards(gameState.playerCards, gameState.playerRevealCount, gameState.playerCards.length, compareFn);
    associateAnimationsWithCards(gameState, exports.previousGameState);
    return reorderCards(gameState);
}
exports.sortBySuit = sortBySuit;
function sortByRank(gameState) {
    let compareFn = ([aSuit, aRank], [bSuit, bRank]) => {
        if (aRank !== bRank) {
            return aRank - bRank;
        }
        else {
            return aSuit - bSuit;
        }
    };
    exports.previousGameState = JSON.parse(JSON.stringify(gameState));
    sortCards(gameState.playerCards, 0, gameState.playerRevealCount, compareFn);
    sortCards(gameState.playerCards, gameState.playerRevealCount, gameState.playerCards.length, compareFn);
    associateAnimationsWithCards(gameState, exports.previousGameState);
    return reorderCards(gameState);
}
exports.sortByRank = sortByRank;
function sortCards(cards, start, end, compareFn) {
    cards.splice(start, end - start, ...cards.slice(start, end).sort(compareFn));
}
},{"../lib":14,"./card-images":5,"./sprite":10,"./vector":12,"./view-params":13,"await-semaphore":1}],12:[function(require,module,exports){
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
},{}],13:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recalculateParameters = exports.sortByRankBounds = exports.sortBySuitBounds = exports.spriteDeckGap = exports.spriteGap = exports.spriteHeight = exports.spriteWidth = exports.pixelsPerPercent = exports.canvasRect = exports.pixelsPerCM = exports.context = exports.canvas = void 0;
const vector_1 = __importDefault(require("./vector"));
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
},{"./vector":12}],14:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rank = exports.Suit = exports.delay = exports.getParam = exports.getCookie = exports.binarySearchNumber = void 0;
const binary_search_1 = __importDefault(require("binary-search"));
function binarySearchNumber(haystack, needle, low, high) {
    return binary_search_1.default(haystack, needle, (a, b) => a - b, low, high);
}
exports.binarySearchNumber = binarySearchNumber;
function getCookie(name) {
    const parts = `; ${document.cookie}`.split(`; ${name}=`);
    if (parts.length === 2) {
        return parts.pop()?.split(';').shift();
    }
    else {
        return undefined;
    }
}
exports.getCookie = getCookie;
function getParam(name) {
    return window.location.search.split(`${name}=`)[1]?.split("&")[0];
}
exports.getParam = getParam;
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
exports.delay = delay;
var Suit;
(function (Suit) {
    Suit[Suit["Club"] = 0] = "Club";
    Suit[Suit["Diamond"] = 1] = "Diamond";
    Suit[Suit["Heart"] = 2] = "Heart";
    Suit[Suit["Spade"] = 3] = "Spade";
    Suit[Suit["Joker"] = 4] = "Joker";
})(Suit = exports.Suit || (exports.Suit = {}));
var Rank;
(function (Rank) {
    Rank[Rank["Small"] = 0] = "Small";
    Rank[Rank["Ace"] = 1] = "Ace";
    Rank[Rank["Two"] = 2] = "Two";
    Rank[Rank["Three"] = 3] = "Three";
    Rank[Rank["Four"] = 4] = "Four";
    Rank[Rank["Five"] = 5] = "Five";
    Rank[Rank["Six"] = 6] = "Six";
    Rank[Rank["Seven"] = 7] = "Seven";
    Rank[Rank["Eight"] = 8] = "Eight";
    Rank[Rank["Nine"] = 9] = "Nine";
    Rank[Rank["Ten"] = 10] = "Ten";
    Rank[Rank["Jack"] = 11] = "Jack";
    Rank[Rank["Queen"] = 12] = "Queen";
    Rank[Rank["King"] = 13] = "King";
    Rank[Rank["Big"] = 14] = "Big";
})(Rank = exports.Rank || (exports.Rank = {}));
},{"binary-search":2}]},{},[8,6])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYXdhaXQtc2VtYXBob3JlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2JpbmFyeS1zZWFyY2gvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL3RpbWVycy1icm93c2VyaWZ5L21haW4uanMiLCJzcmMvY2xpZW50L2NhcmQtaW1hZ2VzLnRzIiwic3JjL2NsaWVudC9nYW1lLnRzIiwic3JjL2NsaWVudC9pbnB1dC50cyIsInNyYy9jbGllbnQvbG9iYnkudHMiLCJzcmMvY2xpZW50L3JlbmRlci50cyIsInNyYy9jbGllbnQvc3ByaXRlLnRzIiwic3JjL2NsaWVudC9zdGF0ZS50cyIsInNyYy9jbGllbnQvdmVjdG9yLnRzIiwic3JjL2NsaWVudC92aWV3LXBhcmFtcy50cyIsInNyYy9saWIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUN4TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FDM0VBLDRDQUE4QjtBQUU5QixNQUFNLEtBQUssR0FBRyxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQztBQUM5RCxNQUFNLEtBQUssR0FBRyxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFFakcsTUFBTSxVQUFVLEdBQUcsSUFBSSxHQUFHLEVBQTRCLENBQUM7QUFFaEQsS0FBSyxVQUFVLElBQUk7SUFDdEIsa0NBQWtDO0lBQ2xDLEtB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QixPQUFPLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQzNELENBQUM7QUFGRCxzQkFFQztBQUVELElBQVksSUFNWDtBQU5ELFdBQVksSUFBSTtJQUNaLCtCQUFJLENBQUE7SUFDSixxQ0FBTyxDQUFBO0lBQ1AsaUNBQUssQ0FBQTtJQUNMLGlDQUFLLENBQUE7SUFDTCxpQ0FBSyxDQUFBO0FBQ1QsQ0FBQyxFQU5XLElBQUksR0FBSixZQUFJLEtBQUosWUFBSSxRQU1mO0FBRUQsSUFBWSxJQWdCWDtBQWhCRCxXQUFZLElBQUk7SUFDWixpQ0FBSyxDQUFBO0lBQ0wsNkJBQUcsQ0FBQTtJQUNILDZCQUFHLENBQUE7SUFDSCxpQ0FBSyxDQUFBO0lBQ0wsK0JBQUksQ0FBQTtJQUNKLCtCQUFJLENBQUE7SUFDSiw2QkFBRyxDQUFBO0lBQ0gsaUNBQUssQ0FBQTtJQUNMLGlDQUFLLENBQUE7SUFDTCwrQkFBSSxDQUFBO0lBQ0osOEJBQUcsQ0FBQTtJQUNILGdDQUFJLENBQUE7SUFDSixrQ0FBSyxDQUFBO0lBQ0wsZ0NBQUksQ0FBQTtJQUNKLDhCQUFHLENBQUE7QUFDUCxDQUFDLEVBaEJXLElBQUksR0FBSixZQUFJLEtBQUosWUFBSSxRQWdCZiIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIlwidXNlIHN0cmljdFwiO1xuY2xhc3MgU2VtYXBob3JlIHtcbiAgICBjb25zdHJ1Y3Rvcihjb3VudCkge1xuICAgICAgICB0aGlzLnRhc2tzID0gW107XG4gICAgICAgIHRoaXMuY291bnQgPSBjb3VudDtcbiAgICB9XG4gICAgc2NoZWQoKSB7XG4gICAgICAgIGlmICh0aGlzLmNvdW50ID4gMCAmJiB0aGlzLnRhc2tzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHRoaXMuY291bnQtLTtcbiAgICAgICAgICAgIGxldCBuZXh0ID0gdGhpcy50YXNrcy5zaGlmdCgpO1xuICAgICAgICAgICAgaWYgKG5leHQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHRocm93IFwiVW5leHBlY3RlZCB1bmRlZmluZWQgdmFsdWUgaW4gdGFza3MgbGlzdFwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGFjcXVpcmUoKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzLCByZWopID0+IHtcbiAgICAgICAgICAgIHZhciB0YXNrID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIHZhciByZWxlYXNlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHJlcygoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghcmVsZWFzZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbGVhc2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY291bnQrKztcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2NoZWQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHRoaXMudGFza3MucHVzaCh0YXNrKTtcbiAgICAgICAgICAgIGlmIChwcm9jZXNzICYmIHByb2Nlc3MubmV4dFRpY2spIHtcbiAgICAgICAgICAgICAgICBwcm9jZXNzLm5leHRUaWNrKHRoaXMuc2NoZWQuYmluZCh0aGlzKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBzZXRJbW1lZGlhdGUodGhpcy5zY2hlZC5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHVzZShmKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmFjcXVpcmUoKVxuICAgICAgICAgICAgLnRoZW4ocmVsZWFzZSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gZigpXG4gICAgICAgICAgICAgICAgLnRoZW4oKHJlcykgPT4ge1xuICAgICAgICAgICAgICAgIHJlbGVhc2UoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgICAgICAgIHJlbGVhc2UoKTtcbiAgICAgICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxufVxuZXhwb3J0cy5TZW1hcGhvcmUgPSBTZW1hcGhvcmU7XG5jbGFzcyBNdXRleCBleHRlbmRzIFNlbWFwaG9yZSB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKDEpO1xuICAgIH1cbn1cbmV4cG9ydHMuTXV0ZXggPSBNdXRleDtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWluZGV4LmpzLm1hcCIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oaGF5c3RhY2ssIG5lZWRsZSwgY29tcGFyYXRvciwgbG93LCBoaWdoKSB7XG4gIHZhciBtaWQsIGNtcDtcblxuICBpZihsb3cgPT09IHVuZGVmaW5lZClcbiAgICBsb3cgPSAwO1xuXG4gIGVsc2Uge1xuICAgIGxvdyA9IGxvd3wwO1xuICAgIGlmKGxvdyA8IDAgfHwgbG93ID49IGhheXN0YWNrLmxlbmd0aClcbiAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKFwiaW52YWxpZCBsb3dlciBib3VuZFwiKTtcbiAgfVxuXG4gIGlmKGhpZ2ggPT09IHVuZGVmaW5lZClcbiAgICBoaWdoID0gaGF5c3RhY2subGVuZ3RoIC0gMTtcblxuICBlbHNlIHtcbiAgICBoaWdoID0gaGlnaHwwO1xuICAgIGlmKGhpZ2ggPCBsb3cgfHwgaGlnaCA+PSBoYXlzdGFjay5sZW5ndGgpXG4gICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcihcImludmFsaWQgdXBwZXIgYm91bmRcIik7XG4gIH1cblxuICB3aGlsZShsb3cgPD0gaGlnaCkge1xuICAgIC8vIFRoZSBuYWl2ZSBgbG93ICsgaGlnaCA+Pj4gMWAgY291bGQgZmFpbCBmb3IgYXJyYXkgbGVuZ3RocyA+IDIqKjMxXG4gICAgLy8gYmVjYXVzZSBgPj4+YCBjb252ZXJ0cyBpdHMgb3BlcmFuZHMgdG8gaW50MzIuIGBsb3cgKyAoaGlnaCAtIGxvdyA+Pj4gMSlgXG4gICAgLy8gd29ya3MgZm9yIGFycmF5IGxlbmd0aHMgPD0gMioqMzItMSB3aGljaCBpcyBhbHNvIEphdmFzY3JpcHQncyBtYXggYXJyYXlcbiAgICAvLyBsZW5ndGguXG4gICAgbWlkID0gbG93ICsgKChoaWdoIC0gbG93KSA+Pj4gMSk7XG4gICAgY21wID0gK2NvbXBhcmF0b3IoaGF5c3RhY2tbbWlkXSwgbmVlZGxlLCBtaWQsIGhheXN0YWNrKTtcblxuICAgIC8vIFRvbyBsb3cuXG4gICAgaWYoY21wIDwgMC4wKVxuICAgICAgbG93ICA9IG1pZCArIDE7XG5cbiAgICAvLyBUb28gaGlnaC5cbiAgICBlbHNlIGlmKGNtcCA+IDAuMClcbiAgICAgIGhpZ2ggPSBtaWQgLSAxO1xuXG4gICAgLy8gS2V5IGZvdW5kLlxuICAgIGVsc2VcbiAgICAgIHJldHVybiBtaWQ7XG4gIH1cblxuICAvLyBLZXkgbm90IGZvdW5kLlxuICByZXR1cm4gfmxvdztcbn1cbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG4vLyBjYWNoZWQgZnJvbSB3aGF0ZXZlciBnbG9iYWwgaXMgcHJlc2VudCBzbyB0aGF0IHRlc3QgcnVubmVycyB0aGF0IHN0dWIgaXRcbi8vIGRvbid0IGJyZWFrIHRoaW5ncy4gIEJ1dCB3ZSBuZWVkIHRvIHdyYXAgaXQgaW4gYSB0cnkgY2F0Y2ggaW4gY2FzZSBpdCBpc1xuLy8gd3JhcHBlZCBpbiBzdHJpY3QgbW9kZSBjb2RlIHdoaWNoIGRvZXNuJ3QgZGVmaW5lIGFueSBnbG9iYWxzLiAgSXQncyBpbnNpZGUgYVxuLy8gZnVuY3Rpb24gYmVjYXVzZSB0cnkvY2F0Y2hlcyBkZW9wdGltaXplIGluIGNlcnRhaW4gZW5naW5lcy5cblxudmFyIGNhY2hlZFNldFRpbWVvdXQ7XG52YXIgY2FjaGVkQ2xlYXJUaW1lb3V0O1xuXG5mdW5jdGlvbiBkZWZhdWx0U2V0VGltb3V0KCkge1xuICAgIHRocm93IG5ldyBFcnJvcignc2V0VGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuZnVuY3Rpb24gZGVmYXVsdENsZWFyVGltZW91dCAoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdjbGVhclRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbihmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBzZXRUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBjbGVhclRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgfVxufSAoKSlcbmZ1bmN0aW9uIHJ1blRpbWVvdXQoZnVuKSB7XG4gICAgaWYgKGNhY2hlZFNldFRpbWVvdXQgPT09IHNldFRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIC8vIGlmIHNldFRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRTZXRUaW1lb3V0ID09PSBkZWZhdWx0U2V0VGltb3V0IHx8ICFjYWNoZWRTZXRUaW1lb3V0KSAmJiBzZXRUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfSBjYXRjaChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbChudWxsLCBmdW4sIDApO1xuICAgICAgICB9IGNhdGNoKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3JcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwodGhpcywgZnVuLCAwKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG59XG5mdW5jdGlvbiBydW5DbGVhclRpbWVvdXQobWFya2VyKSB7XG4gICAgaWYgKGNhY2hlZENsZWFyVGltZW91dCA9PT0gY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIC8vIGlmIGNsZWFyVGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZENsZWFyVGltZW91dCA9PT0gZGVmYXVsdENsZWFyVGltZW91dCB8fCAhY2FjaGVkQ2xlYXJUaW1lb3V0KSAmJiBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0ICB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKG51bGwsIG1hcmtlcik7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3IuXG4gICAgICAgICAgICAvLyBTb21lIHZlcnNpb25zIG9mIEkuRS4gaGF2ZSBkaWZmZXJlbnQgcnVsZXMgZm9yIGNsZWFyVGltZW91dCB2cyBzZXRUaW1lb3V0XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwodGhpcywgbWFya2VyKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG5cbn1cbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGlmICghZHJhaW5pbmcgfHwgIWN1cnJlbnRRdWV1ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHJ1blRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRRdWV1ZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIHJ1bkNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHJ1blRpbWVvdXQoZHJhaW5RdWV1ZSk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZE9uY2VMaXN0ZW5lciA9IG5vb3A7XG5cbnByb2Nlc3MubGlzdGVuZXJzID0gZnVuY3Rpb24gKG5hbWUpIHsgcmV0dXJuIFtdIH1cblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iLCJ2YXIgbmV4dFRpY2sgPSByZXF1aXJlKCdwcm9jZXNzL2Jyb3dzZXIuanMnKS5uZXh0VGljaztcbnZhciBhcHBseSA9IEZ1bmN0aW9uLnByb3RvdHlwZS5hcHBseTtcbnZhciBzbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcbnZhciBpbW1lZGlhdGVJZHMgPSB7fTtcbnZhciBuZXh0SW1tZWRpYXRlSWQgPSAwO1xuXG4vLyBET00gQVBJcywgZm9yIGNvbXBsZXRlbmVzc1xuXG5leHBvcnRzLnNldFRpbWVvdXQgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIG5ldyBUaW1lb3V0KGFwcGx5LmNhbGwoc2V0VGltZW91dCwgd2luZG93LCBhcmd1bWVudHMpLCBjbGVhclRpbWVvdXQpO1xufTtcbmV4cG9ydHMuc2V0SW50ZXJ2YWwgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIG5ldyBUaW1lb3V0KGFwcGx5LmNhbGwoc2V0SW50ZXJ2YWwsIHdpbmRvdywgYXJndW1lbnRzKSwgY2xlYXJJbnRlcnZhbCk7XG59O1xuZXhwb3J0cy5jbGVhclRpbWVvdXQgPVxuZXhwb3J0cy5jbGVhckludGVydmFsID0gZnVuY3Rpb24odGltZW91dCkgeyB0aW1lb3V0LmNsb3NlKCk7IH07XG5cbmZ1bmN0aW9uIFRpbWVvdXQoaWQsIGNsZWFyRm4pIHtcbiAgdGhpcy5faWQgPSBpZDtcbiAgdGhpcy5fY2xlYXJGbiA9IGNsZWFyRm47XG59XG5UaW1lb3V0LnByb3RvdHlwZS51bnJlZiA9IFRpbWVvdXQucHJvdG90eXBlLnJlZiA9IGZ1bmN0aW9uKCkge307XG5UaW1lb3V0LnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLl9jbGVhckZuLmNhbGwod2luZG93LCB0aGlzLl9pZCk7XG59O1xuXG4vLyBEb2VzIG5vdCBzdGFydCB0aGUgdGltZSwganVzdCBzZXRzIHVwIHRoZSBtZW1iZXJzIG5lZWRlZC5cbmV4cG9ydHMuZW5yb2xsID0gZnVuY3Rpb24oaXRlbSwgbXNlY3MpIHtcbiAgY2xlYXJUaW1lb3V0KGl0ZW0uX2lkbGVUaW1lb3V0SWQpO1xuICBpdGVtLl9pZGxlVGltZW91dCA9IG1zZWNzO1xufTtcblxuZXhwb3J0cy51bmVucm9sbCA9IGZ1bmN0aW9uKGl0ZW0pIHtcbiAgY2xlYXJUaW1lb3V0KGl0ZW0uX2lkbGVUaW1lb3V0SWQpO1xuICBpdGVtLl9pZGxlVGltZW91dCA9IC0xO1xufTtcblxuZXhwb3J0cy5fdW5yZWZBY3RpdmUgPSBleHBvcnRzLmFjdGl2ZSA9IGZ1bmN0aW9uKGl0ZW0pIHtcbiAgY2xlYXJUaW1lb3V0KGl0ZW0uX2lkbGVUaW1lb3V0SWQpO1xuXG4gIHZhciBtc2VjcyA9IGl0ZW0uX2lkbGVUaW1lb3V0O1xuICBpZiAobXNlY3MgPj0gMCkge1xuICAgIGl0ZW0uX2lkbGVUaW1lb3V0SWQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uIG9uVGltZW91dCgpIHtcbiAgICAgIGlmIChpdGVtLl9vblRpbWVvdXQpXG4gICAgICAgIGl0ZW0uX29uVGltZW91dCgpO1xuICAgIH0sIG1zZWNzKTtcbiAgfVxufTtcblxuLy8gVGhhdCdzIG5vdCBob3cgbm9kZS5qcyBpbXBsZW1lbnRzIGl0IGJ1dCB0aGUgZXhwb3NlZCBhcGkgaXMgdGhlIHNhbWUuXG5leHBvcnRzLnNldEltbWVkaWF0ZSA9IHR5cGVvZiBzZXRJbW1lZGlhdGUgPT09IFwiZnVuY3Rpb25cIiA/IHNldEltbWVkaWF0ZSA6IGZ1bmN0aW9uKGZuKSB7XG4gIHZhciBpZCA9IG5leHRJbW1lZGlhdGVJZCsrO1xuICB2YXIgYXJncyA9IGFyZ3VtZW50cy5sZW5ndGggPCAyID8gZmFsc2UgOiBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG5cbiAgaW1tZWRpYXRlSWRzW2lkXSA9IHRydWU7XG5cbiAgbmV4dFRpY2soZnVuY3Rpb24gb25OZXh0VGljaygpIHtcbiAgICBpZiAoaW1tZWRpYXRlSWRzW2lkXSkge1xuICAgICAgLy8gZm4uY2FsbCgpIGlzIGZhc3RlciBzbyB3ZSBvcHRpbWl6ZSBmb3IgdGhlIGNvbW1vbiB1c2UtY2FzZVxuICAgICAgLy8gQHNlZSBodHRwOi8vanNwZXJmLmNvbS9jYWxsLWFwcGx5LXNlZ3VcbiAgICAgIGlmIChhcmdzKSB7XG4gICAgICAgIGZuLmFwcGx5KG51bGwsIGFyZ3MpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm4uY2FsbChudWxsKTtcbiAgICAgIH1cbiAgICAgIC8vIFByZXZlbnQgaWRzIGZyb20gbGVha2luZ1xuICAgICAgZXhwb3J0cy5jbGVhckltbWVkaWF0ZShpZCk7XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gaWQ7XG59O1xuXG5leHBvcnRzLmNsZWFySW1tZWRpYXRlID0gdHlwZW9mIGNsZWFySW1tZWRpYXRlID09PSBcImZ1bmN0aW9uXCIgPyBjbGVhckltbWVkaWF0ZSA6IGZ1bmN0aW9uKGlkKSB7XG4gIGRlbGV0ZSBpbW1lZGlhdGVJZHNbaWRdO1xufTsiLCJpbXBvcnQgKiBhcyBMaWIgZnJvbSAnLi4vbGliJztcclxuXHJcbmNvbnN0IHN1aXRzID0gWydDbHVicycsICdEbW5kcycsICdIZWFydHMnLCAnU3BhZGVzJywgJ0pva2VyJ107XHJcbmNvbnN0IHJhbmtzID0gWydTbWFsbCcsICdBJywgJzInLCAnMycsICc0JywgJzUnLCAnNicsICc3JywgJzgnLCAnOScsICcxMCcsICdKJywgJ1EnLCAnSycsICdCaWcnXTtcclxuXHJcbmNvbnN0IGNhcmRJbWFnZXMgPSBuZXcgTWFwPHN0cmluZywgSFRNTEltYWdlRWxlbWVudD4oKTtcclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBsb2FkKCkge1xyXG4gICAgLy8gbG9hZCBjYXJkIGltYWdlcyBhc3luY2hyb25vdXNseVxyXG4gICAgZm9yIChsZXQgc3VpdCA9IDA7IHN1aXQgPD0gNDsgKytzdWl0KSB7XHJcbiAgICAgICAgZm9yIChsZXQgcmFuayA9IDA7IHJhbmsgPD0gMTQ7ICsrcmFuaykge1xyXG4gICAgICAgICAgICBpZiAoc3VpdCA9PT0gTGliLlN1aXQuSm9rZXIpIHtcclxuICAgICAgICAgICAgICAgIGlmICgwIDwgcmFuayAmJiByYW5rIDwgMTQpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGlmIChyYW5rIDwgMSB8fCAxMyA8IHJhbmspIHtcclxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgaW1hZ2UgPSBuZXcgSW1hZ2UoKTtcclxuICAgICAgICAgICAgaW1hZ2Uuc3JjID0gYFBhcGVyQ2FyZHMvJHtzdWl0c1tzdWl0XX0vJHtyYW5rc1tyYW5rXX1vZiR7c3VpdHNbc3VpdF19LnBuZ2A7XHJcbiAgICAgICAgICAgIGltYWdlLm9ubG9hZCA9ICgpID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBsb2FkZWQgJyR7aW1hZ2Uuc3JjfSdgKTtcclxuICAgICAgICAgICAgICAgIGNhcmRJbWFnZXMuc2V0KEpTT04uc3RyaW5naWZ5KFtzdWl0LCByYW5rXSksIGltYWdlKTtcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCA0OyArK2kpIHtcclxuICAgICAgICBjb25zdCBpbWFnZSA9IG5ldyBJbWFnZSgpO1xyXG4gICAgICAgIGltYWdlLnNyYyA9IGBQYXBlckNhcmRzL0NhcmRCYWNrJHtpfS5wbmdgO1xyXG4gICAgICAgIGltYWdlLm9ubG9hZCA9ICgpID0+IHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coYGxvYWRlZCAnJHtpbWFnZS5zcmN9J2ApO1xyXG4gICAgICAgICAgICBjYXJkSW1hZ2VzLnNldChgQmFjayR7aX1gLCBpbWFnZSk7XHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBibGFua0ltYWdlID0gbmV3IEltYWdlKCk7XHJcbiAgICBibGFua0ltYWdlLnNyYyA9ICdQYXBlckNhcmRzL0JsYW5rIENhcmQucG5nJztcclxuICAgIGJsYW5rSW1hZ2Uub25sb2FkID0gKCkgPT4ge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGBsb2FkZWQgJyR7YmxhbmtJbWFnZS5zcmN9J2ApO1xyXG4gICAgICAgIGNhcmRJbWFnZXMuc2V0KCdCbGFuaycsIGJsYW5rSW1hZ2UpO1xyXG4gICAgfTtcclxuXHJcbiAgICB3aGlsZSAoY2FyZEltYWdlcy5zaXplIDwgNCAqIDEzICsgNykge1xyXG4gICAgICAgIGF3YWl0IExpYi5kZWxheSgxMCk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc29sZS5sb2coJ2FsbCBjYXJkIGltYWdlcyBsb2FkZWQnKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldChzdHJpbmdGcm9tQ2FyZDogc3RyaW5nKTogSFRNTEltYWdlRWxlbWVudCB7XHJcbiAgICBjb25zdCBpbWFnZSA9IGNhcmRJbWFnZXMuZ2V0KHN0cmluZ0Zyb21DYXJkKTtcclxuICAgIGlmIChpbWFnZSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBjb3VsZG4ndCBmaW5kIGltYWdlOiAke3N0cmluZ0Zyb21DYXJkfWApO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBpbWFnZTtcclxufVxyXG4iLCJpbXBvcnQgKiBhcyBMaWIgZnJvbSAnLi4vbGliJztcclxuaW1wb3J0ICogYXMgU3RhdGUgZnJvbSAnLi9zdGF0ZSc7XHJcbmltcG9ydCAqIGFzIFZQIGZyb20gJy4vdmlldy1wYXJhbXMnO1xyXG5pbXBvcnQgKiBhcyBDYXJkSW1hZ2VzIGZyb20gJy4vY2FyZC1pbWFnZXMnO1xyXG5pbXBvcnQgKiBhcyBSZW5kZXIgZnJvbSAnLi9yZW5kZXInO1xyXG5pbXBvcnQgU3ByaXRlIGZyb20gJy4vc3ByaXRlJztcclxuXHJcbi8vIHJlZnJlc2hpbmcgc2hvdWxkIHJlam9pbiB0aGUgc2FtZSBnYW1lXHJcbndpbmRvdy5oaXN0b3J5LnB1c2hTdGF0ZSh1bmRlZmluZWQsIFN0YXRlLmdhbWVJZCwgYC9nYW1lP2dhbWVJZD0ke1N0YXRlLmdhbWVJZH0mcGxheWVyTmFtZT0ke1N0YXRlLnBsYXllck5hbWV9YCk7XHJcblxyXG53aW5kb3cub25yZXNpemUgPSBWUC5yZWNhbGN1bGF0ZVBhcmFtZXRlcnM7XHJcbndpbmRvdy5vbnNjcm9sbCA9IFZQLnJlY2FsY3VsYXRlUGFyYW1ldGVycztcclxuXHJcbig8YW55PndpbmRvdykuZ2FtZSA9IGFzeW5jIGZ1bmN0aW9uIGdhbWUoKSB7XHJcbiAgICBjb25zdCBqb2luUHJvbWlzZSA9IFN0YXRlLmpvaW5HYW1lKFN0YXRlLmdhbWVJZCwgU3RhdGUucGxheWVyTmFtZSk7XHJcbiAgICBhd2FpdCBDYXJkSW1hZ2VzLmxvYWQoKTsgLy8gY29uY3VycmVudGx5XHJcbiAgICBhd2FpdCBqb2luUHJvbWlzZTtcclxuICAgIFxyXG4gICAgVlAucmVjYWxjdWxhdGVQYXJhbWV0ZXJzKCk7XHJcblxyXG4gICAgLy8gcmVuZGVyaW5nIG11c3QgYmUgc3luY2hyb25vdXMsIG9yIGVsc2UgaXQgZmxpY2tlcnNcclxuICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoUmVuZGVyLnJlbmRlcik7XHJcblxyXG4gICAgLy8gaW5pdGlhbGl6ZSBpbnB1dFxyXG4gICAgd2hpbGUgKFN0YXRlLmdhbWVTdGF0ZSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgYXdhaXQgTGliLmRlbGF5KDEwMCk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgdW5sb2NrID0gYXdhaXQgU3RhdGUubG9jaygpO1xyXG4gICAgdHJ5IHtcclxuICAgICAgICBTdGF0ZS5zZXRTcHJpdGVUYXJnZXRzKFN0YXRlLmdhbWVTdGF0ZSk7XHJcbiAgICB9IGZpbmFsbHkge1xyXG4gICAgICAgIHVubG9jaygpO1xyXG4gICAgfVxyXG59OyIsImltcG9ydCAqIGFzIExpYiBmcm9tICcuLi9saWInO1xyXG5pbXBvcnQgKiBhcyBTdGF0ZSBmcm9tICcuL3N0YXRlJztcclxuaW1wb3J0ICogYXMgVlAgZnJvbSAnLi92aWV3LXBhcmFtcyc7XHJcbmltcG9ydCBWZWN0b3IgZnJvbSAnLi92ZWN0b3InO1xyXG5pbXBvcnQgU3ByaXRlIGZyb20gJy4vc3ByaXRlJztcclxuXHJcbmludGVyZmFjZSBEcmF3RnJvbURlY2sge1xyXG4gICAgdHlwZTogXCJEcmF3RnJvbURlY2tcIjtcclxuICAgIG1vdXNlUG9zaXRpb25Ub1Nwcml0ZVBvc2l0aW9uOiBWZWN0b3I7XHJcbn1cclxuXHJcbmludGVyZmFjZSBXYWl0aW5nRm9yTmV3Q2FyZCB7XHJcbiAgICB0eXBlOiBcIldhaXRpbmdGb3JOZXdDYXJkXCI7XHJcbiAgICBtb3VzZVBvc2l0aW9uVG9TcHJpdGVQb3NpdGlvbjogVmVjdG9yO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgUmV0dXJuVG9EZWNrIHtcclxuICAgIHR5cGU6IFwiUmV0dXJuVG9EZWNrXCI7XHJcbiAgICBjYXJkSW5kZXg6IG51bWJlcjtcclxuICAgIG1vdXNlUG9zaXRpb25Ub1Nwcml0ZVBvc2l0aW9uOiBWZWN0b3I7XHJcbn1cclxuXHJcbmludGVyZmFjZSBSZW9yZGVyIHtcclxuICAgIHR5cGU6IFwiUmVvcmRlclwiO1xyXG4gICAgY2FyZEluZGV4OiBudW1iZXI7XHJcbiAgICBtb3VzZVBvc2l0aW9uVG9TcHJpdGVQb3NpdGlvbjogVmVjdG9yO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgQ29udHJvbFNoaWZ0Q2xpY2sge1xyXG4gICAgdHlwZTogXCJDb250cm9sU2hpZnRDbGlja1wiO1xyXG4gICAgY2FyZEluZGV4OiBudW1iZXI7XHJcbiAgICBtb3VzZVBvc2l0aW9uVG9TcHJpdGVQb3NpdGlvbjogVmVjdG9yO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgQ29udHJvbENsaWNrIHtcclxuICAgIHR5cGU6IFwiQ29udHJvbENsaWNrXCI7XHJcbiAgICBjYXJkSW5kZXg6IG51bWJlcjtcclxuICAgIG1vdXNlUG9zaXRpb25Ub1Nwcml0ZVBvc2l0aW9uOiBWZWN0b3I7XHJcbn1cclxuXHJcbmludGVyZmFjZSBTaGlmdENsaWNrIHtcclxuICAgIHR5cGU6IFwiU2hpZnRDbGlja1wiO1xyXG4gICAgY2FyZEluZGV4OiBudW1iZXI7XHJcbiAgICBtb3VzZVBvc2l0aW9uVG9TcHJpdGVQb3NpdGlvbjogVmVjdG9yO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgQ2xpY2sge1xyXG4gICAgdHlwZTogXCJDbGlja1wiO1xyXG4gICAgY2FyZEluZGV4OiBudW1iZXI7XHJcbiAgICBtb3VzZVBvc2l0aW9uVG9TcHJpdGVQb3NpdGlvbjogVmVjdG9yO1xyXG59XHJcblxyXG5leHBvcnQgdHlwZSBBY3Rpb24gPVxyXG4gICAgXCJOb25lXCIgfFxyXG4gICAgXCJTb3J0QnlTdWl0XCIgfFxyXG4gICAgXCJTb3J0QnlSYW5rXCIgfFxyXG4gICAgXCJEZXNlbGVjdFwiIHxcclxuICAgIERyYXdGcm9tRGVjayB8XHJcbiAgICBXYWl0aW5nRm9yTmV3Q2FyZCB8XHJcbiAgICBSZXR1cm5Ub0RlY2sgfFxyXG4gICAgUmVvcmRlciB8XHJcbiAgICBDb250cm9sU2hpZnRDbGljayB8XHJcbiAgICBDb250cm9sQ2xpY2sgfFxyXG4gICAgU2hpZnRDbGljayB8XHJcbiAgICBDbGljaztcclxuXHJcbmNvbnN0IGRvdWJsZUNsaWNrVGhyZXNob2xkID0gNTAwOyAvLyBtaWxsaXNlY29uZHNcclxuY29uc3QgbW92ZVRocmVzaG9sZCA9IDAuNSAqIFZQLnBpeGVsc1BlckNNO1xyXG5cclxuZXhwb3J0IGxldCBhY3Rpb246IEFjdGlvbiA9IFwiTm9uZVwiO1xyXG5cclxubGV0IHByZXZpb3VzQ2xpY2tUaW1lID0gLTE7XHJcbmxldCBwcmV2aW91c0NsaWNrSW5kZXggPSAtMTtcclxubGV0IG1vdXNlRG93blBvc2l0aW9uID0gPFZlY3Rvcj57IHg6IDAsIHk6IDAgfTtcclxubGV0IG1vdXNlTW92ZVBvc2l0aW9uID0gPFZlY3Rvcj57IHg6IDAsIHk6IDAgfTtcclxubGV0IGV4Y2VlZGVkRHJhZ1RocmVzaG9sZCA9IGZhbHNlO1xyXG5cclxubGV0IGhvbGRpbmdDb250cm9sID0gZmFsc2U7XHJcbmxldCBob2xkaW5nU2hpZnQgPSBmYWxzZTtcclxud2luZG93Lm9ua2V5ZG93biA9IChlOiBLZXlib2FyZEV2ZW50KSA9PiB7XHJcbiAgICBpZiAoZS5rZXkgPT09IFwiQ29udHJvbFwiKSB7XHJcbiAgICAgICAgaG9sZGluZ0NvbnRyb2wgPSB0cnVlO1xyXG4gICAgfSBlbHNlIGlmIChlLmtleSA9PT0gXCJTaGlmdFwiKSB7XHJcbiAgICAgICAgaG9sZGluZ1NoaWZ0ID0gdHJ1ZTtcclxuICAgIH1cclxufTtcclxuXHJcbndpbmRvdy5vbmtleXVwID0gKGU6IEtleWJvYXJkRXZlbnQpID0+IHtcclxuICAgIGlmIChlLmtleSA9PT0gXCJDb250cm9sXCIpIHtcclxuICAgICAgICBob2xkaW5nQ29udHJvbCA9IGZhbHNlO1xyXG4gICAgfSBlbHNlIGlmIChlLmtleSA9PT0gXCJTaGlmdFwiKSB7XHJcbiAgICAgICAgaG9sZGluZ1NoaWZ0ID0gZmFsc2U7XHJcbiAgICB9XHJcbn07XHJcblxyXG5mdW5jdGlvbiBnZXRNb3VzZVBvc2l0aW9uKGU6IE1vdXNlRXZlbnQpIHtcclxuICAgIHJldHVybiBuZXcgVmVjdG9yKFxyXG4gICAgICAgIFZQLmNhbnZhcy53aWR0aCAqIChlLmNsaWVudFggLSBWUC5jYW52YXNSZWN0LmxlZnQpIC8gVlAuY2FudmFzUmVjdC53aWR0aCxcclxuICAgICAgICBWUC5jYW52YXMuaGVpZ2h0ICogKGUuY2xpZW50WSAtIFZQLmNhbnZhc1JlY3QudG9wKSAvIFZQLmNhbnZhc1JlY3QuaGVpZ2h0XHJcbiAgICApO1xyXG59XHJcblxyXG5WUC5jYW52YXMub25tb3VzZWRvd24gPSBhc3luYyAoZXZlbnQ6IE1vdXNlRXZlbnQpID0+IHtcclxuICAgIGNvbnN0IHVubG9jayA9IGF3YWl0IFN0YXRlLmxvY2soKTtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgbW91c2VEb3duUG9zaXRpb24gPSBnZXRNb3VzZVBvc2l0aW9uKGV2ZW50KTtcclxuICAgICAgICBtb3VzZU1vdmVQb3NpdGlvbiA9IG1vdXNlRG93blBvc2l0aW9uO1xyXG4gICAgICAgIGV4Y2VlZGVkRHJhZ1RocmVzaG9sZCA9IGZhbHNlO1xyXG5cclxuICAgICAgICBjb25zdCBkZWNrUG9zaXRpb24gPSBTdGF0ZS5kZWNrU3ByaXRlc1tTdGF0ZS5kZWNrU3ByaXRlcy5sZW5ndGggLSAxXT8ucG9zaXRpb247XHJcblxyXG4gICAgICAgIGlmIChWUC5zb3J0QnlSYW5rQm91bmRzWzBdLnggPCBtb3VzZURvd25Qb3NpdGlvbi54ICYmIG1vdXNlRG93blBvc2l0aW9uLnggPCBWUC5zb3J0QnlSYW5rQm91bmRzWzFdLnggJiZcclxuICAgICAgICAgICAgVlAuc29ydEJ5UmFua0JvdW5kc1swXS55IDwgbW91c2VEb3duUG9zaXRpb24ueSAmJiBtb3VzZURvd25Qb3NpdGlvbi55IDwgVlAuc29ydEJ5UmFua0JvdW5kc1sxXS55XHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICAgIGFjdGlvbiA9IFwiU29ydEJ5UmFua1wiO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoXHJcbiAgICAgICAgICAgIFZQLnNvcnRCeVN1aXRCb3VuZHNbMF0ueCA8IG1vdXNlRG93blBvc2l0aW9uLnggJiYgbW91c2VEb3duUG9zaXRpb24ueCA8IFZQLnNvcnRCeVN1aXRCb3VuZHNbMV0ueCAmJlxyXG4gICAgICAgICAgICBWUC5zb3J0QnlTdWl0Qm91bmRzWzBdLnkgPCBtb3VzZURvd25Qb3NpdGlvbi55ICYmIG1vdXNlRG93blBvc2l0aW9uLnkgPCBWUC5zb3J0QnlTdWl0Qm91bmRzWzFdLnlcclxuICAgICAgICApIHtcclxuICAgICAgICAgICAgYWN0aW9uID0gXCJTb3J0QnlTdWl0XCI7XHJcbiAgICAgICAgfSBlbHNlIGlmIChkZWNrUG9zaXRpb24gIT09IHVuZGVmaW5lZCAmJlxyXG4gICAgICAgICAgICBkZWNrUG9zaXRpb24ueCA8IG1vdXNlRG93blBvc2l0aW9uLnggJiYgbW91c2VEb3duUG9zaXRpb24ueCA8IGRlY2tQb3NpdGlvbi54ICsgVlAuc3ByaXRlV2lkdGggJiZcclxuICAgICAgICAgICAgZGVja1Bvc2l0aW9uLnkgPCBtb3VzZURvd25Qb3NpdGlvbi55ICYmIG1vdXNlRG93blBvc2l0aW9uLnkgPCBkZWNrUG9zaXRpb24ueSArIFZQLnNwcml0ZUhlaWdodFxyXG4gICAgICAgICkge1xyXG4gICAgICAgICAgICBhY3Rpb24gPSB7XHJcbiAgICAgICAgICAgICAgICBtb3VzZVBvc2l0aW9uVG9TcHJpdGVQb3NpdGlvbjogZGVja1Bvc2l0aW9uLnN1Yihtb3VzZURvd25Qb3NpdGlvbiksXHJcbiAgICAgICAgICAgICAgICB0eXBlOiBcIkRyYXdGcm9tRGVja1wiXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgLy8gYmVjYXVzZSB3ZSByZW5kZXIgbGVmdCB0byByaWdodCwgdGhlIHJpZ2h0bW9zdCBjYXJkIHVuZGVyIHRoZSBtb3VzZSBwb3NpdGlvbiBpcyB3aGF0IHdlIHNob3VsZCByZXR1cm5cclxuICAgICAgICAgICAgY29uc3Qgc3ByaXRlcyA9IFN0YXRlLmZhY2VTcHJpdGVzRm9yUGxheWVyWzxudW1iZXI+U3RhdGUuZ2FtZVN0YXRlPy5wbGF5ZXJJbmRleF07XHJcbiAgICAgICAgICAgIGlmIChzcHJpdGVzID09PSB1bmRlZmluZWQpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgIGxldCBkZXNlbGVjdCA9IHRydWU7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSBzcHJpdGVzLmxlbmd0aCAtIDE7IGkgPj0gMDsgLS1pKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBwb3NpdGlvbiA9IHNwcml0ZXNbaV0/LnBvc2l0aW9uO1xyXG4gICAgICAgICAgICAgICAgaWYgKHBvc2l0aW9uICE9PSB1bmRlZmluZWQgJiZcclxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbi54IDwgbW91c2VEb3duUG9zaXRpb24ueCAmJiBtb3VzZURvd25Qb3NpdGlvbi54IDwgcG9zaXRpb24ueCArIFZQLnNwcml0ZVdpZHRoICYmXHJcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb24ueSA8IG1vdXNlRG93blBvc2l0aW9uLnkgJiYgbW91c2VEb3duUG9zaXRpb24ueSA8IHBvc2l0aW9uLnkgKyBWUC5zcHJpdGVIZWlnaHRcclxuICAgICAgICAgICAgICAgICkge1xyXG4gICAgICAgICAgICAgICAgICAgIGRlc2VsZWN0ID0gZmFsc2U7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGFjdGlvbiA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FyZEluZGV4OiBpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtb3VzZVBvc2l0aW9uVG9TcHJpdGVQb3NpdGlvbjogcG9zaXRpb24uc3ViKG1vdXNlRG93blBvc2l0aW9uKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogaG9sZGluZ0NvbnRyb2wgJiYgaG9sZGluZ1NoaWZ0ID8gXCJDb250cm9sU2hpZnRDbGlja1wiIDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhvbGRpbmdDb250cm9sID8gXCJDb250cm9sQ2xpY2tcIiA6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBob2xkaW5nU2hpZnQgPyBcIlNoaWZ0Q2xpY2tcIiA6IFwiQ2xpY2tcIlxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChkZXNlbGVjdCkge1xyXG4gICAgICAgICAgICAgICAgYWN0aW9uID0gXCJEZXNlbGVjdFwiO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfSBmaW5hbGx5IHtcclxuICAgICAgICB1bmxvY2soKTtcclxuICAgIH1cclxufTtcclxuXHJcblZQLmNhbnZhcy5vbm1vdXNlbW92ZSA9IGFzeW5jIChldmVudDogTW91c2VFdmVudCkgPT4ge1xyXG4gICAgaWYgKFN0YXRlLmdhbWVTdGF0ZSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuXHJcbiAgICBjb25zdCB1bmxvY2sgPSBhd2FpdCBTdGF0ZS5sb2NrKCk7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIG1vdXNlTW92ZVBvc2l0aW9uID0gZ2V0TW91c2VQb3NpdGlvbihldmVudCk7XHJcbiAgICAgICAgZXhjZWVkZWREcmFnVGhyZXNob2xkID0gZXhjZWVkZWREcmFnVGhyZXNob2xkIHx8IG1vdXNlTW92ZVBvc2l0aW9uLmRpc3RhbmNlKG1vdXNlRG93blBvc2l0aW9uKSA+IG1vdmVUaHJlc2hvbGQ7XHJcblxyXG4gICAgICAgIGlmIChhY3Rpb24gPT09IFwiTm9uZVwiKSB7XHJcbiAgICAgICAgICAgIC8vIGRvIG5vdGhpbmdcclxuICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbiA9PT0gXCJTb3J0QnlTdWl0XCIpIHtcclxuICAgICAgICAgICAgLy8gVE9ETzogY2hlY2sgd2hldGhlciBtb3VzZSBwb3NpdGlvbiBoYXMgbGVmdCBidXR0b24gYm91bmRzXHJcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24gPT09IFwiU29ydEJ5UmFua1wiKSB7XHJcbiAgICAgICAgICAgIC8vIFRPRE86IGNoZWNrIHdoZXRoZXIgbW91c2UgcG9zaXRpb24gaGFzIGxlZnQgYnV0dG9uIGJvdW5kc1xyXG4gICAgICAgIH0gZWxzZSBpZiAoYWN0aW9uID09PSBcIkRlc2VsZWN0XCIpIHtcclxuICAgICAgICAgICAgLy8gVE9ETzogYm94IHNlbGVjdGlvbj9cclxuICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbi50eXBlID09PSBcIkRyYXdGcm9tRGVja1wiIHx8IGFjdGlvbi50eXBlID09PSBcIldhaXRpbmdGb3JOZXdDYXJkXCIpIHtcclxuICAgICAgICAgICAgY29uc3QgZGVja1Nwcml0ZSA9IFN0YXRlLmRlY2tTcHJpdGVzW1N0YXRlLmRlY2tTcHJpdGVzLmxlbmd0aCAtIDFdO1xyXG4gICAgICAgICAgICBpZiAoZGVja1Nwcml0ZSA9PT0gdW5kZWZpbmVkKSByZXR1cm47XHJcbiAgICAgICAgICAgIGRlY2tTcHJpdGUudGFyZ2V0ID0gbW91c2VNb3ZlUG9zaXRpb24uYWRkKGFjdGlvbi5tb3VzZVBvc2l0aW9uVG9TcHJpdGVQb3NpdGlvbik7XHJcblxyXG4gICAgICAgICAgICBpZiAoYWN0aW9uLnR5cGUgPT09IFwiRHJhd0Zyb21EZWNrXCIgJiYgZXhjZWVkZWREcmFnVGhyZXNob2xkKSB7XHJcbiAgICAgICAgICAgICAgICBhY3Rpb24gPSB7IC4uLmFjdGlvbiwgdHlwZTogXCJXYWl0aW5nRm9yTmV3Q2FyZFwiIH07XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gY2FyZCBkcmF3aW5nIHdpbGwgdHJ5IHRvIGxvY2sgdGhlIHN0YXRlLCBzbyB3ZSBtdXN0IGF0dGFjaCBhIGNhbGxiYWNrIGluc3RlYWQgb2YgYXdhaXRpbmdcclxuICAgICAgICAgICAgICAgIFN0YXRlLmRyYXdDYXJkKCkudGhlbihvbkNhcmREcmF3bihkZWNrU3ByaXRlKSkuY2F0Y2goXyA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFjdGlvbiAhPT0gXCJOb25lXCIgJiZcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uICE9PSBcIkRlc2VsZWN0XCIgJiZcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uICE9PSBcIlNvcnRCeVJhbmtcIiAmJlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb24gIT09IFwiU29ydEJ5U3VpdFwiICYmXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbi50eXBlID09PSBcIldhaXRpbmdGb3JOZXdDYXJkXCJcclxuICAgICAgICAgICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uID0gXCJOb25lXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbi50eXBlID09PSBcIlJldHVyblRvRGVja1wiIHx8IGFjdGlvbi50eXBlID09PSBcIlJlb3JkZXJcIiApIHtcclxuICAgICAgICAgICAgY29uc3Qgc3ByaXRlcyA9IFN0YXRlLmZhY2VTcHJpdGVzRm9yUGxheWVyW1N0YXRlLmdhbWVTdGF0ZS5wbGF5ZXJJbmRleF07XHJcbiAgICAgICAgICAgIGlmIChzcHJpdGVzID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG4gICAgICAgICAgICBjb25zdCBtb3VzZURvd25TcHJpdGUgPSBzcHJpdGVzW2FjdGlvbi5jYXJkSW5kZXhdO1xyXG4gICAgICAgICAgICBpZiAobW91c2VEb3duU3ByaXRlID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG5cclxuICAgICAgICAgICAgLy8gbW92ZSBhbGwgc2VsZWN0ZWQgY2FyZHMgYXMgYSBncm91cCBhcm91bmQgdGhlIGNhcmQgdW5kZXIgdGhlIG1vdXNlIHBvc2l0aW9uXHJcbiAgICAgICAgICAgIGZvciAoY29uc3Qgc2VsZWN0ZWRJbmRleCBvZiBTdGF0ZS5zZWxlY3RlZEluZGljZXMpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHNwcml0ZSA9IHNwcml0ZXNbc2VsZWN0ZWRJbmRleF07XHJcbiAgICAgICAgICAgICAgICBpZiAoc3ByaXRlID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG4gICAgICAgICAgICAgICAgc3ByaXRlLnRhcmdldCA9IG1vdXNlTW92ZVBvc2l0aW9uLmFkZChhY3Rpb24ubW91c2VQb3NpdGlvblRvU3ByaXRlUG9zaXRpb24pLmFkZChuZXcgVmVjdG9yKChzZWxlY3RlZEluZGV4IC0gYWN0aW9uLmNhcmRJbmRleCkgKiBWUC5zcHJpdGVHYXAsIDApKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZHJhZyhTdGF0ZS5nYW1lU3RhdGUsIGFjdGlvbi5jYXJkSW5kZXgsIGFjdGlvbi5tb3VzZVBvc2l0aW9uVG9TcHJpdGVQb3NpdGlvbik7XHJcbiAgICAgICAgfSBlbHNlIGlmIChcclxuICAgICAgICAgICAgYWN0aW9uLnR5cGUgPT09IFwiQ29udHJvbFNoaWZ0Q2xpY2tcIiB8fFxyXG4gICAgICAgICAgICBhY3Rpb24udHlwZSA9PT0gXCJDb250cm9sQ2xpY2tcIiB8fFxyXG4gICAgICAgICAgICBhY3Rpb24udHlwZSA9PT0gXCJTaGlmdENsaWNrXCIgfHxcclxuICAgICAgICAgICAgYWN0aW9uLnR5cGUgPT09IFwiQ2xpY2tcIlxyXG4gICAgICAgICkge1xyXG4gICAgICAgICAgICBpZiAoZXhjZWVkZWREcmFnVGhyZXNob2xkKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBkcmFnZ2luZyBhIG5vbi1zZWxlY3RlZCBjYXJkIHNlbGVjdHMgaXQgYW5kIG9ubHkgaXRcclxuICAgICAgICAgICAgICAgIGxldCBpID0gTGliLmJpbmFyeVNlYXJjaE51bWJlcihTdGF0ZS5zZWxlY3RlZEluZGljZXMsIGFjdGlvbi5jYXJkSW5kZXgpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGkgPCAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaSA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgU3RhdGUuc2VsZWN0ZWRJbmRpY2VzLnNwbGljZShpLCBTdGF0ZS5zZWxlY3RlZEluZGljZXMubGVuZ3RoLCBhY3Rpb24uY2FyZEluZGV4KTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBkcmFnKFN0YXRlLmdhbWVTdGF0ZSwgYWN0aW9uLmNhcmRJbmRleCwgYWN0aW9uLm1vdXNlUG9zaXRpb25Ub1Nwcml0ZVBvc2l0aW9uKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGNvbnN0IF86IG5ldmVyID0gYWN0aW9uO1xyXG4gICAgICAgIH1cclxuICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgdW5sb2NrKCk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5WUC5jYW52YXMub25tb3VzZXVwID0gYXN5bmMgKCkgPT4ge1xyXG4gICAgaWYgKFN0YXRlLmdhbWVTdGF0ZSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuXHJcbiAgICBjb25zdCB1bmxvY2sgPSBhd2FpdCBTdGF0ZS5sb2NrKCk7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIGlmIChhY3Rpb24gPT09IFwiTm9uZVwiKSB7XHJcbiAgICAgICAgICAgIC8vIGRvIG5vdGhpbmdcclxuICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbiA9PT0gXCJTb3J0QnlSYW5rXCIpIHtcclxuICAgICAgICAgICAgYXdhaXQgU3RhdGUuc29ydEJ5UmFuayhTdGF0ZS5nYW1lU3RhdGUpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoYWN0aW9uID09PSBcIlNvcnRCeVN1aXRcIikge1xyXG4gICAgICAgICAgICBhd2FpdCBTdGF0ZS5zb3J0QnlTdWl0KFN0YXRlLmdhbWVTdGF0ZSk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24gPT09IFwiRGVzZWxlY3RcIikge1xyXG4gICAgICAgICAgICBTdGF0ZS5zZWxlY3RlZEluZGljZXMuc3BsaWNlKDAsIFN0YXRlLnNlbGVjdGVkSW5kaWNlcy5sZW5ndGgpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoYWN0aW9uLnR5cGUgPT09IFwiRHJhd0Zyb21EZWNrXCIgfHwgYWN0aW9uLnR5cGUgPT09IFwiV2FpdGluZ0Zvck5ld0NhcmRcIikge1xyXG4gICAgICAgICAgICAvLyBkbyBub3RoaW5nXHJcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24udHlwZSA9PT0gXCJSZW9yZGVyXCIpIHtcclxuICAgICAgICAgICAgcHJldmlvdXNDbGlja0luZGV4ID0gYWN0aW9uLmNhcmRJbmRleDtcclxuICAgICAgICAgICAgYXdhaXQgU3RhdGUucmVvcmRlckNhcmRzKFN0YXRlLmdhbWVTdGF0ZSk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24udHlwZSA9PT0gXCJSZXR1cm5Ub0RlY2tcIikge1xyXG4gICAgICAgICAgICBwcmV2aW91c0NsaWNrSW5kZXggPSAtMTtcclxuICAgICAgICAgICAgYXdhaXQgU3RhdGUucmV0dXJuQ2FyZHNUb0RlY2soU3RhdGUuZ2FtZVN0YXRlKTtcclxuICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbi50eXBlID09PSBcIkNvbnRyb2xTaGlmdENsaWNrXCIpIHtcclxuICAgICAgICAgICAgaWYgKHByZXZpb3VzQ2xpY2tJbmRleCA9PT0gLTEpIHtcclxuICAgICAgICAgICAgICAgIHByZXZpb3VzQ2xpY2tJbmRleCA9IGFjdGlvbi5jYXJkSW5kZXg7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHN0YXJ0ID0gTWF0aC5taW4oYWN0aW9uLmNhcmRJbmRleCwgcHJldmlvdXNDbGlja0luZGV4KTtcclxuICAgICAgICAgICAgY29uc3QgZW5kID0gTWF0aC5tYXgoYWN0aW9uLmNhcmRJbmRleCwgcHJldmlvdXNDbGlja0luZGV4KTtcclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IHN0YXJ0OyBpIDw9IGVuZDsgKytpKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgaiA9IExpYi5iaW5hcnlTZWFyY2hOdW1iZXIoU3RhdGUuc2VsZWN0ZWRJbmRpY2VzLCBpKTtcclxuICAgICAgICAgICAgICAgIGlmIChqIDwgMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIFN0YXRlLnNlbGVjdGVkSW5kaWNlcy5zcGxpY2UofmosIDAsIGkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24udHlwZSA9PT0gXCJDb250cm9sQ2xpY2tcIikge1xyXG4gICAgICAgICAgICBwcmV2aW91c0NsaWNrSW5kZXggPSBhY3Rpb24uY2FyZEluZGV4O1xyXG4gICAgICAgICAgICBsZXQgaSA9IExpYi5iaW5hcnlTZWFyY2hOdW1iZXIoU3RhdGUuc2VsZWN0ZWRJbmRpY2VzLCBhY3Rpb24uY2FyZEluZGV4KTtcclxuICAgICAgICAgICAgaWYgKGkgPCAwKSB7XHJcbiAgICAgICAgICAgICAgICBTdGF0ZS5zZWxlY3RlZEluZGljZXMuc3BsaWNlKH5pLCAwLCBhY3Rpb24uY2FyZEluZGV4KTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIFN0YXRlLnNlbGVjdGVkSW5kaWNlcy5zcGxpY2UoaSwgMSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbi50eXBlID09PSBcIlNoaWZ0Q2xpY2tcIikge1xyXG4gICAgICAgICAgICBpZiAocHJldmlvdXNDbGlja0luZGV4ID09PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgcHJldmlvdXNDbGlja0luZGV4ID0gYWN0aW9uLmNhcmRJbmRleDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3Qgc3RhcnQgPSBNYXRoLm1pbihhY3Rpb24uY2FyZEluZGV4LCBwcmV2aW91c0NsaWNrSW5kZXgpO1xyXG4gICAgICAgICAgICBjb25zdCBlbmQgPSBNYXRoLm1heChhY3Rpb24uY2FyZEluZGV4LCBwcmV2aW91c0NsaWNrSW5kZXgpO1xyXG4gICAgICAgICAgICBTdGF0ZS5zZWxlY3RlZEluZGljZXMuc3BsaWNlKDAsIFN0YXRlLnNlbGVjdGVkSW5kaWNlcy5sZW5ndGgpO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gc3RhcnQ7IGkgPD0gZW5kOyArK2kpIHtcclxuICAgICAgICAgICAgICAgIFN0YXRlLnNlbGVjdGVkSW5kaWNlcy5wdXNoKGkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24udHlwZSA9PT0gXCJDbGlja1wiKSB7XHJcbiAgICAgICAgICAgIHByZXZpb3VzQ2xpY2tJbmRleCA9IGFjdGlvbi5jYXJkSW5kZXg7XHJcbiAgICAgICAgICAgIFN0YXRlLnNlbGVjdGVkSW5kaWNlcy5zcGxpY2UoMCwgU3RhdGUuc2VsZWN0ZWRJbmRpY2VzLmxlbmd0aCwgYWN0aW9uLmNhcmRJbmRleCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBTdGF0ZS5zZXRTcHJpdGVUYXJnZXRzKFN0YXRlLmdhbWVTdGF0ZSk7XHJcblxyXG4gICAgICAgIGFjdGlvbiA9IFwiTm9uZVwiO1xyXG4gICAgfSBmaW5hbGx5IHtcclxuICAgICAgICB1bmxvY2soKTtcclxuICAgIH1cclxufTtcclxuXHJcbmZ1bmN0aW9uIG9uQ2FyZERyYXduKGRlY2tTcHJpdGU6IFNwcml0ZSkge1xyXG4gICAgcmV0dXJuIGFzeW5jICgpID0+IHtcclxuICAgICAgICBpZiAoU3RhdGUuZ2FtZVN0YXRlID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG5cclxuICAgICAgICBjb25zdCB1bmxvY2sgPSBhd2FpdCBTdGF0ZS5sb2NrKCk7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgaWYgKGFjdGlvbiAhPT0gXCJOb25lXCIgJiZcclxuICAgICAgICAgICAgICAgIGFjdGlvbiAhPT0gXCJTb3J0QnlTdWl0XCIgJiZcclxuICAgICAgICAgICAgICAgIGFjdGlvbiAhPT0gXCJTb3J0QnlSYW5rXCIgJiZcclxuICAgICAgICAgICAgICAgIGFjdGlvbiAhPT0gXCJEZXNlbGVjdFwiICYmXHJcbiAgICAgICAgICAgICAgICBhY3Rpb24udHlwZSA9PT0gXCJXYWl0aW5nRm9yTmV3Q2FyZFwiXHJcbiAgICAgICAgICAgICkge1xyXG4gICAgICAgICAgICAgICAgLy8gaW1tZWRpYXRlbHkgc2VsZWN0IG5ld2x5IGFjcXVpcmVkIGNhcmRcclxuICAgICAgICAgICAgICAgIGNvbnN0IGNhcmRJbmRleCA9IFN0YXRlLmdhbWVTdGF0ZS5wbGF5ZXJDYXJkcy5sZW5ndGggLSAxO1xyXG4gICAgICAgICAgICAgICAgU3RhdGUuc2VsZWN0ZWRJbmRpY2VzLnNwbGljZSgwLCBTdGF0ZS5zZWxlY3RlZEluZGljZXMubGVuZ3RoKTtcclxuICAgICAgICAgICAgICAgIFN0YXRlLnNlbGVjdGVkSW5kaWNlcy5wdXNoKGNhcmRJbmRleCk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gbmV3IGNhcmQgc2hvdWxkIGFwcGVhciBpbiBwbGFjZSBvZiBkcmFnZ2VkIGNhcmQgZnJvbSBkZWNrIHdpdGhvdXQgYW5pbWF0aW9uXHJcbiAgICAgICAgICAgICAgICBjb25zdCBmYWNlU3ByaXRlQXRNb3VzZURvd24gPSBTdGF0ZS5mYWNlU3ByaXRlc0ZvclBsYXllcltTdGF0ZS5nYW1lU3RhdGUucGxheWVySW5kZXhdPy5bY2FyZEluZGV4XTtcclxuICAgICAgICAgICAgICAgIGlmIChmYWNlU3ByaXRlQXRNb3VzZURvd24gPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICAgICAgICAgICAgICBmYWNlU3ByaXRlQXRNb3VzZURvd24udGFyZ2V0ID0gZGVja1Nwcml0ZS5wb3NpdGlvbjtcclxuICAgICAgICAgICAgICAgIGZhY2VTcHJpdGVBdE1vdXNlRG93bi5wb3NpdGlvbiA9IGRlY2tTcHJpdGUucG9zaXRpb247XHJcbiAgICAgICAgICAgICAgICBmYWNlU3ByaXRlQXRNb3VzZURvd24udmVsb2NpdHkgPSBkZWNrU3ByaXRlLnZlbG9jaXR5O1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBkcmFnKFN0YXRlLmdhbWVTdGF0ZSwgY2FyZEluZGV4LCBhY3Rpb24ubW91c2VQb3NpdGlvblRvU3ByaXRlUG9zaXRpb24pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBmaW5hbGx5IHtcclxuICAgICAgICAgICAgdW5sb2NrKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxufVxyXG5cclxuZnVuY3Rpb24gZHJhZyhnYW1lU3RhdGU6IExpYi5HYW1lU3RhdGUsIGNhcmRJbmRleDogbnVtYmVyLCBtb3VzZVBvc2l0aW9uVG9TcHJpdGVQb3NpdGlvbjogVmVjdG9yKSB7XHJcbiAgICBjb25zdCBzcHJpdGVzID0gU3RhdGUuZmFjZVNwcml0ZXNGb3JQbGF5ZXJbZ2FtZVN0YXRlLnBsYXllckluZGV4XTtcclxuICAgIGlmIChzcHJpdGVzID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG5cclxuICAgIGNvbnN0IGNhcmRzID0gZ2FtZVN0YXRlLnBsYXllckNhcmRzO1xyXG5cclxuICAgIGNvbnN0IG1vdmluZ1Nwcml0ZXNBbmRDYXJkczogW1Nwcml0ZSwgTGliLkNhcmRdW10gPSBbXTtcclxuICAgIGNvbnN0IHJlc2VydmVkU3ByaXRlc0FuZENhcmRzOiBbU3ByaXRlLCBMaWIuQ2FyZF1bXSA9IFtdO1xyXG5cclxuICAgIGxldCBzcGxpdEluZGV4OiBudW1iZXI7XHJcbiAgICBsZXQgcmV2ZWFsQ291bnQgPSBnYW1lU3RhdGUucGxheWVyUmV2ZWFsQ291bnQ7XHJcblxyXG4gICAgLy8gZXh0cmFjdCBtb3Zpbmcgc3ByaXRlc1xyXG4gICAgZm9yIChjb25zdCBpIG9mIFN0YXRlLnNlbGVjdGVkSW5kaWNlcykge1xyXG4gICAgICAgIGNvbnN0IHNwcml0ZSA9IHNwcml0ZXNbaV07XHJcbiAgICAgICAgY29uc3QgY2FyZCA9IGNhcmRzW2ldO1xyXG4gICAgICAgIGlmIChzcHJpdGUgPT09IHVuZGVmaW5lZCB8fCBjYXJkID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG4gICAgICAgIG1vdmluZ1Nwcml0ZXNBbmRDYXJkcy5wdXNoKFtzcHJpdGUsIGNhcmRdKTtcclxuXHJcbiAgICAgICAgaWYgKGkgPCBnYW1lU3RhdGUucGxheWVyUmV2ZWFsQ291bnQpIHtcclxuICAgICAgICAgICAgLS1yZXZlYWxDb3VudDtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gZXh0cmFjdCByZXNlcnZlZCBzcHJpdGVzXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNwcml0ZXMubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICBpZiAoTGliLmJpbmFyeVNlYXJjaE51bWJlcihTdGF0ZS5zZWxlY3RlZEluZGljZXMsIGkpIDwgMCkge1xyXG4gICAgICAgICAgICBjb25zdCBzcHJpdGUgPSBzcHJpdGVzW2ldO1xyXG4gICAgICAgICAgICBjb25zdCBjYXJkID0gY2FyZHNbaV07XHJcbiAgICAgICAgICAgIGlmIChzcHJpdGUgPT09IHVuZGVmaW5lZCB8fCBjYXJkID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG4gICAgICAgICAgICByZXNlcnZlZFNwcml0ZXNBbmRDYXJkcy5wdXNoKFtzcHJpdGUsIGNhcmRdKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gZmluZCB0aGUgaGVsZCBzcHJpdGVzLCBpZiBhbnksIG92ZXJsYXBwZWQgYnkgdGhlIGRyYWdnZWQgc3ByaXRlc1xyXG4gICAgY29uc3QgbGVmdE1vdmluZ1Nwcml0ZSA9IG1vdmluZ1Nwcml0ZXNBbmRDYXJkc1swXT8uWzBdO1xyXG4gICAgY29uc3QgcmlnaHRNb3ZpbmdTcHJpdGUgPSBtb3ZpbmdTcHJpdGVzQW5kQ2FyZHNbbW92aW5nU3ByaXRlc0FuZENhcmRzLmxlbmd0aCAtIDFdPy5bMF07XHJcbiAgICBpZiAobGVmdE1vdmluZ1Nwcml0ZSA9PT0gdW5kZWZpbmVkIHx8IHJpZ2h0TW92aW5nU3ByaXRlID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBkZWNrRGlzdGFuY2UgPSBNYXRoLmFicyhsZWZ0TW92aW5nU3ByaXRlLnRhcmdldC55IC0gKFN0YXRlLmRlY2tTcHJpdGVzWzBdPy5wb3NpdGlvbi55ID8/IEluZmluaXR5KSk7XHJcbiAgICBjb25zdCByZXZlYWxEaXN0YW5jZSA9IE1hdGguYWJzKGxlZnRNb3ZpbmdTcHJpdGUudGFyZ2V0LnkgLSAoVlAuY2FudmFzLmhlaWdodCAtIDIgKiBWUC5zcHJpdGVIZWlnaHQpKTtcclxuICAgIGNvbnN0IGhpZGVEaXN0YW5jZSA9IE1hdGguYWJzKGxlZnRNb3ZpbmdTcHJpdGUudGFyZ2V0LnkgLSAoVlAuY2FudmFzLmhlaWdodCAtIFZQLnNwcml0ZUhlaWdodCkpO1xyXG5cclxuICAgIC8vIHNldCB0aGUgYWN0aW9uIGZvciBvbm1vdXNldXBcclxuICAgIGlmIChkZWNrRGlzdGFuY2UgPCByZXZlYWxEaXN0YW5jZSAmJiBkZWNrRGlzdGFuY2UgPCBoaWRlRGlzdGFuY2UpIHtcclxuICAgICAgICBhY3Rpb24gPSB7IGNhcmRJbmRleCwgbW91c2VQb3NpdGlvblRvU3ByaXRlUG9zaXRpb24sIHR5cGU6IFwiUmV0dXJuVG9EZWNrXCIgfTtcclxuXHJcbiAgICAgICAgc3BsaXRJbmRleCA9IHJlc2VydmVkU3ByaXRlc0FuZENhcmRzLmxlbmd0aDtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgYWN0aW9uID0geyBjYXJkSW5kZXgsIG1vdXNlUG9zaXRpb25Ub1Nwcml0ZVBvc2l0aW9uLCB0eXBlOiBcIlJlb3JkZXJcIiB9O1xyXG5cclxuICAgICAgICAvLyBkZXRlcm1pbmUgd2hldGhlciB0aGUgbW92aW5nIHNwcml0ZXMgYXJlIGNsb3NlciB0byB0aGUgcmV2ZWFsZWQgc3ByaXRlcyBvciB0byB0aGUgaGlkZGVuIHNwcml0ZXNcclxuICAgICAgICBjb25zdCBzcGxpdFJldmVhbGVkID0gcmV2ZWFsRGlzdGFuY2UgPCBoaWRlRGlzdGFuY2U7XHJcbiAgICAgICAgY29uc3Qgc3RhcnQgPSBzcGxpdFJldmVhbGVkID8gMCA6IHJldmVhbENvdW50O1xyXG4gICAgICAgIGNvbnN0IGVuZCA9IHNwbGl0UmV2ZWFsZWQgPyByZXZlYWxDb3VudCA6IHJlc2VydmVkU3ByaXRlc0FuZENhcmRzLmxlbmd0aDtcclxuICAgIFxyXG4gICAgICAgIGxldCBsZWZ0SW5kZXg6IG51bWJlciB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcclxuICAgICAgICBsZXQgcmlnaHRJbmRleDogbnVtYmVyIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xyXG4gICAgICAgIGZvciAobGV0IGkgPSBzdGFydDsgaSA8IGVuZDsgKytpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlc2VydmVkU3ByaXRlID0gcmVzZXJ2ZWRTcHJpdGVzQW5kQ2FyZHNbaV0/LlswXTtcclxuICAgICAgICAgICAgaWYgKHJlc2VydmVkU3ByaXRlID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG4gICAgICAgICAgICBpZiAobGVmdE1vdmluZ1Nwcml0ZS50YXJnZXQueCA8IHJlc2VydmVkU3ByaXRlLnRhcmdldC54ICYmXHJcbiAgICAgICAgICAgICAgICByZXNlcnZlZFNwcml0ZS50YXJnZXQueCA8IHJpZ2h0TW92aW5nU3ByaXRlLnRhcmdldC54XHJcbiAgICAgICAgICAgICkge1xyXG4gICAgICAgICAgICAgICAgaWYgKGxlZnRJbmRleCA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGVmdEluZGV4ID0gaTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgIFxyXG4gICAgICAgICAgICAgICAgcmlnaHRJbmRleCA9IGk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICBcclxuICAgICAgICBpZiAobGVmdEluZGV4ICE9PSB1bmRlZmluZWQgJiYgcmlnaHRJbmRleCAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGxlZnRSZXNlcnZlZFNwcml0ZSA9IHJlc2VydmVkU3ByaXRlc0FuZENhcmRzW2xlZnRJbmRleF0/LlswXTtcclxuICAgICAgICAgICAgY29uc3QgcmlnaHRSZXNlcnZlZFNwcml0ZSA9IHJlc2VydmVkU3ByaXRlc0FuZENhcmRzW3JpZ2h0SW5kZXhdPy5bMF07XHJcbiAgICAgICAgICAgIGlmIChsZWZ0UmVzZXJ2ZWRTcHJpdGUgPT09IHVuZGVmaW5lZCB8fCByaWdodFJlc2VydmVkU3ByaXRlID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG4gICAgICAgICAgICBjb25zdCBsZWZ0R2FwID0gbGVmdFJlc2VydmVkU3ByaXRlLnRhcmdldC54IC0gbGVmdE1vdmluZ1Nwcml0ZS50YXJnZXQueDtcclxuICAgICAgICAgICAgY29uc3QgcmlnaHRHYXAgPSByaWdodE1vdmluZ1Nwcml0ZS50YXJnZXQueCAtIHJpZ2h0UmVzZXJ2ZWRTcHJpdGUudGFyZ2V0Lng7XHJcbiAgICAgICAgICAgIGlmIChsZWZ0R2FwIDwgcmlnaHRHYXApIHtcclxuICAgICAgICAgICAgICAgIHNwbGl0SW5kZXggPSBsZWZ0SW5kZXg7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBzcGxpdEluZGV4ID0gcmlnaHRJbmRleCArIDE7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAvLyBubyBvdmVybGFwcGVkIHNwcml0ZXMsIHNvIHRoZSBpbmRleCBpcyB0aGUgZmlyc3QgcmVzZXJ2ZWQgc3ByaXRlIHRvIHRoZSByaWdodCBvZiB0aGUgbW92aW5nIHNwcml0ZXNcclxuICAgICAgICAgICAgZm9yIChzcGxpdEluZGV4ID0gc3RhcnQ7IHNwbGl0SW5kZXggPCBlbmQ7ICsrc3BsaXRJbmRleCkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcmVzZXJ2ZWRTcHJpdGUgPSByZXNlcnZlZFNwcml0ZXNBbmRDYXJkc1tzcGxpdEluZGV4XT8uWzBdO1xyXG4gICAgICAgICAgICAgICAgaWYgKHJlc2VydmVkU3ByaXRlID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHJpZ2h0TW92aW5nU3ByaXRlLnRhcmdldC54IDwgcmVzZXJ2ZWRTcHJpdGUudGFyZ2V0LngpIHtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIFxyXG4gICAgICAgIC8vIGFkanVzdCByZXZlYWwgY291bnRcclxuICAgICAgICBpZiAoc3BsaXRJbmRleCA8IHJldmVhbENvdW50IHx8XHJcbiAgICAgICAgICAgIHNwbGl0SW5kZXggPT09IHJldmVhbENvdW50ICYmIHNwbGl0UmV2ZWFsZWRcclxuICAgICAgICApIHtcclxuICAgICAgICAgICAgcmV2ZWFsQ291bnQgKz0gbW92aW5nU3ByaXRlc0FuZENhcmRzLmxlbmd0aDtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3Qgc2F2ZWRDYXJkSW5kZXggPSBhY3Rpb24uY2FyZEluZGV4O1xyXG5cclxuICAgIC8vIGFkanVzdCBzZWxlY3RlZCBpbmRpY2VzXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IFN0YXRlLnNlbGVjdGVkSW5kaWNlcy5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgIGlmIChhY3Rpb24uY2FyZEluZGV4ID09PSBTdGF0ZS5zZWxlY3RlZEluZGljZXNbaV0pIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coYHNldCBhY3Rpb24uY2FyZEluZGV4IHRvICR7c3BsaXRJbmRleCArIGl9YClcclxuICAgICAgICAgICAgYWN0aW9uLmNhcmRJbmRleCA9IHNwbGl0SW5kZXggKyBpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgU3RhdGUuc2VsZWN0ZWRJbmRpY2VzW2ldID0gc3BsaXRJbmRleCArIGk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc29sZS5sb2coc2F2ZWRDYXJkSW5kZXgsIGFjdGlvbi5jYXJkSW5kZXgsIFN0YXRlLnNlbGVjdGVkSW5kaWNlcyk7XHJcblxyXG4gICAgU3RhdGUuc2V0U3ByaXRlVGFyZ2V0cyhcclxuICAgICAgICBnYW1lU3RhdGUsXHJcbiAgICAgICAgcmVzZXJ2ZWRTcHJpdGVzQW5kQ2FyZHMsXHJcbiAgICAgICAgbW92aW5nU3ByaXRlc0FuZENhcmRzLFxyXG4gICAgICAgIHJldmVhbENvdW50LFxyXG4gICAgICAgIHNwbGl0SW5kZXgsXHJcbiAgICAgICAgYWN0aW9uLnR5cGUgPT09IFwiUmV0dXJuVG9EZWNrXCJcclxuICAgICk7XHJcbn0iLCJpbXBvcnQgKiBhcyBMaWIgZnJvbSBcIi4uL2xpYlwiO1xyXG5cclxuY29uc3QgcGxheWVyTmFtZUVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGxheWVyTmFtZScpO1xyXG5jb25zdCBwbGF5ZXJOYW1lVmFsdWUgPSBMaWIuZ2V0Q29va2llKCdwbGF5ZXJOYW1lJyk7XHJcbmlmIChwbGF5ZXJOYW1lRWxlbWVudCAhPT0gbnVsbCAmJiBwbGF5ZXJOYW1lVmFsdWUgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgKDxIVE1MSW5wdXRFbGVtZW50PnBsYXllck5hbWVFbGVtZW50KS52YWx1ZSA9IHBsYXllck5hbWVWYWx1ZTtcclxufVxyXG5cclxuY29uc3QgZ2FtZUlkRWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdnYW1lSWQnKTtcclxuY29uc3QgZ2FtZUlkVmFsdWUgPSBMaWIuZ2V0Q29va2llKCdnYW1lSWQnKTtcclxuaWYgKGdhbWVJZEVsZW1lbnQgIT09IG51bGwgJiYgZ2FtZUlkVmFsdWUgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgKDxIVE1MSW5wdXRFbGVtZW50PmdhbWVJZEVsZW1lbnQpLnZhbHVlID0gZ2FtZUlkVmFsdWU7XHJcbn1cclxuIiwiaW1wb3J0ICogYXMgTGliIGZyb20gJy4uL2xpYic7XHJcbmltcG9ydCAqIGFzIFN0YXRlIGZyb20gJy4vc3RhdGUnO1xyXG5pbXBvcnQgKiBhcyBJbnB1dCBmcm9tICcuL2lucHV0JztcclxuaW1wb3J0ICogYXMgVlAgZnJvbSAnLi92aWV3LXBhcmFtcyc7XHJcbmltcG9ydCBWZWN0b3IgZnJvbSAnLi92ZWN0b3InO1xyXG5pbXBvcnQgU3ByaXRlIGZyb20gJy4vc3ByaXRlJztcclxuXHJcbmNvbnN0IGRlY2tEZWFsRHVyYXRpb24gPSAxMDAwO1xyXG5sZXQgZGVja0RlYWxUaW1lOiBudW1iZXIgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XHJcbmxldCBjdXJyZW50VGltZTogbnVtYmVyIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlbmRlcih0aW1lOiBudW1iZXIpIHtcclxuICAgIHdoaWxlIChTdGF0ZS5nYW1lU3RhdGUgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIGF3YWl0IExpYi5kZWxheSgxMDApO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGRlbHRhVGltZSA9IHRpbWUgLSAoY3VycmVudFRpbWUgIT09IHVuZGVmaW5lZCA/IGN1cnJlbnRUaW1lIDogdGltZSk7XHJcbiAgICBjdXJyZW50VGltZSA9IHRpbWU7XHJcblxyXG4gICAgY29uc3QgdW5sb2NrID0gYXdhaXQgU3RhdGUubG9jaygpO1xyXG4gICAgdHJ5IHtcclxuICAgICAgICAvLyBjbGVhciB0aGUgc2NyZWVuXHJcbiAgICAgICAgVlAuY29udGV4dC5jbGVhclJlY3QoMCwgMCwgVlAuY2FudmFzLndpZHRoLCBWUC5jYW52YXMuaGVpZ2h0KTtcclxuXHJcbiAgICAgICAgcmVuZGVyQmFzaWNzKFN0YXRlLmdhbWVJZCwgU3RhdGUucGxheWVyTmFtZSk7XHJcbiAgICAgICAgcmVuZGVyRGVjayh0aW1lLCBkZWx0YVRpbWUsIFN0YXRlLmdhbWVTdGF0ZS5kZWNrQ291bnQpO1xyXG4gICAgICAgIHJlbmRlck90aGVyUGxheWVycyhkZWx0YVRpbWUsIFN0YXRlLmdhbWVTdGF0ZSk7XHJcbiAgICAgICAgcmVuZGVyUGxheWVyKGRlbHRhVGltZSwgU3RhdGUuZ2FtZVN0YXRlKTtcclxuICAgICAgICByZW5kZXJCdXR0b25zKCk7XHJcbiAgICB9IGZpbmFsbHkge1xyXG4gICAgICAgIHVubG9jaygpO1xyXG4gICAgfVxyXG5cclxuICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUocmVuZGVyKTtcclxufVxyXG5cclxuZnVuY3Rpb24gcmVuZGVyQmFzaWNzKGdhbWVJZDogc3RyaW5nLCBwbGF5ZXJOYW1lOiBzdHJpbmcpIHtcclxuICAgIFZQLmNvbnRleHQuZmlsbFN0eWxlID0gJyMwMDAwMDBmZic7XHJcbiAgICBWUC5jb250ZXh0LmZvbnQgPSAnMC43NWNtIElycmVndWxhcmlzJztcclxuICAgIFZQLmNvbnRleHQuZmlsbFRleHQoYEdhbWU6ICR7Z2FtZUlkfWAsIDAsIDAuNzUgKiBWUC5waXhlbHNQZXJDTSk7XHJcbiAgICBWUC5jb250ZXh0LmZpbGxUZXh0KGBZb3VyIG5hbWUgaXM6ICR7cGxheWVyTmFtZX1gLCAwLCBWUC5jYW52YXMuaGVpZ2h0KTtcclxuICAgIFxyXG4gICAgVlAuY29udGV4dC5zZXRMaW5lRGFzaChbNCwgMl0pO1xyXG4gICAgVlAuY29udGV4dC5zdHJva2VSZWN0KFZQLnNwcml0ZUhlaWdodCwgVlAuc3ByaXRlSGVpZ2h0LCBWUC5jYW52YXMud2lkdGggLSAyICogVlAuc3ByaXRlSGVpZ2h0LCBWUC5jYW52YXMuaGVpZ2h0IC0gMiAqIFZQLnNwcml0ZUhlaWdodCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbmRlckRlY2sodGltZTogbnVtYmVyLCBkZWx0YVRpbWU6IG51bWJlciwgZGVja0NvdW50OiBudW1iZXIpIHtcclxuICAgIFZQLmNvbnRleHQuc2F2ZSgpO1xyXG4gICAgdHJ5IHtcclxuICAgICAgICBpZiAoZGVja0RlYWxUaW1lID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgZGVja0RlYWxUaW1lID0gdGltZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgU3RhdGUuZGVja1Nwcml0ZXMubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAgICAgY29uc3QgZGVja1Nwcml0ZSA9IFN0YXRlLmRlY2tTcHJpdGVzW2ldO1xyXG4gICAgICAgICAgICBpZiAoZGVja1Nwcml0ZSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChpID09PSBkZWNrQ291bnQgLSAxICYmXHJcbiAgICAgICAgICAgICAgICBJbnB1dC5hY3Rpb24gIT09IFwiTm9uZVwiICYmXHJcbiAgICAgICAgICAgICAgICBJbnB1dC5hY3Rpb24gIT09IFwiU29ydEJ5U3VpdFwiICYmXHJcbiAgICAgICAgICAgICAgICBJbnB1dC5hY3Rpb24gIT09IFwiU29ydEJ5UmFua1wiICYmXHJcbiAgICAgICAgICAgICAgICBJbnB1dC5hY3Rpb24gIT09IFwiRGVzZWxlY3RcIiAmJiAoXHJcbiAgICAgICAgICAgICAgICBJbnB1dC5hY3Rpb24udHlwZSA9PT0gXCJEcmF3RnJvbURlY2tcIiB8fFxyXG4gICAgICAgICAgICAgICAgSW5wdXQuYWN0aW9uLnR5cGUgPT09IFwiV2FpdGluZ0Zvck5ld0NhcmRcIlxyXG4gICAgICAgICAgICApKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBzZXQgaW4gb25tb3VzZW1vdmVcclxuICAgICAgICAgICAgfSBlbHNlIGlmICh0aW1lIC0gZGVja0RlYWxUaW1lIDwgaSAqIGRlY2tEZWFsRHVyYXRpb24gLyBkZWNrQ291bnQpIHtcclxuICAgICAgICAgICAgICAgIC8vIGNhcmQgbm90IHlldCBkZWFsdDsga2VlcCB0b3AgbGVmdFxyXG4gICAgICAgICAgICAgICAgZGVja1Nwcml0ZS5wb3NpdGlvbiA9IG5ldyBWZWN0b3IoLVZQLnNwcml0ZVdpZHRoLCAtVlAuc3ByaXRlSGVpZ2h0KTtcclxuICAgICAgICAgICAgICAgIGRlY2tTcHJpdGUudGFyZ2V0ID0gbmV3IFZlY3RvcigtVlAuc3ByaXRlV2lkdGgsIC1WUC5zcHJpdGVIZWlnaHQpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgZGVja1Nwcml0ZS50YXJnZXQgPSBuZXcgVmVjdG9yKFxyXG4gICAgICAgICAgICAgICAgICAgIFZQLmNhbnZhcy53aWR0aCAvIDIgLSBWUC5zcHJpdGVXaWR0aCAvIDIgLSAoaSAtIGRlY2tDb3VudCAvIDIpICogVlAuc3ByaXRlRGVja0dhcCxcclxuICAgICAgICAgICAgICAgICAgICBWUC5jYW52YXMuaGVpZ2h0IC8gMiAtIFZQLnNwcml0ZUhlaWdodCAvIDJcclxuICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGRlY2tTcHJpdGUuYW5pbWF0ZShkZWx0YVRpbWUpO1xyXG4gICAgICAgIH1cclxuICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgVlAuY29udGV4dC5yZXN0b3JlKCk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbmRlck90aGVyUGxheWVycyhkZWx0YVRpbWU6IG51bWJlciwgZ2FtZVN0YXRlOiBMaWIuR2FtZVN0YXRlKSB7XHJcbiAgICBWUC5jb250ZXh0LnNhdmUoKTtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgVlAuY29udGV4dC50cmFuc2xhdGUoMCwgKFZQLmNhbnZhcy53aWR0aCArIFZQLmNhbnZhcy5oZWlnaHQpIC8gMik7XHJcbiAgICAgICAgVlAuY29udGV4dC5yb3RhdGUoLU1hdGguUEkgLyAyKTtcclxuICAgICAgICByZW5kZXJPdGhlclBsYXllcihkZWx0YVRpbWUsIGdhbWVTdGF0ZSwgKGdhbWVTdGF0ZS5wbGF5ZXJJbmRleCArIDEpICUgNCk7XHJcbiAgICB9IGZpbmFsbHkge1xyXG4gICAgICAgIFZQLmNvbnRleHQucmVzdG9yZSgpO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBWUC5jb250ZXh0LnNhdmUoKTtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgcmVuZGVyT3RoZXJQbGF5ZXIoZGVsdGFUaW1lLCBnYW1lU3RhdGUsIChnYW1lU3RhdGUucGxheWVySW5kZXggKyAyKSAlIDQpO1xyXG4gICAgfSBmaW5hbGx5IHtcclxuICAgICAgICBWUC5jb250ZXh0LnJlc3RvcmUoKTtcclxuICAgIH1cclxuXHJcbiAgICBWUC5jb250ZXh0LnNhdmUoKTtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgVlAuY29udGV4dC50cmFuc2xhdGUoVlAuY2FudmFzLndpZHRoLCAoVlAuY2FudmFzLmhlaWdodCAtIFZQLmNhbnZhcy53aWR0aCkgLyAyKTtcclxuICAgICAgICBWUC5jb250ZXh0LnJvdGF0ZShNYXRoLlBJKTtcclxuICAgICAgICByZW5kZXJPdGhlclBsYXllcihkZWx0YVRpbWUsIGdhbWVTdGF0ZSwgKGdhbWVTdGF0ZS5wbGF5ZXJJbmRleCArIDMpICUgNCk7XHJcbiAgICB9IGZpbmFsbHkge1xyXG4gICAgICAgIFZQLmNvbnRleHQucmVzdG9yZSgpO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiByZW5kZXJPdGhlclBsYXllcihkZWx0YVRpbWU6IG51bWJlciwgZ2FtZVN0YXRlOiBMaWIuR2FtZVN0YXRlLCBwbGF5ZXJJbmRleDogbnVtYmVyKSB7XHJcbiAgICBjb25zdCBwbGF5ZXIgPSBnYW1lU3RhdGUub3RoZXJQbGF5ZXJzW3BsYXllckluZGV4XTtcclxuICAgIGlmIChwbGF5ZXIgPT09IHVuZGVmaW5lZCkgcmV0dXJuO1xyXG5cclxuICAgIFZQLmNvbnRleHQuZmlsbFN0eWxlID0gJyMwMDAwMDBmZic7XHJcbiAgICBWUC5jb250ZXh0LmZvbnQgPSBgJHtWUC5zcHJpdGVHYXB9cHggSXJyZWd1bGFyaXNgO1xyXG4gICAgVlAuY29udGV4dC5maWxsVGV4dChwbGF5ZXIubmFtZSwgVlAuY2FudmFzLndpZHRoIC8gMiwgVlAuc3ByaXRlSGVpZ2h0ICsgVlAuc3ByaXRlR2FwKTtcclxuXHJcbiAgICBjb25zdCBkZWNrUG9zaXRpb24gPSBTdGF0ZS5kZWNrU3ByaXRlc1tTdGF0ZS5kZWNrU3ByaXRlcy5sZW5ndGggLSAxXT8ucG9zaXRpb24gPz9cclxuICAgICAgICBuZXcgVmVjdG9yKFZQLmNhbnZhcy53aWR0aCAvIDIgLSBWUC5zcHJpdGVXaWR0aCAvIDIsIFZQLmNhbnZhcy5oZWlnaHQgLyAyIC0gVlAuc3ByaXRlSGVpZ2h0IC8gMik7XHJcbiAgICBjb25zdCBkZWNrUG9pbnQgPSBWUC5jb250ZXh0LmdldFRyYW5zZm9ybSgpLmludmVyc2UoKS50cmFuc2Zvcm1Qb2ludCh7XHJcbiAgICAgICAgdzogMSxcclxuICAgICAgICB4OiBkZWNrUG9zaXRpb24ueCxcclxuICAgICAgICB5OiBkZWNrUG9zaXRpb24ueSxcclxuICAgICAgICB6OiAwXHJcbiAgICB9KTtcclxuXHJcbiAgICBsZXQgaSA9IDA7XHJcbiAgICBjb25zdCBmYWNlU3ByaXRlcyA9IFN0YXRlLmZhY2VTcHJpdGVzRm9yUGxheWVyW3BsYXllckluZGV4XTtcclxuICAgIGlmIChmYWNlU3ByaXRlcyA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICAgIGZvciAoY29uc3QgZmFjZVNwcml0ZSBvZiBmYWNlU3ByaXRlcykge1xyXG4gICAgICAgIGZhY2VTcHJpdGUudGFyZ2V0ID0gbmV3IFZlY3RvcihWUC5jYW52YXMud2lkdGggLyAyIC0gVlAuc3ByaXRlV2lkdGggLyAyICsgKGkrKyAtIGZhY2VTcHJpdGVzLmxlbmd0aCAvIDIpICogVlAuc3ByaXRlR2FwLCBWUC5zcHJpdGVIZWlnaHQpO1xyXG4gICAgICAgIGZhY2VTcHJpdGUuYW5pbWF0ZShkZWx0YVRpbWUpO1xyXG4gICAgfVxyXG5cclxuICAgIGkgPSAwO1xyXG4gICAgY29uc3QgYmFja1Nwcml0ZXMgPSBTdGF0ZS5iYWNrU3ByaXRlc0ZvclBsYXllcltwbGF5ZXJJbmRleF07XHJcbiAgICBpZiAoYmFja1Nwcml0ZXMgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICBmb3IgKGNvbnN0IGJhY2tTcHJpdGUgb2YgYmFja1Nwcml0ZXMpIHtcclxuICAgICAgICBiYWNrU3ByaXRlLnRhcmdldCA9IG5ldyBWZWN0b3IoVlAuY2FudmFzLndpZHRoIC8gMiAtIFZQLnNwcml0ZVdpZHRoIC8gMiArIChpKysgLSBiYWNrU3ByaXRlcy5sZW5ndGggLyAyKSAqIFZQLnNwcml0ZUdhcCwgMCk7XHJcbiAgICAgICAgYmFja1Nwcml0ZS5hbmltYXRlKGRlbHRhVGltZSk7XHJcbiAgICB9XHJcbn1cclxuXHJcbi8vIHJldHVybnMgdGhlIGFkanVzdGVkIHJldmVhbCBpbmRleFxyXG5mdW5jdGlvbiByZW5kZXJQbGF5ZXIoZGVsdGFUaW1lOiBudW1iZXIsIGdhbWVTdGF0ZTogTGliLkdhbWVTdGF0ZSkge1xyXG4gICAgY29uc3Qgc3ByaXRlcyA9IFN0YXRlLmZhY2VTcHJpdGVzRm9yUGxheWVyW2dhbWVTdGF0ZS5wbGF5ZXJJbmRleF07XHJcbiAgICBpZiAoc3ByaXRlcyA9PT0gdW5kZWZpbmVkKSByZXR1cm47XHJcblxyXG4gICAgbGV0IGkgPSAwO1xyXG4gICAgZm9yIChjb25zdCBzcHJpdGUgb2Ygc3ByaXRlcykge1xyXG4gICAgICAgIHNwcml0ZS5hbmltYXRlKGRlbHRhVGltZSk7XHJcblxyXG4gICAgICAgIGlmIChMaWIuYmluYXJ5U2VhcmNoTnVtYmVyKFN0YXRlLnNlbGVjdGVkSW5kaWNlcywgaSsrKSA+PSAwKSB7XHJcbiAgICAgICAgICAgIFZQLmNvbnRleHQuZmlsbFN0eWxlID0gJyMwMDgwODA0MCc7XHJcbiAgICAgICAgICAgIFZQLmNvbnRleHQuZmlsbFJlY3Qoc3ByaXRlLnBvc2l0aW9uLngsIHNwcml0ZS5wb3NpdGlvbi55LCBWUC5zcHJpdGVXaWR0aCwgVlAuc3ByaXRlSGVpZ2h0KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbmRlckJ1dHRvbnMoKSB7XHJcbiAgICBWUC5jb250ZXh0LnNhdmUoKTtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgLy8gYmx1ciBpbWFnZSBiZWhpbmRcclxuICAgICAgICAvL3N0YWNrQmx1ckNhbnZhc1JHQkEoJ2NhbnZhcycsIHgsIHksIGNhbnZhcy53aWR0aCAtIHgsIGNhbnZhcy5oZWlnaHQgLSB5LCAxNik7XHJcblxyXG4gICAgICAgIGNvbnN0IHggPSBWUC5zb3J0QnlTdWl0Qm91bmRzWzBdLnggLSA0ICogVlAucGl4ZWxzUGVyQ007XHJcbiAgICAgICAgY29uc3QgeSA9IFZQLnNvcnRCeVN1aXRCb3VuZHNbMF0ueTtcclxuICAgICAgICBWUC5jb250ZXh0LmZpbGxTdHlsZSA9ICcjMDBmZmZmNzcnO1xyXG4gICAgICAgIFZQLmNvbnRleHQuZmlsbFJlY3QoeCwgeSwgVlAuY2FudmFzLndpZHRoIC0geCwgVlAuY2FudmFzLmhlaWdodCAtIHkpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIFZQLmNvbnRleHQuZmlsbFN0eWxlID0gJyMwMDAwMDBmZic7XHJcbiAgICAgICAgVlAuY29udGV4dC5mb250ID0gJzEuNWNtIElycmVndWxhcmlzJztcclxuICAgICAgICBWUC5jb250ZXh0LmZpbGxUZXh0KCdTT1JUJywgeCArIDAuMjUgKiBWUC5waXhlbHNQZXJDTSwgeSArIDIuMjUgKiBWUC5waXhlbHNQZXJDTSk7XHJcblxyXG4gICAgICAgIFZQLmNvbnRleHQuZm9udCA9ICczY20gSXJyZWd1bGFyaXMnO1xyXG4gICAgICAgIFZQLmNvbnRleHQuZmlsbFRleHQoJ3snLCB4ICsgMyAqIFZQLnBpeGVsc1BlckNNLCB5ICsgMi43NSAqIFZQLnBpeGVsc1BlckNNKTtcclxuXHJcbiAgICAgICAgVlAuY29udGV4dC5mb250ID0gJzEuNWNtIElycmVndWxhcmlzJztcclxuICAgICAgICBWUC5jb250ZXh0LmZpbGxUZXh0KCdTVUlUJywgVlAuc29ydEJ5U3VpdEJvdW5kc1swXS54LCBWUC5zb3J0QnlTdWl0Qm91bmRzWzFdLnkpO1xyXG5cclxuICAgICAgICBWUC5jb250ZXh0LmZvbnQgPSAnMS41Y20gSXJyZWd1bGFyaXMnO1xyXG4gICAgICAgIFZQLmNvbnRleHQuZmlsbFRleHQoJ1JBTksnLCBWUC5zb3J0QnlSYW5rQm91bmRzWzBdLngsIFZQLnNvcnRCeVJhbmtCb3VuZHNbMV0ueSk7XHJcblxyXG4gICAgICAgIC8vY29udGV4dC5maWxsU3R5bGUgPSAnI2ZmMDAwMDc3JztcclxuICAgICAgICAvL2NvbnRleHQuZmlsbFJlY3QoVlAuc29ydEJ5U3VpdEJvdW5kc1swXS54LCBWUC5zb3J0QnlTdWl0Qm91bmRzWzBdLnksXHJcbiAgICAgICAgICAgIC8vc29ydEJ5U3VpdEJvdW5kc1sxXS54IC0gc29ydEJ5U3VpdEJvdW5kc1swXS54LCBzb3J0QnlTdWl0Qm91bmRzWzFdLnkgLSBzb3J0QnlTdWl0Qm91bmRzWzBdLnkpO1xyXG5cclxuICAgICAgICAvL2NvbnRleHQuZmlsbFN0eWxlID0gJyMwMDAwZmY3Nyc7XHJcbiAgICAgICAgLy9jb250ZXh0LmZpbGxSZWN0KHNvcnRCeVJhbmtCb3VuZHNbMF0ueCwgc29ydEJ5UmFua0JvdW5kc1swXS55LFxyXG4gICAgICAgICAgICAvL3NvcnRCeVJhbmtCb3VuZHNbMV0ueCAtIHNvcnRCeVJhbmtCb3VuZHNbMF0ueCwgc29ydEJ5UmFua0JvdW5kc1sxXS55IC0gc29ydEJ5UmFua0JvdW5kc1swXS55KTtcclxuICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgVlAuY29udGV4dC5yZXN0b3JlKCk7XHJcbiAgICB9XHJcbn1cclxuIiwiaW1wb3J0IFZlY3RvciBmcm9tICcuL3ZlY3Rvcic7XHJcbmltcG9ydCAqIGFzIFZQIGZyb20gJy4vdmlldy1wYXJhbXMnO1xyXG5cclxuY29uc3Qgc3ByaW5nQ29uc3RhbnQgPSAxMDAwO1xyXG5jb25zdCBtYXNzID0gMTtcclxuY29uc3QgZHJhZyA9IE1hdGguc3FydCg0ICogbWFzcyAqIHNwcmluZ0NvbnN0YW50KTtcclxuXHJcbi8vIHN0YXRlIGZvciBwaHlzaWNzLWJhc2VkIGFuaW1hdGlvbnNcclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgU3ByaXRlIHtcclxuICAgIGltYWdlOiBIVE1MSW1hZ2VFbGVtZW50O1xyXG4gICAgdGFyZ2V0OiBWZWN0b3I7XHJcbiAgICBwb3NpdGlvbjogVmVjdG9yO1xyXG4gICAgdmVsb2NpdHk6IFZlY3RvcjtcclxuXHJcbiAgICAvL2JhZCA9IGZhbHNlO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKGltYWdlOiBIVE1MSW1hZ2VFbGVtZW50KSB7XHJcbiAgICAgICAgdGhpcy5pbWFnZSA9IGltYWdlO1xyXG4gICAgICAgIHRoaXMudGFyZ2V0ID0gbmV3IFZlY3RvcigwLCAwKTtcclxuICAgICAgICB0aGlzLnBvc2l0aW9uID0gbmV3IFZlY3RvcigwLCAwKTtcclxuICAgICAgICB0aGlzLnZlbG9jaXR5ID0gbmV3IFZlY3RvcigwLCAwKTtcclxuICAgIH1cclxuXHJcbiAgICBhbmltYXRlKGRlbHRhVGltZTogbnVtYmVyKSB7XHJcbiAgICAgICAgY29uc3Qgc3ByaW5nRm9yY2UgPSB0aGlzLnRhcmdldC5zdWIodGhpcy5wb3NpdGlvbikuc2NhbGUoc3ByaW5nQ29uc3RhbnQpO1xyXG4gICAgICAgIGNvbnN0IGRyYWdGb3JjZSA9IHRoaXMudmVsb2NpdHkuc2NhbGUoLWRyYWcpO1xyXG4gICAgICAgIGNvbnN0IGFjY2VsZXJhdGlvbiA9IHNwcmluZ0ZvcmNlLmFkZChkcmFnRm9yY2UpLnNjYWxlKDEgLyBtYXNzKTtcclxuXHJcbiAgICAgICAgLy9jb25zdCBzYXZlZFZlbG9jaXR5ID0gdGhpcy52ZWxvY2l0eTtcclxuICAgICAgICAvL2NvbnN0IHNhdmVkUG9zaXRpb24gPSB0aGlzLnBvc2l0aW9uO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHRoaXMudmVsb2NpdHkgPSB0aGlzLnZlbG9jaXR5LmFkZChhY2NlbGVyYXRpb24uc2NhbGUoZGVsdGFUaW1lIC8gMTAwMCkpO1xyXG4gICAgICAgIHRoaXMucG9zaXRpb24gPSB0aGlzLnBvc2l0aW9uLmFkZCh0aGlzLnZlbG9jaXR5LnNjYWxlKGRlbHRhVGltZSAvIDEwMDApKTtcclxuXHJcbiAgICAgICAgLypcclxuICAgICAgICBpZiAoIXRoaXMuYmFkICYmIChcclxuICAgICAgICAgICAgIWlzRmluaXRlKHRoaXMudmVsb2NpdHkueCkgfHwgaXNOYU4odGhpcy52ZWxvY2l0eS54KSB8fFxyXG4gICAgICAgICAgICAhaXNGaW5pdGUodGhpcy52ZWxvY2l0eS55KSB8fCBpc05hTih0aGlzLnZlbG9jaXR5LnkpIHx8XHJcbiAgICAgICAgICAgICFpc0Zpbml0ZSh0aGlzLnBvc2l0aW9uLngpIHx8IGlzTmFOKHRoaXMucG9zaXRpb24ueCkgfHxcclxuICAgICAgICAgICAgIWlzRmluaXRlKHRoaXMucG9zaXRpb24ueSkgfHwgaXNOYU4odGhpcy5wb3NpdGlvbi55KVxyXG4gICAgICAgICkpIHtcclxuICAgICAgICAgICAgdGhpcy5iYWQgPSB0cnVlO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgY29uc29sZS5sb2coYGRlbHRhVGltZTogJHtkZWx0YVRpbWV9LCBzcHJpbmdGb3JjZTogJHtKU09OLnN0cmluZ2lmeShzcHJpbmdGb3JjZSl9LCBkcmFnRm9yY2U6ICR7SlNPTi5zdHJpbmdpZnkoZHJhZ0ZvcmNlKX1gKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coYHRhcmdldDogJHtKU09OLnN0cmluZ2lmeSh0aGlzLnRhcmdldCl9LCBwb3NpdGlvbjogJHtKU09OLnN0cmluZ2lmeShzYXZlZFBvc2l0aW9uKX0sIHZlbG9jaXR5OiAke0pTT04uc3RyaW5naWZ5KHNhdmVkVmVsb2NpdHkpfSwgYWNjZWxlcmF0aW9uOiAke0pTT04uc3RyaW5naWZ5KGFjY2VsZXJhdGlvbil9YCk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBuZXcgcG9zaXRpb246ICR7SlNPTi5zdHJpbmdpZnkodGhpcy5wb3NpdGlvbil9LCBuZXcgdmVsb2NpdHk6ICR7SlNPTi5zdHJpbmdpZnkodGhpcy52ZWxvY2l0eSl9YCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgICovXHJcblxyXG4gICAgICAgIFZQLmNvbnRleHQuZHJhd0ltYWdlKHRoaXMuaW1hZ2UsIHRoaXMucG9zaXRpb24ueCwgdGhpcy5wb3NpdGlvbi55LCBWUC5zcHJpdGVXaWR0aCwgVlAuc3ByaXRlSGVpZ2h0KTtcclxuICAgIH1cclxufSIsImltcG9ydCB7IE11dGV4IH0gZnJvbSAnYXdhaXQtc2VtYXBob3JlJztcclxuXHJcbmltcG9ydCAqIGFzIExpYiBmcm9tICcuLi9saWInO1xyXG5pbXBvcnQgKiBhcyBDYXJkSW1hZ2VzIGZyb20gJy4vY2FyZC1pbWFnZXMnO1xyXG5pbXBvcnQgKiBhcyBWUCBmcm9tICcuL3ZpZXctcGFyYW1zJztcclxuaW1wb3J0IFNwcml0ZSBmcm9tICcuL3Nwcml0ZSc7XHJcbmltcG9ydCBWZWN0b3IgZnJvbSAnLi92ZWN0b3InO1xyXG5cclxuY29uc3QgcGxheWVyTmFtZUZyb21Db29raWUgPSBMaWIuZ2V0Q29va2llKCdwbGF5ZXJOYW1lJyk7XHJcbmlmIChwbGF5ZXJOYW1lRnJvbUNvb2tpZSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoJ05vIHBsYXllciBuYW1lIScpO1xyXG5leHBvcnQgY29uc3QgcGxheWVyTmFtZSA9IHBsYXllck5hbWVGcm9tQ29va2llO1xyXG5cclxuY29uc3QgZ2FtZUlkRnJvbUNvb2tpZSA9IExpYi5nZXRDb29raWUoJ2dhbWVJZCcpO1xyXG5pZiAoZ2FtZUlkRnJvbUNvb2tpZSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoJ05vIGdhbWUgaWQhJyk7XHJcbmV4cG9ydCBjb25zdCBnYW1lSWQgPSBnYW1lSWRGcm9tQ29va2llO1xyXG5cclxuLy8gc29tZSBzdGF0ZS1tYW5pcHVsYXRpbmcgb3BlcmF0aW9ucyBhcmUgYXN5bmNocm9ub3VzLCBzbyB3ZSBuZWVkIHRvIGd1YXJkIGFnYWluc3QgcmFjZXNcclxuY29uc3Qgc3RhdGVNdXRleCA9IG5ldyBNdXRleCgpO1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbG9jaygpOiBQcm9taXNlPCgpID0+IHZvaWQ+IHtcclxuICAgIC8vY29uc29sZS5sb2coYGFjcXVpcmluZyBzdGF0ZSBsb2NrLi4uXFxuJHtuZXcgRXJyb3IoKS5zdGFja31gKTtcclxuICAgIGNvbnN0IHJlbGVhc2UgPSBhd2FpdCBzdGF0ZU11dGV4LmFjcXVpcmUoKTtcclxuICAgIC8vY29uc29sZS5sb2coYGFjcXVpcmVkIHN0YXRlIGxvY2tcXG4ke25ldyBFcnJvcigpLnN0YWNrfWApO1xyXG4gICAgcmV0dXJuICgpID0+IHtcclxuICAgICAgICByZWxlYXNlKCk7XHJcbiAgICAgICAgLy9jb25zb2xlLmxvZyhgcmVsZWFzZWQgc3RhdGUgbG9ja2ApO1xyXG4gICAgfTtcclxufVxyXG5cclxuLy8gd2UgbmVlZCB0byBrZWVwIGEgY29weSBvZiB0aGUgcHJldmlvdXMgZ2FtZSBzdGF0ZSBhcm91bmQgZm9yIGJvb2trZWVwaW5nIHB1cnBvc2VzXHJcbmV4cG9ydCBsZXQgcHJldmlvdXNHYW1lU3RhdGU6IExpYi5HYW1lU3RhdGUgfCB1bmRlZmluZWQ7XHJcbi8vIHRoZSBtb3N0IHJlY2VudGx5IHJlY2VpdmVkIGdhbWUgc3RhdGUsIGlmIGFueVxyXG5leHBvcnQgbGV0IGdhbWVTdGF0ZTogTGliLkdhbWVTdGF0ZSB8IHVuZGVmaW5lZDtcclxuXHJcbi8vIGluZGljZXMgb2YgY2FyZHMgZm9yIGRyYWcgJiBkcm9wXHJcbi8vIElNUE9SVEFOVDogdGhpcyBhcnJheSBtdXN0IGFsd2F5cyBiZSBzb3J0ZWQhXHJcbi8vIEFsd2F5cyB1c2UgYmluYXJ5U2VhcmNoIHRvIGluc2VydCBhbmQgZGVsZXRlIG9yIHNvcnQgYWZ0ZXIgbWFuaXB1bGF0aW9uXHJcbmV4cG9ydCBjb25zdCBzZWxlY3RlZEluZGljZXM6IG51bWJlcltdID0gW107XHJcblxyXG4vLyBmb3IgYW5pbWF0aW5nIHRoZSBkZWNrXHJcbmV4cG9ydCBsZXQgZGVja1Nwcml0ZXM6IFNwcml0ZVtdID0gW107XHJcblxyXG4vLyBhc3NvY2lhdGl2ZSBhcnJheXMsIG9uZSBmb3IgZWFjaCBwbGF5ZXIgYXQgdGhlaXIgcGxheWVyIGluZGV4XHJcbi8vIGVhY2ggZWxlbWVudCBjb3JyZXNwb25kcyB0byBhIGZhY2UtZG93biBjYXJkIGJ5IGluZGV4XHJcbmV4cG9ydCBsZXQgYmFja1Nwcml0ZXNGb3JQbGF5ZXI6IFNwcml0ZVtdW10gPSBbXTtcclxuLy8gZWFjaCBlbGVtZW50IGNvcnJlc3BvbmRzIHRvIGEgZmFjZS11cCBjYXJkIGJ5IGluZGV4XHJcbmV4cG9ydCBsZXQgZmFjZVNwcml0ZXNGb3JQbGF5ZXI6IFNwcml0ZVtdW10gPSBbXTtcclxuXHJcbi8vIG9wZW4gd2Vic29ja2V0IGNvbm5lY3Rpb24gdG8gZ2V0IGdhbWUgc3RhdGUgdXBkYXRlc1xyXG5sZXQgd3MgPSBuZXcgV2ViU29ja2V0KGB3c3M6Ly8ke3dpbmRvdy5sb2NhdGlvbi5ob3N0bmFtZX0vYCk7XHJcblxyXG5jb25zdCBjYWxsYmFja3NGb3JNZXRob2ROYW1lID0gbmV3IE1hcDxMaWIuTWV0aG9kTmFtZSwgKChyZXN1bHQ6IExpYi5NZXRob2RSZXN1bHQpID0+IHZvaWQpW10+KCk7XHJcbmZ1bmN0aW9uIGFkZENhbGxiYWNrKG1ldGhvZE5hbWU6IExpYi5NZXRob2ROYW1lLCByZXNvbHZlOiAoKSA9PiB2b2lkLCByZWplY3Q6IChyZWFzb246IGFueSkgPT4gdm9pZCkge1xyXG4gICAgY29uc29sZS5sb2coYGFkZGluZyBjYWxsYmFjayBmb3IgbWV0aG9kICcke21ldGhvZE5hbWV9J2ApO1xyXG5cclxuICAgIGxldCBjYWxsYmFja3MgPSBjYWxsYmFja3NGb3JNZXRob2ROYW1lLmdldChtZXRob2ROYW1lKTtcclxuICAgIGlmIChjYWxsYmFja3MgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIGNhbGxiYWNrcyA9IFtdO1xyXG4gICAgICAgIGNhbGxiYWNrc0Zvck1ldGhvZE5hbWUuc2V0KG1ldGhvZE5hbWUsIGNhbGxiYWNrcyk7XHJcbiAgICB9XHJcblxyXG4gICAgY2FsbGJhY2tzLnB1c2gocmVzdWx0ID0+IHtcclxuICAgICAgICBjb25zb2xlLmxvZyhgaW52b2tpbmcgY2FsbGJhY2sgZm9yIG1ldGhvZCAnJHttZXRob2ROYW1lfSdgKTtcclxuICAgICAgICBpZiAoJ2Vycm9yRGVzY3JpcHRpb24nIGluIHJlc3VsdCkge1xyXG4gICAgICAgICAgICByZWplY3QocmVzdWx0LmVycm9yRGVzY3JpcHRpb24pO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHJlc29sdmUoKTtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxufVxyXG5cclxud3Mub25tZXNzYWdlID0gYXN5bmMgZSA9PiB7XHJcbiAgICBjb25zdCBvYmogPSBKU09OLnBhcnNlKGUuZGF0YSk7XHJcbiAgICBpZiAoJ21ldGhvZE5hbWUnIGluIG9iaikge1xyXG4gICAgICAgIGNvbnN0IHJldHVybk1lc3NhZ2UgPSA8TGliLk1ldGhvZFJlc3VsdD5vYmo7XHJcbiAgICAgICAgY29uc3QgbWV0aG9kTmFtZSA9IHJldHVybk1lc3NhZ2UubWV0aG9kTmFtZTtcclxuICAgICAgICBjb25zdCBjYWxsYmFja3MgPSBjYWxsYmFja3NGb3JNZXRob2ROYW1lLmdldChtZXRob2ROYW1lKTtcclxuICAgICAgICBpZiAoY2FsbGJhY2tzID09PSB1bmRlZmluZWQgfHwgY2FsbGJhY2tzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYG5vIGNhbGxiYWNrcyBmb3VuZCBmb3IgbWV0aG9kOiAke21ldGhvZE5hbWV9YCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBjYWxsYmFjayA9IGNhbGxiYWNrcy5zaGlmdCgpO1xyXG4gICAgICAgIGlmIChjYWxsYmFjayA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgY2FsbGJhY2sgaXMgdW5kZWZpbmVkIGZvciBtZXRob2Q6ICR7bWV0aG9kTmFtZX1gKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgY2FsbGJhY2socmV0dXJuTWVzc2FnZSk7XHJcbiAgICB9IGVsc2UgaWYgKFxyXG4gICAgICAgICdkZWNrQ291bnQnIGluIG9iaiAmJlxyXG4gICAgICAgICdhY3RpdmVQbGF5ZXJJbmRleCcgaW4gb2JqICYmXHJcbiAgICAgICAgJ3BsYXllckluZGV4JyBpbiBvYmogJiZcclxuICAgICAgICAncGxheWVyQ2FyZHMnIGluIG9iaiAmJlxyXG4gICAgICAgICdwbGF5ZXJSZXZlYWxDb3VudCcgaW4gb2JqICYmXHJcbiAgICAgICAgJ290aGVyUGxheWVycycgaW4gb2JqXHJcbiAgICApIHtcclxuICAgICAgICBjb25zdCB1bmxvY2sgPSBhd2FpdCBsb2NrKCk7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgcHJldmlvdXNHYW1lU3RhdGUgPSBnYW1lU3RhdGU7XHJcbiAgICAgICAgICAgIGdhbWVTdGF0ZSA9IDxMaWIuR2FtZVN0YXRlPm9iajtcclxuXHJcbiAgICAgICAgICAgIGlmIChwcmV2aW91c0dhbWVTdGF0ZSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgcHJldmlvdXNHYW1lU3RhdGUucGxheWVyQ2FyZHM6ICR7SlNPTi5zdHJpbmdpZnkocHJldmlvdXNHYW1lU3RhdGUucGxheWVyQ2FyZHMpfWApO1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYHByZXZpb3VzIHNlbGVjdGVkSW5kaWNlczogJHtKU09OLnN0cmluZ2lmeShzZWxlY3RlZEluZGljZXMpfWApO1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYHByZXZpb3VzIHNlbGVjdGVkQ2FyZHM6ICR7SlNPTi5zdHJpbmdpZnkoc2VsZWN0ZWRJbmRpY2VzLm1hcChpID0+IHByZXZpb3VzR2FtZVN0YXRlPy5wbGF5ZXJDYXJkc1tpXSkpfWApO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBzZWxlY3RlZCBpbmRpY2VzIG1pZ2h0IGhhdmUgc2hpZnRlZFxyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNlbGVjdGVkSW5kaWNlcy5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgc2VsZWN0ZWRJbmRleCA9IHNlbGVjdGVkSW5kaWNlc1tpXTtcclxuICAgICAgICAgICAgICAgIGlmIChzZWxlY3RlZEluZGV4ID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChKU09OLnN0cmluZ2lmeShnYW1lU3RhdGUucGxheWVyQ2FyZHNbc2VsZWN0ZWRJbmRleF0pICE9PSBKU09OLnN0cmluZ2lmeShwcmV2aW91c0dhbWVTdGF0ZT8ucGxheWVyQ2FyZHNbc2VsZWN0ZWRJbmRleF0pKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGZvdW5kID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBnYW1lU3RhdGUucGxheWVyQ2FyZHMubGVuZ3RoOyArK2opIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKEpTT04uc3RyaW5naWZ5KGdhbWVTdGF0ZS5wbGF5ZXJDYXJkc1tqXSkgPT09IEpTT04uc3RyaW5naWZ5KHByZXZpb3VzR2FtZVN0YXRlPy5wbGF5ZXJDYXJkc1tzZWxlY3RlZEluZGV4XSkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkSW5kaWNlc1tpXSA9IGo7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3VuZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFmb3VuZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZEluZGljZXMuc3BsaWNlKGksIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAtLWk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBiaW5hcnkgc2VhcmNoIHN0aWxsIG5lZWRzIHRvIHdvcmtcclxuICAgICAgICAgICAgc2VsZWN0ZWRJbmRpY2VzLnNvcnQoKGEsIGIpID0+IGEgLSBiKTtcclxuXHJcbiAgICAgICAgICAgIC8vIGluaXRpYWxpemUgYW5pbWF0aW9uIHN0YXRlc1xyXG4gICAgICAgICAgICBhc3NvY2lhdGVBbmltYXRpb25zV2l0aENhcmRzKHByZXZpb3VzR2FtZVN0YXRlLCBnYW1lU3RhdGUpO1xyXG5cclxuICAgICAgICAgICAgY29uc29sZS5sb2coYGdhbWVTdGF0ZS5wbGF5ZXJDYXJkczogJHtKU09OLnN0cmluZ2lmeShnYW1lU3RhdGUucGxheWVyQ2FyZHMpfWApO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgc2VsZWN0ZWRJbmRpY2VzOiAke0pTT04uc3RyaW5naWZ5KHNlbGVjdGVkSW5kaWNlcyl9YCk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBzZWxlY3RlZENhcmRzOiAke0pTT04uc3RyaW5naWZ5KHNlbGVjdGVkSW5kaWNlcy5tYXAoaSA9PiBnYW1lU3RhdGU/LnBsYXllckNhcmRzW2ldKSl9YCk7XHJcbiAgICAgICAgfSBmaW5hbGx5IHtcclxuICAgICAgICAgICAgdW5sb2NrKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoSlNPTi5zdHJpbmdpZnkoZS5kYXRhKSk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5sZXQgb25BbmltYXRpb25zQXNzb2NpYXRlZCA9ICgpID0+IHt9O1xyXG5cclxuZnVuY3Rpb24gYXNzb2NpYXRlQW5pbWF0aW9uc1dpdGhDYXJkcyhwcmV2aW91c0dhbWVTdGF0ZTogTGliLkdhbWVTdGF0ZSB8IHVuZGVmaW5lZCwgZ2FtZVN0YXRlOiBMaWIuR2FtZVN0YXRlKSB7XHJcbiAgICBkZWNrU3ByaXRlcy5zcGxpY2UoZ2FtZVN0YXRlLmRlY2tDb3VudCwgZGVja1Nwcml0ZXMubGVuZ3RoIC0gZ2FtZVN0YXRlLmRlY2tDb3VudCk7XHJcbiAgICBmb3IgKGxldCBpID0gZGVja1Nwcml0ZXMubGVuZ3RoOyBpIDwgZ2FtZVN0YXRlLmRlY2tDb3VudDsgKytpKSB7XHJcbiAgICAgICAgZGVja1Nwcml0ZXNbaV0gPSBuZXcgU3ByaXRlKENhcmRJbWFnZXMuZ2V0KCdCYWNrMCcpKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBwcmV2aW91c0JhY2tTcHJpdGVzRm9yUGxheWVyID0gYmFja1Nwcml0ZXNGb3JQbGF5ZXI7XHJcbiAgICBiYWNrU3ByaXRlc0ZvclBsYXllciA9IFtdO1xyXG5cclxuICAgIC8vIHJldXNlIHByZXZpb3VzIGZhY2Ugc3ByaXRlcyBhcyBtdWNoIGFzIHBvc3NpYmxlIHRvIG1haW50YWluIGNvbnRpbnVpdHlcclxuICAgIGNvbnN0IHByZXZpb3VzRmFjZVNwcml0ZXNGb3JQbGF5ZXIgPSBmYWNlU3ByaXRlc0ZvclBsYXllcjtcclxuICAgIGZhY2VTcHJpdGVzRm9yUGxheWVyID0gW107XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCA0OyArK2kpIHtcclxuICAgICAgICBsZXQgcHJldmlvdXNGYWNlQ2FyZHM6IExpYi5DYXJkW107XHJcbiAgICAgICAgbGV0IGZhY2VDYXJkczogTGliLkNhcmRbXTtcclxuXHJcbiAgICAgICAgbGV0IHByZXZpb3VzQmFja1Nwcml0ZXM6IFNwcml0ZVtdID0gcHJldmlvdXNCYWNrU3ByaXRlc0ZvclBsYXllcltpXSA/PyBbXTtcclxuICAgICAgICBsZXQgYmFja1Nwcml0ZXM6IFNwcml0ZVtdID0gW107XHJcbiAgICAgICAgYmFja1Nwcml0ZXNGb3JQbGF5ZXJbaV0gPSBiYWNrU3ByaXRlcztcclxuICAgICAgICBpZiAoaSA9PSBnYW1lU3RhdGUucGxheWVySW5kZXgpIHtcclxuICAgICAgICAgICAgcHJldmlvdXNGYWNlQ2FyZHMgPSBwcmV2aW91c0dhbWVTdGF0ZT8ucGxheWVyQ2FyZHMgPz8gW107XHJcbiAgICAgICAgICAgIGZhY2VDYXJkcyA9IGdhbWVTdGF0ZS5wbGF5ZXJDYXJkcztcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBsZXQgcHJldmlvdXNPdGhlclBsYXllciA9IHByZXZpb3VzR2FtZVN0YXRlPy5vdGhlclBsYXllcnNbaV07XHJcbiAgICAgICAgICAgIGxldCBvdGhlclBsYXllciA9IGdhbWVTdGF0ZS5vdGhlclBsYXllcnNbaV07XHJcblxyXG4gICAgICAgICAgICBwcmV2aW91c0ZhY2VDYXJkcyA9IHByZXZpb3VzT3RoZXJQbGF5ZXI/LnJldmVhbGVkQ2FyZHMgPz8gW107ICBcclxuICAgICAgICAgICAgZmFjZUNhcmRzID0gb3RoZXJQbGF5ZXI/LnJldmVhbGVkQ2FyZHMgPz8gW107XHJcblxyXG4gICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IChvdGhlclBsYXllcj8uY2FyZENvdW50ID8/IDApIC0gKG90aGVyUGxheWVyPy5yZXZlYWxlZENhcmRzPy5sZW5ndGggPz8gMCk7ICsraikge1xyXG4gICAgICAgICAgICAgICAgYmFja1Nwcml0ZXNbal0gPSBuZXcgU3ByaXRlKENhcmRJbWFnZXMuZ2V0KGBCYWNrJHtpfWApKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IHByZXZpb3VzRmFjZVNwcml0ZXM6IFNwcml0ZVtdID0gcHJldmlvdXNGYWNlU3ByaXRlc0ZvclBsYXllcltpXSA/PyBbXTtcclxuICAgICAgICBsZXQgZmFjZVNwcml0ZXM6IFNwcml0ZVtdID0gW107XHJcbiAgICAgICAgZmFjZVNwcml0ZXNGb3JQbGF5ZXJbaV0gPSBmYWNlU3ByaXRlcztcclxuICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGZhY2VDYXJkcy5sZW5ndGg7ICsraikge1xyXG4gICAgICAgICAgICBsZXQgZm91bmQgPSBmYWxzZTtcclxuICAgICAgICAgICAgZm9yIChsZXQgayA9IDA7IGsgPCBwcmV2aW91c0ZhY2VDYXJkcy5sZW5ndGg7ICsraykge1xyXG4gICAgICAgICAgICAgICAgaWYgKEpTT04uc3RyaW5naWZ5KGZhY2VDYXJkc1tqXSkgPT09IEpTT04uc3RyaW5naWZ5KHByZXZpb3VzRmFjZUNhcmRzW2tdKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHByZXZpb3VzRmFjZVNwcml0ZSA9IHByZXZpb3VzRmFjZVNwcml0ZXNba107XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHByZXZpb3VzRmFjZVNwcml0ZSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICAgICAgICAgICAgICAgICAgICBmYWNlU3ByaXRlc1tqXSA9IHByZXZpb3VzRmFjZVNwcml0ZTtcclxuICAgICAgICAgICAgICAgICAgICAvLyByZW1vdmUgdG8gYXZvaWQgYXNzb2NpYXRpbmcgYW5vdGhlciBzcHJpdGUgd2l0aCB0aGUgc2FtZSBjYXJkXHJcbiAgICAgICAgICAgICAgICAgICAgcHJldmlvdXNGYWNlU3ByaXRlcy5zcGxpY2UoaywgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcHJldmlvdXNGYWNlQ2FyZHMuc3BsaWNlKGssIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIGZvdW5kID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKCFmb3VuZCkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZmFjZUNhcmQgPSBmYWNlQ2FyZHNbal07XHJcbiAgICAgICAgICAgICAgICBpZiAoZmFjZUNhcmQgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICAgICAgICAgICAgICBmYWNlU3ByaXRlc1tqXSA9IG5ldyBTcHJpdGUoQ2FyZEltYWdlcy5nZXQoSlNPTi5zdHJpbmdpZnkoZmFjZUNhcmQpKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgc2V0U3ByaXRlVGFyZ2V0cyhnYW1lU3RhdGUpO1xyXG4gICAgXHJcbiAgICBvbkFuaW1hdGlvbnNBc3NvY2lhdGVkKCk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzZXRTcHJpdGVUYXJnZXRzKFxyXG4gICAgZ2FtZVN0YXRlOiBMaWIuR2FtZVN0YXRlLFxyXG4gICAgcmVzZXJ2ZWRTcHJpdGVzQW5kQ2FyZHM/OiBbU3ByaXRlLCBMaWIuQ2FyZF1bXSxcclxuICAgIG1vdmluZ1Nwcml0ZXNBbmRDYXJkcz86IFtTcHJpdGUsIExpYi5DYXJkXVtdLFxyXG4gICAgcmV2ZWFsQ291bnQ/OiBudW1iZXIsXHJcbiAgICBzcGxpdEluZGV4PzogbnVtYmVyLFxyXG4gICAgcmV0dXJuVG9EZWNrPzogYm9vbGVhblxyXG4pIHtcclxuICAgIGNvbnN0IHNwcml0ZXMgPSBmYWNlU3ByaXRlc0ZvclBsYXllcltnYW1lU3RhdGUucGxheWVySW5kZXhdO1xyXG4gICAgaWYgKHNwcml0ZXMgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcblxyXG4gICAgY29uc3QgY2FyZHMgPSBnYW1lU3RhdGUucGxheWVyQ2FyZHM7XHJcblxyXG4gICAgcmVzZXJ2ZWRTcHJpdGVzQW5kQ2FyZHMgPSByZXNlcnZlZFNwcml0ZXNBbmRDYXJkcyA/PyBjYXJkcy5tYXAoKGNhcmQsIGluZGV4KSA9PiA8W1Nwcml0ZSwgTGliLkNhcmRdPltzcHJpdGVzW2luZGV4XSwgY2FyZF0pO1xyXG4gICAgbW92aW5nU3ByaXRlc0FuZENhcmRzID0gbW92aW5nU3ByaXRlc0FuZENhcmRzID8/IFtdO1xyXG4gICAgcmV2ZWFsQ291bnQgPSByZXZlYWxDb3VudCA/PyBnYW1lU3RhdGUucGxheWVyUmV2ZWFsQ291bnQ7XHJcbiAgICBzcGxpdEluZGV4ID0gc3BsaXRJbmRleCA/PyBjYXJkcy5sZW5ndGg7XHJcbiAgICByZXR1cm5Ub0RlY2sgPSByZXR1cm5Ub0RlY2sgPz8gZmFsc2U7XHJcblxyXG4gICAgLy8gY2xlYXIgZm9yIHJlaW5zZXJ0aW9uXHJcbiAgICBzcHJpdGVzLnNwbGljZSgwLCBzcHJpdGVzLmxlbmd0aCk7XHJcbiAgICBjYXJkcy5zcGxpY2UoMCwgY2FyZHMubGVuZ3RoKTtcclxuXHJcbiAgICBmb3IgKGNvbnN0IFtyZXNlcnZlZFNwcml0ZSwgcmVzZXJ2ZWRDYXJkXSBvZiByZXNlcnZlZFNwcml0ZXNBbmRDYXJkcykge1xyXG4gICAgICAgIGlmIChjYXJkcy5sZW5ndGggPT09IHNwbGl0SW5kZXgpIHtcclxuICAgICAgICAgICAgZm9yIChjb25zdCBbbW92aW5nU3ByaXRlLCBtb3ZpbmdDYXJkXSBvZiBtb3ZpbmdTcHJpdGVzQW5kQ2FyZHMpIHtcclxuICAgICAgICAgICAgICAgIHNwcml0ZXMucHVzaChtb3ZpbmdTcHJpdGUpO1xyXG4gICAgICAgICAgICAgICAgY2FyZHMucHVzaChtb3ZpbmdDYXJkKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgaSA9IGNhcmRzLmxlbmd0aCA8IHJldmVhbENvdW50ID8gY2FyZHMubGVuZ3RoIDogY2FyZHMubGVuZ3RoIC0gcmV2ZWFsQ291bnQ7XHJcbiAgICAgICAgY29uc3QgaiA9IGNhcmRzLmxlbmd0aCA8IHJldmVhbENvdW50ID8gcmV2ZWFsQ291bnQgOiByZXNlcnZlZFNwcml0ZXNBbmRDYXJkcy5sZW5ndGggKyAocmV0dXJuVG9EZWNrID8gMCA6IG1vdmluZ1Nwcml0ZXNBbmRDYXJkcy5sZW5ndGgpIC0gcmV2ZWFsQ291bnQ7XHJcbiAgICAgICAgY29uc3QgeSA9IGNhcmRzLmxlbmd0aCA8IHJldmVhbENvdW50ID8gMiAqIFZQLnNwcml0ZUhlaWdodCA6IFZQLnNwcml0ZUhlaWdodDtcclxuICAgICAgICByZXNlcnZlZFNwcml0ZS50YXJnZXQgPSBuZXcgVmVjdG9yKFxyXG4gICAgICAgICAgICBWUC5jYW52YXMud2lkdGggLyAyIC0gVlAuc3ByaXRlV2lkdGggLyAyICsgKGkgLSBqIC8gMikgKiBWUC5zcHJpdGVHYXAsXHJcbiAgICAgICAgICAgIFZQLmNhbnZhcy5oZWlnaHQgLSB5XHJcbiAgICAgICAgKTtcclxuXHJcbiAgICAgICAgc3ByaXRlcy5wdXNoKHJlc2VydmVkU3ByaXRlKTtcclxuICAgICAgICBjYXJkcy5wdXNoKHJlc2VydmVkQ2FyZCk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGNhcmRzLmxlbmd0aCA9PT0gc3BsaXRJbmRleCkge1xyXG4gICAgICAgIGZvciAoY29uc3QgW21vdmluZ1Nwcml0ZSwgbW92aW5nQ2FyZF0gb2YgbW92aW5nU3ByaXRlc0FuZENhcmRzKSB7XHJcbiAgICAgICAgICAgIHNwcml0ZXMucHVzaChtb3ZpbmdTcHJpdGUpO1xyXG4gICAgICAgICAgICBjYXJkcy5wdXNoKG1vdmluZ0NhcmQpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBnYW1lU3RhdGUucGxheWVyUmV2ZWFsQ291bnQgPSByZXZlYWxDb3VudDtcclxufVxyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGpvaW5HYW1lKGdhbWVJZDogc3RyaW5nLCBwbGF5ZXJOYW1lOiBzdHJpbmcpIHtcclxuICAgIC8vIHdhaXQgZm9yIGNvbm5lY3Rpb25cclxuICAgIGRvIHtcclxuICAgICAgICBhd2FpdCBMaWIuZGVsYXkoMTAwMCk7XHJcbiAgICAgICAgY29uc29sZS5sb2coYHdzLnJlYWR5U3RhdGU6ICR7d3MucmVhZHlTdGF0ZX0sIFdlYlNvY2tldC5PUEVOOiAke1dlYlNvY2tldC5PUEVOfWApO1xyXG4gICAgfSB3aGlsZSAod3MucmVhZHlTdGF0ZSAhPSBXZWJTb2NrZXQuT1BFTik7XHJcblxyXG4gICAgLy8gdHJ5IHRvIGpvaW4gdGhlIGdhbWVcclxuICAgIGF3YWl0IG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICBhZGRDYWxsYmFjaygnam9pbkdhbWUnLCByZXNvbHZlLCByZWplY3QpO1xyXG4gICAgICAgIHdzLnNlbmQoSlNPTi5zdHJpbmdpZnkoPExpYi5Kb2luR2FtZU1lc3NhZ2U+eyBnYW1lSWQsIHBsYXllck5hbWUgfSkpO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkcmF3Q2FyZCgpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGNvbnN0IGFuaW1hdGlvbnNBc3NvY2lhdGVkID0gbmV3IFByb21pc2U8dm9pZD4ocmVzb2x2ZSA9PiB7XHJcbiAgICAgICAgb25BbmltYXRpb25zQXNzb2NpYXRlZCA9ICgpID0+IHtcclxuICAgICAgICAgICAgb25BbmltYXRpb25zQXNzb2NpYXRlZCA9ICgpID0+IHt9O1xyXG4gICAgICAgICAgICByZXNvbHZlKCk7XHJcbiAgICAgICAgfTtcclxuICAgIH0pO1xyXG5cclxuICAgIGF3YWl0IG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICBhZGRDYWxsYmFjaygnZHJhd0NhcmQnLCByZXNvbHZlLCByZWplY3QpO1xyXG4gICAgICAgIHdzLnNlbmQoSlNPTi5zdHJpbmdpZnkoPExpYi5EcmF3Q2FyZE1lc3NhZ2U+e1xyXG4gICAgICAgICAgICBkcmF3Q2FyZDogbnVsbFxyXG4gICAgICAgIH0pKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGF3YWl0IGFuaW1hdGlvbnNBc3NvY2lhdGVkO1xyXG59XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmV0dXJuQ2FyZHNUb0RlY2soZ2FtZVN0YXRlOiBMaWIuR2FtZVN0YXRlKSB7XHJcbiAgICBhd2FpdCBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgYWRkQ2FsbGJhY2soJ3JldHVybkNhcmRzVG9EZWNrJywgcmVzb2x2ZSwgcmVqZWN0KTtcclxuICAgICAgICB3cy5zZW5kKEpTT04uc3RyaW5naWZ5KDxMaWIuUmV0dXJuQ2FyZHNUb0RlY2tNZXNzYWdlPntcclxuICAgICAgICAgICAgY2FyZHNUb1JldHVyblRvRGVjazogc2VsZWN0ZWRJbmRpY2VzLm1hcChpID0+IGdhbWVTdGF0ZS5wbGF5ZXJDYXJkc1tpXSlcclxuICAgICAgICB9KSk7XHJcbiAgICB9KTtcclxuICAgIFxyXG4gICAgLy8gbWFrZSB0aGUgc2VsZWN0ZWQgY2FyZHMgZGlzYXBwZWFyXHJcbiAgICBzZWxlY3RlZEluZGljZXMuc3BsaWNlKDAsIHNlbGVjdGVkSW5kaWNlcy5sZW5ndGgpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmVvcmRlckNhcmRzKGdhbWVTdGF0ZTogTGliLkdhbWVTdGF0ZSkge1xyXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICBhZGRDYWxsYmFjaygncmVvcmRlckNhcmRzJywgcmVzb2x2ZSwgcmVqZWN0KTtcclxuICAgICAgICB3cy5zZW5kKEpTT04uc3RyaW5naWZ5KDxMaWIuUmVvcmRlckNhcmRzTWVzc2FnZT57XHJcbiAgICAgICAgICAgIHJlb3JkZXJlZENhcmRzOiBnYW1lU3RhdGUucGxheWVyQ2FyZHMsXHJcbiAgICAgICAgICAgIG5ld1JldmVhbENvdW50OiBnYW1lU3RhdGUucGxheWVyUmV2ZWFsQ291bnRcclxuICAgICAgICB9KSk7XHJcbiAgICB9KTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHNvcnRCeVN1aXQoZ2FtZVN0YXRlOiBMaWIuR2FtZVN0YXRlKSB7XHJcbiAgICBsZXQgY29tcGFyZUZuID0gKFthU3VpdCwgYVJhbmtdOiBMaWIuQ2FyZCwgW2JTdWl0LCBiUmFua106IExpYi5DYXJkKSA9PiB7XHJcbiAgICAgICAgaWYgKGFTdWl0ICE9PSBiU3VpdCkge1xyXG4gICAgICAgICAgICByZXR1cm4gYVN1aXQgLSBiU3VpdDtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICByZXR1cm4gYVJhbmsgLSBiUmFuaztcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIHByZXZpb3VzR2FtZVN0YXRlID0gPExpYi5HYW1lU3RhdGU+SlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShnYW1lU3RhdGUpKTtcclxuICAgIHNvcnRDYXJkcyhnYW1lU3RhdGUucGxheWVyQ2FyZHMsIDAsIGdhbWVTdGF0ZS5wbGF5ZXJSZXZlYWxDb3VudCwgY29tcGFyZUZuKTtcclxuICAgIHNvcnRDYXJkcyhnYW1lU3RhdGUucGxheWVyQ2FyZHMsIGdhbWVTdGF0ZS5wbGF5ZXJSZXZlYWxDb3VudCwgZ2FtZVN0YXRlLnBsYXllckNhcmRzLmxlbmd0aCwgY29tcGFyZUZuKTtcclxuICAgIGFzc29jaWF0ZUFuaW1hdGlvbnNXaXRoQ2FyZHMoZ2FtZVN0YXRlLCBwcmV2aW91c0dhbWVTdGF0ZSk7XHJcbiAgICByZXR1cm4gcmVvcmRlckNhcmRzKGdhbWVTdGF0ZSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzb3J0QnlSYW5rKGdhbWVTdGF0ZTogTGliLkdhbWVTdGF0ZSkge1xyXG4gICAgbGV0IGNvbXBhcmVGbiA9IChbYVN1aXQsIGFSYW5rXTogTGliLkNhcmQsIFtiU3VpdCwgYlJhbmtdOiBMaWIuQ2FyZCkgPT4ge1xyXG4gICAgICAgIGlmIChhUmFuayAhPT0gYlJhbmspIHtcclxuICAgICAgICAgICAgcmV0dXJuIGFSYW5rIC0gYlJhbms7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcmV0dXJuIGFTdWl0IC0gYlN1aXQ7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBwcmV2aW91c0dhbWVTdGF0ZSA9IDxMaWIuR2FtZVN0YXRlPkpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoZ2FtZVN0YXRlKSk7XHJcbiAgICBzb3J0Q2FyZHMoZ2FtZVN0YXRlLnBsYXllckNhcmRzLCAwLCBnYW1lU3RhdGUucGxheWVyUmV2ZWFsQ291bnQsIGNvbXBhcmVGbik7XHJcbiAgICBzb3J0Q2FyZHMoZ2FtZVN0YXRlLnBsYXllckNhcmRzLCBnYW1lU3RhdGUucGxheWVyUmV2ZWFsQ291bnQsIGdhbWVTdGF0ZS5wbGF5ZXJDYXJkcy5sZW5ndGgsIGNvbXBhcmVGbik7XHJcbiAgICBhc3NvY2lhdGVBbmltYXRpb25zV2l0aENhcmRzKGdhbWVTdGF0ZSwgcHJldmlvdXNHYW1lU3RhdGUpO1xyXG4gICAgcmV0dXJuIHJlb3JkZXJDYXJkcyhnYW1lU3RhdGUpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzb3J0Q2FyZHMoXHJcbiAgICBjYXJkczogTGliLkNhcmRbXSxcclxuICAgIHN0YXJ0OiBudW1iZXIsXHJcbiAgICBlbmQ6IG51bWJlcixcclxuICAgIGNvbXBhcmVGbjogKGE6IExpYi5DYXJkLCBiOiBMaWIuQ2FyZCkgPT4gbnVtYmVyXHJcbikge1xyXG4gICAgY2FyZHMuc3BsaWNlKHN0YXJ0LCBlbmQgLSBzdGFydCwgLi4uY2FyZHMuc2xpY2Uoc3RhcnQsIGVuZCkuc29ydChjb21wYXJlRm4pKTtcclxufVxyXG4iLCJleHBvcnQgZGVmYXVsdCBjbGFzcyBWZWN0b3Ige1xyXG4gICAgcmVhZG9ubHkgeDogbnVtYmVyID0gMDtcclxuICAgIHJlYWRvbmx5IHk6IG51bWJlciA9IDA7XHJcblxyXG4gICAgY29uc3RydWN0b3IoeDogbnVtYmVyLCB5OiBudW1iZXIpIHtcclxuICAgICAgICB0aGlzLnggPSB4O1xyXG4gICAgICAgIHRoaXMueSA9IHk7XHJcbiAgICB9XHJcblxyXG4gICAgLypcclxuICAgIGFzc2lnbih2OiBWZWN0b3IpIHtcclxuICAgICAgICB0aGlzLnggPSB2Lng7XHJcbiAgICAgICAgdGhpcy55ID0gdi55O1xyXG4gICAgfVxyXG4gICAgKi9cclxuXHJcbiAgICBhZGQodjogVmVjdG9yKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWN0b3IodGhpcy54ICsgdi54LCB0aGlzLnkgKyB2LnkpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qXHJcbiAgICBhZGRTZWxmKHY6IFZlY3Rvcikge1xyXG4gICAgICAgIHRoaXMueCArPSB2Lng7XHJcbiAgICAgICAgdGhpcy55ICs9IHYueTtcclxuICAgIH1cclxuICAgICovXHJcbiAgICBcclxuICAgIHN1Yih2OiBWZWN0b3IpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlY3Rvcih0aGlzLnggLSB2LngsIHRoaXMueSAtIHYueSk7XHJcbiAgICB9XHJcblxyXG4gICAgLypcclxuICAgIHN1YlNlbGYodjogVmVjdG9yKSB7XHJcbiAgICAgICAgdGhpcy54IC09IHYueDtcclxuICAgICAgICB0aGlzLnkgLT0gdi55O1xyXG4gICAgfVxyXG4gICAgKi9cclxuICAgIFxyXG4gICAgZ2V0IGxlbmd0aCgpIHtcclxuICAgICAgICByZXR1cm4gTWF0aC5zcXJ0KHRoaXMueCAqIHRoaXMueCArIHRoaXMueSAqIHRoaXMueSk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIGRpc3RhbmNlKHY6IFZlY3Rvcik6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuc3ViKHYpLmxlbmd0aDtcclxuICAgIH1cclxuICAgIFxyXG4gICAgc2NhbGUoczogbnVtYmVyKTogVmVjdG9yIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlY3RvcihzICogdGhpcy54LCBzICogdGhpcy55KTtcclxuICAgIH1cclxuXHJcbiAgICAvKlxyXG4gICAgc2NhbGVTZWxmKHM6IG51bWJlcikge1xyXG4gICAgICAgIHRoaXMueCAqPSBzO1xyXG4gICAgICAgIHRoaXMueSAqPSBzO1xyXG4gICAgfVxyXG4gICAgKi9cclxufSIsImltcG9ydCBWZWN0b3IgZnJvbSAnLi92ZWN0b3InO1xyXG5cclxuZXhwb3J0IGNvbnN0IGNhbnZhcyA9IDxIVE1MQ2FudmFzRWxlbWVudD5kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2FudmFzJyk7XHJcbmV4cG9ydCBjb25zdCBjb250ZXh0ID0gPENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRD5jYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcclxuXHJcbi8vIGdldCBwaXhlbHMgcGVyIGNlbnRpbWV0ZXIsIHdoaWNoIGlzIGNvbnN0YW50XHJcbmNvbnN0IHRlc3RFbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcbnRlc3RFbGVtZW50LnN0eWxlLndpZHRoID0gJzFjbSc7XHJcbmRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodGVzdEVsZW1lbnQpO1xyXG5leHBvcnQgY29uc3QgcGl4ZWxzUGVyQ00gPSB0ZXN0RWxlbWVudC5vZmZzZXRXaWR0aDtcclxuZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZCh0ZXN0RWxlbWVudCk7XHJcblxyXG4vLyB0aGVzZSBwYXJhbWV0ZXJzIGNoYW5nZSB3aXRoIHJlc2l6aW5nXHJcbmV4cG9ydCBsZXQgY2FudmFzUmVjdCA9IGNhbnZhcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuZXhwb3J0IGxldCBwaXhlbHNQZXJQZXJjZW50ID0gMDtcclxuXHJcbmV4cG9ydCBsZXQgc3ByaXRlV2lkdGg6IG51bWJlcjtcclxuZXhwb3J0IGxldCBzcHJpdGVIZWlnaHQ6IG51bWJlcjtcclxuZXhwb3J0IGxldCBzcHJpdGVHYXA6IG51bWJlcjtcclxuZXhwb3J0IGxldCBzcHJpdGVEZWNrR2FwOiBudW1iZXI7XHJcblxyXG5leHBvcnQgbGV0IHNvcnRCeVN1aXRCb3VuZHM6IFtWZWN0b3IsIFZlY3Rvcl07XHJcbmV4cG9ydCBsZXQgc29ydEJ5UmFua0JvdW5kczogW1ZlY3RvciwgVmVjdG9yXTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiByZWNhbGN1bGF0ZVBhcmFtZXRlcnMoKSB7XHJcbiAgICBjYW52YXMud2lkdGggPSB3aW5kb3cuaW5uZXJXaWR0aDtcclxuICAgIGNhbnZhcy5oZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQgLSAwLjUgKiBwaXhlbHNQZXJDTTtcclxuICAgIGNhbnZhc1JlY3QgPSBjYW52YXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcblxyXG4gICAgcGl4ZWxzUGVyUGVyY2VudCA9IGNhbnZhcy5oZWlnaHQgLyAxMDA7XHJcbiAgICBzcHJpdGVXaWR0aCA9IDEyICogcGl4ZWxzUGVyUGVyY2VudDtcclxuICAgIHNwcml0ZUhlaWdodCA9IDE4ICogcGl4ZWxzUGVyUGVyY2VudDtcclxuICAgIHNwcml0ZUdhcCA9IDIgKiBwaXhlbHNQZXJQZXJjZW50O1xyXG4gICAgc3ByaXRlRGVja0dhcCA9IDAuNSAqIHBpeGVsc1BlclBlcmNlbnQ7XHJcblxyXG4gICAgc29ydEJ5U3VpdEJvdW5kcyA9IFtcclxuICAgICAgICBuZXcgVmVjdG9yKGNhbnZhcy53aWR0aCAtIDIuNzUgKiBwaXhlbHNQZXJDTSwgY2FudmFzLmhlaWdodCAtIDMuNSAqIHBpeGVsc1BlckNNKSxcclxuICAgICAgICBuZXcgVmVjdG9yKGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodCAtIDIgKiBwaXhlbHNQZXJDTSlcclxuICAgIF07XHJcbiAgICBzb3J0QnlSYW5rQm91bmRzID0gW1xyXG4gICAgICAgIG5ldyBWZWN0b3IoY2FudmFzLndpZHRoIC0gMi43NSAqIHBpeGVsc1BlckNNLCBjYW52YXMuaGVpZ2h0IC0gMS43NSAqIHBpeGVsc1BlckNNKSxcclxuICAgICAgICBuZXcgVmVjdG9yKGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodCAtIDAuMjUgKiBwaXhlbHNQZXJDTSlcclxuICAgIF07XHJcbn1cclxuIiwiaW1wb3J0IGJpbmFyeVNlYXJjaCBmcm9tICdiaW5hcnktc2VhcmNoJztcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBiaW5hcnlTZWFyY2hOdW1iZXIoaGF5c3RhY2s6IG51bWJlcltdLCBuZWVkbGU6IG51bWJlciwgbG93PzogbnVtYmVyLCBoaWdoPzogbnVtYmVyKSB7XHJcbiAgICByZXR1cm4gYmluYXJ5U2VhcmNoKGhheXN0YWNrLCBuZWVkbGUsIChhLCBiKSA9PiBhIC0gYiwgbG93LCBoaWdoKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldENvb2tpZShuYW1lOiBzdHJpbmcpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xyXG4gICAgY29uc3QgcGFydHMgPSBgOyAke2RvY3VtZW50LmNvb2tpZX1gLnNwbGl0KGA7ICR7bmFtZX09YCk7XHJcbiAgICBpZiAocGFydHMubGVuZ3RoID09PSAyKSB7XHJcbiAgICAgICAgcmV0dXJuIHBhcnRzLnBvcCgpPy5zcGxpdCgnOycpLnNoaWZ0KCk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRQYXJhbShuYW1lOiBzdHJpbmcpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xyXG4gICAgcmV0dXJuIHdpbmRvdy5sb2NhdGlvbi5zZWFyY2guc3BsaXQoYCR7bmFtZX09YClbMV0/LnNwbGl0KFwiJlwiKVswXTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGRlbGF5KG1zOiBudW1iZXIpIHtcclxuICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgbXMpKTtcclxufVxyXG5cclxuZXhwb3J0IGVudW0gU3VpdCB7XHJcbiAgICBDbHViLCAvLyAwXHJcbiAgICBEaWFtb25kLFxyXG4gICAgSGVhcnQsXHJcbiAgICBTcGFkZSxcclxuICAgIEpva2VyLCAvLyA0XHJcbn1cclxuXHJcbmV4cG9ydCBlbnVtIFJhbmsge1xyXG4gICAgU21hbGwsIC8vIDBcclxuICAgIEFjZSxcclxuICAgIFR3byxcclxuICAgIFRocmVlLFxyXG4gICAgRm91cixcclxuICAgIEZpdmUsXHJcbiAgICBTaXgsXHJcbiAgICBTZXZlbixcclxuICAgIEVpZ2h0LFxyXG4gICAgTmluZSxcclxuICAgIFRlbixcclxuICAgIEphY2ssXHJcbiAgICBRdWVlbixcclxuICAgIEtpbmcsXHJcbiAgICBCaWcsIC8vIDE0XHJcbn1cclxuXHJcbmV4cG9ydCB0eXBlIENhcmQgPSBbU3VpdCwgUmFua107XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIE90aGVyUGxheWVyIHtcclxuICAgIG5hbWU6IHN0cmluZztcclxuICAgIGNhcmRDb3VudDogbnVtYmVyO1xyXG4gICAgcmV2ZWFsZWRDYXJkczogQ2FyZFtdO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEdhbWVTdGF0ZSB7XHJcbiAgICBkZWNrQ291bnQ6IG51bWJlcjtcclxuICAgIGFjdGl2ZVBsYXllckluZGV4OiBudW1iZXI7XHJcbiAgICBwbGF5ZXJJbmRleDogbnVtYmVyO1xyXG4gICAgcGxheWVyQ2FyZHM6IENhcmRbXTtcclxuICAgIHBsYXllclJldmVhbENvdW50OiBudW1iZXI7XHJcbiAgICBvdGhlclBsYXllcnM6IE90aGVyUGxheWVyW107XHJcbn1cclxuXHJcbmV4cG9ydCB0eXBlIE1ldGhvZE5hbWUgPSBcImpvaW5HYW1lXCIgfCBcImRyYXdDYXJkXCIgfCBcInJldHVybkNhcmRzVG9EZWNrXCIgfCBcInJlb3JkZXJDYXJkc1wiO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBNZXRob2RSZXN1bHQge1xyXG4gICAgbWV0aG9kTmFtZTogTWV0aG9kTmFtZTtcclxuICAgIGVycm9yRGVzY3JpcHRpb24/OiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSm9pbkdhbWVNZXNzYWdlIHtcclxuICAgIGdhbWVJZDogc3RyaW5nO1xyXG4gICAgcGxheWVyTmFtZTogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIERyYXdDYXJkTWVzc2FnZSB7XHJcbiAgICBkcmF3Q2FyZDogbnVsbDtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBSZXR1cm5DYXJkc1RvRGVja01lc3NhZ2Uge1xyXG4gICAgY2FyZHNUb1JldHVyblRvRGVjazogQ2FyZFtdO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFJlb3JkZXJDYXJkc01lc3NhZ2Uge1xyXG4gICAgcmVvcmRlcmVkQ2FyZHM6IENhcmRbXTtcclxuICAgIG5ld1JldmVhbENvdW50OiBudW1iZXI7XHJcbn0iXX0=
