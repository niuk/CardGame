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
    for (let i = 0; i < 5; ++i) {
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
let previousTouch;
VP.canvas.onmousedown = async (event) => {
    await onDown(event);
};
VP.canvas.ontouchstart = async (event) => {
    const touch = event.touches[0];
    if (touch !== undefined) {
        await onDown(touch);
        previousTouch = touch;
    }
};
async function onDown(event) {
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
            const gameState = State.gameState;
            if (gameState === undefined)
                return;
            // because we render left to right, the rightmost card under the mouse position is what we should return
            const sprites = State.faceSpritesForPlayer[gameState.playerIndex];
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
            for (let i = 0; i < 4; ++i) {
                const otherPlayer = gameState.otherPlayers[i];
                if (otherPlayer !== null && otherPlayer !== undefined) {
                    const transform = VP.getTransformForPlayer(VP.getRelativePlayerIndex(i, gameState.playerIndex));
                    transform.invertSelf();
                    const transformedPosition = transform.transformPoint(mouseDownPosition);
                    for (let j = otherPlayer.shareCount - 1; j >= 0; --j) {
                        const sprite = State.faceSpritesForPlayer[i]?.[j];
                        if (sprite === undefined)
                            throw new Error();
                        if (sprite.position.x < transformedPosition.x && transformedPosition.x < sprite.position.x + VP.spriteWidth &&
                            sprite.position.y < transformedPosition.y && transformedPosition.y < sprite.position.y + VP.spriteHeight) {
                            console.log(`mouse down on ${i}'s card ${j}`);
                            const card = otherPlayer.revealedCards[j];
                            if (card === undefined)
                                throw new Error();
                            exports.action = {
                                type: "TakeFromOtherPlayer",
                                mousePositionToSpritePosition: new vector_1.default(0, 0),
                                otherPlayerIndex: i,
                                cardIndex: j,
                                card
                            };
                            deselect = false;
                            break;
                        }
                    }
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
}
VP.canvas.onmousemove = async (event) => {
    await onMove(event, event);
};
VP.canvas.ontouchmove = async (event) => {
    const touch = event.touches[0];
    if (touch !== undefined) {
        await onMove(touch, {
            movementX: touch.clientX - (previousTouch?.clientX ?? touch.clientX),
            movementY: touch.clientY - (previousTouch?.clientY ?? touch.clientY)
        });
        previousTouch = touch;
    }
};
async function onMove(event, movement) {
    const gameState = State.gameState;
    if (gameState === undefined)
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
        else if (exports.action.type === "TakeFromOtherPlayer" ||
            exports.action.type === "DrawFromDeck" ||
            exports.action.type === "WaitingForNewCard") {
            if (exceededDragThreshold) {
                let promise;
                let sprite;
                if (exports.action.type === "TakeFromOtherPlayer") {
                    promise = State.takeCard(exports.action.otherPlayerIndex, exports.action.cardIndex, exports.action.card);
                    sprite = State.faceSpritesForPlayer[exports.action.otherPlayerIndex]?.[exports.action.cardIndex];
                }
                else if (exports.action.type === "DrawFromDeck") {
                    // card drawing will try to lock the state, so we must attach a callback instead of awaiting
                    promise = State.drawCard();
                    sprite = State.deckSprites[State.deckSprites.length - 1];
                }
                if (promise !== undefined) {
                    if (sprite === undefined)
                        throw new Error();
                    sprite.target = mouseMovePosition.add(exports.action.mousePositionToSpritePosition);
                    exports.action = { ...exports.action, type: "WaitingForNewCard" };
                    promise.then(onCardDrawn(sprite)).catch(_ => {
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
        }
        else if (exports.action.type === "ReturnToDeck" || exports.action.type === "Reorder") {
            drag(gameState, exports.action.cardIndex, exports.action.mousePositionToSpritePosition);
        }
        else if (exports.action.type === "ControlShiftClick" ||
            exports.action.type === "ControlClick" ||
            exports.action.type === "ShiftClick" ||
            exports.action.type === "Click") {
            let i = Lib.binarySearchNumber(State.selectedIndices, exports.action.cardIndex);
            if (exceededDragThreshold) {
                // dragging a non-selected card selects it and only it
                if (i < 0) {
                    State.selectedIndices.splice(0, State.selectedIndices.length, exports.action.cardIndex);
                }
                drag(gameState, exports.action.cardIndex, exports.action.mousePositionToSpritePosition);
            }
            else {
                const sprites = State.faceSpritesForPlayer[gameState.playerIndex];
                if (sprites === undefined)
                    throw new Error();
                if (i < 0) {
                    const sprite = sprites[exports.action.cardIndex];
                    if (sprite === undefined)
                        throw new Error();
                    sprite.target = sprite.target.add(new vector_1.default(movement.movementX, movement.movementY));
                }
                else {
                    for (const j of State.selectedIndices) {
                        const sprite = sprites[j];
                        if (sprite === undefined)
                            throw new Error();
                        sprite.target = sprite.target.add(new vector_1.default(movement.movementX, movement.movementY));
                    }
                }
            }
        }
        else {
            const _ = exports.action;
        }
    }
    finally {
        unlock();
    }
}
;
VP.canvas.onmouseup = async (event) => {
    await onUp();
};
VP.canvas.ontouchend = async (event) => {
    await onUp();
};
async function onUp() {
    const gameState = State.gameState;
    if (gameState === undefined)
        return;
    const unlock = await State.lock();
    try {
        if (exports.action === "None") {
            // do nothing
        }
        else if (exports.action === "SortByRank") {
            await State.sortByRank(gameState);
        }
        else if (exports.action === "SortBySuit") {
            await State.sortBySuit(gameState);
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
            await State.reorderCards(gameState);
        }
        else if (exports.action.type === "ReturnToDeck") {
            previousClickIndex = -1;
            await State.returnCardsToDeck(gameState);
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
        State.setSpriteTargets(gameState);
        exports.action = "None";
    }
    finally {
        unlock();
    }
}
;
function onCardDrawn(deckSprite) {
    return async () => {
        const gameState = State.gameState;
        if (gameState === undefined)
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
                const cardIndex = gameState.playerCards.length - 1;
                State.selectedIndices.splice(0, State.selectedIndices.length);
                State.selectedIndices.push(cardIndex);
                // new card should appear in place of dragged card from deck without animation
                const faceSpriteAtMouseDown = State.faceSpritesForPlayer[gameState.playerIndex]?.[cardIndex];
                if (faceSpriteAtMouseDown === undefined)
                    throw new Error();
                faceSpriteAtMouseDown.target = deckSprite.position;
                faceSpriteAtMouseDown.position = deckSprite.position;
                faceSpriteAtMouseDown.velocity = deckSprite.velocity;
                drag(gameState, cardIndex, exports.action.mousePositionToSpritePosition);
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
    const deckDistance = Math.abs(leftMovingSprite.target.y - (VP.canvas.height / 2 - VP.spriteHeight / 2));
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
    // drag all selected cards as a group around the card under the mouse position
    for (const selectedIndex of State.selectedIndices) {
        const movingSpriteAndCard = movingSpritesAndCards[selectedIndex - splitIndex];
        if (movingSpriteAndCard === undefined)
            throw new Error();
        const [movingSprite, movingCard] = movingSpriteAndCard;
        movingSprite.target = mouseMovePosition
            .add(mousePositionToSpritePosition)
            .add(new vector_1.default((selectedIndex - exports.action.cardIndex) * VP.spriteGap, 0));
        console.log(`rearranged sprite ${selectedIndex}`);
    }
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
    playerNameElement.value = decodeURI(playerNameValue);
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
const frameInterval = 1000 / 10;
async function render(time) {
    if (currentTime === undefined) {
        currentTime = time;
    }
    while (State.gameState === undefined) {
        await Lib.delay(100);
    }
    const deltaTime = time - currentTime;
    if (deltaTime < frameInterval) {
        await Lib.delay(frameInterval - deltaTime);
    }
    else {
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
    }
    window.requestAnimationFrame(render);
}
exports.render = render;
/*
const wiggles = new Map<string, [string, number[], number]>();
const wiggleInterval = 100;
function wiggleText(s: string, x: number, y: number) {
    if (currentTime === undefined) {
        return;
    }

    const lower = s.toLowerCase();
    let wiggle = wiggles.get(lower);
    if (wiggle === undefined) {
        const upper = s.toUpperCase();
        const widths = [];
        for (let i = 0; i < lower.length; ++i) {
            widths.push((
                VP.context.measureText(<string>lower[i]).width +
                VP.context.measureText(<string>upper[i]).width) / 2);
        }

        wiggle = [s, widths, currentTime];
        wiggles.set(lower, wiggle);
    }

    const [ss, ws, t] = wiggle;
    s = "";
    let tt = t;
    for (let i = 0; i < ss.length; ++i) {
        let c = <string>ss[i];
        if (t + wiggleInterval < currentTime) {
            tt = currentTime;
            if (<number>random(1)[0] < 127) {
                c = c.toUpperCase();
            } else {
                c = c.toLowerCase();
            }
        }

        s += c;
        VP.context.fillText(c, x += <number>ws[i], y);
    }

    wiggles.set(lower, [s, ws, tt]);
}
*/
function renderBasics(gameId, playerName) {
    VP.context.fillStyle = '#000000ff';
    VP.context.textAlign = 'left';
    VP.context.font = `${VP.spriteHeight / 4}px Sugarlike`;
    VP.context.fillStyle = 'font-variant-east-asian: full-width';
    VP.context.textBaseline = 'top';
    VP.context.fillText(`Game: ${gameId}`, 0, 1 * VP.pixelsPerPercent);
    VP.context.textBaseline = 'bottom';
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
    if (player === undefined || player === null)
        return;
    const faceSprites = State.faceSpritesForPlayer[playerIndex] ?? [];
    let i = 0;
    for (const faceSprite of faceSprites) {
        if (i < player.shareCount) {
            faceSprite.target = new vector_1.default(VP.canvas.width / 2 + (player.shareCount - i) * VP.spriteGap, VP.spriteHeight + VP.spriteGap);
        }
        else {
            faceSprite.target = new vector_1.default(VP.canvas.width / 2 - VP.spriteWidth - (i - player.shareCount) * VP.spriteGap, VP.spriteHeight);
        }
        faceSprite.animate(deltaTime);
        ++i;
    }
    const backSprites = State.backSpritesForPlayer[playerIndex] ?? [];
    i = 0;
    for (const backSprite of backSprites) {
        backSprite.target = new vector_1.default(VP.canvas.width / 2 - VP.spriteWidth / 2 + (i - backSprites.length / 2) * VP.spriteGap, 0);
        backSprite.animate(deltaTime);
        ++i;
    }
    VP.context.fillStyle = '#000000ff';
    VP.context.font = `${VP.spriteHeight / 2}px Sugarlike`;
    VP.context.textBaseline = "middle";
    VP.context.textAlign = "center";
    VP.context.fillText(player.name, VP.canvas.width / 2, VP.spriteHeight / 2);
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
        VP.context.font = '1.5cm Sugarlike';
        VP.context.fillText('SORT', x + 0.25 * VP.pixelsPerCM, y + 2.25 * VP.pixelsPerCM);

        VP.context.font = '3cm Sugarlike';
        VP.context.fillText('{', x + 3 * VP.pixelsPerCM, y + 2.75 * VP.pixelsPerCM);

        VP.context.font = '1.5cm Sugarlike';
        VP.context.fillText('SUIT', VP.sortBySuitBounds[0].x, VP.sortBySuitBounds[1].y);

        VP.context.font = '1.5cm Sugarlike';
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
const springConstant = 33;
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
        const dragForce = this.velocity.scale(drag);
        const acceleration = springForce.sub(dragForce).scale(1 / mass);
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
exports.proceed = exports.wait = exports.sortByRank = exports.sortBySuit = exports.reorderCards = exports.returnCardsToDeck = exports.drawCard = exports.takeCard = exports.joinGame = exports.setSpriteTargets = exports.faceSpritesForPlayer = exports.backSpritesForPlayer = exports.deckSprites = exports.selectedIndices = exports.gameState = exports.previousGameState = exports.lock = exports.gameId = exports.playerName = void 0;
const await_semaphore_1 = require("await-semaphore");
const Lib = __importStar(require("../lib"));
const CardImages = __importStar(require("./card-images"));
const VP = __importStar(require("./view-params"));
const sprite_1 = __importDefault(require("./sprite"));
const vector_1 = __importDefault(require("./vector"));
const playerNameFromCookie = Lib.getCookie('playerName');
if (playerNameFromCookie === undefined)
    throw new Error('No player name!');
exports.playerName = decodeURI(playerNameFromCookie);
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
            if (faceSprite === undefined) {
                for (let j = 0; j < 4; ++j) {
                    const previousOtherPlayer = previousGameState?.otherPlayers[j];
                    const otherPlayer = gameState.otherPlayers[j];
                    if (previousOtherPlayer === undefined || previousOtherPlayer === null ||
                        otherPlayer === undefined || otherPlayer === null) {
                        continue;
                    }
                    if (previousOtherPlayer.shareCount > otherPlayer.shareCount) {
                        for (let k = 0; k < previousOtherPlayer.shareCount; ++k) {
                            if (JSON.stringify(faceCard) === JSON.stringify(previousOtherPlayer.revealedCards[k])) {
                                --previousOtherPlayer.shareCount;
                                previousOtherPlayer.revealedCards.splice(k, 1);
                                faceSprite = previousFaceSpritesForPlayer[j]?.splice(k, 1)[0];
                                if (faceSprite === undefined)
                                    throw new Error();
                                const sourceTransform = VP.getTransformForPlayer(VP.getRelativePlayerIndex(j, gameState.playerIndex));
                                const destinationTransform = VP.getTransformForPlayer(VP.getRelativePlayerIndex(i, gameState.playerIndex));
                                destinationTransform.invertSelf();
                                let p = sourceTransform.transformPoint(faceSprite.position);
                                p = destinationTransform.transformPoint(p);
                                faceSprite.position = new vector_1.default(p.x, p.y);
                                break;
                            }
                        }
                    }
                    if (faceSprite !== undefined) {
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
                const faceSprite = previousDeckSprites.splice(previousDeckSprites.length - 1, 1)[0];
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
    }
    for (let i = 0; i < 4; ++i) {
        const previousBackSprites = previousBackSpritesForPlayer[i] ?? [];
        previousBackSpritesForPlayer[i] = previousBackSprites;
        const previousFaceSprites = previousFaceSpritesForPlayer[i] ?? [];
        previousFaceSpritesForPlayer[i] = previousFaceSprites;
        let backSprites = [];
        exports.backSpritesForPlayer[i] = backSprites;
        const otherPlayer = gameState.otherPlayers[i];
        if (i !== gameState.playerIndex && otherPlayer !== null && otherPlayer !== undefined) {
            // only other players have any hidden cards
            while (backSprites.length < otherPlayer.cardCount - otherPlayer.revealedCards.length) {
                let backSprite = undefined;
                if (backSprite === undefined) {
                    for (let j = 0; j < 4; ++j) {
                        const previousOtherPlayer = previousGameState?.otherPlayers[j];
                        const otherPlayer = gameState.otherPlayers[j];
                        if (previousOtherPlayer === undefined || previousOtherPlayer === null ||
                            otherPlayer === undefined || otherPlayer === null) {
                            continue;
                        }
                        if (previousOtherPlayer.shareCount > otherPlayer.shareCount) {
                            previousOtherPlayer.shareCount--;
                            previousOtherPlayer.revealedCards.splice(0, 1);
                            backSprite = previousFaceSpritesForPlayer[j]?.splice(0, 1)[0];
                            if (backSprite === undefined)
                                throw new Error();
                            backSprite.image = CardImages.get(`Back${i}`);
                            const sourceTransform = VP.getTransformForPlayer(VP.getRelativePlayerIndex(j, gameState.playerIndex));
                            const destinationTransform = VP.getTransformForPlayer(VP.getRelativePlayerIndex(i, gameState.playerIndex));
                            let p = sourceTransform.transformPoint(backSprite.position);
                            p = destinationTransform.transformPoint(p);
                            backSprite.position = new vector_1.default(p.x, p.y);
                            break;
                        }
                    }
                }
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
                    backSprite = previousDeckSprites.splice(previousDeckSprites.length - 1, 1)[0];
                    if (backSprite === undefined)
                        throw new Error();
                    backSprite.image = CardImages.get(`Back${i}`);
                    // this sprite comes from the deck, which is rendered in the client player's transform
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
                    deckSprite.image = CardImages.get('Back4');
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
                    deckSprite.image = CardImages.get('Back4');
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
            deckSprite = new sprite_1.default(CardImages.get('Back4'));
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
            reservedSprite.target = new vector_1.default(VP.canvas.width / 2 - VP.spriteWidth - shareCount * VP.spriteGap + cards.length * VP.spriteGap, VP.canvas.height - 2 * VP.spriteHeight - VP.spriteGap);
        }
        else if (cards.length < revealCount) {
            reservedSprite.target = new vector_1.default(VP.canvas.width / 2 + (cards.length - shareCount) * VP.spriteGap, VP.canvas.height - 2 * VP.spriteHeight);
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
async function takeCard(otherPlayerIndex, cardIndex, card) {
    const animationsAssociated = new Promise(resolve => {
        onAnimationsAssociated = () => {
            console.log(`associated animations`);
            onAnimationsAssociated = () => { };
            resolve();
        };
    });
    await new Promise((resolve, reject) => {
        addCallback('takeCard', resolve, reject);
        ws.send(JSON.stringify({
            otherPlayerIndex,
            cardIndex,
            card
        }));
    });
    await animationsAssociated;
}
exports.takeCard = takeCard;
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
    exports.waitFont = `${exports.spriteHeight / 3}px Sugarlike`;
    exports.waitBounds = [approvePosition, getBottomRight('Wait!', exports.waitFont, approvePosition)];
    const disapprovePosition = new vector_1.default(exports.canvas.width - 2 * exports.spriteHeight, exports.canvas.height - 5 * exports.spriteHeight / 12);
    exports.proceedFont = `${exports.spriteHeight / 3}px Sugarlike`;
    exports.proceedBounds = [disapprovePosition, getBottomRight('Proceed.', exports.proceedFont, disapprovePosition)];
    const readyPosition = new vector_1.default(exports.canvas.width - 2 * exports.spriteHeight, exports.canvas.height - 3 * exports.spriteHeight / 4);
    exports.readyFont = `${exports.spriteHeight / 2}px Sugarlike`;
    exports.readyBounds = [readyPosition, getBottomRight('Ready!', exports.readyFont, readyPosition)];
    const countdownPosition = new vector_1.default(exports.canvas.width - 3.5 * exports.spriteHeight, exports.canvas.height - 2 * exports.spriteHeight / 3);
    exports.countdownFont = `${exports.spriteHeight / 2}px Sugarlike`;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYXdhaXQtc2VtYXBob3JlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2JpbmFyeS1zZWFyY2gvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL3RpbWVycy1icm93c2VyaWZ5L21haW4uanMiLCJzcmMvY2xpZW50L2NhcmQtaW1hZ2VzLnRzIiwic3JjL2NsaWVudC9nYW1lLnRzIiwic3JjL2NsaWVudC9pbnB1dC50cyIsInNyYy9jbGllbnQvbG9iYnkudHMiLCJzcmMvY2xpZW50L3JlbmRlci50cyIsInNyYy9jbGllbnQvc3ByaXRlLnRzIiwic3JjL2NsaWVudC9zdGF0ZS50cyIsInNyYy9jbGllbnQvdmVjdG9yLnRzIiwic3JjL2NsaWVudC92aWV3LXBhcmFtcy50cyIsInNyYy9saWIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUN4TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FDM0VBLDRDQUE4QjtBQUU5QixNQUFNLEtBQUssR0FBRyxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQztBQUM5RCxNQUFNLEtBQUssR0FBRyxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFFakcsTUFBTSxVQUFVLEdBQUcsSUFBSSxHQUFHLEVBQTRCLENBQUM7QUFFaEQsS0FBSyxVQUFVLElBQUk7SUFDdEIsa0NBQWtDO0lBQ2xDLEtB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TyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDM0QsQ0FBQztBQUZELHNCQUVDO0FBRUQsSUFBWSxJQU1YO0FBTkQsV0FBWSxJQUFJO0lBQ1osK0JBQUksQ0FBQTtJQUNKLHFDQUFPLENBQUE7SUFDUCxpQ0FBSyxDQUFBO0lBQ0wsaUNBQUssQ0FBQTtJQUNMLGlDQUFLLENBQUE7QUFDVCxDQUFDLEVBTlcsSUFBSSxHQUFKLFlBQUksS0FBSixZQUFJLFFBTWY7QUFFRCxJQUFZLElBZ0JYO0FBaEJELFdBQVksSUFBSTtJQUNaLGlDQUFLLENBQUE7SUFDTCw2QkFBRyxDQUFBO0lBQ0gsNkJBQUcsQ0FBQTtJQUNILGlDQUFLLENBQUE7SUFDTCwrQkFBSSxDQUFBO0lBQ0osK0JBQUksQ0FBQTtJQUNKLDZCQUFHLENBQUE7SUFDSCxpQ0FBSyxDQUFBO0lBQ0wsaUNBQUssQ0FBQTtJQUNMLCtCQUFJLENBQUE7SUFDSiw4QkFBRyxDQUFBO0lBQ0gsZ0NBQUksQ0FBQTtJQUNKLGtDQUFLLENBQUE7SUFDTCxnQ0FBSSxDQUFBO0lBQ0osOEJBQUcsQ0FBQTtBQUNQLENBQUMsRUFoQlcsSUFBSSxHQUFKLFlBQUksS0FBSixZQUFJLFFBZ0JmO0FBV1ksUUFBQSxjQUFjLEdBQUcsS0FBSyxDQUFDLENBQUMsY0FBYyIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIlwidXNlIHN0cmljdFwiO1xuY2xhc3MgU2VtYXBob3JlIHtcbiAgICBjb25zdHJ1Y3Rvcihjb3VudCkge1xuICAgICAgICB0aGlzLnRhc2tzID0gW107XG4gICAgICAgIHRoaXMuY291bnQgPSBjb3VudDtcbiAgICB9XG4gICAgc2NoZWQoKSB7XG4gICAgICAgIGlmICh0aGlzLmNvdW50ID4gMCAmJiB0aGlzLnRhc2tzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHRoaXMuY291bnQtLTtcbiAgICAgICAgICAgIGxldCBuZXh0ID0gdGhpcy50YXNrcy5zaGlmdCgpO1xuICAgICAgICAgICAgaWYgKG5leHQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHRocm93IFwiVW5leHBlY3RlZCB1bmRlZmluZWQgdmFsdWUgaW4gdGFza3MgbGlzdFwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGFjcXVpcmUoKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzLCByZWopID0+IHtcbiAgICAgICAgICAgIHZhciB0YXNrID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIHZhciByZWxlYXNlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHJlcygoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghcmVsZWFzZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbGVhc2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY291bnQrKztcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2NoZWQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHRoaXMudGFza3MucHVzaCh0YXNrKTtcbiAgICAgICAgICAgIGlmIChwcm9jZXNzICYmIHByb2Nlc3MubmV4dFRpY2spIHtcbiAgICAgICAgICAgICAgICBwcm9jZXNzLm5leHRUaWNrKHRoaXMuc2NoZWQuYmluZCh0aGlzKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBzZXRJbW1lZGlhdGUodGhpcy5zY2hlZC5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHVzZShmKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmFjcXVpcmUoKVxuICAgICAgICAgICAgLnRoZW4ocmVsZWFzZSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gZigpXG4gICAgICAgICAgICAgICAgLnRoZW4oKHJlcykgPT4ge1xuICAgICAgICAgICAgICAgIHJlbGVhc2UoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgICAgICAgIHJlbGVhc2UoKTtcbiAgICAgICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxufVxuZXhwb3J0cy5TZW1hcGhvcmUgPSBTZW1hcGhvcmU7XG5jbGFzcyBNdXRleCBleHRlbmRzIFNlbWFwaG9yZSB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKDEpO1xuICAgIH1cbn1cbmV4cG9ydHMuTXV0ZXggPSBNdXRleDtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWluZGV4LmpzLm1hcCIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oaGF5c3RhY2ssIG5lZWRsZSwgY29tcGFyYXRvciwgbG93LCBoaWdoKSB7XG4gIHZhciBtaWQsIGNtcDtcblxuICBpZihsb3cgPT09IHVuZGVmaW5lZClcbiAgICBsb3cgPSAwO1xuXG4gIGVsc2Uge1xuICAgIGxvdyA9IGxvd3wwO1xuICAgIGlmKGxvdyA8IDAgfHwgbG93ID49IGhheXN0YWNrLmxlbmd0aClcbiAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKFwiaW52YWxpZCBsb3dlciBib3VuZFwiKTtcbiAgfVxuXG4gIGlmKGhpZ2ggPT09IHVuZGVmaW5lZClcbiAgICBoaWdoID0gaGF5c3RhY2subGVuZ3RoIC0gMTtcblxuICBlbHNlIHtcbiAgICBoaWdoID0gaGlnaHwwO1xuICAgIGlmKGhpZ2ggPCBsb3cgfHwgaGlnaCA+PSBoYXlzdGFjay5sZW5ndGgpXG4gICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcihcImludmFsaWQgdXBwZXIgYm91bmRcIik7XG4gIH1cblxuICB3aGlsZShsb3cgPD0gaGlnaCkge1xuICAgIC8vIFRoZSBuYWl2ZSBgbG93ICsgaGlnaCA+Pj4gMWAgY291bGQgZmFpbCBmb3IgYXJyYXkgbGVuZ3RocyA+IDIqKjMxXG4gICAgLy8gYmVjYXVzZSBgPj4+YCBjb252ZXJ0cyBpdHMgb3BlcmFuZHMgdG8gaW50MzIuIGBsb3cgKyAoaGlnaCAtIGxvdyA+Pj4gMSlgXG4gICAgLy8gd29ya3MgZm9yIGFycmF5IGxlbmd0aHMgPD0gMioqMzItMSB3aGljaCBpcyBhbHNvIEphdmFzY3JpcHQncyBtYXggYXJyYXlcbiAgICAvLyBsZW5ndGguXG4gICAgbWlkID0gbG93ICsgKChoaWdoIC0gbG93KSA+Pj4gMSk7XG4gICAgY21wID0gK2NvbXBhcmF0b3IoaGF5c3RhY2tbbWlkXSwgbmVlZGxlLCBtaWQsIGhheXN0YWNrKTtcblxuICAgIC8vIFRvbyBsb3cuXG4gICAgaWYoY21wIDwgMC4wKVxuICAgICAgbG93ICA9IG1pZCArIDE7XG5cbiAgICAvLyBUb28gaGlnaC5cbiAgICBlbHNlIGlmKGNtcCA+IDAuMClcbiAgICAgIGhpZ2ggPSBtaWQgLSAxO1xuXG4gICAgLy8gS2V5IGZvdW5kLlxuICAgIGVsc2VcbiAgICAgIHJldHVybiBtaWQ7XG4gIH1cblxuICAvLyBLZXkgbm90IGZvdW5kLlxuICByZXR1cm4gfmxvdztcbn1cbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG4vLyBjYWNoZWQgZnJvbSB3aGF0ZXZlciBnbG9iYWwgaXMgcHJlc2VudCBzbyB0aGF0IHRlc3QgcnVubmVycyB0aGF0IHN0dWIgaXRcbi8vIGRvbid0IGJyZWFrIHRoaW5ncy4gIEJ1dCB3ZSBuZWVkIHRvIHdyYXAgaXQgaW4gYSB0cnkgY2F0Y2ggaW4gY2FzZSBpdCBpc1xuLy8gd3JhcHBlZCBpbiBzdHJpY3QgbW9kZSBjb2RlIHdoaWNoIGRvZXNuJ3QgZGVmaW5lIGFueSBnbG9iYWxzLiAgSXQncyBpbnNpZGUgYVxuLy8gZnVuY3Rpb24gYmVjYXVzZSB0cnkvY2F0Y2hlcyBkZW9wdGltaXplIGluIGNlcnRhaW4gZW5naW5lcy5cblxudmFyIGNhY2hlZFNldFRpbWVvdXQ7XG52YXIgY2FjaGVkQ2xlYXJUaW1lb3V0O1xuXG5mdW5jdGlvbiBkZWZhdWx0U2V0VGltb3V0KCkge1xuICAgIHRocm93IG5ldyBFcnJvcignc2V0VGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuZnVuY3Rpb24gZGVmYXVsdENsZWFyVGltZW91dCAoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdjbGVhclRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbihmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBzZXRUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBjbGVhclRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgfVxufSAoKSlcbmZ1bmN0aW9uIHJ1blRpbWVvdXQoZnVuKSB7XG4gICAgaWYgKGNhY2hlZFNldFRpbWVvdXQgPT09IHNldFRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIC8vIGlmIHNldFRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRTZXRUaW1lb3V0ID09PSBkZWZhdWx0U2V0VGltb3V0IHx8ICFjYWNoZWRTZXRUaW1lb3V0KSAmJiBzZXRUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfSBjYXRjaChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbChudWxsLCBmdW4sIDApO1xuICAgICAgICB9IGNhdGNoKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3JcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwodGhpcywgZnVuLCAwKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG59XG5mdW5jdGlvbiBydW5DbGVhclRpbWVvdXQobWFya2VyKSB7XG4gICAgaWYgKGNhY2hlZENsZWFyVGltZW91dCA9PT0gY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIC8vIGlmIGNsZWFyVGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZENsZWFyVGltZW91dCA9PT0gZGVmYXVsdENsZWFyVGltZW91dCB8fCAhY2FjaGVkQ2xlYXJUaW1lb3V0KSAmJiBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0ICB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKG51bGwsIG1hcmtlcik7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3IuXG4gICAgICAgICAgICAvLyBTb21lIHZlcnNpb25zIG9mIEkuRS4gaGF2ZSBkaWZmZXJlbnQgcnVsZXMgZm9yIGNsZWFyVGltZW91dCB2cyBzZXRUaW1lb3V0XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwodGhpcywgbWFya2VyKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG5cbn1cbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGlmICghZHJhaW5pbmcgfHwgIWN1cnJlbnRRdWV1ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHJ1blRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRRdWV1ZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIHJ1bkNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHJ1blRpbWVvdXQoZHJhaW5RdWV1ZSk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZE9uY2VMaXN0ZW5lciA9IG5vb3A7XG5cbnByb2Nlc3MubGlzdGVuZXJzID0gZnVuY3Rpb24gKG5hbWUpIHsgcmV0dXJuIFtdIH1cblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iLCJ2YXIgbmV4dFRpY2sgPSByZXF1aXJlKCdwcm9jZXNzL2Jyb3dzZXIuanMnKS5uZXh0VGljaztcbnZhciBhcHBseSA9IEZ1bmN0aW9uLnByb3RvdHlwZS5hcHBseTtcbnZhciBzbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcbnZhciBpbW1lZGlhdGVJZHMgPSB7fTtcbnZhciBuZXh0SW1tZWRpYXRlSWQgPSAwO1xuXG4vLyBET00gQVBJcywgZm9yIGNvbXBsZXRlbmVzc1xuXG5leHBvcnRzLnNldFRpbWVvdXQgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIG5ldyBUaW1lb3V0KGFwcGx5LmNhbGwoc2V0VGltZW91dCwgd2luZG93LCBhcmd1bWVudHMpLCBjbGVhclRpbWVvdXQpO1xufTtcbmV4cG9ydHMuc2V0SW50ZXJ2YWwgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIG5ldyBUaW1lb3V0KGFwcGx5LmNhbGwoc2V0SW50ZXJ2YWwsIHdpbmRvdywgYXJndW1lbnRzKSwgY2xlYXJJbnRlcnZhbCk7XG59O1xuZXhwb3J0cy5jbGVhclRpbWVvdXQgPVxuZXhwb3J0cy5jbGVhckludGVydmFsID0gZnVuY3Rpb24odGltZW91dCkgeyB0aW1lb3V0LmNsb3NlKCk7IH07XG5cbmZ1bmN0aW9uIFRpbWVvdXQoaWQsIGNsZWFyRm4pIHtcbiAgdGhpcy5faWQgPSBpZDtcbiAgdGhpcy5fY2xlYXJGbiA9IGNsZWFyRm47XG59XG5UaW1lb3V0LnByb3RvdHlwZS51bnJlZiA9IFRpbWVvdXQucHJvdG90eXBlLnJlZiA9IGZ1bmN0aW9uKCkge307XG5UaW1lb3V0LnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLl9jbGVhckZuLmNhbGwod2luZG93LCB0aGlzLl9pZCk7XG59O1xuXG4vLyBEb2VzIG5vdCBzdGFydCB0aGUgdGltZSwganVzdCBzZXRzIHVwIHRoZSBtZW1iZXJzIG5lZWRlZC5cbmV4cG9ydHMuZW5yb2xsID0gZnVuY3Rpb24oaXRlbSwgbXNlY3MpIHtcbiAgY2xlYXJUaW1lb3V0KGl0ZW0uX2lkbGVUaW1lb3V0SWQpO1xuICBpdGVtLl9pZGxlVGltZW91dCA9IG1zZWNzO1xufTtcblxuZXhwb3J0cy51bmVucm9sbCA9IGZ1bmN0aW9uKGl0ZW0pIHtcbiAgY2xlYXJUaW1lb3V0KGl0ZW0uX2lkbGVUaW1lb3V0SWQpO1xuICBpdGVtLl9pZGxlVGltZW91dCA9IC0xO1xufTtcblxuZXhwb3J0cy5fdW5yZWZBY3RpdmUgPSBleHBvcnRzLmFjdGl2ZSA9IGZ1bmN0aW9uKGl0ZW0pIHtcbiAgY2xlYXJUaW1lb3V0KGl0ZW0uX2lkbGVUaW1lb3V0SWQpO1xuXG4gIHZhciBtc2VjcyA9IGl0ZW0uX2lkbGVUaW1lb3V0O1xuICBpZiAobXNlY3MgPj0gMCkge1xuICAgIGl0ZW0uX2lkbGVUaW1lb3V0SWQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uIG9uVGltZW91dCgpIHtcbiAgICAgIGlmIChpdGVtLl9vblRpbWVvdXQpXG4gICAgICAgIGl0ZW0uX29uVGltZW91dCgpO1xuICAgIH0sIG1zZWNzKTtcbiAgfVxufTtcblxuLy8gVGhhdCdzIG5vdCBob3cgbm9kZS5qcyBpbXBsZW1lbnRzIGl0IGJ1dCB0aGUgZXhwb3NlZCBhcGkgaXMgdGhlIHNhbWUuXG5leHBvcnRzLnNldEltbWVkaWF0ZSA9IHR5cGVvZiBzZXRJbW1lZGlhdGUgPT09IFwiZnVuY3Rpb25cIiA/IHNldEltbWVkaWF0ZSA6IGZ1bmN0aW9uKGZuKSB7XG4gIHZhciBpZCA9IG5leHRJbW1lZGlhdGVJZCsrO1xuICB2YXIgYXJncyA9IGFyZ3VtZW50cy5sZW5ndGggPCAyID8gZmFsc2UgOiBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG5cbiAgaW1tZWRpYXRlSWRzW2lkXSA9IHRydWU7XG5cbiAgbmV4dFRpY2soZnVuY3Rpb24gb25OZXh0VGljaygpIHtcbiAgICBpZiAoaW1tZWRpYXRlSWRzW2lkXSkge1xuICAgICAgLy8gZm4uY2FsbCgpIGlzIGZhc3RlciBzbyB3ZSBvcHRpbWl6ZSBmb3IgdGhlIGNvbW1vbiB1c2UtY2FzZVxuICAgICAgLy8gQHNlZSBodHRwOi8vanNwZXJmLmNvbS9jYWxsLWFwcGx5LXNlZ3VcbiAgICAgIGlmIChhcmdzKSB7XG4gICAgICAgIGZuLmFwcGx5KG51bGwsIGFyZ3MpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm4uY2FsbChudWxsKTtcbiAgICAgIH1cbiAgICAgIC8vIFByZXZlbnQgaWRzIGZyb20gbGVha2luZ1xuICAgICAgZXhwb3J0cy5jbGVhckltbWVkaWF0ZShpZCk7XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gaWQ7XG59O1xuXG5leHBvcnRzLmNsZWFySW1tZWRpYXRlID0gdHlwZW9mIGNsZWFySW1tZWRpYXRlID09PSBcImZ1bmN0aW9uXCIgPyBjbGVhckltbWVkaWF0ZSA6IGZ1bmN0aW9uKGlkKSB7XG4gIGRlbGV0ZSBpbW1lZGlhdGVJZHNbaWRdO1xufTsiLCJpbXBvcnQgKiBhcyBMaWIgZnJvbSAnLi4vbGliJztcclxuXHJcbmNvbnN0IHN1aXRzID0gWydDbHVicycsICdEbW5kcycsICdIZWFydHMnLCAnU3BhZGVzJywgJ0pva2VyJ107XHJcbmNvbnN0IHJhbmtzID0gWydTbWFsbCcsICdBJywgJzInLCAnMycsICc0JywgJzUnLCAnNicsICc3JywgJzgnLCAnOScsICcxMCcsICdKJywgJ1EnLCAnSycsICdCaWcnXTtcclxuXHJcbmNvbnN0IGNhcmRJbWFnZXMgPSBuZXcgTWFwPHN0cmluZywgSFRNTEltYWdlRWxlbWVudD4oKTtcclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBsb2FkKCkge1xyXG4gICAgLy8gbG9hZCBjYXJkIGltYWdlcyBhc3luY2hyb25vdXNseVxyXG4gICAgZm9yIChsZXQgc3VpdCA9IDA7IHN1aXQgPD0gNDsgKytzdWl0KSB7XHJcbiAgICAgICAgZm9yIChsZXQgcmFuayA9IDA7IHJhbmsgPD0gMTQ7ICsrcmFuaykge1xyXG4gICAgICAgICAgICBpZiAoc3VpdCA9PT0gTGliLlN1aXQuSm9rZXIpIHtcclxuICAgICAgICAgICAgICAgIGlmICgwIDwgcmFuayAmJiByYW5rIDwgMTQpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGlmIChyYW5rIDwgMSB8fCAxMyA8IHJhbmspIHtcclxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgaW1hZ2UgPSBuZXcgSW1hZ2UoKTtcclxuICAgICAgICAgICAgaW1hZ2Uuc3JjID0gYFBhcGVyQ2FyZHMvJHtzdWl0c1tzdWl0XX0vJHtyYW5rc1tyYW5rXX1vZiR7c3VpdHNbc3VpdF19LnBuZ2A7XHJcbiAgICAgICAgICAgIGltYWdlLm9ubG9hZCA9ICgpID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBsb2FkZWQgJyR7aW1hZ2Uuc3JjfSdgKTtcclxuICAgICAgICAgICAgICAgIGNhcmRJbWFnZXMuc2V0KEpTT04uc3RyaW5naWZ5KFtzdWl0LCByYW5rXSksIGltYWdlKTtcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCA1OyArK2kpIHtcclxuICAgICAgICBjb25zdCBpbWFnZSA9IG5ldyBJbWFnZSgpO1xyXG4gICAgICAgIGltYWdlLnNyYyA9IGBQYXBlckNhcmRzL0NhcmRCYWNrJHtpfS5wbmdgO1xyXG4gICAgICAgIGltYWdlLm9ubG9hZCA9ICgpID0+IHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coYGxvYWRlZCAnJHtpbWFnZS5zcmN9J2ApO1xyXG4gICAgICAgICAgICBjYXJkSW1hZ2VzLnNldChgQmFjayR7aX1gLCBpbWFnZSk7XHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBibGFua0ltYWdlID0gbmV3IEltYWdlKCk7XHJcbiAgICBibGFua0ltYWdlLnNyYyA9ICdQYXBlckNhcmRzL0JsYW5rIENhcmQucG5nJztcclxuICAgIGJsYW5rSW1hZ2Uub25sb2FkID0gKCkgPT4ge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGBsb2FkZWQgJyR7YmxhbmtJbWFnZS5zcmN9J2ApO1xyXG4gICAgICAgIGNhcmRJbWFnZXMuc2V0KCdCbGFuaycsIGJsYW5rSW1hZ2UpO1xyXG4gICAgfTtcclxuXHJcbiAgICB3aGlsZSAoY2FyZEltYWdlcy5zaXplIDwgNCAqIDEzICsgNykge1xyXG4gICAgICAgIGF3YWl0IExpYi5kZWxheSgxMCk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc29sZS5sb2coJ2FsbCBjYXJkIGltYWdlcyBsb2FkZWQnKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldChzdHJpbmdGcm9tQ2FyZDogc3RyaW5nKTogSFRNTEltYWdlRWxlbWVudCB7XHJcbiAgICBjb25zdCBpbWFnZSA9IGNhcmRJbWFnZXMuZ2V0KHN0cmluZ0Zyb21DYXJkKTtcclxuICAgIGlmIChpbWFnZSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBjb3VsZG4ndCBmaW5kIGltYWdlOiAke3N0cmluZ0Zyb21DYXJkfWApO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBpbWFnZTtcclxufVxyXG4iLCJpbXBvcnQgKiBhcyBMaWIgZnJvbSAnLi4vbGliJztcclxuaW1wb3J0ICogYXMgU3RhdGUgZnJvbSAnLi9zdGF0ZSc7XHJcbmltcG9ydCAqIGFzIFZQIGZyb20gJy4vdmlldy1wYXJhbXMnO1xyXG5pbXBvcnQgKiBhcyBDYXJkSW1hZ2VzIGZyb20gJy4vY2FyZC1pbWFnZXMnO1xyXG5pbXBvcnQgKiBhcyBSZW5kZXIgZnJvbSAnLi9yZW5kZXInO1xyXG5cclxuLy8gcmVmcmVzaGluZyBzaG91bGQgcmVqb2luIHRoZSBzYW1lIGdhbWVcclxud2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKHVuZGVmaW5lZCwgU3RhdGUuZ2FtZUlkLCBgL2dhbWU/Z2FtZUlkPSR7U3RhdGUuZ2FtZUlkfSZwbGF5ZXJOYW1lPSR7U3RhdGUucGxheWVyTmFtZX1gKTtcclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGluaXQoKSB7XHJcbiAgICBWUC5yZWNhbGN1bGF0ZVBhcmFtZXRlcnMoKTtcclxuXHJcbiAgICAvLyBpbml0aWFsaXplIGlucHV0XHJcbiAgICB3aGlsZSAoU3RhdGUuZ2FtZVN0YXRlID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICBhd2FpdCBMaWIuZGVsYXkoMTAwKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCB1bmxvY2sgPSBhd2FpdCBTdGF0ZS5sb2NrKCk7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIFN0YXRlLnNldFNwcml0ZVRhcmdldHMoU3RhdGUuZ2FtZVN0YXRlKTtcclxuICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgdW5sb2NrKCk7XHJcbiAgICB9XHJcbn1cclxuXHJcbndpbmRvdy5vbnJlc2l6ZSA9IGluaXQ7XHJcblxyXG53aW5kb3cub25zY3JvbGwgPSBpbml0O1xyXG5cclxuKDxhbnk+d2luZG93KS5nYW1lID0gYXN5bmMgZnVuY3Rpb24gZ2FtZSgpIHtcclxuICAgIGNvbnN0IGpvaW5Qcm9taXNlID0gU3RhdGUuam9pbkdhbWUoU3RhdGUuZ2FtZUlkLCBTdGF0ZS5wbGF5ZXJOYW1lKTtcclxuICAgIGF3YWl0IENhcmRJbWFnZXMubG9hZCgpOyAvLyBjb25jdXJyZW50bHlcclxuICAgIGF3YWl0IGpvaW5Qcm9taXNlO1xyXG4gICAgXHJcbiAgICAvLyByZW5kZXJpbmcgbXVzdCBiZSBzeW5jaHJvbm91cywgb3IgZWxzZSBpdCBmbGlja2Vyc1xyXG4gICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShSZW5kZXIucmVuZGVyKTtcclxuXHJcbiAgICBhd2FpdCBpbml0KCk7XHJcbn07IiwiaW1wb3J0ICogYXMgTGliIGZyb20gJy4uL2xpYic7XHJcbmltcG9ydCAqIGFzIFN0YXRlIGZyb20gJy4vc3RhdGUnO1xyXG5pbXBvcnQgKiBhcyBWUCBmcm9tICcuL3ZpZXctcGFyYW1zJztcclxuaW1wb3J0IFZlY3RvciBmcm9tICcuL3ZlY3Rvcic7XHJcbmltcG9ydCBTcHJpdGUgZnJvbSAnLi9zcHJpdGUnO1xyXG5cclxuaW50ZXJmYWNlIFRha2VGcm9tT3RoZXJQbGF5ZXIge1xyXG4gICAgdHlwZTogXCJUYWtlRnJvbU90aGVyUGxheWVyXCI7XHJcbiAgICBtb3VzZVBvc2l0aW9uVG9TcHJpdGVQb3NpdGlvbjogVmVjdG9yO1xyXG4gICAgb3RoZXJQbGF5ZXJJbmRleDogbnVtYmVyO1xyXG4gICAgY2FyZEluZGV4OiBudW1iZXI7XHJcbiAgICBjYXJkOiBMaWIuQ2FyZDtcclxufVxyXG5cclxuaW50ZXJmYWNlIERyYXdGcm9tRGVjayB7XHJcbiAgICB0eXBlOiBcIkRyYXdGcm9tRGVja1wiO1xyXG4gICAgbW91c2VQb3NpdGlvblRvU3ByaXRlUG9zaXRpb246IFZlY3RvcjtcclxufVxyXG5cclxuaW50ZXJmYWNlIFdhaXRpbmdGb3JOZXdDYXJkIHtcclxuICAgIHR5cGU6IFwiV2FpdGluZ0Zvck5ld0NhcmRcIjtcclxuICAgIG1vdXNlUG9zaXRpb25Ub1Nwcml0ZVBvc2l0aW9uOiBWZWN0b3I7XHJcbn1cclxuXHJcbmludGVyZmFjZSBSZXR1cm5Ub0RlY2sge1xyXG4gICAgdHlwZTogXCJSZXR1cm5Ub0RlY2tcIjtcclxuICAgIGNhcmRJbmRleDogbnVtYmVyO1xyXG4gICAgbW91c2VQb3NpdGlvblRvU3ByaXRlUG9zaXRpb246IFZlY3RvcjtcclxufVxyXG5cclxuaW50ZXJmYWNlIFJlb3JkZXIge1xyXG4gICAgdHlwZTogXCJSZW9yZGVyXCI7XHJcbiAgICBjYXJkSW5kZXg6IG51bWJlcjtcclxuICAgIG1vdXNlUG9zaXRpb25Ub1Nwcml0ZVBvc2l0aW9uOiBWZWN0b3I7XHJcbn1cclxuXHJcbmludGVyZmFjZSBDb250cm9sU2hpZnRDbGljayB7XHJcbiAgICB0eXBlOiBcIkNvbnRyb2xTaGlmdENsaWNrXCI7XHJcbiAgICBjYXJkSW5kZXg6IG51bWJlcjtcclxuICAgIG1vdXNlUG9zaXRpb25Ub1Nwcml0ZVBvc2l0aW9uOiBWZWN0b3I7XHJcbn1cclxuXHJcbmludGVyZmFjZSBDb250cm9sQ2xpY2sge1xyXG4gICAgdHlwZTogXCJDb250cm9sQ2xpY2tcIjtcclxuICAgIGNhcmRJbmRleDogbnVtYmVyO1xyXG4gICAgbW91c2VQb3NpdGlvblRvU3ByaXRlUG9zaXRpb246IFZlY3RvcjtcclxufVxyXG5cclxuaW50ZXJmYWNlIFNoaWZ0Q2xpY2sge1xyXG4gICAgdHlwZTogXCJTaGlmdENsaWNrXCI7XHJcbiAgICBjYXJkSW5kZXg6IG51bWJlcjtcclxuICAgIG1vdXNlUG9zaXRpb25Ub1Nwcml0ZVBvc2l0aW9uOiBWZWN0b3I7XHJcbn1cclxuXHJcbmludGVyZmFjZSBDbGljayB7XHJcbiAgICB0eXBlOiBcIkNsaWNrXCI7XHJcbiAgICBjYXJkSW5kZXg6IG51bWJlcjtcclxuICAgIG1vdXNlUG9zaXRpb25Ub1Nwcml0ZVBvc2l0aW9uOiBWZWN0b3I7XHJcbn1cclxuXHJcbmV4cG9ydCB0eXBlIEFjdGlvbiA9XHJcbiAgICBcIk5vbmVcIiB8XHJcbiAgICBcIlNvcnRCeVN1aXRcIiB8XHJcbiAgICBcIlNvcnRCeVJhbmtcIiB8XHJcbiAgICBcIldhaXRcIiB8XHJcbiAgICBcIlByb2NlZWRcIiB8XHJcbiAgICBcIkRlc2VsZWN0XCIgfFxyXG4gICAgVGFrZUZyb21PdGhlclBsYXllciB8XHJcbiAgICBEcmF3RnJvbURlY2sgfFxyXG4gICAgV2FpdGluZ0Zvck5ld0NhcmQgfFxyXG4gICAgUmV0dXJuVG9EZWNrIHxcclxuICAgIFJlb3JkZXIgfFxyXG4gICAgQ29udHJvbFNoaWZ0Q2xpY2sgfFxyXG4gICAgQ29udHJvbENsaWNrIHxcclxuICAgIFNoaWZ0Q2xpY2sgfFxyXG4gICAgQ2xpY2s7XHJcblxyXG5jb25zdCBkb3VibGVDbGlja1RocmVzaG9sZCA9IDUwMDsgLy8gbWlsbGlzZWNvbmRzXHJcbmNvbnN0IG1vdmVUaHJlc2hvbGQgPSAwLjUgKiBWUC5waXhlbHNQZXJDTTtcclxuXHJcbmV4cG9ydCBsZXQgYWN0aW9uOiBBY3Rpb24gPSBcIk5vbmVcIjtcclxuXHJcbmxldCBwcmV2aW91c0NsaWNrVGltZSA9IC0xO1xyXG5sZXQgcHJldmlvdXNDbGlja0luZGV4ID0gLTE7XHJcbmxldCBtb3VzZURvd25Qb3NpdGlvbiA9IDxWZWN0b3I+eyB4OiAwLCB5OiAwIH07XHJcbmxldCBtb3VzZU1vdmVQb3NpdGlvbiA9IDxWZWN0b3I+eyB4OiAwLCB5OiAwIH07XHJcbmxldCBleGNlZWRlZERyYWdUaHJlc2hvbGQgPSBmYWxzZTtcclxuXHJcbmxldCBob2xkaW5nQ29udHJvbCA9IGZhbHNlO1xyXG5sZXQgaG9sZGluZ1NoaWZ0ID0gZmFsc2U7XHJcbndpbmRvdy5vbmtleWRvd24gPSAoZTogS2V5Ym9hcmRFdmVudCkgPT4ge1xyXG4gICAgaWYgKGUua2V5ID09PSBcIkNvbnRyb2xcIikge1xyXG4gICAgICAgIGhvbGRpbmdDb250cm9sID0gdHJ1ZTtcclxuICAgIH0gZWxzZSBpZiAoZS5rZXkgPT09IFwiU2hpZnRcIikge1xyXG4gICAgICAgIGhvbGRpbmdTaGlmdCA9IHRydWU7XHJcbiAgICB9XHJcbn07XHJcblxyXG53aW5kb3cub25rZXl1cCA9IChlOiBLZXlib2FyZEV2ZW50KSA9PiB7XHJcbiAgICBpZiAoZS5rZXkgPT09IFwiQ29udHJvbFwiKSB7XHJcbiAgICAgICAgaG9sZGluZ0NvbnRyb2wgPSBmYWxzZTtcclxuICAgIH0gZWxzZSBpZiAoZS5rZXkgPT09IFwiU2hpZnRcIikge1xyXG4gICAgICAgIGhvbGRpbmdTaGlmdCA9IGZhbHNlO1xyXG4gICAgfVxyXG59O1xyXG5cclxuaW50ZXJmYWNlIEhhc0NsaWVudFBvc2l0aW9uIHtcclxuICAgIGNsaWVudFg6IG51bWJlcjtcclxuICAgIGNsaWVudFk6IG51bWJlcjtcclxufVxyXG5cclxuaW50ZXJmYWNlIEhhc01vdmVtZW50IHtcclxuICAgIG1vdmVtZW50WDogbnVtYmVyO1xyXG4gICAgbW92ZW1lbnRZOiBudW1iZXI7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldE1vdXNlUG9zaXRpb24oZTogSGFzQ2xpZW50UG9zaXRpb24pIHtcclxuICAgIHJldHVybiBuZXcgVmVjdG9yKFxyXG4gICAgICAgIFZQLmNhbnZhcy53aWR0aCAqIChlLmNsaWVudFggLSBWUC5jYW52YXNSZWN0LmxlZnQpIC8gVlAuY2FudmFzUmVjdC53aWR0aCxcclxuICAgICAgICBWUC5jYW52YXMuaGVpZ2h0ICogKGUuY2xpZW50WSAtIFZQLmNhbnZhc1JlY3QudG9wKSAvIFZQLmNhbnZhc1JlY3QuaGVpZ2h0XHJcbiAgICApO1xyXG59XHJcblxyXG5sZXQgcHJldmlvdXNUb3VjaDogVG91Y2ggfCB1bmRlZmluZWQ7XHJcblZQLmNhbnZhcy5vbm1vdXNlZG93biA9IGFzeW5jIGV2ZW50ID0+IHtcclxuICAgIGF3YWl0IG9uRG93bihldmVudCk7XHJcbn1cclxuXHJcblZQLmNhbnZhcy5vbnRvdWNoc3RhcnQgPSBhc3luYyBldmVudCA9PiB7XHJcbiAgICBjb25zdCB0b3VjaCA9IGV2ZW50LnRvdWNoZXNbMF07XHJcbiAgICBpZiAodG91Y2ggIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIGF3YWl0IG9uRG93bih0b3VjaCk7XHJcbiAgICAgICAgcHJldmlvdXNUb3VjaCA9IHRvdWNoO1xyXG4gICAgfVxyXG59O1xyXG5cclxuYXN5bmMgZnVuY3Rpb24gb25Eb3duKGV2ZW50OiBIYXNDbGllbnRQb3NpdGlvbikge1xyXG4gICAgY29uc3QgdW5sb2NrID0gYXdhaXQgU3RhdGUubG9jaygpO1xyXG4gICAgdHJ5IHtcclxuICAgICAgICBtb3VzZURvd25Qb3NpdGlvbiA9IGdldE1vdXNlUG9zaXRpb24oZXZlbnQpO1xyXG4gICAgICAgIG1vdXNlTW92ZVBvc2l0aW9uID0gbW91c2VEb3duUG9zaXRpb247XHJcbiAgICAgICAgZXhjZWVkZWREcmFnVGhyZXNob2xkID0gZmFsc2U7XHJcblxyXG4gICAgICAgIGNvbnN0IGRlY2tQb3NpdGlvbiA9IFN0YXRlLmRlY2tTcHJpdGVzW1N0YXRlLmRlY2tTcHJpdGVzLmxlbmd0aCAtIDFdPy5wb3NpdGlvbjtcclxuXHJcbiAgICAgICAgaWYgKFZQLnNvcnRCeVJhbmtCb3VuZHNbMF0ueCA8IG1vdXNlRG93blBvc2l0aW9uLnggJiYgbW91c2VEb3duUG9zaXRpb24ueCA8IFZQLnNvcnRCeVJhbmtCb3VuZHNbMV0ueCAmJlxyXG4gICAgICAgICAgICBWUC5zb3J0QnlSYW5rQm91bmRzWzBdLnkgPCBtb3VzZURvd25Qb3NpdGlvbi55ICYmIG1vdXNlRG93blBvc2l0aW9uLnkgPCBWUC5zb3J0QnlSYW5rQm91bmRzWzFdLnlcclxuICAgICAgICApIHtcclxuICAgICAgICAgICAgYWN0aW9uID0gXCJTb3J0QnlSYW5rXCI7XHJcbiAgICAgICAgfSBlbHNlIGlmIChcclxuICAgICAgICAgICAgVlAuc29ydEJ5U3VpdEJvdW5kc1swXS54IDwgbW91c2VEb3duUG9zaXRpb24ueCAmJiBtb3VzZURvd25Qb3NpdGlvbi54IDwgVlAuc29ydEJ5U3VpdEJvdW5kc1sxXS54ICYmXHJcbiAgICAgICAgICAgIFZQLnNvcnRCeVN1aXRCb3VuZHNbMF0ueSA8IG1vdXNlRG93blBvc2l0aW9uLnkgJiYgbW91c2VEb3duUG9zaXRpb24ueSA8IFZQLnNvcnRCeVN1aXRCb3VuZHNbMV0ueVxyXG4gICAgICAgICkge1xyXG4gICAgICAgICAgICBhY3Rpb24gPSBcIlNvcnRCeVN1aXRcIjtcclxuICAgICAgICB9IGVsc2UgaWYgKFxyXG4gICAgICAgICAgICBWUC53YWl0Qm91bmRzWzBdLnggPCBtb3VzZURvd25Qb3NpdGlvbi54ICYmIG1vdXNlRG93blBvc2l0aW9uLnggPCBWUC53YWl0Qm91bmRzWzFdLnggJiZcclxuICAgICAgICAgICAgVlAud2FpdEJvdW5kc1swXS55IDwgbW91c2VEb3duUG9zaXRpb24ueSAmJiBtb3VzZURvd25Qb3NpdGlvbi55IDwgVlAud2FpdEJvdW5kc1sxXS55XHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICAgIGFjdGlvbiA9IFwiV2FpdFwiO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoXHJcbiAgICAgICAgICAgIFZQLnByb2NlZWRCb3VuZHNbMF0ueCA8IG1vdXNlRG93blBvc2l0aW9uLnggJiYgbW91c2VEb3duUG9zaXRpb24ueCA8IFZQLnByb2NlZWRCb3VuZHNbMV0ueCAmJlxyXG4gICAgICAgICAgICBWUC5wcm9jZWVkQm91bmRzWzBdLnkgPCBtb3VzZURvd25Qb3NpdGlvbi55ICYmIG1vdXNlRG93blBvc2l0aW9uLnkgPCBWUC5wcm9jZWVkQm91bmRzWzFdLnlcclxuICAgICAgICApIHtcclxuICAgICAgICAgICAgYWN0aW9uID0gXCJQcm9jZWVkXCI7XHJcbiAgICAgICAgfSBlbHNlIGlmIChkZWNrUG9zaXRpb24gIT09IHVuZGVmaW5lZCAmJlxyXG4gICAgICAgICAgICBkZWNrUG9zaXRpb24ueCA8IG1vdXNlRG93blBvc2l0aW9uLnggJiYgbW91c2VEb3duUG9zaXRpb24ueCA8IGRlY2tQb3NpdGlvbi54ICsgVlAuc3ByaXRlV2lkdGggJiZcclxuICAgICAgICAgICAgZGVja1Bvc2l0aW9uLnkgPCBtb3VzZURvd25Qb3NpdGlvbi55ICYmIG1vdXNlRG93blBvc2l0aW9uLnkgPCBkZWNrUG9zaXRpb24ueSArIFZQLnNwcml0ZUhlaWdodFxyXG4gICAgICAgICkge1xyXG4gICAgICAgICAgICBhY3Rpb24gPSB7XHJcbiAgICAgICAgICAgICAgICBtb3VzZVBvc2l0aW9uVG9TcHJpdGVQb3NpdGlvbjogZGVja1Bvc2l0aW9uLnN1Yihtb3VzZURvd25Qb3NpdGlvbiksXHJcbiAgICAgICAgICAgICAgICB0eXBlOiBcIkRyYXdGcm9tRGVja1wiXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgY29uc3QgZ2FtZVN0YXRlID0gU3RhdGUuZ2FtZVN0YXRlO1xyXG4gICAgICAgICAgICBpZiAoZ2FtZVN0YXRlID09PSB1bmRlZmluZWQpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgIC8vIGJlY2F1c2Ugd2UgcmVuZGVyIGxlZnQgdG8gcmlnaHQsIHRoZSByaWdodG1vc3QgY2FyZCB1bmRlciB0aGUgbW91c2UgcG9zaXRpb24gaXMgd2hhdCB3ZSBzaG91bGQgcmV0dXJuXHJcbiAgICAgICAgICAgIGNvbnN0IHNwcml0ZXMgPSBTdGF0ZS5mYWNlU3ByaXRlc0ZvclBsYXllcltnYW1lU3RhdGUucGxheWVySW5kZXhdO1xyXG4gICAgICAgICAgICBpZiAoc3ByaXRlcyA9PT0gdW5kZWZpbmVkKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICBsZXQgZGVzZWxlY3QgPSB0cnVlO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gc3ByaXRlcy5sZW5ndGggLSAxOyBpID49IDA7IC0taSkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcG9zaXRpb24gPSBzcHJpdGVzW2ldPy5wb3NpdGlvbjtcclxuICAgICAgICAgICAgICAgIGlmIChwb3NpdGlvbiAhPT0gdW5kZWZpbmVkICYmXHJcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb24ueCA8IG1vdXNlRG93blBvc2l0aW9uLnggJiYgbW91c2VEb3duUG9zaXRpb24ueCA8IHBvc2l0aW9uLnggKyBWUC5zcHJpdGVXaWR0aCAmJlxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uLnkgPCBtb3VzZURvd25Qb3NpdGlvbi55ICYmIG1vdXNlRG93blBvc2l0aW9uLnkgPCBwb3NpdGlvbi55ICsgVlAuc3ByaXRlSGVpZ2h0XHJcbiAgICAgICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgICAgICBkZXNlbGVjdCA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBhY3Rpb24gPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhcmRJbmRleDogaSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbW91c2VQb3NpdGlvblRvU3ByaXRlUG9zaXRpb246IHBvc2l0aW9uLnN1Yihtb3VzZURvd25Qb3NpdGlvbiksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IGhvbGRpbmdDb250cm9sICYmIGhvbGRpbmdTaGlmdCA/IFwiQ29udHJvbFNoaWZ0Q2xpY2tcIiA6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBob2xkaW5nQ29udHJvbCA/IFwiQ29udHJvbENsaWNrXCIgOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaG9sZGluZ1NoaWZ0ID8gXCJTaGlmdENsaWNrXCIgOiBcIkNsaWNrXCJcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IDQ7ICsraSkge1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgb3RoZXJQbGF5ZXIgPSBnYW1lU3RhdGUub3RoZXJQbGF5ZXJzW2ldO1xyXG4gICAgICAgICAgICAgICAgaWYgKG90aGVyUGxheWVyICE9PSBudWxsICYmIG90aGVyUGxheWVyICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0cmFuc2Zvcm0gPSBWUC5nZXRUcmFuc2Zvcm1Gb3JQbGF5ZXIoVlAuZ2V0UmVsYXRpdmVQbGF5ZXJJbmRleChpLCBnYW1lU3RhdGUucGxheWVySW5kZXgpKTtcclxuICAgICAgICAgICAgICAgICAgICB0cmFuc2Zvcm0uaW52ZXJ0U2VsZigpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRyYW5zZm9ybWVkUG9zaXRpb24gPSB0cmFuc2Zvcm0udHJhbnNmb3JtUG9pbnQobW91c2VEb3duUG9zaXRpb24pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBqID0gb3RoZXJQbGF5ZXIuc2hhcmVDb3VudCAtIDE7IGogPj0gMDsgLS1qKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNwcml0ZSA9IFN0YXRlLmZhY2VTcHJpdGVzRm9yUGxheWVyW2ldPy5bal07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzcHJpdGUgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzcHJpdGUucG9zaXRpb24ueCA8IHRyYW5zZm9ybWVkUG9zaXRpb24ueCAmJiB0cmFuc2Zvcm1lZFBvc2l0aW9uLnggPCBzcHJpdGUucG9zaXRpb24ueCArIFZQLnNwcml0ZVdpZHRoICYmXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzcHJpdGUucG9zaXRpb24ueSA8IHRyYW5zZm9ybWVkUG9zaXRpb24ueSAmJiB0cmFuc2Zvcm1lZFBvc2l0aW9uLnkgPCBzcHJpdGUucG9zaXRpb24ueSArIFZQLnNwcml0ZUhlaWdodFxyXG4gICAgICAgICAgICAgICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBtb3VzZSBkb3duIG9uICR7aX0ncyBjYXJkICR7an1gKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjYXJkID0gb3RoZXJQbGF5ZXIucmV2ZWFsZWRDYXJkc1tqXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjYXJkID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiVGFrZUZyb21PdGhlclBsYXllclwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1vdXNlUG9zaXRpb25Ub1Nwcml0ZVBvc2l0aW9uOiBuZXcgVmVjdG9yKDAsIDApLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG90aGVyUGxheWVySW5kZXg6IGksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FyZEluZGV4OiBqLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhcmRcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzZWxlY3QgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGRlc2VsZWN0KSB7XHJcbiAgICAgICAgICAgICAgICBhY3Rpb24gPSBcIkRlc2VsZWN0XCI7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9IGZpbmFsbHkge1xyXG4gICAgICAgIHVubG9jaygpO1xyXG4gICAgfVxyXG59XHJcblxyXG5WUC5jYW52YXMub25tb3VzZW1vdmUgPSBhc3luYyBldmVudCA9PiB7XHJcbiAgICBhd2FpdCBvbk1vdmUoZXZlbnQsIGV2ZW50KTtcclxufTtcclxuXHJcblZQLmNhbnZhcy5vbnRvdWNobW92ZSA9IGFzeW5jIGV2ZW50ID0+IHtcclxuICAgIGNvbnN0IHRvdWNoID0gZXZlbnQudG91Y2hlc1swXTtcclxuICAgIGlmICh0b3VjaCAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgYXdhaXQgb25Nb3ZlKHRvdWNoLCB7XHJcbiAgICAgICAgICAgIG1vdmVtZW50WDogdG91Y2guY2xpZW50WCAtIChwcmV2aW91c1RvdWNoPy5jbGllbnRYID8/IHRvdWNoLmNsaWVudFgpLFxyXG4gICAgICAgICAgICBtb3ZlbWVudFk6IHRvdWNoLmNsaWVudFkgLSAocHJldmlvdXNUb3VjaD8uY2xpZW50WSA/PyB0b3VjaC5jbGllbnRZKVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHByZXZpb3VzVG91Y2ggPSB0b3VjaDtcclxuICAgIH1cclxufTtcclxuXHJcbmFzeW5jIGZ1bmN0aW9uIG9uTW92ZShldmVudDogSGFzQ2xpZW50UG9zaXRpb24sIG1vdmVtZW50OiBIYXNNb3ZlbWVudCkge1xyXG4gICAgY29uc3QgZ2FtZVN0YXRlID0gU3RhdGUuZ2FtZVN0YXRlO1xyXG4gICAgaWYgKGdhbWVTdGF0ZSA9PT0gdW5kZWZpbmVkKSByZXR1cm47XHJcblxyXG4gICAgY29uc3QgdW5sb2NrID0gYXdhaXQgU3RhdGUubG9jaygpO1xyXG4gICAgdHJ5IHtcclxuICAgICAgICBtb3VzZU1vdmVQb3NpdGlvbiA9IGdldE1vdXNlUG9zaXRpb24oZXZlbnQpO1xyXG4gICAgICAgIGV4Y2VlZGVkRHJhZ1RocmVzaG9sZCA9IGV4Y2VlZGVkRHJhZ1RocmVzaG9sZCB8fCBtb3VzZU1vdmVQb3NpdGlvbi5kaXN0YW5jZShtb3VzZURvd25Qb3NpdGlvbikgPiBtb3ZlVGhyZXNob2xkO1xyXG5cclxuICAgICAgICBpZiAoYWN0aW9uID09PSBcIk5vbmVcIikge1xyXG4gICAgICAgICAgICAvLyBkbyBub3RoaW5nXHJcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24gPT09IFwiU29ydEJ5U3VpdFwiKSB7XHJcbiAgICAgICAgICAgIC8vIFRPRE86IGNoZWNrIHdoZXRoZXIgbW91c2UgcG9zaXRpb24gaGFzIGxlZnQgYnV0dG9uIGJvdW5kc1xyXG4gICAgICAgIH0gZWxzZSBpZiAoYWN0aW9uID09PSBcIlNvcnRCeVJhbmtcIikge1xyXG4gICAgICAgICAgICAvLyBUT0RPOiBjaGVjayB3aGV0aGVyIG1vdXNlIHBvc2l0aW9uIGhhcyBsZWZ0IGJ1dHRvbiBib3VuZHNcclxuICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbiA9PT0gXCJXYWl0XCIpIHtcclxuICAgICAgICAgICAgLy8gVE9ETzogY2hlY2sgd2hldGhlciBtb3VzZSBwb3NpdGlvbiBoYXMgbGVmdCBidXR0b24gYm91bmRzXHJcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24gPT09IFwiUHJvY2VlZFwiKSB7XHJcbiAgICAgICAgICAgIC8vIFRPRE86IGNoZWNrIHdoZXRoZXIgbW91c2UgcG9zaXRpb24gaGFzIGxlZnQgYnV0dG9uIGJvdW5kc1xyXG4gICAgICAgIH0gZWxzZSBpZiAoYWN0aW9uID09PSBcIkRlc2VsZWN0XCIpIHtcclxuICAgICAgICAgICAgLy8gVE9ETzogYm94IHNlbGVjdGlvbj9cclxuICAgICAgICB9IGVsc2UgaWYgKFxyXG4gICAgICAgICAgICBhY3Rpb24udHlwZSA9PT0gXCJUYWtlRnJvbU90aGVyUGxheWVyXCIgfHxcclxuICAgICAgICAgICAgYWN0aW9uLnR5cGUgPT09IFwiRHJhd0Zyb21EZWNrXCIgfHxcclxuICAgICAgICAgICAgYWN0aW9uLnR5cGUgPT09IFwiV2FpdGluZ0Zvck5ld0NhcmRcIlxyXG4gICAgICAgICkge1xyXG4gICAgICAgICAgICBpZiAoZXhjZWVkZWREcmFnVGhyZXNob2xkKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgcHJvbWlzZTogUHJvbWlzZTx2b2lkPiB8IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgICAgIGxldCBzcHJpdGU6IFNwcml0ZSB8IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgICAgIGlmIChhY3Rpb24udHlwZSA9PT0gXCJUYWtlRnJvbU90aGVyUGxheWVyXCIpIHtcclxuICAgICAgICAgICAgICAgICAgICBwcm9taXNlID0gU3RhdGUudGFrZUNhcmQoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbi5vdGhlclBsYXllckluZGV4LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb24uY2FyZEluZGV4LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb24uY2FyZFxyXG4gICAgICAgICAgICAgICAgICAgICk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHNwcml0ZSA9IFN0YXRlLmZhY2VTcHJpdGVzRm9yUGxheWVyW2FjdGlvbi5vdGhlclBsYXllckluZGV4XT8uW2FjdGlvbi5jYXJkSW5kZXhdO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24udHlwZSA9PT0gXCJEcmF3RnJvbURlY2tcIikge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGNhcmQgZHJhd2luZyB3aWxsIHRyeSB0byBsb2NrIHRoZSBzdGF0ZSwgc28gd2UgbXVzdCBhdHRhY2ggYSBjYWxsYmFjayBpbnN0ZWFkIG9mIGF3YWl0aW5nXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvbWlzZSA9IFN0YXRlLmRyYXdDYXJkKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHNwcml0ZSA9IFN0YXRlLmRlY2tTcHJpdGVzW1N0YXRlLmRlY2tTcHJpdGVzLmxlbmd0aCAtIDFdO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmIChwcm9taXNlICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoc3ByaXRlID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG4gICAgICAgICAgICAgICAgICAgIHNwcml0ZS50YXJnZXQgPSBtb3VzZU1vdmVQb3NpdGlvbi5hZGQoYWN0aW9uLm1vdXNlUG9zaXRpb25Ub1Nwcml0ZVBvc2l0aW9uKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgYWN0aW9uID0geyAuLi5hY3Rpb24sIHR5cGU6IFwiV2FpdGluZ0Zvck5ld0NhcmRcIiB9O1xyXG4gICAgICAgICAgICAgICAgICAgIHByb21pc2UudGhlbihvbkNhcmREcmF3bihzcHJpdGUpKS5jYXRjaChfID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFjdGlvbiAhPT0gXCJOb25lXCIgJiZcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbiAhPT0gXCJEZXNlbGVjdFwiICYmXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb24gIT09IFwiU29ydEJ5UmFua1wiICYmXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb24gIT09IFwiU29ydEJ5U3VpdFwiICYmXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb24gIT09IFwiV2FpdFwiICYmXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb24gIT09IFwiUHJvY2VlZFwiICYmXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb24udHlwZSA9PT0gXCJXYWl0aW5nRm9yTmV3Q2FyZFwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uID0gXCJOb25lXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSBpZiAoYWN0aW9uLnR5cGUgPT09IFwiUmV0dXJuVG9EZWNrXCIgfHwgYWN0aW9uLnR5cGUgPT09IFwiUmVvcmRlclwiICkge1xyXG4gICAgICAgICAgICBkcmFnKGdhbWVTdGF0ZSwgYWN0aW9uLmNhcmRJbmRleCwgYWN0aW9uLm1vdXNlUG9zaXRpb25Ub1Nwcml0ZVBvc2l0aW9uKTtcclxuICAgICAgICB9IGVsc2UgaWYgKFxyXG4gICAgICAgICAgICBhY3Rpb24udHlwZSA9PT0gXCJDb250cm9sU2hpZnRDbGlja1wiIHx8XHJcbiAgICAgICAgICAgIGFjdGlvbi50eXBlID09PSBcIkNvbnRyb2xDbGlja1wiIHx8XHJcbiAgICAgICAgICAgIGFjdGlvbi50eXBlID09PSBcIlNoaWZ0Q2xpY2tcIiB8fFxyXG4gICAgICAgICAgICBhY3Rpb24udHlwZSA9PT0gXCJDbGlja1wiXHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICAgIGxldCBpID0gTGliLmJpbmFyeVNlYXJjaE51bWJlcihTdGF0ZS5zZWxlY3RlZEluZGljZXMsIGFjdGlvbi5jYXJkSW5kZXgpO1xyXG4gICAgICAgICAgICBpZiAoZXhjZWVkZWREcmFnVGhyZXNob2xkKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBkcmFnZ2luZyBhIG5vbi1zZWxlY3RlZCBjYXJkIHNlbGVjdHMgaXQgYW5kIG9ubHkgaXRcclxuICAgICAgICAgICAgICAgIGlmIChpIDwgMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIFN0YXRlLnNlbGVjdGVkSW5kaWNlcy5zcGxpY2UoMCwgU3RhdGUuc2VsZWN0ZWRJbmRpY2VzLmxlbmd0aCwgYWN0aW9uLmNhcmRJbmRleCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgZHJhZyhnYW1lU3RhdGUsIGFjdGlvbi5jYXJkSW5kZXgsIGFjdGlvbi5tb3VzZVBvc2l0aW9uVG9TcHJpdGVQb3NpdGlvbik7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBzcHJpdGVzID0gU3RhdGUuZmFjZVNwcml0ZXNGb3JQbGF5ZXJbZ2FtZVN0YXRlLnBsYXllckluZGV4XTtcclxuICAgICAgICAgICAgICAgIGlmIChzcHJpdGVzID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG4gICAgXHJcbiAgICAgICAgICAgICAgICBpZiAoaSA8IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzcHJpdGUgPSBzcHJpdGVzW2FjdGlvbi5jYXJkSW5kZXhdO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChzcHJpdGUgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgc3ByaXRlLnRhcmdldCA9IHNwcml0ZS50YXJnZXQuYWRkKG5ldyBWZWN0b3IobW92ZW1lbnQubW92ZW1lbnRYLCBtb3ZlbWVudC5tb3ZlbWVudFkpKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBqIG9mIFN0YXRlLnNlbGVjdGVkSW5kaWNlcykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzcHJpdGUgPSBzcHJpdGVzW2pdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc3ByaXRlID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzcHJpdGUudGFyZ2V0ID0gc3ByaXRlLnRhcmdldC5hZGQobmV3IFZlY3Rvcihtb3ZlbWVudC5tb3ZlbWVudFgsIG1vdmVtZW50Lm1vdmVtZW50WSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGNvbnN0IF86IG5ldmVyID0gYWN0aW9uO1xyXG4gICAgICAgIH1cclxuICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgdW5sb2NrKCk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5WUC5jYW52YXMub25tb3VzZXVwID0gYXN5bmMgZXZlbnQgPT4ge1xyXG4gICAgYXdhaXQgb25VcCgpO1xyXG59O1xyXG5cclxuVlAuY2FudmFzLm9udG91Y2hlbmQgPSBhc3luYyBldmVudCA9PiB7XHJcbiAgICBhd2FpdCBvblVwKCk7XHJcbn07XHJcblxyXG5hc3luYyBmdW5jdGlvbiBvblVwKCkge1xyXG4gICAgY29uc3QgZ2FtZVN0YXRlID0gU3RhdGUuZ2FtZVN0YXRlO1xyXG4gICAgaWYgKGdhbWVTdGF0ZSA9PT0gdW5kZWZpbmVkKSByZXR1cm47XHJcblxyXG4gICAgY29uc3QgdW5sb2NrID0gYXdhaXQgU3RhdGUubG9jaygpO1xyXG4gICAgdHJ5IHtcclxuICAgICAgICBpZiAoYWN0aW9uID09PSBcIk5vbmVcIikge1xyXG4gICAgICAgICAgICAvLyBkbyBub3RoaW5nXHJcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24gPT09IFwiU29ydEJ5UmFua1wiKSB7XHJcbiAgICAgICAgICAgIGF3YWl0IFN0YXRlLnNvcnRCeVJhbmsoZ2FtZVN0YXRlKTtcclxuICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbiA9PT0gXCJTb3J0QnlTdWl0XCIpIHtcclxuICAgICAgICAgICAgYXdhaXQgU3RhdGUuc29ydEJ5U3VpdChnYW1lU3RhdGUpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoYWN0aW9uID09PSBcIldhaXRcIikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnd2FpdGluZycpO1xyXG4gICAgICAgICAgICBhd2FpdCBTdGF0ZS53YWl0KCk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24gPT09IFwiUHJvY2VlZFwiKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdwcm9jZWVkaW5nJyk7XHJcbiAgICAgICAgICAgIGF3YWl0IFN0YXRlLnByb2NlZWQoKTtcclxuICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbiA9PT0gXCJEZXNlbGVjdFwiKSB7XHJcbiAgICAgICAgICAgIFN0YXRlLnNlbGVjdGVkSW5kaWNlcy5zcGxpY2UoMCwgU3RhdGUuc2VsZWN0ZWRJbmRpY2VzLmxlbmd0aCk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24udHlwZSA9PT0gXCJEcmF3RnJvbURlY2tcIiB8fCBhY3Rpb24udHlwZSA9PT0gXCJXYWl0aW5nRm9yTmV3Q2FyZFwiKSB7XHJcbiAgICAgICAgICAgIC8vIGRvIG5vdGhpbmdcclxuICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbi50eXBlID09PSBcIlJlb3JkZXJcIikge1xyXG4gICAgICAgICAgICBwcmV2aW91c0NsaWNrSW5kZXggPSBhY3Rpb24uY2FyZEluZGV4O1xyXG4gICAgICAgICAgICBhd2FpdCBTdGF0ZS5yZW9yZGVyQ2FyZHMoZ2FtZVN0YXRlKTtcclxuICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbi50eXBlID09PSBcIlJldHVyblRvRGVja1wiKSB7XHJcbiAgICAgICAgICAgIHByZXZpb3VzQ2xpY2tJbmRleCA9IC0xO1xyXG4gICAgICAgICAgICBhd2FpdCBTdGF0ZS5yZXR1cm5DYXJkc1RvRGVjayhnYW1lU3RhdGUpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoYWN0aW9uLnR5cGUgPT09IFwiQ29udHJvbFNoaWZ0Q2xpY2tcIikge1xyXG4gICAgICAgICAgICBpZiAocHJldmlvdXNDbGlja0luZGV4ID09PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgcHJldmlvdXNDbGlja0luZGV4ID0gYWN0aW9uLmNhcmRJbmRleDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3Qgc3RhcnQgPSBNYXRoLm1pbihhY3Rpb24uY2FyZEluZGV4LCBwcmV2aW91c0NsaWNrSW5kZXgpO1xyXG4gICAgICAgICAgICBjb25zdCBlbmQgPSBNYXRoLm1heChhY3Rpb24uY2FyZEluZGV4LCBwcmV2aW91c0NsaWNrSW5kZXgpO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gc3RhcnQ7IGkgPD0gZW5kOyArK2kpIHtcclxuICAgICAgICAgICAgICAgIGxldCBqID0gTGliLmJpbmFyeVNlYXJjaE51bWJlcihTdGF0ZS5zZWxlY3RlZEluZGljZXMsIGkpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGogPCAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgU3RhdGUuc2VsZWN0ZWRJbmRpY2VzLnNwbGljZSh+aiwgMCwgaSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbi50eXBlID09PSBcIkNvbnRyb2xDbGlja1wiKSB7XHJcbiAgICAgICAgICAgIHByZXZpb3VzQ2xpY2tJbmRleCA9IGFjdGlvbi5jYXJkSW5kZXg7XHJcbiAgICAgICAgICAgIGxldCBpID0gTGliLmJpbmFyeVNlYXJjaE51bWJlcihTdGF0ZS5zZWxlY3RlZEluZGljZXMsIGFjdGlvbi5jYXJkSW5kZXgpO1xyXG4gICAgICAgICAgICBpZiAoaSA8IDApIHtcclxuICAgICAgICAgICAgICAgIFN0YXRlLnNlbGVjdGVkSW5kaWNlcy5zcGxpY2UofmksIDAsIGFjdGlvbi5jYXJkSW5kZXgpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgU3RhdGUuc2VsZWN0ZWRJbmRpY2VzLnNwbGljZShpLCAxKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSBpZiAoYWN0aW9uLnR5cGUgPT09IFwiU2hpZnRDbGlja1wiKSB7XHJcbiAgICAgICAgICAgIGlmIChwcmV2aW91c0NsaWNrSW5kZXggPT09IC0xKSB7XHJcbiAgICAgICAgICAgICAgICBwcmV2aW91c0NsaWNrSW5kZXggPSBhY3Rpb24uY2FyZEluZGV4O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBzdGFydCA9IE1hdGgubWluKGFjdGlvbi5jYXJkSW5kZXgsIHByZXZpb3VzQ2xpY2tJbmRleCk7XHJcbiAgICAgICAgICAgIGNvbnN0IGVuZCA9IE1hdGgubWF4KGFjdGlvbi5jYXJkSW5kZXgsIHByZXZpb3VzQ2xpY2tJbmRleCk7XHJcbiAgICAgICAgICAgIFN0YXRlLnNlbGVjdGVkSW5kaWNlcy5zcGxpY2UoMCwgU3RhdGUuc2VsZWN0ZWRJbmRpY2VzLmxlbmd0aCk7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSBzdGFydDsgaSA8PSBlbmQ7ICsraSkge1xyXG4gICAgICAgICAgICAgICAgU3RhdGUuc2VsZWN0ZWRJbmRpY2VzLnB1c2goaSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbi50eXBlID09PSBcIkNsaWNrXCIpIHtcclxuICAgICAgICAgICAgcHJldmlvdXNDbGlja0luZGV4ID0gYWN0aW9uLmNhcmRJbmRleDtcclxuICAgICAgICAgICAgU3RhdGUuc2VsZWN0ZWRJbmRpY2VzLnNwbGljZSgwLCBTdGF0ZS5zZWxlY3RlZEluZGljZXMubGVuZ3RoLCBhY3Rpb24uY2FyZEluZGV4KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIFN0YXRlLnNldFNwcml0ZVRhcmdldHMoZ2FtZVN0YXRlKTtcclxuXHJcbiAgICAgICAgYWN0aW9uID0gXCJOb25lXCI7XHJcbiAgICB9IGZpbmFsbHkge1xyXG4gICAgICAgIHVubG9jaygpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuZnVuY3Rpb24gb25DYXJkRHJhd24oZGVja1Nwcml0ZTogU3ByaXRlKSB7XHJcbiAgICByZXR1cm4gYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgIGNvbnN0IGdhbWVTdGF0ZSA9IFN0YXRlLmdhbWVTdGF0ZTtcclxuICAgICAgICBpZiAoZ2FtZVN0YXRlID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG5cclxuICAgICAgICBjb25zdCB1bmxvY2sgPSBhd2FpdCBTdGF0ZS5sb2NrKCk7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgaWYgKGFjdGlvbiAhPT0gXCJOb25lXCIgJiZcclxuICAgICAgICAgICAgICAgIGFjdGlvbiAhPT0gXCJTb3J0QnlTdWl0XCIgJiZcclxuICAgICAgICAgICAgICAgIGFjdGlvbiAhPT0gXCJTb3J0QnlSYW5rXCIgJiZcclxuICAgICAgICAgICAgICAgIGFjdGlvbiAhPT0gXCJXYWl0XCIgJiZcclxuICAgICAgICAgICAgICAgIGFjdGlvbiAhPT0gXCJQcm9jZWVkXCIgJiZcclxuICAgICAgICAgICAgICAgIGFjdGlvbiAhPT0gXCJEZXNlbGVjdFwiICYmXHJcbiAgICAgICAgICAgICAgICBhY3Rpb24udHlwZSA9PT0gXCJXYWl0aW5nRm9yTmV3Q2FyZFwiXHJcbiAgICAgICAgICAgICkge1xyXG4gICAgICAgICAgICAgICAgLy8gaW1tZWRpYXRlbHkgc2VsZWN0IG5ld2x5IGFjcXVpcmVkIGNhcmRcclxuICAgICAgICAgICAgICAgIGNvbnN0IGNhcmRJbmRleCA9IGdhbWVTdGF0ZS5wbGF5ZXJDYXJkcy5sZW5ndGggLSAxO1xyXG4gICAgICAgICAgICAgICAgU3RhdGUuc2VsZWN0ZWRJbmRpY2VzLnNwbGljZSgwLCBTdGF0ZS5zZWxlY3RlZEluZGljZXMubGVuZ3RoKTtcclxuICAgICAgICAgICAgICAgIFN0YXRlLnNlbGVjdGVkSW5kaWNlcy5wdXNoKGNhcmRJbmRleCk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gbmV3IGNhcmQgc2hvdWxkIGFwcGVhciBpbiBwbGFjZSBvZiBkcmFnZ2VkIGNhcmQgZnJvbSBkZWNrIHdpdGhvdXQgYW5pbWF0aW9uXHJcbiAgICAgICAgICAgICAgICBjb25zdCBmYWNlU3ByaXRlQXRNb3VzZURvd24gPSBTdGF0ZS5mYWNlU3ByaXRlc0ZvclBsYXllcltnYW1lU3RhdGUucGxheWVySW5kZXhdPy5bY2FyZEluZGV4XTtcclxuICAgICAgICAgICAgICAgIGlmIChmYWNlU3ByaXRlQXRNb3VzZURvd24gPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICAgICAgICAgICAgICBmYWNlU3ByaXRlQXRNb3VzZURvd24udGFyZ2V0ID0gZGVja1Nwcml0ZS5wb3NpdGlvbjtcclxuICAgICAgICAgICAgICAgIGZhY2VTcHJpdGVBdE1vdXNlRG93bi5wb3NpdGlvbiA9IGRlY2tTcHJpdGUucG9zaXRpb247XHJcbiAgICAgICAgICAgICAgICBmYWNlU3ByaXRlQXRNb3VzZURvd24udmVsb2NpdHkgPSBkZWNrU3ByaXRlLnZlbG9jaXR5O1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBkcmFnKGdhbWVTdGF0ZSwgY2FyZEluZGV4LCBhY3Rpb24ubW91c2VQb3NpdGlvblRvU3ByaXRlUG9zaXRpb24pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBmaW5hbGx5IHtcclxuICAgICAgICAgICAgdW5sb2NrKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxufVxyXG5cclxuZnVuY3Rpb24gZHJhZyhnYW1lU3RhdGU6IExpYi5HYW1lU3RhdGUsIGNhcmRJbmRleDogbnVtYmVyLCBtb3VzZVBvc2l0aW9uVG9TcHJpdGVQb3NpdGlvbjogVmVjdG9yKSB7XHJcbiAgICBjb25zdCBzcHJpdGVzID0gU3RhdGUuZmFjZVNwcml0ZXNGb3JQbGF5ZXJbZ2FtZVN0YXRlLnBsYXllckluZGV4XTtcclxuICAgIGlmIChzcHJpdGVzID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG5cclxuICAgIGNvbnN0IGNhcmRzID0gZ2FtZVN0YXRlLnBsYXllckNhcmRzO1xyXG5cclxuICAgIGNvbnN0IG1vdmluZ1Nwcml0ZXNBbmRDYXJkczogW1Nwcml0ZSwgTGliLkNhcmRdW10gPSBbXTtcclxuICAgIGNvbnN0IHJlc2VydmVkU3ByaXRlc0FuZENhcmRzOiBbU3ByaXRlLCBMaWIuQ2FyZF1bXSA9IFtdO1xyXG5cclxuICAgIGxldCBzcGxpdEluZGV4OiBudW1iZXIgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XHJcbiAgICBsZXQgc2hhcmVDb3VudCA9IGdhbWVTdGF0ZS5wbGF5ZXJTaGFyZUNvdW50O1xyXG4gICAgbGV0IHJldmVhbENvdW50ID0gZ2FtZVN0YXRlLnBsYXllclJldmVhbENvdW50O1xyXG5cclxuICAgIC8vIGV4dHJhY3QgbW92aW5nIHNwcml0ZXNcclxuICAgIGZvciAoY29uc3QgaSBvZiBTdGF0ZS5zZWxlY3RlZEluZGljZXMpIHtcclxuICAgICAgICBjb25zdCBzcHJpdGUgPSBzcHJpdGVzW2ldO1xyXG4gICAgICAgIGNvbnN0IGNhcmQgPSBjYXJkc1tpXTtcclxuICAgICAgICBpZiAoc3ByaXRlID09PSB1bmRlZmluZWQgfHwgY2FyZCA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICAgICAgICBtb3ZpbmdTcHJpdGVzQW5kQ2FyZHMucHVzaChbc3ByaXRlLCBjYXJkXSk7XHJcblxyXG4gICAgICAgIGlmIChpIDwgZ2FtZVN0YXRlLnBsYXllclNoYXJlQ291bnQpIHtcclxuICAgICAgICAgICAgLS1zaGFyZUNvdW50O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGkgPCBnYW1lU3RhdGUucGxheWVyUmV2ZWFsQ291bnQpIHtcclxuICAgICAgICAgICAgLS1yZXZlYWxDb3VudDtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gZXh0cmFjdCByZXNlcnZlZCBzcHJpdGVzXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNwcml0ZXMubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICBpZiAoTGliLmJpbmFyeVNlYXJjaE51bWJlcihTdGF0ZS5zZWxlY3RlZEluZGljZXMsIGkpIDwgMCkge1xyXG4gICAgICAgICAgICBjb25zdCBzcHJpdGUgPSBzcHJpdGVzW2ldO1xyXG4gICAgICAgICAgICBjb25zdCBjYXJkID0gY2FyZHNbaV07XHJcbiAgICAgICAgICAgIGlmIChzcHJpdGUgPT09IHVuZGVmaW5lZCB8fCBjYXJkID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG4gICAgICAgICAgICByZXNlcnZlZFNwcml0ZXNBbmRDYXJkcy5wdXNoKFtzcHJpdGUsIGNhcmRdKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gZmluZCB0aGUgaGVsZCBzcHJpdGVzLCBpZiBhbnksIG92ZXJsYXBwZWQgYnkgdGhlIGRyYWdnZWQgc3ByaXRlc1xyXG4gICAgY29uc3QgbGVmdE1vdmluZ1Nwcml0ZSA9IG1vdmluZ1Nwcml0ZXNBbmRDYXJkc1swXT8uWzBdO1xyXG4gICAgY29uc3QgcmlnaHRNb3ZpbmdTcHJpdGUgPSBtb3ZpbmdTcHJpdGVzQW5kQ2FyZHNbbW92aW5nU3ByaXRlc0FuZENhcmRzLmxlbmd0aCAtIDFdPy5bMF07XHJcbiAgICBpZiAobGVmdE1vdmluZ1Nwcml0ZSA9PT0gdW5kZWZpbmVkIHx8IHJpZ2h0TW92aW5nU3ByaXRlID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBkZWNrRGlzdGFuY2UgPSBNYXRoLmFicyhsZWZ0TW92aW5nU3ByaXRlLnRhcmdldC55IC0gKFZQLmNhbnZhcy5oZWlnaHQgLyAyIC0gVlAuc3ByaXRlSGVpZ2h0IC8gMikpO1xyXG4gICAgY29uc3QgcmV2ZWFsRGlzdGFuY2UgPSBNYXRoLmFicyhsZWZ0TW92aW5nU3ByaXRlLnRhcmdldC55IC0gKFZQLmNhbnZhcy5oZWlnaHQgLSAyICogVlAuc3ByaXRlSGVpZ2h0KSk7XHJcbiAgICBjb25zdCBoaWRlRGlzdGFuY2UgPSBNYXRoLmFicyhsZWZ0TW92aW5nU3ByaXRlLnRhcmdldC55IC0gKFZQLmNhbnZhcy5oZWlnaHQgLSBWUC5zcHJpdGVIZWlnaHQpKTtcclxuXHJcbiAgICAvLyBzZXQgdGhlIGFjdGlvbiBmb3Igb25tb3VzZXVwXHJcbiAgICBpZiAoZGVja0Rpc3RhbmNlIDwgcmV2ZWFsRGlzdGFuY2UgJiYgZGVja0Rpc3RhbmNlIDwgaGlkZURpc3RhbmNlKSB7XHJcbiAgICAgICAgYWN0aW9uID0geyBjYXJkSW5kZXgsIG1vdXNlUG9zaXRpb25Ub1Nwcml0ZVBvc2l0aW9uLCB0eXBlOiBcIlJldHVyblRvRGVja1wiIH07XHJcblxyXG4gICAgICAgIHNwbGl0SW5kZXggPSByZXNlcnZlZFNwcml0ZXNBbmRDYXJkcy5sZW5ndGg7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIGFjdGlvbiA9IHsgY2FyZEluZGV4LCBtb3VzZVBvc2l0aW9uVG9TcHJpdGVQb3NpdGlvbiwgdHlwZTogXCJSZW9yZGVyXCIgfTtcclxuXHJcbiAgICAgICAgLy8gZGV0ZXJtaW5lIHdoZXRoZXIgdGhlIG1vdmluZyBzcHJpdGVzIGFyZSBjbG9zZXIgdG8gdGhlIHJldmVhbGVkIHNwcml0ZXMgb3IgdG8gdGhlIGhpZGRlbiBzcHJpdGVzXHJcbiAgICAgICAgY29uc3Qgc3BsaXRSZXZlYWxlZCA9IHJldmVhbERpc3RhbmNlIDwgaGlkZURpc3RhbmNlO1xyXG4gICAgICAgIGxldCBzcGxpdFNoYXJlZDogYm9vbGVhbjtcclxuICAgICAgICBsZXQgc3BlY2lhbFNwbGl0OiBib29sZWFuO1xyXG4gICAgICAgIGxldCBzdGFydDogbnVtYmVyO1xyXG4gICAgICAgIGxldCBlbmQ6IG51bWJlcjtcclxuICAgICAgICBpZiAoc3BsaXRSZXZlYWxlZCkge1xyXG4gICAgICAgICAgICBpZiAobGVmdE1vdmluZ1Nwcml0ZS50YXJnZXQueCA8IFZQLmNhbnZhcy53aWR0aCAvIDIgJiZcclxuICAgICAgICAgICAgICAgIFZQLmNhbnZhcy53aWR0aCAvIDIgPCByaWdodE1vdmluZ1Nwcml0ZS50YXJnZXQueCArIFZQLnNwcml0ZVdpZHRoXHJcbiAgICAgICAgICAgICkge1xyXG4gICAgICAgICAgICAgICAgc3BsaXRJbmRleCA9IHNoYXJlQ291bnQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIHNwbGl0U2hhcmVkID0gKGxlZnRNb3ZpbmdTcHJpdGUudGFyZ2V0LnggKyByaWdodE1vdmluZ1Nwcml0ZS50YXJnZXQueCArIFZQLnNwcml0ZVdpZHRoKSAvIDIgPCBWUC5jYW52YXMud2lkdGggLyAyO1xyXG4gICAgICAgICAgICBpZiAoc3BsaXRTaGFyZWQpIHtcclxuICAgICAgICAgICAgICAgIHN0YXJ0ID0gMDtcclxuICAgICAgICAgICAgICAgIGVuZCA9IHNoYXJlQ291bnQ7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBzdGFydCA9IHNoYXJlQ291bnQ7XHJcbiAgICAgICAgICAgICAgICBlbmQgPSByZXZlYWxDb3VudDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHNwbGl0U2hhcmVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHNwZWNpYWxTcGxpdCA9IGZhbHNlO1xyXG4gICAgICAgICAgICBzdGFydCA9IHJldmVhbENvdW50O1xyXG4gICAgICAgICAgICBlbmQgPSByZXNlcnZlZFNwcml0ZXNBbmRDYXJkcy5sZW5ndGg7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoc3BsaXRJbmRleCA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIGxldCBsZWZ0SW5kZXg6IG51bWJlciB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgbGV0IHJpZ2h0SW5kZXg6IG51bWJlciB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IHN0YXJ0OyBpIDwgZW5kOyArK2kpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc2VydmVkU3ByaXRlID0gcmVzZXJ2ZWRTcHJpdGVzQW5kQ2FyZHNbaV0/LlswXTtcclxuICAgICAgICAgICAgICAgIGlmIChyZXNlcnZlZFNwcml0ZSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICAgICAgICAgICAgICAgIGlmIChsZWZ0TW92aW5nU3ByaXRlLnRhcmdldC54IDwgcmVzZXJ2ZWRTcHJpdGUudGFyZ2V0LnggJiZcclxuICAgICAgICAgICAgICAgICAgICByZXNlcnZlZFNwcml0ZS50YXJnZXQueCA8IHJpZ2h0TW92aW5nU3ByaXRlLnRhcmdldC54XHJcbiAgICAgICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAobGVmdEluZGV4ID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGVmdEluZGV4ID0gaTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgcmlnaHRJbmRleCA9IGk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICAgICAgaWYgKGxlZnRJbmRleCAhPT0gdW5kZWZpbmVkICYmIHJpZ2h0SW5kZXggIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgbGVmdFJlc2VydmVkU3ByaXRlID0gcmVzZXJ2ZWRTcHJpdGVzQW5kQ2FyZHNbbGVmdEluZGV4XT8uWzBdO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcmlnaHRSZXNlcnZlZFNwcml0ZSA9IHJlc2VydmVkU3ByaXRlc0FuZENhcmRzW3JpZ2h0SW5kZXhdPy5bMF07XHJcbiAgICAgICAgICAgICAgICBpZiAobGVmdFJlc2VydmVkU3ByaXRlID09PSB1bmRlZmluZWQgfHwgcmlnaHRSZXNlcnZlZFNwcml0ZSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGxlZnRHYXAgPSBsZWZ0UmVzZXJ2ZWRTcHJpdGUudGFyZ2V0LnggLSBsZWZ0TW92aW5nU3ByaXRlLnRhcmdldC54O1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcmlnaHRHYXAgPSByaWdodE1vdmluZ1Nwcml0ZS50YXJnZXQueCAtIHJpZ2h0UmVzZXJ2ZWRTcHJpdGUudGFyZ2V0Lng7XHJcbiAgICAgICAgICAgICAgICBpZiAobGVmdEdhcCA8IHJpZ2h0R2FwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc3BsaXRJbmRleCA9IGxlZnRJbmRleDtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc3BsaXRJbmRleCA9IHJpZ2h0SW5kZXggKyAxO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIGlmIChzcGxpdEluZGV4ID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgLy8gbm8gb3ZlcmxhcHBlZCBzcHJpdGVzLCBzbyB0aGUgaW5kZXggaXMgdGhlIGZpcnN0IHJlc2VydmVkIHNwcml0ZSB0byB0aGUgcmlnaHQgb2YgdGhlIG1vdmluZyBzcHJpdGVzXHJcbiAgICAgICAgICAgIGZvciAoc3BsaXRJbmRleCA9IHN0YXJ0OyBzcGxpdEluZGV4IDwgZW5kOyArK3NwbGl0SW5kZXgpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc2VydmVkU3ByaXRlID0gcmVzZXJ2ZWRTcHJpdGVzQW5kQ2FyZHNbc3BsaXRJbmRleF0/LlswXTtcclxuICAgICAgICAgICAgICAgIGlmIChyZXNlcnZlZFNwcml0ZSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICAgICAgICAgICAgICAgIGlmIChyaWdodE1vdmluZ1Nwcml0ZS50YXJnZXQueCA8IHJlc2VydmVkU3ByaXRlLnRhcmdldC54KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGFkanVzdCBzaGFyZSBjb3VudFxyXG4gICAgICAgIGlmIChzcGxpdEluZGV4IDwgc2hhcmVDb3VudCB8fCBzcGxpdEluZGV4ID09PSBzaGFyZUNvdW50ICYmIHNwbGl0U2hhcmVkKSB7XHJcbiAgICAgICAgICAgIHNoYXJlQ291bnQgKz0gbW92aW5nU3ByaXRlc0FuZENhcmRzLmxlbmd0aDtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coYHNldCBzaGFyZUNvdW50IHRvICR7c2hhcmVDb3VudH1gKTtcclxuICAgICAgICB9XHJcbiAgICBcclxuICAgICAgICAvLyBhZGp1c3QgcmV2ZWFsIGNvdW50XHJcbiAgICAgICAgaWYgKHNwbGl0SW5kZXggPCByZXZlYWxDb3VudCB8fCBzcGxpdEluZGV4ID09PSByZXZlYWxDb3VudCAmJiBzcGxpdFJldmVhbGVkKSB7XHJcbiAgICAgICAgICAgIHJldmVhbENvdW50ICs9IG1vdmluZ1Nwcml0ZXNBbmRDYXJkcy5sZW5ndGg7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBzZXQgcmV2ZWFsQ291bnQgdG8gJHtyZXZlYWxDb3VudH1gKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gYWRqdXN0IHNlbGVjdGVkIGluZGljZXNcclxuICAgIC8vIG1vZGlmeWluZyBhY3Rpb24uY2FyZEluZGV4IGRpcmVjdGx5IGluIHRoZSBsb29wIHdvdWxkIGNhdXNlIHVzIHRvXHJcbiAgICAvLyBjaGVjayBpdHMgYWRqdXN0ZWQgdmFsdWUgYWdhaW5zdCBvbGQgaW5kaWNlcywgd2hpY2ggaXMgaW5jb3JyZWN0XHJcbiAgICBsZXQgbmV3Q2FyZEluZGV4ID0gYWN0aW9uLmNhcmRJbmRleDtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgU3RhdGUuc2VsZWN0ZWRJbmRpY2VzLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgaWYgKGFjdGlvbi5jYXJkSW5kZXggPT09IFN0YXRlLnNlbGVjdGVkSW5kaWNlc1tpXSkge1xyXG4gICAgICAgICAgICBuZXdDYXJkSW5kZXggPSBzcGxpdEluZGV4ICsgaTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIFN0YXRlLnNlbGVjdGVkSW5kaWNlc1tpXSA9IHNwbGl0SW5kZXggKyBpO1xyXG4gICAgfVxyXG5cclxuICAgIGFjdGlvbi5jYXJkSW5kZXggPSBuZXdDYXJkSW5kZXg7XHJcblxyXG4gICAgLy8gZHJhZyBhbGwgc2VsZWN0ZWQgY2FyZHMgYXMgYSBncm91cCBhcm91bmQgdGhlIGNhcmQgdW5kZXIgdGhlIG1vdXNlIHBvc2l0aW9uXHJcbiAgICBmb3IgKGNvbnN0IHNlbGVjdGVkSW5kZXggb2YgU3RhdGUuc2VsZWN0ZWRJbmRpY2VzKSB7XHJcbiAgICAgICAgY29uc3QgbW92aW5nU3ByaXRlQW5kQ2FyZCA9IG1vdmluZ1Nwcml0ZXNBbmRDYXJkc1tzZWxlY3RlZEluZGV4IC0gc3BsaXRJbmRleF07XHJcbiAgICAgICAgaWYgKG1vdmluZ1Nwcml0ZUFuZENhcmQgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICAgICAgY29uc3QgW21vdmluZ1Nwcml0ZSwgbW92aW5nQ2FyZF0gPSBtb3ZpbmdTcHJpdGVBbmRDYXJkO1xyXG4gICAgICAgIG1vdmluZ1Nwcml0ZS50YXJnZXQgPSBtb3VzZU1vdmVQb3NpdGlvblxyXG4gICAgICAgICAgICAuYWRkKG1vdXNlUG9zaXRpb25Ub1Nwcml0ZVBvc2l0aW9uKVxyXG4gICAgICAgICAgICAuYWRkKG5ldyBWZWN0b3IoKHNlbGVjdGVkSW5kZXggLSBhY3Rpb24uY2FyZEluZGV4KSAqIFZQLnNwcml0ZUdhcCwgMCkpO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGByZWFycmFuZ2VkIHNwcml0ZSAke3NlbGVjdGVkSW5kZXh9YCk7XHJcbiAgICB9XHJcblxyXG4gICAgU3RhdGUuc2V0U3ByaXRlVGFyZ2V0cyhcclxuICAgICAgICBnYW1lU3RhdGUsXHJcbiAgICAgICAgcmVzZXJ2ZWRTcHJpdGVzQW5kQ2FyZHMsXHJcbiAgICAgICAgbW92aW5nU3ByaXRlc0FuZENhcmRzLFxyXG4gICAgICAgIHNoYXJlQ291bnQsXHJcbiAgICAgICAgcmV2ZWFsQ291bnQsXHJcbiAgICAgICAgc3BsaXRJbmRleCxcclxuICAgICAgICBhY3Rpb24udHlwZSA9PT0gXCJSZXR1cm5Ub0RlY2tcIlxyXG4gICAgKTtcclxufSIsImltcG9ydCAqIGFzIExpYiBmcm9tIFwiLi4vbGliXCI7XHJcblxyXG5jb25zdCBwbGF5ZXJOYW1lRWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwbGF5ZXJOYW1lJyk7XHJcbmNvbnN0IHBsYXllck5hbWVWYWx1ZSA9IExpYi5nZXRDb29raWUoJ3BsYXllck5hbWUnKTtcclxuaWYgKHBsYXllck5hbWVFbGVtZW50ICE9PSBudWxsICYmIHBsYXllck5hbWVWYWx1ZSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAoPEhUTUxJbnB1dEVsZW1lbnQ+cGxheWVyTmFtZUVsZW1lbnQpLnZhbHVlID0gZGVjb2RlVVJJKHBsYXllck5hbWVWYWx1ZSk7XHJcbn1cclxuXHJcbmNvbnN0IGdhbWVJZEVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZ2FtZUlkJyk7XHJcbmNvbnN0IGdhbWVJZFZhbHVlID0gTGliLmdldENvb2tpZSgnZ2FtZUlkJyk7XHJcbmlmIChnYW1lSWRFbGVtZW50ICE9PSBudWxsICYmIGdhbWVJZFZhbHVlICE9PSB1bmRlZmluZWQpIHtcclxuICAgICg8SFRNTElucHV0RWxlbWVudD5nYW1lSWRFbGVtZW50KS52YWx1ZSA9IGdhbWVJZFZhbHVlO1xyXG59XHJcbiIsImltcG9ydCB7IHJhbmRvbSB9IGZyb20gJ25hbm9pZCc7XHJcblxyXG5pbXBvcnQgKiBhcyBMaWIgZnJvbSAnLi4vbGliJztcclxuaW1wb3J0ICogYXMgU3RhdGUgZnJvbSAnLi9zdGF0ZSc7XHJcbmltcG9ydCAqIGFzIElucHV0IGZyb20gJy4vaW5wdXQnO1xyXG5pbXBvcnQgKiBhcyBWUCBmcm9tICcuL3ZpZXctcGFyYW1zJztcclxuaW1wb3J0IFZlY3RvciBmcm9tICcuL3ZlY3Rvcic7XHJcblxyXG5jb25zdCBkZWNrRGVhbER1cmF0aW9uID0gMTAwMDtcclxubGV0IGRlY2tEZWFsVGltZTogbnVtYmVyIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xyXG5sZXQgY3VycmVudFRpbWU6IG51bWJlciB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcclxuXHJcbmNvbnN0IGZyYW1lSW50ZXJ2YWwgPSAxMDAwIC8gMTA7XHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZW5kZXIodGltZTogbnVtYmVyKSB7XHJcbiAgICBpZiAoY3VycmVudFRpbWUgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIGN1cnJlbnRUaW1lID0gdGltZTtcclxuICAgIH1cclxuXHJcbiAgICB3aGlsZSAoU3RhdGUuZ2FtZVN0YXRlID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICBhd2FpdCBMaWIuZGVsYXkoMTAwKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBkZWx0YVRpbWUgPSB0aW1lIC0gY3VycmVudFRpbWU7XHJcbiAgICBpZiAoZGVsdGFUaW1lIDwgZnJhbWVJbnRlcnZhbCkge1xyXG4gICAgICAgIGF3YWl0IExpYi5kZWxheShmcmFtZUludGVydmFsIC0gZGVsdGFUaW1lKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgY3VycmVudFRpbWUgPSB0aW1lO1xyXG5cclxuICAgICAgICBjb25zdCB1bmxvY2sgPSBhd2FpdCBTdGF0ZS5sb2NrKCk7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgLy8gY2xlYXIgdGhlIHNjcmVlblxyXG4gICAgICAgICAgICBWUC5jb250ZXh0LmNsZWFyUmVjdCgwLCAwLCBWUC5jYW52YXMud2lkdGgsIFZQLmNhbnZhcy5oZWlnaHQpO1xyXG5cclxuICAgICAgICAgICAgcmVuZGVyQmFzaWNzKFN0YXRlLmdhbWVJZCwgU3RhdGUucGxheWVyTmFtZSk7XHJcbiAgICAgICAgICAgIHJlbmRlckRlY2sodGltZSwgZGVsdGFUaW1lLCBTdGF0ZS5nYW1lU3RhdGUuZGVja0NvdW50KTtcclxuICAgICAgICAgICAgcmVuZGVyT3RoZXJQbGF5ZXJzKGRlbHRhVGltZSwgU3RhdGUuZ2FtZVN0YXRlKTtcclxuICAgICAgICAgICAgcmVuZGVyUGxheWVyKGRlbHRhVGltZSwgU3RhdGUuZ2FtZVN0YXRlKTtcclxuICAgICAgICAgICAgcmVuZGVyQnV0dG9ucyh0aW1lLCBTdGF0ZS5nYW1lU3RhdGUpO1xyXG4gICAgICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgICAgIHVubG9jaygpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKHJlbmRlcik7XHJcbn1cclxuLypcclxuY29uc3Qgd2lnZ2xlcyA9IG5ldyBNYXA8c3RyaW5nLCBbc3RyaW5nLCBudW1iZXJbXSwgbnVtYmVyXT4oKTtcclxuY29uc3Qgd2lnZ2xlSW50ZXJ2YWwgPSAxMDA7XHJcbmZ1bmN0aW9uIHdpZ2dsZVRleHQoczogc3RyaW5nLCB4OiBudW1iZXIsIHk6IG51bWJlcikge1xyXG4gICAgaWYgKGN1cnJlbnRUaW1lID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgbG93ZXIgPSBzLnRvTG93ZXJDYXNlKCk7XHJcbiAgICBsZXQgd2lnZ2xlID0gd2lnZ2xlcy5nZXQobG93ZXIpO1xyXG4gICAgaWYgKHdpZ2dsZSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgY29uc3QgdXBwZXIgPSBzLnRvVXBwZXJDYXNlKCk7XHJcbiAgICAgICAgY29uc3Qgd2lkdGhzID0gW107XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsb3dlci5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgICAgICB3aWR0aHMucHVzaCgoXHJcbiAgICAgICAgICAgICAgICBWUC5jb250ZXh0Lm1lYXN1cmVUZXh0KDxzdHJpbmc+bG93ZXJbaV0pLndpZHRoICtcclxuICAgICAgICAgICAgICAgIFZQLmNvbnRleHQubWVhc3VyZVRleHQoPHN0cmluZz51cHBlcltpXSkud2lkdGgpIC8gMik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB3aWdnbGUgPSBbcywgd2lkdGhzLCBjdXJyZW50VGltZV07XHJcbiAgICAgICAgd2lnZ2xlcy5zZXQobG93ZXIsIHdpZ2dsZSk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgW3NzLCB3cywgdF0gPSB3aWdnbGU7XHJcbiAgICBzID0gXCJcIjtcclxuICAgIGxldCB0dCA9IHQ7XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNzLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgbGV0IGMgPSA8c3RyaW5nPnNzW2ldO1xyXG4gICAgICAgIGlmICh0ICsgd2lnZ2xlSW50ZXJ2YWwgPCBjdXJyZW50VGltZSkge1xyXG4gICAgICAgICAgICB0dCA9IGN1cnJlbnRUaW1lO1xyXG4gICAgICAgICAgICBpZiAoPG51bWJlcj5yYW5kb20oMSlbMF0gPCAxMjcpIHtcclxuICAgICAgICAgICAgICAgIGMgPSBjLnRvVXBwZXJDYXNlKCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBjID0gYy50b0xvd2VyQ2FzZSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzICs9IGM7XHJcbiAgICAgICAgVlAuY29udGV4dC5maWxsVGV4dChjLCB4ICs9IDxudW1iZXI+d3NbaV0sIHkpO1xyXG4gICAgfVxyXG5cclxuICAgIHdpZ2dsZXMuc2V0KGxvd2VyLCBbcywgd3MsIHR0XSk7XHJcbn1cclxuKi9cclxuZnVuY3Rpb24gcmVuZGVyQmFzaWNzKGdhbWVJZDogc3RyaW5nLCBwbGF5ZXJOYW1lOiBzdHJpbmcpIHtcclxuICAgIFZQLmNvbnRleHQuZmlsbFN0eWxlID0gJyMwMDAwMDBmZic7XHJcbiAgICBWUC5jb250ZXh0LnRleHRBbGlnbiA9ICdsZWZ0JztcclxuICAgIFZQLmNvbnRleHQuZm9udCA9IGAke1ZQLnNwcml0ZUhlaWdodCAvIDR9cHggU3VnYXJsaWtlYDtcclxuICAgIFZQLmNvbnRleHQuZmlsbFN0eWxlID0gJ2ZvbnQtdmFyaWFudC1lYXN0LWFzaWFuOiBmdWxsLXdpZHRoJztcclxuXHJcbiAgICBWUC5jb250ZXh0LnRleHRCYXNlbGluZSA9ICd0b3AnO1xyXG4gICAgVlAuY29udGV4dC5maWxsVGV4dChgR2FtZTogJHtnYW1lSWR9YCwgMCwgMSAqIFZQLnBpeGVsc1BlclBlcmNlbnQpO1xyXG5cclxuICAgIFZQLmNvbnRleHQudGV4dEJhc2VsaW5lID0gJ2JvdHRvbSc7XHJcbiAgICBWUC5jb250ZXh0LmZpbGxUZXh0KGBZb3VyIG5hbWUgaXM6ICR7cGxheWVyTmFtZX1gLCAwLCBWUC5jYW52YXMuaGVpZ2h0KTtcclxuXHJcbiAgICBWUC5jb250ZXh0LnNldExpbmVEYXNoKFs0LCAxXSk7XHJcbiAgICBWUC5jb250ZXh0LnN0cm9rZVJlY3QoVlAuc3ByaXRlSGVpZ2h0LCBWUC5zcHJpdGVIZWlnaHQsIFZQLmNhbnZhcy53aWR0aCAtIDIgKiBWUC5zcHJpdGVIZWlnaHQsIFZQLmNhbnZhcy5oZWlnaHQgLSAyICogVlAuc3ByaXRlSGVpZ2h0KTtcclxufVxyXG5cclxuZnVuY3Rpb24gcmVuZGVyRGVjayh0aW1lOiBudW1iZXIsIGRlbHRhVGltZTogbnVtYmVyLCBkZWNrQ291bnQ6IG51bWJlcikge1xyXG4gICAgVlAuY29udGV4dC5zYXZlKCk7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIGlmIChkZWNrRGVhbFRpbWUgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICBkZWNrRGVhbFRpbWUgPSB0aW1lO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBTdGF0ZS5kZWNrU3ByaXRlcy5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgICAgICBjb25zdCBkZWNrU3ByaXRlID0gU3RhdGUuZGVja1Nwcml0ZXNbaV07XHJcbiAgICAgICAgICAgIGlmIChkZWNrU3ByaXRlID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG5cclxuICAgICAgICAgICAgaWYgKGkgPT09IGRlY2tDb3VudCAtIDEgJiZcclxuICAgICAgICAgICAgICAgIElucHV0LmFjdGlvbiAhPT0gXCJOb25lXCIgJiZcclxuICAgICAgICAgICAgICAgIElucHV0LmFjdGlvbiAhPT0gXCJTb3J0QnlTdWl0XCIgJiZcclxuICAgICAgICAgICAgICAgIElucHV0LmFjdGlvbiAhPT0gXCJTb3J0QnlSYW5rXCIgJiZcclxuICAgICAgICAgICAgICAgIElucHV0LmFjdGlvbiAhPT0gXCJXYWl0XCIgJiZcclxuICAgICAgICAgICAgICAgIElucHV0LmFjdGlvbiAhPT0gXCJQcm9jZWVkXCIgJiZcclxuICAgICAgICAgICAgICAgIElucHV0LmFjdGlvbiAhPT0gXCJEZXNlbGVjdFwiICYmIChcclxuICAgICAgICAgICAgICAgIElucHV0LmFjdGlvbi50eXBlID09PSBcIkRyYXdGcm9tRGVja1wiIHx8XHJcbiAgICAgICAgICAgICAgICBJbnB1dC5hY3Rpb24udHlwZSA9PT0gXCJXYWl0aW5nRm9yTmV3Q2FyZFwiXHJcbiAgICAgICAgICAgICkpIHtcclxuICAgICAgICAgICAgICAgIC8vIHNldCBpbiBvbm1vdXNlbW92ZVxyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRpbWUgLSBkZWNrRGVhbFRpbWUgPCBpICogZGVja0RlYWxEdXJhdGlvbiAvIGRlY2tDb3VudCkge1xyXG4gICAgICAgICAgICAgICAgLy8gY2FyZCBub3QgeWV0IGRlYWx0OyBrZWVwIHRvcCBsZWZ0XHJcbiAgICAgICAgICAgICAgICBkZWNrU3ByaXRlLnBvc2l0aW9uID0gbmV3IFZlY3RvcigtVlAuc3ByaXRlV2lkdGgsIC1WUC5zcHJpdGVIZWlnaHQpO1xyXG4gICAgICAgICAgICAgICAgZGVja1Nwcml0ZS50YXJnZXQgPSBuZXcgVmVjdG9yKC1WUC5zcHJpdGVXaWR0aCwgLVZQLnNwcml0ZUhlaWdodCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBkZWNrU3ByaXRlLnRhcmdldCA9IG5ldyBWZWN0b3IoXHJcbiAgICAgICAgICAgICAgICAgICAgVlAuY2FudmFzLndpZHRoIC8gMiAtIFZQLnNwcml0ZVdpZHRoIC8gMiAtIChpIC0gZGVja0NvdW50IC8gMikgKiBWUC5zcHJpdGVEZWNrR2FwLFxyXG4gICAgICAgICAgICAgICAgICAgIFZQLmNhbnZhcy5oZWlnaHQgLyAyIC0gVlAuc3ByaXRlSGVpZ2h0IC8gMlxyXG4gICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZGVja1Nwcml0ZS5hbmltYXRlKGRlbHRhVGltZSk7XHJcbiAgICAgICAgfVxyXG4gICAgfSBmaW5hbGx5IHtcclxuICAgICAgICBWUC5jb250ZXh0LnJlc3RvcmUoKTtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gcmVuZGVyT3RoZXJQbGF5ZXJzKGRlbHRhVGltZTogbnVtYmVyLCBnYW1lU3RhdGU6IExpYi5HYW1lU3RhdGUpIHtcclxuICAgIFZQLmNvbnRleHQuc2F2ZSgpO1xyXG4gICAgdHJ5IHtcclxuICAgICAgICBWUC5jb250ZXh0LnNldFRyYW5zZm9ybShWUC5nZXRUcmFuc2Zvcm1Gb3JQbGF5ZXIoMSkpO1xyXG4gICAgICAgIC8vVlAuY29udGV4dC50cmFuc2xhdGUoMCwgKFZQLmNhbnZhcy53aWR0aCArIFZQLmNhbnZhcy5oZWlnaHQpIC8gMik7XHJcbiAgICAgICAgLy9WUC5jb250ZXh0LnJvdGF0ZSgtTWF0aC5QSSAvIDIpO1xyXG4gICAgICAgIHJlbmRlck90aGVyUGxheWVyKGRlbHRhVGltZSwgZ2FtZVN0YXRlLCAoZ2FtZVN0YXRlLnBsYXllckluZGV4ICsgMSkgJSA0KTtcclxuICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgVlAuY29udGV4dC5yZXN0b3JlKCk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIFZQLmNvbnRleHQuc2F2ZSgpO1xyXG4gICAgdHJ5IHtcclxuICAgICAgICBWUC5jb250ZXh0LnNldFRyYW5zZm9ybShWUC5nZXRUcmFuc2Zvcm1Gb3JQbGF5ZXIoMikpO1xyXG4gICAgICAgIHJlbmRlck90aGVyUGxheWVyKGRlbHRhVGltZSwgZ2FtZVN0YXRlLCAoZ2FtZVN0YXRlLnBsYXllckluZGV4ICsgMikgJSA0KTtcclxuICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgVlAuY29udGV4dC5yZXN0b3JlKCk7XHJcbiAgICB9XHJcblxyXG4gICAgVlAuY29udGV4dC5zYXZlKCk7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIFZQLmNvbnRleHQuc2V0VHJhbnNmb3JtKFZQLmdldFRyYW5zZm9ybUZvclBsYXllcigzKSk7XHJcbiAgICAgICAgLy9WUC5jb250ZXh0LnRyYW5zbGF0ZShWUC5jYW52YXMud2lkdGgsIChWUC5jYW52YXMuaGVpZ2h0IC0gVlAuY2FudmFzLndpZHRoKSAvIDIpO1xyXG4gICAgICAgIC8vVlAuY29udGV4dC5yb3RhdGUoTWF0aC5QSSAvIDIpO1xyXG4gICAgICAgIHJlbmRlck90aGVyUGxheWVyKGRlbHRhVGltZSwgZ2FtZVN0YXRlLCAoZ2FtZVN0YXRlLnBsYXllckluZGV4ICsgMykgJSA0KTtcclxuICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgVlAuY29udGV4dC5yZXN0b3JlKCk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbmRlck90aGVyUGxheWVyKGRlbHRhVGltZTogbnVtYmVyLCBnYW1lU3RhdGU6IExpYi5HYW1lU3RhdGUsIHBsYXllckluZGV4OiBudW1iZXIpIHtcclxuICAgIGNvbnN0IHBsYXllciA9IGdhbWVTdGF0ZS5vdGhlclBsYXllcnNbcGxheWVySW5kZXhdO1xyXG4gICAgaWYgKHBsYXllciA9PT0gdW5kZWZpbmVkIHx8IHBsYXllciA9PT0gbnVsbCkgcmV0dXJuO1xyXG5cclxuICAgIGNvbnN0IGZhY2VTcHJpdGVzID0gU3RhdGUuZmFjZVNwcml0ZXNGb3JQbGF5ZXJbcGxheWVySW5kZXhdID8/IFtdO1xyXG4gICAgbGV0IGkgPSAwO1xyXG4gICAgZm9yIChjb25zdCBmYWNlU3ByaXRlIG9mIGZhY2VTcHJpdGVzKSB7XHJcbiAgICAgICAgaWYgKGkgPCBwbGF5ZXIuc2hhcmVDb3VudCkge1xyXG4gICAgICAgICAgICBmYWNlU3ByaXRlLnRhcmdldCA9IG5ldyBWZWN0b3IoXHJcbiAgICAgICAgICAgICAgICBWUC5jYW52YXMud2lkdGggLyAyICsgKHBsYXllci5zaGFyZUNvdW50IC0gaSkgKiBWUC5zcHJpdGVHYXAsXHJcbiAgICAgICAgICAgICAgICBWUC5zcHJpdGVIZWlnaHQgKyBWUC5zcHJpdGVHYXBcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBmYWNlU3ByaXRlLnRhcmdldCA9IG5ldyBWZWN0b3IoXHJcbiAgICAgICAgICAgICAgICBWUC5jYW52YXMud2lkdGggLyAyIC0gVlAuc3ByaXRlV2lkdGggLSAoaSAtIHBsYXllci5zaGFyZUNvdW50KSAqIFZQLnNwcml0ZUdhcCxcclxuICAgICAgICAgICAgICAgIFZQLnNwcml0ZUhlaWdodFxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZmFjZVNwcml0ZS5hbmltYXRlKGRlbHRhVGltZSk7XHJcblxyXG4gICAgICAgICsraTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBiYWNrU3ByaXRlcyA9IFN0YXRlLmJhY2tTcHJpdGVzRm9yUGxheWVyW3BsYXllckluZGV4XSA/PyBbXTtcclxuICAgIGkgPSAwO1xyXG4gICAgZm9yIChjb25zdCBiYWNrU3ByaXRlIG9mIGJhY2tTcHJpdGVzKSB7XHJcbiAgICAgICAgYmFja1Nwcml0ZS50YXJnZXQgPSBuZXcgVmVjdG9yKFZQLmNhbnZhcy53aWR0aCAvIDIgLSBWUC5zcHJpdGVXaWR0aCAvIDIgKyAoaSAtIGJhY2tTcHJpdGVzLmxlbmd0aCAvIDIpICogVlAuc3ByaXRlR2FwLCAwKTtcclxuICAgICAgICBiYWNrU3ByaXRlLmFuaW1hdGUoZGVsdGFUaW1lKTtcclxuXHJcbiAgICAgICAgKytpO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBWUC5jb250ZXh0LmZpbGxTdHlsZSA9ICcjMDAwMDAwZmYnO1xyXG4gICAgVlAuY29udGV4dC5mb250ID0gYCR7VlAuc3ByaXRlSGVpZ2h0IC8gMn1weCBTdWdhcmxpa2VgO1xyXG4gICAgVlAuY29udGV4dC50ZXh0QmFzZWxpbmUgPSBcIm1pZGRsZVwiO1xyXG4gICAgVlAuY29udGV4dC50ZXh0QWxpZ24gPSBcImNlbnRlclwiO1xyXG4gICAgVlAuY29udGV4dC5maWxsVGV4dChwbGF5ZXIubmFtZSwgVlAuY2FudmFzLndpZHRoIC8gMiwgVlAuc3ByaXRlSGVpZ2h0IC8gMik7XHJcbn1cclxuXHJcbi8vIHJldHVybnMgdGhlIGFkanVzdGVkIHJldmVhbCBpbmRleFxyXG5mdW5jdGlvbiByZW5kZXJQbGF5ZXIoZGVsdGFUaW1lOiBudW1iZXIsIGdhbWVTdGF0ZTogTGliLkdhbWVTdGF0ZSkge1xyXG4gICAgY29uc3Qgc3ByaXRlcyA9IFN0YXRlLmZhY2VTcHJpdGVzRm9yUGxheWVyW2dhbWVTdGF0ZS5wbGF5ZXJJbmRleF07XHJcbiAgICBpZiAoc3ByaXRlcyA9PT0gdW5kZWZpbmVkKSByZXR1cm47XHJcblxyXG4gICAgbGV0IGkgPSAwO1xyXG4gICAgZm9yIChjb25zdCBzcHJpdGUgb2Ygc3ByaXRlcykge1xyXG4gICAgICAgIHNwcml0ZS5hbmltYXRlKGRlbHRhVGltZSk7XHJcblxyXG4gICAgICAgIGlmIChMaWIuYmluYXJ5U2VhcmNoTnVtYmVyKFN0YXRlLnNlbGVjdGVkSW5kaWNlcywgaSsrKSA+PSAwKSB7XHJcbiAgICAgICAgICAgIFZQLmNvbnRleHQuZmlsbFN0eWxlID0gJyMwMDgwODA0MCc7XHJcbiAgICAgICAgICAgIFZQLmNvbnRleHQuZmlsbFJlY3Qoc3ByaXRlLnBvc2l0aW9uLngsIHNwcml0ZS5wb3NpdGlvbi55LCBWUC5zcHJpdGVXaWR0aCwgVlAuc3ByaXRlSGVpZ2h0KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbmRlckJ1dHRvbnModGltZTogbnVtYmVyLCBnYW1lU3RhdGU6IExpYi5HYW1lU3RhdGUpIHtcclxuICAgIFZQLmNvbnRleHQuc2F2ZSgpO1xyXG4gICAgdHJ5IHtcclxuICAgICAgICAvLyBibHVyIGltYWdlIGJlaGluZFxyXG4gICAgICAgIC8vc3RhY2tCbHVyQ2FudmFzUkdCQSgnY2FudmFzJywgeCwgeSwgY2FudmFzLndpZHRoIC0geCwgY2FudmFzLmhlaWdodCAtIHksIDE2KTtcclxuICAgICAgICAvKlxyXG4gICAgICAgIGNvbnN0IHggPSBWUC5zb3J0QnlTdWl0Qm91bmRzWzBdLnggLSA0ICogVlAucGl4ZWxzUGVyQ007XHJcbiAgICAgICAgY29uc3QgeSA9IFZQLnNvcnRCeVN1aXRCb3VuZHNbMF0ueTtcclxuICAgICAgICBWUC5jb250ZXh0LmZpbGxTdHlsZSA9ICcjMDBmZmZmNzcnO1xyXG4gICAgICAgIFZQLmNvbnRleHQuZmlsbFJlY3QoeCwgeSwgVlAuY2FudmFzLndpZHRoIC0geCwgVlAuY2FudmFzLmhlaWdodCAtIHkpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIFZQLmNvbnRleHQuZmlsbFN0eWxlID0gJyMwMDAwMDBmZic7XHJcbiAgICAgICAgVlAuY29udGV4dC5mb250ID0gJzEuNWNtIFN1Z2FybGlrZSc7XHJcbiAgICAgICAgVlAuY29udGV4dC5maWxsVGV4dCgnU09SVCcsIHggKyAwLjI1ICogVlAucGl4ZWxzUGVyQ00sIHkgKyAyLjI1ICogVlAucGl4ZWxzUGVyQ00pO1xyXG5cclxuICAgICAgICBWUC5jb250ZXh0LmZvbnQgPSAnM2NtIFN1Z2FybGlrZSc7XHJcbiAgICAgICAgVlAuY29udGV4dC5maWxsVGV4dCgneycsIHggKyAzICogVlAucGl4ZWxzUGVyQ00sIHkgKyAyLjc1ICogVlAucGl4ZWxzUGVyQ00pO1xyXG5cclxuICAgICAgICBWUC5jb250ZXh0LmZvbnQgPSAnMS41Y20gU3VnYXJsaWtlJztcclxuICAgICAgICBWUC5jb250ZXh0LmZpbGxUZXh0KCdTVUlUJywgVlAuc29ydEJ5U3VpdEJvdW5kc1swXS54LCBWUC5zb3J0QnlTdWl0Qm91bmRzWzFdLnkpO1xyXG5cclxuICAgICAgICBWUC5jb250ZXh0LmZvbnQgPSAnMS41Y20gU3VnYXJsaWtlJztcclxuICAgICAgICBWUC5jb250ZXh0LmZpbGxUZXh0KCdSQU5LJywgVlAuc29ydEJ5UmFua0JvdW5kc1swXS54LCBWUC5zb3J0QnlSYW5rQm91bmRzWzFdLnkpO1xyXG4gICAgICAgICovXHJcbiAgICAgICAgLy9jb250ZXh0LmZpbGxTdHlsZSA9ICcjZmYwMDAwNzcnO1xyXG4gICAgICAgIC8vY29udGV4dC5maWxsUmVjdChWUC5zb3J0QnlTdWl0Qm91bmRzWzBdLngsIFZQLnNvcnRCeVN1aXRCb3VuZHNbMF0ueSxcclxuICAgICAgICAgICAgLy9zb3J0QnlTdWl0Qm91bmRzWzFdLnggLSBzb3J0QnlTdWl0Qm91bmRzWzBdLngsIHNvcnRCeVN1aXRCb3VuZHNbMV0ueSAtIHNvcnRCeVN1aXRCb3VuZHNbMF0ueSk7XHJcblxyXG4gICAgICAgIC8vY29udGV4dC5maWxsU3R5bGUgPSAnIzAwMDBmZjc3JztcclxuICAgICAgICAvL2NvbnRleHQuZmlsbFJlY3Qoc29ydEJ5UmFua0JvdW5kc1swXS54LCBzb3J0QnlSYW5rQm91bmRzWzBdLnksXHJcbiAgICAgICAgICAgIC8vc29ydEJ5UmFua0JvdW5kc1sxXS54IC0gc29ydEJ5UmFua0JvdW5kc1swXS54LCBzb3J0QnlSYW5rQm91bmRzWzFdLnkgLSBzb3J0QnlSYW5rQm91bmRzWzBdLnkpO1xyXG5cclxuICAgICAgICAvKmlmIChnYW1lU3RhdGUucGxheWVyU3RhdGUgPT09IFwiUHJvY2VlZFwiIHx8IGdhbWVTdGF0ZS5wbGF5ZXJTdGF0ZSA9PT0gXCJXYWl0XCIpIHtcclxuICAgICAgICAgICAgVlAuY29udGV4dC50ZXh0QmFzZWxpbmUgPSAndG9wJztcclxuXHJcbiAgICAgICAgICAgIGlmIChnYW1lU3RhdGUucGxheWVyU3RhdGUgPT09IFwiV2FpdFwiKSB7XHJcbiAgICAgICAgICAgICAgICBWUC5jb250ZXh0LmZpbGxTdHlsZSA9ICcjMDBmZmZmNjAnO1xyXG4gICAgICAgICAgICAgICAgVlAuY29udGV4dC5maWxsUmVjdChcclxuICAgICAgICAgICAgICAgICAgICBWUC53YWl0Qm91bmRzWzBdLngsIFZQLndhaXRCb3VuZHNbMF0ueSxcclxuICAgICAgICAgICAgICAgICAgICBWUC53YWl0Qm91bmRzWzFdLnggLSBWUC53YWl0Qm91bmRzWzBdLngsIFZQLndhaXRCb3VuZHNbMV0ueSAtIFZQLndhaXRCb3VuZHNbMF0ueVxyXG4gICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgVlAuY29udGV4dC5maWxsU3R5bGUgPSAnIzAwMDAwMGZmJztcclxuICAgICAgICAgICAgVlAuY29udGV4dC5mb250ID0gVlAud2FpdEZvbnQ7XHJcbiAgICAgICAgICAgIFZQLmNvbnRleHQuZmlsbFRleHQoJ1dhaXQhJywgVlAud2FpdEJvdW5kc1swXS54LCBWUC53YWl0Qm91bmRzWzBdLnkpO1xyXG4gICAgICAgICAgICBib3VuZHNSZWN0KFZQLndhaXRCb3VuZHMpO1xyXG5cclxuICAgICAgICAgICAgaWYgKGdhbWVTdGF0ZS5wbGF5ZXJTdGF0ZSA9PT0gXCJQcm9jZWVkXCIpIHtcclxuICAgICAgICAgICAgICAgIFZQLmNvbnRleHQuZmlsbFN0eWxlID0gJyMwMGZmZmY2MCc7XHJcbiAgICAgICAgICAgICAgICBWUC5jb250ZXh0LmZpbGxSZWN0KFxyXG4gICAgICAgICAgICAgICAgICAgIFZQLnByb2NlZWRCb3VuZHNbMF0ueCwgVlAucHJvY2VlZEJvdW5kc1swXS55LFxyXG4gICAgICAgICAgICAgICAgICAgIFZQLnByb2NlZWRCb3VuZHNbMV0ueCAtIFZQLnByb2NlZWRCb3VuZHNbMF0ueCwgVlAucHJvY2VlZEJvdW5kc1sxXS55IC0gVlAucHJvY2VlZEJvdW5kc1swXS55XHJcbiAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBWUC5jb250ZXh0LmZpbGxTdHlsZSA9ICcjMDAwMDAwZmYnO1xyXG4gICAgICAgICAgICBWUC5jb250ZXh0LmZvbnQgPSBWUC5wcm9jZWVkRm9udDtcclxuICAgICAgICAgICAgVlAuY29udGV4dC5maWxsVGV4dCgnUHJvY2VlZC4nLCBWUC5wcm9jZWVkQm91bmRzWzBdLngsIFZQLnByb2NlZWRCb3VuZHNbMF0ueSk7XHJcbiAgICAgICAgICAgIGJvdW5kc1JlY3QoVlAucHJvY2VlZEJvdW5kcyk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgaWYgKGdhbWVTdGF0ZS5wbGF5ZXJTdGF0ZSA9PT0gJ1JlYWR5Jykge1xyXG4gICAgICAgICAgICAgICAgVlAuY29udGV4dC5maWxsU3R5bGUgPSAnIzAwMDAwMGZmJztcclxuICAgICAgICAgICAgICAgIFZQLmNvbnRleHQuZm9udCA9IFZQLnJlYWR5Rm9udDtcclxuICAgICAgICAgICAgICAgIFZQLmNvbnRleHQuZmlsbFRleHQoJ1JlYWR5IScsIFZQLnJlYWR5Qm91bmRzWzBdLngsIFZQLnJlYWR5Qm91bmRzWzBdLnkpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgVlAuY29udGV4dC5maWxsU3R5bGUgPSAnIzAwMDAwMGZmJztcclxuICAgICAgICAgICAgICAgIFZQLmNvbnRleHQuZm9udCA9IFZQLmNvdW50ZG93bkZvbnQ7XHJcbiAgICAgICAgICAgICAgICBWUC5jb250ZXh0LmZpbGxUZXh0KGBXYWl0aW5nICR7XHJcbiAgICAgICAgICAgICAgICAgICAgTWF0aC5mbG9vcigxICsgKGdhbWVTdGF0ZS5wbGF5ZXJTdGF0ZS5hY3RpdmVUaW1lICsgTGliLmFjdGl2ZUNvb2xkb3duIC0gRGF0ZS5ub3coKSkgLyAxMDAwKVxyXG4gICAgICAgICAgICAgICAgfSBzZWNvbmRzLi4uYCwgVlAuY291bnRkb3duQm91bmRzWzBdLngsIFZQLmNvdW50ZG93bkJvdW5kc1swXS55KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0qL1xyXG4gICAgfSBmaW5hbGx5IHtcclxuICAgICAgICBWUC5jb250ZXh0LnJlc3RvcmUoKTtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gYm91bmRzUmVjdChbdG9wTGVmdCwgYm90dG9tUmlnaHRdOiBbVmVjdG9yLCBWZWN0b3JdKSB7XHJcbiAgICBWUC5jb250ZXh0LnN0cm9rZVJlY3QodG9wTGVmdC54LCB0b3BMZWZ0LnksIGJvdHRvbVJpZ2h0LnggLSB0b3BMZWZ0LngsIGJvdHRvbVJpZ2h0LnkgLSB0b3BMZWZ0LnkpO1xyXG59XHJcbiIsImltcG9ydCBWZWN0b3IgZnJvbSAnLi92ZWN0b3InO1xyXG5pbXBvcnQgKiBhcyBWUCBmcm9tICcuL3ZpZXctcGFyYW1zJztcclxuXHJcbmNvbnN0IHNwcmluZ0NvbnN0YW50ID0gMzM7XHJcbmNvbnN0IG1hc3MgPSAxO1xyXG5jb25zdCBkcmFnID0gTWF0aC5zcXJ0KDQgKiBtYXNzICogc3ByaW5nQ29uc3RhbnQpO1xyXG5cclxuLy8gc3RhdGUgZm9yIHBoeXNpY3MtYmFzZWQgYW5pbWF0aW9uc1xyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBTcHJpdGUge1xyXG4gICAgaW1hZ2U6IEhUTUxJbWFnZUVsZW1lbnQ7XHJcbiAgICB0YXJnZXQ6IFZlY3RvcjtcclxuICAgIHBvc2l0aW9uOiBWZWN0b3I7XHJcbiAgICB2ZWxvY2l0eTogVmVjdG9yO1xyXG5cclxuICAgIC8vYmFkID0gZmFsc2U7XHJcblxyXG4gICAgY29uc3RydWN0b3IoaW1hZ2U6IEhUTUxJbWFnZUVsZW1lbnQpIHtcclxuICAgICAgICB0aGlzLmltYWdlID0gaW1hZ2U7XHJcbiAgICAgICAgdGhpcy50YXJnZXQgPSBuZXcgVmVjdG9yKDAsIDApO1xyXG4gICAgICAgIHRoaXMucG9zaXRpb24gPSBuZXcgVmVjdG9yKDAsIDApO1xyXG4gICAgICAgIHRoaXMudmVsb2NpdHkgPSBuZXcgVmVjdG9yKDAsIDApO1xyXG4gICAgfVxyXG5cclxuICAgIGFuaW1hdGUoZGVsdGFUaW1lOiBudW1iZXIpIHtcclxuICAgICAgICBjb25zdCBzcHJpbmdGb3JjZSA9IHRoaXMudGFyZ2V0LnN1Yih0aGlzLnBvc2l0aW9uKS5zY2FsZShzcHJpbmdDb25zdGFudCk7XHJcbiAgICAgICAgY29uc3QgZHJhZ0ZvcmNlID0gdGhpcy52ZWxvY2l0eS5zY2FsZShkcmFnKTtcclxuICAgICAgICBjb25zdCBhY2NlbGVyYXRpb24gPSBzcHJpbmdGb3JjZS5zdWIoZHJhZ0ZvcmNlKS5zY2FsZSgxIC8gbWFzcyk7XHJcblxyXG4gICAgICAgIC8vY29uc3Qgc2F2ZWRWZWxvY2l0eSA9IHRoaXMudmVsb2NpdHk7XHJcbiAgICAgICAgLy9jb25zdCBzYXZlZFBvc2l0aW9uID0gdGhpcy5wb3NpdGlvbjtcclxuICAgICAgICBcclxuICAgICAgICB0aGlzLnZlbG9jaXR5ID0gdGhpcy52ZWxvY2l0eS5hZGQoYWNjZWxlcmF0aW9uLnNjYWxlKGRlbHRhVGltZSAvIDEwMDApKTtcclxuICAgICAgICB0aGlzLnBvc2l0aW9uID0gdGhpcy5wb3NpdGlvbi5hZGQodGhpcy52ZWxvY2l0eS5zY2FsZShkZWx0YVRpbWUgLyAxMDAwKSk7XHJcblxyXG4gICAgICAgIC8qXHJcbiAgICAgICAgaWYgKCF0aGlzLmJhZCAmJiAoXHJcbiAgICAgICAgICAgICFpc0Zpbml0ZSh0aGlzLnZlbG9jaXR5LngpIHx8IGlzTmFOKHRoaXMudmVsb2NpdHkueCkgfHxcclxuICAgICAgICAgICAgIWlzRmluaXRlKHRoaXMudmVsb2NpdHkueSkgfHwgaXNOYU4odGhpcy52ZWxvY2l0eS55KSB8fFxyXG4gICAgICAgICAgICAhaXNGaW5pdGUodGhpcy5wb3NpdGlvbi54KSB8fCBpc05hTih0aGlzLnBvc2l0aW9uLngpIHx8XHJcbiAgICAgICAgICAgICFpc0Zpbml0ZSh0aGlzLnBvc2l0aW9uLnkpIHx8IGlzTmFOKHRoaXMucG9zaXRpb24ueSlcclxuICAgICAgICApKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYmFkID0gdHJ1ZTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBkZWx0YVRpbWU6ICR7ZGVsdGFUaW1lfSwgc3ByaW5nRm9yY2U6ICR7SlNPTi5zdHJpbmdpZnkoc3ByaW5nRm9yY2UpfSwgZHJhZ0ZvcmNlOiAke0pTT04uc3RyaW5naWZ5KGRyYWdGb3JjZSl9YCk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGB0YXJnZXQ6ICR7SlNPTi5zdHJpbmdpZnkodGhpcy50YXJnZXQpfSwgcG9zaXRpb246ICR7SlNPTi5zdHJpbmdpZnkoc2F2ZWRQb3NpdGlvbil9LCB2ZWxvY2l0eTogJHtKU09OLnN0cmluZ2lmeShzYXZlZFZlbG9jaXR5KX0sIGFjY2VsZXJhdGlvbjogJHtKU09OLnN0cmluZ2lmeShhY2NlbGVyYXRpb24pfWApO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgbmV3IHBvc2l0aW9uOiAke0pTT04uc3RyaW5naWZ5KHRoaXMucG9zaXRpb24pfSwgbmV3IHZlbG9jaXR5OiAke0pTT04uc3RyaW5naWZ5KHRoaXMudmVsb2NpdHkpfWApO1xyXG4gICAgICAgIH1cclxuICAgICAgICAqL1xyXG5cclxuICAgICAgICBWUC5jb250ZXh0LmRyYXdJbWFnZSh0aGlzLmltYWdlLCB0aGlzLnBvc2l0aW9uLngsIHRoaXMucG9zaXRpb24ueSwgVlAuc3ByaXRlV2lkdGgsIFZQLnNwcml0ZUhlaWdodCk7XHJcbiAgICB9XHJcbn0iLCJpbXBvcnQgeyBNdXRleCB9IGZyb20gJ2F3YWl0LXNlbWFwaG9yZSc7XHJcblxyXG5pbXBvcnQgKiBhcyBMaWIgZnJvbSAnLi4vbGliJztcclxuaW1wb3J0ICogYXMgQ2FyZEltYWdlcyBmcm9tICcuL2NhcmQtaW1hZ2VzJztcclxuaW1wb3J0ICogYXMgVlAgZnJvbSAnLi92aWV3LXBhcmFtcyc7XHJcbmltcG9ydCBTcHJpdGUgZnJvbSAnLi9zcHJpdGUnO1xyXG5pbXBvcnQgVmVjdG9yIGZyb20gJy4vdmVjdG9yJztcclxuXHJcbmNvbnN0IHBsYXllck5hbWVGcm9tQ29va2llID0gTGliLmdldENvb2tpZSgncGxheWVyTmFtZScpO1xyXG5pZiAocGxheWVyTmFtZUZyb21Db29raWUgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCdObyBwbGF5ZXIgbmFtZSEnKTtcclxuZXhwb3J0IGNvbnN0IHBsYXllck5hbWUgPSBkZWNvZGVVUkkocGxheWVyTmFtZUZyb21Db29raWUpO1xyXG5cclxuY29uc3QgZ2FtZUlkRnJvbUNvb2tpZSA9IExpYi5nZXRDb29raWUoJ2dhbWVJZCcpO1xyXG5pZiAoZ2FtZUlkRnJvbUNvb2tpZSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoJ05vIGdhbWUgaWQhJyk7XHJcbmV4cG9ydCBjb25zdCBnYW1lSWQgPSBnYW1lSWRGcm9tQ29va2llO1xyXG5cclxuLy8gc29tZSBzdGF0ZS1tYW5pcHVsYXRpbmcgb3BlcmF0aW9ucyBhcmUgYXN5bmNocm9ub3VzLCBzbyB3ZSBuZWVkIHRvIGd1YXJkIGFnYWluc3QgcmFjZXNcclxuY29uc3Qgc3RhdGVNdXRleCA9IG5ldyBNdXRleCgpO1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbG9jaygpOiBQcm9taXNlPCgpID0+IHZvaWQ+IHtcclxuICAgIC8vY29uc29sZS5sb2coYGFjcXVpcmluZyBzdGF0ZSBsb2NrLi4uXFxuJHtuZXcgRXJyb3IoKS5zdGFja31gKTtcclxuICAgIGNvbnN0IHJlbGVhc2UgPSBhd2FpdCBzdGF0ZU11dGV4LmFjcXVpcmUoKTtcclxuICAgIC8vY29uc29sZS5sb2coYGFjcXVpcmVkIHN0YXRlIGxvY2tcXG4ke25ldyBFcnJvcigpLnN0YWNrfWApO1xyXG4gICAgcmV0dXJuICgpID0+IHtcclxuICAgICAgICByZWxlYXNlKCk7XHJcbiAgICAgICAgLy9jb25zb2xlLmxvZyhgcmVsZWFzZWQgc3RhdGUgbG9ja2ApO1xyXG4gICAgfTtcclxufVxyXG5cclxuLy8gd2UgbmVlZCB0byBrZWVwIGEgY29weSBvZiB0aGUgcHJldmlvdXMgZ2FtZSBzdGF0ZSBhcm91bmQgZm9yIGJvb2trZWVwaW5nIHB1cnBvc2VzXHJcbmV4cG9ydCBsZXQgcHJldmlvdXNHYW1lU3RhdGU6IExpYi5HYW1lU3RhdGUgfCB1bmRlZmluZWQ7XHJcbi8vIHRoZSBtb3N0IHJlY2VudGx5IHJlY2VpdmVkIGdhbWUgc3RhdGUsIGlmIGFueVxyXG5leHBvcnQgbGV0IGdhbWVTdGF0ZTogTGliLkdhbWVTdGF0ZSB8IHVuZGVmaW5lZDtcclxuXHJcbi8vIGluZGljZXMgb2YgY2FyZHMgZm9yIGRyYWcgJiBkcm9wXHJcbi8vIElNUE9SVEFOVDogdGhpcyBhcnJheSBtdXN0IGFsd2F5cyBiZSBzb3J0ZWQhXHJcbi8vIEFsd2F5cyB1c2UgYmluYXJ5U2VhcmNoIHRvIGluc2VydCBhbmQgZGVsZXRlIG9yIHNvcnQgYWZ0ZXIgbWFuaXB1bGF0aW9uXHJcbmV4cG9ydCBjb25zdCBzZWxlY3RlZEluZGljZXM6IG51bWJlcltdID0gW107XHJcblxyXG4vLyBmb3IgYW5pbWF0aW5nIHRoZSBkZWNrXHJcbmV4cG9ydCBsZXQgZGVja1Nwcml0ZXM6IFNwcml0ZVtdID0gW107XHJcblxyXG4vLyBhc3NvY2lhdGl2ZSBhcnJheXMsIG9uZSBmb3IgZWFjaCBwbGF5ZXIgYXQgdGhlaXIgcGxheWVyIGluZGV4XHJcbi8vIGVhY2ggZWxlbWVudCBjb3JyZXNwb25kcyB0byBhIGZhY2UtZG93biBjYXJkIGJ5IGluZGV4XHJcbmV4cG9ydCBsZXQgYmFja1Nwcml0ZXNGb3JQbGF5ZXI6IFNwcml0ZVtdW10gPSBbXTtcclxuLy8gZWFjaCBlbGVtZW50IGNvcnJlc3BvbmRzIHRvIGEgZmFjZS11cCBjYXJkIGJ5IGluZGV4XHJcbmV4cG9ydCBsZXQgZmFjZVNwcml0ZXNGb3JQbGF5ZXI6IFNwcml0ZVtdW10gPSBbXTtcclxuXHJcbi8vIG9wZW4gd2Vic29ja2V0IGNvbm5lY3Rpb24gdG8gZ2V0IGdhbWUgc3RhdGUgdXBkYXRlc1xyXG5sZXQgd3MgPSBuZXcgV2ViU29ja2V0KGB3c3M6Ly8ke3dpbmRvdy5sb2NhdGlvbi5ob3N0bmFtZX0vYCk7XHJcblxyXG5jb25zdCBjYWxsYmFja3NGb3JNZXRob2ROYW1lID0gbmV3IE1hcDxMaWIuTWV0aG9kTmFtZSwgKChyZXN1bHQ6IExpYi5NZXRob2RSZXN1bHQpID0+IHZvaWQpW10+KCk7XHJcbmZ1bmN0aW9uIGFkZENhbGxiYWNrKG1ldGhvZE5hbWU6IExpYi5NZXRob2ROYW1lLCByZXNvbHZlOiAoKSA9PiB2b2lkLCByZWplY3Q6IChyZWFzb246IGFueSkgPT4gdm9pZCkge1xyXG4gICAgY29uc29sZS5sb2coYGFkZGluZyBjYWxsYmFjayBmb3IgbWV0aG9kICcke21ldGhvZE5hbWV9J2ApO1xyXG5cclxuICAgIGxldCBjYWxsYmFja3MgPSBjYWxsYmFja3NGb3JNZXRob2ROYW1lLmdldChtZXRob2ROYW1lKTtcclxuICAgIGlmIChjYWxsYmFja3MgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIGNhbGxiYWNrcyA9IFtdO1xyXG4gICAgICAgIGNhbGxiYWNrc0Zvck1ldGhvZE5hbWUuc2V0KG1ldGhvZE5hbWUsIGNhbGxiYWNrcyk7XHJcbiAgICB9XHJcblxyXG4gICAgY2FsbGJhY2tzLnB1c2gocmVzdWx0ID0+IHtcclxuICAgICAgICBjb25zb2xlLmxvZyhgaW52b2tpbmcgY2FsbGJhY2sgZm9yIG1ldGhvZCAnJHttZXRob2ROYW1lfSdgKTtcclxuICAgICAgICBpZiAoJ2Vycm9yRGVzY3JpcHRpb24nIGluIHJlc3VsdCkge1xyXG4gICAgICAgICAgICByZWplY3QocmVzdWx0LmVycm9yRGVzY3JpcHRpb24pO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHJlc29sdmUoKTtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxufVxyXG5cclxud3Mub25tZXNzYWdlID0gYXN5bmMgZSA9PiB7XHJcbiAgICBjb25zdCBvYmogPSBKU09OLnBhcnNlKGUuZGF0YSk7XHJcbiAgICBpZiAoJ21ldGhvZE5hbWUnIGluIG9iaikge1xyXG4gICAgICAgIGNvbnN0IHJldHVybk1lc3NhZ2UgPSA8TGliLk1ldGhvZFJlc3VsdD5vYmo7XHJcbiAgICAgICAgY29uc3QgbWV0aG9kTmFtZSA9IHJldHVybk1lc3NhZ2UubWV0aG9kTmFtZTtcclxuICAgICAgICBjb25zdCBjYWxsYmFja3MgPSBjYWxsYmFja3NGb3JNZXRob2ROYW1lLmdldChtZXRob2ROYW1lKTtcclxuICAgICAgICBpZiAoY2FsbGJhY2tzID09PSB1bmRlZmluZWQgfHwgY2FsbGJhY2tzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYG5vIGNhbGxiYWNrcyBmb3VuZCBmb3IgbWV0aG9kOiAke21ldGhvZE5hbWV9YCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBjYWxsYmFjayA9IGNhbGxiYWNrcy5zaGlmdCgpO1xyXG4gICAgICAgIGlmIChjYWxsYmFjayA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgY2FsbGJhY2sgaXMgdW5kZWZpbmVkIGZvciBtZXRob2Q6ICR7bWV0aG9kTmFtZX1gKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgY2FsbGJhY2socmV0dXJuTWVzc2FnZSk7XHJcbiAgICB9IGVsc2UgaWYgKFxyXG4gICAgICAgICdkZWNrQ291bnQnIGluIG9iaiAmJlxyXG4gICAgICAgICdwbGF5ZXJJbmRleCcgaW4gb2JqICYmXHJcbiAgICAgICAgJ3BsYXllckNhcmRzJyBpbiBvYmogJiZcclxuICAgICAgICAncGxheWVyUmV2ZWFsQ291bnQnIGluIG9iaiAmJlxyXG4gICAgICAgIC8vJ3BsYXllclN0YXRlJyBpbiBvYmogJiZcclxuICAgICAgICAnb3RoZXJQbGF5ZXJzJyBpbiBvYmpcclxuICAgICkge1xyXG4gICAgICAgIGNvbnN0IHVubG9jayA9IGF3YWl0IGxvY2soKTtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBwcmV2aW91c0dhbWVTdGF0ZSA9IGdhbWVTdGF0ZTtcclxuICAgICAgICAgICAgZ2FtZVN0YXRlID0gPExpYi5HYW1lU3RhdGU+b2JqO1xyXG5cclxuICAgICAgICAgICAgaWYgKHByZXZpb3VzR2FtZVN0YXRlICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBwcmV2aW91c0dhbWVTdGF0ZS5wbGF5ZXJDYXJkczogJHtKU09OLnN0cmluZ2lmeShwcmV2aW91c0dhbWVTdGF0ZS5wbGF5ZXJDYXJkcyl9YCk7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgcHJldmlvdXMgc2VsZWN0ZWRJbmRpY2VzOiAke0pTT04uc3RyaW5naWZ5KHNlbGVjdGVkSW5kaWNlcyl9YCk7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgcHJldmlvdXMgc2VsZWN0ZWRDYXJkczogJHtKU09OLnN0cmluZ2lmeShzZWxlY3RlZEluZGljZXMubWFwKGkgPT4gcHJldmlvdXNHYW1lU3RhdGU/LnBsYXllckNhcmRzW2ldKSl9YCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIHNlbGVjdGVkIGluZGljZXMgbWlnaHQgaGF2ZSBzaGlmdGVkXHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2VsZWN0ZWRJbmRpY2VzLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBzZWxlY3RlZEluZGV4ID0gc2VsZWN0ZWRJbmRpY2VzW2ldO1xyXG4gICAgICAgICAgICAgICAgaWYgKHNlbGVjdGVkSW5kZXggPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKEpTT04uc3RyaW5naWZ5KGdhbWVTdGF0ZS5wbGF5ZXJDYXJkc1tzZWxlY3RlZEluZGV4XSkgIT09IEpTT04uc3RyaW5naWZ5KHByZXZpb3VzR2FtZVN0YXRlPy5wbGF5ZXJDYXJkc1tzZWxlY3RlZEluZGV4XSkpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgZm91bmQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGdhbWVTdGF0ZS5wbGF5ZXJDYXJkcy5sZW5ndGg7ICsraikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoSlNPTi5zdHJpbmdpZnkoZ2FtZVN0YXRlLnBsYXllckNhcmRzW2pdKSA9PT0gSlNPTi5zdHJpbmdpZnkocHJldmlvdXNHYW1lU3RhdGU/LnBsYXllckNhcmRzW3NlbGVjdGVkSW5kZXhdKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWRJbmRpY2VzW2ldID0gajtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvdW5kID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoIWZvdW5kKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkSW5kaWNlcy5zcGxpY2UoaSwgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC0taTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIGJpbmFyeSBzZWFyY2ggc3RpbGwgbmVlZHMgdG8gd29ya1xyXG4gICAgICAgICAgICBzZWxlY3RlZEluZGljZXMuc29ydCgoYSwgYikgPT4gYSAtIGIpO1xyXG5cclxuICAgICAgICAgICAgLy8gaW5pdGlhbGl6ZSBhbmltYXRpb24gc3RhdGVzXHJcbiAgICAgICAgICAgIGFzc29jaWF0ZUFuaW1hdGlvbnNXaXRoQ2FyZHMocHJldmlvdXNHYW1lU3RhdGUsIGdhbWVTdGF0ZSk7XHJcblxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgZ2FtZVN0YXRlLnBsYXllckNhcmRzOiAke0pTT04uc3RyaW5naWZ5KGdhbWVTdGF0ZS5wbGF5ZXJDYXJkcyl9YCk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBnYW1lU3RhdGUucGxheWVyU2hhcmVDb3VudCA9ICR7Z2FtZVN0YXRlLnBsYXllclNoYXJlQ291bnR9YCk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBnYW1lU3RhdGUucGxheWVyUmV2ZWFsQ291bnQgPSAke2dhbWVTdGF0ZS5wbGF5ZXJSZXZlYWxDb3VudH1gKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coYHNlbGVjdGVkSW5kaWNlczogJHtKU09OLnN0cmluZ2lmeShzZWxlY3RlZEluZGljZXMpfWApO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgc2VsZWN0ZWRDYXJkczogJHtKU09OLnN0cmluZ2lmeShzZWxlY3RlZEluZGljZXMubWFwKGkgPT4gZ2FtZVN0YXRlPy5wbGF5ZXJDYXJkc1tpXSkpfWApO1xyXG4gICAgICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgICAgIHVubG9jaygpO1xyXG4gICAgICAgIH1cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKEpTT04uc3RyaW5naWZ5KGUuZGF0YSkpO1xyXG4gICAgfVxyXG59O1xyXG5cclxubGV0IG9uQW5pbWF0aW9uc0Fzc29jaWF0ZWQgPSAoKSA9PiB7fTtcclxuXHJcbmZ1bmN0aW9uIGFzc29jaWF0ZUFuaW1hdGlvbnNXaXRoQ2FyZHMocHJldmlvdXNHYW1lU3RhdGU6IExpYi5HYW1lU3RhdGUgfCB1bmRlZmluZWQsIGdhbWVTdGF0ZTogTGliLkdhbWVTdGF0ZSkge1xyXG4gICAgY29uc3QgcHJldmlvdXNEZWNrU3ByaXRlcyA9IGRlY2tTcHJpdGVzO1xyXG4gICAgY29uc3QgcHJldmlvdXNCYWNrU3ByaXRlc0ZvclBsYXllciA9IGJhY2tTcHJpdGVzRm9yUGxheWVyO1xyXG4gICAgY29uc3QgcHJldmlvdXNGYWNlU3ByaXRlc0ZvclBsYXllciA9IGZhY2VTcHJpdGVzRm9yUGxheWVyO1xyXG5cclxuICAgIGJhY2tTcHJpdGVzRm9yUGxheWVyID0gW107XHJcbiAgICBmYWNlU3ByaXRlc0ZvclBsYXllciA9IFtdO1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCA0OyArK2kpIHtcclxuICAgICAgICBjb25zdCBwcmV2aW91c0JhY2tTcHJpdGVzID0gcHJldmlvdXNCYWNrU3ByaXRlc0ZvclBsYXllcltpXSA/PyBbXTtcclxuICAgICAgICBwcmV2aW91c0JhY2tTcHJpdGVzRm9yUGxheWVyW2ldID0gcHJldmlvdXNCYWNrU3ByaXRlcztcclxuXHJcbiAgICAgICAgY29uc3QgcHJldmlvdXNGYWNlU3ByaXRlcyA9IHByZXZpb3VzRmFjZVNwcml0ZXNGb3JQbGF5ZXJbaV0gPz8gW107XHJcbiAgICAgICAgcHJldmlvdXNGYWNlU3ByaXRlc0ZvclBsYXllcltpXSA9IHByZXZpb3VzRmFjZVNwcml0ZXM7XHJcblxyXG4gICAgICAgIGxldCBwcmV2aW91c0ZhY2VDYXJkczogTGliLkNhcmRbXTtcclxuICAgICAgICBsZXQgZmFjZUNhcmRzOiBMaWIuQ2FyZFtdO1xyXG4gICAgICAgIGlmIChpID09PSBnYW1lU3RhdGUucGxheWVySW5kZXgpIHtcclxuICAgICAgICAgICAgcHJldmlvdXNGYWNlQ2FyZHMgPSBwcmV2aW91c0dhbWVTdGF0ZT8ucGxheWVyQ2FyZHMgPz8gW107XHJcbiAgICAgICAgICAgIGZhY2VDYXJkcyA9IGdhbWVTdGF0ZS5wbGF5ZXJDYXJkcztcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBwcmV2aW91c0ZhY2VDYXJkcyA9IHByZXZpb3VzR2FtZVN0YXRlPy5vdGhlclBsYXllcnNbaV0/LnJldmVhbGVkQ2FyZHMgPz8gW107XHJcbiAgICAgICAgICAgIGZhY2VDYXJkcyA9IGdhbWVTdGF0ZS5vdGhlclBsYXllcnNbaV0/LnJldmVhbGVkQ2FyZHMgPz8gW107XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgZmFjZVNwcml0ZXM6IFNwcml0ZVtdID0gW107XHJcbiAgICAgICAgZmFjZVNwcml0ZXNGb3JQbGF5ZXJbaV0gPSBmYWNlU3ByaXRlcztcclxuICAgICAgICBmb3IgKGNvbnN0IGZhY2VDYXJkIG9mIGZhY2VDYXJkcykge1xyXG4gICAgICAgICAgICBsZXQgZmFjZVNwcml0ZTogU3ByaXRlIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICBpZiAoZmFjZVNwcml0ZSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IHByZXZpb3VzRmFjZUNhcmRzLmxlbmd0aDsgKytqKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJldmlvdXNGYWNlQ2FyZCA9IHByZXZpb3VzRmFjZUNhcmRzW2pdO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChwcmV2aW91c0ZhY2VDYXJkID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChKU09OLnN0cmluZ2lmeShmYWNlQ2FyZCkgPT09IEpTT04uc3RyaW5naWZ5KHByZXZpb3VzRmFjZUNhcmQpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHByZXZpb3VzRmFjZUNhcmRzLnNwbGljZShqLCAxKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZmFjZVNwcml0ZSA9IHByZXZpb3VzRmFjZVNwcml0ZXMuc3BsaWNlKGosIDEpWzBdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZmFjZVNwcml0ZSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoZmFjZVNwcml0ZSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IDQ7ICsraikge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHByZXZpb3VzT3RoZXJQbGF5ZXIgPSBwcmV2aW91c0dhbWVTdGF0ZT8ub3RoZXJQbGF5ZXJzW2pdO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG90aGVyUGxheWVyID0gZ2FtZVN0YXRlLm90aGVyUGxheWVyc1tqXTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAocHJldmlvdXNPdGhlclBsYXllciA9PT0gdW5kZWZpbmVkIHx8IHByZXZpb3VzT3RoZXJQbGF5ZXIgPT09IG51bGwgfHxcclxuICAgICAgICAgICAgICAgICAgICAgICAgb3RoZXJQbGF5ZXIgPT09IHVuZGVmaW5lZCB8fCBvdGhlclBsYXllciA9PT0gbnVsbFxyXG4gICAgICAgICAgICAgICAgICAgICkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChwcmV2aW91c090aGVyUGxheWVyLnNoYXJlQ291bnQgPiBvdGhlclBsYXllci5zaGFyZUNvdW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGsgPSAwOyBrIDwgcHJldmlvdXNPdGhlclBsYXllci5zaGFyZUNvdW50OyArK2spIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChKU09OLnN0cmluZ2lmeShmYWNlQ2FyZCkgPT09IEpTT04uc3RyaW5naWZ5KHByZXZpb3VzT3RoZXJQbGF5ZXIucmV2ZWFsZWRDYXJkc1trXSkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAtLXByZXZpb3VzT3RoZXJQbGF5ZXIuc2hhcmVDb3VudDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcmV2aW91c090aGVyUGxheWVyLnJldmVhbGVkQ2FyZHMuc3BsaWNlKGssIDEpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmYWNlU3ByaXRlID0gcHJldmlvdXNGYWNlU3ByaXRlc0ZvclBsYXllcltqXT8uc3BsaWNlKGssIDEpWzBdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmYWNlU3ByaXRlID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNvdXJjZVRyYW5zZm9ybSA9IFZQLmdldFRyYW5zZm9ybUZvclBsYXllcihWUC5nZXRSZWxhdGl2ZVBsYXllckluZGV4KGosIGdhbWVTdGF0ZS5wbGF5ZXJJbmRleCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRlc3RpbmF0aW9uVHJhbnNmb3JtID0gVlAuZ2V0VHJhbnNmb3JtRm9yUGxheWVyKFZQLmdldFJlbGF0aXZlUGxheWVySW5kZXgoaSwgZ2FtZVN0YXRlLnBsYXllckluZGV4KSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzdGluYXRpb25UcmFuc2Zvcm0uaW52ZXJ0U2VsZigpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgcCA9IHNvdXJjZVRyYW5zZm9ybS50cmFuc2Zvcm1Qb2ludChmYWNlU3ByaXRlLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwID0gZGVzdGluYXRpb25UcmFuc2Zvcm0udHJhbnNmb3JtUG9pbnQocCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmFjZVNwcml0ZS5wb3NpdGlvbiA9IG5ldyBWZWN0b3IocC54LCBwLnkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoZmFjZVNwcml0ZSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGZhY2VTcHJpdGUgPT09IHVuZGVmaW5lZCAmJiBwcmV2aW91c0JhY2tTcHJpdGVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgIC8vIG1ha2UgaXQgbG9vayBsaWtlIHRoaXMgY2FyZCB3YXMgcmV2ZWFsZWQgYW1vbmcgcHJldmlvdXNseSBoaWRkZW4gY2FyZHNcclxuICAgICAgICAgICAgICAgIC8vIHdoaWNoLCBvZiBjb3Vyc2UsIHJlcXVpcmVzIHRoYXQgdGhlIHBsYXllciBoYWQgcHJldmlvdXNseSBoaWRkZW4gY2FyZHNcclxuICAgICAgICAgICAgICAgIGZhY2VTcHJpdGUgPSBwcmV2aW91c0JhY2tTcHJpdGVzLnNwbGljZSgwLCAxKVswXTtcclxuICAgICAgICAgICAgICAgIGlmIChmYWNlU3ByaXRlID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG4gICAgICAgICAgICAgICAgZmFjZVNwcml0ZS5pbWFnZSA9IENhcmRJbWFnZXMuZ2V0KEpTT04uc3RyaW5naWZ5KGZhY2VDYXJkKSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChmYWNlU3ByaXRlID09PSB1bmRlZmluZWQgJiYgcHJldmlvdXNEZWNrU3ByaXRlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBtYWtlIGl0IGxvb2sgbGlrZSB0aGlzIGNhcmQgY2FtZSBmcm9tIHRoZSBkZWNrO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZmFjZVNwcml0ZSA9IHByZXZpb3VzRGVja1Nwcml0ZXMuc3BsaWNlKHByZXZpb3VzRGVja1Nwcml0ZXMubGVuZ3RoIC0gMSwgMSlbMF07XHJcbiAgICAgICAgICAgICAgICBpZiAoZmFjZVNwcml0ZSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICAgICAgICAgICAgICAgIGZhY2VTcHJpdGUuaW1hZ2UgPSBDYXJkSW1hZ2VzLmdldChKU09OLnN0cmluZ2lmeShmYWNlQ2FyZCkpO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIHRoaXMgc3ByaXRlIGlzIHJlbmRlcmVkIGluIHRoZSBwbGF5ZXIncyB0cmFuc2Zvcm1lZCBjYW52YXMgY29udGV4dFxyXG4gICAgICAgICAgICAgICAgY29uc3QgdHJhbnNmb3JtID0gVlAuZ2V0VHJhbnNmb3JtRm9yUGxheWVyKFZQLmdldFJlbGF0aXZlUGxheWVySW5kZXgoaSwgZ2FtZVN0YXRlLnBsYXllckluZGV4KSk7XHJcbiAgICAgICAgICAgICAgICB0cmFuc2Zvcm0uaW52ZXJ0U2VsZigpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcG9pbnQgPSB0cmFuc2Zvcm0udHJhbnNmb3JtUG9pbnQoZmFjZVNwcml0ZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICBmYWNlU3ByaXRlLnBvc2l0aW9uID0gbmV3IFZlY3Rvcihwb2ludC54LCBwb2ludC55KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGZhY2VTcHJpdGUgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgZmFjZVNwcml0ZSA9IG5ldyBTcHJpdGUoQ2FyZEltYWdlcy5nZXQoSlNPTi5zdHJpbmdpZnkoZmFjZUNhcmQpKSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGZhY2VTcHJpdGVzLnB1c2goZmFjZVNwcml0ZSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgNDsgKytpKSB7XHJcbiAgICAgICAgY29uc3QgcHJldmlvdXNCYWNrU3ByaXRlcyA9IHByZXZpb3VzQmFja1Nwcml0ZXNGb3JQbGF5ZXJbaV0gPz8gW107XHJcbiAgICAgICAgcHJldmlvdXNCYWNrU3ByaXRlc0ZvclBsYXllcltpXSA9IHByZXZpb3VzQmFja1Nwcml0ZXM7XHJcblxyXG4gICAgICAgIGNvbnN0IHByZXZpb3VzRmFjZVNwcml0ZXMgPSBwcmV2aW91c0ZhY2VTcHJpdGVzRm9yUGxheWVyW2ldID8/IFtdO1xyXG4gICAgICAgIHByZXZpb3VzRmFjZVNwcml0ZXNGb3JQbGF5ZXJbaV0gPSBwcmV2aW91c0ZhY2VTcHJpdGVzO1xyXG5cclxuICAgICAgICBsZXQgYmFja1Nwcml0ZXM6IFNwcml0ZVtdID0gW107XHJcbiAgICAgICAgYmFja1Nwcml0ZXNGb3JQbGF5ZXJbaV0gPSBiYWNrU3ByaXRlcztcclxuICAgICAgICBjb25zdCBvdGhlclBsYXllciA9IGdhbWVTdGF0ZS5vdGhlclBsYXllcnNbaV07XHJcbiAgICAgICAgaWYgKGkgIT09IGdhbWVTdGF0ZS5wbGF5ZXJJbmRleCAmJiBvdGhlclBsYXllciAhPT0gbnVsbCAmJiBvdGhlclBsYXllciAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIC8vIG9ubHkgb3RoZXIgcGxheWVycyBoYXZlIGFueSBoaWRkZW4gY2FyZHNcclxuICAgICAgICAgICAgd2hpbGUgKGJhY2tTcHJpdGVzLmxlbmd0aCA8IG90aGVyUGxheWVyLmNhcmRDb3VudCAtIG90aGVyUGxheWVyLnJldmVhbGVkQ2FyZHMubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgYmFja1Nwcml0ZTogU3ByaXRlIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICAgICAgaWYgKGJhY2tTcHJpdGUgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgNDsgKytqKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHByZXZpb3VzT3RoZXJQbGF5ZXIgPSBwcmV2aW91c0dhbWVTdGF0ZT8ub3RoZXJQbGF5ZXJzW2pdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBvdGhlclBsYXllciA9IGdhbWVTdGF0ZS5vdGhlclBsYXllcnNbal07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwcmV2aW91c090aGVyUGxheWVyID09PSB1bmRlZmluZWQgfHwgcHJldmlvdXNPdGhlclBsYXllciA9PT0gbnVsbCB8fFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3RoZXJQbGF5ZXIgPT09IHVuZGVmaW5lZCB8fCBvdGhlclBsYXllciA9PT0gbnVsbFxyXG4gICAgICAgICAgICAgICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJldmlvdXNPdGhlclBsYXllci5zaGFyZUNvdW50ID4gb3RoZXJQbGF5ZXIuc2hhcmVDb3VudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJldmlvdXNPdGhlclBsYXllci5zaGFyZUNvdW50LS07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcmV2aW91c090aGVyUGxheWVyLnJldmVhbGVkQ2FyZHMuc3BsaWNlKDAsIDEpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJhY2tTcHJpdGUgPSBwcmV2aW91c0ZhY2VTcHJpdGVzRm9yUGxheWVyW2pdPy5zcGxpY2UoMCwgMSlbMF07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYmFja1Nwcml0ZSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJhY2tTcHJpdGUuaW1hZ2UgPSBDYXJkSW1hZ2VzLmdldChgQmFjayR7aX1gKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzb3VyY2VUcmFuc2Zvcm0gPSBWUC5nZXRUcmFuc2Zvcm1Gb3JQbGF5ZXIoVlAuZ2V0UmVsYXRpdmVQbGF5ZXJJbmRleChqLCBnYW1lU3RhdGUucGxheWVySW5kZXgpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRlc3RpbmF0aW9uVHJhbnNmb3JtID0gVlAuZ2V0VHJhbnNmb3JtRm9yUGxheWVyKFZQLmdldFJlbGF0aXZlUGxheWVySW5kZXgoaSwgZ2FtZVN0YXRlLnBsYXllckluZGV4KSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBwID0gc291cmNlVHJhbnNmb3JtLnRyYW5zZm9ybVBvaW50KGJhY2tTcHJpdGUucG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcCA9IGRlc3RpbmF0aW9uVHJhbnNmb3JtLnRyYW5zZm9ybVBvaW50KHApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYmFja1Nwcml0ZS5wb3NpdGlvbiA9IG5ldyBWZWN0b3IocC54LCBwLnkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGJhY2tTcHJpdGUgPT09IHVuZGVmaW5lZCAmJiBwcmV2aW91c0JhY2tTcHJpdGVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBiYWNrU3ByaXRlID0gcHJldmlvdXNCYWNrU3ByaXRlcy5zcGxpY2UoMCwgMSlbMF07XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGJhY2tTcHJpdGUgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGlmIChiYWNrU3ByaXRlID09PSB1bmRlZmluZWQgJiYgcHJldmlvdXNGYWNlU3ByaXRlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYmFja1Nwcml0ZSA9IHByZXZpb3VzRmFjZVNwcml0ZXMuc3BsaWNlKDAsIDEpWzBdO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChiYWNrU3ByaXRlID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJhY2tTcHJpdGUuaW1hZ2UgPSBDYXJkSW1hZ2VzLmdldChgQmFjayR7aX1gKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgaWYgKGJhY2tTcHJpdGUgPT09IHVuZGVmaW5lZCAmJiBwcmV2aW91c0RlY2tTcHJpdGVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBiYWNrU3ByaXRlID0gcHJldmlvdXNEZWNrU3ByaXRlcy5zcGxpY2UocHJldmlvdXNEZWNrU3ByaXRlcy5sZW5ndGggLSAxLCAxKVswXTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoYmFja1Nwcml0ZSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICAgICAgICAgICAgICAgICAgICBiYWNrU3ByaXRlLmltYWdlID0gQ2FyZEltYWdlcy5nZXQoYEJhY2ske2l9YCk7XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gdGhpcyBzcHJpdGUgY29tZXMgZnJvbSB0aGUgZGVjaywgd2hpY2ggaXMgcmVuZGVyZWQgaW4gdGhlIGNsaWVudCBwbGF5ZXIncyB0cmFuc2Zvcm1cclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0cmFuc2Zvcm0gPSBWUC5nZXRUcmFuc2Zvcm1Gb3JQbGF5ZXIoVlAuZ2V0UmVsYXRpdmVQbGF5ZXJJbmRleChpLCBnYW1lU3RhdGUucGxheWVySW5kZXgpKTtcclxuICAgICAgICAgICAgICAgICAgICB0cmFuc2Zvcm0uaW52ZXJ0U2VsZigpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBvaW50ID0gdHJhbnNmb3JtLnRyYW5zZm9ybVBvaW50KGJhY2tTcHJpdGUucG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgIGJhY2tTcHJpdGUucG9zaXRpb24gPSBuZXcgVmVjdG9yKHBvaW50LngsIHBvaW50LnkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBpZiAoYmFja1Nwcml0ZSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYmFja1Nwcml0ZSA9IG5ldyBTcHJpdGUoQ2FyZEltYWdlcy5nZXQoYEJhY2ske2l9YCkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGJhY2tTcHJpdGVzLnB1c2goYmFja1Nwcml0ZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZGVja1Nwcml0ZXMgPSBbXTtcclxuICAgIHdoaWxlIChkZWNrU3ByaXRlcy5sZW5ndGggPCBnYW1lU3RhdGUuZGVja0NvdW50KSB7XHJcbiAgICAgICAgbGV0IGRlY2tTcHJpdGU6IFNwcml0ZSB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcclxuICAgICAgICBpZiAoZGVja1Nwcml0ZSA9PSB1bmRlZmluZWQgJiYgcHJldmlvdXNEZWNrU3ByaXRlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIGRlY2tTcHJpdGUgPSBwcmV2aW91c0RlY2tTcHJpdGVzLnNwbGljZSgwLCAxKVswXTtcclxuICAgICAgICAgICAgaWYgKGRlY2tTcHJpdGUgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoZGVja1Nwcml0ZSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIGxldCBpID0gMDtcclxuICAgICAgICAgICAgZm9yIChjb25zdCBwcmV2aW91c0JhY2tTcHJpdGVzIG9mIHByZXZpb3VzQmFja1Nwcml0ZXNGb3JQbGF5ZXIpIHtcclxuICAgICAgICAgICAgICAgIGlmIChwcmV2aW91c0JhY2tTcHJpdGVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBkZWNrU3ByaXRlID0gcHJldmlvdXNCYWNrU3ByaXRlcy5zcGxpY2UoMCwgMSlbMF07XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRlY2tTcHJpdGUgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVja1Nwcml0ZS5pbWFnZSA9IENhcmRJbWFnZXMuZ2V0KCdCYWNrNCcpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLyB0aGUgc3ByaXRlIGNhbWUgZnJvbSB0aGUgcGxheWVyJ3MgdHJhbnNmb3JtZWQgY2FudmFzIGNvbnRleHRcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0cmFuc2Zvcm0gPSBWUC5nZXRUcmFuc2Zvcm1Gb3JQbGF5ZXIoVlAuZ2V0UmVsYXRpdmVQbGF5ZXJJbmRleChpLCBnYW1lU3RhdGUucGxheWVySW5kZXgpKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBwb2ludCA9IHRyYW5zZm9ybS50cmFuc2Zvcm1Qb2ludChkZWNrU3ByaXRlLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICBkZWNrU3ByaXRlLnBvc2l0aW9uID0gbmV3IFZlY3Rvcihwb2ludC54LCBwb2ludC55KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgKytpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoZGVja1Nwcml0ZSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIGxldCBpID0gMDtcclxuICAgICAgICAgICAgZm9yIChjb25zdCBwcmV2aW91c0ZhY2VTcHJpdGVzIG9mIHByZXZpb3VzRmFjZVNwcml0ZXNGb3JQbGF5ZXIpIHtcclxuICAgICAgICAgICAgICAgIGlmIChwcmV2aW91c0ZhY2VTcHJpdGVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBkZWNrU3ByaXRlID0gcHJldmlvdXNGYWNlU3ByaXRlcy5zcGxpY2UoMCwgMSlbMF07XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRlY2tTcHJpdGUgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVja1Nwcml0ZS5pbWFnZSA9IENhcmRJbWFnZXMuZ2V0KCdCYWNrNCcpO1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIHRoZSBzcHJpdGUgY2FtZSBmcm9tIHRoZSBwbGF5ZXIncyB0cmFuc2Zvcm1lZCBjYW52YXMgY29udGV4dFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRyYW5zZm9ybSA9IFZQLmdldFRyYW5zZm9ybUZvclBsYXllcihWUC5nZXRSZWxhdGl2ZVBsYXllckluZGV4KGksIGdhbWVTdGF0ZS5wbGF5ZXJJbmRleCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBvaW50ID0gdHJhbnNmb3JtLnRyYW5zZm9ybVBvaW50KGRlY2tTcHJpdGUucG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgIGRlY2tTcHJpdGUucG9zaXRpb24gPSBuZXcgVmVjdG9yKHBvaW50LngsIHBvaW50LnkpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICArK2k7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChkZWNrU3ByaXRlID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgZGVja1Nwcml0ZSA9IG5ldyBTcHJpdGUoQ2FyZEltYWdlcy5nZXQoJ0JhY2s0JykpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZGVja1Nwcml0ZXMucHVzaChkZWNrU3ByaXRlKTtcclxuICAgIH1cclxuXHJcbiAgICBzZXRTcHJpdGVUYXJnZXRzKGdhbWVTdGF0ZSk7XHJcblxyXG4gICAgb25BbmltYXRpb25zQXNzb2NpYXRlZCgpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc2V0U3ByaXRlVGFyZ2V0cyhcclxuICAgIGdhbWVTdGF0ZTogTGliLkdhbWVTdGF0ZSxcclxuICAgIHJlc2VydmVkU3ByaXRlc0FuZENhcmRzPzogW1Nwcml0ZSwgTGliLkNhcmRdW10sXHJcbiAgICBtb3ZpbmdTcHJpdGVzQW5kQ2FyZHM/OiBbU3ByaXRlLCBMaWIuQ2FyZF1bXSxcclxuICAgIHNoYXJlQ291bnQ/OiBudW1iZXIsXHJcbiAgICByZXZlYWxDb3VudD86IG51bWJlcixcclxuICAgIHNwbGl0SW5kZXg/OiBudW1iZXIsXHJcbiAgICByZXR1cm5Ub0RlY2s/OiBib29sZWFuXHJcbikge1xyXG4gICAgY29uc3Qgc3ByaXRlcyA9IGZhY2VTcHJpdGVzRm9yUGxheWVyW2dhbWVTdGF0ZS5wbGF5ZXJJbmRleF07XHJcbiAgICBpZiAoc3ByaXRlcyA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuXHJcbiAgICBjb25zdCBjYXJkcyA9IGdhbWVTdGF0ZS5wbGF5ZXJDYXJkcztcclxuXHJcbiAgICByZXNlcnZlZFNwcml0ZXNBbmRDYXJkcyA9IHJlc2VydmVkU3ByaXRlc0FuZENhcmRzID8/IGNhcmRzLm1hcCgoY2FyZCwgaW5kZXgpID0+IDxbU3ByaXRlLCBMaWIuQ2FyZF0+W3Nwcml0ZXNbaW5kZXhdLCBjYXJkXSk7XHJcbiAgICBtb3ZpbmdTcHJpdGVzQW5kQ2FyZHMgPSBtb3ZpbmdTcHJpdGVzQW5kQ2FyZHMgPz8gW107XHJcbiAgICBzaGFyZUNvdW50ID0gc2hhcmVDb3VudCA/PyBnYW1lU3RhdGUucGxheWVyU2hhcmVDb3VudDtcclxuICAgIHJldmVhbENvdW50ID0gcmV2ZWFsQ291bnQgPz8gZ2FtZVN0YXRlLnBsYXllclJldmVhbENvdW50O1xyXG4gICAgc3BsaXRJbmRleCA9IHNwbGl0SW5kZXggPz8gY2FyZHMubGVuZ3RoO1xyXG4gICAgcmV0dXJuVG9EZWNrID0gcmV0dXJuVG9EZWNrID8/IGZhbHNlO1xyXG5cclxuICAgIC8vIGNsZWFyIGZvciByZWluc2VydGlvblxyXG4gICAgc3ByaXRlcy5zcGxpY2UoMCwgc3ByaXRlcy5sZW5ndGgpO1xyXG4gICAgY2FyZHMuc3BsaWNlKDAsIGNhcmRzLmxlbmd0aCk7XHJcblxyXG4gICAgZm9yIChjb25zdCBbcmVzZXJ2ZWRTcHJpdGUsIHJlc2VydmVkQ2FyZF0gb2YgcmVzZXJ2ZWRTcHJpdGVzQW5kQ2FyZHMpIHtcclxuICAgICAgICBpZiAoY2FyZHMubGVuZ3RoID09PSBzcGxpdEluZGV4KSB7XHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgW21vdmluZ1Nwcml0ZSwgbW92aW5nQ2FyZF0gb2YgbW92aW5nU3ByaXRlc0FuZENhcmRzKSB7XHJcbiAgICAgICAgICAgICAgICBzcHJpdGVzLnB1c2gobW92aW5nU3ByaXRlKTtcclxuICAgICAgICAgICAgICAgIGNhcmRzLnB1c2gobW92aW5nQ2FyZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChjYXJkcy5sZW5ndGggPCBzaGFyZUNvdW50KSB7XHJcbiAgICAgICAgICAgIHJlc2VydmVkU3ByaXRlLnRhcmdldCA9IG5ldyBWZWN0b3IoXHJcbiAgICAgICAgICAgICAgICBWUC5jYW52YXMud2lkdGggLyAyIC0gVlAuc3ByaXRlV2lkdGggLSBzaGFyZUNvdW50ICogVlAuc3ByaXRlR2FwICsgY2FyZHMubGVuZ3RoICogVlAuc3ByaXRlR2FwLFxyXG4gICAgICAgICAgICAgICAgVlAuY2FudmFzLmhlaWdodCAtIDIgKiBWUC5zcHJpdGVIZWlnaHQgLSBWUC5zcHJpdGVHYXBcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICB9IGVsc2UgaWYgKGNhcmRzLmxlbmd0aCA8IHJldmVhbENvdW50KSB7XHJcbiAgICAgICAgICAgIHJlc2VydmVkU3ByaXRlLnRhcmdldCA9IG5ldyBWZWN0b3IoXHJcbiAgICAgICAgICAgICAgICBWUC5jYW52YXMud2lkdGggLyAyICsgKGNhcmRzLmxlbmd0aCAtIHNoYXJlQ291bnQpICogVlAuc3ByaXRlR2FwLFxyXG4gICAgICAgICAgICAgICAgVlAuY2FudmFzLmhlaWdodCAtIDIgKiBWUC5zcHJpdGVIZWlnaHRcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBsZXQgY291bnQgPSByZXNlcnZlZFNwcml0ZXNBbmRDYXJkcy5sZW5ndGggLSByZXZlYWxDb3VudDtcclxuICAgICAgICAgICAgaWYgKCFyZXR1cm5Ub0RlY2spIHtcclxuICAgICAgICAgICAgICAgIGNvdW50ICs9IG1vdmluZ1Nwcml0ZXNBbmRDYXJkcy5sZW5ndGg7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJlc2VydmVkU3ByaXRlLnRhcmdldCA9IG5ldyBWZWN0b3IoXHJcbiAgICAgICAgICAgICAgICBWUC5jYW52YXMud2lkdGggLyAyIC0gVlAuc3ByaXRlV2lkdGggLyAyICsgKGNhcmRzLmxlbmd0aCAtIHJldmVhbENvdW50IC0gKGNvdW50IC0gMSkgLyAyKSAqIFZQLnNwcml0ZUdhcCxcclxuICAgICAgICAgICAgICAgIFZQLmNhbnZhcy5oZWlnaHQgLSBWUC5zcHJpdGVIZWlnaHRcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgc3ByaXRlcy5wdXNoKHJlc2VydmVkU3ByaXRlKTtcclxuICAgICAgICBjYXJkcy5wdXNoKHJlc2VydmVkQ2FyZCk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGNhcmRzLmxlbmd0aCA9PT0gc3BsaXRJbmRleCkge1xyXG4gICAgICAgIGZvciAoY29uc3QgW21vdmluZ1Nwcml0ZSwgbW92aW5nQ2FyZF0gb2YgbW92aW5nU3ByaXRlc0FuZENhcmRzKSB7XHJcbiAgICAgICAgICAgIHNwcml0ZXMucHVzaChtb3ZpbmdTcHJpdGUpO1xyXG4gICAgICAgICAgICBjYXJkcy5wdXNoKG1vdmluZ0NhcmQpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBnYW1lU3RhdGUucGxheWVyU2hhcmVDb3VudCA9IHNoYXJlQ291bnQ7XHJcbiAgICBnYW1lU3RhdGUucGxheWVyUmV2ZWFsQ291bnQgPSByZXZlYWxDb3VudDtcclxufVxyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGpvaW5HYW1lKGdhbWVJZDogc3RyaW5nLCBwbGF5ZXJOYW1lOiBzdHJpbmcpIHtcclxuICAgIC8vIHdhaXQgZm9yIGNvbm5lY3Rpb25cclxuICAgIGRvIHtcclxuICAgICAgICBhd2FpdCBMaWIuZGVsYXkoMTAwMCk7XHJcbiAgICAgICAgY29uc29sZS5sb2coYHdzLnJlYWR5U3RhdGU6ICR7d3MucmVhZHlTdGF0ZX0sIFdlYlNvY2tldC5PUEVOOiAke1dlYlNvY2tldC5PUEVOfWApO1xyXG4gICAgfSB3aGlsZSAod3MucmVhZHlTdGF0ZSAhPSBXZWJTb2NrZXQuT1BFTik7XHJcblxyXG4gICAgLy8gdHJ5IHRvIGpvaW4gdGhlIGdhbWVcclxuICAgIGF3YWl0IG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICBhZGRDYWxsYmFjaygnam9pbkdhbWUnLCByZXNvbHZlLCByZWplY3QpO1xyXG4gICAgICAgIHdzLnNlbmQoSlNPTi5zdHJpbmdpZnkoPExpYi5Kb2luR2FtZU1lc3NhZ2U+eyBnYW1lSWQsIHBsYXllck5hbWUgfSkpO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB0YWtlQ2FyZChvdGhlclBsYXllckluZGV4OiBudW1iZXIsIGNhcmRJbmRleDogbnVtYmVyLCBjYXJkOiBMaWIuQ2FyZCkge1xyXG4gICAgY29uc3QgYW5pbWF0aW9uc0Fzc29jaWF0ZWQgPSBuZXcgUHJvbWlzZTx2b2lkPihyZXNvbHZlID0+IHtcclxuICAgICAgICBvbkFuaW1hdGlvbnNBc3NvY2lhdGVkID0gKCkgPT4ge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgYXNzb2NpYXRlZCBhbmltYXRpb25zYCk7XHJcbiAgICAgICAgICAgIG9uQW5pbWF0aW9uc0Fzc29jaWF0ZWQgPSAoKSA9PiB7fTtcclxuICAgICAgICAgICAgcmVzb2x2ZSgpO1xyXG4gICAgICAgIH07XHJcbiAgICB9KTtcclxuXHJcbiAgICBhd2FpdCBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgYWRkQ2FsbGJhY2soJ3Rha2VDYXJkJywgcmVzb2x2ZSwgcmVqZWN0KTtcclxuICAgICAgICB3cy5zZW5kKEpTT04uc3RyaW5naWZ5KDxMaWIuVGFrZUNhcmRNZXNzYWdlPntcclxuICAgICAgICAgICAgb3RoZXJQbGF5ZXJJbmRleCxcclxuICAgICAgICAgICAgY2FyZEluZGV4LFxyXG4gICAgICAgICAgICBjYXJkXHJcbiAgICAgICAgfSkpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgYXdhaXQgYW5pbWF0aW9uc0Fzc29jaWF0ZWQ7XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkcmF3Q2FyZCgpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGNvbnN0IGFuaW1hdGlvbnNBc3NvY2lhdGVkID0gbmV3IFByb21pc2U8dm9pZD4ocmVzb2x2ZSA9PiB7XHJcbiAgICAgICAgb25BbmltYXRpb25zQXNzb2NpYXRlZCA9ICgpID0+IHtcclxuICAgICAgICAgICAgb25BbmltYXRpb25zQXNzb2NpYXRlZCA9ICgpID0+IHt9O1xyXG4gICAgICAgICAgICByZXNvbHZlKCk7XHJcbiAgICAgICAgfTtcclxuICAgIH0pO1xyXG5cclxuICAgIGF3YWl0IG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICBhZGRDYWxsYmFjaygnZHJhd0NhcmQnLCByZXNvbHZlLCByZWplY3QpO1xyXG4gICAgICAgIHdzLnNlbmQoSlNPTi5zdHJpbmdpZnkoPExpYi5EcmF3Q2FyZE1lc3NhZ2U+e1xyXG4gICAgICAgICAgICBkcmF3Q2FyZDogbnVsbFxyXG4gICAgICAgIH0pKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGF3YWl0IGFuaW1hdGlvbnNBc3NvY2lhdGVkO1xyXG59XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmV0dXJuQ2FyZHNUb0RlY2soZ2FtZVN0YXRlOiBMaWIuR2FtZVN0YXRlKSB7XHJcbiAgICBhd2FpdCBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgYWRkQ2FsbGJhY2soJ3JldHVybkNhcmRzVG9EZWNrJywgcmVzb2x2ZSwgcmVqZWN0KTtcclxuICAgICAgICB3cy5zZW5kKEpTT04uc3RyaW5naWZ5KDxMaWIuUmV0dXJuQ2FyZHNUb0RlY2tNZXNzYWdlPntcclxuICAgICAgICAgICAgY2FyZHNUb1JldHVyblRvRGVjazogc2VsZWN0ZWRJbmRpY2VzLm1hcChpID0+IGdhbWVTdGF0ZS5wbGF5ZXJDYXJkc1tpXSlcclxuICAgICAgICB9KSk7XHJcbiAgICB9KTtcclxuICAgIFxyXG4gICAgLy8gbWFrZSB0aGUgc2VsZWN0ZWQgY2FyZHMgZGlzYXBwZWFyXHJcbiAgICBzZWxlY3RlZEluZGljZXMuc3BsaWNlKDAsIHNlbGVjdGVkSW5kaWNlcy5sZW5ndGgpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmVvcmRlckNhcmRzKGdhbWVTdGF0ZTogTGliLkdhbWVTdGF0ZSkge1xyXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICBhZGRDYWxsYmFjaygncmVvcmRlckNhcmRzJywgcmVzb2x2ZSwgcmVqZWN0KTtcclxuICAgICAgICB3cy5zZW5kKEpTT04uc3RyaW5naWZ5KDxMaWIuUmVvcmRlckNhcmRzTWVzc2FnZT57XHJcbiAgICAgICAgICAgIHJlb3JkZXJlZENhcmRzOiBnYW1lU3RhdGUucGxheWVyQ2FyZHMsXHJcbiAgICAgICAgICAgIG5ld1NoYXJlQ291bnQ6IGdhbWVTdGF0ZS5wbGF5ZXJTaGFyZUNvdW50LFxyXG4gICAgICAgICAgICBuZXdSZXZlYWxDb3VudDogZ2FtZVN0YXRlLnBsYXllclJldmVhbENvdW50XHJcbiAgICAgICAgfSkpO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzb3J0QnlTdWl0KGdhbWVTdGF0ZTogTGliLkdhbWVTdGF0ZSkge1xyXG4gICAgbGV0IGNvbXBhcmVGbiA9IChbYVN1aXQsIGFSYW5rXTogTGliLkNhcmQsIFtiU3VpdCwgYlJhbmtdOiBMaWIuQ2FyZCkgPT4ge1xyXG4gICAgICAgIGlmIChhU3VpdCAhPT0gYlN1aXQpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGFTdWl0IC0gYlN1aXQ7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcmV0dXJuIGFSYW5rIC0gYlJhbms7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBwcmV2aW91c0dhbWVTdGF0ZSA9IDxMaWIuR2FtZVN0YXRlPkpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoZ2FtZVN0YXRlKSk7XHJcbiAgICBzb3J0Q2FyZHMoZ2FtZVN0YXRlLnBsYXllckNhcmRzLCAwLCBnYW1lU3RhdGUucGxheWVyU2hhcmVDb3VudCwgY29tcGFyZUZuKTtcclxuICAgIHNvcnRDYXJkcyhnYW1lU3RhdGUucGxheWVyQ2FyZHMsIGdhbWVTdGF0ZS5wbGF5ZXJTaGFyZUNvdW50LCBnYW1lU3RhdGUucGxheWVyUmV2ZWFsQ291bnQsIGNvbXBhcmVGbik7XHJcbiAgICBzb3J0Q2FyZHMoZ2FtZVN0YXRlLnBsYXllckNhcmRzLCBnYW1lU3RhdGUucGxheWVyUmV2ZWFsQ291bnQsIGdhbWVTdGF0ZS5wbGF5ZXJDYXJkcy5sZW5ndGgsIGNvbXBhcmVGbik7XHJcbiAgICBhc3NvY2lhdGVBbmltYXRpb25zV2l0aENhcmRzKGdhbWVTdGF0ZSwgcHJldmlvdXNHYW1lU3RhdGUpO1xyXG4gICAgcmV0dXJuIHJlb3JkZXJDYXJkcyhnYW1lU3RhdGUpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc29ydEJ5UmFuayhnYW1lU3RhdGU6IExpYi5HYW1lU3RhdGUpIHtcclxuICAgIGxldCBjb21wYXJlRm4gPSAoW2FTdWl0LCBhUmFua106IExpYi5DYXJkLCBbYlN1aXQsIGJSYW5rXTogTGliLkNhcmQpID0+IHtcclxuICAgICAgICBpZiAoYVJhbmsgIT09IGJSYW5rKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBhUmFuayAtIGJSYW5rO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHJldHVybiBhU3VpdCAtIGJTdWl0O1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgcHJldmlvdXNHYW1lU3RhdGUgPSA8TGliLkdhbWVTdGF0ZT5KU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGdhbWVTdGF0ZSkpO1xyXG4gICAgc29ydENhcmRzKGdhbWVTdGF0ZS5wbGF5ZXJDYXJkcywgMCwgZ2FtZVN0YXRlLnBsYXllclNoYXJlQ291bnQsIGNvbXBhcmVGbik7XHJcbiAgICBzb3J0Q2FyZHMoZ2FtZVN0YXRlLnBsYXllckNhcmRzLCBnYW1lU3RhdGUucGxheWVyU2hhcmVDb3VudCwgZ2FtZVN0YXRlLnBsYXllclJldmVhbENvdW50LCBjb21wYXJlRm4pO1xyXG4gICAgc29ydENhcmRzKGdhbWVTdGF0ZS5wbGF5ZXJDYXJkcywgZ2FtZVN0YXRlLnBsYXllclJldmVhbENvdW50LCBnYW1lU3RhdGUucGxheWVyQ2FyZHMubGVuZ3RoLCBjb21wYXJlRm4pO1xyXG4gICAgYXNzb2NpYXRlQW5pbWF0aW9uc1dpdGhDYXJkcyhnYW1lU3RhdGUsIHByZXZpb3VzR2FtZVN0YXRlKTtcclxuICAgIHJldHVybiByZW9yZGVyQ2FyZHMoZ2FtZVN0YXRlKTtcclxufVxyXG5cclxuZnVuY3Rpb24gc29ydENhcmRzKFxyXG4gICAgY2FyZHM6IExpYi5DYXJkW10sXHJcbiAgICBzdGFydDogbnVtYmVyLFxyXG4gICAgZW5kOiBudW1iZXIsXHJcbiAgICBjb21wYXJlRm46IChhOiBMaWIuQ2FyZCwgYjogTGliLkNhcmQpID0+IG51bWJlclxyXG4pIHtcclxuICAgIGNvbnN0IHNlY3Rpb24gPSBjYXJkcy5zbGljZShzdGFydCwgZW5kKTtcclxuICAgIHNlY3Rpb24uc29ydChjb21wYXJlRm4pO1xyXG4gICAgY2FyZHMuc3BsaWNlKHN0YXJ0LCBlbmQgLSBzdGFydCwgLi4uc2VjdGlvbik7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiB3YWl0KCkge1xyXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICBhZGRDYWxsYmFjaygnd2FpdCcsIHJlc29sdmUsIHJlamVjdCk7XHJcbiAgICAgICAgd3Muc2VuZChKU09OLnN0cmluZ2lmeSg8TGliLldhaXRNZXNzYWdlPntcclxuICAgICAgICAgICAgd2FpdDogbnVsbFxyXG4gICAgICAgIH0pKTtcclxuICAgIH0pO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcHJvY2VlZCgpIHtcclxuICAgIHJldHVybiBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgYWRkQ2FsbGJhY2soJ3Byb2NlZWQnLCByZXNvbHZlLCByZWplY3QpO1xyXG4gICAgICAgIHdzLnNlbmQoSlNPTi5zdHJpbmdpZnkoPExpYi5Qcm9jZWVkTWVzc2FnZT57XHJcbiAgICAgICAgICAgIHByb2NlZWQ6IG51bGxcclxuICAgICAgICB9KSk7XHJcbiAgICB9KTtcclxufSIsImV4cG9ydCBkZWZhdWx0IGNsYXNzIFZlY3RvciB7XHJcbiAgICByZWFkb25seSB4OiBudW1iZXIgPSAwO1xyXG4gICAgcmVhZG9ubHkgeTogbnVtYmVyID0gMDtcclxuXHJcbiAgICBjb25zdHJ1Y3Rvcih4OiBudW1iZXIsIHk6IG51bWJlcikge1xyXG4gICAgICAgIHRoaXMueCA9IHg7XHJcbiAgICAgICAgdGhpcy55ID0geTtcclxuICAgIH1cclxuXHJcbiAgICAvKlxyXG4gICAgYXNzaWduKHY6IFZlY3Rvcikge1xyXG4gICAgICAgIHRoaXMueCA9IHYueDtcclxuICAgICAgICB0aGlzLnkgPSB2Lnk7XHJcbiAgICB9XHJcbiAgICAqL1xyXG5cclxuICAgIGFkZCh2OiBWZWN0b3IpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlY3Rvcih0aGlzLnggKyB2LngsIHRoaXMueSArIHYueSk7XHJcbiAgICB9XHJcblxyXG4gICAgLypcclxuICAgIGFkZFNlbGYodjogVmVjdG9yKSB7XHJcbiAgICAgICAgdGhpcy54ICs9IHYueDtcclxuICAgICAgICB0aGlzLnkgKz0gdi55O1xyXG4gICAgfVxyXG4gICAgKi9cclxuICAgIFxyXG4gICAgc3ViKHY6IFZlY3Rvcikge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjdG9yKHRoaXMueCAtIHYueCwgdGhpcy55IC0gdi55KTtcclxuICAgIH1cclxuXHJcbiAgICAvKlxyXG4gICAgc3ViU2VsZih2OiBWZWN0b3IpIHtcclxuICAgICAgICB0aGlzLnggLT0gdi54O1xyXG4gICAgICAgIHRoaXMueSAtPSB2Lnk7XHJcbiAgICB9XHJcbiAgICAqL1xyXG4gICAgXHJcbiAgICBnZXQgbGVuZ3RoKCkge1xyXG4gICAgICAgIHJldHVybiBNYXRoLnNxcnQodGhpcy54ICogdGhpcy54ICsgdGhpcy55ICogdGhpcy55KTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgZGlzdGFuY2UodjogVmVjdG9yKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5zdWIodikubGVuZ3RoO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBzY2FsZShzOiBudW1iZXIpOiBWZWN0b3Ige1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjdG9yKHMgKiB0aGlzLngsIHMgKiB0aGlzLnkpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qXHJcbiAgICBzY2FsZVNlbGYoczogbnVtYmVyKSB7XHJcbiAgICAgICAgdGhpcy54ICo9IHM7XHJcbiAgICAgICAgdGhpcy55ICo9IHM7XHJcbiAgICB9XHJcbiAgICAqL1xyXG59IiwiaW1wb3J0IFZlY3RvciBmcm9tICcuL3ZlY3Rvcic7XHJcblxyXG5leHBvcnQgY29uc3QgY2FudmFzID0gPEhUTUxDYW52YXNFbGVtZW50PmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjYW52YXMnKTtcclxuZXhwb3J0IGNvbnN0IGNvbnRleHQgPSA8Q2FudmFzUmVuZGVyaW5nQ29udGV4dDJEPmNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xyXG5cclxuLy8gZ2V0IHBpeGVscyBwZXIgY2VudGltZXRlciwgd2hpY2ggaXMgY29uc3RhbnRcclxuY29uc3QgdGVzdEVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxudGVzdEVsZW1lbnQuc3R5bGUud2lkdGggPSAnMWNtJztcclxuZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh0ZXN0RWxlbWVudCk7XHJcbmV4cG9ydCBjb25zdCBwaXhlbHNQZXJDTSA9IHRlc3RFbGVtZW50Lm9mZnNldFdpZHRoO1xyXG5kb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKHRlc3RFbGVtZW50KTtcclxuXHJcbi8vIHRoZXNlIHBhcmFtZXRlcnMgY2hhbmdlIHdpdGggcmVzaXppbmdcclxuZXhwb3J0IGxldCBjYW52YXNSZWN0ID0gY2FudmFzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG5leHBvcnQgbGV0IHBpeGVsc1BlclBlcmNlbnQgPSAwO1xyXG5cclxuZXhwb3J0IGxldCBzcHJpdGVXaWR0aDogbnVtYmVyO1xyXG5leHBvcnQgbGV0IHNwcml0ZUhlaWdodDogbnVtYmVyO1xyXG5leHBvcnQgbGV0IHNwcml0ZUdhcDogbnVtYmVyO1xyXG5leHBvcnQgbGV0IHNwcml0ZURlY2tHYXA6IG51bWJlcjtcclxuXHJcbmV4cG9ydCBsZXQgc29ydEJ5UmFua0ZvbnQ6IHN0cmluZztcclxuZXhwb3J0IGxldCBzb3J0QnlSYW5rQm91bmRzOiBbVmVjdG9yLCBWZWN0b3JdO1xyXG5cclxuZXhwb3J0IGxldCBzb3J0QnlTdWl0Rm9udDogc3RyaW5nO1xyXG5leHBvcnQgbGV0IHNvcnRCeVN1aXRCb3VuZHM6IFtWZWN0b3IsIFZlY3Rvcl07XHJcblxyXG5leHBvcnQgbGV0IHdhaXRGb250OiBzdHJpbmc7XHJcbmV4cG9ydCBsZXQgd2FpdEJvdW5kczogW1ZlY3RvciwgVmVjdG9yXTtcclxuXHJcbmV4cG9ydCBsZXQgcHJvY2VlZEZvbnQ6IHN0cmluZztcclxuZXhwb3J0IGxldCBwcm9jZWVkQm91bmRzOiBbVmVjdG9yLCBWZWN0b3JdO1xyXG5cclxuZXhwb3J0IGxldCByZWFkeUZvbnQ6IHN0cmluZztcclxuZXhwb3J0IGxldCByZWFkeUJvdW5kczogW1ZlY3RvciwgVmVjdG9yXTtcclxuXHJcbmV4cG9ydCBsZXQgY291bnRkb3duRm9udDogc3RyaW5nO1xyXG5leHBvcnQgbGV0IGNvdW50ZG93bkJvdW5kczogW1ZlY3RvciwgVmVjdG9yXTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiByZWNhbGN1bGF0ZVBhcmFtZXRlcnMoKSB7XHJcbiAgICBjYW52YXMud2lkdGggPSB3aW5kb3cuaW5uZXJXaWR0aDtcclxuICAgIGNhbnZhcy5oZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQgLSAwLjUgKiBwaXhlbHNQZXJDTTtcclxuICAgIGNhbnZhc1JlY3QgPSBjYW52YXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcblxyXG4gICAgcGl4ZWxzUGVyUGVyY2VudCA9IGNhbnZhcy5oZWlnaHQgLyAxMDA7XHJcbiAgICBzcHJpdGVXaWR0aCA9IDEyICogcGl4ZWxzUGVyUGVyY2VudDtcclxuICAgIHNwcml0ZUhlaWdodCA9IDE4ICogcGl4ZWxzUGVyUGVyY2VudDtcclxuICAgIHNwcml0ZUdhcCA9IDIgKiBwaXhlbHNQZXJQZXJjZW50O1xyXG4gICAgc3ByaXRlRGVja0dhcCA9IDAuNSAqIHBpeGVsc1BlclBlcmNlbnQ7XHJcblxyXG4gICAgc29ydEJ5UmFua0JvdW5kcyA9IFtuZXcgVmVjdG9yKDAsIDApLCBuZXcgVmVjdG9yKDAsIDApXTtcclxuXHJcbiAgICBzb3J0QnlTdWl0Qm91bmRzID0gW25ldyBWZWN0b3IoMCwgMCksIG5ldyBWZWN0b3IoMCwgMCldO1xyXG5cclxuICAgIGNvbnN0IGFwcHJvdmVQb3NpdGlvbiA9IG5ldyBWZWN0b3IoY2FudmFzLndpZHRoIC0gMiAqIHNwcml0ZUhlaWdodCwgY2FudmFzLmhlaWdodCAtIDExICogc3ByaXRlSGVpZ2h0IC8gMTIpO1xyXG4gICAgd2FpdEZvbnQgPSBgJHtzcHJpdGVIZWlnaHQgLyAzfXB4IFN1Z2FybGlrZWA7XHJcbiAgICB3YWl0Qm91bmRzID0gW2FwcHJvdmVQb3NpdGlvbiwgZ2V0Qm90dG9tUmlnaHQoJ1dhaXQhJywgd2FpdEZvbnQsIGFwcHJvdmVQb3NpdGlvbildO1xyXG5cclxuICAgIGNvbnN0IGRpc2FwcHJvdmVQb3NpdGlvbiA9IG5ldyBWZWN0b3IoY2FudmFzLndpZHRoIC0gMiAqIHNwcml0ZUhlaWdodCwgY2FudmFzLmhlaWdodCAtIDUgKiBzcHJpdGVIZWlnaHQgLyAxMik7XHJcbiAgICBwcm9jZWVkRm9udCA9IGAke3Nwcml0ZUhlaWdodCAvIDN9cHggU3VnYXJsaWtlYDtcclxuICAgIHByb2NlZWRCb3VuZHMgPSBbZGlzYXBwcm92ZVBvc2l0aW9uLCBnZXRCb3R0b21SaWdodCgnUHJvY2VlZC4nLCBwcm9jZWVkRm9udCwgZGlzYXBwcm92ZVBvc2l0aW9uKV07XHJcblxyXG4gICAgY29uc3QgcmVhZHlQb3NpdGlvbiA9IG5ldyBWZWN0b3IoY2FudmFzLndpZHRoIC0gMiAqIHNwcml0ZUhlaWdodCwgY2FudmFzLmhlaWdodCAtIDMgKiBzcHJpdGVIZWlnaHQgLyA0KTtcclxuICAgIHJlYWR5Rm9udCA9IGAke3Nwcml0ZUhlaWdodCAvIDJ9cHggU3VnYXJsaWtlYDtcclxuICAgIHJlYWR5Qm91bmRzID0gW3JlYWR5UG9zaXRpb24sIGdldEJvdHRvbVJpZ2h0KCdSZWFkeSEnLCByZWFkeUZvbnQsIHJlYWR5UG9zaXRpb24pXTtcclxuXHJcbiAgICBjb25zdCBjb3VudGRvd25Qb3NpdGlvbiA9IG5ldyBWZWN0b3IoY2FudmFzLndpZHRoIC0gMy41ICogc3ByaXRlSGVpZ2h0LCBjYW52YXMuaGVpZ2h0IC0gMiAqIHNwcml0ZUhlaWdodCAvIDMpO1xyXG4gICAgY291bnRkb3duRm9udCA9IGAke3Nwcml0ZUhlaWdodCAvIDJ9cHggU3VnYXJsaWtlYDtcclxuICAgIGNvdW50ZG93bkJvdW5kcyA9IFtjb3VudGRvd25Qb3NpdGlvbiwgZ2V0Qm90dG9tUmlnaHQoJ1dhaXRpbmcgMTAgc2Vjb25kcy4uLicsIGNvdW50ZG93bkZvbnQsIGNvdW50ZG93blBvc2l0aW9uKV07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldEJvdHRvbVJpZ2h0KHRleHQ6IHN0cmluZywgZm9udDogc3RyaW5nLCBwb3NpdGlvbjogVmVjdG9yKTogVmVjdG9yIHtcclxuICAgIGNvbnRleHQuZm9udCA9IGZvbnQ7XHJcbiAgICBjb250ZXh0LnRleHRCYXNlbGluZSA9ICd0b3AnO1xyXG4gICAgY29uc3QgdGV4dE1ldHJpY3MgPSBjb250ZXh0Lm1lYXN1cmVUZXh0KHRleHQpO1xyXG4gICAgcmV0dXJuIHBvc2l0aW9uLmFkZChuZXcgVmVjdG9yKHRleHRNZXRyaWNzLndpZHRoLCB0ZXh0TWV0cmljcy5hY3R1YWxCb3VuZGluZ0JveERlc2NlbnQpKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldFRyYW5zZm9ybUZvclBsYXllcihyZWxhdGl2ZUluZGV4OiBudW1iZXIpOiBET01NYXRyaXgge1xyXG4gICAgY29udGV4dC5zYXZlKCk7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIGlmIChyZWxhdGl2ZUluZGV4ID09PSAwKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBjb250ZXh0LmdldFRyYW5zZm9ybSgpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAocmVsYXRpdmVJbmRleCA9PT0gMSkge1xyXG4gICAgICAgICAgICBjb250ZXh0LnRyYW5zbGF0ZSgwLCAoY2FudmFzLndpZHRoICsgY2FudmFzLmhlaWdodCkgLyAyKTtcclxuICAgICAgICAgICAgY29udGV4dC5yb3RhdGUoLU1hdGguUEkgLyAyKTtcclxuICAgICAgICAgICAgcmV0dXJuIGNvbnRleHQuZ2V0VHJhbnNmb3JtKCk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChyZWxhdGl2ZUluZGV4ID09PSAyKSB7XHJcbiAgICAgICAgICAgIC8vIG5vIHRyYW5zZm9ybVxyXG4gICAgICAgICAgICByZXR1cm4gY29udGV4dC5nZXRUcmFuc2Zvcm0oKTtcclxuICAgICAgICB9IGVsc2UgaWYgKHJlbGF0aXZlSW5kZXggPT09IDMpIHtcclxuICAgICAgICAgICAgY29udGV4dC50cmFuc2xhdGUoY2FudmFzLndpZHRoLCAoY2FudmFzLmhlaWdodCAtIGNhbnZhcy53aWR0aCkgLyAyKTtcclxuICAgICAgICAgICAgY29udGV4dC5yb3RhdGUoTWF0aC5QSSAvIDIpO1xyXG4gICAgICAgICAgICByZXR1cm4gY29udGV4dC5nZXRUcmFuc2Zvcm0oKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGluZGV4IG11c3QgYmUgMCwgMSwgMiwgb3IgMzsgZ290OiAke3JlbGF0aXZlSW5kZXh9YCk7XHJcbiAgICAgICAgfVxyXG4gICAgfSBmaW5hbGx5IHtcclxuICAgICAgICBjb250ZXh0LnJlc3RvcmUoKTtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldFJlbGF0aXZlUGxheWVySW5kZXgob3RoZXJQbGF5ZXJJbmRleDogbnVtYmVyLCBwbGF5ZXJJbmRleDogbnVtYmVyKSB7XHJcbiAgICBsZXQgcmVsYXRpdmVJbmRleCA9IG90aGVyUGxheWVySW5kZXggLSBwbGF5ZXJJbmRleDtcclxuICAgIGlmIChyZWxhdGl2ZUluZGV4ID49IDApIHtcclxuICAgICAgICByZXR1cm4gcmVsYXRpdmVJbmRleDtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gb3RoZXJQbGF5ZXJJbmRleCAtIChwbGF5ZXJJbmRleCAtIDQpO1xyXG59IiwiaW1wb3J0IGJpbmFyeVNlYXJjaCBmcm9tICdiaW5hcnktc2VhcmNoJztcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBiaW5hcnlTZWFyY2hOdW1iZXIoaGF5c3RhY2s6IG51bWJlcltdLCBuZWVkbGU6IG51bWJlciwgbG93PzogbnVtYmVyLCBoaWdoPzogbnVtYmVyKSB7XHJcbiAgICByZXR1cm4gYmluYXJ5U2VhcmNoKGhheXN0YWNrLCBuZWVkbGUsIChhLCBiKSA9PiBhIC0gYiwgbG93LCBoaWdoKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldENvb2tpZShuYW1lOiBzdHJpbmcpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xyXG4gICAgY29uc3QgcGFydHMgPSBgOyAke2RvY3VtZW50LmNvb2tpZX1gLnNwbGl0KGA7ICR7bmFtZX09YCk7XHJcbiAgICBpZiAocGFydHMubGVuZ3RoID09PSAyKSB7XHJcbiAgICAgICAgcmV0dXJuIHBhcnRzLnBvcCgpPy5zcGxpdCgnOycpLnNoaWZ0KCk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRQYXJhbShuYW1lOiBzdHJpbmcpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xyXG4gICAgcmV0dXJuIHdpbmRvdy5sb2NhdGlvbi5zZWFyY2guc3BsaXQoYCR7bmFtZX09YClbMV0/LnNwbGl0KFwiJlwiKVswXTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGRlbGF5KG1zOiBudW1iZXIpIHtcclxuICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgbXMpKTtcclxufVxyXG5cclxuZXhwb3J0IGVudW0gU3VpdCB7XHJcbiAgICBDbHViLCAvLyAwXHJcbiAgICBEaWFtb25kLFxyXG4gICAgSGVhcnQsXHJcbiAgICBTcGFkZSxcclxuICAgIEpva2VyLCAvLyA0XHJcbn1cclxuXHJcbmV4cG9ydCBlbnVtIFJhbmsge1xyXG4gICAgU21hbGwsIC8vIDBcclxuICAgIEFjZSxcclxuICAgIFR3byxcclxuICAgIFRocmVlLFxyXG4gICAgRm91cixcclxuICAgIEZpdmUsXHJcbiAgICBTaXgsXHJcbiAgICBTZXZlbixcclxuICAgIEVpZ2h0LFxyXG4gICAgTmluZSxcclxuICAgIFRlbixcclxuICAgIEphY2ssXHJcbiAgICBRdWVlbixcclxuICAgIEtpbmcsXHJcbiAgICBCaWcsIC8vIDE0XHJcbn1cclxuXHJcbmV4cG9ydCB0eXBlIENhcmQgPSBbU3VpdCwgUmFua107XHJcblxyXG5leHBvcnQgdHlwZSBQbGF5ZXJTdGF0ZSA9IFwiV2FpdFwiIHwgXCJQcm9jZWVkXCIgfCBcIlJlYWR5XCIgfCBBY3RpdmU7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEFjdGl2ZSB7XHJcbiAgICB0eXBlOiBcIkFjdGl2ZVwiO1xyXG4gICAgYWN0aXZlVGltZTogbnVtYmVyO1xyXG59XHJcblxyXG5leHBvcnQgY29uc3QgYWN0aXZlQ29vbGRvd24gPSAxMDAwMDsgLy9taWxsaXNlY29uZHNcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgT3RoZXJQbGF5ZXIge1xyXG4gICAgbmFtZTogc3RyaW5nO1xyXG4gICAgc2hhcmVDb3VudDogbnVtYmVyO1xyXG4gICAgcmV2ZWFsZWRDYXJkczogQ2FyZFtdO1xyXG4gICAgY2FyZENvdW50OiBudW1iZXI7XHJcbiAgICAvL3N0YXRlOiBQbGF5ZXJTdGF0ZTtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBHYW1lU3RhdGUge1xyXG4gICAgZGVja0NvdW50OiBudW1iZXI7XHJcbiAgICBwbGF5ZXJJbmRleDogbnVtYmVyO1xyXG4gICAgcGxheWVyQ2FyZHM6IENhcmRbXTtcclxuICAgIHBsYXllclNoYXJlQ291bnQ6IG51bWJlcjtcclxuICAgIHBsYXllclJldmVhbENvdW50OiBudW1iZXI7XHJcbiAgICAvL3BsYXllclN0YXRlOiBQbGF5ZXJTdGF0ZTtcclxuICAgIG90aGVyUGxheWVyczogKE90aGVyUGxheWVyIHwgbnVsbClbXTtcclxufVxyXG5cclxuZXhwb3J0IHR5cGUgTWV0aG9kTmFtZSA9XHJcbiAgICBcImpvaW5HYW1lXCIgfFxyXG4gICAgXCJ0YWtlQ2FyZFwiIHxcclxuICAgIFwiZHJhd0NhcmRcIiB8XHJcbiAgICBcInJldHVybkNhcmRzVG9EZWNrXCIgfFxyXG4gICAgXCJyZW9yZGVyQ2FyZHNcIiB8XHJcbiAgICBcIndhaXRcIiB8XHJcbiAgICBcInByb2NlZWRcIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgTWV0aG9kUmVzdWx0IHtcclxuICAgIG1ldGhvZE5hbWU6IE1ldGhvZE5hbWU7XHJcbiAgICBlcnJvckRlc2NyaXB0aW9uPzogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEpvaW5HYW1lTWVzc2FnZSB7XHJcbiAgICBnYW1lSWQ6IHN0cmluZztcclxuICAgIHBsYXllck5hbWU6IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBUYWtlQ2FyZE1lc3NhZ2Uge1xyXG4gICAgb3RoZXJQbGF5ZXJJbmRleDogbnVtYmVyO1xyXG4gICAgY2FyZEluZGV4OiBudW1iZXI7XHJcbiAgICBjYXJkOiBDYXJkO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIERyYXdDYXJkTWVzc2FnZSB7XHJcbiAgICBkcmF3Q2FyZDogbnVsbDtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBSZXR1cm5DYXJkc1RvRGVja01lc3NhZ2Uge1xyXG4gICAgY2FyZHNUb1JldHVyblRvRGVjazogQ2FyZFtdO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFJlb3JkZXJDYXJkc01lc3NhZ2Uge1xyXG4gICAgcmVvcmRlcmVkQ2FyZHM6IENhcmRbXTtcclxuICAgIG5ld1NoYXJlQ291bnQ6IG51bWJlcjtcclxuICAgIG5ld1JldmVhbENvdW50OiBudW1iZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgV2FpdE1lc3NhZ2Uge1xyXG4gICAgd2FpdDogbnVsbDtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBQcm9jZWVkTWVzc2FnZSB7XHJcbiAgICBwcm9jZWVkOiBudWxsO1xyXG59Il19
