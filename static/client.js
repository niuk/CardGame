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
        else if (VP.waitBounds[0].x < mouseDownPosition.x && mouseDownPosition.x < VP.waitBounds[1].x &&
            VP.waitBounds[0].y < mouseDownPosition.y && mouseDownPosition.y < VP.waitBounds[1].y) {
            exports.action = "Wait";
        }
        else if (VP.proceedBounds[0].x < mouseDownPosition.x && mouseDownPosition.x < VP.proceedBounds[1].x &&
            VP.proceedBounds[0].y < mouseDownPosition.y && mouseDownPosition.y < VP.proceedBounds[1].y) {
            exports.action = "Proceed";
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
        return;
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
        else if (exports.action === "Wait") {
            // TODO: check whether mouse position has left button bounds
        }
        else if (exports.action === "Proceed") {
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
                        exports.action !== "Wait" &&
                        exports.action !== "Proceed" &&
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
        return;
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
        else if (exports.action === "Wait") {
            console.log('waiting');
            await State.wait();
        }
        else if (exports.action === "Proceed") {
            console.log('proceeding');
            await State.proceed();
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
                exports.action !== "Wait" &&
                exports.action !== "Proceed" &&
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
    let splitIndex = undefined;
    let shareCount = gameState.playerShareCount;
    let revealCount = gameState.playerRevealCount;
    // extract moving sprites
    for (const i of State.selectedIndices) {
        const sprite = sprites[i];
        const card = cards[i];
        if (sprite === undefined || card === undefined)
            throw new Error();
        movingSpritesAndCards.push([sprite, card]);
        if (i < gameState.playerShareCount) {
            --shareCount;
        }
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
        let splitShared;
        let specialSplit;
        let start;
        let end;
        if (splitRevealed) {
            if (leftMovingSprite.target.x < VP.canvas.width / 2 &&
                VP.canvas.width / 2 < rightMovingSprite.target.x + VP.spriteWidth) {
                splitIndex = shareCount;
            }
            splitShared = (leftMovingSprite.target.x + rightMovingSprite.target.x + VP.spriteWidth) / 2 < VP.canvas.width / 2;
            if (splitShared) {
                start = 0;
                end = shareCount;
            }
            else {
                start = shareCount;
                end = revealCount;
            }
        }
        else {
            splitShared = false;
            specialSplit = false;
            start = revealCount;
            end = reservedSpritesAndCards.length;
        }
        if (splitIndex === undefined) {
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
        }
        if (splitIndex === undefined) {
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
        // adjust share count
        if (splitIndex < shareCount || splitIndex === shareCount && splitShared) {
            shareCount += movingSpritesAndCards.length;
            console.log(`set shareCount to ${shareCount}`);
        }
        // adjust reveal count
        if (splitIndex < revealCount || splitIndex === revealCount && splitRevealed) {
            revealCount += movingSpritesAndCards.length;
            console.log(`set revealCount to ${revealCount}`);
        }
    }
    // adjust selected indices
    // modifying action.cardIndex directly in the loop would cause us to
    // check its adjusted value against old indices, which is incorrect
    let newCardIndex = exports.action.cardIndex;
    for (let i = 0; i < State.selectedIndices.length; ++i) {
        if (exports.action.cardIndex === State.selectedIndices[i]) {
            newCardIndex = splitIndex + i;
        }
        State.selectedIndices[i] = splitIndex + i;
    }
    exports.action.cardIndex = newCardIndex;
    State.setSpriteTargets(gameState, reservedSpritesAndCards, movingSpritesAndCards, shareCount, revealCount, splitIndex, exports.action.type === "ReturnToDeck");
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
        renderButtons(time, State.gameState);
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
    VP.context.setLineDash([4, 1]);
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
                Input.action !== "Wait" &&
                Input.action !== "Proceed" &&
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
        VP.context.setTransform(VP.getTransformForPlayer(1));
        //VP.context.translate(0, (VP.canvas.width + VP.canvas.height) / 2);
        //VP.context.rotate(-Math.PI / 2);
        renderOtherPlayer(deltaTime, gameState, (gameState.playerIndex + 1) % 4);
    }
    finally {
        VP.context.restore();
    }
    VP.context.save();
    try {
        VP.context.setTransform(VP.getTransformForPlayer(2));
        renderOtherPlayer(deltaTime, gameState, (gameState.playerIndex + 2) % 4);
    }
    finally {
        VP.context.restore();
    }
    VP.context.save();
    try {
        VP.context.setTransform(VP.getTransformForPlayer(3));
        //VP.context.translate(VP.canvas.width, (VP.canvas.height - VP.canvas.width) / 2);
        //VP.context.rotate(Math.PI / 2);
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
function renderButtons(time, gameState) {
    VP.context.save();
    try {
        // blur image behind
        //stackBlurCanvasRGBA('canvas', x, y, canvas.width - x, canvas.height - y, 16);
        /*
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
        */
        //context.fillStyle = '#ff000077';
        //context.fillRect(VP.sortBySuitBounds[0].x, VP.sortBySuitBounds[0].y,
        //sortBySuitBounds[1].x - sortBySuitBounds[0].x, sortBySuitBounds[1].y - sortBySuitBounds[0].y);
        //context.fillStyle = '#0000ff77';
        //context.fillRect(sortByRankBounds[0].x, sortByRankBounds[0].y,
        //sortByRankBounds[1].x - sortByRankBounds[0].x, sortByRankBounds[1].y - sortByRankBounds[0].y);
        /*if (gameState.playerState === "Proceed" || gameState.playerState === "Wait") {
            VP.context.textBaseline = 'top';

            if (gameState.playerState === "Wait") {
                VP.context.fillStyle = '#00ffff60';
                VP.context.fillRect(
                    VP.waitBounds[0].x, VP.waitBounds[0].y,
                    VP.waitBounds[1].x - VP.waitBounds[0].x, VP.waitBounds[1].y - VP.waitBounds[0].y
                );
            }
            
            VP.context.fillStyle = '#000000ff';
            VP.context.font = VP.waitFont;
            VP.context.fillText('Wait!', VP.waitBounds[0].x, VP.waitBounds[0].y);
            boundsRect(VP.waitBounds);

            if (gameState.playerState === "Proceed") {
                VP.context.fillStyle = '#00ffff60';
                VP.context.fillRect(
                    VP.proceedBounds[0].x, VP.proceedBounds[0].y,
                    VP.proceedBounds[1].x - VP.proceedBounds[0].x, VP.proceedBounds[1].y - VP.proceedBounds[0].y
                );
            }

            VP.context.fillStyle = '#000000ff';
            VP.context.font = VP.proceedFont;
            VP.context.fillText('Proceed.', VP.proceedBounds[0].x, VP.proceedBounds[0].y);
            boundsRect(VP.proceedBounds);
        } else {
            if (gameState.playerState === 'Ready') {
                VP.context.fillStyle = '#000000ff';
                VP.context.font = VP.readyFont;
                VP.context.fillText('Ready!', VP.readyBounds[0].x, VP.readyBounds[0].y);
            } else {
                VP.context.fillStyle = '#000000ff';
                VP.context.font = VP.countdownFont;
                VP.context.fillText(`Waiting ${
                    Math.floor(1 + (gameState.playerState.activeTime + Lib.activeCooldown - Date.now()) / 1000)
                } seconds...`, VP.countdownBounds[0].x, VP.countdownBounds[0].y);
            }
        }*/
    }
    finally {
        VP.context.restore();
    }
}
function boundsRect([topLeft, bottomRight]) {
    VP.context.strokeRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
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
exports.proceed = exports.wait = exports.sortByRank = exports.sortBySuit = exports.reorderCards = exports.returnCardsToDeck = exports.drawCard = exports.joinGame = exports.setSpriteTargets = exports.faceSpritesForPlayer = exports.backSpritesForPlayer = exports.deckSprites = exports.selectedIndices = exports.gameState = exports.previousGameState = exports.lock = exports.gameId = exports.playerName = void 0;
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
        'playerIndex' in obj &&
        'playerCards' in obj &&
        'playerRevealCount' in obj &&
        //'playerState' in obj &&
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
            console.log(`gameState.playerShareCount = ${exports.gameState.playerShareCount}`);
            console.log(`gameState.playerRevealCount = ${exports.gameState.playerRevealCount}`);
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
    const previousDeckSprites = exports.deckSprites;
    const previousBackSpritesForPlayer = exports.backSpritesForPlayer;
    const previousFaceSpritesForPlayer = exports.faceSpritesForPlayer;
    exports.backSpritesForPlayer = [];
    exports.faceSpritesForPlayer = [];
    for (let i = 0; i < 4; ++i) {
        const previousBackSprites = previousBackSpritesForPlayer[i] ?? [];
        previousBackSpritesForPlayer[i] = previousBackSprites;
        const previousFaceSprites = previousFaceSpritesForPlayer[i] ?? [];
        previousFaceSpritesForPlayer[i] = previousFaceSprites;
        let previousFaceCards;
        let faceCards;
        if (i === gameState.playerIndex) {
            previousFaceCards = previousGameState?.playerCards ?? [];
            faceCards = gameState.playerCards;
        }
        else {
            previousFaceCards = previousGameState?.otherPlayers[i]?.revealedCards ?? [];
            faceCards = gameState.otherPlayers[i]?.revealedCards ?? [];
        }
        let faceSprites = [];
        exports.faceSpritesForPlayer[i] = faceSprites;
        for (const faceCard of faceCards) {
            let faceSprite = undefined;
            if (faceSprite === undefined) {
                for (let j = 0; j < previousFaceCards.length; ++j) {
                    const previousFaceCard = previousFaceCards[j];
                    if (previousFaceCard === undefined)
                        throw new Error();
                    if (JSON.stringify(faceCard) === JSON.stringify(previousFaceCard)) {
                        previousFaceCards.splice(j, 1);
                        faceSprite = previousFaceSprites.splice(j, 1)[0];
                        if (faceSprite === undefined)
                            throw new Error();
                        break;
                    }
                }
            }
            if (faceSprite === undefined && previousBackSprites.length > 0) {
                // make it look like this card was revealed among previously hidden cards
                // which, of course, requires that the player had previously hidden cards
                faceSprite = previousBackSprites.splice(0, 1)[0];
                if (faceSprite === undefined)
                    throw new Error();
                faceSprite.image = CardImages.get(JSON.stringify(faceCard));
            }
            if (faceSprite === undefined && previousDeckSprites.length > 0) {
                // make it look like this card came from the deck;
                const faceSprite = previousDeckSprites.splice(0, 1)[0];
                if (faceSprite === undefined)
                    throw new Error();
                faceSprite.image = CardImages.get(JSON.stringify(faceCard));
                // this sprite is rendered in the player's transformed canvas context
                const transform = VP.getTransformForPlayer(VP.getRelativePlayerIndex(i, gameState.playerIndex));
                transform.invertSelf();
                const point = transform.transformPoint(faceSprite.position);
                faceSprite.position = new vector_1.default(point.x, point.y);
            }
            if (faceSprite === undefined) {
                faceSprite = new sprite_1.default(CardImages.get(JSON.stringify(faceCard)));
            }
            faceSprites.push(faceSprite);
        }
        let backSprites = [];
        exports.backSpritesForPlayer[i] = backSprites;
        const otherPlayer = gameState.otherPlayers[i];
        if (i !== gameState.playerIndex && otherPlayer !== undefined) {
            // only other players have any hidden cards
            while (backSprites.length < otherPlayer.cardCount - otherPlayer.revealedCards.length) {
                let backSprite = undefined;
                if (backSprite === undefined && previousBackSprites.length > 0) {
                    backSprite = previousBackSprites.splice(0, 1)[0];
                    if (backSprite === undefined)
                        throw new Error();
                }
                if (backSprite === undefined && previousFaceSprites.length > 0) {
                    backSprite = previousFaceSprites.splice(0, 1)[0];
                    if (backSprite === undefined)
                        throw new Error();
                    backSprite.image = CardImages.get(`Back${i}`);
                }
                if (backSprite === undefined && previousDeckSprites.length > 0) {
                    backSprite = previousDeckSprites.splice(0, 1)[0];
                    if (backSprite === undefined)
                        throw new Error();
                    backSprite.image = CardImages.get(`Back${i}`);
                    // this sprite is rendered in the player's transformed canvas context
                    const transform = VP.getTransformForPlayer(VP.getRelativePlayerIndex(i, gameState.playerIndex));
                    transform.invertSelf();
                    const point = transform.transformPoint(backSprite.position);
                    backSprite.position = new vector_1.default(point.x, point.y);
                }
                if (backSprite === undefined) {
                    backSprite = new sprite_1.default(CardImages.get(`Back${i}`));
                }
                backSprites.push(backSprite);
            }
        }
    }
    exports.deckSprites = [];
    while (exports.deckSprites.length < gameState.deckCount) {
        let deckSprite = undefined;
        if (deckSprite == undefined && previousDeckSprites.length > 0) {
            deckSprite = previousDeckSprites.splice(0, 1)[0];
            if (deckSprite === undefined)
                throw new Error();
        }
        if (deckSprite === undefined) {
            let i = 0;
            for (const previousBackSprites of previousBackSpritesForPlayer) {
                if (previousBackSprites.length > 0) {
                    deckSprite = previousBackSprites.splice(0, 1)[0];
                    if (deckSprite === undefined)
                        throw new Error();
                    deckSprite.image = CardImages.get('Back0');
                    // the sprite came from the player's transformed canvas context
                    const transform = VP.getTransformForPlayer(VP.getRelativePlayerIndex(i, gameState.playerIndex));
                    const point = transform.transformPoint(deckSprite.position);
                    deckSprite.position = new vector_1.default(point.x, point.y);
                    break;
                }
                ++i;
            }
        }
        if (deckSprite === undefined) {
            let i = 0;
            for (const previousFaceSprites of previousFaceSpritesForPlayer) {
                if (previousFaceSprites.length > 0) {
                    deckSprite = previousFaceSprites.splice(0, 1)[0];
                    if (deckSprite === undefined)
                        throw new Error();
                    deckSprite.image = CardImages.get('Back0');
                    // the sprite came from the player's transformed canvas context
                    const transform = VP.getTransformForPlayer(VP.getRelativePlayerIndex(i, gameState.playerIndex));
                    const point = transform.transformPoint(deckSprite.position);
                    deckSprite.position = new vector_1.default(point.x, point.y);
                    break;
                }
                ++i;
            }
        }
        if (deckSprite === undefined) {
            deckSprite = new sprite_1.default(CardImages.get('Back0'));
        }
        exports.deckSprites.push(deckSprite);
    }
    setSpriteTargets(gameState);
    onAnimationsAssociated();
}
function setSpriteTargets(gameState, reservedSpritesAndCards, movingSpritesAndCards, shareCount, revealCount, splitIndex, returnToDeck) {
    const sprites = exports.faceSpritesForPlayer[gameState.playerIndex];
    if (sprites === undefined)
        throw new Error();
    const cards = gameState.playerCards;
    reservedSpritesAndCards = reservedSpritesAndCards ?? cards.map((card, index) => [sprites[index], card]);
    movingSpritesAndCards = movingSpritesAndCards ?? [];
    shareCount = shareCount ?? gameState.playerShareCount;
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
        if (cards.length < shareCount) {
            reservedSprite.target = new vector_1.default(VP.canvas.width / 2 - VP.spriteWidth - shareCount * VP.spriteGap + cards.length * VP.spriteGap, VP.canvas.height - 2 * VP.spriteHeight);
        }
        else if (cards.length < revealCount) {
            reservedSprite.target = new vector_1.default(VP.canvas.width / 2 + (cards.length - shareCount + 1) * VP.spriteGap, VP.canvas.height - 2 * VP.spriteHeight);
        }
        else {
            let count = reservedSpritesAndCards.length - revealCount;
            if (!returnToDeck) {
                count += movingSpritesAndCards.length;
            }
            reservedSprite.target = new vector_1.default(VP.canvas.width / 2 - VP.spriteWidth / 2 + (cards.length - revealCount - (count - 1) / 2) * VP.spriteGap, VP.canvas.height - VP.spriteHeight);
        }
        sprites.push(reservedSprite);
        cards.push(reservedCard);
    }
    if (cards.length === splitIndex) {
        for (const [movingSprite, movingCard] of movingSpritesAndCards) {
            sprites.push(movingSprite);
            cards.push(movingCard);
        }
    }
    gameState.playerShareCount = shareCount;
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
            newShareCount: gameState.playerShareCount,
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
    sortCards(gameState.playerCards, 0, gameState.playerShareCount, compareFn);
    sortCards(gameState.playerCards, gameState.playerShareCount, gameState.playerRevealCount, compareFn);
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
    sortCards(gameState.playerCards, 0, gameState.playerShareCount, compareFn);
    sortCards(gameState.playerCards, gameState.playerShareCount, gameState.playerRevealCount, compareFn);
    sortCards(gameState.playerCards, gameState.playerRevealCount, gameState.playerCards.length, compareFn);
    associateAnimationsWithCards(gameState, exports.previousGameState);
    return reorderCards(gameState);
}
exports.sortByRank = sortByRank;
function sortCards(cards, start, end, compareFn) {
    const section = cards.slice(start, end);
    section.sort(compareFn);
    cards.splice(start, end - start, ...section);
}
function wait() {
    return new Promise((resolve, reject) => {
        addCallback('wait', resolve, reject);
        ws.send(JSON.stringify({
            wait: null
        }));
    });
}
exports.wait = wait;
function proceed() {
    return new Promise((resolve, reject) => {
        addCallback('proceed', resolve, reject);
        ws.send(JSON.stringify({
            proceed: null
        }));
    });
}
exports.proceed = proceed;
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
exports.getRelativePlayerIndex = exports.getTransformForPlayer = exports.recalculateParameters = exports.countdownBounds = exports.countdownFont = exports.readyBounds = exports.readyFont = exports.proceedBounds = exports.proceedFont = exports.waitBounds = exports.waitFont = exports.sortBySuitBounds = exports.sortBySuitFont = exports.sortByRankBounds = exports.sortByRankFont = exports.spriteDeckGap = exports.spriteGap = exports.spriteHeight = exports.spriteWidth = exports.pixelsPerPercent = exports.canvasRect = exports.pixelsPerCM = exports.context = exports.canvas = void 0;
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
    exports.sortByRankBounds = [new vector_1.default(0, 0), new vector_1.default(0, 0)];
    exports.sortBySuitBounds = [new vector_1.default(0, 0), new vector_1.default(0, 0)];
    const approvePosition = new vector_1.default(exports.canvas.width - 2 * exports.spriteHeight, exports.canvas.height - 11 * exports.spriteHeight / 12);
    exports.waitFont = `${exports.spriteHeight / 3}px Irregularis`;
    exports.waitBounds = [approvePosition, getBottomRight('Wait!', exports.waitFont, approvePosition)];
    const disapprovePosition = new vector_1.default(exports.canvas.width - 2 * exports.spriteHeight, exports.canvas.height - 5 * exports.spriteHeight / 12);
    exports.proceedFont = `${exports.spriteHeight / 3}px Irregularis`;
    exports.proceedBounds = [disapprovePosition, getBottomRight('Proceed.', exports.proceedFont, disapprovePosition)];
    const readyPosition = new vector_1.default(exports.canvas.width - 2 * exports.spriteHeight, exports.canvas.height - 3 * exports.spriteHeight / 4);
    exports.readyFont = `${exports.spriteHeight / 2}px Irregularis`;
    exports.readyBounds = [readyPosition, getBottomRight('Ready!', exports.readyFont, readyPosition)];
    const countdownPosition = new vector_1.default(exports.canvas.width - 3.5 * exports.spriteHeight, exports.canvas.height - 2 * exports.spriteHeight / 3);
    exports.countdownFont = `${exports.spriteHeight / 2}px Irregularis`;
    exports.countdownBounds = [countdownPosition, getBottomRight('Waiting 10 seconds...', exports.countdownFont, countdownPosition)];
}
exports.recalculateParameters = recalculateParameters;
function getBottomRight(text, font, position) {
    exports.context.font = font;
    exports.context.textBaseline = 'top';
    const textMetrics = exports.context.measureText(text);
    return position.add(new vector_1.default(textMetrics.width, textMetrics.actualBoundingBoxDescent));
}
function getTransformForPlayer(relativeIndex) {
    exports.context.save();
    try {
        if (relativeIndex === 0) {
            return exports.context.getTransform();
        }
        else if (relativeIndex === 1) {
            exports.context.translate(0, (exports.canvas.width + exports.canvas.height) / 2);
            exports.context.rotate(-Math.PI / 2);
            return exports.context.getTransform();
        }
        else if (relativeIndex === 2) {
            // no transform
            return exports.context.getTransform();
        }
        else if (relativeIndex === 3) {
            exports.context.translate(exports.canvas.width, (exports.canvas.height - exports.canvas.width) / 2);
            exports.context.rotate(Math.PI / 2);
            return exports.context.getTransform();
        }
        else {
            throw new Error(`index must be 0, 1, 2, or 3; got: ${relativeIndex}`);
        }
    }
    finally {
        exports.context.restore();
    }
}
exports.getTransformForPlayer = getTransformForPlayer;
function getRelativePlayerIndex(otherPlayerIndex, playerIndex) {
    let relativeIndex = otherPlayerIndex - playerIndex;
    if (relativeIndex >= 0) {
        return relativeIndex;
    }
    return otherPlayerIndex - (playerIndex - 4);
}
exports.getRelativePlayerIndex = getRelativePlayerIndex;
},{"./vector":12}],14:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activeCooldown = exports.Rank = exports.Suit = exports.delay = exports.getParam = exports.getCookie = exports.binarySearchNumber = void 0;
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
exports.activeCooldown = 10000; //milliseconds
},{"binary-search":2}]},{},[8,6])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYXdhaXQtc2VtYXBob3JlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2JpbmFyeS1zZWFyY2gvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL3RpbWVycy1icm93c2VyaWZ5L21haW4uanMiLCJzcmMvY2xpZW50L2NhcmQtaW1hZ2VzLnRzIiwic3JjL2NsaWVudC9nYW1lLnRzIiwic3JjL2NsaWVudC9pbnB1dC50cyIsInNyYy9jbGllbnQvbG9iYnkudHMiLCJzcmMvY2xpZW50L3JlbmRlci50cyIsInNyYy9jbGllbnQvc3ByaXRlLnRzIiwic3JjL2NsaWVudC9zdGF0ZS50cyIsInNyYy9jbGllbnQvdmVjdG9yLnRzIiwic3JjL2NsaWVudC92aWV3LXBhcmFtcy50cyIsInNyYy9saWIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUN4TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FDM0VBLDRDQUE4QjtBQUU5QixNQUFNLEtBQUssR0FBRyxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQztBQUM5RCxNQUFNLEtBQUssR0FBRyxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFFakcsTUFBTSxVQUFVLEdBQUcsSUFBSSxHQUFHLEVBQTRCLENBQUM7QUFFaEQsS0FBSyxVQUFVLElBQUk7SUFDdEIsa0NBQWtDO0lBQ2xDLEtB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RCxTQUFnQixLQUFLLENBQUMsRUFBVTtJQUM1QixPQUFPLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQzNELENBQUM7QUFGRCxzQkFFQztBQUVELElBQVksSUFNWDtBQU5ELFdBQVksSUFBSTtJQUNaLCtCQUFJLENBQUE7SUFDSixxQ0FBTyxDQUFBO0lBQ1AsaUNBQUssQ0FBQTtJQUNMLGlDQUFLLENBQUE7SUFDTCxpQ0FBSyxDQUFBO0FBQ1QsQ0FBQyxFQU5XLElBQUksR0FBSixZQUFJLEtBQUosWUFBSSxRQU1mO0FBRUQsSUFBWSxJQWdCWDtBQWhCRCxXQUFZLElBQUk7SUFDWixpQ0FBSyxDQUFBO0lBQ0wsNkJBQUcsQ0FBQTtJQUNILDZCQUFHLENBQUE7SUFDSCxpQ0FBSyxDQUFBO0lBQ0wsK0JBQUksQ0FBQTtJQUNKLCtCQUFJLENBQUE7SUFDSiw2QkFBRyxDQUFBO0lBQ0gsaUNBQUssQ0FBQTtJQUNMLGlDQUFLLENBQUE7SUFDTCwrQkFBSSxDQUFBO0lBQ0osOEJBQUcsQ0FBQTtJQUNILGdDQUFJLENBQUE7SUFDSixrQ0FBSyxDQUFBO0lBQ0wsZ0NBQUksQ0FBQTtJQUNKLDhCQUFHLENBQUE7QUFDUCxDQUFDLEVBaEJXLElBQUksR0FBSixZQUFJLEtBQUosWUFBSSxRQWdCZjtBQVdZLFFBQUEsY0FBYyxHQUFHLEtBQUssQ0FBQyxDQUFDLGNBQWMiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCJcInVzZSBzdHJpY3RcIjtcbmNsYXNzIFNlbWFwaG9yZSB7XG4gICAgY29uc3RydWN0b3IoY291bnQpIHtcbiAgICAgICAgdGhpcy50YXNrcyA9IFtdO1xuICAgICAgICB0aGlzLmNvdW50ID0gY291bnQ7XG4gICAgfVxuICAgIHNjaGVkKCkge1xuICAgICAgICBpZiAodGhpcy5jb3VudCA+IDAgJiYgdGhpcy50YXNrcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICB0aGlzLmNvdW50LS07XG4gICAgICAgICAgICBsZXQgbmV4dCA9IHRoaXMudGFza3Muc2hpZnQoKTtcbiAgICAgICAgICAgIGlmIChuZXh0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBcIlVuZXhwZWN0ZWQgdW5kZWZpbmVkIHZhbHVlIGluIHRhc2tzIGxpc3RcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBhY3F1aXJlKCkge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlcywgcmVqKSA9PiB7XG4gICAgICAgICAgICB2YXIgdGFzayA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICB2YXIgcmVsZWFzZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICByZXMoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXJlbGVhc2VkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWxlYXNlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvdW50Kys7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNjaGVkKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB0aGlzLnRhc2tzLnB1c2godGFzayk7XG4gICAgICAgICAgICBpZiAocHJvY2VzcyAmJiBwcm9jZXNzLm5leHRUaWNrKSB7XG4gICAgICAgICAgICAgICAgcHJvY2Vzcy5uZXh0VGljayh0aGlzLnNjaGVkLmJpbmQodGhpcykpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgc2V0SW1tZWRpYXRlKHRoaXMuc2NoZWQuYmluZCh0aGlzKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICB1c2UoZikge1xuICAgICAgICByZXR1cm4gdGhpcy5hY3F1aXJlKClcbiAgICAgICAgICAgIC50aGVuKHJlbGVhc2UgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIGYoKVxuICAgICAgICAgICAgICAgIC50aGVuKChyZXMpID0+IHtcbiAgICAgICAgICAgICAgICByZWxlYXNlKCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlcztcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICByZWxlYXNlKCk7XG4gICAgICAgICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cbn1cbmV4cG9ydHMuU2VtYXBob3JlID0gU2VtYXBob3JlO1xuY2xhc3MgTXV0ZXggZXh0ZW5kcyBTZW1hcGhvcmUge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigxKTtcbiAgICB9XG59XG5leHBvcnRzLk11dGV4ID0gTXV0ZXg7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1pbmRleC5qcy5tYXAiLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGhheXN0YWNrLCBuZWVkbGUsIGNvbXBhcmF0b3IsIGxvdywgaGlnaCkge1xuICB2YXIgbWlkLCBjbXA7XG5cbiAgaWYobG93ID09PSB1bmRlZmluZWQpXG4gICAgbG93ID0gMDtcblxuICBlbHNlIHtcbiAgICBsb3cgPSBsb3d8MDtcbiAgICBpZihsb3cgPCAwIHx8IGxvdyA+PSBoYXlzdGFjay5sZW5ndGgpXG4gICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcihcImludmFsaWQgbG93ZXIgYm91bmRcIik7XG4gIH1cblxuICBpZihoaWdoID09PSB1bmRlZmluZWQpXG4gICAgaGlnaCA9IGhheXN0YWNrLmxlbmd0aCAtIDE7XG5cbiAgZWxzZSB7XG4gICAgaGlnaCA9IGhpZ2h8MDtcbiAgICBpZihoaWdoIDwgbG93IHx8IGhpZ2ggPj0gaGF5c3RhY2subGVuZ3RoKVxuICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoXCJpbnZhbGlkIHVwcGVyIGJvdW5kXCIpO1xuICB9XG5cbiAgd2hpbGUobG93IDw9IGhpZ2gpIHtcbiAgICAvLyBUaGUgbmFpdmUgYGxvdyArIGhpZ2ggPj4+IDFgIGNvdWxkIGZhaWwgZm9yIGFycmF5IGxlbmd0aHMgPiAyKiozMVxuICAgIC8vIGJlY2F1c2UgYD4+PmAgY29udmVydHMgaXRzIG9wZXJhbmRzIHRvIGludDMyLiBgbG93ICsgKGhpZ2ggLSBsb3cgPj4+IDEpYFxuICAgIC8vIHdvcmtzIGZvciBhcnJheSBsZW5ndGhzIDw9IDIqKjMyLTEgd2hpY2ggaXMgYWxzbyBKYXZhc2NyaXB0J3MgbWF4IGFycmF5XG4gICAgLy8gbGVuZ3RoLlxuICAgIG1pZCA9IGxvdyArICgoaGlnaCAtIGxvdykgPj4+IDEpO1xuICAgIGNtcCA9ICtjb21wYXJhdG9yKGhheXN0YWNrW21pZF0sIG5lZWRsZSwgbWlkLCBoYXlzdGFjayk7XG5cbiAgICAvLyBUb28gbG93LlxuICAgIGlmKGNtcCA8IDAuMClcbiAgICAgIGxvdyAgPSBtaWQgKyAxO1xuXG4gICAgLy8gVG9vIGhpZ2guXG4gICAgZWxzZSBpZihjbXAgPiAwLjApXG4gICAgICBoaWdoID0gbWlkIC0gMTtcblxuICAgIC8vIEtleSBmb3VuZC5cbiAgICBlbHNlXG4gICAgICByZXR1cm4gbWlkO1xuICB9XG5cbiAgLy8gS2V5IG5vdCBmb3VuZC5cbiAgcmV0dXJuIH5sb3c7XG59XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxuLy8gY2FjaGVkIGZyb20gd2hhdGV2ZXIgZ2xvYmFsIGlzIHByZXNlbnQgc28gdGhhdCB0ZXN0IHJ1bm5lcnMgdGhhdCBzdHViIGl0XG4vLyBkb24ndCBicmVhayB0aGluZ3MuICBCdXQgd2UgbmVlZCB0byB3cmFwIGl0IGluIGEgdHJ5IGNhdGNoIGluIGNhc2UgaXQgaXNcbi8vIHdyYXBwZWQgaW4gc3RyaWN0IG1vZGUgY29kZSB3aGljaCBkb2Vzbid0IGRlZmluZSBhbnkgZ2xvYmFscy4gIEl0J3MgaW5zaWRlIGFcbi8vIGZ1bmN0aW9uIGJlY2F1c2UgdHJ5L2NhdGNoZXMgZGVvcHRpbWl6ZSBpbiBjZXJ0YWluIGVuZ2luZXMuXG5cbnZhciBjYWNoZWRTZXRUaW1lb3V0O1xudmFyIGNhY2hlZENsZWFyVGltZW91dDtcblxuZnVuY3Rpb24gZGVmYXVsdFNldFRpbW91dCgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3NldFRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbmZ1bmN0aW9uIGRlZmF1bHRDbGVhclRpbWVvdXQgKCkge1xuICAgIHRocm93IG5ldyBFcnJvcignY2xlYXJUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG4oZnVuY3Rpb24gKCkge1xuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2Ygc2V0VGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2YgY2xlYXJUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgIH1cbn0gKCkpXG5mdW5jdGlvbiBydW5UaW1lb3V0KGZ1bikge1xuICAgIGlmIChjYWNoZWRTZXRUaW1lb3V0ID09PSBzZXRUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICAvLyBpZiBzZXRUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkU2V0VGltZW91dCA9PT0gZGVmYXVsdFNldFRpbW91dCB8fCAhY2FjaGVkU2V0VGltZW91dCkgJiYgc2V0VGltZW91dCkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dChmdW4sIDApO1xuICAgIH0gY2F0Y2goZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwobnVsbCwgZnVuLCAwKTtcbiAgICAgICAgfSBjYXRjaChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yXG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKHRoaXMsIGZ1biwgMCk7XG4gICAgICAgIH1cbiAgICB9XG5cblxufVxuZnVuY3Rpb24gcnVuQ2xlYXJUaW1lb3V0KG1hcmtlcikge1xuICAgIGlmIChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGNsZWFyVGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICAvLyBpZiBjbGVhclRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGRlZmF1bHRDbGVhclRpbWVvdXQgfHwgIWNhY2hlZENsZWFyVGltZW91dCkgJiYgY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCAgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbChudWxsLCBtYXJrZXIpO1xuICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yLlxuICAgICAgICAgICAgLy8gU29tZSB2ZXJzaW9ucyBvZiBJLkUuIGhhdmUgZGlmZmVyZW50IHJ1bGVzIGZvciBjbGVhclRpbWVvdXQgdnMgc2V0VGltZW91dFxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKHRoaXMsIG1hcmtlcik7XG4gICAgICAgIH1cbiAgICB9XG5cblxuXG59XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xudmFyIGN1cnJlbnRRdWV1ZTtcbnZhciBxdWV1ZUluZGV4ID0gLTE7XG5cbmZ1bmN0aW9uIGNsZWFuVXBOZXh0VGljaygpIHtcbiAgICBpZiAoIWRyYWluaW5nIHx8ICFjdXJyZW50UXVldWUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGlmIChjdXJyZW50UXVldWUubGVuZ3RoKSB7XG4gICAgICAgIHF1ZXVlID0gY3VycmVudFF1ZXVlLmNvbmNhdChxdWV1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgIH1cbiAgICBpZiAocXVldWUubGVuZ3RoKSB7XG4gICAgICAgIGRyYWluUXVldWUoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRpbWVvdXQgPSBydW5UaW1lb3V0KGNsZWFuVXBOZXh0VGljayk7XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuXG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHdoaWxlICgrK3F1ZXVlSW5kZXggPCBsZW4pIHtcbiAgICAgICAgICAgIGlmIChjdXJyZW50UXVldWUpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50UXVldWVbcXVldWVJbmRleF0ucnVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgICAgICBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgfVxuICAgIGN1cnJlbnRRdWV1ZSA9IG51bGw7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBydW5DbGVhclRpbWVvdXQodGltZW91dCk7XG59XG5cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDEpO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcXVldWUucHVzaChuZXcgSXRlbShmdW4sIGFyZ3MpKTtcbiAgICBpZiAocXVldWUubGVuZ3RoID09PSAxICYmICFkcmFpbmluZykge1xuICAgICAgICBydW5UaW1lb3V0KGRyYWluUXVldWUpO1xuICAgIH1cbn07XG5cbi8vIHY4IGxpa2VzIHByZWRpY3RpYmxlIG9iamVjdHNcbmZ1bmN0aW9uIEl0ZW0oZnVuLCBhcnJheSkge1xuICAgIHRoaXMuZnVuID0gZnVuO1xuICAgIHRoaXMuYXJyYXkgPSBhcnJheTtcbn1cbkl0ZW0ucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmZ1bi5hcHBseShudWxsLCB0aGlzLmFycmF5KTtcbn07XG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xucHJvY2Vzcy52ZXJzaW9ucyA9IHt9O1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5wcm9jZXNzLnByZXBlbmRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnByZXBlbmRPbmNlTGlzdGVuZXIgPSBub29wO1xuXG5wcm9jZXNzLmxpc3RlbmVycyA9IGZ1bmN0aW9uIChuYW1lKSB7IHJldHVybiBbXSB9XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIiwidmFyIG5leHRUaWNrID0gcmVxdWlyZSgncHJvY2Vzcy9icm93c2VyLmpzJykubmV4dFRpY2s7XG52YXIgYXBwbHkgPSBGdW5jdGlvbi5wcm90b3R5cGUuYXBwbHk7XG52YXIgc2xpY2UgPSBBcnJheS5wcm90b3R5cGUuc2xpY2U7XG52YXIgaW1tZWRpYXRlSWRzID0ge307XG52YXIgbmV4dEltbWVkaWF0ZUlkID0gMDtcblxuLy8gRE9NIEFQSXMsIGZvciBjb21wbGV0ZW5lc3NcblxuZXhwb3J0cy5zZXRUaW1lb3V0ID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBuZXcgVGltZW91dChhcHBseS5jYWxsKHNldFRpbWVvdXQsIHdpbmRvdywgYXJndW1lbnRzKSwgY2xlYXJUaW1lb3V0KTtcbn07XG5leHBvcnRzLnNldEludGVydmFsID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBuZXcgVGltZW91dChhcHBseS5jYWxsKHNldEludGVydmFsLCB3aW5kb3csIGFyZ3VtZW50cyksIGNsZWFySW50ZXJ2YWwpO1xufTtcbmV4cG9ydHMuY2xlYXJUaW1lb3V0ID1cbmV4cG9ydHMuY2xlYXJJbnRlcnZhbCA9IGZ1bmN0aW9uKHRpbWVvdXQpIHsgdGltZW91dC5jbG9zZSgpOyB9O1xuXG5mdW5jdGlvbiBUaW1lb3V0KGlkLCBjbGVhckZuKSB7XG4gIHRoaXMuX2lkID0gaWQ7XG4gIHRoaXMuX2NsZWFyRm4gPSBjbGVhckZuO1xufVxuVGltZW91dC5wcm90b3R5cGUudW5yZWYgPSBUaW1lb3V0LnByb3RvdHlwZS5yZWYgPSBmdW5jdGlvbigpIHt9O1xuVGltZW91dC5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5fY2xlYXJGbi5jYWxsKHdpbmRvdywgdGhpcy5faWQpO1xufTtcblxuLy8gRG9lcyBub3Qgc3RhcnQgdGhlIHRpbWUsIGp1c3Qgc2V0cyB1cCB0aGUgbWVtYmVycyBuZWVkZWQuXG5leHBvcnRzLmVucm9sbCA9IGZ1bmN0aW9uKGl0ZW0sIG1zZWNzKSB7XG4gIGNsZWFyVGltZW91dChpdGVtLl9pZGxlVGltZW91dElkKTtcbiAgaXRlbS5faWRsZVRpbWVvdXQgPSBtc2Vjcztcbn07XG5cbmV4cG9ydHMudW5lbnJvbGwgPSBmdW5jdGlvbihpdGVtKSB7XG4gIGNsZWFyVGltZW91dChpdGVtLl9pZGxlVGltZW91dElkKTtcbiAgaXRlbS5faWRsZVRpbWVvdXQgPSAtMTtcbn07XG5cbmV4cG9ydHMuX3VucmVmQWN0aXZlID0gZXhwb3J0cy5hY3RpdmUgPSBmdW5jdGlvbihpdGVtKSB7XG4gIGNsZWFyVGltZW91dChpdGVtLl9pZGxlVGltZW91dElkKTtcblxuICB2YXIgbXNlY3MgPSBpdGVtLl9pZGxlVGltZW91dDtcbiAgaWYgKG1zZWNzID49IDApIHtcbiAgICBpdGVtLl9pZGxlVGltZW91dElkID0gc2V0VGltZW91dChmdW5jdGlvbiBvblRpbWVvdXQoKSB7XG4gICAgICBpZiAoaXRlbS5fb25UaW1lb3V0KVxuICAgICAgICBpdGVtLl9vblRpbWVvdXQoKTtcbiAgICB9LCBtc2Vjcyk7XG4gIH1cbn07XG5cbi8vIFRoYXQncyBub3QgaG93IG5vZGUuanMgaW1wbGVtZW50cyBpdCBidXQgdGhlIGV4cG9zZWQgYXBpIGlzIHRoZSBzYW1lLlxuZXhwb3J0cy5zZXRJbW1lZGlhdGUgPSB0eXBlb2Ygc2V0SW1tZWRpYXRlID09PSBcImZ1bmN0aW9uXCIgPyBzZXRJbW1lZGlhdGUgOiBmdW5jdGlvbihmbikge1xuICB2YXIgaWQgPSBuZXh0SW1tZWRpYXRlSWQrKztcbiAgdmFyIGFyZ3MgPSBhcmd1bWVudHMubGVuZ3RoIDwgMiA/IGZhbHNlIDogc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuXG4gIGltbWVkaWF0ZUlkc1tpZF0gPSB0cnVlO1xuXG4gIG5leHRUaWNrKGZ1bmN0aW9uIG9uTmV4dFRpY2soKSB7XG4gICAgaWYgKGltbWVkaWF0ZUlkc1tpZF0pIHtcbiAgICAgIC8vIGZuLmNhbGwoKSBpcyBmYXN0ZXIgc28gd2Ugb3B0aW1pemUgZm9yIHRoZSBjb21tb24gdXNlLWNhc2VcbiAgICAgIC8vIEBzZWUgaHR0cDovL2pzcGVyZi5jb20vY2FsbC1hcHBseS1zZWd1XG4gICAgICBpZiAoYXJncykge1xuICAgICAgICBmbi5hcHBseShudWxsLCBhcmdzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZuLmNhbGwobnVsbCk7XG4gICAgICB9XG4gICAgICAvLyBQcmV2ZW50IGlkcyBmcm9tIGxlYWtpbmdcbiAgICAgIGV4cG9ydHMuY2xlYXJJbW1lZGlhdGUoaWQpO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIGlkO1xufTtcblxuZXhwb3J0cy5jbGVhckltbWVkaWF0ZSA9IHR5cGVvZiBjbGVhckltbWVkaWF0ZSA9PT0gXCJmdW5jdGlvblwiID8gY2xlYXJJbW1lZGlhdGUgOiBmdW5jdGlvbihpZCkge1xuICBkZWxldGUgaW1tZWRpYXRlSWRzW2lkXTtcbn07IiwiaW1wb3J0ICogYXMgTGliIGZyb20gJy4uL2xpYic7XHJcblxyXG5jb25zdCBzdWl0cyA9IFsnQ2x1YnMnLCAnRG1uZHMnLCAnSGVhcnRzJywgJ1NwYWRlcycsICdKb2tlciddO1xyXG5jb25zdCByYW5rcyA9IFsnU21hbGwnLCAnQScsICcyJywgJzMnLCAnNCcsICc1JywgJzYnLCAnNycsICc4JywgJzknLCAnMTAnLCAnSicsICdRJywgJ0snLCAnQmlnJ107XHJcblxyXG5jb25zdCBjYXJkSW1hZ2VzID0gbmV3IE1hcDxzdHJpbmcsIEhUTUxJbWFnZUVsZW1lbnQ+KCk7XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbG9hZCgpIHtcclxuICAgIC8vIGxvYWQgY2FyZCBpbWFnZXMgYXN5bmNocm9ub3VzbHlcclxuICAgIGZvciAobGV0IHN1aXQgPSAwOyBzdWl0IDw9IDQ7ICsrc3VpdCkge1xyXG4gICAgICAgIGZvciAobGV0IHJhbmsgPSAwOyByYW5rIDw9IDE0OyArK3JhbmspIHtcclxuICAgICAgICAgICAgaWYgKHN1aXQgPT09IExpYi5TdWl0Lkpva2VyKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoMCA8IHJhbmsgJiYgcmFuayA8IDE0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBpZiAocmFuayA8IDEgfHwgMTMgPCByYW5rKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGltYWdlID0gbmV3IEltYWdlKCk7XHJcbiAgICAgICAgICAgIGltYWdlLnNyYyA9IGBQYXBlckNhcmRzLyR7c3VpdHNbc3VpdF19LyR7cmFua3NbcmFua119b2Yke3N1aXRzW3N1aXRdfS5wbmdgO1xyXG4gICAgICAgICAgICBpbWFnZS5vbmxvYWQgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgbG9hZGVkICcke2ltYWdlLnNyY30nYCk7XHJcbiAgICAgICAgICAgICAgICBjYXJkSW1hZ2VzLnNldChKU09OLnN0cmluZ2lmeShbc3VpdCwgcmFua10pLCBpbWFnZSk7XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgNDsgKytpKSB7XHJcbiAgICAgICAgY29uc3QgaW1hZ2UgPSBuZXcgSW1hZ2UoKTtcclxuICAgICAgICBpbWFnZS5zcmMgPSBgUGFwZXJDYXJkcy9DYXJkQmFjayR7aX0ucG5nYDtcclxuICAgICAgICBpbWFnZS5vbmxvYWQgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBsb2FkZWQgJyR7aW1hZ2Uuc3JjfSdgKTtcclxuICAgICAgICAgICAgY2FyZEltYWdlcy5zZXQoYEJhY2ske2l9YCwgaW1hZ2UpO1xyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgYmxhbmtJbWFnZSA9IG5ldyBJbWFnZSgpO1xyXG4gICAgYmxhbmtJbWFnZS5zcmMgPSAnUGFwZXJDYXJkcy9CbGFuayBDYXJkLnBuZyc7XHJcbiAgICBibGFua0ltYWdlLm9ubG9hZCA9ICgpID0+IHtcclxuICAgICAgICBjb25zb2xlLmxvZyhgbG9hZGVkICcke2JsYW5rSW1hZ2Uuc3JjfSdgKTtcclxuICAgICAgICBjYXJkSW1hZ2VzLnNldCgnQmxhbmsnLCBibGFua0ltYWdlKTtcclxuICAgIH07XHJcblxyXG4gICAgd2hpbGUgKGNhcmRJbWFnZXMuc2l6ZSA8IDQgKiAxMyArIDcpIHtcclxuICAgICAgICBhd2FpdCBMaWIuZGVsYXkoMTApO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnNvbGUubG9nKCdhbGwgY2FyZCBpbWFnZXMgbG9hZGVkJyk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXQoc3RyaW5nRnJvbUNhcmQ6IHN0cmluZyk6IEhUTUxJbWFnZUVsZW1lbnQge1xyXG4gICAgY29uc3QgaW1hZ2UgPSBjYXJkSW1hZ2VzLmdldChzdHJpbmdGcm9tQ2FyZCk7XHJcbiAgICBpZiAoaW1hZ2UgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgY291bGRuJ3QgZmluZCBpbWFnZTogJHtzdHJpbmdGcm9tQ2FyZH1gKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gaW1hZ2U7XHJcbn1cclxuIiwiaW1wb3J0ICogYXMgTGliIGZyb20gJy4uL2xpYic7XHJcbmltcG9ydCAqIGFzIFN0YXRlIGZyb20gJy4vc3RhdGUnO1xyXG5pbXBvcnQgKiBhcyBWUCBmcm9tICcuL3ZpZXctcGFyYW1zJztcclxuaW1wb3J0ICogYXMgQ2FyZEltYWdlcyBmcm9tICcuL2NhcmQtaW1hZ2VzJztcclxuaW1wb3J0ICogYXMgUmVuZGVyIGZyb20gJy4vcmVuZGVyJztcclxuXHJcbi8vIHJlZnJlc2hpbmcgc2hvdWxkIHJlam9pbiB0aGUgc2FtZSBnYW1lXHJcbndpbmRvdy5oaXN0b3J5LnB1c2hTdGF0ZSh1bmRlZmluZWQsIFN0YXRlLmdhbWVJZCwgYC9nYW1lP2dhbWVJZD0ke1N0YXRlLmdhbWVJZH0mcGxheWVyTmFtZT0ke1N0YXRlLnBsYXllck5hbWV9YCk7XHJcblxyXG5hc3luYyBmdW5jdGlvbiBpbml0KCkge1xyXG4gICAgVlAucmVjYWxjdWxhdGVQYXJhbWV0ZXJzKCk7XHJcblxyXG4gICAgLy8gaW5pdGlhbGl6ZSBpbnB1dFxyXG4gICAgd2hpbGUgKFN0YXRlLmdhbWVTdGF0ZSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgYXdhaXQgTGliLmRlbGF5KDEwMCk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgdW5sb2NrID0gYXdhaXQgU3RhdGUubG9jaygpO1xyXG4gICAgdHJ5IHtcclxuICAgICAgICBTdGF0ZS5zZXRTcHJpdGVUYXJnZXRzKFN0YXRlLmdhbWVTdGF0ZSk7XHJcbiAgICB9IGZpbmFsbHkge1xyXG4gICAgICAgIHVubG9jaygpO1xyXG4gICAgfVxyXG59XHJcblxyXG53aW5kb3cub25yZXNpemUgPSBpbml0O1xyXG5cclxud2luZG93Lm9uc2Nyb2xsID0gaW5pdDtcclxuXHJcbig8YW55PndpbmRvdykuZ2FtZSA9IGFzeW5jIGZ1bmN0aW9uIGdhbWUoKSB7XHJcbiAgICBjb25zdCBqb2luUHJvbWlzZSA9IFN0YXRlLmpvaW5HYW1lKFN0YXRlLmdhbWVJZCwgU3RhdGUucGxheWVyTmFtZSk7XHJcbiAgICBhd2FpdCBDYXJkSW1hZ2VzLmxvYWQoKTsgLy8gY29uY3VycmVudGx5XHJcbiAgICBhd2FpdCBqb2luUHJvbWlzZTtcclxuICAgIFxyXG4gICAgLy8gcmVuZGVyaW5nIG11c3QgYmUgc3luY2hyb25vdXMsIG9yIGVsc2UgaXQgZmxpY2tlcnNcclxuICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoUmVuZGVyLnJlbmRlcik7XHJcblxyXG4gICAgYXdhaXQgaW5pdCgpO1xyXG59OyIsImltcG9ydCAqIGFzIExpYiBmcm9tICcuLi9saWInO1xyXG5pbXBvcnQgKiBhcyBTdGF0ZSBmcm9tICcuL3N0YXRlJztcclxuaW1wb3J0ICogYXMgVlAgZnJvbSAnLi92aWV3LXBhcmFtcyc7XHJcbmltcG9ydCBWZWN0b3IgZnJvbSAnLi92ZWN0b3InO1xyXG5pbXBvcnQgU3ByaXRlIGZyb20gJy4vc3ByaXRlJztcclxuXHJcbmludGVyZmFjZSBEcmF3RnJvbURlY2sge1xyXG4gICAgdHlwZTogXCJEcmF3RnJvbURlY2tcIjtcclxuICAgIG1vdXNlUG9zaXRpb25Ub1Nwcml0ZVBvc2l0aW9uOiBWZWN0b3I7XHJcbn1cclxuXHJcbmludGVyZmFjZSBXYWl0aW5nRm9yTmV3Q2FyZCB7XHJcbiAgICB0eXBlOiBcIldhaXRpbmdGb3JOZXdDYXJkXCI7XHJcbiAgICBtb3VzZVBvc2l0aW9uVG9TcHJpdGVQb3NpdGlvbjogVmVjdG9yO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgUmV0dXJuVG9EZWNrIHtcclxuICAgIHR5cGU6IFwiUmV0dXJuVG9EZWNrXCI7XHJcbiAgICBjYXJkSW5kZXg6IG51bWJlcjtcclxuICAgIG1vdXNlUG9zaXRpb25Ub1Nwcml0ZVBvc2l0aW9uOiBWZWN0b3I7XHJcbn1cclxuXHJcbmludGVyZmFjZSBSZW9yZGVyIHtcclxuICAgIHR5cGU6IFwiUmVvcmRlclwiO1xyXG4gICAgY2FyZEluZGV4OiBudW1iZXI7XHJcbiAgICBtb3VzZVBvc2l0aW9uVG9TcHJpdGVQb3NpdGlvbjogVmVjdG9yO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgQ29udHJvbFNoaWZ0Q2xpY2sge1xyXG4gICAgdHlwZTogXCJDb250cm9sU2hpZnRDbGlja1wiO1xyXG4gICAgY2FyZEluZGV4OiBudW1iZXI7XHJcbiAgICBtb3VzZVBvc2l0aW9uVG9TcHJpdGVQb3NpdGlvbjogVmVjdG9yO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgQ29udHJvbENsaWNrIHtcclxuICAgIHR5cGU6IFwiQ29udHJvbENsaWNrXCI7XHJcbiAgICBjYXJkSW5kZXg6IG51bWJlcjtcclxuICAgIG1vdXNlUG9zaXRpb25Ub1Nwcml0ZVBvc2l0aW9uOiBWZWN0b3I7XHJcbn1cclxuXHJcbmludGVyZmFjZSBTaGlmdENsaWNrIHtcclxuICAgIHR5cGU6IFwiU2hpZnRDbGlja1wiO1xyXG4gICAgY2FyZEluZGV4OiBudW1iZXI7XHJcbiAgICBtb3VzZVBvc2l0aW9uVG9TcHJpdGVQb3NpdGlvbjogVmVjdG9yO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgQ2xpY2sge1xyXG4gICAgdHlwZTogXCJDbGlja1wiO1xyXG4gICAgY2FyZEluZGV4OiBudW1iZXI7XHJcbiAgICBtb3VzZVBvc2l0aW9uVG9TcHJpdGVQb3NpdGlvbjogVmVjdG9yO1xyXG59XHJcblxyXG5leHBvcnQgdHlwZSBBY3Rpb24gPVxyXG4gICAgXCJOb25lXCIgfFxyXG4gICAgXCJTb3J0QnlTdWl0XCIgfFxyXG4gICAgXCJTb3J0QnlSYW5rXCIgfFxyXG4gICAgXCJXYWl0XCIgfFxyXG4gICAgXCJQcm9jZWVkXCIgfFxyXG4gICAgXCJEZXNlbGVjdFwiIHxcclxuICAgIERyYXdGcm9tRGVjayB8XHJcbiAgICBXYWl0aW5nRm9yTmV3Q2FyZCB8XHJcbiAgICBSZXR1cm5Ub0RlY2sgfFxyXG4gICAgUmVvcmRlciB8XHJcbiAgICBDb250cm9sU2hpZnRDbGljayB8XHJcbiAgICBDb250cm9sQ2xpY2sgfFxyXG4gICAgU2hpZnRDbGljayB8XHJcbiAgICBDbGljaztcclxuXHJcbmNvbnN0IGRvdWJsZUNsaWNrVGhyZXNob2xkID0gNTAwOyAvLyBtaWxsaXNlY29uZHNcclxuY29uc3QgbW92ZVRocmVzaG9sZCA9IDAuNSAqIFZQLnBpeGVsc1BlckNNO1xyXG5cclxuZXhwb3J0IGxldCBhY3Rpb246IEFjdGlvbiA9IFwiTm9uZVwiO1xyXG5cclxubGV0IHByZXZpb3VzQ2xpY2tUaW1lID0gLTE7XHJcbmxldCBwcmV2aW91c0NsaWNrSW5kZXggPSAtMTtcclxubGV0IG1vdXNlRG93blBvc2l0aW9uID0gPFZlY3Rvcj57IHg6IDAsIHk6IDAgfTtcclxubGV0IG1vdXNlTW92ZVBvc2l0aW9uID0gPFZlY3Rvcj57IHg6IDAsIHk6IDAgfTtcclxubGV0IGV4Y2VlZGVkRHJhZ1RocmVzaG9sZCA9IGZhbHNlO1xyXG5cclxubGV0IGhvbGRpbmdDb250cm9sID0gZmFsc2U7XHJcbmxldCBob2xkaW5nU2hpZnQgPSBmYWxzZTtcclxud2luZG93Lm9ua2V5ZG93biA9IChlOiBLZXlib2FyZEV2ZW50KSA9PiB7XHJcbiAgICBpZiAoZS5rZXkgPT09IFwiQ29udHJvbFwiKSB7XHJcbiAgICAgICAgaG9sZGluZ0NvbnRyb2wgPSB0cnVlO1xyXG4gICAgfSBlbHNlIGlmIChlLmtleSA9PT0gXCJTaGlmdFwiKSB7XHJcbiAgICAgICAgaG9sZGluZ1NoaWZ0ID0gdHJ1ZTtcclxuICAgIH1cclxufTtcclxuXHJcbndpbmRvdy5vbmtleXVwID0gKGU6IEtleWJvYXJkRXZlbnQpID0+IHtcclxuICAgIGlmIChlLmtleSA9PT0gXCJDb250cm9sXCIpIHtcclxuICAgICAgICBob2xkaW5nQ29udHJvbCA9IGZhbHNlO1xyXG4gICAgfSBlbHNlIGlmIChlLmtleSA9PT0gXCJTaGlmdFwiKSB7XHJcbiAgICAgICAgaG9sZGluZ1NoaWZ0ID0gZmFsc2U7XHJcbiAgICB9XHJcbn07XHJcblxyXG5mdW5jdGlvbiBnZXRNb3VzZVBvc2l0aW9uKGU6IE1vdXNlRXZlbnQpIHtcclxuICAgIHJldHVybiBuZXcgVmVjdG9yKFxyXG4gICAgICAgIFZQLmNhbnZhcy53aWR0aCAqIChlLmNsaWVudFggLSBWUC5jYW52YXNSZWN0LmxlZnQpIC8gVlAuY2FudmFzUmVjdC53aWR0aCxcclxuICAgICAgICBWUC5jYW52YXMuaGVpZ2h0ICogKGUuY2xpZW50WSAtIFZQLmNhbnZhc1JlY3QudG9wKSAvIFZQLmNhbnZhc1JlY3QuaGVpZ2h0XHJcbiAgICApO1xyXG59XHJcblxyXG5WUC5jYW52YXMub25tb3VzZWRvd24gPSBhc3luYyAoZXZlbnQ6IE1vdXNlRXZlbnQpID0+IHtcclxuICAgIGNvbnN0IHVubG9jayA9IGF3YWl0IFN0YXRlLmxvY2soKTtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgbW91c2VEb3duUG9zaXRpb24gPSBnZXRNb3VzZVBvc2l0aW9uKGV2ZW50KTtcclxuICAgICAgICBtb3VzZU1vdmVQb3NpdGlvbiA9IG1vdXNlRG93blBvc2l0aW9uO1xyXG4gICAgICAgIGV4Y2VlZGVkRHJhZ1RocmVzaG9sZCA9IGZhbHNlO1xyXG5cclxuICAgICAgICBjb25zdCBkZWNrUG9zaXRpb24gPSBTdGF0ZS5kZWNrU3ByaXRlc1tTdGF0ZS5kZWNrU3ByaXRlcy5sZW5ndGggLSAxXT8ucG9zaXRpb247XHJcblxyXG4gICAgICAgIGlmIChWUC5zb3J0QnlSYW5rQm91bmRzWzBdLnggPCBtb3VzZURvd25Qb3NpdGlvbi54ICYmIG1vdXNlRG93blBvc2l0aW9uLnggPCBWUC5zb3J0QnlSYW5rQm91bmRzWzFdLnggJiZcclxuICAgICAgICAgICAgVlAuc29ydEJ5UmFua0JvdW5kc1swXS55IDwgbW91c2VEb3duUG9zaXRpb24ueSAmJiBtb3VzZURvd25Qb3NpdGlvbi55IDwgVlAuc29ydEJ5UmFua0JvdW5kc1sxXS55XHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICAgIGFjdGlvbiA9IFwiU29ydEJ5UmFua1wiO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoXHJcbiAgICAgICAgICAgIFZQLnNvcnRCeVN1aXRCb3VuZHNbMF0ueCA8IG1vdXNlRG93blBvc2l0aW9uLnggJiYgbW91c2VEb3duUG9zaXRpb24ueCA8IFZQLnNvcnRCeVN1aXRCb3VuZHNbMV0ueCAmJlxyXG4gICAgICAgICAgICBWUC5zb3J0QnlTdWl0Qm91bmRzWzBdLnkgPCBtb3VzZURvd25Qb3NpdGlvbi55ICYmIG1vdXNlRG93blBvc2l0aW9uLnkgPCBWUC5zb3J0QnlTdWl0Qm91bmRzWzFdLnlcclxuICAgICAgICApIHtcclxuICAgICAgICAgICAgYWN0aW9uID0gXCJTb3J0QnlTdWl0XCI7XHJcbiAgICAgICAgfSBlbHNlIGlmIChcclxuICAgICAgICAgICAgVlAud2FpdEJvdW5kc1swXS54IDwgbW91c2VEb3duUG9zaXRpb24ueCAmJiBtb3VzZURvd25Qb3NpdGlvbi54IDwgVlAud2FpdEJvdW5kc1sxXS54ICYmXHJcbiAgICAgICAgICAgIFZQLndhaXRCb3VuZHNbMF0ueSA8IG1vdXNlRG93blBvc2l0aW9uLnkgJiYgbW91c2VEb3duUG9zaXRpb24ueSA8IFZQLndhaXRCb3VuZHNbMV0ueVxyXG4gICAgICAgICkge1xyXG4gICAgICAgICAgICBhY3Rpb24gPSBcIldhaXRcIjtcclxuICAgICAgICB9IGVsc2UgaWYgKFxyXG4gICAgICAgICAgICBWUC5wcm9jZWVkQm91bmRzWzBdLnggPCBtb3VzZURvd25Qb3NpdGlvbi54ICYmIG1vdXNlRG93blBvc2l0aW9uLnggPCBWUC5wcm9jZWVkQm91bmRzWzFdLnggJiZcclxuICAgICAgICAgICAgVlAucHJvY2VlZEJvdW5kc1swXS55IDwgbW91c2VEb3duUG9zaXRpb24ueSAmJiBtb3VzZURvd25Qb3NpdGlvbi55IDwgVlAucHJvY2VlZEJvdW5kc1sxXS55XHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICAgIGFjdGlvbiA9IFwiUHJvY2VlZFwiO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoZGVja1Bvc2l0aW9uICE9PSB1bmRlZmluZWQgJiZcclxuICAgICAgICAgICAgZGVja1Bvc2l0aW9uLnggPCBtb3VzZURvd25Qb3NpdGlvbi54ICYmIG1vdXNlRG93blBvc2l0aW9uLnggPCBkZWNrUG9zaXRpb24ueCArIFZQLnNwcml0ZVdpZHRoICYmXHJcbiAgICAgICAgICAgIGRlY2tQb3NpdGlvbi55IDwgbW91c2VEb3duUG9zaXRpb24ueSAmJiBtb3VzZURvd25Qb3NpdGlvbi55IDwgZGVja1Bvc2l0aW9uLnkgKyBWUC5zcHJpdGVIZWlnaHRcclxuICAgICAgICApIHtcclxuICAgICAgICAgICAgYWN0aW9uID0ge1xyXG4gICAgICAgICAgICAgICAgbW91c2VQb3NpdGlvblRvU3ByaXRlUG9zaXRpb246IGRlY2tQb3NpdGlvbi5zdWIobW91c2VEb3duUG9zaXRpb24pLFxyXG4gICAgICAgICAgICAgICAgdHlwZTogXCJEcmF3RnJvbURlY2tcIlxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIC8vIGJlY2F1c2Ugd2UgcmVuZGVyIGxlZnQgdG8gcmlnaHQsIHRoZSByaWdodG1vc3QgY2FyZCB1bmRlciB0aGUgbW91c2UgcG9zaXRpb24gaXMgd2hhdCB3ZSBzaG91bGQgcmV0dXJuXHJcbiAgICAgICAgICAgIGNvbnN0IHNwcml0ZXMgPSBTdGF0ZS5mYWNlU3ByaXRlc0ZvclBsYXllcls8bnVtYmVyPlN0YXRlLmdhbWVTdGF0ZT8ucGxheWVySW5kZXhdO1xyXG4gICAgICAgICAgICBpZiAoc3ByaXRlcyA9PT0gdW5kZWZpbmVkKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICBsZXQgZGVzZWxlY3QgPSB0cnVlO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gc3ByaXRlcy5sZW5ndGggLSAxOyBpID49IDA7IC0taSkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcG9zaXRpb24gPSBzcHJpdGVzW2ldPy5wb3NpdGlvbjtcclxuICAgICAgICAgICAgICAgIGlmIChwb3NpdGlvbiAhPT0gdW5kZWZpbmVkICYmXHJcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb24ueCA8IG1vdXNlRG93blBvc2l0aW9uLnggJiYgbW91c2VEb3duUG9zaXRpb24ueCA8IHBvc2l0aW9uLnggKyBWUC5zcHJpdGVXaWR0aCAmJlxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uLnkgPCBtb3VzZURvd25Qb3NpdGlvbi55ICYmIG1vdXNlRG93blBvc2l0aW9uLnkgPCBwb3NpdGlvbi55ICsgVlAuc3ByaXRlSGVpZ2h0XHJcbiAgICAgICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgICAgICBkZXNlbGVjdCA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBhY3Rpb24gPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhcmRJbmRleDogaSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbW91c2VQb3NpdGlvblRvU3ByaXRlUG9zaXRpb246IHBvc2l0aW9uLnN1Yihtb3VzZURvd25Qb3NpdGlvbiksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IGhvbGRpbmdDb250cm9sICYmIGhvbGRpbmdTaGlmdCA/IFwiQ29udHJvbFNoaWZ0Q2xpY2tcIiA6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBob2xkaW5nQ29udHJvbCA/IFwiQ29udHJvbENsaWNrXCIgOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaG9sZGluZ1NoaWZ0ID8gXCJTaGlmdENsaWNrXCIgOiBcIkNsaWNrXCJcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoZGVzZWxlY3QpIHtcclxuICAgICAgICAgICAgICAgIGFjdGlvbiA9IFwiRGVzZWxlY3RcIjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgdW5sb2NrKCk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5WUC5jYW52YXMub25tb3VzZW1vdmUgPSBhc3luYyAoZXZlbnQ6IE1vdXNlRXZlbnQpID0+IHtcclxuICAgIGlmIChTdGF0ZS5nYW1lU3RhdGUgPT09IHVuZGVmaW5lZCkgcmV0dXJuO1xyXG5cclxuICAgIGNvbnN0IHVubG9jayA9IGF3YWl0IFN0YXRlLmxvY2soKTtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgbW91c2VNb3ZlUG9zaXRpb24gPSBnZXRNb3VzZVBvc2l0aW9uKGV2ZW50KTtcclxuICAgICAgICBleGNlZWRlZERyYWdUaHJlc2hvbGQgPSBleGNlZWRlZERyYWdUaHJlc2hvbGQgfHwgbW91c2VNb3ZlUG9zaXRpb24uZGlzdGFuY2UobW91c2VEb3duUG9zaXRpb24pID4gbW92ZVRocmVzaG9sZDtcclxuXHJcbiAgICAgICAgaWYgKGFjdGlvbiA9PT0gXCJOb25lXCIpIHtcclxuICAgICAgICAgICAgLy8gZG8gbm90aGluZ1xyXG4gICAgICAgIH0gZWxzZSBpZiAoYWN0aW9uID09PSBcIlNvcnRCeVN1aXRcIikge1xyXG4gICAgICAgICAgICAvLyBUT0RPOiBjaGVjayB3aGV0aGVyIG1vdXNlIHBvc2l0aW9uIGhhcyBsZWZ0IGJ1dHRvbiBib3VuZHNcclxuICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbiA9PT0gXCJTb3J0QnlSYW5rXCIpIHtcclxuICAgICAgICAgICAgLy8gVE9ETzogY2hlY2sgd2hldGhlciBtb3VzZSBwb3NpdGlvbiBoYXMgbGVmdCBidXR0b24gYm91bmRzXHJcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24gPT09IFwiV2FpdFwiKSB7XHJcbiAgICAgICAgICAgIC8vIFRPRE86IGNoZWNrIHdoZXRoZXIgbW91c2UgcG9zaXRpb24gaGFzIGxlZnQgYnV0dG9uIGJvdW5kc1xyXG4gICAgICAgIH0gZWxzZSBpZiAoYWN0aW9uID09PSBcIlByb2NlZWRcIikge1xyXG4gICAgICAgICAgICAvLyBUT0RPOiBjaGVjayB3aGV0aGVyIG1vdXNlIHBvc2l0aW9uIGhhcyBsZWZ0IGJ1dHRvbiBib3VuZHNcclxuICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbiA9PT0gXCJEZXNlbGVjdFwiKSB7XHJcbiAgICAgICAgICAgIC8vIFRPRE86IGJveCBzZWxlY3Rpb24/XHJcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24udHlwZSA9PT0gXCJEcmF3RnJvbURlY2tcIiB8fCBhY3Rpb24udHlwZSA9PT0gXCJXYWl0aW5nRm9yTmV3Q2FyZFwiKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGRlY2tTcHJpdGUgPSBTdGF0ZS5kZWNrU3ByaXRlc1tTdGF0ZS5kZWNrU3ByaXRlcy5sZW5ndGggLSAxXTtcclxuICAgICAgICAgICAgaWYgKGRlY2tTcHJpdGUgPT09IHVuZGVmaW5lZCkgcmV0dXJuO1xyXG4gICAgICAgICAgICBkZWNrU3ByaXRlLnRhcmdldCA9IG1vdXNlTW92ZVBvc2l0aW9uLmFkZChhY3Rpb24ubW91c2VQb3NpdGlvblRvU3ByaXRlUG9zaXRpb24pO1xyXG5cclxuICAgICAgICAgICAgaWYgKGFjdGlvbi50eXBlID09PSBcIkRyYXdGcm9tRGVja1wiICYmIGV4Y2VlZGVkRHJhZ1RocmVzaG9sZCkge1xyXG4gICAgICAgICAgICAgICAgYWN0aW9uID0geyAuLi5hY3Rpb24sIHR5cGU6IFwiV2FpdGluZ0Zvck5ld0NhcmRcIiB9O1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIGNhcmQgZHJhd2luZyB3aWxsIHRyeSB0byBsb2NrIHRoZSBzdGF0ZSwgc28gd2UgbXVzdCBhdHRhY2ggYSBjYWxsYmFjayBpbnN0ZWFkIG9mIGF3YWl0aW5nXHJcbiAgICAgICAgICAgICAgICBTdGF0ZS5kcmF3Q2FyZCgpLnRoZW4ob25DYXJkRHJhd24oZGVja1Nwcml0ZSkpLmNhdGNoKF8gPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChhY3Rpb24gIT09IFwiTm9uZVwiICYmXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbiAhPT0gXCJEZXNlbGVjdFwiICYmXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbiAhPT0gXCJTb3J0QnlSYW5rXCIgJiZcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uICE9PSBcIlNvcnRCeVN1aXRcIiAmJlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb24gIT09IFwiV2FpdFwiICYmXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbiAhPT0gXCJQcm9jZWVkXCIgJiZcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uLnR5cGUgPT09IFwiV2FpdGluZ0Zvck5ld0NhcmRcIlxyXG4gICAgICAgICAgICAgICAgICAgICkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb24gPSBcIk5vbmVcIjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSBpZiAoYWN0aW9uLnR5cGUgPT09IFwiUmV0dXJuVG9EZWNrXCIgfHwgYWN0aW9uLnR5cGUgPT09IFwiUmVvcmRlclwiICkge1xyXG4gICAgICAgICAgICBjb25zdCBzcHJpdGVzID0gU3RhdGUuZmFjZVNwcml0ZXNGb3JQbGF5ZXJbU3RhdGUuZ2FtZVN0YXRlLnBsYXllckluZGV4XTtcclxuICAgICAgICAgICAgaWYgKHNwcml0ZXMgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcblxyXG4gICAgICAgICAgICAvLyBtb3ZlIGFsbCBzZWxlY3RlZCBjYXJkcyBhcyBhIGdyb3VwIGFyb3VuZCB0aGUgY2FyZCB1bmRlciB0aGUgbW91c2UgcG9zaXRpb25cclxuICAgICAgICAgICAgZm9yIChjb25zdCBzZWxlY3RlZEluZGV4IG9mIFN0YXRlLnNlbGVjdGVkSW5kaWNlcykge1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgc3ByaXRlID0gc3ByaXRlc1tzZWxlY3RlZEluZGV4XTtcclxuICAgICAgICAgICAgICAgIGlmIChzcHJpdGUgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICAgICAgICAgICAgICBzcHJpdGUudGFyZ2V0ID0gbW91c2VNb3ZlUG9zaXRpb24uYWRkKGFjdGlvbi5tb3VzZVBvc2l0aW9uVG9TcHJpdGVQb3NpdGlvbikuYWRkKG5ldyBWZWN0b3IoKHNlbGVjdGVkSW5kZXggLSBhY3Rpb24uY2FyZEluZGV4KSAqIFZQLnNwcml0ZUdhcCwgMCkpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBkcmFnKFN0YXRlLmdhbWVTdGF0ZSwgYWN0aW9uLmNhcmRJbmRleCwgYWN0aW9uLm1vdXNlUG9zaXRpb25Ub1Nwcml0ZVBvc2l0aW9uKTtcclxuICAgICAgICB9IGVsc2UgaWYgKFxyXG4gICAgICAgICAgICBhY3Rpb24udHlwZSA9PT0gXCJDb250cm9sU2hpZnRDbGlja1wiIHx8XHJcbiAgICAgICAgICAgIGFjdGlvbi50eXBlID09PSBcIkNvbnRyb2xDbGlja1wiIHx8XHJcbiAgICAgICAgICAgIGFjdGlvbi50eXBlID09PSBcIlNoaWZ0Q2xpY2tcIiB8fFxyXG4gICAgICAgICAgICBhY3Rpb24udHlwZSA9PT0gXCJDbGlja1wiXHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICAgIGlmIChleGNlZWRlZERyYWdUaHJlc2hvbGQpIHtcclxuICAgICAgICAgICAgICAgIC8vIGRyYWdnaW5nIGEgbm9uLXNlbGVjdGVkIGNhcmQgc2VsZWN0cyBpdCBhbmQgb25seSBpdFxyXG4gICAgICAgICAgICAgICAgbGV0IGkgPSBMaWIuYmluYXJ5U2VhcmNoTnVtYmVyKFN0YXRlLnNlbGVjdGVkSW5kaWNlcywgYWN0aW9uLmNhcmRJbmRleCk7XHJcbiAgICAgICAgICAgICAgICBpZiAoaSA8IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBpID0gMDtcclxuICAgICAgICAgICAgICAgICAgICBTdGF0ZS5zZWxlY3RlZEluZGljZXMuc3BsaWNlKGksIFN0YXRlLnNlbGVjdGVkSW5kaWNlcy5sZW5ndGgsIGFjdGlvbi5jYXJkSW5kZXgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGRyYWcoU3RhdGUuZ2FtZVN0YXRlLCBhY3Rpb24uY2FyZEluZGV4LCBhY3Rpb24ubW91c2VQb3NpdGlvblRvU3ByaXRlUG9zaXRpb24pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgY29uc3QgXzogbmV2ZXIgPSBhY3Rpb247XHJcbiAgICAgICAgfVxyXG4gICAgfSBmaW5hbGx5IHtcclxuICAgICAgICB1bmxvY2soKTtcclxuICAgIH1cclxufTtcclxuXHJcblZQLmNhbnZhcy5vbm1vdXNldXAgPSBhc3luYyAoKSA9PiB7XHJcbiAgICBpZiAoU3RhdGUuZ2FtZVN0YXRlID09PSB1bmRlZmluZWQpIHJldHVybjtcclxuXHJcbiAgICBjb25zdCB1bmxvY2sgPSBhd2FpdCBTdGF0ZS5sb2NrKCk7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIGlmIChhY3Rpb24gPT09IFwiTm9uZVwiKSB7XHJcbiAgICAgICAgICAgIC8vIGRvIG5vdGhpbmdcclxuICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbiA9PT0gXCJTb3J0QnlSYW5rXCIpIHtcclxuICAgICAgICAgICAgYXdhaXQgU3RhdGUuc29ydEJ5UmFuayhTdGF0ZS5nYW1lU3RhdGUpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoYWN0aW9uID09PSBcIlNvcnRCeVN1aXRcIikge1xyXG4gICAgICAgICAgICBhd2FpdCBTdGF0ZS5zb3J0QnlTdWl0KFN0YXRlLmdhbWVTdGF0ZSk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24gPT09IFwiV2FpdFwiKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCd3YWl0aW5nJyk7XHJcbiAgICAgICAgICAgIGF3YWl0IFN0YXRlLndhaXQoKTtcclxuICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbiA9PT0gXCJQcm9jZWVkXCIpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ3Byb2NlZWRpbmcnKTtcclxuICAgICAgICAgICAgYXdhaXQgU3RhdGUucHJvY2VlZCgpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoYWN0aW9uID09PSBcIkRlc2VsZWN0XCIpIHtcclxuICAgICAgICAgICAgU3RhdGUuc2VsZWN0ZWRJbmRpY2VzLnNwbGljZSgwLCBTdGF0ZS5zZWxlY3RlZEluZGljZXMubGVuZ3RoKTtcclxuICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbi50eXBlID09PSBcIkRyYXdGcm9tRGVja1wiIHx8IGFjdGlvbi50eXBlID09PSBcIldhaXRpbmdGb3JOZXdDYXJkXCIpIHtcclxuICAgICAgICAgICAgLy8gZG8gbm90aGluZ1xyXG4gICAgICAgIH0gZWxzZSBpZiAoYWN0aW9uLnR5cGUgPT09IFwiUmVvcmRlclwiKSB7XHJcbiAgICAgICAgICAgIHByZXZpb3VzQ2xpY2tJbmRleCA9IGFjdGlvbi5jYXJkSW5kZXg7XHJcbiAgICAgICAgICAgIGF3YWl0IFN0YXRlLnJlb3JkZXJDYXJkcyhTdGF0ZS5nYW1lU3RhdGUpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoYWN0aW9uLnR5cGUgPT09IFwiUmV0dXJuVG9EZWNrXCIpIHtcclxuICAgICAgICAgICAgcHJldmlvdXNDbGlja0luZGV4ID0gLTE7XHJcbiAgICAgICAgICAgIGF3YWl0IFN0YXRlLnJldHVybkNhcmRzVG9EZWNrKFN0YXRlLmdhbWVTdGF0ZSk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24udHlwZSA9PT0gXCJDb250cm9sU2hpZnRDbGlja1wiKSB7XHJcbiAgICAgICAgICAgIGlmIChwcmV2aW91c0NsaWNrSW5kZXggPT09IC0xKSB7XHJcbiAgICAgICAgICAgICAgICBwcmV2aW91c0NsaWNrSW5kZXggPSBhY3Rpb24uY2FyZEluZGV4O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBzdGFydCA9IE1hdGgubWluKGFjdGlvbi5jYXJkSW5kZXgsIHByZXZpb3VzQ2xpY2tJbmRleCk7XHJcbiAgICAgICAgICAgIGNvbnN0IGVuZCA9IE1hdGgubWF4KGFjdGlvbi5jYXJkSW5kZXgsIHByZXZpb3VzQ2xpY2tJbmRleCk7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSBzdGFydDsgaSA8PSBlbmQ7ICsraSkge1xyXG4gICAgICAgICAgICAgICAgbGV0IGogPSBMaWIuYmluYXJ5U2VhcmNoTnVtYmVyKFN0YXRlLnNlbGVjdGVkSW5kaWNlcywgaSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoaiA8IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBTdGF0ZS5zZWxlY3RlZEluZGljZXMuc3BsaWNlKH5qLCAwLCBpKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSBpZiAoYWN0aW9uLnR5cGUgPT09IFwiQ29udHJvbENsaWNrXCIpIHtcclxuICAgICAgICAgICAgcHJldmlvdXNDbGlja0luZGV4ID0gYWN0aW9uLmNhcmRJbmRleDtcclxuICAgICAgICAgICAgbGV0IGkgPSBMaWIuYmluYXJ5U2VhcmNoTnVtYmVyKFN0YXRlLnNlbGVjdGVkSW5kaWNlcywgYWN0aW9uLmNhcmRJbmRleCk7XHJcbiAgICAgICAgICAgIGlmIChpIDwgMCkge1xyXG4gICAgICAgICAgICAgICAgU3RhdGUuc2VsZWN0ZWRJbmRpY2VzLnNwbGljZSh+aSwgMCwgYWN0aW9uLmNhcmRJbmRleCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBTdGF0ZS5zZWxlY3RlZEluZGljZXMuc3BsaWNlKGksIDEpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24udHlwZSA9PT0gXCJTaGlmdENsaWNrXCIpIHtcclxuICAgICAgICAgICAgaWYgKHByZXZpb3VzQ2xpY2tJbmRleCA9PT0gLTEpIHtcclxuICAgICAgICAgICAgICAgIHByZXZpb3VzQ2xpY2tJbmRleCA9IGFjdGlvbi5jYXJkSW5kZXg7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHN0YXJ0ID0gTWF0aC5taW4oYWN0aW9uLmNhcmRJbmRleCwgcHJldmlvdXNDbGlja0luZGV4KTtcclxuICAgICAgICAgICAgY29uc3QgZW5kID0gTWF0aC5tYXgoYWN0aW9uLmNhcmRJbmRleCwgcHJldmlvdXNDbGlja0luZGV4KTtcclxuICAgICAgICAgICAgU3RhdGUuc2VsZWN0ZWRJbmRpY2VzLnNwbGljZSgwLCBTdGF0ZS5zZWxlY3RlZEluZGljZXMubGVuZ3RoKTtcclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IHN0YXJ0OyBpIDw9IGVuZDsgKytpKSB7XHJcbiAgICAgICAgICAgICAgICBTdGF0ZS5zZWxlY3RlZEluZGljZXMucHVzaChpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSBpZiAoYWN0aW9uLnR5cGUgPT09IFwiQ2xpY2tcIikge1xyXG4gICAgICAgICAgICBwcmV2aW91c0NsaWNrSW5kZXggPSBhY3Rpb24uY2FyZEluZGV4O1xyXG4gICAgICAgICAgICBTdGF0ZS5zZWxlY3RlZEluZGljZXMuc3BsaWNlKDAsIFN0YXRlLnNlbGVjdGVkSW5kaWNlcy5sZW5ndGgsIGFjdGlvbi5jYXJkSW5kZXgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgU3RhdGUuc2V0U3ByaXRlVGFyZ2V0cyhTdGF0ZS5nYW1lU3RhdGUpO1xyXG5cclxuICAgICAgICBhY3Rpb24gPSBcIk5vbmVcIjtcclxuICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgdW5sb2NrKCk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5mdW5jdGlvbiBvbkNhcmREcmF3bihkZWNrU3ByaXRlOiBTcHJpdGUpIHtcclxuICAgIHJldHVybiBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgaWYgKFN0YXRlLmdhbWVTdGF0ZSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuXHJcbiAgICAgICAgY29uc3QgdW5sb2NrID0gYXdhaXQgU3RhdGUubG9jaygpO1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGlmIChhY3Rpb24gIT09IFwiTm9uZVwiICYmXHJcbiAgICAgICAgICAgICAgICBhY3Rpb24gIT09IFwiU29ydEJ5U3VpdFwiICYmXHJcbiAgICAgICAgICAgICAgICBhY3Rpb24gIT09IFwiU29ydEJ5UmFua1wiICYmXHJcbiAgICAgICAgICAgICAgICBhY3Rpb24gIT09IFwiV2FpdFwiICYmXHJcbiAgICAgICAgICAgICAgICBhY3Rpb24gIT09IFwiUHJvY2VlZFwiICYmXHJcbiAgICAgICAgICAgICAgICBhY3Rpb24gIT09IFwiRGVzZWxlY3RcIiAmJlxyXG4gICAgICAgICAgICAgICAgYWN0aW9uLnR5cGUgPT09IFwiV2FpdGluZ0Zvck5ld0NhcmRcIlxyXG4gICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgIC8vIGltbWVkaWF0ZWx5IHNlbGVjdCBuZXdseSBhY3F1aXJlZCBjYXJkXHJcbiAgICAgICAgICAgICAgICBjb25zdCBjYXJkSW5kZXggPSBTdGF0ZS5nYW1lU3RhdGUucGxheWVyQ2FyZHMubGVuZ3RoIC0gMTtcclxuICAgICAgICAgICAgICAgIFN0YXRlLnNlbGVjdGVkSW5kaWNlcy5zcGxpY2UoMCwgU3RhdGUuc2VsZWN0ZWRJbmRpY2VzLmxlbmd0aCk7XHJcbiAgICAgICAgICAgICAgICBTdGF0ZS5zZWxlY3RlZEluZGljZXMucHVzaChjYXJkSW5kZXgpO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIG5ldyBjYXJkIHNob3VsZCBhcHBlYXIgaW4gcGxhY2Ugb2YgZHJhZ2dlZCBjYXJkIGZyb20gZGVjayB3aXRob3V0IGFuaW1hdGlvblxyXG4gICAgICAgICAgICAgICAgY29uc3QgZmFjZVNwcml0ZUF0TW91c2VEb3duID0gU3RhdGUuZmFjZVNwcml0ZXNGb3JQbGF5ZXJbU3RhdGUuZ2FtZVN0YXRlLnBsYXllckluZGV4XT8uW2NhcmRJbmRleF07XHJcbiAgICAgICAgICAgICAgICBpZiAoZmFjZVNwcml0ZUF0TW91c2VEb3duID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG4gICAgICAgICAgICAgICAgZmFjZVNwcml0ZUF0TW91c2VEb3duLnRhcmdldCA9IGRlY2tTcHJpdGUucG9zaXRpb247XHJcbiAgICAgICAgICAgICAgICBmYWNlU3ByaXRlQXRNb3VzZURvd24ucG9zaXRpb24gPSBkZWNrU3ByaXRlLnBvc2l0aW9uO1xyXG4gICAgICAgICAgICAgICAgZmFjZVNwcml0ZUF0TW91c2VEb3duLnZlbG9jaXR5ID0gZGVja1Nwcml0ZS52ZWxvY2l0eTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgZHJhZyhTdGF0ZS5nYW1lU3RhdGUsIGNhcmRJbmRleCwgYWN0aW9uLm1vdXNlUG9zaXRpb25Ub1Nwcml0ZVBvc2l0aW9uKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgICAgIHVubG9jaygpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRyYWcoZ2FtZVN0YXRlOiBMaWIuR2FtZVN0YXRlLCBjYXJkSW5kZXg6IG51bWJlciwgbW91c2VQb3NpdGlvblRvU3ByaXRlUG9zaXRpb246IFZlY3Rvcikge1xyXG4gICAgY29uc3Qgc3ByaXRlcyA9IFN0YXRlLmZhY2VTcHJpdGVzRm9yUGxheWVyW2dhbWVTdGF0ZS5wbGF5ZXJJbmRleF07XHJcbiAgICBpZiAoc3ByaXRlcyA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuXHJcbiAgICBjb25zdCBjYXJkcyA9IGdhbWVTdGF0ZS5wbGF5ZXJDYXJkcztcclxuXHJcbiAgICBjb25zdCBtb3ZpbmdTcHJpdGVzQW5kQ2FyZHM6IFtTcHJpdGUsIExpYi5DYXJkXVtdID0gW107XHJcbiAgICBjb25zdCByZXNlcnZlZFNwcml0ZXNBbmRDYXJkczogW1Nwcml0ZSwgTGliLkNhcmRdW10gPSBbXTtcclxuXHJcbiAgICBsZXQgc3BsaXRJbmRleDogbnVtYmVyIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xyXG4gICAgbGV0IHNoYXJlQ291bnQgPSBnYW1lU3RhdGUucGxheWVyU2hhcmVDb3VudDtcclxuICAgIGxldCByZXZlYWxDb3VudCA9IGdhbWVTdGF0ZS5wbGF5ZXJSZXZlYWxDb3VudDtcclxuXHJcbiAgICAvLyBleHRyYWN0IG1vdmluZyBzcHJpdGVzXHJcbiAgICBmb3IgKGNvbnN0IGkgb2YgU3RhdGUuc2VsZWN0ZWRJbmRpY2VzKSB7XHJcbiAgICAgICAgY29uc3Qgc3ByaXRlID0gc3ByaXRlc1tpXTtcclxuICAgICAgICBjb25zdCBjYXJkID0gY2FyZHNbaV07XHJcbiAgICAgICAgaWYgKHNwcml0ZSA9PT0gdW5kZWZpbmVkIHx8IGNhcmQgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICAgICAgbW92aW5nU3ByaXRlc0FuZENhcmRzLnB1c2goW3Nwcml0ZSwgY2FyZF0pO1xyXG5cclxuICAgICAgICBpZiAoaSA8IGdhbWVTdGF0ZS5wbGF5ZXJTaGFyZUNvdW50KSB7XHJcbiAgICAgICAgICAgIC0tc2hhcmVDb3VudDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChpIDwgZ2FtZVN0YXRlLnBsYXllclJldmVhbENvdW50KSB7XHJcbiAgICAgICAgICAgIC0tcmV2ZWFsQ291bnQ7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIGV4dHJhY3QgcmVzZXJ2ZWQgc3ByaXRlc1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzcHJpdGVzLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgaWYgKExpYi5iaW5hcnlTZWFyY2hOdW1iZXIoU3RhdGUuc2VsZWN0ZWRJbmRpY2VzLCBpKSA8IDApIHtcclxuICAgICAgICAgICAgY29uc3Qgc3ByaXRlID0gc3ByaXRlc1tpXTtcclxuICAgICAgICAgICAgY29uc3QgY2FyZCA9IGNhcmRzW2ldO1xyXG4gICAgICAgICAgICBpZiAoc3ByaXRlID09PSB1bmRlZmluZWQgfHwgY2FyZCA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICAgICAgICAgICAgcmVzZXJ2ZWRTcHJpdGVzQW5kQ2FyZHMucHVzaChbc3ByaXRlLCBjYXJkXSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIGZpbmQgdGhlIGhlbGQgc3ByaXRlcywgaWYgYW55LCBvdmVybGFwcGVkIGJ5IHRoZSBkcmFnZ2VkIHNwcml0ZXNcclxuICAgIGNvbnN0IGxlZnRNb3ZpbmdTcHJpdGUgPSBtb3ZpbmdTcHJpdGVzQW5kQ2FyZHNbMF0/LlswXTtcclxuICAgIGNvbnN0IHJpZ2h0TW92aW5nU3ByaXRlID0gbW92aW5nU3ByaXRlc0FuZENhcmRzW21vdmluZ1Nwcml0ZXNBbmRDYXJkcy5sZW5ndGggLSAxXT8uWzBdO1xyXG4gICAgaWYgKGxlZnRNb3ZpbmdTcHJpdGUgPT09IHVuZGVmaW5lZCB8fCByaWdodE1vdmluZ1Nwcml0ZSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgZGVja0Rpc3RhbmNlID0gTWF0aC5hYnMobGVmdE1vdmluZ1Nwcml0ZS50YXJnZXQueSAtIChTdGF0ZS5kZWNrU3ByaXRlc1swXT8ucG9zaXRpb24ueSA/PyBJbmZpbml0eSkpO1xyXG4gICAgY29uc3QgcmV2ZWFsRGlzdGFuY2UgPSBNYXRoLmFicyhsZWZ0TW92aW5nU3ByaXRlLnRhcmdldC55IC0gKFZQLmNhbnZhcy5oZWlnaHQgLSAyICogVlAuc3ByaXRlSGVpZ2h0KSk7XHJcbiAgICBjb25zdCBoaWRlRGlzdGFuY2UgPSBNYXRoLmFicyhsZWZ0TW92aW5nU3ByaXRlLnRhcmdldC55IC0gKFZQLmNhbnZhcy5oZWlnaHQgLSBWUC5zcHJpdGVIZWlnaHQpKTtcclxuXHJcbiAgICAvLyBzZXQgdGhlIGFjdGlvbiBmb3Igb25tb3VzZXVwXHJcbiAgICBpZiAoZGVja0Rpc3RhbmNlIDwgcmV2ZWFsRGlzdGFuY2UgJiYgZGVja0Rpc3RhbmNlIDwgaGlkZURpc3RhbmNlKSB7XHJcbiAgICAgICAgYWN0aW9uID0geyBjYXJkSW5kZXgsIG1vdXNlUG9zaXRpb25Ub1Nwcml0ZVBvc2l0aW9uLCB0eXBlOiBcIlJldHVyblRvRGVja1wiIH07XHJcblxyXG4gICAgICAgIHNwbGl0SW5kZXggPSByZXNlcnZlZFNwcml0ZXNBbmRDYXJkcy5sZW5ndGg7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIGFjdGlvbiA9IHsgY2FyZEluZGV4LCBtb3VzZVBvc2l0aW9uVG9TcHJpdGVQb3NpdGlvbiwgdHlwZTogXCJSZW9yZGVyXCIgfTtcclxuXHJcbiAgICAgICAgLy8gZGV0ZXJtaW5lIHdoZXRoZXIgdGhlIG1vdmluZyBzcHJpdGVzIGFyZSBjbG9zZXIgdG8gdGhlIHJldmVhbGVkIHNwcml0ZXMgb3IgdG8gdGhlIGhpZGRlbiBzcHJpdGVzXHJcbiAgICAgICAgY29uc3Qgc3BsaXRSZXZlYWxlZCA9IHJldmVhbERpc3RhbmNlIDwgaGlkZURpc3RhbmNlO1xyXG4gICAgICAgIGxldCBzcGxpdFNoYXJlZDogYm9vbGVhbjtcclxuICAgICAgICBsZXQgc3BlY2lhbFNwbGl0OiBib29sZWFuO1xyXG4gICAgICAgIGxldCBzdGFydDogbnVtYmVyO1xyXG4gICAgICAgIGxldCBlbmQ6IG51bWJlcjtcclxuICAgICAgICBpZiAoc3BsaXRSZXZlYWxlZCkge1xyXG4gICAgICAgICAgICBpZiAobGVmdE1vdmluZ1Nwcml0ZS50YXJnZXQueCA8IFZQLmNhbnZhcy53aWR0aCAvIDIgJiZcclxuICAgICAgICAgICAgICAgIFZQLmNhbnZhcy53aWR0aCAvIDIgPCByaWdodE1vdmluZ1Nwcml0ZS50YXJnZXQueCArIFZQLnNwcml0ZVdpZHRoXHJcbiAgICAgICAgICAgICkge1xyXG4gICAgICAgICAgICAgICAgc3BsaXRJbmRleCA9IHNoYXJlQ291bnQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIHNwbGl0U2hhcmVkID0gKGxlZnRNb3ZpbmdTcHJpdGUudGFyZ2V0LnggKyByaWdodE1vdmluZ1Nwcml0ZS50YXJnZXQueCArIFZQLnNwcml0ZVdpZHRoKSAvIDIgPCBWUC5jYW52YXMud2lkdGggLyAyO1xyXG4gICAgICAgICAgICBpZiAoc3BsaXRTaGFyZWQpIHtcclxuICAgICAgICAgICAgICAgIHN0YXJ0ID0gMDtcclxuICAgICAgICAgICAgICAgIGVuZCA9IHNoYXJlQ291bnQ7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBzdGFydCA9IHNoYXJlQ291bnQ7XHJcbiAgICAgICAgICAgICAgICBlbmQgPSByZXZlYWxDb3VudDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHNwbGl0U2hhcmVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHNwZWNpYWxTcGxpdCA9IGZhbHNlO1xyXG4gICAgICAgICAgICBzdGFydCA9IHJldmVhbENvdW50O1xyXG4gICAgICAgICAgICBlbmQgPSByZXNlcnZlZFNwcml0ZXNBbmRDYXJkcy5sZW5ndGg7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoc3BsaXRJbmRleCA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIGxldCBsZWZ0SW5kZXg6IG51bWJlciB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgbGV0IHJpZ2h0SW5kZXg6IG51bWJlciB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IHN0YXJ0OyBpIDwgZW5kOyArK2kpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc2VydmVkU3ByaXRlID0gcmVzZXJ2ZWRTcHJpdGVzQW5kQ2FyZHNbaV0/LlswXTtcclxuICAgICAgICAgICAgICAgIGlmIChyZXNlcnZlZFNwcml0ZSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICAgICAgICAgICAgICAgIGlmIChsZWZ0TW92aW5nU3ByaXRlLnRhcmdldC54IDwgcmVzZXJ2ZWRTcHJpdGUudGFyZ2V0LnggJiZcclxuICAgICAgICAgICAgICAgICAgICByZXNlcnZlZFNwcml0ZS50YXJnZXQueCA8IHJpZ2h0TW92aW5nU3ByaXRlLnRhcmdldC54XHJcbiAgICAgICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAobGVmdEluZGV4ID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGVmdEluZGV4ID0gaTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgcmlnaHRJbmRleCA9IGk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICAgICAgaWYgKGxlZnRJbmRleCAhPT0gdW5kZWZpbmVkICYmIHJpZ2h0SW5kZXggIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgbGVmdFJlc2VydmVkU3ByaXRlID0gcmVzZXJ2ZWRTcHJpdGVzQW5kQ2FyZHNbbGVmdEluZGV4XT8uWzBdO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcmlnaHRSZXNlcnZlZFNwcml0ZSA9IHJlc2VydmVkU3ByaXRlc0FuZENhcmRzW3JpZ2h0SW5kZXhdPy5bMF07XHJcbiAgICAgICAgICAgICAgICBpZiAobGVmdFJlc2VydmVkU3ByaXRlID09PSB1bmRlZmluZWQgfHwgcmlnaHRSZXNlcnZlZFNwcml0ZSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGxlZnRHYXAgPSBsZWZ0UmVzZXJ2ZWRTcHJpdGUudGFyZ2V0LnggLSBsZWZ0TW92aW5nU3ByaXRlLnRhcmdldC54O1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcmlnaHRHYXAgPSByaWdodE1vdmluZ1Nwcml0ZS50YXJnZXQueCAtIHJpZ2h0UmVzZXJ2ZWRTcHJpdGUudGFyZ2V0Lng7XHJcbiAgICAgICAgICAgICAgICBpZiAobGVmdEdhcCA8IHJpZ2h0R2FwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc3BsaXRJbmRleCA9IGxlZnRJbmRleDtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc3BsaXRJbmRleCA9IHJpZ2h0SW5kZXggKyAxO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIGlmIChzcGxpdEluZGV4ID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgLy8gbm8gb3ZlcmxhcHBlZCBzcHJpdGVzLCBzbyB0aGUgaW5kZXggaXMgdGhlIGZpcnN0IHJlc2VydmVkIHNwcml0ZSB0byB0aGUgcmlnaHQgb2YgdGhlIG1vdmluZyBzcHJpdGVzXHJcbiAgICAgICAgICAgIGZvciAoc3BsaXRJbmRleCA9IHN0YXJ0OyBzcGxpdEluZGV4IDwgZW5kOyArK3NwbGl0SW5kZXgpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc2VydmVkU3ByaXRlID0gcmVzZXJ2ZWRTcHJpdGVzQW5kQ2FyZHNbc3BsaXRJbmRleF0/LlswXTtcclxuICAgICAgICAgICAgICAgIGlmIChyZXNlcnZlZFNwcml0ZSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICAgICAgICAgICAgICAgIGlmIChyaWdodE1vdmluZ1Nwcml0ZS50YXJnZXQueCA8IHJlc2VydmVkU3ByaXRlLnRhcmdldC54KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGFkanVzdCBzaGFyZSBjb3VudFxyXG4gICAgICAgIGlmIChzcGxpdEluZGV4IDwgc2hhcmVDb3VudCB8fCBzcGxpdEluZGV4ID09PSBzaGFyZUNvdW50ICYmIHNwbGl0U2hhcmVkKSB7XHJcbiAgICAgICAgICAgIHNoYXJlQ291bnQgKz0gbW92aW5nU3ByaXRlc0FuZENhcmRzLmxlbmd0aDtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coYHNldCBzaGFyZUNvdW50IHRvICR7c2hhcmVDb3VudH1gKTtcclxuICAgICAgICB9XHJcbiAgICBcclxuICAgICAgICAvLyBhZGp1c3QgcmV2ZWFsIGNvdW50XHJcbiAgICAgICAgaWYgKHNwbGl0SW5kZXggPCByZXZlYWxDb3VudCB8fCBzcGxpdEluZGV4ID09PSByZXZlYWxDb3VudCAmJiBzcGxpdFJldmVhbGVkKSB7XHJcbiAgICAgICAgICAgIHJldmVhbENvdW50ICs9IG1vdmluZ1Nwcml0ZXNBbmRDYXJkcy5sZW5ndGg7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBzZXQgcmV2ZWFsQ291bnQgdG8gJHtyZXZlYWxDb3VudH1gKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gYWRqdXN0IHNlbGVjdGVkIGluZGljZXNcclxuICAgIC8vIG1vZGlmeWluZyBhY3Rpb24uY2FyZEluZGV4IGRpcmVjdGx5IGluIHRoZSBsb29wIHdvdWxkIGNhdXNlIHVzIHRvXHJcbiAgICAvLyBjaGVjayBpdHMgYWRqdXN0ZWQgdmFsdWUgYWdhaW5zdCBvbGQgaW5kaWNlcywgd2hpY2ggaXMgaW5jb3JyZWN0XHJcbiAgICBsZXQgbmV3Q2FyZEluZGV4ID0gYWN0aW9uLmNhcmRJbmRleDtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgU3RhdGUuc2VsZWN0ZWRJbmRpY2VzLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgaWYgKGFjdGlvbi5jYXJkSW5kZXggPT09IFN0YXRlLnNlbGVjdGVkSW5kaWNlc1tpXSkge1xyXG4gICAgICAgICAgICBuZXdDYXJkSW5kZXggPSBzcGxpdEluZGV4ICsgaTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIFN0YXRlLnNlbGVjdGVkSW5kaWNlc1tpXSA9IHNwbGl0SW5kZXggKyBpO1xyXG4gICAgfVxyXG5cclxuICAgIGFjdGlvbi5jYXJkSW5kZXggPSBuZXdDYXJkSW5kZXg7XHJcblxyXG4gICAgU3RhdGUuc2V0U3ByaXRlVGFyZ2V0cyhcclxuICAgICAgICBnYW1lU3RhdGUsXHJcbiAgICAgICAgcmVzZXJ2ZWRTcHJpdGVzQW5kQ2FyZHMsXHJcbiAgICAgICAgbW92aW5nU3ByaXRlc0FuZENhcmRzLFxyXG4gICAgICAgIHNoYXJlQ291bnQsXHJcbiAgICAgICAgcmV2ZWFsQ291bnQsXHJcbiAgICAgICAgc3BsaXRJbmRleCxcclxuICAgICAgICBhY3Rpb24udHlwZSA9PT0gXCJSZXR1cm5Ub0RlY2tcIlxyXG4gICAgKTtcclxufSIsImltcG9ydCAqIGFzIExpYiBmcm9tIFwiLi4vbGliXCI7XHJcblxyXG5jb25zdCBwbGF5ZXJOYW1lRWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwbGF5ZXJOYW1lJyk7XHJcbmNvbnN0IHBsYXllck5hbWVWYWx1ZSA9IExpYi5nZXRDb29raWUoJ3BsYXllck5hbWUnKTtcclxuaWYgKHBsYXllck5hbWVFbGVtZW50ICE9PSBudWxsICYmIHBsYXllck5hbWVWYWx1ZSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAoPEhUTUxJbnB1dEVsZW1lbnQ+cGxheWVyTmFtZUVsZW1lbnQpLnZhbHVlID0gcGxheWVyTmFtZVZhbHVlO1xyXG59XHJcblxyXG5jb25zdCBnYW1lSWRFbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2dhbWVJZCcpO1xyXG5jb25zdCBnYW1lSWRWYWx1ZSA9IExpYi5nZXRDb29raWUoJ2dhbWVJZCcpO1xyXG5pZiAoZ2FtZUlkRWxlbWVudCAhPT0gbnVsbCAmJiBnYW1lSWRWYWx1ZSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAoPEhUTUxJbnB1dEVsZW1lbnQ+Z2FtZUlkRWxlbWVudCkudmFsdWUgPSBnYW1lSWRWYWx1ZTtcclxufVxyXG4iLCJpbXBvcnQgKiBhcyBMaWIgZnJvbSAnLi4vbGliJztcclxuaW1wb3J0ICogYXMgU3RhdGUgZnJvbSAnLi9zdGF0ZSc7XHJcbmltcG9ydCAqIGFzIElucHV0IGZyb20gJy4vaW5wdXQnO1xyXG5pbXBvcnQgKiBhcyBWUCBmcm9tICcuL3ZpZXctcGFyYW1zJztcclxuaW1wb3J0IFZlY3RvciBmcm9tICcuL3ZlY3Rvcic7XHJcbmltcG9ydCBTcHJpdGUgZnJvbSAnLi9zcHJpdGUnO1xyXG5pbXBvcnQgeyByYW5kb20gfSBmcm9tICduYW5vaWQnO1xyXG5cclxuY29uc3QgZGVja0RlYWxEdXJhdGlvbiA9IDEwMDA7XHJcbmxldCBkZWNrRGVhbFRpbWU6IG51bWJlciB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcclxubGV0IGN1cnJlbnRUaW1lOiBudW1iZXIgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVuZGVyKHRpbWU6IG51bWJlcikge1xyXG4gICAgd2hpbGUgKFN0YXRlLmdhbWVTdGF0ZSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgYXdhaXQgTGliLmRlbGF5KDEwMCk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgZGVsdGFUaW1lID0gdGltZSAtIChjdXJyZW50VGltZSAhPT0gdW5kZWZpbmVkID8gY3VycmVudFRpbWUgOiB0aW1lKTtcclxuICAgIGN1cnJlbnRUaW1lID0gdGltZTtcclxuXHJcbiAgICBjb25zdCB1bmxvY2sgPSBhd2FpdCBTdGF0ZS5sb2NrKCk7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIC8vIGNsZWFyIHRoZSBzY3JlZW5cclxuICAgICAgICBWUC5jb250ZXh0LmNsZWFyUmVjdCgwLCAwLCBWUC5jYW52YXMud2lkdGgsIFZQLmNhbnZhcy5oZWlnaHQpO1xyXG5cclxuICAgICAgICByZW5kZXJCYXNpY3MoU3RhdGUuZ2FtZUlkLCBTdGF0ZS5wbGF5ZXJOYW1lKTtcclxuICAgICAgICByZW5kZXJEZWNrKHRpbWUsIGRlbHRhVGltZSwgU3RhdGUuZ2FtZVN0YXRlLmRlY2tDb3VudCk7XHJcbiAgICAgICAgcmVuZGVyT3RoZXJQbGF5ZXJzKGRlbHRhVGltZSwgU3RhdGUuZ2FtZVN0YXRlKTtcclxuICAgICAgICByZW5kZXJQbGF5ZXIoZGVsdGFUaW1lLCBTdGF0ZS5nYW1lU3RhdGUpO1xyXG4gICAgICAgIHJlbmRlckJ1dHRvbnModGltZSwgU3RhdGUuZ2FtZVN0YXRlKTtcclxuICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgdW5sb2NrKCk7XHJcbiAgICB9XHJcblxyXG4gICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShyZW5kZXIpO1xyXG59XHJcblxyXG5mdW5jdGlvbiByZW5kZXJCYXNpY3MoZ2FtZUlkOiBzdHJpbmcsIHBsYXllck5hbWU6IHN0cmluZykge1xyXG4gICAgVlAuY29udGV4dC5maWxsU3R5bGUgPSAnIzAwMDAwMGZmJztcclxuICAgIFZQLmNvbnRleHQuZm9udCA9ICcwLjc1Y20gSXJyZWd1bGFyaXMnO1xyXG4gICAgVlAuY29udGV4dC5maWxsVGV4dChgR2FtZTogJHtnYW1lSWR9YCwgMCwgMC43NSAqIFZQLnBpeGVsc1BlckNNKTtcclxuICAgIFZQLmNvbnRleHQuZmlsbFRleHQoYFlvdXIgbmFtZSBpczogJHtwbGF5ZXJOYW1lfWAsIDAsIFZQLmNhbnZhcy5oZWlnaHQpO1xyXG5cclxuICAgIFZQLmNvbnRleHQuc2V0TGluZURhc2goWzQsIDFdKTtcclxuICAgIFZQLmNvbnRleHQuc3Ryb2tlUmVjdChWUC5zcHJpdGVIZWlnaHQsIFZQLnNwcml0ZUhlaWdodCwgVlAuY2FudmFzLndpZHRoIC0gMiAqIFZQLnNwcml0ZUhlaWdodCwgVlAuY2FudmFzLmhlaWdodCAtIDIgKiBWUC5zcHJpdGVIZWlnaHQpO1xyXG59XHJcblxyXG5mdW5jdGlvbiByZW5kZXJEZWNrKHRpbWU6IG51bWJlciwgZGVsdGFUaW1lOiBudW1iZXIsIGRlY2tDb3VudDogbnVtYmVyKSB7XHJcbiAgICBWUC5jb250ZXh0LnNhdmUoKTtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgaWYgKGRlY2tEZWFsVGltZSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIGRlY2tEZWFsVGltZSA9IHRpbWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IFN0YXRlLmRlY2tTcHJpdGVzLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGRlY2tTcHJpdGUgPSBTdGF0ZS5kZWNrU3ByaXRlc1tpXTtcclxuICAgICAgICAgICAgaWYgKGRlY2tTcHJpdGUgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcblxyXG4gICAgICAgICAgICBpZiAoaSA9PT0gZGVja0NvdW50IC0gMSAmJlxyXG4gICAgICAgICAgICAgICAgSW5wdXQuYWN0aW9uICE9PSBcIk5vbmVcIiAmJlxyXG4gICAgICAgICAgICAgICAgSW5wdXQuYWN0aW9uICE9PSBcIlNvcnRCeVN1aXRcIiAmJlxyXG4gICAgICAgICAgICAgICAgSW5wdXQuYWN0aW9uICE9PSBcIlNvcnRCeVJhbmtcIiAmJlxyXG4gICAgICAgICAgICAgICAgSW5wdXQuYWN0aW9uICE9PSBcIldhaXRcIiAmJlxyXG4gICAgICAgICAgICAgICAgSW5wdXQuYWN0aW9uICE9PSBcIlByb2NlZWRcIiAmJlxyXG4gICAgICAgICAgICAgICAgSW5wdXQuYWN0aW9uICE9PSBcIkRlc2VsZWN0XCIgJiYgKFxyXG4gICAgICAgICAgICAgICAgSW5wdXQuYWN0aW9uLnR5cGUgPT09IFwiRHJhd0Zyb21EZWNrXCIgfHxcclxuICAgICAgICAgICAgICAgIElucHV0LmFjdGlvbi50eXBlID09PSBcIldhaXRpbmdGb3JOZXdDYXJkXCJcclxuICAgICAgICAgICAgKSkge1xyXG4gICAgICAgICAgICAgICAgLy8gc2V0IGluIG9ubW91c2Vtb3ZlXHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodGltZSAtIGRlY2tEZWFsVGltZSA8IGkgKiBkZWNrRGVhbER1cmF0aW9uIC8gZGVja0NvdW50KSB7XHJcbiAgICAgICAgICAgICAgICAvLyBjYXJkIG5vdCB5ZXQgZGVhbHQ7IGtlZXAgdG9wIGxlZnRcclxuICAgICAgICAgICAgICAgIGRlY2tTcHJpdGUucG9zaXRpb24gPSBuZXcgVmVjdG9yKC1WUC5zcHJpdGVXaWR0aCwgLVZQLnNwcml0ZUhlaWdodCk7XHJcbiAgICAgICAgICAgICAgICBkZWNrU3ByaXRlLnRhcmdldCA9IG5ldyBWZWN0b3IoLVZQLnNwcml0ZVdpZHRoLCAtVlAuc3ByaXRlSGVpZ2h0KTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGRlY2tTcHJpdGUudGFyZ2V0ID0gbmV3IFZlY3RvcihcclxuICAgICAgICAgICAgICAgICAgICBWUC5jYW52YXMud2lkdGggLyAyIC0gVlAuc3ByaXRlV2lkdGggLyAyIC0gKGkgLSBkZWNrQ291bnQgLyAyKSAqIFZQLnNwcml0ZURlY2tHYXAsXHJcbiAgICAgICAgICAgICAgICAgICAgVlAuY2FudmFzLmhlaWdodCAvIDIgLSBWUC5zcHJpdGVIZWlnaHQgLyAyXHJcbiAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBkZWNrU3ByaXRlLmFuaW1hdGUoZGVsdGFUaW1lKTtcclxuICAgICAgICB9XHJcbiAgICB9IGZpbmFsbHkge1xyXG4gICAgICAgIFZQLmNvbnRleHQucmVzdG9yZSgpO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiByZW5kZXJPdGhlclBsYXllcnMoZGVsdGFUaW1lOiBudW1iZXIsIGdhbWVTdGF0ZTogTGliLkdhbWVTdGF0ZSkge1xyXG4gICAgVlAuY29udGV4dC5zYXZlKCk7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIFZQLmNvbnRleHQuc2V0VHJhbnNmb3JtKFZQLmdldFRyYW5zZm9ybUZvclBsYXllcigxKSk7XHJcbiAgICAgICAgLy9WUC5jb250ZXh0LnRyYW5zbGF0ZSgwLCAoVlAuY2FudmFzLndpZHRoICsgVlAuY2FudmFzLmhlaWdodCkgLyAyKTtcclxuICAgICAgICAvL1ZQLmNvbnRleHQucm90YXRlKC1NYXRoLlBJIC8gMik7XHJcbiAgICAgICAgcmVuZGVyT3RoZXJQbGF5ZXIoZGVsdGFUaW1lLCBnYW1lU3RhdGUsIChnYW1lU3RhdGUucGxheWVySW5kZXggKyAxKSAlIDQpO1xyXG4gICAgfSBmaW5hbGx5IHtcclxuICAgICAgICBWUC5jb250ZXh0LnJlc3RvcmUoKTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgVlAuY29udGV4dC5zYXZlKCk7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIFZQLmNvbnRleHQuc2V0VHJhbnNmb3JtKFZQLmdldFRyYW5zZm9ybUZvclBsYXllcigyKSk7XHJcbiAgICAgICAgcmVuZGVyT3RoZXJQbGF5ZXIoZGVsdGFUaW1lLCBnYW1lU3RhdGUsIChnYW1lU3RhdGUucGxheWVySW5kZXggKyAyKSAlIDQpO1xyXG4gICAgfSBmaW5hbGx5IHtcclxuICAgICAgICBWUC5jb250ZXh0LnJlc3RvcmUoKTtcclxuICAgIH1cclxuXHJcbiAgICBWUC5jb250ZXh0LnNhdmUoKTtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgVlAuY29udGV4dC5zZXRUcmFuc2Zvcm0oVlAuZ2V0VHJhbnNmb3JtRm9yUGxheWVyKDMpKTtcclxuICAgICAgICAvL1ZQLmNvbnRleHQudHJhbnNsYXRlKFZQLmNhbnZhcy53aWR0aCwgKFZQLmNhbnZhcy5oZWlnaHQgLSBWUC5jYW52YXMud2lkdGgpIC8gMik7XHJcbiAgICAgICAgLy9WUC5jb250ZXh0LnJvdGF0ZShNYXRoLlBJIC8gMik7XHJcbiAgICAgICAgcmVuZGVyT3RoZXJQbGF5ZXIoZGVsdGFUaW1lLCBnYW1lU3RhdGUsIChnYW1lU3RhdGUucGxheWVySW5kZXggKyAzKSAlIDQpO1xyXG4gICAgfSBmaW5hbGx5IHtcclxuICAgICAgICBWUC5jb250ZXh0LnJlc3RvcmUoKTtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gcmVuZGVyT3RoZXJQbGF5ZXIoZGVsdGFUaW1lOiBudW1iZXIsIGdhbWVTdGF0ZTogTGliLkdhbWVTdGF0ZSwgcGxheWVySW5kZXg6IG51bWJlcikge1xyXG4gICAgY29uc3QgcGxheWVyID0gZ2FtZVN0YXRlLm90aGVyUGxheWVyc1twbGF5ZXJJbmRleF07XHJcbiAgICBpZiAocGxheWVyID09PSB1bmRlZmluZWQpIHJldHVybjtcclxuXHJcbiAgICBWUC5jb250ZXh0LmZpbGxTdHlsZSA9ICcjMDAwMDAwZmYnO1xyXG4gICAgVlAuY29udGV4dC5mb250ID0gYCR7VlAuc3ByaXRlR2FwfXB4IElycmVndWxhcmlzYDtcclxuICAgIFZQLmNvbnRleHQuZmlsbFRleHQocGxheWVyLm5hbWUsIFZQLmNhbnZhcy53aWR0aCAvIDIsIFZQLnNwcml0ZUhlaWdodCArIFZQLnNwcml0ZUdhcCk7XHJcblxyXG4gICAgY29uc3QgZGVja1Bvc2l0aW9uID0gU3RhdGUuZGVja1Nwcml0ZXNbU3RhdGUuZGVja1Nwcml0ZXMubGVuZ3RoIC0gMV0/LnBvc2l0aW9uID8/XHJcbiAgICAgICAgbmV3IFZlY3RvcihWUC5jYW52YXMud2lkdGggLyAyIC0gVlAuc3ByaXRlV2lkdGggLyAyLCBWUC5jYW52YXMuaGVpZ2h0IC8gMiAtIFZQLnNwcml0ZUhlaWdodCAvIDIpO1xyXG4gICAgY29uc3QgZGVja1BvaW50ID0gVlAuY29udGV4dC5nZXRUcmFuc2Zvcm0oKS5pbnZlcnNlKCkudHJhbnNmb3JtUG9pbnQoe1xyXG4gICAgICAgIHc6IDEsXHJcbiAgICAgICAgeDogZGVja1Bvc2l0aW9uLngsXHJcbiAgICAgICAgeTogZGVja1Bvc2l0aW9uLnksXHJcbiAgICAgICAgejogMFxyXG4gICAgfSk7XHJcblxyXG4gICAgbGV0IGkgPSAwO1xyXG4gICAgY29uc3QgZmFjZVNwcml0ZXMgPSBTdGF0ZS5mYWNlU3ByaXRlc0ZvclBsYXllcltwbGF5ZXJJbmRleF07XHJcbiAgICBpZiAoZmFjZVNwcml0ZXMgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICBmb3IgKGNvbnN0IGZhY2VTcHJpdGUgb2YgZmFjZVNwcml0ZXMpIHtcclxuICAgICAgICBmYWNlU3ByaXRlLnRhcmdldCA9IG5ldyBWZWN0b3IoVlAuY2FudmFzLndpZHRoIC8gMiAtIFZQLnNwcml0ZVdpZHRoIC8gMiArIChpKysgLSBmYWNlU3ByaXRlcy5sZW5ndGggLyAyKSAqIFZQLnNwcml0ZUdhcCwgVlAuc3ByaXRlSGVpZ2h0KTtcclxuICAgICAgICBmYWNlU3ByaXRlLmFuaW1hdGUoZGVsdGFUaW1lKTtcclxuICAgIH1cclxuXHJcbiAgICBpID0gMDtcclxuICAgIGNvbnN0IGJhY2tTcHJpdGVzID0gU3RhdGUuYmFja1Nwcml0ZXNGb3JQbGF5ZXJbcGxheWVySW5kZXhdO1xyXG4gICAgaWYgKGJhY2tTcHJpdGVzID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG4gICAgZm9yIChjb25zdCBiYWNrU3ByaXRlIG9mIGJhY2tTcHJpdGVzKSB7XHJcbiAgICAgICAgYmFja1Nwcml0ZS50YXJnZXQgPSBuZXcgVmVjdG9yKFZQLmNhbnZhcy53aWR0aCAvIDIgLSBWUC5zcHJpdGVXaWR0aCAvIDIgKyAoaSsrIC0gYmFja1Nwcml0ZXMubGVuZ3RoIC8gMikgKiBWUC5zcHJpdGVHYXAsIDApO1xyXG4gICAgICAgIGJhY2tTcHJpdGUuYW5pbWF0ZShkZWx0YVRpbWUpO1xyXG4gICAgfVxyXG59XHJcblxyXG4vLyByZXR1cm5zIHRoZSBhZGp1c3RlZCByZXZlYWwgaW5kZXhcclxuZnVuY3Rpb24gcmVuZGVyUGxheWVyKGRlbHRhVGltZTogbnVtYmVyLCBnYW1lU3RhdGU6IExpYi5HYW1lU3RhdGUpIHtcclxuICAgIGNvbnN0IHNwcml0ZXMgPSBTdGF0ZS5mYWNlU3ByaXRlc0ZvclBsYXllcltnYW1lU3RhdGUucGxheWVySW5kZXhdO1xyXG4gICAgaWYgKHNwcml0ZXMgPT09IHVuZGVmaW5lZCkgcmV0dXJuO1xyXG5cclxuICAgIGxldCBpID0gMDtcclxuICAgIGZvciAoY29uc3Qgc3ByaXRlIG9mIHNwcml0ZXMpIHtcclxuICAgICAgICBzcHJpdGUuYW5pbWF0ZShkZWx0YVRpbWUpO1xyXG5cclxuICAgICAgICBpZiAoTGliLmJpbmFyeVNlYXJjaE51bWJlcihTdGF0ZS5zZWxlY3RlZEluZGljZXMsIGkrKykgPj0gMCkge1xyXG4gICAgICAgICAgICBWUC5jb250ZXh0LmZpbGxTdHlsZSA9ICcjMDA4MDgwNDAnO1xyXG4gICAgICAgICAgICBWUC5jb250ZXh0LmZpbGxSZWN0KHNwcml0ZS5wb3NpdGlvbi54LCBzcHJpdGUucG9zaXRpb24ueSwgVlAuc3ByaXRlV2lkdGgsIFZQLnNwcml0ZUhlaWdodCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiByZW5kZXJCdXR0b25zKHRpbWU6IG51bWJlciwgZ2FtZVN0YXRlOiBMaWIuR2FtZVN0YXRlKSB7XHJcbiAgICBWUC5jb250ZXh0LnNhdmUoKTtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgLy8gYmx1ciBpbWFnZSBiZWhpbmRcclxuICAgICAgICAvL3N0YWNrQmx1ckNhbnZhc1JHQkEoJ2NhbnZhcycsIHgsIHksIGNhbnZhcy53aWR0aCAtIHgsIGNhbnZhcy5oZWlnaHQgLSB5LCAxNik7XHJcbiAgICAgICAgLypcclxuICAgICAgICBjb25zdCB4ID0gVlAuc29ydEJ5U3VpdEJvdW5kc1swXS54IC0gNCAqIFZQLnBpeGVsc1BlckNNO1xyXG4gICAgICAgIGNvbnN0IHkgPSBWUC5zb3J0QnlTdWl0Qm91bmRzWzBdLnk7XHJcbiAgICAgICAgVlAuY29udGV4dC5maWxsU3R5bGUgPSAnIzAwZmZmZjc3JztcclxuICAgICAgICBWUC5jb250ZXh0LmZpbGxSZWN0KHgsIHksIFZQLmNhbnZhcy53aWR0aCAtIHgsIFZQLmNhbnZhcy5oZWlnaHQgLSB5KTtcclxuICAgICAgICBcclxuICAgICAgICBWUC5jb250ZXh0LmZpbGxTdHlsZSA9ICcjMDAwMDAwZmYnO1xyXG4gICAgICAgIFZQLmNvbnRleHQuZm9udCA9ICcxLjVjbSBJcnJlZ3VsYXJpcyc7XHJcbiAgICAgICAgVlAuY29udGV4dC5maWxsVGV4dCgnU09SVCcsIHggKyAwLjI1ICogVlAucGl4ZWxzUGVyQ00sIHkgKyAyLjI1ICogVlAucGl4ZWxzUGVyQ00pO1xyXG5cclxuICAgICAgICBWUC5jb250ZXh0LmZvbnQgPSAnM2NtIElycmVndWxhcmlzJztcclxuICAgICAgICBWUC5jb250ZXh0LmZpbGxUZXh0KCd7JywgeCArIDMgKiBWUC5waXhlbHNQZXJDTSwgeSArIDIuNzUgKiBWUC5waXhlbHNQZXJDTSk7XHJcblxyXG4gICAgICAgIFZQLmNvbnRleHQuZm9udCA9ICcxLjVjbSBJcnJlZ3VsYXJpcyc7XHJcbiAgICAgICAgVlAuY29udGV4dC5maWxsVGV4dCgnU1VJVCcsIFZQLnNvcnRCeVN1aXRCb3VuZHNbMF0ueCwgVlAuc29ydEJ5U3VpdEJvdW5kc1sxXS55KTtcclxuXHJcbiAgICAgICAgVlAuY29udGV4dC5mb250ID0gJzEuNWNtIElycmVndWxhcmlzJztcclxuICAgICAgICBWUC5jb250ZXh0LmZpbGxUZXh0KCdSQU5LJywgVlAuc29ydEJ5UmFua0JvdW5kc1swXS54LCBWUC5zb3J0QnlSYW5rQm91bmRzWzFdLnkpO1xyXG4gICAgICAgICovXHJcbiAgICAgICAgLy9jb250ZXh0LmZpbGxTdHlsZSA9ICcjZmYwMDAwNzcnO1xyXG4gICAgICAgIC8vY29udGV4dC5maWxsUmVjdChWUC5zb3J0QnlTdWl0Qm91bmRzWzBdLngsIFZQLnNvcnRCeVN1aXRCb3VuZHNbMF0ueSxcclxuICAgICAgICAgICAgLy9zb3J0QnlTdWl0Qm91bmRzWzFdLnggLSBzb3J0QnlTdWl0Qm91bmRzWzBdLngsIHNvcnRCeVN1aXRCb3VuZHNbMV0ueSAtIHNvcnRCeVN1aXRCb3VuZHNbMF0ueSk7XHJcblxyXG4gICAgICAgIC8vY29udGV4dC5maWxsU3R5bGUgPSAnIzAwMDBmZjc3JztcclxuICAgICAgICAvL2NvbnRleHQuZmlsbFJlY3Qoc29ydEJ5UmFua0JvdW5kc1swXS54LCBzb3J0QnlSYW5rQm91bmRzWzBdLnksXHJcbiAgICAgICAgICAgIC8vc29ydEJ5UmFua0JvdW5kc1sxXS54IC0gc29ydEJ5UmFua0JvdW5kc1swXS54LCBzb3J0QnlSYW5rQm91bmRzWzFdLnkgLSBzb3J0QnlSYW5rQm91bmRzWzBdLnkpO1xyXG5cclxuICAgICAgICAvKmlmIChnYW1lU3RhdGUucGxheWVyU3RhdGUgPT09IFwiUHJvY2VlZFwiIHx8IGdhbWVTdGF0ZS5wbGF5ZXJTdGF0ZSA9PT0gXCJXYWl0XCIpIHtcclxuICAgICAgICAgICAgVlAuY29udGV4dC50ZXh0QmFzZWxpbmUgPSAndG9wJztcclxuXHJcbiAgICAgICAgICAgIGlmIChnYW1lU3RhdGUucGxheWVyU3RhdGUgPT09IFwiV2FpdFwiKSB7XHJcbiAgICAgICAgICAgICAgICBWUC5jb250ZXh0LmZpbGxTdHlsZSA9ICcjMDBmZmZmNjAnO1xyXG4gICAgICAgICAgICAgICAgVlAuY29udGV4dC5maWxsUmVjdChcclxuICAgICAgICAgICAgICAgICAgICBWUC53YWl0Qm91bmRzWzBdLngsIFZQLndhaXRCb3VuZHNbMF0ueSxcclxuICAgICAgICAgICAgICAgICAgICBWUC53YWl0Qm91bmRzWzFdLnggLSBWUC53YWl0Qm91bmRzWzBdLngsIFZQLndhaXRCb3VuZHNbMV0ueSAtIFZQLndhaXRCb3VuZHNbMF0ueVxyXG4gICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgVlAuY29udGV4dC5maWxsU3R5bGUgPSAnIzAwMDAwMGZmJztcclxuICAgICAgICAgICAgVlAuY29udGV4dC5mb250ID0gVlAud2FpdEZvbnQ7XHJcbiAgICAgICAgICAgIFZQLmNvbnRleHQuZmlsbFRleHQoJ1dhaXQhJywgVlAud2FpdEJvdW5kc1swXS54LCBWUC53YWl0Qm91bmRzWzBdLnkpO1xyXG4gICAgICAgICAgICBib3VuZHNSZWN0KFZQLndhaXRCb3VuZHMpO1xyXG5cclxuICAgICAgICAgICAgaWYgKGdhbWVTdGF0ZS5wbGF5ZXJTdGF0ZSA9PT0gXCJQcm9jZWVkXCIpIHtcclxuICAgICAgICAgICAgICAgIFZQLmNvbnRleHQuZmlsbFN0eWxlID0gJyMwMGZmZmY2MCc7XHJcbiAgICAgICAgICAgICAgICBWUC5jb250ZXh0LmZpbGxSZWN0KFxyXG4gICAgICAgICAgICAgICAgICAgIFZQLnByb2NlZWRCb3VuZHNbMF0ueCwgVlAucHJvY2VlZEJvdW5kc1swXS55LFxyXG4gICAgICAgICAgICAgICAgICAgIFZQLnByb2NlZWRCb3VuZHNbMV0ueCAtIFZQLnByb2NlZWRCb3VuZHNbMF0ueCwgVlAucHJvY2VlZEJvdW5kc1sxXS55IC0gVlAucHJvY2VlZEJvdW5kc1swXS55XHJcbiAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBWUC5jb250ZXh0LmZpbGxTdHlsZSA9ICcjMDAwMDAwZmYnO1xyXG4gICAgICAgICAgICBWUC5jb250ZXh0LmZvbnQgPSBWUC5wcm9jZWVkRm9udDtcclxuICAgICAgICAgICAgVlAuY29udGV4dC5maWxsVGV4dCgnUHJvY2VlZC4nLCBWUC5wcm9jZWVkQm91bmRzWzBdLngsIFZQLnByb2NlZWRCb3VuZHNbMF0ueSk7XHJcbiAgICAgICAgICAgIGJvdW5kc1JlY3QoVlAucHJvY2VlZEJvdW5kcyk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgaWYgKGdhbWVTdGF0ZS5wbGF5ZXJTdGF0ZSA9PT0gJ1JlYWR5Jykge1xyXG4gICAgICAgICAgICAgICAgVlAuY29udGV4dC5maWxsU3R5bGUgPSAnIzAwMDAwMGZmJztcclxuICAgICAgICAgICAgICAgIFZQLmNvbnRleHQuZm9udCA9IFZQLnJlYWR5Rm9udDtcclxuICAgICAgICAgICAgICAgIFZQLmNvbnRleHQuZmlsbFRleHQoJ1JlYWR5IScsIFZQLnJlYWR5Qm91bmRzWzBdLngsIFZQLnJlYWR5Qm91bmRzWzBdLnkpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgVlAuY29udGV4dC5maWxsU3R5bGUgPSAnIzAwMDAwMGZmJztcclxuICAgICAgICAgICAgICAgIFZQLmNvbnRleHQuZm9udCA9IFZQLmNvdW50ZG93bkZvbnQ7XHJcbiAgICAgICAgICAgICAgICBWUC5jb250ZXh0LmZpbGxUZXh0KGBXYWl0aW5nICR7XHJcbiAgICAgICAgICAgICAgICAgICAgTWF0aC5mbG9vcigxICsgKGdhbWVTdGF0ZS5wbGF5ZXJTdGF0ZS5hY3RpdmVUaW1lICsgTGliLmFjdGl2ZUNvb2xkb3duIC0gRGF0ZS5ub3coKSkgLyAxMDAwKVxyXG4gICAgICAgICAgICAgICAgfSBzZWNvbmRzLi4uYCwgVlAuY291bnRkb3duQm91bmRzWzBdLngsIFZQLmNvdW50ZG93bkJvdW5kc1swXS55KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0qL1xyXG4gICAgfSBmaW5hbGx5IHtcclxuICAgICAgICBWUC5jb250ZXh0LnJlc3RvcmUoKTtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gYm91bmRzUmVjdChbdG9wTGVmdCwgYm90dG9tUmlnaHRdOiBbVmVjdG9yLCBWZWN0b3JdKSB7XHJcbiAgICBWUC5jb250ZXh0LnN0cm9rZVJlY3QodG9wTGVmdC54LCB0b3BMZWZ0LnksIGJvdHRvbVJpZ2h0LnggLSB0b3BMZWZ0LngsIGJvdHRvbVJpZ2h0LnkgLSB0b3BMZWZ0LnkpO1xyXG59XHJcbiIsImltcG9ydCBWZWN0b3IgZnJvbSAnLi92ZWN0b3InO1xyXG5pbXBvcnQgKiBhcyBWUCBmcm9tICcuL3ZpZXctcGFyYW1zJztcclxuXHJcbmNvbnN0IHNwcmluZ0NvbnN0YW50ID0gMTAwMDtcclxuY29uc3QgbWFzcyA9IDE7XHJcbmNvbnN0IGRyYWcgPSBNYXRoLnNxcnQoNCAqIG1hc3MgKiBzcHJpbmdDb25zdGFudCk7XHJcblxyXG4vLyBzdGF0ZSBmb3IgcGh5c2ljcy1iYXNlZCBhbmltYXRpb25zXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFNwcml0ZSB7XHJcbiAgICBpbWFnZTogSFRNTEltYWdlRWxlbWVudDtcclxuICAgIHRhcmdldDogVmVjdG9yO1xyXG4gICAgcG9zaXRpb246IFZlY3RvcjtcclxuICAgIHZlbG9jaXR5OiBWZWN0b3I7XHJcblxyXG4gICAgLy9iYWQgPSBmYWxzZTtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihpbWFnZTogSFRNTEltYWdlRWxlbWVudCkge1xyXG4gICAgICAgIHRoaXMuaW1hZ2UgPSBpbWFnZTtcclxuICAgICAgICB0aGlzLnRhcmdldCA9IG5ldyBWZWN0b3IoMCwgMCk7XHJcbiAgICAgICAgdGhpcy5wb3NpdGlvbiA9IG5ldyBWZWN0b3IoMCwgMCk7XHJcbiAgICAgICAgdGhpcy52ZWxvY2l0eSA9IG5ldyBWZWN0b3IoMCwgMCk7XHJcbiAgICB9XHJcblxyXG4gICAgYW5pbWF0ZShkZWx0YVRpbWU6IG51bWJlcikge1xyXG4gICAgICAgIGNvbnN0IHNwcmluZ0ZvcmNlID0gdGhpcy50YXJnZXQuc3ViKHRoaXMucG9zaXRpb24pLnNjYWxlKHNwcmluZ0NvbnN0YW50KTtcclxuICAgICAgICBjb25zdCBkcmFnRm9yY2UgPSB0aGlzLnZlbG9jaXR5LnNjYWxlKC1kcmFnKTtcclxuICAgICAgICBjb25zdCBhY2NlbGVyYXRpb24gPSBzcHJpbmdGb3JjZS5hZGQoZHJhZ0ZvcmNlKS5zY2FsZSgxIC8gbWFzcyk7XHJcblxyXG4gICAgICAgIC8vY29uc3Qgc2F2ZWRWZWxvY2l0eSA9IHRoaXMudmVsb2NpdHk7XHJcbiAgICAgICAgLy9jb25zdCBzYXZlZFBvc2l0aW9uID0gdGhpcy5wb3NpdGlvbjtcclxuICAgICAgICBcclxuICAgICAgICB0aGlzLnZlbG9jaXR5ID0gdGhpcy52ZWxvY2l0eS5hZGQoYWNjZWxlcmF0aW9uLnNjYWxlKGRlbHRhVGltZSAvIDEwMDApKTtcclxuICAgICAgICB0aGlzLnBvc2l0aW9uID0gdGhpcy5wb3NpdGlvbi5hZGQodGhpcy52ZWxvY2l0eS5zY2FsZShkZWx0YVRpbWUgLyAxMDAwKSk7XHJcblxyXG4gICAgICAgIC8qXHJcbiAgICAgICAgaWYgKCF0aGlzLmJhZCAmJiAoXHJcbiAgICAgICAgICAgICFpc0Zpbml0ZSh0aGlzLnZlbG9jaXR5LngpIHx8IGlzTmFOKHRoaXMudmVsb2NpdHkueCkgfHxcclxuICAgICAgICAgICAgIWlzRmluaXRlKHRoaXMudmVsb2NpdHkueSkgfHwgaXNOYU4odGhpcy52ZWxvY2l0eS55KSB8fFxyXG4gICAgICAgICAgICAhaXNGaW5pdGUodGhpcy5wb3NpdGlvbi54KSB8fCBpc05hTih0aGlzLnBvc2l0aW9uLngpIHx8XHJcbiAgICAgICAgICAgICFpc0Zpbml0ZSh0aGlzLnBvc2l0aW9uLnkpIHx8IGlzTmFOKHRoaXMucG9zaXRpb24ueSlcclxuICAgICAgICApKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYmFkID0gdHJ1ZTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBkZWx0YVRpbWU6ICR7ZGVsdGFUaW1lfSwgc3ByaW5nRm9yY2U6ICR7SlNPTi5zdHJpbmdpZnkoc3ByaW5nRm9yY2UpfSwgZHJhZ0ZvcmNlOiAke0pTT04uc3RyaW5naWZ5KGRyYWdGb3JjZSl9YCk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGB0YXJnZXQ6ICR7SlNPTi5zdHJpbmdpZnkodGhpcy50YXJnZXQpfSwgcG9zaXRpb246ICR7SlNPTi5zdHJpbmdpZnkoc2F2ZWRQb3NpdGlvbil9LCB2ZWxvY2l0eTogJHtKU09OLnN0cmluZ2lmeShzYXZlZFZlbG9jaXR5KX0sIGFjY2VsZXJhdGlvbjogJHtKU09OLnN0cmluZ2lmeShhY2NlbGVyYXRpb24pfWApO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgbmV3IHBvc2l0aW9uOiAke0pTT04uc3RyaW5naWZ5KHRoaXMucG9zaXRpb24pfSwgbmV3IHZlbG9jaXR5OiAke0pTT04uc3RyaW5naWZ5KHRoaXMudmVsb2NpdHkpfWApO1xyXG4gICAgICAgIH1cclxuICAgICAgICAqL1xyXG5cclxuICAgICAgICBWUC5jb250ZXh0LmRyYXdJbWFnZSh0aGlzLmltYWdlLCB0aGlzLnBvc2l0aW9uLngsIHRoaXMucG9zaXRpb24ueSwgVlAuc3ByaXRlV2lkdGgsIFZQLnNwcml0ZUhlaWdodCk7XHJcbiAgICB9XHJcbn0iLCJpbXBvcnQgeyBNdXRleCB9IGZyb20gJ2F3YWl0LXNlbWFwaG9yZSc7XHJcblxyXG5pbXBvcnQgKiBhcyBMaWIgZnJvbSAnLi4vbGliJztcclxuaW1wb3J0ICogYXMgQ2FyZEltYWdlcyBmcm9tICcuL2NhcmQtaW1hZ2VzJztcclxuaW1wb3J0ICogYXMgVlAgZnJvbSAnLi92aWV3LXBhcmFtcyc7XHJcbmltcG9ydCBTcHJpdGUgZnJvbSAnLi9zcHJpdGUnO1xyXG5pbXBvcnQgVmVjdG9yIGZyb20gJy4vdmVjdG9yJztcclxuXHJcbmNvbnN0IHBsYXllck5hbWVGcm9tQ29va2llID0gTGliLmdldENvb2tpZSgncGxheWVyTmFtZScpO1xyXG5pZiAocGxheWVyTmFtZUZyb21Db29raWUgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCdObyBwbGF5ZXIgbmFtZSEnKTtcclxuZXhwb3J0IGNvbnN0IHBsYXllck5hbWUgPSBwbGF5ZXJOYW1lRnJvbUNvb2tpZTtcclxuXHJcbmNvbnN0IGdhbWVJZEZyb21Db29raWUgPSBMaWIuZ2V0Q29va2llKCdnYW1lSWQnKTtcclxuaWYgKGdhbWVJZEZyb21Db29raWUgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCdObyBnYW1lIGlkIScpO1xyXG5leHBvcnQgY29uc3QgZ2FtZUlkID0gZ2FtZUlkRnJvbUNvb2tpZTtcclxuXHJcbi8vIHNvbWUgc3RhdGUtbWFuaXB1bGF0aW5nIG9wZXJhdGlvbnMgYXJlIGFzeW5jaHJvbm91cywgc28gd2UgbmVlZCB0byBndWFyZCBhZ2FpbnN0IHJhY2VzXHJcbmNvbnN0IHN0YXRlTXV0ZXggPSBuZXcgTXV0ZXgoKTtcclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxvY2soKTogUHJvbWlzZTwoKSA9PiB2b2lkPiB7XHJcbiAgICAvL2NvbnNvbGUubG9nKGBhY3F1aXJpbmcgc3RhdGUgbG9jay4uLlxcbiR7bmV3IEVycm9yKCkuc3RhY2t9YCk7XHJcbiAgICBjb25zdCByZWxlYXNlID0gYXdhaXQgc3RhdGVNdXRleC5hY3F1aXJlKCk7XHJcbiAgICAvL2NvbnNvbGUubG9nKGBhY3F1aXJlZCBzdGF0ZSBsb2NrXFxuJHtuZXcgRXJyb3IoKS5zdGFja31gKTtcclxuICAgIHJldHVybiAoKSA9PiB7XHJcbiAgICAgICAgcmVsZWFzZSgpO1xyXG4gICAgICAgIC8vY29uc29sZS5sb2coYHJlbGVhc2VkIHN0YXRlIGxvY2tgKTtcclxuICAgIH07XHJcbn1cclxuXHJcbi8vIHdlIG5lZWQgdG8ga2VlcCBhIGNvcHkgb2YgdGhlIHByZXZpb3VzIGdhbWUgc3RhdGUgYXJvdW5kIGZvciBib29ra2VlcGluZyBwdXJwb3Nlc1xyXG5leHBvcnQgbGV0IHByZXZpb3VzR2FtZVN0YXRlOiBMaWIuR2FtZVN0YXRlIHwgdW5kZWZpbmVkO1xyXG4vLyB0aGUgbW9zdCByZWNlbnRseSByZWNlaXZlZCBnYW1lIHN0YXRlLCBpZiBhbnlcclxuZXhwb3J0IGxldCBnYW1lU3RhdGU6IExpYi5HYW1lU3RhdGUgfCB1bmRlZmluZWQ7XHJcblxyXG4vLyBpbmRpY2VzIG9mIGNhcmRzIGZvciBkcmFnICYgZHJvcFxyXG4vLyBJTVBPUlRBTlQ6IHRoaXMgYXJyYXkgbXVzdCBhbHdheXMgYmUgc29ydGVkIVxyXG4vLyBBbHdheXMgdXNlIGJpbmFyeVNlYXJjaCB0byBpbnNlcnQgYW5kIGRlbGV0ZSBvciBzb3J0IGFmdGVyIG1hbmlwdWxhdGlvblxyXG5leHBvcnQgY29uc3Qgc2VsZWN0ZWRJbmRpY2VzOiBudW1iZXJbXSA9IFtdO1xyXG5cclxuLy8gZm9yIGFuaW1hdGluZyB0aGUgZGVja1xyXG5leHBvcnQgbGV0IGRlY2tTcHJpdGVzOiBTcHJpdGVbXSA9IFtdO1xyXG5cclxuLy8gYXNzb2NpYXRpdmUgYXJyYXlzLCBvbmUgZm9yIGVhY2ggcGxheWVyIGF0IHRoZWlyIHBsYXllciBpbmRleFxyXG4vLyBlYWNoIGVsZW1lbnQgY29ycmVzcG9uZHMgdG8gYSBmYWNlLWRvd24gY2FyZCBieSBpbmRleFxyXG5leHBvcnQgbGV0IGJhY2tTcHJpdGVzRm9yUGxheWVyOiBTcHJpdGVbXVtdID0gW107XHJcbi8vIGVhY2ggZWxlbWVudCBjb3JyZXNwb25kcyB0byBhIGZhY2UtdXAgY2FyZCBieSBpbmRleFxyXG5leHBvcnQgbGV0IGZhY2VTcHJpdGVzRm9yUGxheWVyOiBTcHJpdGVbXVtdID0gW107XHJcblxyXG4vLyBvcGVuIHdlYnNvY2tldCBjb25uZWN0aW9uIHRvIGdldCBnYW1lIHN0YXRlIHVwZGF0ZXNcclxubGV0IHdzID0gbmV3IFdlYlNvY2tldChgd3NzOi8vJHt3aW5kb3cubG9jYXRpb24uaG9zdG5hbWV9L2ApO1xyXG5cclxuY29uc3QgY2FsbGJhY2tzRm9yTWV0aG9kTmFtZSA9IG5ldyBNYXA8TGliLk1ldGhvZE5hbWUsICgocmVzdWx0OiBMaWIuTWV0aG9kUmVzdWx0KSA9PiB2b2lkKVtdPigpO1xyXG5mdW5jdGlvbiBhZGRDYWxsYmFjayhtZXRob2ROYW1lOiBMaWIuTWV0aG9kTmFtZSwgcmVzb2x2ZTogKCkgPT4gdm9pZCwgcmVqZWN0OiAocmVhc29uOiBhbnkpID0+IHZvaWQpIHtcclxuICAgIGNvbnNvbGUubG9nKGBhZGRpbmcgY2FsbGJhY2sgZm9yIG1ldGhvZCAnJHttZXRob2ROYW1lfSdgKTtcclxuXHJcbiAgICBsZXQgY2FsbGJhY2tzID0gY2FsbGJhY2tzRm9yTWV0aG9kTmFtZS5nZXQobWV0aG9kTmFtZSk7XHJcbiAgICBpZiAoY2FsbGJhY2tzID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICBjYWxsYmFja3MgPSBbXTtcclxuICAgICAgICBjYWxsYmFja3NGb3JNZXRob2ROYW1lLnNldChtZXRob2ROYW1lLCBjYWxsYmFja3MpO1xyXG4gICAgfVxyXG5cclxuICAgIGNhbGxiYWNrcy5wdXNoKHJlc3VsdCA9PiB7XHJcbiAgICAgICAgY29uc29sZS5sb2coYGludm9raW5nIGNhbGxiYWNrIGZvciBtZXRob2QgJyR7bWV0aG9kTmFtZX0nYCk7XHJcbiAgICAgICAgaWYgKCdlcnJvckRlc2NyaXB0aW9uJyBpbiByZXN1bHQpIHtcclxuICAgICAgICAgICAgcmVqZWN0KHJlc3VsdC5lcnJvckRlc2NyaXB0aW9uKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICByZXNvbHZlKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcbn1cclxuXHJcbndzLm9ubWVzc2FnZSA9IGFzeW5jIGUgPT4ge1xyXG4gICAgY29uc3Qgb2JqID0gSlNPTi5wYXJzZShlLmRhdGEpO1xyXG4gICAgaWYgKCdtZXRob2ROYW1lJyBpbiBvYmopIHtcclxuICAgICAgICBjb25zdCByZXR1cm5NZXNzYWdlID0gPExpYi5NZXRob2RSZXN1bHQ+b2JqO1xyXG4gICAgICAgIGNvbnN0IG1ldGhvZE5hbWUgPSByZXR1cm5NZXNzYWdlLm1ldGhvZE5hbWU7XHJcbiAgICAgICAgY29uc3QgY2FsbGJhY2tzID0gY2FsbGJhY2tzRm9yTWV0aG9kTmFtZS5nZXQobWV0aG9kTmFtZSk7XHJcbiAgICAgICAgaWYgKGNhbGxiYWNrcyA9PT0gdW5kZWZpbmVkIHx8IGNhbGxiYWNrcy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBubyBjYWxsYmFja3MgZm91bmQgZm9yIG1ldGhvZDogJHttZXRob2ROYW1lfWApO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgY2FsbGJhY2sgPSBjYWxsYmFja3Muc2hpZnQoKTtcclxuICAgICAgICBpZiAoY2FsbGJhY2sgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGNhbGxiYWNrIGlzIHVuZGVmaW5lZCBmb3IgbWV0aG9kOiAke21ldGhvZE5hbWV9YCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIGNhbGxiYWNrKHJldHVybk1lc3NhZ2UpO1xyXG4gICAgfSBlbHNlIGlmIChcclxuICAgICAgICAnZGVja0NvdW50JyBpbiBvYmogJiZcclxuICAgICAgICAncGxheWVySW5kZXgnIGluIG9iaiAmJlxyXG4gICAgICAgICdwbGF5ZXJDYXJkcycgaW4gb2JqICYmXHJcbiAgICAgICAgJ3BsYXllclJldmVhbENvdW50JyBpbiBvYmogJiZcclxuICAgICAgICAvLydwbGF5ZXJTdGF0ZScgaW4gb2JqICYmXHJcbiAgICAgICAgJ290aGVyUGxheWVycycgaW4gb2JqXHJcbiAgICApIHtcclxuICAgICAgICBjb25zdCB1bmxvY2sgPSBhd2FpdCBsb2NrKCk7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgcHJldmlvdXNHYW1lU3RhdGUgPSBnYW1lU3RhdGU7XHJcbiAgICAgICAgICAgIGdhbWVTdGF0ZSA9IDxMaWIuR2FtZVN0YXRlPm9iajtcclxuXHJcbiAgICAgICAgICAgIGlmIChwcmV2aW91c0dhbWVTdGF0ZSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgcHJldmlvdXNHYW1lU3RhdGUucGxheWVyQ2FyZHM6ICR7SlNPTi5zdHJpbmdpZnkocHJldmlvdXNHYW1lU3RhdGUucGxheWVyQ2FyZHMpfWApO1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYHByZXZpb3VzIHNlbGVjdGVkSW5kaWNlczogJHtKU09OLnN0cmluZ2lmeShzZWxlY3RlZEluZGljZXMpfWApO1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYHByZXZpb3VzIHNlbGVjdGVkQ2FyZHM6ICR7SlNPTi5zdHJpbmdpZnkoc2VsZWN0ZWRJbmRpY2VzLm1hcChpID0+IHByZXZpb3VzR2FtZVN0YXRlPy5wbGF5ZXJDYXJkc1tpXSkpfWApO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBzZWxlY3RlZCBpbmRpY2VzIG1pZ2h0IGhhdmUgc2hpZnRlZFxyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNlbGVjdGVkSW5kaWNlcy5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgc2VsZWN0ZWRJbmRleCA9IHNlbGVjdGVkSW5kaWNlc1tpXTtcclxuICAgICAgICAgICAgICAgIGlmIChzZWxlY3RlZEluZGV4ID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChKU09OLnN0cmluZ2lmeShnYW1lU3RhdGUucGxheWVyQ2FyZHNbc2VsZWN0ZWRJbmRleF0pICE9PSBKU09OLnN0cmluZ2lmeShwcmV2aW91c0dhbWVTdGF0ZT8ucGxheWVyQ2FyZHNbc2VsZWN0ZWRJbmRleF0pKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGZvdW5kID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBnYW1lU3RhdGUucGxheWVyQ2FyZHMubGVuZ3RoOyArK2opIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKEpTT04uc3RyaW5naWZ5KGdhbWVTdGF0ZS5wbGF5ZXJDYXJkc1tqXSkgPT09IEpTT04uc3RyaW5naWZ5KHByZXZpb3VzR2FtZVN0YXRlPy5wbGF5ZXJDYXJkc1tzZWxlY3RlZEluZGV4XSkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkSW5kaWNlc1tpXSA9IGo7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3VuZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFmb3VuZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZEluZGljZXMuc3BsaWNlKGksIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAtLWk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBiaW5hcnkgc2VhcmNoIHN0aWxsIG5lZWRzIHRvIHdvcmtcclxuICAgICAgICAgICAgc2VsZWN0ZWRJbmRpY2VzLnNvcnQoKGEsIGIpID0+IGEgLSBiKTtcclxuXHJcbiAgICAgICAgICAgIC8vIGluaXRpYWxpemUgYW5pbWF0aW9uIHN0YXRlc1xyXG4gICAgICAgICAgICBhc3NvY2lhdGVBbmltYXRpb25zV2l0aENhcmRzKHByZXZpb3VzR2FtZVN0YXRlLCBnYW1lU3RhdGUpO1xyXG5cclxuICAgICAgICAgICAgY29uc29sZS5sb2coYGdhbWVTdGF0ZS5wbGF5ZXJDYXJkczogJHtKU09OLnN0cmluZ2lmeShnYW1lU3RhdGUucGxheWVyQ2FyZHMpfWApO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgZ2FtZVN0YXRlLnBsYXllclNoYXJlQ291bnQgPSAke2dhbWVTdGF0ZS5wbGF5ZXJTaGFyZUNvdW50fWApO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgZ2FtZVN0YXRlLnBsYXllclJldmVhbENvdW50ID0gJHtnYW1lU3RhdGUucGxheWVyUmV2ZWFsQ291bnR9YCk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBzZWxlY3RlZEluZGljZXM6ICR7SlNPTi5zdHJpbmdpZnkoc2VsZWN0ZWRJbmRpY2VzKX1gKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coYHNlbGVjdGVkQ2FyZHM6ICR7SlNPTi5zdHJpbmdpZnkoc2VsZWN0ZWRJbmRpY2VzLm1hcChpID0+IGdhbWVTdGF0ZT8ucGxheWVyQ2FyZHNbaV0pKX1gKTtcclxuICAgICAgICB9IGZpbmFsbHkge1xyXG4gICAgICAgICAgICB1bmxvY2soKTtcclxuICAgICAgICB9XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihKU09OLnN0cmluZ2lmeShlLmRhdGEpKTtcclxuICAgIH1cclxufTtcclxuXHJcbmxldCBvbkFuaW1hdGlvbnNBc3NvY2lhdGVkID0gKCkgPT4ge307XHJcblxyXG5mdW5jdGlvbiBhc3NvY2lhdGVBbmltYXRpb25zV2l0aENhcmRzKHByZXZpb3VzR2FtZVN0YXRlOiBMaWIuR2FtZVN0YXRlIHwgdW5kZWZpbmVkLCBnYW1lU3RhdGU6IExpYi5HYW1lU3RhdGUpIHtcclxuICAgIGNvbnN0IHByZXZpb3VzRGVja1Nwcml0ZXMgPSBkZWNrU3ByaXRlcztcclxuICAgIGNvbnN0IHByZXZpb3VzQmFja1Nwcml0ZXNGb3JQbGF5ZXIgPSBiYWNrU3ByaXRlc0ZvclBsYXllcjtcclxuICAgIGNvbnN0IHByZXZpb3VzRmFjZVNwcml0ZXNGb3JQbGF5ZXIgPSBmYWNlU3ByaXRlc0ZvclBsYXllcjtcclxuXHJcbiAgICBiYWNrU3ByaXRlc0ZvclBsYXllciA9IFtdO1xyXG4gICAgZmFjZVNwcml0ZXNGb3JQbGF5ZXIgPSBbXTtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgNDsgKytpKSB7XHJcbiAgICAgICAgY29uc3QgcHJldmlvdXNCYWNrU3ByaXRlcyA9IHByZXZpb3VzQmFja1Nwcml0ZXNGb3JQbGF5ZXJbaV0gPz8gW107XHJcbiAgICAgICAgcHJldmlvdXNCYWNrU3ByaXRlc0ZvclBsYXllcltpXSA9IHByZXZpb3VzQmFja1Nwcml0ZXM7XHJcblxyXG4gICAgICAgIGNvbnN0IHByZXZpb3VzRmFjZVNwcml0ZXMgPSBwcmV2aW91c0ZhY2VTcHJpdGVzRm9yUGxheWVyW2ldID8/IFtdO1xyXG4gICAgICAgIHByZXZpb3VzRmFjZVNwcml0ZXNGb3JQbGF5ZXJbaV0gPSBwcmV2aW91c0ZhY2VTcHJpdGVzO1xyXG5cclxuICAgICAgICBsZXQgcHJldmlvdXNGYWNlQ2FyZHM6IExpYi5DYXJkW107XHJcbiAgICAgICAgbGV0IGZhY2VDYXJkczogTGliLkNhcmRbXTtcclxuICAgICAgICBpZiAoaSA9PT0gZ2FtZVN0YXRlLnBsYXllckluZGV4KSB7XHJcbiAgICAgICAgICAgIHByZXZpb3VzRmFjZUNhcmRzID0gcHJldmlvdXNHYW1lU3RhdGU/LnBsYXllckNhcmRzID8/IFtdO1xyXG4gICAgICAgICAgICBmYWNlQ2FyZHMgPSBnYW1lU3RhdGUucGxheWVyQ2FyZHM7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcHJldmlvdXNGYWNlQ2FyZHMgPSBwcmV2aW91c0dhbWVTdGF0ZT8ub3RoZXJQbGF5ZXJzW2ldPy5yZXZlYWxlZENhcmRzID8/IFtdO1xyXG4gICAgICAgICAgICBmYWNlQ2FyZHMgPSBnYW1lU3RhdGUub3RoZXJQbGF5ZXJzW2ldPy5yZXZlYWxlZENhcmRzID8/IFtdO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IGZhY2VTcHJpdGVzOiBTcHJpdGVbXSA9IFtdO1xyXG4gICAgICAgIGZhY2VTcHJpdGVzRm9yUGxheWVyW2ldID0gZmFjZVNwcml0ZXM7XHJcbiAgICAgICAgZm9yIChjb25zdCBmYWNlQ2FyZCBvZiBmYWNlQ2FyZHMpIHtcclxuICAgICAgICAgICAgbGV0IGZhY2VTcHJpdGU6IFNwcml0ZSB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgaWYgKGZhY2VTcHJpdGUgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBwcmV2aW91c0ZhY2VDYXJkcy5sZW5ndGg7ICsraikge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHByZXZpb3VzRmFjZUNhcmQgPSBwcmV2aW91c0ZhY2VDYXJkc1tqXTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAocHJldmlvdXNGYWNlQ2FyZCA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoSlNPTi5zdHJpbmdpZnkoZmFjZUNhcmQpID09PSBKU09OLnN0cmluZ2lmeShwcmV2aW91c0ZhY2VDYXJkKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwcmV2aW91c0ZhY2VDYXJkcy5zcGxpY2UoaiwgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZhY2VTcHJpdGUgPSBwcmV2aW91c0ZhY2VTcHJpdGVzLnNwbGljZShqLCAxKVswXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZhY2VTcHJpdGUgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgaWYgKGZhY2VTcHJpdGUgPT09IHVuZGVmaW5lZCAmJiBwcmV2aW91c0JhY2tTcHJpdGVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgIC8vIG1ha2UgaXQgbG9vayBsaWtlIHRoaXMgY2FyZCB3YXMgcmV2ZWFsZWQgYW1vbmcgcHJldmlvdXNseSBoaWRkZW4gY2FyZHNcclxuICAgICAgICAgICAgICAgIC8vIHdoaWNoLCBvZiBjb3Vyc2UsIHJlcXVpcmVzIHRoYXQgdGhlIHBsYXllciBoYWQgcHJldmlvdXNseSBoaWRkZW4gY2FyZHNcclxuICAgICAgICAgICAgICAgIGZhY2VTcHJpdGUgPSBwcmV2aW91c0JhY2tTcHJpdGVzLnNwbGljZSgwLCAxKVswXTtcclxuICAgICAgICAgICAgICAgIGlmIChmYWNlU3ByaXRlID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG4gICAgICAgICAgICAgICAgZmFjZVNwcml0ZS5pbWFnZSA9IENhcmRJbWFnZXMuZ2V0KEpTT04uc3RyaW5naWZ5KGZhY2VDYXJkKSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChmYWNlU3ByaXRlID09PSB1bmRlZmluZWQgJiYgcHJldmlvdXNEZWNrU3ByaXRlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBtYWtlIGl0IGxvb2sgbGlrZSB0aGlzIGNhcmQgY2FtZSBmcm9tIHRoZSBkZWNrO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZmFjZVNwcml0ZSA9IHByZXZpb3VzRGVja1Nwcml0ZXMuc3BsaWNlKDAsIDEpWzBdO1xyXG4gICAgICAgICAgICAgICAgaWYgKGZhY2VTcHJpdGUgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICAgICAgICAgICAgICBmYWNlU3ByaXRlLmltYWdlID0gQ2FyZEltYWdlcy5nZXQoSlNPTi5zdHJpbmdpZnkoZmFjZUNhcmQpKTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyB0aGlzIHNwcml0ZSBpcyByZW5kZXJlZCBpbiB0aGUgcGxheWVyJ3MgdHJhbnNmb3JtZWQgY2FudmFzIGNvbnRleHRcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRyYW5zZm9ybSA9IFZQLmdldFRyYW5zZm9ybUZvclBsYXllcihWUC5nZXRSZWxhdGl2ZVBsYXllckluZGV4KGksIGdhbWVTdGF0ZS5wbGF5ZXJJbmRleCkpO1xyXG4gICAgICAgICAgICAgICAgdHJhbnNmb3JtLmludmVydFNlbGYoKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHBvaW50ID0gdHJhbnNmb3JtLnRyYW5zZm9ybVBvaW50KGZhY2VTcHJpdGUucG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgZmFjZVNwcml0ZS5wb3NpdGlvbiA9IG5ldyBWZWN0b3IocG9pbnQueCwgcG9pbnQueSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChmYWNlU3ByaXRlID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIGZhY2VTcHJpdGUgPSBuZXcgU3ByaXRlKENhcmRJbWFnZXMuZ2V0KEpTT04uc3RyaW5naWZ5KGZhY2VDYXJkKSkpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBmYWNlU3ByaXRlcy5wdXNoKGZhY2VTcHJpdGUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IGJhY2tTcHJpdGVzOiBTcHJpdGVbXSA9IFtdO1xyXG4gICAgICAgIGJhY2tTcHJpdGVzRm9yUGxheWVyW2ldID0gYmFja1Nwcml0ZXM7XHJcbiAgICAgICAgY29uc3Qgb3RoZXJQbGF5ZXIgPSBnYW1lU3RhdGUub3RoZXJQbGF5ZXJzW2ldO1xyXG4gICAgICAgIGlmIChpICE9PSBnYW1lU3RhdGUucGxheWVySW5kZXggJiYgb3RoZXJQbGF5ZXIgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAvLyBvbmx5IG90aGVyIHBsYXllcnMgaGF2ZSBhbnkgaGlkZGVuIGNhcmRzXHJcbiAgICAgICAgICAgIHdoaWxlIChiYWNrU3ByaXRlcy5sZW5ndGggPCBvdGhlclBsYXllci5jYXJkQ291bnQgLSBvdGhlclBsYXllci5yZXZlYWxlZENhcmRzLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IGJhY2tTcHJpdGU6IFNwcml0ZSB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgICAgIGlmIChiYWNrU3ByaXRlID09PSB1bmRlZmluZWQgJiYgcHJldmlvdXNCYWNrU3ByaXRlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYmFja1Nwcml0ZSA9IHByZXZpb3VzQmFja1Nwcml0ZXMuc3BsaWNlKDAsIDEpWzBdO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChiYWNrU3ByaXRlID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBpZiAoYmFja1Nwcml0ZSA9PT0gdW5kZWZpbmVkICYmIHByZXZpb3VzRmFjZVNwcml0ZXMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGJhY2tTcHJpdGUgPSBwcmV2aW91c0ZhY2VTcHJpdGVzLnNwbGljZSgwLCAxKVswXTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoYmFja1Nwcml0ZSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICAgICAgICAgICAgICAgICAgICBiYWNrU3ByaXRlLmltYWdlID0gQ2FyZEltYWdlcy5nZXQoYEJhY2ske2l9YCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGlmIChiYWNrU3ByaXRlID09PSB1bmRlZmluZWQgJiYgcHJldmlvdXNEZWNrU3ByaXRlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYmFja1Nwcml0ZSA9IHByZXZpb3VzRGVja1Nwcml0ZXMuc3BsaWNlKDAsIDEpWzBdO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChiYWNrU3ByaXRlID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJhY2tTcHJpdGUuaW1hZ2UgPSBDYXJkSW1hZ2VzLmdldChgQmFjayR7aX1gKTtcclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAvLyB0aGlzIHNwcml0ZSBpcyByZW5kZXJlZCBpbiB0aGUgcGxheWVyJ3MgdHJhbnNmb3JtZWQgY2FudmFzIGNvbnRleHRcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0cmFuc2Zvcm0gPSBWUC5nZXRUcmFuc2Zvcm1Gb3JQbGF5ZXIoVlAuZ2V0UmVsYXRpdmVQbGF5ZXJJbmRleChpLCBnYW1lU3RhdGUucGxheWVySW5kZXgpKTtcclxuICAgICAgICAgICAgICAgICAgICB0cmFuc2Zvcm0uaW52ZXJ0U2VsZigpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBvaW50ID0gdHJhbnNmb3JtLnRyYW5zZm9ybVBvaW50KGJhY2tTcHJpdGUucG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgIGJhY2tTcHJpdGUucG9zaXRpb24gPSBuZXcgVmVjdG9yKHBvaW50LngsIHBvaW50LnkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBpZiAoYmFja1Nwcml0ZSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYmFja1Nwcml0ZSA9IG5ldyBTcHJpdGUoQ2FyZEltYWdlcy5nZXQoYEJhY2ske2l9YCkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGJhY2tTcHJpdGVzLnB1c2goYmFja1Nwcml0ZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZGVja1Nwcml0ZXMgPSBbXTtcclxuICAgIHdoaWxlIChkZWNrU3ByaXRlcy5sZW5ndGggPCBnYW1lU3RhdGUuZGVja0NvdW50KSB7XHJcbiAgICAgICAgbGV0IGRlY2tTcHJpdGU6IFNwcml0ZSB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcclxuICAgICAgICBpZiAoZGVja1Nwcml0ZSA9PSB1bmRlZmluZWQgJiYgcHJldmlvdXNEZWNrU3ByaXRlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIGRlY2tTcHJpdGUgPSBwcmV2aW91c0RlY2tTcHJpdGVzLnNwbGljZSgwLCAxKVswXTtcclxuICAgICAgICAgICAgaWYgKGRlY2tTcHJpdGUgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoZGVja1Nwcml0ZSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIGxldCBpID0gMDtcclxuICAgICAgICAgICAgZm9yIChjb25zdCBwcmV2aW91c0JhY2tTcHJpdGVzIG9mIHByZXZpb3VzQmFja1Nwcml0ZXNGb3JQbGF5ZXIpIHtcclxuICAgICAgICAgICAgICAgIGlmIChwcmV2aW91c0JhY2tTcHJpdGVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBkZWNrU3ByaXRlID0gcHJldmlvdXNCYWNrU3ByaXRlcy5zcGxpY2UoMCwgMSlbMF07XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRlY2tTcHJpdGUgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVja1Nwcml0ZS5pbWFnZSA9IENhcmRJbWFnZXMuZ2V0KCdCYWNrMCcpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLyB0aGUgc3ByaXRlIGNhbWUgZnJvbSB0aGUgcGxheWVyJ3MgdHJhbnNmb3JtZWQgY2FudmFzIGNvbnRleHRcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0cmFuc2Zvcm0gPSBWUC5nZXRUcmFuc2Zvcm1Gb3JQbGF5ZXIoVlAuZ2V0UmVsYXRpdmVQbGF5ZXJJbmRleChpLCBnYW1lU3RhdGUucGxheWVySW5kZXgpKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBwb2ludCA9IHRyYW5zZm9ybS50cmFuc2Zvcm1Qb2ludChkZWNrU3ByaXRlLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICBkZWNrU3ByaXRlLnBvc2l0aW9uID0gbmV3IFZlY3Rvcihwb2ludC54LCBwb2ludC55KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgKytpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoZGVja1Nwcml0ZSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIGxldCBpID0gMDtcclxuICAgICAgICAgICAgZm9yIChjb25zdCBwcmV2aW91c0ZhY2VTcHJpdGVzIG9mIHByZXZpb3VzRmFjZVNwcml0ZXNGb3JQbGF5ZXIpIHtcclxuICAgICAgICAgICAgICAgIGlmIChwcmV2aW91c0ZhY2VTcHJpdGVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBkZWNrU3ByaXRlID0gcHJldmlvdXNGYWNlU3ByaXRlcy5zcGxpY2UoMCwgMSlbMF07XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRlY2tTcHJpdGUgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVja1Nwcml0ZS5pbWFnZSA9IENhcmRJbWFnZXMuZ2V0KCdCYWNrMCcpO1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIHRoZSBzcHJpdGUgY2FtZSBmcm9tIHRoZSBwbGF5ZXIncyB0cmFuc2Zvcm1lZCBjYW52YXMgY29udGV4dFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRyYW5zZm9ybSA9IFZQLmdldFRyYW5zZm9ybUZvclBsYXllcihWUC5nZXRSZWxhdGl2ZVBsYXllckluZGV4KGksIGdhbWVTdGF0ZS5wbGF5ZXJJbmRleCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBvaW50ID0gdHJhbnNmb3JtLnRyYW5zZm9ybVBvaW50KGRlY2tTcHJpdGUucG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgIGRlY2tTcHJpdGUucG9zaXRpb24gPSBuZXcgVmVjdG9yKHBvaW50LngsIHBvaW50LnkpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICArK2k7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChkZWNrU3ByaXRlID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgZGVja1Nwcml0ZSA9IG5ldyBTcHJpdGUoQ2FyZEltYWdlcy5nZXQoJ0JhY2swJykpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZGVja1Nwcml0ZXMucHVzaChkZWNrU3ByaXRlKTtcclxuICAgIH1cclxuXHJcbiAgICBzZXRTcHJpdGVUYXJnZXRzKGdhbWVTdGF0ZSk7XHJcbiAgICBcclxuICAgIG9uQW5pbWF0aW9uc0Fzc29jaWF0ZWQoKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHNldFNwcml0ZVRhcmdldHMoXHJcbiAgICBnYW1lU3RhdGU6IExpYi5HYW1lU3RhdGUsXHJcbiAgICByZXNlcnZlZFNwcml0ZXNBbmRDYXJkcz86IFtTcHJpdGUsIExpYi5DYXJkXVtdLFxyXG4gICAgbW92aW5nU3ByaXRlc0FuZENhcmRzPzogW1Nwcml0ZSwgTGliLkNhcmRdW10sXHJcbiAgICBzaGFyZUNvdW50PzogbnVtYmVyLFxyXG4gICAgcmV2ZWFsQ291bnQ/OiBudW1iZXIsXHJcbiAgICBzcGxpdEluZGV4PzogbnVtYmVyLFxyXG4gICAgcmV0dXJuVG9EZWNrPzogYm9vbGVhblxyXG4pIHtcclxuICAgIGNvbnN0IHNwcml0ZXMgPSBmYWNlU3ByaXRlc0ZvclBsYXllcltnYW1lU3RhdGUucGxheWVySW5kZXhdO1xyXG4gICAgaWYgKHNwcml0ZXMgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcblxyXG4gICAgY29uc3QgY2FyZHMgPSBnYW1lU3RhdGUucGxheWVyQ2FyZHM7XHJcblxyXG4gICAgcmVzZXJ2ZWRTcHJpdGVzQW5kQ2FyZHMgPSByZXNlcnZlZFNwcml0ZXNBbmRDYXJkcyA/PyBjYXJkcy5tYXAoKGNhcmQsIGluZGV4KSA9PiA8W1Nwcml0ZSwgTGliLkNhcmRdPltzcHJpdGVzW2luZGV4XSwgY2FyZF0pO1xyXG4gICAgbW92aW5nU3ByaXRlc0FuZENhcmRzID0gbW92aW5nU3ByaXRlc0FuZENhcmRzID8/IFtdO1xyXG4gICAgc2hhcmVDb3VudCA9IHNoYXJlQ291bnQgPz8gZ2FtZVN0YXRlLnBsYXllclNoYXJlQ291bnQ7XHJcbiAgICByZXZlYWxDb3VudCA9IHJldmVhbENvdW50ID8/IGdhbWVTdGF0ZS5wbGF5ZXJSZXZlYWxDb3VudDtcclxuICAgIHNwbGl0SW5kZXggPSBzcGxpdEluZGV4ID8/IGNhcmRzLmxlbmd0aDtcclxuICAgIHJldHVyblRvRGVjayA9IHJldHVyblRvRGVjayA/PyBmYWxzZTtcclxuXHJcbiAgICAvLyBjbGVhciBmb3IgcmVpbnNlcnRpb25cclxuICAgIHNwcml0ZXMuc3BsaWNlKDAsIHNwcml0ZXMubGVuZ3RoKTtcclxuICAgIGNhcmRzLnNwbGljZSgwLCBjYXJkcy5sZW5ndGgpO1xyXG5cclxuICAgIGZvciAoY29uc3QgW3Jlc2VydmVkU3ByaXRlLCByZXNlcnZlZENhcmRdIG9mIHJlc2VydmVkU3ByaXRlc0FuZENhcmRzKSB7XHJcbiAgICAgICAgaWYgKGNhcmRzLmxlbmd0aCA9PT0gc3BsaXRJbmRleCkge1xyXG4gICAgICAgICAgICBmb3IgKGNvbnN0IFttb3ZpbmdTcHJpdGUsIG1vdmluZ0NhcmRdIG9mIG1vdmluZ1Nwcml0ZXNBbmRDYXJkcykge1xyXG4gICAgICAgICAgICAgICAgc3ByaXRlcy5wdXNoKG1vdmluZ1Nwcml0ZSk7XHJcbiAgICAgICAgICAgICAgICBjYXJkcy5wdXNoKG1vdmluZ0NhcmQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoY2FyZHMubGVuZ3RoIDwgc2hhcmVDb3VudCkge1xyXG4gICAgICAgICAgICByZXNlcnZlZFNwcml0ZS50YXJnZXQgPSBuZXcgVmVjdG9yKFxyXG4gICAgICAgICAgICAgICAgVlAuY2FudmFzLndpZHRoIC8gMiAtIFZQLnNwcml0ZVdpZHRoIC0gc2hhcmVDb3VudCAqIFZQLnNwcml0ZUdhcCArIGNhcmRzLmxlbmd0aCAqIFZQLnNwcml0ZUdhcCxcclxuICAgICAgICAgICAgICAgIFZQLmNhbnZhcy5oZWlnaHQgLSAyICogVlAuc3ByaXRlSGVpZ2h0XHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChjYXJkcy5sZW5ndGggPCByZXZlYWxDb3VudCkge1xyXG4gICAgICAgICAgICByZXNlcnZlZFNwcml0ZS50YXJnZXQgPSBuZXcgVmVjdG9yKFxyXG4gICAgICAgICAgICAgICAgVlAuY2FudmFzLndpZHRoIC8gMiArIChjYXJkcy5sZW5ndGggLSBzaGFyZUNvdW50ICsgMSkgKiBWUC5zcHJpdGVHYXAsXHJcbiAgICAgICAgICAgICAgICBWUC5jYW52YXMuaGVpZ2h0IC0gMiAqIFZQLnNwcml0ZUhlaWdodFxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGxldCBjb3VudCA9IHJlc2VydmVkU3ByaXRlc0FuZENhcmRzLmxlbmd0aCAtIHJldmVhbENvdW50O1xyXG4gICAgICAgICAgICBpZiAoIXJldHVyblRvRGVjaykge1xyXG4gICAgICAgICAgICAgICAgY291bnQgKz0gbW92aW5nU3ByaXRlc0FuZENhcmRzLmxlbmd0aDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmVzZXJ2ZWRTcHJpdGUudGFyZ2V0ID0gbmV3IFZlY3RvcihcclxuICAgICAgICAgICAgICAgIFZQLmNhbnZhcy53aWR0aCAvIDIgLSBWUC5zcHJpdGVXaWR0aCAvIDIgKyAoY2FyZHMubGVuZ3RoIC0gcmV2ZWFsQ291bnQgLSAoY291bnQgLSAxKSAvIDIpICogVlAuc3ByaXRlR2FwLFxyXG4gICAgICAgICAgICAgICAgVlAuY2FudmFzLmhlaWdodCAtIFZQLnNwcml0ZUhlaWdodFxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICBzcHJpdGVzLnB1c2gocmVzZXJ2ZWRTcHJpdGUpO1xyXG4gICAgICAgIGNhcmRzLnB1c2gocmVzZXJ2ZWRDYXJkKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoY2FyZHMubGVuZ3RoID09PSBzcGxpdEluZGV4KSB7XHJcbiAgICAgICAgZm9yIChjb25zdCBbbW92aW5nU3ByaXRlLCBtb3ZpbmdDYXJkXSBvZiBtb3ZpbmdTcHJpdGVzQW5kQ2FyZHMpIHtcclxuICAgICAgICAgICAgc3ByaXRlcy5wdXNoKG1vdmluZ1Nwcml0ZSk7XHJcbiAgICAgICAgICAgIGNhcmRzLnB1c2gobW92aW5nQ2FyZCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGdhbWVTdGF0ZS5wbGF5ZXJTaGFyZUNvdW50ID0gc2hhcmVDb3VudDtcclxuICAgIGdhbWVTdGF0ZS5wbGF5ZXJSZXZlYWxDb3VudCA9IHJldmVhbENvdW50O1xyXG59XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gam9pbkdhbWUoZ2FtZUlkOiBzdHJpbmcsIHBsYXllck5hbWU6IHN0cmluZykge1xyXG4gICAgLy8gd2FpdCBmb3IgY29ubmVjdGlvblxyXG4gICAgZG8ge1xyXG4gICAgICAgIGF3YWl0IExpYi5kZWxheSgxMDAwKTtcclxuICAgICAgICBjb25zb2xlLmxvZyhgd3MucmVhZHlTdGF0ZTogJHt3cy5yZWFkeVN0YXRlfSwgV2ViU29ja2V0Lk9QRU46ICR7V2ViU29ja2V0Lk9QRU59YCk7XHJcbiAgICB9IHdoaWxlICh3cy5yZWFkeVN0YXRlICE9IFdlYlNvY2tldC5PUEVOKTtcclxuXHJcbiAgICAvLyB0cnkgdG8gam9pbiB0aGUgZ2FtZVxyXG4gICAgYXdhaXQgbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgIGFkZENhbGxiYWNrKCdqb2luR2FtZScsIHJlc29sdmUsIHJlamVjdCk7XHJcbiAgICAgICAgd3Muc2VuZChKU09OLnN0cmluZ2lmeSg8TGliLkpvaW5HYW1lTWVzc2FnZT57IGdhbWVJZCwgcGxheWVyTmFtZSB9KSk7XHJcbiAgICB9KTtcclxufVxyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGRyYXdDYXJkKCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgY29uc3QgYW5pbWF0aW9uc0Fzc29jaWF0ZWQgPSBuZXcgUHJvbWlzZTx2b2lkPihyZXNvbHZlID0+IHtcclxuICAgICAgICBvbkFuaW1hdGlvbnNBc3NvY2lhdGVkID0gKCkgPT4ge1xyXG4gICAgICAgICAgICBvbkFuaW1hdGlvbnNBc3NvY2lhdGVkID0gKCkgPT4ge307XHJcbiAgICAgICAgICAgIHJlc29sdmUoKTtcclxuICAgICAgICB9O1xyXG4gICAgfSk7XHJcblxyXG4gICAgYXdhaXQgbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgIGFkZENhbGxiYWNrKCdkcmF3Q2FyZCcsIHJlc29sdmUsIHJlamVjdCk7XHJcbiAgICAgICAgd3Muc2VuZChKU09OLnN0cmluZ2lmeSg8TGliLkRyYXdDYXJkTWVzc2FnZT57XHJcbiAgICAgICAgICAgIGRyYXdDYXJkOiBudWxsXHJcbiAgICAgICAgfSkpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgYXdhaXQgYW5pbWF0aW9uc0Fzc29jaWF0ZWQ7XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXR1cm5DYXJkc1RvRGVjayhnYW1lU3RhdGU6IExpYi5HYW1lU3RhdGUpIHtcclxuICAgIGF3YWl0IG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICBhZGRDYWxsYmFjaygncmV0dXJuQ2FyZHNUb0RlY2snLCByZXNvbHZlLCByZWplY3QpO1xyXG4gICAgICAgIHdzLnNlbmQoSlNPTi5zdHJpbmdpZnkoPExpYi5SZXR1cm5DYXJkc1RvRGVja01lc3NhZ2U+e1xyXG4gICAgICAgICAgICBjYXJkc1RvUmV0dXJuVG9EZWNrOiBzZWxlY3RlZEluZGljZXMubWFwKGkgPT4gZ2FtZVN0YXRlLnBsYXllckNhcmRzW2ldKVxyXG4gICAgICAgIH0pKTtcclxuICAgIH0pO1xyXG4gICAgXHJcbiAgICAvLyBtYWtlIHRoZSBzZWxlY3RlZCBjYXJkcyBkaXNhcHBlYXJcclxuICAgIHNlbGVjdGVkSW5kaWNlcy5zcGxpY2UoMCwgc2VsZWN0ZWRJbmRpY2VzLmxlbmd0aCk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiByZW9yZGVyQ2FyZHMoZ2FtZVN0YXRlOiBMaWIuR2FtZVN0YXRlKSB7XHJcbiAgICByZXR1cm4gbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgIGFkZENhbGxiYWNrKCdyZW9yZGVyQ2FyZHMnLCByZXNvbHZlLCByZWplY3QpO1xyXG4gICAgICAgIHdzLnNlbmQoSlNPTi5zdHJpbmdpZnkoPExpYi5SZW9yZGVyQ2FyZHNNZXNzYWdlPntcclxuICAgICAgICAgICAgcmVvcmRlcmVkQ2FyZHM6IGdhbWVTdGF0ZS5wbGF5ZXJDYXJkcyxcclxuICAgICAgICAgICAgbmV3U2hhcmVDb3VudDogZ2FtZVN0YXRlLnBsYXllclNoYXJlQ291bnQsXHJcbiAgICAgICAgICAgIG5ld1JldmVhbENvdW50OiBnYW1lU3RhdGUucGxheWVyUmV2ZWFsQ291bnRcclxuICAgICAgICB9KSk7XHJcbiAgICB9KTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHNvcnRCeVN1aXQoZ2FtZVN0YXRlOiBMaWIuR2FtZVN0YXRlKSB7XHJcbiAgICBsZXQgY29tcGFyZUZuID0gKFthU3VpdCwgYVJhbmtdOiBMaWIuQ2FyZCwgW2JTdWl0LCBiUmFua106IExpYi5DYXJkKSA9PiB7XHJcbiAgICAgICAgaWYgKGFTdWl0ICE9PSBiU3VpdCkge1xyXG4gICAgICAgICAgICByZXR1cm4gYVN1aXQgLSBiU3VpdDtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICByZXR1cm4gYVJhbmsgLSBiUmFuaztcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIHByZXZpb3VzR2FtZVN0YXRlID0gPExpYi5HYW1lU3RhdGU+SlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShnYW1lU3RhdGUpKTtcclxuICAgIHNvcnRDYXJkcyhnYW1lU3RhdGUucGxheWVyQ2FyZHMsIDAsIGdhbWVTdGF0ZS5wbGF5ZXJTaGFyZUNvdW50LCBjb21wYXJlRm4pO1xyXG4gICAgc29ydENhcmRzKGdhbWVTdGF0ZS5wbGF5ZXJDYXJkcywgZ2FtZVN0YXRlLnBsYXllclNoYXJlQ291bnQsIGdhbWVTdGF0ZS5wbGF5ZXJSZXZlYWxDb3VudCwgY29tcGFyZUZuKTtcclxuICAgIHNvcnRDYXJkcyhnYW1lU3RhdGUucGxheWVyQ2FyZHMsIGdhbWVTdGF0ZS5wbGF5ZXJSZXZlYWxDb3VudCwgZ2FtZVN0YXRlLnBsYXllckNhcmRzLmxlbmd0aCwgY29tcGFyZUZuKTtcclxuICAgIGFzc29jaWF0ZUFuaW1hdGlvbnNXaXRoQ2FyZHMoZ2FtZVN0YXRlLCBwcmV2aW91c0dhbWVTdGF0ZSk7XHJcbiAgICByZXR1cm4gcmVvcmRlckNhcmRzKGdhbWVTdGF0ZSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzb3J0QnlSYW5rKGdhbWVTdGF0ZTogTGliLkdhbWVTdGF0ZSkge1xyXG4gICAgbGV0IGNvbXBhcmVGbiA9IChbYVN1aXQsIGFSYW5rXTogTGliLkNhcmQsIFtiU3VpdCwgYlJhbmtdOiBMaWIuQ2FyZCkgPT4ge1xyXG4gICAgICAgIGlmIChhUmFuayAhPT0gYlJhbmspIHtcclxuICAgICAgICAgICAgcmV0dXJuIGFSYW5rIC0gYlJhbms7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcmV0dXJuIGFTdWl0IC0gYlN1aXQ7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBwcmV2aW91c0dhbWVTdGF0ZSA9IDxMaWIuR2FtZVN0YXRlPkpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoZ2FtZVN0YXRlKSk7XHJcbiAgICBzb3J0Q2FyZHMoZ2FtZVN0YXRlLnBsYXllckNhcmRzLCAwLCBnYW1lU3RhdGUucGxheWVyU2hhcmVDb3VudCwgY29tcGFyZUZuKTtcclxuICAgIHNvcnRDYXJkcyhnYW1lU3RhdGUucGxheWVyQ2FyZHMsIGdhbWVTdGF0ZS5wbGF5ZXJTaGFyZUNvdW50LCBnYW1lU3RhdGUucGxheWVyUmV2ZWFsQ291bnQsIGNvbXBhcmVGbik7XHJcbiAgICBzb3J0Q2FyZHMoZ2FtZVN0YXRlLnBsYXllckNhcmRzLCBnYW1lU3RhdGUucGxheWVyUmV2ZWFsQ291bnQsIGdhbWVTdGF0ZS5wbGF5ZXJDYXJkcy5sZW5ndGgsIGNvbXBhcmVGbik7XHJcbiAgICBhc3NvY2lhdGVBbmltYXRpb25zV2l0aENhcmRzKGdhbWVTdGF0ZSwgcHJldmlvdXNHYW1lU3RhdGUpO1xyXG4gICAgcmV0dXJuIHJlb3JkZXJDYXJkcyhnYW1lU3RhdGUpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzb3J0Q2FyZHMoXHJcbiAgICBjYXJkczogTGliLkNhcmRbXSxcclxuICAgIHN0YXJ0OiBudW1iZXIsXHJcbiAgICBlbmQ6IG51bWJlcixcclxuICAgIGNvbXBhcmVGbjogKGE6IExpYi5DYXJkLCBiOiBMaWIuQ2FyZCkgPT4gbnVtYmVyXHJcbikge1xyXG4gICAgY29uc3Qgc2VjdGlvbiA9IGNhcmRzLnNsaWNlKHN0YXJ0LCBlbmQpO1xyXG4gICAgc2VjdGlvbi5zb3J0KGNvbXBhcmVGbik7XHJcbiAgICBjYXJkcy5zcGxpY2Uoc3RhcnQsIGVuZCAtIHN0YXJ0LCAuLi5zZWN0aW9uKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHdhaXQoKSB7XHJcbiAgICByZXR1cm4gbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgIGFkZENhbGxiYWNrKCd3YWl0JywgcmVzb2x2ZSwgcmVqZWN0KTtcclxuICAgICAgICB3cy5zZW5kKEpTT04uc3RyaW5naWZ5KDxMaWIuV2FpdE1lc3NhZ2U+e1xyXG4gICAgICAgICAgICB3YWl0OiBudWxsXHJcbiAgICAgICAgfSkpO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBwcm9jZWVkKCkge1xyXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICBhZGRDYWxsYmFjaygncHJvY2VlZCcsIHJlc29sdmUsIHJlamVjdCk7XHJcbiAgICAgICAgd3Muc2VuZChKU09OLnN0cmluZ2lmeSg8TGliLlByb2NlZWRNZXNzYWdlPntcclxuICAgICAgICAgICAgcHJvY2VlZDogbnVsbFxyXG4gICAgICAgIH0pKTtcclxuICAgIH0pO1xyXG59IiwiZXhwb3J0IGRlZmF1bHQgY2xhc3MgVmVjdG9yIHtcclxuICAgIHJlYWRvbmx5IHg6IG51bWJlciA9IDA7XHJcbiAgICByZWFkb25seSB5OiBudW1iZXIgPSAwO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKHg6IG51bWJlciwgeTogbnVtYmVyKSB7XHJcbiAgICAgICAgdGhpcy54ID0geDtcclxuICAgICAgICB0aGlzLnkgPSB5O1xyXG4gICAgfVxyXG5cclxuICAgIC8qXHJcbiAgICBhc3NpZ24odjogVmVjdG9yKSB7XHJcbiAgICAgICAgdGhpcy54ID0gdi54O1xyXG4gICAgICAgIHRoaXMueSA9IHYueTtcclxuICAgIH1cclxuICAgICovXHJcblxyXG4gICAgYWRkKHY6IFZlY3Rvcikge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjdG9yKHRoaXMueCArIHYueCwgdGhpcy55ICsgdi55KTtcclxuICAgIH1cclxuXHJcbiAgICAvKlxyXG4gICAgYWRkU2VsZih2OiBWZWN0b3IpIHtcclxuICAgICAgICB0aGlzLnggKz0gdi54O1xyXG4gICAgICAgIHRoaXMueSArPSB2Lnk7XHJcbiAgICB9XHJcbiAgICAqL1xyXG4gICAgXHJcbiAgICBzdWIodjogVmVjdG9yKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWN0b3IodGhpcy54IC0gdi54LCB0aGlzLnkgLSB2LnkpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qXHJcbiAgICBzdWJTZWxmKHY6IFZlY3Rvcikge1xyXG4gICAgICAgIHRoaXMueCAtPSB2Lng7XHJcbiAgICAgICAgdGhpcy55IC09IHYueTtcclxuICAgIH1cclxuICAgICovXHJcbiAgICBcclxuICAgIGdldCBsZW5ndGgoKSB7XHJcbiAgICAgICAgcmV0dXJuIE1hdGguc3FydCh0aGlzLnggKiB0aGlzLnggKyB0aGlzLnkgKiB0aGlzLnkpO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBkaXN0YW5jZSh2OiBWZWN0b3IpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLnN1Yih2KS5sZW5ndGg7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHNjYWxlKHM6IG51bWJlcik6IFZlY3RvciB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWN0b3IocyAqIHRoaXMueCwgcyAqIHRoaXMueSk7XHJcbiAgICB9XHJcblxyXG4gICAgLypcclxuICAgIHNjYWxlU2VsZihzOiBudW1iZXIpIHtcclxuICAgICAgICB0aGlzLnggKj0gcztcclxuICAgICAgICB0aGlzLnkgKj0gcztcclxuICAgIH1cclxuICAgICovXHJcbn0iLCJpbXBvcnQgVmVjdG9yIGZyb20gJy4vdmVjdG9yJztcclxuXHJcbmV4cG9ydCBjb25zdCBjYW52YXMgPSA8SFRNTENhbnZhc0VsZW1lbnQ+ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NhbnZhcycpO1xyXG5leHBvcnQgY29uc3QgY29udGV4dCA9IDxDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQ+Y2FudmFzLmdldENvbnRleHQoJzJkJyk7XHJcblxyXG4vLyBnZXQgcGl4ZWxzIHBlciBjZW50aW1ldGVyLCB3aGljaCBpcyBjb25zdGFudFxyXG5jb25zdCB0ZXN0RWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xyXG50ZXN0RWxlbWVudC5zdHlsZS53aWR0aCA9ICcxY20nO1xyXG5kb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHRlc3RFbGVtZW50KTtcclxuZXhwb3J0IGNvbnN0IHBpeGVsc1BlckNNID0gdGVzdEVsZW1lbnQub2Zmc2V0V2lkdGg7XHJcbmRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQodGVzdEVsZW1lbnQpO1xyXG5cclxuLy8gdGhlc2UgcGFyYW1ldGVycyBjaGFuZ2Ugd2l0aCByZXNpemluZ1xyXG5leHBvcnQgbGV0IGNhbnZhc1JlY3QgPSBjYW52YXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcbmV4cG9ydCBsZXQgcGl4ZWxzUGVyUGVyY2VudCA9IDA7XHJcblxyXG5leHBvcnQgbGV0IHNwcml0ZVdpZHRoOiBudW1iZXI7XHJcbmV4cG9ydCBsZXQgc3ByaXRlSGVpZ2h0OiBudW1iZXI7XHJcbmV4cG9ydCBsZXQgc3ByaXRlR2FwOiBudW1iZXI7XHJcbmV4cG9ydCBsZXQgc3ByaXRlRGVja0dhcDogbnVtYmVyO1xyXG5cclxuZXhwb3J0IGxldCBzb3J0QnlSYW5rRm9udDogc3RyaW5nO1xyXG5leHBvcnQgbGV0IHNvcnRCeVJhbmtCb3VuZHM6IFtWZWN0b3IsIFZlY3Rvcl07XHJcblxyXG5leHBvcnQgbGV0IHNvcnRCeVN1aXRGb250OiBzdHJpbmc7XHJcbmV4cG9ydCBsZXQgc29ydEJ5U3VpdEJvdW5kczogW1ZlY3RvciwgVmVjdG9yXTtcclxuXHJcbmV4cG9ydCBsZXQgd2FpdEZvbnQ6IHN0cmluZztcclxuZXhwb3J0IGxldCB3YWl0Qm91bmRzOiBbVmVjdG9yLCBWZWN0b3JdO1xyXG5cclxuZXhwb3J0IGxldCBwcm9jZWVkRm9udDogc3RyaW5nO1xyXG5leHBvcnQgbGV0IHByb2NlZWRCb3VuZHM6IFtWZWN0b3IsIFZlY3Rvcl07XHJcblxyXG5leHBvcnQgbGV0IHJlYWR5Rm9udDogc3RyaW5nO1xyXG5leHBvcnQgbGV0IHJlYWR5Qm91bmRzOiBbVmVjdG9yLCBWZWN0b3JdO1xyXG5cclxuZXhwb3J0IGxldCBjb3VudGRvd25Gb250OiBzdHJpbmc7XHJcbmV4cG9ydCBsZXQgY291bnRkb3duQm91bmRzOiBbVmVjdG9yLCBWZWN0b3JdO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHJlY2FsY3VsYXRlUGFyYW1ldGVycygpIHtcclxuICAgIGNhbnZhcy53aWR0aCA9IHdpbmRvdy5pbm5lcldpZHRoO1xyXG4gICAgY2FudmFzLmhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodCAtIDAuNSAqIHBpeGVsc1BlckNNO1xyXG4gICAgY2FudmFzUmVjdCA9IGNhbnZhcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuXHJcbiAgICBwaXhlbHNQZXJQZXJjZW50ID0gY2FudmFzLmhlaWdodCAvIDEwMDtcclxuICAgIHNwcml0ZVdpZHRoID0gMTIgKiBwaXhlbHNQZXJQZXJjZW50O1xyXG4gICAgc3ByaXRlSGVpZ2h0ID0gMTggKiBwaXhlbHNQZXJQZXJjZW50O1xyXG4gICAgc3ByaXRlR2FwID0gMiAqIHBpeGVsc1BlclBlcmNlbnQ7XHJcbiAgICBzcHJpdGVEZWNrR2FwID0gMC41ICogcGl4ZWxzUGVyUGVyY2VudDtcclxuXHJcbiAgICBzb3J0QnlSYW5rQm91bmRzID0gW25ldyBWZWN0b3IoMCwgMCksIG5ldyBWZWN0b3IoMCwgMCldO1xyXG5cclxuICAgIHNvcnRCeVN1aXRCb3VuZHMgPSBbbmV3IFZlY3RvcigwLCAwKSwgbmV3IFZlY3RvcigwLCAwKV07XHJcblxyXG4gICAgY29uc3QgYXBwcm92ZVBvc2l0aW9uID0gbmV3IFZlY3RvcihjYW52YXMud2lkdGggLSAyICogc3ByaXRlSGVpZ2h0LCBjYW52YXMuaGVpZ2h0IC0gMTEgKiBzcHJpdGVIZWlnaHQgLyAxMik7XHJcbiAgICB3YWl0Rm9udCA9IGAke3Nwcml0ZUhlaWdodCAvIDN9cHggSXJyZWd1bGFyaXNgO1xyXG4gICAgd2FpdEJvdW5kcyA9IFthcHByb3ZlUG9zaXRpb24sIGdldEJvdHRvbVJpZ2h0KCdXYWl0IScsIHdhaXRGb250LCBhcHByb3ZlUG9zaXRpb24pXTtcclxuXHJcbiAgICBjb25zdCBkaXNhcHByb3ZlUG9zaXRpb24gPSBuZXcgVmVjdG9yKGNhbnZhcy53aWR0aCAtIDIgKiBzcHJpdGVIZWlnaHQsIGNhbnZhcy5oZWlnaHQgLSA1ICogc3ByaXRlSGVpZ2h0IC8gMTIpO1xyXG4gICAgcHJvY2VlZEZvbnQgPSBgJHtzcHJpdGVIZWlnaHQgLyAzfXB4IElycmVndWxhcmlzYDtcclxuICAgIHByb2NlZWRCb3VuZHMgPSBbZGlzYXBwcm92ZVBvc2l0aW9uLCBnZXRCb3R0b21SaWdodCgnUHJvY2VlZC4nLCBwcm9jZWVkRm9udCwgZGlzYXBwcm92ZVBvc2l0aW9uKV07XHJcblxyXG4gICAgY29uc3QgcmVhZHlQb3NpdGlvbiA9IG5ldyBWZWN0b3IoY2FudmFzLndpZHRoIC0gMiAqIHNwcml0ZUhlaWdodCwgY2FudmFzLmhlaWdodCAtIDMgKiBzcHJpdGVIZWlnaHQgLyA0KTtcclxuICAgIHJlYWR5Rm9udCA9IGAke3Nwcml0ZUhlaWdodCAvIDJ9cHggSXJyZWd1bGFyaXNgO1xyXG4gICAgcmVhZHlCb3VuZHMgPSBbcmVhZHlQb3NpdGlvbiwgZ2V0Qm90dG9tUmlnaHQoJ1JlYWR5IScsIHJlYWR5Rm9udCwgcmVhZHlQb3NpdGlvbildO1xyXG5cclxuICAgIGNvbnN0IGNvdW50ZG93blBvc2l0aW9uID0gbmV3IFZlY3RvcihjYW52YXMud2lkdGggLSAzLjUgKiBzcHJpdGVIZWlnaHQsIGNhbnZhcy5oZWlnaHQgLSAyICogc3ByaXRlSGVpZ2h0IC8gMyk7XHJcbiAgICBjb3VudGRvd25Gb250ID0gYCR7c3ByaXRlSGVpZ2h0IC8gMn1weCBJcnJlZ3VsYXJpc2A7XHJcbiAgICBjb3VudGRvd25Cb3VuZHMgPSBbY291bnRkb3duUG9zaXRpb24sIGdldEJvdHRvbVJpZ2h0KCdXYWl0aW5nIDEwIHNlY29uZHMuLi4nLCBjb3VudGRvd25Gb250LCBjb3VudGRvd25Qb3NpdGlvbildO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRCb3R0b21SaWdodCh0ZXh0OiBzdHJpbmcsIGZvbnQ6IHN0cmluZywgcG9zaXRpb246IFZlY3Rvcik6IFZlY3RvciB7XHJcbiAgICBjb250ZXh0LmZvbnQgPSBmb250O1xyXG4gICAgY29udGV4dC50ZXh0QmFzZWxpbmUgPSAndG9wJztcclxuICAgIGNvbnN0IHRleHRNZXRyaWNzID0gY29udGV4dC5tZWFzdXJlVGV4dCh0ZXh0KTtcclxuICAgIHJldHVybiBwb3NpdGlvbi5hZGQobmV3IFZlY3Rvcih0ZXh0TWV0cmljcy53aWR0aCwgdGV4dE1ldHJpY3MuYWN0dWFsQm91bmRpbmdCb3hEZXNjZW50KSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRUcmFuc2Zvcm1Gb3JQbGF5ZXIocmVsYXRpdmVJbmRleDogbnVtYmVyKTogRE9NTWF0cml4IHtcclxuICAgIGNvbnRleHQuc2F2ZSgpO1xyXG4gICAgdHJ5IHtcclxuICAgICAgICBpZiAocmVsYXRpdmVJbmRleCA9PT0gMCkge1xyXG4gICAgICAgICAgICByZXR1cm4gY29udGV4dC5nZXRUcmFuc2Zvcm0oKTtcclxuICAgICAgICB9IGVsc2UgaWYgKHJlbGF0aXZlSW5kZXggPT09IDEpIHtcclxuICAgICAgICAgICAgY29udGV4dC50cmFuc2xhdGUoMCwgKGNhbnZhcy53aWR0aCArIGNhbnZhcy5oZWlnaHQpIC8gMik7XHJcbiAgICAgICAgICAgIGNvbnRleHQucm90YXRlKC1NYXRoLlBJIC8gMik7XHJcbiAgICAgICAgICAgIHJldHVybiBjb250ZXh0LmdldFRyYW5zZm9ybSgpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAocmVsYXRpdmVJbmRleCA9PT0gMikge1xyXG4gICAgICAgICAgICAvLyBubyB0cmFuc2Zvcm1cclxuICAgICAgICAgICAgcmV0dXJuIGNvbnRleHQuZ2V0VHJhbnNmb3JtKCk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChyZWxhdGl2ZUluZGV4ID09PSAzKSB7XHJcbiAgICAgICAgICAgIGNvbnRleHQudHJhbnNsYXRlKGNhbnZhcy53aWR0aCwgKGNhbnZhcy5oZWlnaHQgLSBjYW52YXMud2lkdGgpIC8gMik7XHJcbiAgICAgICAgICAgIGNvbnRleHQucm90YXRlKE1hdGguUEkgLyAyKTtcclxuICAgICAgICAgICAgcmV0dXJuIGNvbnRleHQuZ2V0VHJhbnNmb3JtKCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBpbmRleCBtdXN0IGJlIDAsIDEsIDIsIG9yIDM7IGdvdDogJHtyZWxhdGl2ZUluZGV4fWApO1xyXG4gICAgICAgIH1cclxuICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgY29udGV4dC5yZXN0b3JlKCk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRSZWxhdGl2ZVBsYXllckluZGV4KG90aGVyUGxheWVySW5kZXg6IG51bWJlciwgcGxheWVySW5kZXg6IG51bWJlcikge1xyXG4gICAgbGV0IHJlbGF0aXZlSW5kZXggPSBvdGhlclBsYXllckluZGV4IC0gcGxheWVySW5kZXg7XHJcbiAgICBpZiAocmVsYXRpdmVJbmRleCA+PSAwKSB7XHJcbiAgICAgICAgcmV0dXJuIHJlbGF0aXZlSW5kZXg7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIG90aGVyUGxheWVySW5kZXggLSAocGxheWVySW5kZXggLSA0KTtcclxufSIsImltcG9ydCBiaW5hcnlTZWFyY2ggZnJvbSAnYmluYXJ5LXNlYXJjaCc7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gYmluYXJ5U2VhcmNoTnVtYmVyKGhheXN0YWNrOiBudW1iZXJbXSwgbmVlZGxlOiBudW1iZXIsIGxvdz86IG51bWJlciwgaGlnaD86IG51bWJlcikge1xyXG4gICAgcmV0dXJuIGJpbmFyeVNlYXJjaChoYXlzdGFjaywgbmVlZGxlLCAoYSwgYikgPT4gYSAtIGIsIGxvdywgaGlnaCk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRDb29raWUobmFtZTogc3RyaW5nKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcclxuICAgIGNvbnN0IHBhcnRzID0gYDsgJHtkb2N1bWVudC5jb29raWV9YC5zcGxpdChgOyAke25hbWV9PWApO1xyXG4gICAgaWYgKHBhcnRzLmxlbmd0aCA9PT0gMikge1xyXG4gICAgICAgIHJldHVybiBwYXJ0cy5wb3AoKT8uc3BsaXQoJzsnKS5zaGlmdCgpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0UGFyYW0obmFtZTogc3RyaW5nKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcclxuICAgIHJldHVybiB3aW5kb3cubG9jYXRpb24uc2VhcmNoLnNwbGl0KGAke25hbWV9PWApWzFdPy5zcGxpdChcIiZcIilbMF07XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBkZWxheShtczogbnVtYmVyKSB7XHJcbiAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIG1zKSk7XHJcbn1cclxuXHJcbmV4cG9ydCBlbnVtIFN1aXQge1xyXG4gICAgQ2x1YiwgLy8gMFxyXG4gICAgRGlhbW9uZCxcclxuICAgIEhlYXJ0LFxyXG4gICAgU3BhZGUsXHJcbiAgICBKb2tlciwgLy8gNFxyXG59XHJcblxyXG5leHBvcnQgZW51bSBSYW5rIHtcclxuICAgIFNtYWxsLCAvLyAwXHJcbiAgICBBY2UsXHJcbiAgICBUd28sXHJcbiAgICBUaHJlZSxcclxuICAgIEZvdXIsXHJcbiAgICBGaXZlLFxyXG4gICAgU2l4LFxyXG4gICAgU2V2ZW4sXHJcbiAgICBFaWdodCxcclxuICAgIE5pbmUsXHJcbiAgICBUZW4sXHJcbiAgICBKYWNrLFxyXG4gICAgUXVlZW4sXHJcbiAgICBLaW5nLFxyXG4gICAgQmlnLCAvLyAxNFxyXG59XHJcblxyXG5leHBvcnQgdHlwZSBDYXJkID0gW1N1aXQsIFJhbmtdO1xyXG5cclxuZXhwb3J0IHR5cGUgUGxheWVyU3RhdGUgPSBcIldhaXRcIiB8IFwiUHJvY2VlZFwiIHwgXCJSZWFkeVwiIHwgQWN0aXZlO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBBY3RpdmUge1xyXG4gICAgdHlwZTogXCJBY3RpdmVcIjtcclxuICAgIGFjdGl2ZVRpbWU6IG51bWJlcjtcclxufVxyXG5cclxuZXhwb3J0IGNvbnN0IGFjdGl2ZUNvb2xkb3duID0gMTAwMDA7IC8vbWlsbGlzZWNvbmRzXHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIE90aGVyUGxheWVyIHtcclxuICAgIG5hbWU6IHN0cmluZztcclxuICAgIGNhcmRDb3VudDogbnVtYmVyO1xyXG4gICAgcmV2ZWFsZWRDYXJkczogQ2FyZFtdO1xyXG4gICAgLy9zdGF0ZTogUGxheWVyU3RhdGU7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgR2FtZVN0YXRlIHtcclxuICAgIGRlY2tDb3VudDogbnVtYmVyO1xyXG4gICAgcGxheWVySW5kZXg6IG51bWJlcjtcclxuICAgIHBsYXllckNhcmRzOiBDYXJkW107XHJcbiAgICBwbGF5ZXJTaGFyZUNvdW50OiBudW1iZXI7XHJcbiAgICBwbGF5ZXJSZXZlYWxDb3VudDogbnVtYmVyO1xyXG4gICAgLy9wbGF5ZXJTdGF0ZTogUGxheWVyU3RhdGU7XHJcbiAgICBvdGhlclBsYXllcnM6IE90aGVyUGxheWVyW107XHJcbn1cclxuXHJcbmV4cG9ydCB0eXBlIE1ldGhvZE5hbWUgPVxyXG4gICAgXCJqb2luR2FtZVwiIHxcclxuICAgIFwiZHJhd0NhcmRcIiB8XHJcbiAgICBcInJldHVybkNhcmRzVG9EZWNrXCIgfFxyXG4gICAgXCJyZW9yZGVyQ2FyZHNcIiB8XHJcbiAgICBcIndhaXRcIiB8XHJcbiAgICBcInByb2NlZWRcIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgTWV0aG9kUmVzdWx0IHtcclxuICAgIG1ldGhvZE5hbWU6IE1ldGhvZE5hbWU7XHJcbiAgICBlcnJvckRlc2NyaXB0aW9uPzogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEpvaW5HYW1lTWVzc2FnZSB7XHJcbiAgICBnYW1lSWQ6IHN0cmluZztcclxuICAgIHBsYXllck5hbWU6IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBEcmF3Q2FyZE1lc3NhZ2Uge1xyXG4gICAgZHJhd0NhcmQ6IG51bGw7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgUmV0dXJuQ2FyZHNUb0RlY2tNZXNzYWdlIHtcclxuICAgIGNhcmRzVG9SZXR1cm5Ub0RlY2s6IENhcmRbXTtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBSZW9yZGVyQ2FyZHNNZXNzYWdlIHtcclxuICAgIHJlb3JkZXJlZENhcmRzOiBDYXJkW107XHJcbiAgICBuZXdTaGFyZUNvdW50OiBudW1iZXI7XHJcbiAgICBuZXdSZXZlYWxDb3VudDogbnVtYmVyO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFdhaXRNZXNzYWdlIHtcclxuICAgIHdhaXQ6IG51bGw7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgUHJvY2VlZE1lc3NhZ2Uge1xyXG4gICAgcHJvY2VlZDogbnVsbDtcclxufSJdfQ==
