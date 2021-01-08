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
async function init() {
    VP.recalculateParameters();
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
}
window.onresize = init;
window.onscroll = init;
window.game = async function game() {
    const joinPromise = State.joinGame(State.gameId, State.playerName);
    await CardImages.load(); // concurrently
    await joinPromise;
    // rendering must be synchronous, or else it flickers
    window.requestAnimationFrame(Render.render);
    await init();
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYXdhaXQtc2VtYXBob3JlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2JpbmFyeS1zZWFyY2gvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL3RpbWVycy1icm93c2VyaWZ5L21haW4uanMiLCJzcmMvY2xpZW50L2NhcmQtaW1hZ2VzLnRzIiwic3JjL2NsaWVudC9nYW1lLnRzIiwic3JjL2NsaWVudC9pbnB1dC50cyIsInNyYy9jbGllbnQvbG9iYnkudHMiLCJzcmMvY2xpZW50L3JlbmRlci50cyIsInNyYy9jbGllbnQvc3ByaXRlLnRzIiwic3JjL2NsaWVudC9zdGF0ZS50cyIsInNyYy9jbGllbnQvdmVjdG9yLnRzIiwic3JjL2NsaWVudC92aWV3LXBhcmFtcy50cyIsInNyYy9saWIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUN4TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FDM0VBLDRDQUE4QjtBQUU5QixNQUFNLEtBQUssR0FBRyxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQztBQUM5RCxNQUFNLEtBQUssR0FBRyxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFFakcsTUFBTSxVQUFVLEdBQUcsSUFBSSxHQUFHLEVBQTRCLENBQUM7QUFFaEQsS0FBSyxVQUFVLElBQUk7SUFDdEIsa0NBQWtDO0lBQ2xDLEtB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QztBQUVELFNBQWdCLEtBQUssQ0FBQyxFQUFVO0lBQzVCLE9BQU8sSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDM0QsQ0FBQztBQUZELHNCQUVDO0FBRUQsSUFBWSxJQU1YO0FBTkQsV0FBWSxJQUFJO0lBQ1osK0JBQUksQ0FBQTtJQUNKLHFDQUFPLENBQUE7SUFDUCxpQ0FBSyxDQUFBO0lBQ0wsaUNBQUssQ0FBQTtJQUNMLGlDQUFLLENBQUE7QUFDVCxDQUFDLEVBTlcsSUFBSSxHQUFKLFlBQUksS0FBSixZQUFJLFFBTWY7QUFFRCxJQUFZLElBZ0JYO0FBaEJELFdBQVksSUFBSTtJQUNaLGlDQUFLLENBQUE7SUFDTCw2QkFBRyxDQUFBO0lBQ0gsNkJBQUcsQ0FBQTtJQUNILGlDQUFLLENBQUE7SUFDTCwrQkFBSSxDQUFBO0lBQ0osK0JBQUksQ0FBQTtJQUNKLDZCQUFHLENBQUE7SUFDSCxpQ0FBSyxDQUFBO0lBQ0wsaUNBQUssQ0FBQTtJQUNMLCtCQUFJLENBQUE7SUFDSiw4QkFBRyxDQUFBO0lBQ0gsZ0NBQUksQ0FBQTtJQUNKLGtDQUFLLENBQUE7SUFDTCxnQ0FBSSxDQUFBO0lBQ0osOEJBQUcsQ0FBQTtBQUNQLENBQUMsRUFoQlcsSUFBSSxHQUFKLFlBQUksS0FBSixZQUFJLFFBZ0JmIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiXCJ1c2Ugc3RyaWN0XCI7XG5jbGFzcyBTZW1hcGhvcmUge1xuICAgIGNvbnN0cnVjdG9yKGNvdW50KSB7XG4gICAgICAgIHRoaXMudGFza3MgPSBbXTtcbiAgICAgICAgdGhpcy5jb3VudCA9IGNvdW50O1xuICAgIH1cbiAgICBzY2hlZCgpIHtcbiAgICAgICAgaWYgKHRoaXMuY291bnQgPiAwICYmIHRoaXMudGFza3MubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgdGhpcy5jb3VudC0tO1xuICAgICAgICAgICAgbGV0IG5leHQgPSB0aGlzLnRhc2tzLnNoaWZ0KCk7XG4gICAgICAgICAgICBpZiAobmV4dCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgXCJVbmV4cGVjdGVkIHVuZGVmaW5lZCB2YWx1ZSBpbiB0YXNrcyBsaXN0XCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgYWNxdWlyZSgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXMsIHJlaikgPT4ge1xuICAgICAgICAgICAgdmFyIHRhc2sgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgdmFyIHJlbGVhc2VkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgcmVzKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFyZWxlYXNlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVsZWFzZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb3VudCsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zY2hlZCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdGhpcy50YXNrcy5wdXNoKHRhc2spO1xuICAgICAgICAgICAgaWYgKHByb2Nlc3MgJiYgcHJvY2Vzcy5uZXh0VGljaykge1xuICAgICAgICAgICAgICAgIHByb2Nlc3MubmV4dFRpY2sodGhpcy5zY2hlZC5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHNldEltbWVkaWF0ZSh0aGlzLnNjaGVkLmJpbmQodGhpcykpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgdXNlKGYpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYWNxdWlyZSgpXG4gICAgICAgICAgICAudGhlbihyZWxlYXNlID0+IHtcbiAgICAgICAgICAgIHJldHVybiBmKClcbiAgICAgICAgICAgICAgICAudGhlbigocmVzKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVsZWFzZSgpO1xuICAgICAgICAgICAgICAgIHJldHVybiByZXM7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVsZWFzZSgpO1xuICAgICAgICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG59XG5leHBvcnRzLlNlbWFwaG9yZSA9IFNlbWFwaG9yZTtcbmNsYXNzIE11dGV4IGV4dGVuZHMgU2VtYXBob3JlIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoMSk7XG4gICAgfVxufVxuZXhwb3J0cy5NdXRleCA9IE11dGV4O1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9aW5kZXguanMubWFwIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihoYXlzdGFjaywgbmVlZGxlLCBjb21wYXJhdG9yLCBsb3csIGhpZ2gpIHtcbiAgdmFyIG1pZCwgY21wO1xuXG4gIGlmKGxvdyA9PT0gdW5kZWZpbmVkKVxuICAgIGxvdyA9IDA7XG5cbiAgZWxzZSB7XG4gICAgbG93ID0gbG93fDA7XG4gICAgaWYobG93IDwgMCB8fCBsb3cgPj0gaGF5c3RhY2subGVuZ3RoKVxuICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoXCJpbnZhbGlkIGxvd2VyIGJvdW5kXCIpO1xuICB9XG5cbiAgaWYoaGlnaCA9PT0gdW5kZWZpbmVkKVxuICAgIGhpZ2ggPSBoYXlzdGFjay5sZW5ndGggLSAxO1xuXG4gIGVsc2Uge1xuICAgIGhpZ2ggPSBoaWdofDA7XG4gICAgaWYoaGlnaCA8IGxvdyB8fCBoaWdoID49IGhheXN0YWNrLmxlbmd0aClcbiAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKFwiaW52YWxpZCB1cHBlciBib3VuZFwiKTtcbiAgfVxuXG4gIHdoaWxlKGxvdyA8PSBoaWdoKSB7XG4gICAgLy8gVGhlIG5haXZlIGBsb3cgKyBoaWdoID4+PiAxYCBjb3VsZCBmYWlsIGZvciBhcnJheSBsZW5ndGhzID4gMioqMzFcbiAgICAvLyBiZWNhdXNlIGA+Pj5gIGNvbnZlcnRzIGl0cyBvcGVyYW5kcyB0byBpbnQzMi4gYGxvdyArIChoaWdoIC0gbG93ID4+PiAxKWBcbiAgICAvLyB3b3JrcyBmb3IgYXJyYXkgbGVuZ3RocyA8PSAyKiozMi0xIHdoaWNoIGlzIGFsc28gSmF2YXNjcmlwdCdzIG1heCBhcnJheVxuICAgIC8vIGxlbmd0aC5cbiAgICBtaWQgPSBsb3cgKyAoKGhpZ2ggLSBsb3cpID4+PiAxKTtcbiAgICBjbXAgPSArY29tcGFyYXRvcihoYXlzdGFja1ttaWRdLCBuZWVkbGUsIG1pZCwgaGF5c3RhY2spO1xuXG4gICAgLy8gVG9vIGxvdy5cbiAgICBpZihjbXAgPCAwLjApXG4gICAgICBsb3cgID0gbWlkICsgMTtcblxuICAgIC8vIFRvbyBoaWdoLlxuICAgIGVsc2UgaWYoY21wID4gMC4wKVxuICAgICAgaGlnaCA9IG1pZCAtIDE7XG5cbiAgICAvLyBLZXkgZm91bmQuXG4gICAgZWxzZVxuICAgICAgcmV0dXJuIG1pZDtcbiAgfVxuXG4gIC8vIEtleSBub3QgZm91bmQuXG4gIHJldHVybiB+bG93O1xufVxuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbi8vIGNhY2hlZCBmcm9tIHdoYXRldmVyIGdsb2JhbCBpcyBwcmVzZW50IHNvIHRoYXQgdGVzdCBydW5uZXJzIHRoYXQgc3R1YiBpdFxuLy8gZG9uJ3QgYnJlYWsgdGhpbmdzLiAgQnV0IHdlIG5lZWQgdG8gd3JhcCBpdCBpbiBhIHRyeSBjYXRjaCBpbiBjYXNlIGl0IGlzXG4vLyB3cmFwcGVkIGluIHN0cmljdCBtb2RlIGNvZGUgd2hpY2ggZG9lc24ndCBkZWZpbmUgYW55IGdsb2JhbHMuICBJdCdzIGluc2lkZSBhXG4vLyBmdW5jdGlvbiBiZWNhdXNlIHRyeS9jYXRjaGVzIGRlb3B0aW1pemUgaW4gY2VydGFpbiBlbmdpbmVzLlxuXG52YXIgY2FjaGVkU2V0VGltZW91dDtcbnZhciBjYWNoZWRDbGVhclRpbWVvdXQ7XG5cbmZ1bmN0aW9uIGRlZmF1bHRTZXRUaW1vdXQoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdzZXRUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG5mdW5jdGlvbiBkZWZhdWx0Q2xlYXJUaW1lb3V0ICgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2NsZWFyVGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuKGZ1bmN0aW9uICgpIHtcbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIHNldFRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIGNsZWFyVGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICB9XG59ICgpKVxuZnVuY3Rpb24gcnVuVGltZW91dChmdW4pIHtcbiAgICBpZiAoY2FjaGVkU2V0VGltZW91dCA9PT0gc2V0VGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgLy8gaWYgc2V0VGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZFNldFRpbWVvdXQgPT09IGRlZmF1bHRTZXRUaW1vdXQgfHwgIWNhY2hlZFNldFRpbWVvdXQpICYmIHNldFRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9IGNhdGNoKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0IHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKG51bGwsIGZ1biwgMCk7XG4gICAgICAgIH0gY2F0Y2goZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvclxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbCh0aGlzLCBmdW4sIDApO1xuICAgICAgICB9XG4gICAgfVxuXG5cbn1cbmZ1bmN0aW9uIHJ1bkNsZWFyVGltZW91dChtYXJrZXIpIHtcbiAgICBpZiAoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgLy8gaWYgY2xlYXJUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBkZWZhdWx0Q2xlYXJUaW1lb3V0IHx8ICFjYWNoZWRDbGVhclRpbWVvdXQpICYmIGNsZWFyVGltZW91dCkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfSBjYXRjaCAoZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgIHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwobnVsbCwgbWFya2VyKTtcbiAgICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvci5cbiAgICAgICAgICAgIC8vIFNvbWUgdmVyc2lvbnMgb2YgSS5FLiBoYXZlIGRpZmZlcmVudCBydWxlcyBmb3IgY2xlYXJUaW1lb3V0IHZzIHNldFRpbWVvdXRcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbCh0aGlzLCBtYXJrZXIpO1xuICAgICAgICB9XG4gICAgfVxuXG5cblxufVxudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcbnZhciBjdXJyZW50UXVldWU7XG52YXIgcXVldWVJbmRleCA9IC0xO1xuXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XG4gICAgaWYgKCFkcmFpbmluZyB8fCAhY3VycmVudFF1ZXVlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICB9XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBkcmFpblF1ZXVlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0ID0gcnVuVGltZW91dChjbGVhblVwTmV4dFRpY2spO1xuICAgIGRyYWluaW5nID0gdHJ1ZTtcblxuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICBpZiAoY3VycmVudFF1ZXVlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFF1ZXVlW3F1ZXVlSW5kZXhdLnJ1bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBjdXJyZW50UXVldWUgPSBudWxsO1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgcnVuQ2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xufVxuXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLnB1c2gobmV3IEl0ZW0oZnVuLCBhcmdzKSk7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcbiAgICAgICAgcnVuVGltZW91dChkcmFpblF1ZXVlKTtcbiAgICB9XG59O1xuXG4vLyB2OCBsaWtlcyBwcmVkaWN0aWJsZSBvYmplY3RzXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcbiAgICB0aGlzLmZ1biA9IGZ1bjtcbiAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG59XG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5mdW4uYXBwbHkobnVsbCwgdGhpcy5hcnJheSk7XG59O1xucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xucHJvY2Vzcy5wcmVwZW5kTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5wcmVwZW5kT25jZUxpc3RlbmVyID0gbm9vcDtcblxucHJvY2Vzcy5saXN0ZW5lcnMgPSBmdW5jdGlvbiAobmFtZSkgeyByZXR1cm4gW10gfVxuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiIsInZhciBuZXh0VGljayA9IHJlcXVpcmUoJ3Byb2Nlc3MvYnJvd3Nlci5qcycpLm5leHRUaWNrO1xudmFyIGFwcGx5ID0gRnVuY3Rpb24ucHJvdG90eXBlLmFwcGx5O1xudmFyIHNsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlO1xudmFyIGltbWVkaWF0ZUlkcyA9IHt9O1xudmFyIG5leHRJbW1lZGlhdGVJZCA9IDA7XG5cbi8vIERPTSBBUElzLCBmb3IgY29tcGxldGVuZXNzXG5cbmV4cG9ydHMuc2V0VGltZW91dCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gbmV3IFRpbWVvdXQoYXBwbHkuY2FsbChzZXRUaW1lb3V0LCB3aW5kb3csIGFyZ3VtZW50cyksIGNsZWFyVGltZW91dCk7XG59O1xuZXhwb3J0cy5zZXRJbnRlcnZhbCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gbmV3IFRpbWVvdXQoYXBwbHkuY2FsbChzZXRJbnRlcnZhbCwgd2luZG93LCBhcmd1bWVudHMpLCBjbGVhckludGVydmFsKTtcbn07XG5leHBvcnRzLmNsZWFyVGltZW91dCA9XG5leHBvcnRzLmNsZWFySW50ZXJ2YWwgPSBmdW5jdGlvbih0aW1lb3V0KSB7IHRpbWVvdXQuY2xvc2UoKTsgfTtcblxuZnVuY3Rpb24gVGltZW91dChpZCwgY2xlYXJGbikge1xuICB0aGlzLl9pZCA9IGlkO1xuICB0aGlzLl9jbGVhckZuID0gY2xlYXJGbjtcbn1cblRpbWVvdXQucHJvdG90eXBlLnVucmVmID0gVGltZW91dC5wcm90b3R5cGUucmVmID0gZnVuY3Rpb24oKSB7fTtcblRpbWVvdXQucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuX2NsZWFyRm4uY2FsbCh3aW5kb3csIHRoaXMuX2lkKTtcbn07XG5cbi8vIERvZXMgbm90IHN0YXJ0IHRoZSB0aW1lLCBqdXN0IHNldHMgdXAgdGhlIG1lbWJlcnMgbmVlZGVkLlxuZXhwb3J0cy5lbnJvbGwgPSBmdW5jdGlvbihpdGVtLCBtc2Vjcykge1xuICBjbGVhclRpbWVvdXQoaXRlbS5faWRsZVRpbWVvdXRJZCk7XG4gIGl0ZW0uX2lkbGVUaW1lb3V0ID0gbXNlY3M7XG59O1xuXG5leHBvcnRzLnVuZW5yb2xsID0gZnVuY3Rpb24oaXRlbSkge1xuICBjbGVhclRpbWVvdXQoaXRlbS5faWRsZVRpbWVvdXRJZCk7XG4gIGl0ZW0uX2lkbGVUaW1lb3V0ID0gLTE7XG59O1xuXG5leHBvcnRzLl91bnJlZkFjdGl2ZSA9IGV4cG9ydHMuYWN0aXZlID0gZnVuY3Rpb24oaXRlbSkge1xuICBjbGVhclRpbWVvdXQoaXRlbS5faWRsZVRpbWVvdXRJZCk7XG5cbiAgdmFyIG1zZWNzID0gaXRlbS5faWRsZVRpbWVvdXQ7XG4gIGlmIChtc2VjcyA+PSAwKSB7XG4gICAgaXRlbS5faWRsZVRpbWVvdXRJZCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gb25UaW1lb3V0KCkge1xuICAgICAgaWYgKGl0ZW0uX29uVGltZW91dClcbiAgICAgICAgaXRlbS5fb25UaW1lb3V0KCk7XG4gICAgfSwgbXNlY3MpO1xuICB9XG59O1xuXG4vLyBUaGF0J3Mgbm90IGhvdyBub2RlLmpzIGltcGxlbWVudHMgaXQgYnV0IHRoZSBleHBvc2VkIGFwaSBpcyB0aGUgc2FtZS5cbmV4cG9ydHMuc2V0SW1tZWRpYXRlID0gdHlwZW9mIHNldEltbWVkaWF0ZSA9PT0gXCJmdW5jdGlvblwiID8gc2V0SW1tZWRpYXRlIDogZnVuY3Rpb24oZm4pIHtcbiAgdmFyIGlkID0gbmV4dEltbWVkaWF0ZUlkKys7XG4gIHZhciBhcmdzID0gYXJndW1lbnRzLmxlbmd0aCA8IDIgPyBmYWxzZSA6IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcblxuICBpbW1lZGlhdGVJZHNbaWRdID0gdHJ1ZTtcblxuICBuZXh0VGljayhmdW5jdGlvbiBvbk5leHRUaWNrKCkge1xuICAgIGlmIChpbW1lZGlhdGVJZHNbaWRdKSB7XG4gICAgICAvLyBmbi5jYWxsKCkgaXMgZmFzdGVyIHNvIHdlIG9wdGltaXplIGZvciB0aGUgY29tbW9uIHVzZS1jYXNlXG4gICAgICAvLyBAc2VlIGh0dHA6Ly9qc3BlcmYuY29tL2NhbGwtYXBwbHktc2VndVxuICAgICAgaWYgKGFyZ3MpIHtcbiAgICAgICAgZm4uYXBwbHkobnVsbCwgYXJncyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmbi5jYWxsKG51bGwpO1xuICAgICAgfVxuICAgICAgLy8gUHJldmVudCBpZHMgZnJvbSBsZWFraW5nXG4gICAgICBleHBvcnRzLmNsZWFySW1tZWRpYXRlKGlkKTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiBpZDtcbn07XG5cbmV4cG9ydHMuY2xlYXJJbW1lZGlhdGUgPSB0eXBlb2YgY2xlYXJJbW1lZGlhdGUgPT09IFwiZnVuY3Rpb25cIiA/IGNsZWFySW1tZWRpYXRlIDogZnVuY3Rpb24oaWQpIHtcbiAgZGVsZXRlIGltbWVkaWF0ZUlkc1tpZF07XG59OyIsImltcG9ydCAqIGFzIExpYiBmcm9tICcuLi9saWInO1xyXG5cclxuY29uc3Qgc3VpdHMgPSBbJ0NsdWJzJywgJ0RtbmRzJywgJ0hlYXJ0cycsICdTcGFkZXMnLCAnSm9rZXInXTtcclxuY29uc3QgcmFua3MgPSBbJ1NtYWxsJywgJ0EnLCAnMicsICczJywgJzQnLCAnNScsICc2JywgJzcnLCAnOCcsICc5JywgJzEwJywgJ0onLCAnUScsICdLJywgJ0JpZyddO1xyXG5cclxuY29uc3QgY2FyZEltYWdlcyA9IG5ldyBNYXA8c3RyaW5nLCBIVE1MSW1hZ2VFbGVtZW50PigpO1xyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxvYWQoKSB7XHJcbiAgICAvLyBsb2FkIGNhcmQgaW1hZ2VzIGFzeW5jaHJvbm91c2x5XHJcbiAgICBmb3IgKGxldCBzdWl0ID0gMDsgc3VpdCA8PSA0OyArK3N1aXQpIHtcclxuICAgICAgICBmb3IgKGxldCByYW5rID0gMDsgcmFuayA8PSAxNDsgKytyYW5rKSB7XHJcbiAgICAgICAgICAgIGlmIChzdWl0ID09PSBMaWIuU3VpdC5Kb2tlcikge1xyXG4gICAgICAgICAgICAgICAgaWYgKDAgPCByYW5rICYmIHJhbmsgPCAxNCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgaWYgKHJhbmsgPCAxIHx8IDEzIDwgcmFuaykge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBpbWFnZSA9IG5ldyBJbWFnZSgpO1xyXG4gICAgICAgICAgICBpbWFnZS5zcmMgPSBgUGFwZXJDYXJkcy8ke3N1aXRzW3N1aXRdfS8ke3JhbmtzW3JhbmtdfW9mJHtzdWl0c1tzdWl0XX0ucG5nYDtcclxuICAgICAgICAgICAgaW1hZ2Uub25sb2FkID0gKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYGxvYWRlZCAnJHtpbWFnZS5zcmN9J2ApO1xyXG4gICAgICAgICAgICAgICAgY2FyZEltYWdlcy5zZXQoSlNPTi5zdHJpbmdpZnkoW3N1aXQsIHJhbmtdKSwgaW1hZ2UpO1xyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDQ7ICsraSkge1xyXG4gICAgICAgIGNvbnN0IGltYWdlID0gbmV3IEltYWdlKCk7XHJcbiAgICAgICAgaW1hZ2Uuc3JjID0gYFBhcGVyQ2FyZHMvQ2FyZEJhY2ske2l9LnBuZ2A7XHJcbiAgICAgICAgaW1hZ2Uub25sb2FkID0gKCkgPT4ge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgbG9hZGVkICcke2ltYWdlLnNyY30nYCk7XHJcbiAgICAgICAgICAgIGNhcmRJbWFnZXMuc2V0KGBCYWNrJHtpfWAsIGltYWdlKTtcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGJsYW5rSW1hZ2UgPSBuZXcgSW1hZ2UoKTtcclxuICAgIGJsYW5rSW1hZ2Uuc3JjID0gJ1BhcGVyQ2FyZHMvQmxhbmsgQ2FyZC5wbmcnO1xyXG4gICAgYmxhbmtJbWFnZS5vbmxvYWQgPSAoKSA9PiB7XHJcbiAgICAgICAgY29uc29sZS5sb2coYGxvYWRlZCAnJHtibGFua0ltYWdlLnNyY30nYCk7XHJcbiAgICAgICAgY2FyZEltYWdlcy5zZXQoJ0JsYW5rJywgYmxhbmtJbWFnZSk7XHJcbiAgICB9O1xyXG5cclxuICAgIHdoaWxlIChjYXJkSW1hZ2VzLnNpemUgPCA0ICogMTMgKyA3KSB7XHJcbiAgICAgICAgYXdhaXQgTGliLmRlbGF5KDEwKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zb2xlLmxvZygnYWxsIGNhcmQgaW1hZ2VzIGxvYWRlZCcpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0KHN0cmluZ0Zyb21DYXJkOiBzdHJpbmcpOiBIVE1MSW1hZ2VFbGVtZW50IHtcclxuICAgIGNvbnN0IGltYWdlID0gY2FyZEltYWdlcy5nZXQoc3RyaW5nRnJvbUNhcmQpO1xyXG4gICAgaWYgKGltYWdlID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGNvdWxkbid0IGZpbmQgaW1hZ2U6ICR7c3RyaW5nRnJvbUNhcmR9YCk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGltYWdlO1xyXG59XHJcbiIsImltcG9ydCAqIGFzIExpYiBmcm9tICcuLi9saWInO1xyXG5pbXBvcnQgKiBhcyBTdGF0ZSBmcm9tICcuL3N0YXRlJztcclxuaW1wb3J0ICogYXMgVlAgZnJvbSAnLi92aWV3LXBhcmFtcyc7XHJcbmltcG9ydCAqIGFzIENhcmRJbWFnZXMgZnJvbSAnLi9jYXJkLWltYWdlcyc7XHJcbmltcG9ydCAqIGFzIFJlbmRlciBmcm9tICcuL3JlbmRlcic7XHJcblxyXG4vLyByZWZyZXNoaW5nIHNob3VsZCByZWpvaW4gdGhlIHNhbWUgZ2FtZVxyXG53aW5kb3cuaGlzdG9yeS5wdXNoU3RhdGUodW5kZWZpbmVkLCBTdGF0ZS5nYW1lSWQsIGAvZ2FtZT9nYW1lSWQ9JHtTdGF0ZS5nYW1lSWR9JnBsYXllck5hbWU9JHtTdGF0ZS5wbGF5ZXJOYW1lfWApO1xyXG5cclxuYXN5bmMgZnVuY3Rpb24gaW5pdCgpIHtcclxuICAgIFZQLnJlY2FsY3VsYXRlUGFyYW1ldGVycygpO1xyXG5cclxuICAgIC8vIGluaXRpYWxpemUgaW5wdXRcclxuICAgIHdoaWxlIChTdGF0ZS5nYW1lU3RhdGUgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIGF3YWl0IExpYi5kZWxheSgxMDApO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHVubG9jayA9IGF3YWl0IFN0YXRlLmxvY2soKTtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgU3RhdGUuc2V0U3ByaXRlVGFyZ2V0cyhTdGF0ZS5nYW1lU3RhdGUpO1xyXG4gICAgfSBmaW5hbGx5IHtcclxuICAgICAgICB1bmxvY2soKTtcclxuICAgIH1cclxufVxyXG5cclxud2luZG93Lm9ucmVzaXplID0gaW5pdDtcclxuXHJcbndpbmRvdy5vbnNjcm9sbCA9IGluaXQ7XHJcblxyXG4oPGFueT53aW5kb3cpLmdhbWUgPSBhc3luYyBmdW5jdGlvbiBnYW1lKCkge1xyXG4gICAgY29uc3Qgam9pblByb21pc2UgPSBTdGF0ZS5qb2luR2FtZShTdGF0ZS5nYW1lSWQsIFN0YXRlLnBsYXllck5hbWUpO1xyXG4gICAgYXdhaXQgQ2FyZEltYWdlcy5sb2FkKCk7IC8vIGNvbmN1cnJlbnRseVxyXG4gICAgYXdhaXQgam9pblByb21pc2U7XHJcbiAgICBcclxuICAgIC8vIHJlbmRlcmluZyBtdXN0IGJlIHN5bmNocm9ub3VzLCBvciBlbHNlIGl0IGZsaWNrZXJzXHJcbiAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKFJlbmRlci5yZW5kZXIpO1xyXG5cclxuICAgIGF3YWl0IGluaXQoKTtcclxufTsiLCJpbXBvcnQgKiBhcyBMaWIgZnJvbSAnLi4vbGliJztcclxuaW1wb3J0ICogYXMgU3RhdGUgZnJvbSAnLi9zdGF0ZSc7XHJcbmltcG9ydCAqIGFzIFZQIGZyb20gJy4vdmlldy1wYXJhbXMnO1xyXG5pbXBvcnQgVmVjdG9yIGZyb20gJy4vdmVjdG9yJztcclxuaW1wb3J0IFNwcml0ZSBmcm9tICcuL3Nwcml0ZSc7XHJcblxyXG5pbnRlcmZhY2UgRHJhd0Zyb21EZWNrIHtcclxuICAgIHR5cGU6IFwiRHJhd0Zyb21EZWNrXCI7XHJcbiAgICBtb3VzZVBvc2l0aW9uVG9TcHJpdGVQb3NpdGlvbjogVmVjdG9yO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgV2FpdGluZ0Zvck5ld0NhcmQge1xyXG4gICAgdHlwZTogXCJXYWl0aW5nRm9yTmV3Q2FyZFwiO1xyXG4gICAgbW91c2VQb3NpdGlvblRvU3ByaXRlUG9zaXRpb246IFZlY3RvcjtcclxufVxyXG5cclxuaW50ZXJmYWNlIFJldHVyblRvRGVjayB7XHJcbiAgICB0eXBlOiBcIlJldHVyblRvRGVja1wiO1xyXG4gICAgY2FyZEluZGV4OiBudW1iZXI7XHJcbiAgICBtb3VzZVBvc2l0aW9uVG9TcHJpdGVQb3NpdGlvbjogVmVjdG9yO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgUmVvcmRlciB7XHJcbiAgICB0eXBlOiBcIlJlb3JkZXJcIjtcclxuICAgIGNhcmRJbmRleDogbnVtYmVyO1xyXG4gICAgbW91c2VQb3NpdGlvblRvU3ByaXRlUG9zaXRpb246IFZlY3RvcjtcclxufVxyXG5cclxuaW50ZXJmYWNlIENvbnRyb2xTaGlmdENsaWNrIHtcclxuICAgIHR5cGU6IFwiQ29udHJvbFNoaWZ0Q2xpY2tcIjtcclxuICAgIGNhcmRJbmRleDogbnVtYmVyO1xyXG4gICAgbW91c2VQb3NpdGlvblRvU3ByaXRlUG9zaXRpb246IFZlY3RvcjtcclxufVxyXG5cclxuaW50ZXJmYWNlIENvbnRyb2xDbGljayB7XHJcbiAgICB0eXBlOiBcIkNvbnRyb2xDbGlja1wiO1xyXG4gICAgY2FyZEluZGV4OiBudW1iZXI7XHJcbiAgICBtb3VzZVBvc2l0aW9uVG9TcHJpdGVQb3NpdGlvbjogVmVjdG9yO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgU2hpZnRDbGljayB7XHJcbiAgICB0eXBlOiBcIlNoaWZ0Q2xpY2tcIjtcclxuICAgIGNhcmRJbmRleDogbnVtYmVyO1xyXG4gICAgbW91c2VQb3NpdGlvblRvU3ByaXRlUG9zaXRpb246IFZlY3RvcjtcclxufVxyXG5cclxuaW50ZXJmYWNlIENsaWNrIHtcclxuICAgIHR5cGU6IFwiQ2xpY2tcIjtcclxuICAgIGNhcmRJbmRleDogbnVtYmVyO1xyXG4gICAgbW91c2VQb3NpdGlvblRvU3ByaXRlUG9zaXRpb246IFZlY3RvcjtcclxufVxyXG5cclxuZXhwb3J0IHR5cGUgQWN0aW9uID1cclxuICAgIFwiTm9uZVwiIHxcclxuICAgIFwiU29ydEJ5U3VpdFwiIHxcclxuICAgIFwiU29ydEJ5UmFua1wiIHxcclxuICAgIFwiRGVzZWxlY3RcIiB8XHJcbiAgICBEcmF3RnJvbURlY2sgfFxyXG4gICAgV2FpdGluZ0Zvck5ld0NhcmQgfFxyXG4gICAgUmV0dXJuVG9EZWNrIHxcclxuICAgIFJlb3JkZXIgfFxyXG4gICAgQ29udHJvbFNoaWZ0Q2xpY2sgfFxyXG4gICAgQ29udHJvbENsaWNrIHxcclxuICAgIFNoaWZ0Q2xpY2sgfFxyXG4gICAgQ2xpY2s7XHJcblxyXG5jb25zdCBkb3VibGVDbGlja1RocmVzaG9sZCA9IDUwMDsgLy8gbWlsbGlzZWNvbmRzXHJcbmNvbnN0IG1vdmVUaHJlc2hvbGQgPSAwLjUgKiBWUC5waXhlbHNQZXJDTTtcclxuXHJcbmV4cG9ydCBsZXQgYWN0aW9uOiBBY3Rpb24gPSBcIk5vbmVcIjtcclxuXHJcbmxldCBwcmV2aW91c0NsaWNrVGltZSA9IC0xO1xyXG5sZXQgcHJldmlvdXNDbGlja0luZGV4ID0gLTE7XHJcbmxldCBtb3VzZURvd25Qb3NpdGlvbiA9IDxWZWN0b3I+eyB4OiAwLCB5OiAwIH07XHJcbmxldCBtb3VzZU1vdmVQb3NpdGlvbiA9IDxWZWN0b3I+eyB4OiAwLCB5OiAwIH07XHJcbmxldCBleGNlZWRlZERyYWdUaHJlc2hvbGQgPSBmYWxzZTtcclxuXHJcbmxldCBob2xkaW5nQ29udHJvbCA9IGZhbHNlO1xyXG5sZXQgaG9sZGluZ1NoaWZ0ID0gZmFsc2U7XHJcbndpbmRvdy5vbmtleWRvd24gPSAoZTogS2V5Ym9hcmRFdmVudCkgPT4ge1xyXG4gICAgaWYgKGUua2V5ID09PSBcIkNvbnRyb2xcIikge1xyXG4gICAgICAgIGhvbGRpbmdDb250cm9sID0gdHJ1ZTtcclxuICAgIH0gZWxzZSBpZiAoZS5rZXkgPT09IFwiU2hpZnRcIikge1xyXG4gICAgICAgIGhvbGRpbmdTaGlmdCA9IHRydWU7XHJcbiAgICB9XHJcbn07XHJcblxyXG53aW5kb3cub25rZXl1cCA9IChlOiBLZXlib2FyZEV2ZW50KSA9PiB7XHJcbiAgICBpZiAoZS5rZXkgPT09IFwiQ29udHJvbFwiKSB7XHJcbiAgICAgICAgaG9sZGluZ0NvbnRyb2wgPSBmYWxzZTtcclxuICAgIH0gZWxzZSBpZiAoZS5rZXkgPT09IFwiU2hpZnRcIikge1xyXG4gICAgICAgIGhvbGRpbmdTaGlmdCA9IGZhbHNlO1xyXG4gICAgfVxyXG59O1xyXG5cclxuZnVuY3Rpb24gZ2V0TW91c2VQb3NpdGlvbihlOiBNb3VzZUV2ZW50KSB7XHJcbiAgICByZXR1cm4gbmV3IFZlY3RvcihcclxuICAgICAgICBWUC5jYW52YXMud2lkdGggKiAoZS5jbGllbnRYIC0gVlAuY2FudmFzUmVjdC5sZWZ0KSAvIFZQLmNhbnZhc1JlY3Qud2lkdGgsXHJcbiAgICAgICAgVlAuY2FudmFzLmhlaWdodCAqIChlLmNsaWVudFkgLSBWUC5jYW52YXNSZWN0LnRvcCkgLyBWUC5jYW52YXNSZWN0LmhlaWdodFxyXG4gICAgKTtcclxufVxyXG5cclxuVlAuY2FudmFzLm9ubW91c2Vkb3duID0gYXN5bmMgKGV2ZW50OiBNb3VzZUV2ZW50KSA9PiB7XHJcbiAgICBjb25zdCB1bmxvY2sgPSBhd2FpdCBTdGF0ZS5sb2NrKCk7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIG1vdXNlRG93blBvc2l0aW9uID0gZ2V0TW91c2VQb3NpdGlvbihldmVudCk7XHJcbiAgICAgICAgbW91c2VNb3ZlUG9zaXRpb24gPSBtb3VzZURvd25Qb3NpdGlvbjtcclxuICAgICAgICBleGNlZWRlZERyYWdUaHJlc2hvbGQgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgY29uc3QgZGVja1Bvc2l0aW9uID0gU3RhdGUuZGVja1Nwcml0ZXNbU3RhdGUuZGVja1Nwcml0ZXMubGVuZ3RoIC0gMV0/LnBvc2l0aW9uO1xyXG5cclxuICAgICAgICBpZiAoVlAuc29ydEJ5UmFua0JvdW5kc1swXS54IDwgbW91c2VEb3duUG9zaXRpb24ueCAmJiBtb3VzZURvd25Qb3NpdGlvbi54IDwgVlAuc29ydEJ5UmFua0JvdW5kc1sxXS54ICYmXHJcbiAgICAgICAgICAgIFZQLnNvcnRCeVJhbmtCb3VuZHNbMF0ueSA8IG1vdXNlRG93blBvc2l0aW9uLnkgJiYgbW91c2VEb3duUG9zaXRpb24ueSA8IFZQLnNvcnRCeVJhbmtCb3VuZHNbMV0ueVxyXG4gICAgICAgICkge1xyXG4gICAgICAgICAgICBhY3Rpb24gPSBcIlNvcnRCeVJhbmtcIjtcclxuICAgICAgICB9IGVsc2UgaWYgKFxyXG4gICAgICAgICAgICBWUC5zb3J0QnlTdWl0Qm91bmRzWzBdLnggPCBtb3VzZURvd25Qb3NpdGlvbi54ICYmIG1vdXNlRG93blBvc2l0aW9uLnggPCBWUC5zb3J0QnlTdWl0Qm91bmRzWzFdLnggJiZcclxuICAgICAgICAgICAgVlAuc29ydEJ5U3VpdEJvdW5kc1swXS55IDwgbW91c2VEb3duUG9zaXRpb24ueSAmJiBtb3VzZURvd25Qb3NpdGlvbi55IDwgVlAuc29ydEJ5U3VpdEJvdW5kc1sxXS55XHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICAgIGFjdGlvbiA9IFwiU29ydEJ5U3VpdFwiO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoZGVja1Bvc2l0aW9uICE9PSB1bmRlZmluZWQgJiZcclxuICAgICAgICAgICAgZGVja1Bvc2l0aW9uLnggPCBtb3VzZURvd25Qb3NpdGlvbi54ICYmIG1vdXNlRG93blBvc2l0aW9uLnggPCBkZWNrUG9zaXRpb24ueCArIFZQLnNwcml0ZVdpZHRoICYmXHJcbiAgICAgICAgICAgIGRlY2tQb3NpdGlvbi55IDwgbW91c2VEb3duUG9zaXRpb24ueSAmJiBtb3VzZURvd25Qb3NpdGlvbi55IDwgZGVja1Bvc2l0aW9uLnkgKyBWUC5zcHJpdGVIZWlnaHRcclxuICAgICAgICApIHtcclxuICAgICAgICAgICAgYWN0aW9uID0ge1xyXG4gICAgICAgICAgICAgICAgbW91c2VQb3NpdGlvblRvU3ByaXRlUG9zaXRpb246IGRlY2tQb3NpdGlvbi5zdWIobW91c2VEb3duUG9zaXRpb24pLFxyXG4gICAgICAgICAgICAgICAgdHlwZTogXCJEcmF3RnJvbURlY2tcIlxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIC8vIGJlY2F1c2Ugd2UgcmVuZGVyIGxlZnQgdG8gcmlnaHQsIHRoZSByaWdodG1vc3QgY2FyZCB1bmRlciB0aGUgbW91c2UgcG9zaXRpb24gaXMgd2hhdCB3ZSBzaG91bGQgcmV0dXJuXHJcbiAgICAgICAgICAgIGNvbnN0IHNwcml0ZXMgPSBTdGF0ZS5mYWNlU3ByaXRlc0ZvclBsYXllcls8bnVtYmVyPlN0YXRlLmdhbWVTdGF0ZT8ucGxheWVySW5kZXhdO1xyXG4gICAgICAgICAgICBpZiAoc3ByaXRlcyA9PT0gdW5kZWZpbmVkKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICBsZXQgZGVzZWxlY3QgPSB0cnVlO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gc3ByaXRlcy5sZW5ndGggLSAxOyBpID49IDA7IC0taSkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcG9zaXRpb24gPSBzcHJpdGVzW2ldPy5wb3NpdGlvbjtcclxuICAgICAgICAgICAgICAgIGlmIChwb3NpdGlvbiAhPT0gdW5kZWZpbmVkICYmXHJcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb24ueCA8IG1vdXNlRG93blBvc2l0aW9uLnggJiYgbW91c2VEb3duUG9zaXRpb24ueCA8IHBvc2l0aW9uLnggKyBWUC5zcHJpdGVXaWR0aCAmJlxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uLnkgPCBtb3VzZURvd25Qb3NpdGlvbi55ICYmIG1vdXNlRG93blBvc2l0aW9uLnkgPCBwb3NpdGlvbi55ICsgVlAuc3ByaXRlSGVpZ2h0XHJcbiAgICAgICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgICAgICBkZXNlbGVjdCA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBhY3Rpb24gPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhcmRJbmRleDogaSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbW91c2VQb3NpdGlvblRvU3ByaXRlUG9zaXRpb246IHBvc2l0aW9uLnN1Yihtb3VzZURvd25Qb3NpdGlvbiksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IGhvbGRpbmdDb250cm9sICYmIGhvbGRpbmdTaGlmdCA/IFwiQ29udHJvbFNoaWZ0Q2xpY2tcIiA6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBob2xkaW5nQ29udHJvbCA/IFwiQ29udHJvbENsaWNrXCIgOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaG9sZGluZ1NoaWZ0ID8gXCJTaGlmdENsaWNrXCIgOiBcIkNsaWNrXCJcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoZGVzZWxlY3QpIHtcclxuICAgICAgICAgICAgICAgIGFjdGlvbiA9IFwiRGVzZWxlY3RcIjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgdW5sb2NrKCk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5WUC5jYW52YXMub25tb3VzZW1vdmUgPSBhc3luYyAoZXZlbnQ6IE1vdXNlRXZlbnQpID0+IHtcclxuICAgIGlmIChTdGF0ZS5nYW1lU3RhdGUgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcblxyXG4gICAgY29uc3QgdW5sb2NrID0gYXdhaXQgU3RhdGUubG9jaygpO1xyXG4gICAgdHJ5IHtcclxuICAgICAgICBtb3VzZU1vdmVQb3NpdGlvbiA9IGdldE1vdXNlUG9zaXRpb24oZXZlbnQpO1xyXG4gICAgICAgIGV4Y2VlZGVkRHJhZ1RocmVzaG9sZCA9IGV4Y2VlZGVkRHJhZ1RocmVzaG9sZCB8fCBtb3VzZU1vdmVQb3NpdGlvbi5kaXN0YW5jZShtb3VzZURvd25Qb3NpdGlvbikgPiBtb3ZlVGhyZXNob2xkO1xyXG5cclxuICAgICAgICBpZiAoYWN0aW9uID09PSBcIk5vbmVcIikge1xyXG4gICAgICAgICAgICAvLyBkbyBub3RoaW5nXHJcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24gPT09IFwiU29ydEJ5U3VpdFwiKSB7XHJcbiAgICAgICAgICAgIC8vIFRPRE86IGNoZWNrIHdoZXRoZXIgbW91c2UgcG9zaXRpb24gaGFzIGxlZnQgYnV0dG9uIGJvdW5kc1xyXG4gICAgICAgIH0gZWxzZSBpZiAoYWN0aW9uID09PSBcIlNvcnRCeVJhbmtcIikge1xyXG4gICAgICAgICAgICAvLyBUT0RPOiBjaGVjayB3aGV0aGVyIG1vdXNlIHBvc2l0aW9uIGhhcyBsZWZ0IGJ1dHRvbiBib3VuZHNcclxuICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbiA9PT0gXCJEZXNlbGVjdFwiKSB7XHJcbiAgICAgICAgICAgIC8vIFRPRE86IGJveCBzZWxlY3Rpb24/XHJcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24udHlwZSA9PT0gXCJEcmF3RnJvbURlY2tcIiB8fCBhY3Rpb24udHlwZSA9PT0gXCJXYWl0aW5nRm9yTmV3Q2FyZFwiKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGRlY2tTcHJpdGUgPSBTdGF0ZS5kZWNrU3ByaXRlc1tTdGF0ZS5kZWNrU3ByaXRlcy5sZW5ndGggLSAxXTtcclxuICAgICAgICAgICAgaWYgKGRlY2tTcHJpdGUgPT09IHVuZGVmaW5lZCkgcmV0dXJuO1xyXG4gICAgICAgICAgICBkZWNrU3ByaXRlLnRhcmdldCA9IG1vdXNlTW92ZVBvc2l0aW9uLmFkZChhY3Rpb24ubW91c2VQb3NpdGlvblRvU3ByaXRlUG9zaXRpb24pO1xyXG5cclxuICAgICAgICAgICAgaWYgKGFjdGlvbi50eXBlID09PSBcIkRyYXdGcm9tRGVja1wiICYmIGV4Y2VlZGVkRHJhZ1RocmVzaG9sZCkge1xyXG4gICAgICAgICAgICAgICAgYWN0aW9uID0geyAuLi5hY3Rpb24sIHR5cGU6IFwiV2FpdGluZ0Zvck5ld0NhcmRcIiB9O1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIGNhcmQgZHJhd2luZyB3aWxsIHRyeSB0byBsb2NrIHRoZSBzdGF0ZSwgc28gd2UgbXVzdCBhdHRhY2ggYSBjYWxsYmFjayBpbnN0ZWFkIG9mIGF3YWl0aW5nXHJcbiAgICAgICAgICAgICAgICBTdGF0ZS5kcmF3Q2FyZCgpLnRoZW4ob25DYXJkRHJhd24oZGVja1Nwcml0ZSkpLmNhdGNoKF8gPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChhY3Rpb24gIT09IFwiTm9uZVwiICYmXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbiAhPT0gXCJEZXNlbGVjdFwiICYmXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbiAhPT0gXCJTb3J0QnlSYW5rXCIgJiZcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uICE9PSBcIlNvcnRCeVN1aXRcIiAmJlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb24udHlwZSA9PT0gXCJXYWl0aW5nRm9yTmV3Q2FyZFwiXHJcbiAgICAgICAgICAgICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbiA9IFwiTm9uZVwiO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24udHlwZSA9PT0gXCJSZXR1cm5Ub0RlY2tcIiB8fCBhY3Rpb24udHlwZSA9PT0gXCJSZW9yZGVyXCIgKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHNwcml0ZXMgPSBTdGF0ZS5mYWNlU3ByaXRlc0ZvclBsYXllcltTdGF0ZS5nYW1lU3RhdGUucGxheWVySW5kZXhdO1xyXG4gICAgICAgICAgICBpZiAoc3ByaXRlcyA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICAgICAgICAgICAgY29uc3QgbW91c2VEb3duU3ByaXRlID0gc3ByaXRlc1thY3Rpb24uY2FyZEluZGV4XTtcclxuICAgICAgICAgICAgaWYgKG1vdXNlRG93blNwcml0ZSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuXHJcbiAgICAgICAgICAgIC8vIG1vdmUgYWxsIHNlbGVjdGVkIGNhcmRzIGFzIGEgZ3JvdXAgYXJvdW5kIHRoZSBjYXJkIHVuZGVyIHRoZSBtb3VzZSBwb3NpdGlvblxyXG4gICAgICAgICAgICBmb3IgKGNvbnN0IHNlbGVjdGVkSW5kZXggb2YgU3RhdGUuc2VsZWN0ZWRJbmRpY2VzKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBzcHJpdGUgPSBzcHJpdGVzW3NlbGVjdGVkSW5kZXhdO1xyXG4gICAgICAgICAgICAgICAgaWYgKHNwcml0ZSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICAgICAgICAgICAgICAgIHNwcml0ZS50YXJnZXQgPSBtb3VzZU1vdmVQb3NpdGlvbi5hZGQoYWN0aW9uLm1vdXNlUG9zaXRpb25Ub1Nwcml0ZVBvc2l0aW9uKS5hZGQobmV3IFZlY3Rvcigoc2VsZWN0ZWRJbmRleCAtIGFjdGlvbi5jYXJkSW5kZXgpICogVlAuc3ByaXRlR2FwLCAwKSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGRyYWcoU3RhdGUuZ2FtZVN0YXRlLCBhY3Rpb24uY2FyZEluZGV4LCBhY3Rpb24ubW91c2VQb3NpdGlvblRvU3ByaXRlUG9zaXRpb24pO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoXHJcbiAgICAgICAgICAgIGFjdGlvbi50eXBlID09PSBcIkNvbnRyb2xTaGlmdENsaWNrXCIgfHxcclxuICAgICAgICAgICAgYWN0aW9uLnR5cGUgPT09IFwiQ29udHJvbENsaWNrXCIgfHxcclxuICAgICAgICAgICAgYWN0aW9uLnR5cGUgPT09IFwiU2hpZnRDbGlja1wiIHx8XHJcbiAgICAgICAgICAgIGFjdGlvbi50eXBlID09PSBcIkNsaWNrXCJcclxuICAgICAgICApIHtcclxuICAgICAgICAgICAgaWYgKGV4Y2VlZGVkRHJhZ1RocmVzaG9sZCkge1xyXG4gICAgICAgICAgICAgICAgLy8gZHJhZ2dpbmcgYSBub24tc2VsZWN0ZWQgY2FyZCBzZWxlY3RzIGl0IGFuZCBvbmx5IGl0XHJcbiAgICAgICAgICAgICAgICBsZXQgaSA9IExpYi5iaW5hcnlTZWFyY2hOdW1iZXIoU3RhdGUuc2VsZWN0ZWRJbmRpY2VzLCBhY3Rpb24uY2FyZEluZGV4KTtcclxuICAgICAgICAgICAgICAgIGlmIChpIDwgMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGkgPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgIFN0YXRlLnNlbGVjdGVkSW5kaWNlcy5zcGxpY2UoaSwgU3RhdGUuc2VsZWN0ZWRJbmRpY2VzLmxlbmd0aCwgYWN0aW9uLmNhcmRJbmRleCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgZHJhZyhTdGF0ZS5nYW1lU3RhdGUsIGFjdGlvbi5jYXJkSW5kZXgsIGFjdGlvbi5tb3VzZVBvc2l0aW9uVG9TcHJpdGVQb3NpdGlvbik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBjb25zdCBfOiBuZXZlciA9IGFjdGlvbjtcclxuICAgICAgICB9XHJcbiAgICB9IGZpbmFsbHkge1xyXG4gICAgICAgIHVubG9jaygpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuVlAuY2FudmFzLm9ubW91c2V1cCA9IGFzeW5jICgpID0+IHtcclxuICAgIGlmIChTdGF0ZS5nYW1lU3RhdGUgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcblxyXG4gICAgY29uc3QgdW5sb2NrID0gYXdhaXQgU3RhdGUubG9jaygpO1xyXG4gICAgdHJ5IHtcclxuICAgICAgICBpZiAoYWN0aW9uID09PSBcIk5vbmVcIikge1xyXG4gICAgICAgICAgICAvLyBkbyBub3RoaW5nXHJcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24gPT09IFwiU29ydEJ5UmFua1wiKSB7XHJcbiAgICAgICAgICAgIGF3YWl0IFN0YXRlLnNvcnRCeVJhbmsoU3RhdGUuZ2FtZVN0YXRlKTtcclxuICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbiA9PT0gXCJTb3J0QnlTdWl0XCIpIHtcclxuICAgICAgICAgICAgYXdhaXQgU3RhdGUuc29ydEJ5U3VpdChTdGF0ZS5nYW1lU3RhdGUpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoYWN0aW9uID09PSBcIkRlc2VsZWN0XCIpIHtcclxuICAgICAgICAgICAgU3RhdGUuc2VsZWN0ZWRJbmRpY2VzLnNwbGljZSgwLCBTdGF0ZS5zZWxlY3RlZEluZGljZXMubGVuZ3RoKTtcclxuICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbi50eXBlID09PSBcIkRyYXdGcm9tRGVja1wiIHx8IGFjdGlvbi50eXBlID09PSBcIldhaXRpbmdGb3JOZXdDYXJkXCIpIHtcclxuICAgICAgICAgICAgLy8gZG8gbm90aGluZ1xyXG4gICAgICAgIH0gZWxzZSBpZiAoYWN0aW9uLnR5cGUgPT09IFwiUmVvcmRlclwiKSB7XHJcbiAgICAgICAgICAgIHByZXZpb3VzQ2xpY2tJbmRleCA9IGFjdGlvbi5jYXJkSW5kZXg7XHJcbiAgICAgICAgICAgIGF3YWl0IFN0YXRlLnJlb3JkZXJDYXJkcyhTdGF0ZS5nYW1lU3RhdGUpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoYWN0aW9uLnR5cGUgPT09IFwiUmV0dXJuVG9EZWNrXCIpIHtcclxuICAgICAgICAgICAgcHJldmlvdXNDbGlja0luZGV4ID0gLTE7XHJcbiAgICAgICAgICAgIGF3YWl0IFN0YXRlLnJldHVybkNhcmRzVG9EZWNrKFN0YXRlLmdhbWVTdGF0ZSk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24udHlwZSA9PT0gXCJDb250cm9sU2hpZnRDbGlja1wiKSB7XHJcbiAgICAgICAgICAgIGlmIChwcmV2aW91c0NsaWNrSW5kZXggPT09IC0xKSB7XHJcbiAgICAgICAgICAgICAgICBwcmV2aW91c0NsaWNrSW5kZXggPSBhY3Rpb24uY2FyZEluZGV4O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBzdGFydCA9IE1hdGgubWluKGFjdGlvbi5jYXJkSW5kZXgsIHByZXZpb3VzQ2xpY2tJbmRleCk7XHJcbiAgICAgICAgICAgIGNvbnN0IGVuZCA9IE1hdGgubWF4KGFjdGlvbi5jYXJkSW5kZXgsIHByZXZpb3VzQ2xpY2tJbmRleCk7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSBzdGFydDsgaSA8PSBlbmQ7ICsraSkge1xyXG4gICAgICAgICAgICAgICAgbGV0IGogPSBMaWIuYmluYXJ5U2VhcmNoTnVtYmVyKFN0YXRlLnNlbGVjdGVkSW5kaWNlcywgaSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoaiA8IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBTdGF0ZS5zZWxlY3RlZEluZGljZXMuc3BsaWNlKH5qLCAwLCBpKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSBpZiAoYWN0aW9uLnR5cGUgPT09IFwiQ29udHJvbENsaWNrXCIpIHtcclxuICAgICAgICAgICAgcHJldmlvdXNDbGlja0luZGV4ID0gYWN0aW9uLmNhcmRJbmRleDtcclxuICAgICAgICAgICAgbGV0IGkgPSBMaWIuYmluYXJ5U2VhcmNoTnVtYmVyKFN0YXRlLnNlbGVjdGVkSW5kaWNlcywgYWN0aW9uLmNhcmRJbmRleCk7XHJcbiAgICAgICAgICAgIGlmIChpIDwgMCkge1xyXG4gICAgICAgICAgICAgICAgU3RhdGUuc2VsZWN0ZWRJbmRpY2VzLnNwbGljZSh+aSwgMCwgYWN0aW9uLmNhcmRJbmRleCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBTdGF0ZS5zZWxlY3RlZEluZGljZXMuc3BsaWNlKGksIDEpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24udHlwZSA9PT0gXCJTaGlmdENsaWNrXCIpIHtcclxuICAgICAgICAgICAgaWYgKHByZXZpb3VzQ2xpY2tJbmRleCA9PT0gLTEpIHtcclxuICAgICAgICAgICAgICAgIHByZXZpb3VzQ2xpY2tJbmRleCA9IGFjdGlvbi5jYXJkSW5kZXg7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHN0YXJ0ID0gTWF0aC5taW4oYWN0aW9uLmNhcmRJbmRleCwgcHJldmlvdXNDbGlja0luZGV4KTtcclxuICAgICAgICAgICAgY29uc3QgZW5kID0gTWF0aC5tYXgoYWN0aW9uLmNhcmRJbmRleCwgcHJldmlvdXNDbGlja0luZGV4KTtcclxuICAgICAgICAgICAgU3RhdGUuc2VsZWN0ZWRJbmRpY2VzLnNwbGljZSgwLCBTdGF0ZS5zZWxlY3RlZEluZGljZXMubGVuZ3RoKTtcclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IHN0YXJ0OyBpIDw9IGVuZDsgKytpKSB7XHJcbiAgICAgICAgICAgICAgICBTdGF0ZS5zZWxlY3RlZEluZGljZXMucHVzaChpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSBpZiAoYWN0aW9uLnR5cGUgPT09IFwiQ2xpY2tcIikge1xyXG4gICAgICAgICAgICBwcmV2aW91c0NsaWNrSW5kZXggPSBhY3Rpb24uY2FyZEluZGV4O1xyXG4gICAgICAgICAgICBTdGF0ZS5zZWxlY3RlZEluZGljZXMuc3BsaWNlKDAsIFN0YXRlLnNlbGVjdGVkSW5kaWNlcy5sZW5ndGgsIGFjdGlvbi5jYXJkSW5kZXgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgU3RhdGUuc2V0U3ByaXRlVGFyZ2V0cyhTdGF0ZS5nYW1lU3RhdGUpO1xyXG5cclxuICAgICAgICBhY3Rpb24gPSBcIk5vbmVcIjtcclxuICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgdW5sb2NrKCk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5mdW5jdGlvbiBvbkNhcmREcmF3bihkZWNrU3ByaXRlOiBTcHJpdGUpIHtcclxuICAgIHJldHVybiBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgaWYgKFN0YXRlLmdhbWVTdGF0ZSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuXHJcbiAgICAgICAgY29uc3QgdW5sb2NrID0gYXdhaXQgU3RhdGUubG9jaygpO1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGlmIChhY3Rpb24gIT09IFwiTm9uZVwiICYmXHJcbiAgICAgICAgICAgICAgICBhY3Rpb24gIT09IFwiU29ydEJ5U3VpdFwiICYmXHJcbiAgICAgICAgICAgICAgICBhY3Rpb24gIT09IFwiU29ydEJ5UmFua1wiICYmXHJcbiAgICAgICAgICAgICAgICBhY3Rpb24gIT09IFwiRGVzZWxlY3RcIiAmJlxyXG4gICAgICAgICAgICAgICAgYWN0aW9uLnR5cGUgPT09IFwiV2FpdGluZ0Zvck5ld0NhcmRcIlxyXG4gICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgIC8vIGltbWVkaWF0ZWx5IHNlbGVjdCBuZXdseSBhY3F1aXJlZCBjYXJkXHJcbiAgICAgICAgICAgICAgICBjb25zdCBjYXJkSW5kZXggPSBTdGF0ZS5nYW1lU3RhdGUucGxheWVyQ2FyZHMubGVuZ3RoIC0gMTtcclxuICAgICAgICAgICAgICAgIFN0YXRlLnNlbGVjdGVkSW5kaWNlcy5zcGxpY2UoMCwgU3RhdGUuc2VsZWN0ZWRJbmRpY2VzLmxlbmd0aCk7XHJcbiAgICAgICAgICAgICAgICBTdGF0ZS5zZWxlY3RlZEluZGljZXMucHVzaChjYXJkSW5kZXgpO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIG5ldyBjYXJkIHNob3VsZCBhcHBlYXIgaW4gcGxhY2Ugb2YgZHJhZ2dlZCBjYXJkIGZyb20gZGVjayB3aXRob3V0IGFuaW1hdGlvblxyXG4gICAgICAgICAgICAgICAgY29uc3QgZmFjZVNwcml0ZUF0TW91c2VEb3duID0gU3RhdGUuZmFjZVNwcml0ZXNGb3JQbGF5ZXJbU3RhdGUuZ2FtZVN0YXRlLnBsYXllckluZGV4XT8uW2NhcmRJbmRleF07XHJcbiAgICAgICAgICAgICAgICBpZiAoZmFjZVNwcml0ZUF0TW91c2VEb3duID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG4gICAgICAgICAgICAgICAgZmFjZVNwcml0ZUF0TW91c2VEb3duLnRhcmdldCA9IGRlY2tTcHJpdGUucG9zaXRpb247XHJcbiAgICAgICAgICAgICAgICBmYWNlU3ByaXRlQXRNb3VzZURvd24ucG9zaXRpb24gPSBkZWNrU3ByaXRlLnBvc2l0aW9uO1xyXG4gICAgICAgICAgICAgICAgZmFjZVNwcml0ZUF0TW91c2VEb3duLnZlbG9jaXR5ID0gZGVja1Nwcml0ZS52ZWxvY2l0eTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgZHJhZyhTdGF0ZS5nYW1lU3RhdGUsIGNhcmRJbmRleCwgYWN0aW9uLm1vdXNlUG9zaXRpb25Ub1Nwcml0ZVBvc2l0aW9uKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgICAgIHVubG9jaygpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRyYWcoZ2FtZVN0YXRlOiBMaWIuR2FtZVN0YXRlLCBjYXJkSW5kZXg6IG51bWJlciwgbW91c2VQb3NpdGlvblRvU3ByaXRlUG9zaXRpb246IFZlY3Rvcikge1xyXG4gICAgY29uc3Qgc3ByaXRlcyA9IFN0YXRlLmZhY2VTcHJpdGVzRm9yUGxheWVyW2dhbWVTdGF0ZS5wbGF5ZXJJbmRleF07XHJcbiAgICBpZiAoc3ByaXRlcyA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuXHJcbiAgICBjb25zdCBjYXJkcyA9IGdhbWVTdGF0ZS5wbGF5ZXJDYXJkcztcclxuXHJcbiAgICBjb25zdCBtb3ZpbmdTcHJpdGVzQW5kQ2FyZHM6IFtTcHJpdGUsIExpYi5DYXJkXVtdID0gW107XHJcbiAgICBjb25zdCByZXNlcnZlZFNwcml0ZXNBbmRDYXJkczogW1Nwcml0ZSwgTGliLkNhcmRdW10gPSBbXTtcclxuXHJcbiAgICBsZXQgc3BsaXRJbmRleDogbnVtYmVyO1xyXG4gICAgbGV0IHJldmVhbENvdW50ID0gZ2FtZVN0YXRlLnBsYXllclJldmVhbENvdW50O1xyXG5cclxuICAgIC8vIGV4dHJhY3QgbW92aW5nIHNwcml0ZXNcclxuICAgIGZvciAoY29uc3QgaSBvZiBTdGF0ZS5zZWxlY3RlZEluZGljZXMpIHtcclxuICAgICAgICBjb25zdCBzcHJpdGUgPSBzcHJpdGVzW2ldO1xyXG4gICAgICAgIGNvbnN0IGNhcmQgPSBjYXJkc1tpXTtcclxuICAgICAgICBpZiAoc3ByaXRlID09PSB1bmRlZmluZWQgfHwgY2FyZCA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICAgICAgICBtb3ZpbmdTcHJpdGVzQW5kQ2FyZHMucHVzaChbc3ByaXRlLCBjYXJkXSk7XHJcblxyXG4gICAgICAgIGlmIChpIDwgZ2FtZVN0YXRlLnBsYXllclJldmVhbENvdW50KSB7XHJcbiAgICAgICAgICAgIC0tcmV2ZWFsQ291bnQ7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIGV4dHJhY3QgcmVzZXJ2ZWQgc3ByaXRlc1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzcHJpdGVzLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgaWYgKExpYi5iaW5hcnlTZWFyY2hOdW1iZXIoU3RhdGUuc2VsZWN0ZWRJbmRpY2VzLCBpKSA8IDApIHtcclxuICAgICAgICAgICAgY29uc3Qgc3ByaXRlID0gc3ByaXRlc1tpXTtcclxuICAgICAgICAgICAgY29uc3QgY2FyZCA9IGNhcmRzW2ldO1xyXG4gICAgICAgICAgICBpZiAoc3ByaXRlID09PSB1bmRlZmluZWQgfHwgY2FyZCA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICAgICAgICAgICAgcmVzZXJ2ZWRTcHJpdGVzQW5kQ2FyZHMucHVzaChbc3ByaXRlLCBjYXJkXSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIGZpbmQgdGhlIGhlbGQgc3ByaXRlcywgaWYgYW55LCBvdmVybGFwcGVkIGJ5IHRoZSBkcmFnZ2VkIHNwcml0ZXNcclxuICAgIGNvbnN0IGxlZnRNb3ZpbmdTcHJpdGUgPSBtb3ZpbmdTcHJpdGVzQW5kQ2FyZHNbMF0/LlswXTtcclxuICAgIGNvbnN0IHJpZ2h0TW92aW5nU3ByaXRlID0gbW92aW5nU3ByaXRlc0FuZENhcmRzW21vdmluZ1Nwcml0ZXNBbmRDYXJkcy5sZW5ndGggLSAxXT8uWzBdO1xyXG4gICAgaWYgKGxlZnRNb3ZpbmdTcHJpdGUgPT09IHVuZGVmaW5lZCB8fCByaWdodE1vdmluZ1Nwcml0ZSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgZGVja0Rpc3RhbmNlID0gTWF0aC5hYnMobGVmdE1vdmluZ1Nwcml0ZS50YXJnZXQueSAtIChTdGF0ZS5kZWNrU3ByaXRlc1swXT8ucG9zaXRpb24ueSA/PyBJbmZpbml0eSkpO1xyXG4gICAgY29uc3QgcmV2ZWFsRGlzdGFuY2UgPSBNYXRoLmFicyhsZWZ0TW92aW5nU3ByaXRlLnRhcmdldC55IC0gKFZQLmNhbnZhcy5oZWlnaHQgLSAyICogVlAuc3ByaXRlSGVpZ2h0KSk7XHJcbiAgICBjb25zdCBoaWRlRGlzdGFuY2UgPSBNYXRoLmFicyhsZWZ0TW92aW5nU3ByaXRlLnRhcmdldC55IC0gKFZQLmNhbnZhcy5oZWlnaHQgLSBWUC5zcHJpdGVIZWlnaHQpKTtcclxuXHJcbiAgICAvLyBzZXQgdGhlIGFjdGlvbiBmb3Igb25tb3VzZXVwXHJcbiAgICBpZiAoZGVja0Rpc3RhbmNlIDwgcmV2ZWFsRGlzdGFuY2UgJiYgZGVja0Rpc3RhbmNlIDwgaGlkZURpc3RhbmNlKSB7XHJcbiAgICAgICAgYWN0aW9uID0geyBjYXJkSW5kZXgsIG1vdXNlUG9zaXRpb25Ub1Nwcml0ZVBvc2l0aW9uLCB0eXBlOiBcIlJldHVyblRvRGVja1wiIH07XHJcblxyXG4gICAgICAgIHNwbGl0SW5kZXggPSByZXNlcnZlZFNwcml0ZXNBbmRDYXJkcy5sZW5ndGg7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIGFjdGlvbiA9IHsgY2FyZEluZGV4LCBtb3VzZVBvc2l0aW9uVG9TcHJpdGVQb3NpdGlvbiwgdHlwZTogXCJSZW9yZGVyXCIgfTtcclxuXHJcbiAgICAgICAgLy8gZGV0ZXJtaW5lIHdoZXRoZXIgdGhlIG1vdmluZyBzcHJpdGVzIGFyZSBjbG9zZXIgdG8gdGhlIHJldmVhbGVkIHNwcml0ZXMgb3IgdG8gdGhlIGhpZGRlbiBzcHJpdGVzXHJcbiAgICAgICAgY29uc3Qgc3BsaXRSZXZlYWxlZCA9IHJldmVhbERpc3RhbmNlIDwgaGlkZURpc3RhbmNlO1xyXG4gICAgICAgIGNvbnN0IHN0YXJ0ID0gc3BsaXRSZXZlYWxlZCA/IDAgOiByZXZlYWxDb3VudDtcclxuICAgICAgICBjb25zdCBlbmQgPSBzcGxpdFJldmVhbGVkID8gcmV2ZWFsQ291bnQgOiByZXNlcnZlZFNwcml0ZXNBbmRDYXJkcy5sZW5ndGg7XHJcbiAgICBcclxuICAgICAgICBsZXQgbGVmdEluZGV4OiBudW1iZXIgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgbGV0IHJpZ2h0SW5kZXg6IG51bWJlciB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcclxuICAgICAgICBmb3IgKGxldCBpID0gc3RhcnQ7IGkgPCBlbmQ7ICsraSkge1xyXG4gICAgICAgICAgICBjb25zdCByZXNlcnZlZFNwcml0ZSA9IHJlc2VydmVkU3ByaXRlc0FuZENhcmRzW2ldPy5bMF07XHJcbiAgICAgICAgICAgIGlmIChyZXNlcnZlZFNwcml0ZSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICAgICAgICAgICAgaWYgKGxlZnRNb3ZpbmdTcHJpdGUudGFyZ2V0LnggPCByZXNlcnZlZFNwcml0ZS50YXJnZXQueCAmJlxyXG4gICAgICAgICAgICAgICAgcmVzZXJ2ZWRTcHJpdGUudGFyZ2V0LnggPCByaWdodE1vdmluZ1Nwcml0ZS50YXJnZXQueFxyXG4gICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgIGlmIChsZWZ0SW5kZXggPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxlZnRJbmRleCA9IGk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICBcclxuICAgICAgICAgICAgICAgIHJpZ2h0SW5kZXggPSBpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgXHJcbiAgICAgICAgaWYgKGxlZnRJbmRleCAhPT0gdW5kZWZpbmVkICYmIHJpZ2h0SW5kZXggIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICBjb25zdCBsZWZ0UmVzZXJ2ZWRTcHJpdGUgPSByZXNlcnZlZFNwcml0ZXNBbmRDYXJkc1tsZWZ0SW5kZXhdPy5bMF07XHJcbiAgICAgICAgICAgIGNvbnN0IHJpZ2h0UmVzZXJ2ZWRTcHJpdGUgPSByZXNlcnZlZFNwcml0ZXNBbmRDYXJkc1tyaWdodEluZGV4XT8uWzBdO1xyXG4gICAgICAgICAgICBpZiAobGVmdFJlc2VydmVkU3ByaXRlID09PSB1bmRlZmluZWQgfHwgcmlnaHRSZXNlcnZlZFNwcml0ZSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICAgICAgICAgICAgY29uc3QgbGVmdEdhcCA9IGxlZnRSZXNlcnZlZFNwcml0ZS50YXJnZXQueCAtIGxlZnRNb3ZpbmdTcHJpdGUudGFyZ2V0Lng7XHJcbiAgICAgICAgICAgIGNvbnN0IHJpZ2h0R2FwID0gcmlnaHRNb3ZpbmdTcHJpdGUudGFyZ2V0LnggLSByaWdodFJlc2VydmVkU3ByaXRlLnRhcmdldC54O1xyXG4gICAgICAgICAgICBpZiAobGVmdEdhcCA8IHJpZ2h0R2FwKSB7XHJcbiAgICAgICAgICAgICAgICBzcGxpdEluZGV4ID0gbGVmdEluZGV4O1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgc3BsaXRJbmRleCA9IHJpZ2h0SW5kZXggKyAxO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgLy8gbm8gb3ZlcmxhcHBlZCBzcHJpdGVzLCBzbyB0aGUgaW5kZXggaXMgdGhlIGZpcnN0IHJlc2VydmVkIHNwcml0ZSB0byB0aGUgcmlnaHQgb2YgdGhlIG1vdmluZyBzcHJpdGVzXHJcbiAgICAgICAgICAgIGZvciAoc3BsaXRJbmRleCA9IHN0YXJ0OyBzcGxpdEluZGV4IDwgZW5kOyArK3NwbGl0SW5kZXgpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc2VydmVkU3ByaXRlID0gcmVzZXJ2ZWRTcHJpdGVzQW5kQ2FyZHNbc3BsaXRJbmRleF0/LlswXTtcclxuICAgICAgICAgICAgICAgIGlmIChyZXNlcnZlZFNwcml0ZSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICAgICAgICAgICAgICAgIGlmIChyaWdodE1vdmluZ1Nwcml0ZS50YXJnZXQueCA8IHJlc2VydmVkU3ByaXRlLnRhcmdldC54KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICBcclxuICAgICAgICAvLyBhZGp1c3QgcmV2ZWFsIGNvdW50XHJcbiAgICAgICAgaWYgKHNwbGl0SW5kZXggPCByZXZlYWxDb3VudCB8fFxyXG4gICAgICAgICAgICBzcGxpdEluZGV4ID09PSByZXZlYWxDb3VudCAmJiBzcGxpdFJldmVhbGVkXHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICAgIHJldmVhbENvdW50ICs9IG1vdmluZ1Nwcml0ZXNBbmRDYXJkcy5sZW5ndGg7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHNhdmVkQ2FyZEluZGV4ID0gYWN0aW9uLmNhcmRJbmRleDtcclxuXHJcbiAgICAvLyBhZGp1c3Qgc2VsZWN0ZWQgaW5kaWNlc1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBTdGF0ZS5zZWxlY3RlZEluZGljZXMubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICBpZiAoYWN0aW9uLmNhcmRJbmRleCA9PT0gU3RhdGUuc2VsZWN0ZWRJbmRpY2VzW2ldKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBzZXQgYWN0aW9uLmNhcmRJbmRleCB0byAke3NwbGl0SW5kZXggKyBpfWApXHJcbiAgICAgICAgICAgIGFjdGlvbi5jYXJkSW5kZXggPSBzcGxpdEluZGV4ICsgaTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIFN0YXRlLnNlbGVjdGVkSW5kaWNlc1tpXSA9IHNwbGl0SW5kZXggKyBpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnNvbGUubG9nKHNhdmVkQ2FyZEluZGV4LCBhY3Rpb24uY2FyZEluZGV4LCBTdGF0ZS5zZWxlY3RlZEluZGljZXMpO1xyXG5cclxuICAgIFN0YXRlLnNldFNwcml0ZVRhcmdldHMoXHJcbiAgICAgICAgZ2FtZVN0YXRlLFxyXG4gICAgICAgIHJlc2VydmVkU3ByaXRlc0FuZENhcmRzLFxyXG4gICAgICAgIG1vdmluZ1Nwcml0ZXNBbmRDYXJkcyxcclxuICAgICAgICByZXZlYWxDb3VudCxcclxuICAgICAgICBzcGxpdEluZGV4LFxyXG4gICAgICAgIGFjdGlvbi50eXBlID09PSBcIlJldHVyblRvRGVja1wiXHJcbiAgICApO1xyXG59IiwiaW1wb3J0ICogYXMgTGliIGZyb20gXCIuLi9saWJcIjtcclxuXHJcbmNvbnN0IHBsYXllck5hbWVFbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3BsYXllck5hbWUnKTtcclxuY29uc3QgcGxheWVyTmFtZVZhbHVlID0gTGliLmdldENvb2tpZSgncGxheWVyTmFtZScpO1xyXG5pZiAocGxheWVyTmFtZUVsZW1lbnQgIT09IG51bGwgJiYgcGxheWVyTmFtZVZhbHVlICE9PSB1bmRlZmluZWQpIHtcclxuICAgICg8SFRNTElucHV0RWxlbWVudD5wbGF5ZXJOYW1lRWxlbWVudCkudmFsdWUgPSBwbGF5ZXJOYW1lVmFsdWU7XHJcbn1cclxuXHJcbmNvbnN0IGdhbWVJZEVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZ2FtZUlkJyk7XHJcbmNvbnN0IGdhbWVJZFZhbHVlID0gTGliLmdldENvb2tpZSgnZ2FtZUlkJyk7XHJcbmlmIChnYW1lSWRFbGVtZW50ICE9PSBudWxsICYmIGdhbWVJZFZhbHVlICE9PSB1bmRlZmluZWQpIHtcclxuICAgICg8SFRNTElucHV0RWxlbWVudD5nYW1lSWRFbGVtZW50KS52YWx1ZSA9IGdhbWVJZFZhbHVlO1xyXG59XHJcbiIsImltcG9ydCAqIGFzIExpYiBmcm9tICcuLi9saWInO1xyXG5pbXBvcnQgKiBhcyBTdGF0ZSBmcm9tICcuL3N0YXRlJztcclxuaW1wb3J0ICogYXMgSW5wdXQgZnJvbSAnLi9pbnB1dCc7XHJcbmltcG9ydCAqIGFzIFZQIGZyb20gJy4vdmlldy1wYXJhbXMnO1xyXG5pbXBvcnQgVmVjdG9yIGZyb20gJy4vdmVjdG9yJztcclxuaW1wb3J0IFNwcml0ZSBmcm9tICcuL3Nwcml0ZSc7XHJcblxyXG5jb25zdCBkZWNrRGVhbER1cmF0aW9uID0gMTAwMDtcclxubGV0IGRlY2tEZWFsVGltZTogbnVtYmVyIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xyXG5sZXQgY3VycmVudFRpbWU6IG51bWJlciB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZW5kZXIodGltZTogbnVtYmVyKSB7XHJcbiAgICB3aGlsZSAoU3RhdGUuZ2FtZVN0YXRlID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICBhd2FpdCBMaWIuZGVsYXkoMTAwKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBkZWx0YVRpbWUgPSB0aW1lIC0gKGN1cnJlbnRUaW1lICE9PSB1bmRlZmluZWQgPyBjdXJyZW50VGltZSA6IHRpbWUpO1xyXG4gICAgY3VycmVudFRpbWUgPSB0aW1lO1xyXG5cclxuICAgIGNvbnN0IHVubG9jayA9IGF3YWl0IFN0YXRlLmxvY2soKTtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgLy8gY2xlYXIgdGhlIHNjcmVlblxyXG4gICAgICAgIFZQLmNvbnRleHQuY2xlYXJSZWN0KDAsIDAsIFZQLmNhbnZhcy53aWR0aCwgVlAuY2FudmFzLmhlaWdodCk7XHJcblxyXG4gICAgICAgIHJlbmRlckJhc2ljcyhTdGF0ZS5nYW1lSWQsIFN0YXRlLnBsYXllck5hbWUpO1xyXG4gICAgICAgIHJlbmRlckRlY2sodGltZSwgZGVsdGFUaW1lLCBTdGF0ZS5nYW1lU3RhdGUuZGVja0NvdW50KTtcclxuICAgICAgICByZW5kZXJPdGhlclBsYXllcnMoZGVsdGFUaW1lLCBTdGF0ZS5nYW1lU3RhdGUpO1xyXG4gICAgICAgIHJlbmRlclBsYXllcihkZWx0YVRpbWUsIFN0YXRlLmdhbWVTdGF0ZSk7XHJcbiAgICAgICAgcmVuZGVyQnV0dG9ucygpO1xyXG4gICAgfSBmaW5hbGx5IHtcclxuICAgICAgICB1bmxvY2soKTtcclxuICAgIH1cclxuXHJcbiAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKHJlbmRlcik7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbmRlckJhc2ljcyhnYW1lSWQ6IHN0cmluZywgcGxheWVyTmFtZTogc3RyaW5nKSB7XHJcbiAgICBWUC5jb250ZXh0LmZpbGxTdHlsZSA9ICcjMDAwMDAwZmYnO1xyXG4gICAgVlAuY29udGV4dC5mb250ID0gJzAuNzVjbSBJcnJlZ3VsYXJpcyc7XHJcbiAgICBWUC5jb250ZXh0LmZpbGxUZXh0KGBHYW1lOiAke2dhbWVJZH1gLCAwLCAwLjc1ICogVlAucGl4ZWxzUGVyQ00pO1xyXG4gICAgVlAuY29udGV4dC5maWxsVGV4dChgWW91ciBuYW1lIGlzOiAke3BsYXllck5hbWV9YCwgMCwgVlAuY2FudmFzLmhlaWdodCk7XHJcbiAgICBcclxuICAgIFZQLmNvbnRleHQuc2V0TGluZURhc2goWzQsIDJdKTtcclxuICAgIFZQLmNvbnRleHQuc3Ryb2tlUmVjdChWUC5zcHJpdGVIZWlnaHQsIFZQLnNwcml0ZUhlaWdodCwgVlAuY2FudmFzLndpZHRoIC0gMiAqIFZQLnNwcml0ZUhlaWdodCwgVlAuY2FudmFzLmhlaWdodCAtIDIgKiBWUC5zcHJpdGVIZWlnaHQpO1xyXG59XHJcblxyXG5mdW5jdGlvbiByZW5kZXJEZWNrKHRpbWU6IG51bWJlciwgZGVsdGFUaW1lOiBudW1iZXIsIGRlY2tDb3VudDogbnVtYmVyKSB7XHJcbiAgICBWUC5jb250ZXh0LnNhdmUoKTtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgaWYgKGRlY2tEZWFsVGltZSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIGRlY2tEZWFsVGltZSA9IHRpbWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IFN0YXRlLmRlY2tTcHJpdGVzLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGRlY2tTcHJpdGUgPSBTdGF0ZS5kZWNrU3ByaXRlc1tpXTtcclxuICAgICAgICAgICAgaWYgKGRlY2tTcHJpdGUgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcblxyXG4gICAgICAgICAgICBpZiAoaSA9PT0gZGVja0NvdW50IC0gMSAmJlxyXG4gICAgICAgICAgICAgICAgSW5wdXQuYWN0aW9uICE9PSBcIk5vbmVcIiAmJlxyXG4gICAgICAgICAgICAgICAgSW5wdXQuYWN0aW9uICE9PSBcIlNvcnRCeVN1aXRcIiAmJlxyXG4gICAgICAgICAgICAgICAgSW5wdXQuYWN0aW9uICE9PSBcIlNvcnRCeVJhbmtcIiAmJlxyXG4gICAgICAgICAgICAgICAgSW5wdXQuYWN0aW9uICE9PSBcIkRlc2VsZWN0XCIgJiYgKFxyXG4gICAgICAgICAgICAgICAgSW5wdXQuYWN0aW9uLnR5cGUgPT09IFwiRHJhd0Zyb21EZWNrXCIgfHxcclxuICAgICAgICAgICAgICAgIElucHV0LmFjdGlvbi50eXBlID09PSBcIldhaXRpbmdGb3JOZXdDYXJkXCJcclxuICAgICAgICAgICAgKSkge1xyXG4gICAgICAgICAgICAgICAgLy8gc2V0IGluIG9ubW91c2Vtb3ZlXHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodGltZSAtIGRlY2tEZWFsVGltZSA8IGkgKiBkZWNrRGVhbER1cmF0aW9uIC8gZGVja0NvdW50KSB7XHJcbiAgICAgICAgICAgICAgICAvLyBjYXJkIG5vdCB5ZXQgZGVhbHQ7IGtlZXAgdG9wIGxlZnRcclxuICAgICAgICAgICAgICAgIGRlY2tTcHJpdGUucG9zaXRpb24gPSBuZXcgVmVjdG9yKC1WUC5zcHJpdGVXaWR0aCwgLVZQLnNwcml0ZUhlaWdodCk7XHJcbiAgICAgICAgICAgICAgICBkZWNrU3ByaXRlLnRhcmdldCA9IG5ldyBWZWN0b3IoLVZQLnNwcml0ZVdpZHRoLCAtVlAuc3ByaXRlSGVpZ2h0KTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGRlY2tTcHJpdGUudGFyZ2V0ID0gbmV3IFZlY3RvcihcclxuICAgICAgICAgICAgICAgICAgICBWUC5jYW52YXMud2lkdGggLyAyIC0gVlAuc3ByaXRlV2lkdGggLyAyIC0gKGkgLSBkZWNrQ291bnQgLyAyKSAqIFZQLnNwcml0ZURlY2tHYXAsXHJcbiAgICAgICAgICAgICAgICAgICAgVlAuY2FudmFzLmhlaWdodCAvIDIgLSBWUC5zcHJpdGVIZWlnaHQgLyAyXHJcbiAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBkZWNrU3ByaXRlLmFuaW1hdGUoZGVsdGFUaW1lKTtcclxuICAgICAgICB9XHJcbiAgICB9IGZpbmFsbHkge1xyXG4gICAgICAgIFZQLmNvbnRleHQucmVzdG9yZSgpO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiByZW5kZXJPdGhlclBsYXllcnMoZGVsdGFUaW1lOiBudW1iZXIsIGdhbWVTdGF0ZTogTGliLkdhbWVTdGF0ZSkge1xyXG4gICAgVlAuY29udGV4dC5zYXZlKCk7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIFZQLmNvbnRleHQudHJhbnNsYXRlKDAsIChWUC5jYW52YXMud2lkdGggKyBWUC5jYW52YXMuaGVpZ2h0KSAvIDIpO1xyXG4gICAgICAgIFZQLmNvbnRleHQucm90YXRlKC1NYXRoLlBJIC8gMik7XHJcbiAgICAgICAgcmVuZGVyT3RoZXJQbGF5ZXIoZGVsdGFUaW1lLCBnYW1lU3RhdGUsIChnYW1lU3RhdGUucGxheWVySW5kZXggKyAxKSAlIDQpO1xyXG4gICAgfSBmaW5hbGx5IHtcclxuICAgICAgICBWUC5jb250ZXh0LnJlc3RvcmUoKTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgVlAuY29udGV4dC5zYXZlKCk7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIHJlbmRlck90aGVyUGxheWVyKGRlbHRhVGltZSwgZ2FtZVN0YXRlLCAoZ2FtZVN0YXRlLnBsYXllckluZGV4ICsgMikgJSA0KTtcclxuICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgVlAuY29udGV4dC5yZXN0b3JlKCk7XHJcbiAgICB9XHJcblxyXG4gICAgVlAuY29udGV4dC5zYXZlKCk7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIFZQLmNvbnRleHQudHJhbnNsYXRlKFZQLmNhbnZhcy53aWR0aCwgKFZQLmNhbnZhcy5oZWlnaHQgLSBWUC5jYW52YXMud2lkdGgpIC8gMik7XHJcbiAgICAgICAgVlAuY29udGV4dC5yb3RhdGUoTWF0aC5QSSk7XHJcbiAgICAgICAgcmVuZGVyT3RoZXJQbGF5ZXIoZGVsdGFUaW1lLCBnYW1lU3RhdGUsIChnYW1lU3RhdGUucGxheWVySW5kZXggKyAzKSAlIDQpO1xyXG4gICAgfSBmaW5hbGx5IHtcclxuICAgICAgICBWUC5jb250ZXh0LnJlc3RvcmUoKTtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gcmVuZGVyT3RoZXJQbGF5ZXIoZGVsdGFUaW1lOiBudW1iZXIsIGdhbWVTdGF0ZTogTGliLkdhbWVTdGF0ZSwgcGxheWVySW5kZXg6IG51bWJlcikge1xyXG4gICAgY29uc3QgcGxheWVyID0gZ2FtZVN0YXRlLm90aGVyUGxheWVyc1twbGF5ZXJJbmRleF07XHJcbiAgICBpZiAocGxheWVyID09PSB1bmRlZmluZWQpIHJldHVybjtcclxuXHJcbiAgICBWUC5jb250ZXh0LmZpbGxTdHlsZSA9ICcjMDAwMDAwZmYnO1xyXG4gICAgVlAuY29udGV4dC5mb250ID0gYCR7VlAuc3ByaXRlR2FwfXB4IElycmVndWxhcmlzYDtcclxuICAgIFZQLmNvbnRleHQuZmlsbFRleHQocGxheWVyLm5hbWUsIFZQLmNhbnZhcy53aWR0aCAvIDIsIFZQLnNwcml0ZUhlaWdodCArIFZQLnNwcml0ZUdhcCk7XHJcblxyXG4gICAgY29uc3QgZGVja1Bvc2l0aW9uID0gU3RhdGUuZGVja1Nwcml0ZXNbU3RhdGUuZGVja1Nwcml0ZXMubGVuZ3RoIC0gMV0/LnBvc2l0aW9uID8/XHJcbiAgICAgICAgbmV3IFZlY3RvcihWUC5jYW52YXMud2lkdGggLyAyIC0gVlAuc3ByaXRlV2lkdGggLyAyLCBWUC5jYW52YXMuaGVpZ2h0IC8gMiAtIFZQLnNwcml0ZUhlaWdodCAvIDIpO1xyXG4gICAgY29uc3QgZGVja1BvaW50ID0gVlAuY29udGV4dC5nZXRUcmFuc2Zvcm0oKS5pbnZlcnNlKCkudHJhbnNmb3JtUG9pbnQoe1xyXG4gICAgICAgIHc6IDEsXHJcbiAgICAgICAgeDogZGVja1Bvc2l0aW9uLngsXHJcbiAgICAgICAgeTogZGVja1Bvc2l0aW9uLnksXHJcbiAgICAgICAgejogMFxyXG4gICAgfSk7XHJcblxyXG4gICAgbGV0IGkgPSAwO1xyXG4gICAgY29uc3QgZmFjZVNwcml0ZXMgPSBTdGF0ZS5mYWNlU3ByaXRlc0ZvclBsYXllcltwbGF5ZXJJbmRleF07XHJcbiAgICBpZiAoZmFjZVNwcml0ZXMgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICBmb3IgKGNvbnN0IGZhY2VTcHJpdGUgb2YgZmFjZVNwcml0ZXMpIHtcclxuICAgICAgICBmYWNlU3ByaXRlLnRhcmdldCA9IG5ldyBWZWN0b3IoVlAuY2FudmFzLndpZHRoIC8gMiAtIFZQLnNwcml0ZVdpZHRoIC8gMiArIChpKysgLSBmYWNlU3ByaXRlcy5sZW5ndGggLyAyKSAqIFZQLnNwcml0ZUdhcCwgVlAuc3ByaXRlSGVpZ2h0KTtcclxuICAgICAgICBmYWNlU3ByaXRlLmFuaW1hdGUoZGVsdGFUaW1lKTtcclxuICAgIH1cclxuXHJcbiAgICBpID0gMDtcclxuICAgIGNvbnN0IGJhY2tTcHJpdGVzID0gU3RhdGUuYmFja1Nwcml0ZXNGb3JQbGF5ZXJbcGxheWVySW5kZXhdO1xyXG4gICAgaWYgKGJhY2tTcHJpdGVzID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG4gICAgZm9yIChjb25zdCBiYWNrU3ByaXRlIG9mIGJhY2tTcHJpdGVzKSB7XHJcbiAgICAgICAgYmFja1Nwcml0ZS50YXJnZXQgPSBuZXcgVmVjdG9yKFZQLmNhbnZhcy53aWR0aCAvIDIgLSBWUC5zcHJpdGVXaWR0aCAvIDIgKyAoaSsrIC0gYmFja1Nwcml0ZXMubGVuZ3RoIC8gMikgKiBWUC5zcHJpdGVHYXAsIDApO1xyXG4gICAgICAgIGJhY2tTcHJpdGUuYW5pbWF0ZShkZWx0YVRpbWUpO1xyXG4gICAgfVxyXG59XHJcblxyXG4vLyByZXR1cm5zIHRoZSBhZGp1c3RlZCByZXZlYWwgaW5kZXhcclxuZnVuY3Rpb24gcmVuZGVyUGxheWVyKGRlbHRhVGltZTogbnVtYmVyLCBnYW1lU3RhdGU6IExpYi5HYW1lU3RhdGUpIHtcclxuICAgIGNvbnN0IHNwcml0ZXMgPSBTdGF0ZS5mYWNlU3ByaXRlc0ZvclBsYXllcltnYW1lU3RhdGUucGxheWVySW5kZXhdO1xyXG4gICAgaWYgKHNwcml0ZXMgPT09IHVuZGVmaW5lZCkgcmV0dXJuO1xyXG5cclxuICAgIGxldCBpID0gMDtcclxuICAgIGZvciAoY29uc3Qgc3ByaXRlIG9mIHNwcml0ZXMpIHtcclxuICAgICAgICBzcHJpdGUuYW5pbWF0ZShkZWx0YVRpbWUpO1xyXG5cclxuICAgICAgICBpZiAoTGliLmJpbmFyeVNlYXJjaE51bWJlcihTdGF0ZS5zZWxlY3RlZEluZGljZXMsIGkrKykgPj0gMCkge1xyXG4gICAgICAgICAgICBWUC5jb250ZXh0LmZpbGxTdHlsZSA9ICcjMDA4MDgwNDAnO1xyXG4gICAgICAgICAgICBWUC5jb250ZXh0LmZpbGxSZWN0KHNwcml0ZS5wb3NpdGlvbi54LCBzcHJpdGUucG9zaXRpb24ueSwgVlAuc3ByaXRlV2lkdGgsIFZQLnNwcml0ZUhlaWdodCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiByZW5kZXJCdXR0b25zKCkge1xyXG4gICAgVlAuY29udGV4dC5zYXZlKCk7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIC8vIGJsdXIgaW1hZ2UgYmVoaW5kXHJcbiAgICAgICAgLy9zdGFja0JsdXJDYW52YXNSR0JBKCdjYW52YXMnLCB4LCB5LCBjYW52YXMud2lkdGggLSB4LCBjYW52YXMuaGVpZ2h0IC0geSwgMTYpO1xyXG5cclxuICAgICAgICBjb25zdCB4ID0gVlAuc29ydEJ5U3VpdEJvdW5kc1swXS54IC0gNCAqIFZQLnBpeGVsc1BlckNNO1xyXG4gICAgICAgIGNvbnN0IHkgPSBWUC5zb3J0QnlTdWl0Qm91bmRzWzBdLnk7XHJcbiAgICAgICAgVlAuY29udGV4dC5maWxsU3R5bGUgPSAnIzAwZmZmZjc3JztcclxuICAgICAgICBWUC5jb250ZXh0LmZpbGxSZWN0KHgsIHksIFZQLmNhbnZhcy53aWR0aCAtIHgsIFZQLmNhbnZhcy5oZWlnaHQgLSB5KTtcclxuICAgICAgICBcclxuICAgICAgICBWUC5jb250ZXh0LmZpbGxTdHlsZSA9ICcjMDAwMDAwZmYnO1xyXG4gICAgICAgIFZQLmNvbnRleHQuZm9udCA9ICcxLjVjbSBJcnJlZ3VsYXJpcyc7XHJcbiAgICAgICAgVlAuY29udGV4dC5maWxsVGV4dCgnU09SVCcsIHggKyAwLjI1ICogVlAucGl4ZWxzUGVyQ00sIHkgKyAyLjI1ICogVlAucGl4ZWxzUGVyQ00pO1xyXG5cclxuICAgICAgICBWUC5jb250ZXh0LmZvbnQgPSAnM2NtIElycmVndWxhcmlzJztcclxuICAgICAgICBWUC5jb250ZXh0LmZpbGxUZXh0KCd7JywgeCArIDMgKiBWUC5waXhlbHNQZXJDTSwgeSArIDIuNzUgKiBWUC5waXhlbHNQZXJDTSk7XHJcblxyXG4gICAgICAgIFZQLmNvbnRleHQuZm9udCA9ICcxLjVjbSBJcnJlZ3VsYXJpcyc7XHJcbiAgICAgICAgVlAuY29udGV4dC5maWxsVGV4dCgnU1VJVCcsIFZQLnNvcnRCeVN1aXRCb3VuZHNbMF0ueCwgVlAuc29ydEJ5U3VpdEJvdW5kc1sxXS55KTtcclxuXHJcbiAgICAgICAgVlAuY29udGV4dC5mb250ID0gJzEuNWNtIElycmVndWxhcmlzJztcclxuICAgICAgICBWUC5jb250ZXh0LmZpbGxUZXh0KCdSQU5LJywgVlAuc29ydEJ5UmFua0JvdW5kc1swXS54LCBWUC5zb3J0QnlSYW5rQm91bmRzWzFdLnkpO1xyXG5cclxuICAgICAgICAvL2NvbnRleHQuZmlsbFN0eWxlID0gJyNmZjAwMDA3Nyc7XHJcbiAgICAgICAgLy9jb250ZXh0LmZpbGxSZWN0KFZQLnNvcnRCeVN1aXRCb3VuZHNbMF0ueCwgVlAuc29ydEJ5U3VpdEJvdW5kc1swXS55LFxyXG4gICAgICAgICAgICAvL3NvcnRCeVN1aXRCb3VuZHNbMV0ueCAtIHNvcnRCeVN1aXRCb3VuZHNbMF0ueCwgc29ydEJ5U3VpdEJvdW5kc1sxXS55IC0gc29ydEJ5U3VpdEJvdW5kc1swXS55KTtcclxuXHJcbiAgICAgICAgLy9jb250ZXh0LmZpbGxTdHlsZSA9ICcjMDAwMGZmNzcnO1xyXG4gICAgICAgIC8vY29udGV4dC5maWxsUmVjdChzb3J0QnlSYW5rQm91bmRzWzBdLngsIHNvcnRCeVJhbmtCb3VuZHNbMF0ueSxcclxuICAgICAgICAgICAgLy9zb3J0QnlSYW5rQm91bmRzWzFdLnggLSBzb3J0QnlSYW5rQm91bmRzWzBdLngsIHNvcnRCeVJhbmtCb3VuZHNbMV0ueSAtIHNvcnRCeVJhbmtCb3VuZHNbMF0ueSk7XHJcbiAgICB9IGZpbmFsbHkge1xyXG4gICAgICAgIFZQLmNvbnRleHQucmVzdG9yZSgpO1xyXG4gICAgfVxyXG59XHJcbiIsImltcG9ydCBWZWN0b3IgZnJvbSAnLi92ZWN0b3InO1xyXG5pbXBvcnQgKiBhcyBWUCBmcm9tICcuL3ZpZXctcGFyYW1zJztcclxuXHJcbmNvbnN0IHNwcmluZ0NvbnN0YW50ID0gMTAwMDtcclxuY29uc3QgbWFzcyA9IDE7XHJcbmNvbnN0IGRyYWcgPSBNYXRoLnNxcnQoNCAqIG1hc3MgKiBzcHJpbmdDb25zdGFudCk7XHJcblxyXG4vLyBzdGF0ZSBmb3IgcGh5c2ljcy1iYXNlZCBhbmltYXRpb25zXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFNwcml0ZSB7XHJcbiAgICBpbWFnZTogSFRNTEltYWdlRWxlbWVudDtcclxuICAgIHRhcmdldDogVmVjdG9yO1xyXG4gICAgcG9zaXRpb246IFZlY3RvcjtcclxuICAgIHZlbG9jaXR5OiBWZWN0b3I7XHJcblxyXG4gICAgLy9iYWQgPSBmYWxzZTtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihpbWFnZTogSFRNTEltYWdlRWxlbWVudCkge1xyXG4gICAgICAgIHRoaXMuaW1hZ2UgPSBpbWFnZTtcclxuICAgICAgICB0aGlzLnRhcmdldCA9IG5ldyBWZWN0b3IoMCwgMCk7XHJcbiAgICAgICAgdGhpcy5wb3NpdGlvbiA9IG5ldyBWZWN0b3IoMCwgMCk7XHJcbiAgICAgICAgdGhpcy52ZWxvY2l0eSA9IG5ldyBWZWN0b3IoMCwgMCk7XHJcbiAgICB9XHJcblxyXG4gICAgYW5pbWF0ZShkZWx0YVRpbWU6IG51bWJlcikge1xyXG4gICAgICAgIGNvbnN0IHNwcmluZ0ZvcmNlID0gdGhpcy50YXJnZXQuc3ViKHRoaXMucG9zaXRpb24pLnNjYWxlKHNwcmluZ0NvbnN0YW50KTtcclxuICAgICAgICBjb25zdCBkcmFnRm9yY2UgPSB0aGlzLnZlbG9jaXR5LnNjYWxlKC1kcmFnKTtcclxuICAgICAgICBjb25zdCBhY2NlbGVyYXRpb24gPSBzcHJpbmdGb3JjZS5hZGQoZHJhZ0ZvcmNlKS5zY2FsZSgxIC8gbWFzcyk7XHJcblxyXG4gICAgICAgIC8vY29uc3Qgc2F2ZWRWZWxvY2l0eSA9IHRoaXMudmVsb2NpdHk7XHJcbiAgICAgICAgLy9jb25zdCBzYXZlZFBvc2l0aW9uID0gdGhpcy5wb3NpdGlvbjtcclxuICAgICAgICBcclxuICAgICAgICB0aGlzLnZlbG9jaXR5ID0gdGhpcy52ZWxvY2l0eS5hZGQoYWNjZWxlcmF0aW9uLnNjYWxlKGRlbHRhVGltZSAvIDEwMDApKTtcclxuICAgICAgICB0aGlzLnBvc2l0aW9uID0gdGhpcy5wb3NpdGlvbi5hZGQodGhpcy52ZWxvY2l0eS5zY2FsZShkZWx0YVRpbWUgLyAxMDAwKSk7XHJcblxyXG4gICAgICAgIC8qXHJcbiAgICAgICAgaWYgKCF0aGlzLmJhZCAmJiAoXHJcbiAgICAgICAgICAgICFpc0Zpbml0ZSh0aGlzLnZlbG9jaXR5LngpIHx8IGlzTmFOKHRoaXMudmVsb2NpdHkueCkgfHxcclxuICAgICAgICAgICAgIWlzRmluaXRlKHRoaXMudmVsb2NpdHkueSkgfHwgaXNOYU4odGhpcy52ZWxvY2l0eS55KSB8fFxyXG4gICAgICAgICAgICAhaXNGaW5pdGUodGhpcy5wb3NpdGlvbi54KSB8fCBpc05hTih0aGlzLnBvc2l0aW9uLngpIHx8XHJcbiAgICAgICAgICAgICFpc0Zpbml0ZSh0aGlzLnBvc2l0aW9uLnkpIHx8IGlzTmFOKHRoaXMucG9zaXRpb24ueSlcclxuICAgICAgICApKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYmFkID0gdHJ1ZTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBkZWx0YVRpbWU6ICR7ZGVsdGFUaW1lfSwgc3ByaW5nRm9yY2U6ICR7SlNPTi5zdHJpbmdpZnkoc3ByaW5nRm9yY2UpfSwgZHJhZ0ZvcmNlOiAke0pTT04uc3RyaW5naWZ5KGRyYWdGb3JjZSl9YCk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGB0YXJnZXQ6ICR7SlNPTi5zdHJpbmdpZnkodGhpcy50YXJnZXQpfSwgcG9zaXRpb246ICR7SlNPTi5zdHJpbmdpZnkoc2F2ZWRQb3NpdGlvbil9LCB2ZWxvY2l0eTogJHtKU09OLnN0cmluZ2lmeShzYXZlZFZlbG9jaXR5KX0sIGFjY2VsZXJhdGlvbjogJHtKU09OLnN0cmluZ2lmeShhY2NlbGVyYXRpb24pfWApO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgbmV3IHBvc2l0aW9uOiAke0pTT04uc3RyaW5naWZ5KHRoaXMucG9zaXRpb24pfSwgbmV3IHZlbG9jaXR5OiAke0pTT04uc3RyaW5naWZ5KHRoaXMudmVsb2NpdHkpfWApO1xyXG4gICAgICAgIH1cclxuICAgICAgICAqL1xyXG5cclxuICAgICAgICBWUC5jb250ZXh0LmRyYXdJbWFnZSh0aGlzLmltYWdlLCB0aGlzLnBvc2l0aW9uLngsIHRoaXMucG9zaXRpb24ueSwgVlAuc3ByaXRlV2lkdGgsIFZQLnNwcml0ZUhlaWdodCk7XHJcbiAgICB9XHJcbn0iLCJpbXBvcnQgeyBNdXRleCB9IGZyb20gJ2F3YWl0LXNlbWFwaG9yZSc7XHJcblxyXG5pbXBvcnQgKiBhcyBMaWIgZnJvbSAnLi4vbGliJztcclxuaW1wb3J0ICogYXMgQ2FyZEltYWdlcyBmcm9tICcuL2NhcmQtaW1hZ2VzJztcclxuaW1wb3J0ICogYXMgVlAgZnJvbSAnLi92aWV3LXBhcmFtcyc7XHJcbmltcG9ydCBTcHJpdGUgZnJvbSAnLi9zcHJpdGUnO1xyXG5pbXBvcnQgVmVjdG9yIGZyb20gJy4vdmVjdG9yJztcclxuXHJcbmNvbnN0IHBsYXllck5hbWVGcm9tQ29va2llID0gTGliLmdldENvb2tpZSgncGxheWVyTmFtZScpO1xyXG5pZiAocGxheWVyTmFtZUZyb21Db29raWUgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCdObyBwbGF5ZXIgbmFtZSEnKTtcclxuZXhwb3J0IGNvbnN0IHBsYXllck5hbWUgPSBwbGF5ZXJOYW1lRnJvbUNvb2tpZTtcclxuXHJcbmNvbnN0IGdhbWVJZEZyb21Db29raWUgPSBMaWIuZ2V0Q29va2llKCdnYW1lSWQnKTtcclxuaWYgKGdhbWVJZEZyb21Db29raWUgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCdObyBnYW1lIGlkIScpO1xyXG5leHBvcnQgY29uc3QgZ2FtZUlkID0gZ2FtZUlkRnJvbUNvb2tpZTtcclxuXHJcbi8vIHNvbWUgc3RhdGUtbWFuaXB1bGF0aW5nIG9wZXJhdGlvbnMgYXJlIGFzeW5jaHJvbm91cywgc28gd2UgbmVlZCB0byBndWFyZCBhZ2FpbnN0IHJhY2VzXHJcbmNvbnN0IHN0YXRlTXV0ZXggPSBuZXcgTXV0ZXgoKTtcclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxvY2soKTogUHJvbWlzZTwoKSA9PiB2b2lkPiB7XHJcbiAgICAvL2NvbnNvbGUubG9nKGBhY3F1aXJpbmcgc3RhdGUgbG9jay4uLlxcbiR7bmV3IEVycm9yKCkuc3RhY2t9YCk7XHJcbiAgICBjb25zdCByZWxlYXNlID0gYXdhaXQgc3RhdGVNdXRleC5hY3F1aXJlKCk7XHJcbiAgICAvL2NvbnNvbGUubG9nKGBhY3F1aXJlZCBzdGF0ZSBsb2NrXFxuJHtuZXcgRXJyb3IoKS5zdGFja31gKTtcclxuICAgIHJldHVybiAoKSA9PiB7XHJcbiAgICAgICAgcmVsZWFzZSgpO1xyXG4gICAgICAgIC8vY29uc29sZS5sb2coYHJlbGVhc2VkIHN0YXRlIGxvY2tgKTtcclxuICAgIH07XHJcbn1cclxuXHJcbi8vIHdlIG5lZWQgdG8ga2VlcCBhIGNvcHkgb2YgdGhlIHByZXZpb3VzIGdhbWUgc3RhdGUgYXJvdW5kIGZvciBib29ra2VlcGluZyBwdXJwb3Nlc1xyXG5leHBvcnQgbGV0IHByZXZpb3VzR2FtZVN0YXRlOiBMaWIuR2FtZVN0YXRlIHwgdW5kZWZpbmVkO1xyXG4vLyB0aGUgbW9zdCByZWNlbnRseSByZWNlaXZlZCBnYW1lIHN0YXRlLCBpZiBhbnlcclxuZXhwb3J0IGxldCBnYW1lU3RhdGU6IExpYi5HYW1lU3RhdGUgfCB1bmRlZmluZWQ7XHJcblxyXG4vLyBpbmRpY2VzIG9mIGNhcmRzIGZvciBkcmFnICYgZHJvcFxyXG4vLyBJTVBPUlRBTlQ6IHRoaXMgYXJyYXkgbXVzdCBhbHdheXMgYmUgc29ydGVkIVxyXG4vLyBBbHdheXMgdXNlIGJpbmFyeVNlYXJjaCB0byBpbnNlcnQgYW5kIGRlbGV0ZSBvciBzb3J0IGFmdGVyIG1hbmlwdWxhdGlvblxyXG5leHBvcnQgY29uc3Qgc2VsZWN0ZWRJbmRpY2VzOiBudW1iZXJbXSA9IFtdO1xyXG5cclxuLy8gZm9yIGFuaW1hdGluZyB0aGUgZGVja1xyXG5leHBvcnQgbGV0IGRlY2tTcHJpdGVzOiBTcHJpdGVbXSA9IFtdO1xyXG5cclxuLy8gYXNzb2NpYXRpdmUgYXJyYXlzLCBvbmUgZm9yIGVhY2ggcGxheWVyIGF0IHRoZWlyIHBsYXllciBpbmRleFxyXG4vLyBlYWNoIGVsZW1lbnQgY29ycmVzcG9uZHMgdG8gYSBmYWNlLWRvd24gY2FyZCBieSBpbmRleFxyXG5leHBvcnQgbGV0IGJhY2tTcHJpdGVzRm9yUGxheWVyOiBTcHJpdGVbXVtdID0gW107XHJcbi8vIGVhY2ggZWxlbWVudCBjb3JyZXNwb25kcyB0byBhIGZhY2UtdXAgY2FyZCBieSBpbmRleFxyXG5leHBvcnQgbGV0IGZhY2VTcHJpdGVzRm9yUGxheWVyOiBTcHJpdGVbXVtdID0gW107XHJcblxyXG4vLyBvcGVuIHdlYnNvY2tldCBjb25uZWN0aW9uIHRvIGdldCBnYW1lIHN0YXRlIHVwZGF0ZXNcclxubGV0IHdzID0gbmV3IFdlYlNvY2tldChgd3NzOi8vJHt3aW5kb3cubG9jYXRpb24uaG9zdG5hbWV9L2ApO1xyXG5cclxuY29uc3QgY2FsbGJhY2tzRm9yTWV0aG9kTmFtZSA9IG5ldyBNYXA8TGliLk1ldGhvZE5hbWUsICgocmVzdWx0OiBMaWIuTWV0aG9kUmVzdWx0KSA9PiB2b2lkKVtdPigpO1xyXG5mdW5jdGlvbiBhZGRDYWxsYmFjayhtZXRob2ROYW1lOiBMaWIuTWV0aG9kTmFtZSwgcmVzb2x2ZTogKCkgPT4gdm9pZCwgcmVqZWN0OiAocmVhc29uOiBhbnkpID0+IHZvaWQpIHtcclxuICAgIGNvbnNvbGUubG9nKGBhZGRpbmcgY2FsbGJhY2sgZm9yIG1ldGhvZCAnJHttZXRob2ROYW1lfSdgKTtcclxuXHJcbiAgICBsZXQgY2FsbGJhY2tzID0gY2FsbGJhY2tzRm9yTWV0aG9kTmFtZS5nZXQobWV0aG9kTmFtZSk7XHJcbiAgICBpZiAoY2FsbGJhY2tzID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICBjYWxsYmFja3MgPSBbXTtcclxuICAgICAgICBjYWxsYmFja3NGb3JNZXRob2ROYW1lLnNldChtZXRob2ROYW1lLCBjYWxsYmFja3MpO1xyXG4gICAgfVxyXG5cclxuICAgIGNhbGxiYWNrcy5wdXNoKHJlc3VsdCA9PiB7XHJcbiAgICAgICAgY29uc29sZS5sb2coYGludm9raW5nIGNhbGxiYWNrIGZvciBtZXRob2QgJyR7bWV0aG9kTmFtZX0nYCk7XHJcbiAgICAgICAgaWYgKCdlcnJvckRlc2NyaXB0aW9uJyBpbiByZXN1bHQpIHtcclxuICAgICAgICAgICAgcmVqZWN0KHJlc3VsdC5lcnJvckRlc2NyaXB0aW9uKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICByZXNvbHZlKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcbn1cclxuXHJcbndzLm9ubWVzc2FnZSA9IGFzeW5jIGUgPT4ge1xyXG4gICAgY29uc3Qgb2JqID0gSlNPTi5wYXJzZShlLmRhdGEpO1xyXG4gICAgaWYgKCdtZXRob2ROYW1lJyBpbiBvYmopIHtcclxuICAgICAgICBjb25zdCByZXR1cm5NZXNzYWdlID0gPExpYi5NZXRob2RSZXN1bHQ+b2JqO1xyXG4gICAgICAgIGNvbnN0IG1ldGhvZE5hbWUgPSByZXR1cm5NZXNzYWdlLm1ldGhvZE5hbWU7XHJcbiAgICAgICAgY29uc3QgY2FsbGJhY2tzID0gY2FsbGJhY2tzRm9yTWV0aG9kTmFtZS5nZXQobWV0aG9kTmFtZSk7XHJcbiAgICAgICAgaWYgKGNhbGxiYWNrcyA9PT0gdW5kZWZpbmVkIHx8IGNhbGxiYWNrcy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBubyBjYWxsYmFja3MgZm91bmQgZm9yIG1ldGhvZDogJHttZXRob2ROYW1lfWApO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgY2FsbGJhY2sgPSBjYWxsYmFja3Muc2hpZnQoKTtcclxuICAgICAgICBpZiAoY2FsbGJhY2sgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGNhbGxiYWNrIGlzIHVuZGVmaW5lZCBmb3IgbWV0aG9kOiAke21ldGhvZE5hbWV9YCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIGNhbGxiYWNrKHJldHVybk1lc3NhZ2UpO1xyXG4gICAgfSBlbHNlIGlmIChcclxuICAgICAgICAnZGVja0NvdW50JyBpbiBvYmogJiZcclxuICAgICAgICAnYWN0aXZlUGxheWVySW5kZXgnIGluIG9iaiAmJlxyXG4gICAgICAgICdwbGF5ZXJJbmRleCcgaW4gb2JqICYmXHJcbiAgICAgICAgJ3BsYXllckNhcmRzJyBpbiBvYmogJiZcclxuICAgICAgICAncGxheWVyUmV2ZWFsQ291bnQnIGluIG9iaiAmJlxyXG4gICAgICAgICdvdGhlclBsYXllcnMnIGluIG9ialxyXG4gICAgKSB7XHJcbiAgICAgICAgY29uc3QgdW5sb2NrID0gYXdhaXQgbG9jaygpO1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIHByZXZpb3VzR2FtZVN0YXRlID0gZ2FtZVN0YXRlO1xyXG4gICAgICAgICAgICBnYW1lU3RhdGUgPSA8TGliLkdhbWVTdGF0ZT5vYmo7XHJcblxyXG4gICAgICAgICAgICBpZiAocHJldmlvdXNHYW1lU3RhdGUgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYHByZXZpb3VzR2FtZVN0YXRlLnBsYXllckNhcmRzOiAke0pTT04uc3RyaW5naWZ5KHByZXZpb3VzR2FtZVN0YXRlLnBsYXllckNhcmRzKX1gKTtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBwcmV2aW91cyBzZWxlY3RlZEluZGljZXM6ICR7SlNPTi5zdHJpbmdpZnkoc2VsZWN0ZWRJbmRpY2VzKX1gKTtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBwcmV2aW91cyBzZWxlY3RlZENhcmRzOiAke0pTT04uc3RyaW5naWZ5KHNlbGVjdGVkSW5kaWNlcy5tYXAoaSA9PiBwcmV2aW91c0dhbWVTdGF0ZT8ucGxheWVyQ2FyZHNbaV0pKX1gKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gc2VsZWN0ZWQgaW5kaWNlcyBtaWdodCBoYXZlIHNoaWZ0ZWRcclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzZWxlY3RlZEluZGljZXMubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHNlbGVjdGVkSW5kZXggPSBzZWxlY3RlZEluZGljZXNbaV07XHJcbiAgICAgICAgICAgICAgICBpZiAoc2VsZWN0ZWRJbmRleCA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoSlNPTi5zdHJpbmdpZnkoZ2FtZVN0YXRlLnBsYXllckNhcmRzW3NlbGVjdGVkSW5kZXhdKSAhPT0gSlNPTi5zdHJpbmdpZnkocHJldmlvdXNHYW1lU3RhdGU/LnBsYXllckNhcmRzW3NlbGVjdGVkSW5kZXhdKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBmb3VuZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgZ2FtZVN0YXRlLnBsYXllckNhcmRzLmxlbmd0aDsgKytqKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChKU09OLnN0cmluZ2lmeShnYW1lU3RhdGUucGxheWVyQ2FyZHNbal0pID09PSBKU09OLnN0cmluZ2lmeShwcmV2aW91c0dhbWVTdGF0ZT8ucGxheWVyQ2FyZHNbc2VsZWN0ZWRJbmRleF0pKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZEluZGljZXNbaV0gPSBqO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm91bmQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmICghZm91bmQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWRJbmRpY2VzLnNwbGljZShpLCAxKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLS1pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gYmluYXJ5IHNlYXJjaCBzdGlsbCBuZWVkcyB0byB3b3JrXHJcbiAgICAgICAgICAgIHNlbGVjdGVkSW5kaWNlcy5zb3J0KChhLCBiKSA9PiBhIC0gYik7XHJcblxyXG4gICAgICAgICAgICAvLyBpbml0aWFsaXplIGFuaW1hdGlvbiBzdGF0ZXNcclxuICAgICAgICAgICAgYXNzb2NpYXRlQW5pbWF0aW9uc1dpdGhDYXJkcyhwcmV2aW91c0dhbWVTdGF0ZSwgZ2FtZVN0YXRlKTtcclxuXHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBnYW1lU3RhdGUucGxheWVyQ2FyZHM6ICR7SlNPTi5zdHJpbmdpZnkoZ2FtZVN0YXRlLnBsYXllckNhcmRzKX1gKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coYHNlbGVjdGVkSW5kaWNlczogJHtKU09OLnN0cmluZ2lmeShzZWxlY3RlZEluZGljZXMpfWApO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgc2VsZWN0ZWRDYXJkczogJHtKU09OLnN0cmluZ2lmeShzZWxlY3RlZEluZGljZXMubWFwKGkgPT4gZ2FtZVN0YXRlPy5wbGF5ZXJDYXJkc1tpXSkpfWApO1xyXG4gICAgICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgICAgIHVubG9jaygpO1xyXG4gICAgICAgIH1cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKEpTT04uc3RyaW5naWZ5KGUuZGF0YSkpO1xyXG4gICAgfVxyXG59O1xyXG5cclxubGV0IG9uQW5pbWF0aW9uc0Fzc29jaWF0ZWQgPSAoKSA9PiB7fTtcclxuXHJcbmZ1bmN0aW9uIGFzc29jaWF0ZUFuaW1hdGlvbnNXaXRoQ2FyZHMocHJldmlvdXNHYW1lU3RhdGU6IExpYi5HYW1lU3RhdGUgfCB1bmRlZmluZWQsIGdhbWVTdGF0ZTogTGliLkdhbWVTdGF0ZSkge1xyXG4gICAgZGVja1Nwcml0ZXMuc3BsaWNlKGdhbWVTdGF0ZS5kZWNrQ291bnQsIGRlY2tTcHJpdGVzLmxlbmd0aCAtIGdhbWVTdGF0ZS5kZWNrQ291bnQpO1xyXG4gICAgZm9yIChsZXQgaSA9IGRlY2tTcHJpdGVzLmxlbmd0aDsgaSA8IGdhbWVTdGF0ZS5kZWNrQ291bnQ7ICsraSkge1xyXG4gICAgICAgIGRlY2tTcHJpdGVzW2ldID0gbmV3IFNwcml0ZShDYXJkSW1hZ2VzLmdldCgnQmFjazAnKSk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgcHJldmlvdXNCYWNrU3ByaXRlc0ZvclBsYXllciA9IGJhY2tTcHJpdGVzRm9yUGxheWVyO1xyXG4gICAgYmFja1Nwcml0ZXNGb3JQbGF5ZXIgPSBbXTtcclxuXHJcbiAgICAvLyByZXVzZSBwcmV2aW91cyBmYWNlIHNwcml0ZXMgYXMgbXVjaCBhcyBwb3NzaWJsZSB0byBtYWludGFpbiBjb250aW51aXR5XHJcbiAgICBjb25zdCBwcmV2aW91c0ZhY2VTcHJpdGVzRm9yUGxheWVyID0gZmFjZVNwcml0ZXNGb3JQbGF5ZXI7XHJcbiAgICBmYWNlU3ByaXRlc0ZvclBsYXllciA9IFtdO1xyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgNDsgKytpKSB7XHJcbiAgICAgICAgbGV0IHByZXZpb3VzRmFjZUNhcmRzOiBMaWIuQ2FyZFtdO1xyXG4gICAgICAgIGxldCBmYWNlQ2FyZHM6IExpYi5DYXJkW107XHJcblxyXG4gICAgICAgIGxldCBwcmV2aW91c0JhY2tTcHJpdGVzOiBTcHJpdGVbXSA9IHByZXZpb3VzQmFja1Nwcml0ZXNGb3JQbGF5ZXJbaV0gPz8gW107XHJcbiAgICAgICAgbGV0IGJhY2tTcHJpdGVzOiBTcHJpdGVbXSA9IFtdO1xyXG4gICAgICAgIGJhY2tTcHJpdGVzRm9yUGxheWVyW2ldID0gYmFja1Nwcml0ZXM7XHJcbiAgICAgICAgaWYgKGkgPT0gZ2FtZVN0YXRlLnBsYXllckluZGV4KSB7XHJcbiAgICAgICAgICAgIHByZXZpb3VzRmFjZUNhcmRzID0gcHJldmlvdXNHYW1lU3RhdGU/LnBsYXllckNhcmRzID8/IFtdO1xyXG4gICAgICAgICAgICBmYWNlQ2FyZHMgPSBnYW1lU3RhdGUucGxheWVyQ2FyZHM7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgbGV0IHByZXZpb3VzT3RoZXJQbGF5ZXIgPSBwcmV2aW91c0dhbWVTdGF0ZT8ub3RoZXJQbGF5ZXJzW2ldO1xyXG4gICAgICAgICAgICBsZXQgb3RoZXJQbGF5ZXIgPSBnYW1lU3RhdGUub3RoZXJQbGF5ZXJzW2ldO1xyXG5cclxuICAgICAgICAgICAgcHJldmlvdXNGYWNlQ2FyZHMgPSBwcmV2aW91c090aGVyUGxheWVyPy5yZXZlYWxlZENhcmRzID8/IFtdOyAgXHJcbiAgICAgICAgICAgIGZhY2VDYXJkcyA9IG90aGVyUGxheWVyPy5yZXZlYWxlZENhcmRzID8/IFtdO1xyXG5cclxuICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCAob3RoZXJQbGF5ZXI/LmNhcmRDb3VudCA/PyAwKSAtIChvdGhlclBsYXllcj8ucmV2ZWFsZWRDYXJkcz8ubGVuZ3RoID8/IDApOyArK2opIHtcclxuICAgICAgICAgICAgICAgIGJhY2tTcHJpdGVzW2pdID0gbmV3IFNwcml0ZShDYXJkSW1hZ2VzLmdldChgQmFjayR7aX1gKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBwcmV2aW91c0ZhY2VTcHJpdGVzOiBTcHJpdGVbXSA9IHByZXZpb3VzRmFjZVNwcml0ZXNGb3JQbGF5ZXJbaV0gPz8gW107XHJcbiAgICAgICAgbGV0IGZhY2VTcHJpdGVzOiBTcHJpdGVbXSA9IFtdO1xyXG4gICAgICAgIGZhY2VTcHJpdGVzRm9yUGxheWVyW2ldID0gZmFjZVNwcml0ZXM7XHJcbiAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBmYWNlQ2FyZHMubGVuZ3RoOyArK2opIHtcclxuICAgICAgICAgICAgbGV0IGZvdW5kID0gZmFsc2U7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGsgPSAwOyBrIDwgcHJldmlvdXNGYWNlQ2FyZHMubGVuZ3RoOyArK2spIHtcclxuICAgICAgICAgICAgICAgIGlmIChKU09OLnN0cmluZ2lmeShmYWNlQ2FyZHNbal0pID09PSBKU09OLnN0cmluZ2lmeShwcmV2aW91c0ZhY2VDYXJkc1trXSkpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBwcmV2aW91c0ZhY2VTcHJpdGUgPSBwcmV2aW91c0ZhY2VTcHJpdGVzW2tdO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChwcmV2aW91c0ZhY2VTcHJpdGUgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgZmFjZVNwcml0ZXNbal0gPSBwcmV2aW91c0ZhY2VTcHJpdGU7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gcmVtb3ZlIHRvIGF2b2lkIGFzc29jaWF0aW5nIGFub3RoZXIgc3ByaXRlIHdpdGggdGhlIHNhbWUgY2FyZFxyXG4gICAgICAgICAgICAgICAgICAgIHByZXZpb3VzRmFjZVNwcml0ZXMuc3BsaWNlKGssIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIHByZXZpb3VzRmFjZUNhcmRzLnNwbGljZShrLCAxKTtcclxuICAgICAgICAgICAgICAgICAgICBmb3VuZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICghZm91bmQpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGZhY2VDYXJkID0gZmFjZUNhcmRzW2pdO1xyXG4gICAgICAgICAgICAgICAgaWYgKGZhY2VDYXJkID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG4gICAgICAgICAgICAgICAgZmFjZVNwcml0ZXNbal0gPSBuZXcgU3ByaXRlKENhcmRJbWFnZXMuZ2V0KEpTT04uc3RyaW5naWZ5KGZhY2VDYXJkKSkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHNldFNwcml0ZVRhcmdldHMoZ2FtZVN0YXRlKTtcclxuICAgIFxyXG4gICAgb25BbmltYXRpb25zQXNzb2NpYXRlZCgpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc2V0U3ByaXRlVGFyZ2V0cyhcclxuICAgIGdhbWVTdGF0ZTogTGliLkdhbWVTdGF0ZSxcclxuICAgIHJlc2VydmVkU3ByaXRlc0FuZENhcmRzPzogW1Nwcml0ZSwgTGliLkNhcmRdW10sXHJcbiAgICBtb3ZpbmdTcHJpdGVzQW5kQ2FyZHM/OiBbU3ByaXRlLCBMaWIuQ2FyZF1bXSxcclxuICAgIHJldmVhbENvdW50PzogbnVtYmVyLFxyXG4gICAgc3BsaXRJbmRleD86IG51bWJlcixcclxuICAgIHJldHVyblRvRGVjaz86IGJvb2xlYW5cclxuKSB7XHJcbiAgICBjb25zdCBzcHJpdGVzID0gZmFjZVNwcml0ZXNGb3JQbGF5ZXJbZ2FtZVN0YXRlLnBsYXllckluZGV4XTtcclxuICAgIGlmIChzcHJpdGVzID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG5cclxuICAgIGNvbnN0IGNhcmRzID0gZ2FtZVN0YXRlLnBsYXllckNhcmRzO1xyXG5cclxuICAgIHJlc2VydmVkU3ByaXRlc0FuZENhcmRzID0gcmVzZXJ2ZWRTcHJpdGVzQW5kQ2FyZHMgPz8gY2FyZHMubWFwKChjYXJkLCBpbmRleCkgPT4gPFtTcHJpdGUsIExpYi5DYXJkXT5bc3ByaXRlc1tpbmRleF0sIGNhcmRdKTtcclxuICAgIG1vdmluZ1Nwcml0ZXNBbmRDYXJkcyA9IG1vdmluZ1Nwcml0ZXNBbmRDYXJkcyA/PyBbXTtcclxuICAgIHJldmVhbENvdW50ID0gcmV2ZWFsQ291bnQgPz8gZ2FtZVN0YXRlLnBsYXllclJldmVhbENvdW50O1xyXG4gICAgc3BsaXRJbmRleCA9IHNwbGl0SW5kZXggPz8gY2FyZHMubGVuZ3RoO1xyXG4gICAgcmV0dXJuVG9EZWNrID0gcmV0dXJuVG9EZWNrID8/IGZhbHNlO1xyXG5cclxuICAgIC8vIGNsZWFyIGZvciByZWluc2VydGlvblxyXG4gICAgc3ByaXRlcy5zcGxpY2UoMCwgc3ByaXRlcy5sZW5ndGgpO1xyXG4gICAgY2FyZHMuc3BsaWNlKDAsIGNhcmRzLmxlbmd0aCk7XHJcblxyXG4gICAgZm9yIChjb25zdCBbcmVzZXJ2ZWRTcHJpdGUsIHJlc2VydmVkQ2FyZF0gb2YgcmVzZXJ2ZWRTcHJpdGVzQW5kQ2FyZHMpIHtcclxuICAgICAgICBpZiAoY2FyZHMubGVuZ3RoID09PSBzcGxpdEluZGV4KSB7XHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgW21vdmluZ1Nwcml0ZSwgbW92aW5nQ2FyZF0gb2YgbW92aW5nU3ByaXRlc0FuZENhcmRzKSB7XHJcbiAgICAgICAgICAgICAgICBzcHJpdGVzLnB1c2gobW92aW5nU3ByaXRlKTtcclxuICAgICAgICAgICAgICAgIGNhcmRzLnB1c2gobW92aW5nQ2FyZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGkgPSBjYXJkcy5sZW5ndGggPCByZXZlYWxDb3VudCA/IGNhcmRzLmxlbmd0aCA6IGNhcmRzLmxlbmd0aCAtIHJldmVhbENvdW50O1xyXG4gICAgICAgIGNvbnN0IGogPSBjYXJkcy5sZW5ndGggPCByZXZlYWxDb3VudCA/IHJldmVhbENvdW50IDogcmVzZXJ2ZWRTcHJpdGVzQW5kQ2FyZHMubGVuZ3RoICsgKHJldHVyblRvRGVjayA/IDAgOiBtb3ZpbmdTcHJpdGVzQW5kQ2FyZHMubGVuZ3RoKSAtIHJldmVhbENvdW50O1xyXG4gICAgICAgIGNvbnN0IHkgPSBjYXJkcy5sZW5ndGggPCByZXZlYWxDb3VudCA/IDIgKiBWUC5zcHJpdGVIZWlnaHQgOiBWUC5zcHJpdGVIZWlnaHQ7XHJcbiAgICAgICAgcmVzZXJ2ZWRTcHJpdGUudGFyZ2V0ID0gbmV3IFZlY3RvcihcclxuICAgICAgICAgICAgVlAuY2FudmFzLndpZHRoIC8gMiAtIFZQLnNwcml0ZVdpZHRoIC8gMiArIChpIC0gaiAvIDIpICogVlAuc3ByaXRlR2FwLFxyXG4gICAgICAgICAgICBWUC5jYW52YXMuaGVpZ2h0IC0geVxyXG4gICAgICAgICk7XHJcblxyXG4gICAgICAgIHNwcml0ZXMucHVzaChyZXNlcnZlZFNwcml0ZSk7XHJcbiAgICAgICAgY2FyZHMucHVzaChyZXNlcnZlZENhcmQpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChjYXJkcy5sZW5ndGggPT09IHNwbGl0SW5kZXgpIHtcclxuICAgICAgICBmb3IgKGNvbnN0IFttb3ZpbmdTcHJpdGUsIG1vdmluZ0NhcmRdIG9mIG1vdmluZ1Nwcml0ZXNBbmRDYXJkcykge1xyXG4gICAgICAgICAgICBzcHJpdGVzLnB1c2gobW92aW5nU3ByaXRlKTtcclxuICAgICAgICAgICAgY2FyZHMucHVzaChtb3ZpbmdDYXJkKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZ2FtZVN0YXRlLnBsYXllclJldmVhbENvdW50ID0gcmV2ZWFsQ291bnQ7XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBqb2luR2FtZShnYW1lSWQ6IHN0cmluZywgcGxheWVyTmFtZTogc3RyaW5nKSB7XHJcbiAgICAvLyB3YWl0IGZvciBjb25uZWN0aW9uXHJcbiAgICBkbyB7XHJcbiAgICAgICAgYXdhaXQgTGliLmRlbGF5KDEwMDApO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGB3cy5yZWFkeVN0YXRlOiAke3dzLnJlYWR5U3RhdGV9LCBXZWJTb2NrZXQuT1BFTjogJHtXZWJTb2NrZXQuT1BFTn1gKTtcclxuICAgIH0gd2hpbGUgKHdzLnJlYWR5U3RhdGUgIT0gV2ViU29ja2V0Lk9QRU4pO1xyXG5cclxuICAgIC8vIHRyeSB0byBqb2luIHRoZSBnYW1lXHJcbiAgICBhd2FpdCBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgYWRkQ2FsbGJhY2soJ2pvaW5HYW1lJywgcmVzb2x2ZSwgcmVqZWN0KTtcclxuICAgICAgICB3cy5zZW5kKEpTT04uc3RyaW5naWZ5KDxMaWIuSm9pbkdhbWVNZXNzYWdlPnsgZ2FtZUlkLCBwbGF5ZXJOYW1lIH0pKTtcclxuICAgIH0pO1xyXG59XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZHJhd0NhcmQoKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBjb25zdCBhbmltYXRpb25zQXNzb2NpYXRlZCA9IG5ldyBQcm9taXNlPHZvaWQ+KHJlc29sdmUgPT4ge1xyXG4gICAgICAgIG9uQW5pbWF0aW9uc0Fzc29jaWF0ZWQgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgIG9uQW5pbWF0aW9uc0Fzc29jaWF0ZWQgPSAoKSA9PiB7fTtcclxuICAgICAgICAgICAgcmVzb2x2ZSgpO1xyXG4gICAgICAgIH07XHJcbiAgICB9KTtcclxuXHJcbiAgICBhd2FpdCBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgYWRkQ2FsbGJhY2soJ2RyYXdDYXJkJywgcmVzb2x2ZSwgcmVqZWN0KTtcclxuICAgICAgICB3cy5zZW5kKEpTT04uc3RyaW5naWZ5KDxMaWIuRHJhd0NhcmRNZXNzYWdlPntcclxuICAgICAgICAgICAgZHJhd0NhcmQ6IG51bGxcclxuICAgICAgICB9KSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBhd2FpdCBhbmltYXRpb25zQXNzb2NpYXRlZDtcclxufVxyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJldHVybkNhcmRzVG9EZWNrKGdhbWVTdGF0ZTogTGliLkdhbWVTdGF0ZSkge1xyXG4gICAgYXdhaXQgbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgIGFkZENhbGxiYWNrKCdyZXR1cm5DYXJkc1RvRGVjaycsIHJlc29sdmUsIHJlamVjdCk7XHJcbiAgICAgICAgd3Muc2VuZChKU09OLnN0cmluZ2lmeSg8TGliLlJldHVybkNhcmRzVG9EZWNrTWVzc2FnZT57XHJcbiAgICAgICAgICAgIGNhcmRzVG9SZXR1cm5Ub0RlY2s6IHNlbGVjdGVkSW5kaWNlcy5tYXAoaSA9PiBnYW1lU3RhdGUucGxheWVyQ2FyZHNbaV0pXHJcbiAgICAgICAgfSkpO1xyXG4gICAgfSk7XHJcbiAgICBcclxuICAgIC8vIG1ha2UgdGhlIHNlbGVjdGVkIGNhcmRzIGRpc2FwcGVhclxyXG4gICAgc2VsZWN0ZWRJbmRpY2VzLnNwbGljZSgwLCBzZWxlY3RlZEluZGljZXMubGVuZ3RoKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHJlb3JkZXJDYXJkcyhnYW1lU3RhdGU6IExpYi5HYW1lU3RhdGUpIHtcclxuICAgIHJldHVybiBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgYWRkQ2FsbGJhY2soJ3Jlb3JkZXJDYXJkcycsIHJlc29sdmUsIHJlamVjdCk7XHJcbiAgICAgICAgd3Muc2VuZChKU09OLnN0cmluZ2lmeSg8TGliLlJlb3JkZXJDYXJkc01lc3NhZ2U+e1xyXG4gICAgICAgICAgICByZW9yZGVyZWRDYXJkczogZ2FtZVN0YXRlLnBsYXllckNhcmRzLFxyXG4gICAgICAgICAgICBuZXdSZXZlYWxDb3VudDogZ2FtZVN0YXRlLnBsYXllclJldmVhbENvdW50XHJcbiAgICAgICAgfSkpO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzb3J0QnlTdWl0KGdhbWVTdGF0ZTogTGliLkdhbWVTdGF0ZSkge1xyXG4gICAgbGV0IGNvbXBhcmVGbiA9IChbYVN1aXQsIGFSYW5rXTogTGliLkNhcmQsIFtiU3VpdCwgYlJhbmtdOiBMaWIuQ2FyZCkgPT4ge1xyXG4gICAgICAgIGlmIChhU3VpdCAhPT0gYlN1aXQpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGFTdWl0IC0gYlN1aXQ7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcmV0dXJuIGFSYW5rIC0gYlJhbms7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBwcmV2aW91c0dhbWVTdGF0ZSA9IDxMaWIuR2FtZVN0YXRlPkpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoZ2FtZVN0YXRlKSk7XHJcbiAgICBzb3J0Q2FyZHMoZ2FtZVN0YXRlLnBsYXllckNhcmRzLCAwLCBnYW1lU3RhdGUucGxheWVyUmV2ZWFsQ291bnQsIGNvbXBhcmVGbik7XHJcbiAgICBzb3J0Q2FyZHMoZ2FtZVN0YXRlLnBsYXllckNhcmRzLCBnYW1lU3RhdGUucGxheWVyUmV2ZWFsQ291bnQsIGdhbWVTdGF0ZS5wbGF5ZXJDYXJkcy5sZW5ndGgsIGNvbXBhcmVGbik7XHJcbiAgICBhc3NvY2lhdGVBbmltYXRpb25zV2l0aENhcmRzKGdhbWVTdGF0ZSwgcHJldmlvdXNHYW1lU3RhdGUpO1xyXG4gICAgcmV0dXJuIHJlb3JkZXJDYXJkcyhnYW1lU3RhdGUpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc29ydEJ5UmFuayhnYW1lU3RhdGU6IExpYi5HYW1lU3RhdGUpIHtcclxuICAgIGxldCBjb21wYXJlRm4gPSAoW2FTdWl0LCBhUmFua106IExpYi5DYXJkLCBbYlN1aXQsIGJSYW5rXTogTGliLkNhcmQpID0+IHtcclxuICAgICAgICBpZiAoYVJhbmsgIT09IGJSYW5rKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBhUmFuayAtIGJSYW5rO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHJldHVybiBhU3VpdCAtIGJTdWl0O1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgcHJldmlvdXNHYW1lU3RhdGUgPSA8TGliLkdhbWVTdGF0ZT5KU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGdhbWVTdGF0ZSkpO1xyXG4gICAgc29ydENhcmRzKGdhbWVTdGF0ZS5wbGF5ZXJDYXJkcywgMCwgZ2FtZVN0YXRlLnBsYXllclJldmVhbENvdW50LCBjb21wYXJlRm4pO1xyXG4gICAgc29ydENhcmRzKGdhbWVTdGF0ZS5wbGF5ZXJDYXJkcywgZ2FtZVN0YXRlLnBsYXllclJldmVhbENvdW50LCBnYW1lU3RhdGUucGxheWVyQ2FyZHMubGVuZ3RoLCBjb21wYXJlRm4pO1xyXG4gICAgYXNzb2NpYXRlQW5pbWF0aW9uc1dpdGhDYXJkcyhnYW1lU3RhdGUsIHByZXZpb3VzR2FtZVN0YXRlKTtcclxuICAgIHJldHVybiByZW9yZGVyQ2FyZHMoZ2FtZVN0YXRlKTtcclxufVxyXG5cclxuZnVuY3Rpb24gc29ydENhcmRzKFxyXG4gICAgY2FyZHM6IExpYi5DYXJkW10sXHJcbiAgICBzdGFydDogbnVtYmVyLFxyXG4gICAgZW5kOiBudW1iZXIsXHJcbiAgICBjb21wYXJlRm46IChhOiBMaWIuQ2FyZCwgYjogTGliLkNhcmQpID0+IG51bWJlclxyXG4pIHtcclxuICAgIGNhcmRzLnNwbGljZShzdGFydCwgZW5kIC0gc3RhcnQsIC4uLmNhcmRzLnNsaWNlKHN0YXJ0LCBlbmQpLnNvcnQoY29tcGFyZUZuKSk7XHJcbn1cclxuIiwiZXhwb3J0IGRlZmF1bHQgY2xhc3MgVmVjdG9yIHtcclxuICAgIHJlYWRvbmx5IHg6IG51bWJlciA9IDA7XHJcbiAgICByZWFkb25seSB5OiBudW1iZXIgPSAwO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKHg6IG51bWJlciwgeTogbnVtYmVyKSB7XHJcbiAgICAgICAgdGhpcy54ID0geDtcclxuICAgICAgICB0aGlzLnkgPSB5O1xyXG4gICAgfVxyXG5cclxuICAgIC8qXHJcbiAgICBhc3NpZ24odjogVmVjdG9yKSB7XHJcbiAgICAgICAgdGhpcy54ID0gdi54O1xyXG4gICAgICAgIHRoaXMueSA9IHYueTtcclxuICAgIH1cclxuICAgICovXHJcblxyXG4gICAgYWRkKHY6IFZlY3Rvcikge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjdG9yKHRoaXMueCArIHYueCwgdGhpcy55ICsgdi55KTtcclxuICAgIH1cclxuXHJcbiAgICAvKlxyXG4gICAgYWRkU2VsZih2OiBWZWN0b3IpIHtcclxuICAgICAgICB0aGlzLnggKz0gdi54O1xyXG4gICAgICAgIHRoaXMueSArPSB2Lnk7XHJcbiAgICB9XHJcbiAgICAqL1xyXG4gICAgXHJcbiAgICBzdWIodjogVmVjdG9yKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWN0b3IodGhpcy54IC0gdi54LCB0aGlzLnkgLSB2LnkpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qXHJcbiAgICBzdWJTZWxmKHY6IFZlY3Rvcikge1xyXG4gICAgICAgIHRoaXMueCAtPSB2Lng7XHJcbiAgICAgICAgdGhpcy55IC09IHYueTtcclxuICAgIH1cclxuICAgICovXHJcbiAgICBcclxuICAgIGdldCBsZW5ndGgoKSB7XHJcbiAgICAgICAgcmV0dXJuIE1hdGguc3FydCh0aGlzLnggKiB0aGlzLnggKyB0aGlzLnkgKiB0aGlzLnkpO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBkaXN0YW5jZSh2OiBWZWN0b3IpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLnN1Yih2KS5sZW5ndGg7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHNjYWxlKHM6IG51bWJlcik6IFZlY3RvciB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWN0b3IocyAqIHRoaXMueCwgcyAqIHRoaXMueSk7XHJcbiAgICB9XHJcblxyXG4gICAgLypcclxuICAgIHNjYWxlU2VsZihzOiBudW1iZXIpIHtcclxuICAgICAgICB0aGlzLnggKj0gcztcclxuICAgICAgICB0aGlzLnkgKj0gcztcclxuICAgIH1cclxuICAgICovXHJcbn0iLCJpbXBvcnQgVmVjdG9yIGZyb20gJy4vdmVjdG9yJztcclxuXHJcbmV4cG9ydCBjb25zdCBjYW52YXMgPSA8SFRNTENhbnZhc0VsZW1lbnQ+ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NhbnZhcycpO1xyXG5leHBvcnQgY29uc3QgY29udGV4dCA9IDxDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQ+Y2FudmFzLmdldENvbnRleHQoJzJkJyk7XHJcblxyXG4vLyBnZXQgcGl4ZWxzIHBlciBjZW50aW1ldGVyLCB3aGljaCBpcyBjb25zdGFudFxyXG5jb25zdCB0ZXN0RWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xyXG50ZXN0RWxlbWVudC5zdHlsZS53aWR0aCA9ICcxY20nO1xyXG5kb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHRlc3RFbGVtZW50KTtcclxuZXhwb3J0IGNvbnN0IHBpeGVsc1BlckNNID0gdGVzdEVsZW1lbnQub2Zmc2V0V2lkdGg7XHJcbmRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQodGVzdEVsZW1lbnQpO1xyXG5cclxuLy8gdGhlc2UgcGFyYW1ldGVycyBjaGFuZ2Ugd2l0aCByZXNpemluZ1xyXG5leHBvcnQgbGV0IGNhbnZhc1JlY3QgPSBjYW52YXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcbmV4cG9ydCBsZXQgcGl4ZWxzUGVyUGVyY2VudCA9IDA7XHJcblxyXG5leHBvcnQgbGV0IHNwcml0ZVdpZHRoOiBudW1iZXI7XHJcbmV4cG9ydCBsZXQgc3ByaXRlSGVpZ2h0OiBudW1iZXI7XHJcbmV4cG9ydCBsZXQgc3ByaXRlR2FwOiBudW1iZXI7XHJcbmV4cG9ydCBsZXQgc3ByaXRlRGVja0dhcDogbnVtYmVyO1xyXG5cclxuZXhwb3J0IGxldCBzb3J0QnlTdWl0Qm91bmRzOiBbVmVjdG9yLCBWZWN0b3JdO1xyXG5leHBvcnQgbGV0IHNvcnRCeVJhbmtCb3VuZHM6IFtWZWN0b3IsIFZlY3Rvcl07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmVjYWxjdWxhdGVQYXJhbWV0ZXJzKCkge1xyXG4gICAgY2FudmFzLndpZHRoID0gd2luZG93LmlubmVyV2lkdGg7XHJcbiAgICBjYW52YXMuaGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IC0gMC41ICogcGl4ZWxzUGVyQ007XHJcbiAgICBjYW52YXNSZWN0ID0gY2FudmFzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG5cclxuICAgIHBpeGVsc1BlclBlcmNlbnQgPSBjYW52YXMuaGVpZ2h0IC8gMTAwO1xyXG4gICAgc3ByaXRlV2lkdGggPSAxMiAqIHBpeGVsc1BlclBlcmNlbnQ7XHJcbiAgICBzcHJpdGVIZWlnaHQgPSAxOCAqIHBpeGVsc1BlclBlcmNlbnQ7XHJcbiAgICBzcHJpdGVHYXAgPSAyICogcGl4ZWxzUGVyUGVyY2VudDtcclxuICAgIHNwcml0ZURlY2tHYXAgPSAwLjUgKiBwaXhlbHNQZXJQZXJjZW50O1xyXG5cclxuICAgIHNvcnRCeVN1aXRCb3VuZHMgPSBbXHJcbiAgICAgICAgbmV3IFZlY3RvcihjYW52YXMud2lkdGggLSAyLjc1ICogcGl4ZWxzUGVyQ00sIGNhbnZhcy5oZWlnaHQgLSAzLjUgKiBwaXhlbHNQZXJDTSksXHJcbiAgICAgICAgbmV3IFZlY3RvcihjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQgLSAyICogcGl4ZWxzUGVyQ00pXHJcbiAgICBdO1xyXG4gICAgc29ydEJ5UmFua0JvdW5kcyA9IFtcclxuICAgICAgICBuZXcgVmVjdG9yKGNhbnZhcy53aWR0aCAtIDIuNzUgKiBwaXhlbHNQZXJDTSwgY2FudmFzLmhlaWdodCAtIDEuNzUgKiBwaXhlbHNQZXJDTSksXHJcbiAgICAgICAgbmV3IFZlY3RvcihjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQgLSAwLjI1ICogcGl4ZWxzUGVyQ00pXHJcbiAgICBdO1xyXG59XHJcbiIsImltcG9ydCBiaW5hcnlTZWFyY2ggZnJvbSAnYmluYXJ5LXNlYXJjaCc7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gYmluYXJ5U2VhcmNoTnVtYmVyKGhheXN0YWNrOiBudW1iZXJbXSwgbmVlZGxlOiBudW1iZXIsIGxvdz86IG51bWJlciwgaGlnaD86IG51bWJlcikge1xyXG4gICAgcmV0dXJuIGJpbmFyeVNlYXJjaChoYXlzdGFjaywgbmVlZGxlLCAoYSwgYikgPT4gYSAtIGIsIGxvdywgaGlnaCk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRDb29raWUobmFtZTogc3RyaW5nKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcclxuICAgIGNvbnN0IHBhcnRzID0gYDsgJHtkb2N1bWVudC5jb29raWV9YC5zcGxpdChgOyAke25hbWV9PWApO1xyXG4gICAgaWYgKHBhcnRzLmxlbmd0aCA9PT0gMikge1xyXG4gICAgICAgIHJldHVybiBwYXJ0cy5wb3AoKT8uc3BsaXQoJzsnKS5zaGlmdCgpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0UGFyYW0obmFtZTogc3RyaW5nKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcclxuICAgIHJldHVybiB3aW5kb3cubG9jYXRpb24uc2VhcmNoLnNwbGl0KGAke25hbWV9PWApWzFdPy5zcGxpdChcIiZcIilbMF07XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBkZWxheShtczogbnVtYmVyKSB7XHJcbiAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIG1zKSk7XHJcbn1cclxuXHJcbmV4cG9ydCBlbnVtIFN1aXQge1xyXG4gICAgQ2x1YiwgLy8gMFxyXG4gICAgRGlhbW9uZCxcclxuICAgIEhlYXJ0LFxyXG4gICAgU3BhZGUsXHJcbiAgICBKb2tlciwgLy8gNFxyXG59XHJcblxyXG5leHBvcnQgZW51bSBSYW5rIHtcclxuICAgIFNtYWxsLCAvLyAwXHJcbiAgICBBY2UsXHJcbiAgICBUd28sXHJcbiAgICBUaHJlZSxcclxuICAgIEZvdXIsXHJcbiAgICBGaXZlLFxyXG4gICAgU2l4LFxyXG4gICAgU2V2ZW4sXHJcbiAgICBFaWdodCxcclxuICAgIE5pbmUsXHJcbiAgICBUZW4sXHJcbiAgICBKYWNrLFxyXG4gICAgUXVlZW4sXHJcbiAgICBLaW5nLFxyXG4gICAgQmlnLCAvLyAxNFxyXG59XHJcblxyXG5leHBvcnQgdHlwZSBDYXJkID0gW1N1aXQsIFJhbmtdO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBPdGhlclBsYXllciB7XHJcbiAgICBuYW1lOiBzdHJpbmc7XHJcbiAgICBjYXJkQ291bnQ6IG51bWJlcjtcclxuICAgIHJldmVhbGVkQ2FyZHM6IENhcmRbXTtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBHYW1lU3RhdGUge1xyXG4gICAgZGVja0NvdW50OiBudW1iZXI7XHJcbiAgICBhY3RpdmVQbGF5ZXJJbmRleDogbnVtYmVyO1xyXG4gICAgcGxheWVySW5kZXg6IG51bWJlcjtcclxuICAgIHBsYXllckNhcmRzOiBDYXJkW107XHJcbiAgICBwbGF5ZXJSZXZlYWxDb3VudDogbnVtYmVyO1xyXG4gICAgb3RoZXJQbGF5ZXJzOiBPdGhlclBsYXllcltdO1xyXG59XHJcblxyXG5leHBvcnQgdHlwZSBNZXRob2ROYW1lID0gXCJqb2luR2FtZVwiIHwgXCJkcmF3Q2FyZFwiIHwgXCJyZXR1cm5DYXJkc1RvRGVja1wiIHwgXCJyZW9yZGVyQ2FyZHNcIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgTWV0aG9kUmVzdWx0IHtcclxuICAgIG1ldGhvZE5hbWU6IE1ldGhvZE5hbWU7XHJcbiAgICBlcnJvckRlc2NyaXB0aW9uPzogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEpvaW5HYW1lTWVzc2FnZSB7XHJcbiAgICBnYW1lSWQ6IHN0cmluZztcclxuICAgIHBsYXllck5hbWU6IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBEcmF3Q2FyZE1lc3NhZ2Uge1xyXG4gICAgZHJhd0NhcmQ6IG51bGw7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgUmV0dXJuQ2FyZHNUb0RlY2tNZXNzYWdlIHtcclxuICAgIGNhcmRzVG9SZXR1cm5Ub0RlY2s6IENhcmRbXTtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBSZW9yZGVyQ2FyZHNNZXNzYWdlIHtcclxuICAgIHJlb3JkZXJlZENhcmRzOiBDYXJkW107XHJcbiAgICBuZXdSZXZlYWxDb3VudDogbnVtYmVyO1xyXG59Il19
