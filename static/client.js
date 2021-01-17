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
VP.canvas.onmousedown = async (event) => {
    await onDown(event);
};
VP.canvas.ontouchstart = async (event) => {
    const touch = event.touches[0];
    if (touch !== undefined) {
        await onDown(touch);
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
let previousTouch;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYXdhaXQtc2VtYXBob3JlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2JpbmFyeS1zZWFyY2gvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL3RpbWVycy1icm93c2VyaWZ5L21haW4uanMiLCJzcmMvY2xpZW50L2NhcmQtaW1hZ2VzLnRzIiwic3JjL2NsaWVudC9nYW1lLnRzIiwic3JjL2NsaWVudC9pbnB1dC50cyIsInNyYy9jbGllbnQvbG9iYnkudHMiLCJzcmMvY2xpZW50L3JlbmRlci50cyIsInNyYy9jbGllbnQvc3ByaXRlLnRzIiwic3JjL2NsaWVudC9zdGF0ZS50cyIsInNyYy9jbGllbnQvdmVjdG9yLnRzIiwic3JjL2NsaWVudC92aWV3LXBhcmFtcy50cyIsInNyYy9saWIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUN4TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FDM0VBLDRDQUE4QjtBQUU5QixNQUFNLEtBQUssR0FBRyxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQztBQUM5RCxNQUFNLEtBQUssR0FBRyxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFFakcsTUFBTSxVQUFVLEdBQUcsSUFBSSxHQUFHLEVBQTRCLENBQUM7QUFFaEQsS0FBSyxVQUFVLElBQUk7SUFDdEIsa0NBQWtDO0lBQ2xDLEtB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O0lBQ0wsaUNBQUssQ0FBQTtBQUNULENBQUMsRUFOVyxJQUFJLEdBQUosWUFBSSxLQUFKLFlBQUksUUFNZjtBQUVELElBQVksSUFnQlg7QUFoQkQsV0FBWSxJQUFJO0lBQ1osaUNBQUssQ0FBQTtJQUNMLDZCQUFHLENBQUE7SUFDSCw2QkFBRyxDQUFBO0lBQ0gsaUNBQUssQ0FBQTtJQUNMLCtCQUFJLENBQUE7SUFDSiwrQkFBSSxDQUFBO0lBQ0osNkJBQUcsQ0FBQTtJQUNILGlDQUFLLENBQUE7SUFDTCxpQ0FBSyxDQUFBO0lBQ0wsK0JBQUksQ0FBQTtJQUNKLDhCQUFHLENBQUE7SUFDSCxnQ0FBSSxDQUFBO0lBQ0osa0NBQUssQ0FBQTtJQUNMLGdDQUFJLENBQUE7SUFDSiw4QkFBRyxDQUFBO0FBQ1AsQ0FBQyxFQWhCVyxJQUFJLEdBQUosWUFBSSxLQUFKLFlBQUksUUFnQmY7QUFXWSxRQUFBLGNBQWMsR0FBRyxLQUFLLENBQUMsQ0FBQyxjQUFjIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiXCJ1c2Ugc3RyaWN0XCI7XG5jbGFzcyBTZW1hcGhvcmUge1xuICAgIGNvbnN0cnVjdG9yKGNvdW50KSB7XG4gICAgICAgIHRoaXMudGFza3MgPSBbXTtcbiAgICAgICAgdGhpcy5jb3VudCA9IGNvdW50O1xuICAgIH1cbiAgICBzY2hlZCgpIHtcbiAgICAgICAgaWYgKHRoaXMuY291bnQgPiAwICYmIHRoaXMudGFza3MubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgdGhpcy5jb3VudC0tO1xuICAgICAgICAgICAgbGV0IG5leHQgPSB0aGlzLnRhc2tzLnNoaWZ0KCk7XG4gICAgICAgICAgICBpZiAobmV4dCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgXCJVbmV4cGVjdGVkIHVuZGVmaW5lZCB2YWx1ZSBpbiB0YXNrcyBsaXN0XCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgYWNxdWlyZSgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXMsIHJlaikgPT4ge1xuICAgICAgICAgICAgdmFyIHRhc2sgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgdmFyIHJlbGVhc2VkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgcmVzKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFyZWxlYXNlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVsZWFzZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb3VudCsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zY2hlZCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdGhpcy50YXNrcy5wdXNoKHRhc2spO1xuICAgICAgICAgICAgaWYgKHByb2Nlc3MgJiYgcHJvY2Vzcy5uZXh0VGljaykge1xuICAgICAgICAgICAgICAgIHByb2Nlc3MubmV4dFRpY2sodGhpcy5zY2hlZC5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHNldEltbWVkaWF0ZSh0aGlzLnNjaGVkLmJpbmQodGhpcykpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgdXNlKGYpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYWNxdWlyZSgpXG4gICAgICAgICAgICAudGhlbihyZWxlYXNlID0+IHtcbiAgICAgICAgICAgIHJldHVybiBmKClcbiAgICAgICAgICAgICAgICAudGhlbigocmVzKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVsZWFzZSgpO1xuICAgICAgICAgICAgICAgIHJldHVybiByZXM7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVsZWFzZSgpO1xuICAgICAgICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG59XG5leHBvcnRzLlNlbWFwaG9yZSA9IFNlbWFwaG9yZTtcbmNsYXNzIE11dGV4IGV4dGVuZHMgU2VtYXBob3JlIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoMSk7XG4gICAgfVxufVxuZXhwb3J0cy5NdXRleCA9IE11dGV4O1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9aW5kZXguanMubWFwIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihoYXlzdGFjaywgbmVlZGxlLCBjb21wYXJhdG9yLCBsb3csIGhpZ2gpIHtcbiAgdmFyIG1pZCwgY21wO1xuXG4gIGlmKGxvdyA9PT0gdW5kZWZpbmVkKVxuICAgIGxvdyA9IDA7XG5cbiAgZWxzZSB7XG4gICAgbG93ID0gbG93fDA7XG4gICAgaWYobG93IDwgMCB8fCBsb3cgPj0gaGF5c3RhY2subGVuZ3RoKVxuICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoXCJpbnZhbGlkIGxvd2VyIGJvdW5kXCIpO1xuICB9XG5cbiAgaWYoaGlnaCA9PT0gdW5kZWZpbmVkKVxuICAgIGhpZ2ggPSBoYXlzdGFjay5sZW5ndGggLSAxO1xuXG4gIGVsc2Uge1xuICAgIGhpZ2ggPSBoaWdofDA7XG4gICAgaWYoaGlnaCA8IGxvdyB8fCBoaWdoID49IGhheXN0YWNrLmxlbmd0aClcbiAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKFwiaW52YWxpZCB1cHBlciBib3VuZFwiKTtcbiAgfVxuXG4gIHdoaWxlKGxvdyA8PSBoaWdoKSB7XG4gICAgLy8gVGhlIG5haXZlIGBsb3cgKyBoaWdoID4+PiAxYCBjb3VsZCBmYWlsIGZvciBhcnJheSBsZW5ndGhzID4gMioqMzFcbiAgICAvLyBiZWNhdXNlIGA+Pj5gIGNvbnZlcnRzIGl0cyBvcGVyYW5kcyB0byBpbnQzMi4gYGxvdyArIChoaWdoIC0gbG93ID4+PiAxKWBcbiAgICAvLyB3b3JrcyBmb3IgYXJyYXkgbGVuZ3RocyA8PSAyKiozMi0xIHdoaWNoIGlzIGFsc28gSmF2YXNjcmlwdCdzIG1heCBhcnJheVxuICAgIC8vIGxlbmd0aC5cbiAgICBtaWQgPSBsb3cgKyAoKGhpZ2ggLSBsb3cpID4+PiAxKTtcbiAgICBjbXAgPSArY29tcGFyYXRvcihoYXlzdGFja1ttaWRdLCBuZWVkbGUsIG1pZCwgaGF5c3RhY2spO1xuXG4gICAgLy8gVG9vIGxvdy5cbiAgICBpZihjbXAgPCAwLjApXG4gICAgICBsb3cgID0gbWlkICsgMTtcblxuICAgIC8vIFRvbyBoaWdoLlxuICAgIGVsc2UgaWYoY21wID4gMC4wKVxuICAgICAgaGlnaCA9IG1pZCAtIDE7XG5cbiAgICAvLyBLZXkgZm91bmQuXG4gICAgZWxzZVxuICAgICAgcmV0dXJuIG1pZDtcbiAgfVxuXG4gIC8vIEtleSBub3QgZm91bmQuXG4gIHJldHVybiB+bG93O1xufVxuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbi8vIGNhY2hlZCBmcm9tIHdoYXRldmVyIGdsb2JhbCBpcyBwcmVzZW50IHNvIHRoYXQgdGVzdCBydW5uZXJzIHRoYXQgc3R1YiBpdFxuLy8gZG9uJ3QgYnJlYWsgdGhpbmdzLiAgQnV0IHdlIG5lZWQgdG8gd3JhcCBpdCBpbiBhIHRyeSBjYXRjaCBpbiBjYXNlIGl0IGlzXG4vLyB3cmFwcGVkIGluIHN0cmljdCBtb2RlIGNvZGUgd2hpY2ggZG9lc24ndCBkZWZpbmUgYW55IGdsb2JhbHMuICBJdCdzIGluc2lkZSBhXG4vLyBmdW5jdGlvbiBiZWNhdXNlIHRyeS9jYXRjaGVzIGRlb3B0aW1pemUgaW4gY2VydGFpbiBlbmdpbmVzLlxuXG52YXIgY2FjaGVkU2V0VGltZW91dDtcbnZhciBjYWNoZWRDbGVhclRpbWVvdXQ7XG5cbmZ1bmN0aW9uIGRlZmF1bHRTZXRUaW1vdXQoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdzZXRUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG5mdW5jdGlvbiBkZWZhdWx0Q2xlYXJUaW1lb3V0ICgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2NsZWFyVGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuKGZ1bmN0aW9uICgpIHtcbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIHNldFRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIGNsZWFyVGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICB9XG59ICgpKVxuZnVuY3Rpb24gcnVuVGltZW91dChmdW4pIHtcbiAgICBpZiAoY2FjaGVkU2V0VGltZW91dCA9PT0gc2V0VGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgLy8gaWYgc2V0VGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZFNldFRpbWVvdXQgPT09IGRlZmF1bHRTZXRUaW1vdXQgfHwgIWNhY2hlZFNldFRpbWVvdXQpICYmIHNldFRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9IGNhdGNoKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0IHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKG51bGwsIGZ1biwgMCk7XG4gICAgICAgIH0gY2F0Y2goZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvclxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbCh0aGlzLCBmdW4sIDApO1xuICAgICAgICB9XG4gICAgfVxuXG5cbn1cbmZ1bmN0aW9uIHJ1bkNsZWFyVGltZW91dChtYXJrZXIpIHtcbiAgICBpZiAoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgLy8gaWYgY2xlYXJUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBkZWZhdWx0Q2xlYXJUaW1lb3V0IHx8ICFjYWNoZWRDbGVhclRpbWVvdXQpICYmIGNsZWFyVGltZW91dCkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfSBjYXRjaCAoZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgIHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwobnVsbCwgbWFya2VyKTtcbiAgICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvci5cbiAgICAgICAgICAgIC8vIFNvbWUgdmVyc2lvbnMgb2YgSS5FLiBoYXZlIGRpZmZlcmVudCBydWxlcyBmb3IgY2xlYXJUaW1lb3V0IHZzIHNldFRpbWVvdXRcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbCh0aGlzLCBtYXJrZXIpO1xuICAgICAgICB9XG4gICAgfVxuXG5cblxufVxudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcbnZhciBjdXJyZW50UXVldWU7XG52YXIgcXVldWVJbmRleCA9IC0xO1xuXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XG4gICAgaWYgKCFkcmFpbmluZyB8fCAhY3VycmVudFF1ZXVlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICB9XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBkcmFpblF1ZXVlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0ID0gcnVuVGltZW91dChjbGVhblVwTmV4dFRpY2spO1xuICAgIGRyYWluaW5nID0gdHJ1ZTtcblxuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICBpZiAoY3VycmVudFF1ZXVlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFF1ZXVlW3F1ZXVlSW5kZXhdLnJ1bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBjdXJyZW50UXVldWUgPSBudWxsO1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgcnVuQ2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xufVxuXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLnB1c2gobmV3IEl0ZW0oZnVuLCBhcmdzKSk7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcbiAgICAgICAgcnVuVGltZW91dChkcmFpblF1ZXVlKTtcbiAgICB9XG59O1xuXG4vLyB2OCBsaWtlcyBwcmVkaWN0aWJsZSBvYmplY3RzXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcbiAgICB0aGlzLmZ1biA9IGZ1bjtcbiAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG59XG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5mdW4uYXBwbHkobnVsbCwgdGhpcy5hcnJheSk7XG59O1xucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xucHJvY2Vzcy5wcmVwZW5kTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5wcmVwZW5kT25jZUxpc3RlbmVyID0gbm9vcDtcblxucHJvY2Vzcy5saXN0ZW5lcnMgPSBmdW5jdGlvbiAobmFtZSkgeyByZXR1cm4gW10gfVxuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiIsInZhciBuZXh0VGljayA9IHJlcXVpcmUoJ3Byb2Nlc3MvYnJvd3Nlci5qcycpLm5leHRUaWNrO1xudmFyIGFwcGx5ID0gRnVuY3Rpb24ucHJvdG90eXBlLmFwcGx5O1xudmFyIHNsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlO1xudmFyIGltbWVkaWF0ZUlkcyA9IHt9O1xudmFyIG5leHRJbW1lZGlhdGVJZCA9IDA7XG5cbi8vIERPTSBBUElzLCBmb3IgY29tcGxldGVuZXNzXG5cbmV4cG9ydHMuc2V0VGltZW91dCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gbmV3IFRpbWVvdXQoYXBwbHkuY2FsbChzZXRUaW1lb3V0LCB3aW5kb3csIGFyZ3VtZW50cyksIGNsZWFyVGltZW91dCk7XG59O1xuZXhwb3J0cy5zZXRJbnRlcnZhbCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gbmV3IFRpbWVvdXQoYXBwbHkuY2FsbChzZXRJbnRlcnZhbCwgd2luZG93LCBhcmd1bWVudHMpLCBjbGVhckludGVydmFsKTtcbn07XG5leHBvcnRzLmNsZWFyVGltZW91dCA9XG5leHBvcnRzLmNsZWFySW50ZXJ2YWwgPSBmdW5jdGlvbih0aW1lb3V0KSB7IHRpbWVvdXQuY2xvc2UoKTsgfTtcblxuZnVuY3Rpb24gVGltZW91dChpZCwgY2xlYXJGbikge1xuICB0aGlzLl9pZCA9IGlkO1xuICB0aGlzLl9jbGVhckZuID0gY2xlYXJGbjtcbn1cblRpbWVvdXQucHJvdG90eXBlLnVucmVmID0gVGltZW91dC5wcm90b3R5cGUucmVmID0gZnVuY3Rpb24oKSB7fTtcblRpbWVvdXQucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuX2NsZWFyRm4uY2FsbCh3aW5kb3csIHRoaXMuX2lkKTtcbn07XG5cbi8vIERvZXMgbm90IHN0YXJ0IHRoZSB0aW1lLCBqdXN0IHNldHMgdXAgdGhlIG1lbWJlcnMgbmVlZGVkLlxuZXhwb3J0cy5lbnJvbGwgPSBmdW5jdGlvbihpdGVtLCBtc2Vjcykge1xuICBjbGVhclRpbWVvdXQoaXRlbS5faWRsZVRpbWVvdXRJZCk7XG4gIGl0ZW0uX2lkbGVUaW1lb3V0ID0gbXNlY3M7XG59O1xuXG5leHBvcnRzLnVuZW5yb2xsID0gZnVuY3Rpb24oaXRlbSkge1xuICBjbGVhclRpbWVvdXQoaXRlbS5faWRsZVRpbWVvdXRJZCk7XG4gIGl0ZW0uX2lkbGVUaW1lb3V0ID0gLTE7XG59O1xuXG5leHBvcnRzLl91bnJlZkFjdGl2ZSA9IGV4cG9ydHMuYWN0aXZlID0gZnVuY3Rpb24oaXRlbSkge1xuICBjbGVhclRpbWVvdXQoaXRlbS5faWRsZVRpbWVvdXRJZCk7XG5cbiAgdmFyIG1zZWNzID0gaXRlbS5faWRsZVRpbWVvdXQ7XG4gIGlmIChtc2VjcyA+PSAwKSB7XG4gICAgaXRlbS5faWRsZVRpbWVvdXRJZCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gb25UaW1lb3V0KCkge1xuICAgICAgaWYgKGl0ZW0uX29uVGltZW91dClcbiAgICAgICAgaXRlbS5fb25UaW1lb3V0KCk7XG4gICAgfSwgbXNlY3MpO1xuICB9XG59O1xuXG4vLyBUaGF0J3Mgbm90IGhvdyBub2RlLmpzIGltcGxlbWVudHMgaXQgYnV0IHRoZSBleHBvc2VkIGFwaSBpcyB0aGUgc2FtZS5cbmV4cG9ydHMuc2V0SW1tZWRpYXRlID0gdHlwZW9mIHNldEltbWVkaWF0ZSA9PT0gXCJmdW5jdGlvblwiID8gc2V0SW1tZWRpYXRlIDogZnVuY3Rpb24oZm4pIHtcbiAgdmFyIGlkID0gbmV4dEltbWVkaWF0ZUlkKys7XG4gIHZhciBhcmdzID0gYXJndW1lbnRzLmxlbmd0aCA8IDIgPyBmYWxzZSA6IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcblxuICBpbW1lZGlhdGVJZHNbaWRdID0gdHJ1ZTtcblxuICBuZXh0VGljayhmdW5jdGlvbiBvbk5leHRUaWNrKCkge1xuICAgIGlmIChpbW1lZGlhdGVJZHNbaWRdKSB7XG4gICAgICAvLyBmbi5jYWxsKCkgaXMgZmFzdGVyIHNvIHdlIG9wdGltaXplIGZvciB0aGUgY29tbW9uIHVzZS1jYXNlXG4gICAgICAvLyBAc2VlIGh0dHA6Ly9qc3BlcmYuY29tL2NhbGwtYXBwbHktc2VndVxuICAgICAgaWYgKGFyZ3MpIHtcbiAgICAgICAgZm4uYXBwbHkobnVsbCwgYXJncyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmbi5jYWxsKG51bGwpO1xuICAgICAgfVxuICAgICAgLy8gUHJldmVudCBpZHMgZnJvbSBsZWFraW5nXG4gICAgICBleHBvcnRzLmNsZWFySW1tZWRpYXRlKGlkKTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiBpZDtcbn07XG5cbmV4cG9ydHMuY2xlYXJJbW1lZGlhdGUgPSB0eXBlb2YgY2xlYXJJbW1lZGlhdGUgPT09IFwiZnVuY3Rpb25cIiA/IGNsZWFySW1tZWRpYXRlIDogZnVuY3Rpb24oaWQpIHtcbiAgZGVsZXRlIGltbWVkaWF0ZUlkc1tpZF07XG59OyIsImltcG9ydCAqIGFzIExpYiBmcm9tICcuLi9saWInO1xyXG5cclxuY29uc3Qgc3VpdHMgPSBbJ0NsdWJzJywgJ0RtbmRzJywgJ0hlYXJ0cycsICdTcGFkZXMnLCAnSm9rZXInXTtcclxuY29uc3QgcmFua3MgPSBbJ1NtYWxsJywgJ0EnLCAnMicsICczJywgJzQnLCAnNScsICc2JywgJzcnLCAnOCcsICc5JywgJzEwJywgJ0onLCAnUScsICdLJywgJ0JpZyddO1xyXG5cclxuY29uc3QgY2FyZEltYWdlcyA9IG5ldyBNYXA8c3RyaW5nLCBIVE1MSW1hZ2VFbGVtZW50PigpO1xyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxvYWQoKSB7XHJcbiAgICAvLyBsb2FkIGNhcmQgaW1hZ2VzIGFzeW5jaHJvbm91c2x5XHJcbiAgICBmb3IgKGxldCBzdWl0ID0gMDsgc3VpdCA8PSA0OyArK3N1aXQpIHtcclxuICAgICAgICBmb3IgKGxldCByYW5rID0gMDsgcmFuayA8PSAxNDsgKytyYW5rKSB7XHJcbiAgICAgICAgICAgIGlmIChzdWl0ID09PSBMaWIuU3VpdC5Kb2tlcikge1xyXG4gICAgICAgICAgICAgICAgaWYgKDAgPCByYW5rICYmIHJhbmsgPCAxNCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgaWYgKHJhbmsgPCAxIHx8IDEzIDwgcmFuaykge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBpbWFnZSA9IG5ldyBJbWFnZSgpO1xyXG4gICAgICAgICAgICBpbWFnZS5zcmMgPSBgUGFwZXJDYXJkcy8ke3N1aXRzW3N1aXRdfS8ke3JhbmtzW3JhbmtdfW9mJHtzdWl0c1tzdWl0XX0ucG5nYDtcclxuICAgICAgICAgICAgaW1hZ2Uub25sb2FkID0gKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYGxvYWRlZCAnJHtpbWFnZS5zcmN9J2ApO1xyXG4gICAgICAgICAgICAgICAgY2FyZEltYWdlcy5zZXQoSlNPTi5zdHJpbmdpZnkoW3N1aXQsIHJhbmtdKSwgaW1hZ2UpO1xyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDU7ICsraSkge1xyXG4gICAgICAgIGNvbnN0IGltYWdlID0gbmV3IEltYWdlKCk7XHJcbiAgICAgICAgaW1hZ2Uuc3JjID0gYFBhcGVyQ2FyZHMvQ2FyZEJhY2ske2l9LnBuZ2A7XHJcbiAgICAgICAgaW1hZ2Uub25sb2FkID0gKCkgPT4ge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgbG9hZGVkICcke2ltYWdlLnNyY30nYCk7XHJcbiAgICAgICAgICAgIGNhcmRJbWFnZXMuc2V0KGBCYWNrJHtpfWAsIGltYWdlKTtcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGJsYW5rSW1hZ2UgPSBuZXcgSW1hZ2UoKTtcclxuICAgIGJsYW5rSW1hZ2Uuc3JjID0gJ1BhcGVyQ2FyZHMvQmxhbmsgQ2FyZC5wbmcnO1xyXG4gICAgYmxhbmtJbWFnZS5vbmxvYWQgPSAoKSA9PiB7XHJcbiAgICAgICAgY29uc29sZS5sb2coYGxvYWRlZCAnJHtibGFua0ltYWdlLnNyY30nYCk7XHJcbiAgICAgICAgY2FyZEltYWdlcy5zZXQoJ0JsYW5rJywgYmxhbmtJbWFnZSk7XHJcbiAgICB9O1xyXG5cclxuICAgIHdoaWxlIChjYXJkSW1hZ2VzLnNpemUgPCA0ICogMTMgKyA3KSB7XHJcbiAgICAgICAgYXdhaXQgTGliLmRlbGF5KDEwKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zb2xlLmxvZygnYWxsIGNhcmQgaW1hZ2VzIGxvYWRlZCcpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0KHN0cmluZ0Zyb21DYXJkOiBzdHJpbmcpOiBIVE1MSW1hZ2VFbGVtZW50IHtcclxuICAgIGNvbnN0IGltYWdlID0gY2FyZEltYWdlcy5nZXQoc3RyaW5nRnJvbUNhcmQpO1xyXG4gICAgaWYgKGltYWdlID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGNvdWxkbid0IGZpbmQgaW1hZ2U6ICR7c3RyaW5nRnJvbUNhcmR9YCk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGltYWdlO1xyXG59XHJcbiIsImltcG9ydCAqIGFzIExpYiBmcm9tICcuLi9saWInO1xyXG5pbXBvcnQgKiBhcyBTdGF0ZSBmcm9tICcuL3N0YXRlJztcclxuaW1wb3J0ICogYXMgVlAgZnJvbSAnLi92aWV3LXBhcmFtcyc7XHJcbmltcG9ydCAqIGFzIENhcmRJbWFnZXMgZnJvbSAnLi9jYXJkLWltYWdlcyc7XHJcbmltcG9ydCAqIGFzIFJlbmRlciBmcm9tICcuL3JlbmRlcic7XHJcblxyXG4vLyByZWZyZXNoaW5nIHNob3VsZCByZWpvaW4gdGhlIHNhbWUgZ2FtZVxyXG53aW5kb3cuaGlzdG9yeS5wdXNoU3RhdGUodW5kZWZpbmVkLCBTdGF0ZS5nYW1lSWQsIGAvZ2FtZT9nYW1lSWQ9JHtTdGF0ZS5nYW1lSWR9JnBsYXllck5hbWU9JHtTdGF0ZS5wbGF5ZXJOYW1lfWApO1xyXG5cclxuYXN5bmMgZnVuY3Rpb24gaW5pdCgpIHtcclxuICAgIFZQLnJlY2FsY3VsYXRlUGFyYW1ldGVycygpO1xyXG5cclxuICAgIC8vIGluaXRpYWxpemUgaW5wdXRcclxuICAgIHdoaWxlIChTdGF0ZS5nYW1lU3RhdGUgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIGF3YWl0IExpYi5kZWxheSgxMDApO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHVubG9jayA9IGF3YWl0IFN0YXRlLmxvY2soKTtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgU3RhdGUuc2V0U3ByaXRlVGFyZ2V0cyhTdGF0ZS5nYW1lU3RhdGUpO1xyXG4gICAgfSBmaW5hbGx5IHtcclxuICAgICAgICB1bmxvY2soKTtcclxuICAgIH1cclxufVxyXG5cclxud2luZG93Lm9ucmVzaXplID0gaW5pdDtcclxuXHJcbndpbmRvdy5vbnNjcm9sbCA9IGluaXQ7XHJcblxyXG4oPGFueT53aW5kb3cpLmdhbWUgPSBhc3luYyBmdW5jdGlvbiBnYW1lKCkge1xyXG4gICAgY29uc3Qgam9pblByb21pc2UgPSBTdGF0ZS5qb2luR2FtZShTdGF0ZS5nYW1lSWQsIFN0YXRlLnBsYXllck5hbWUpO1xyXG4gICAgYXdhaXQgQ2FyZEltYWdlcy5sb2FkKCk7IC8vIGNvbmN1cnJlbnRseVxyXG4gICAgYXdhaXQgam9pblByb21pc2U7XHJcbiAgICBcclxuICAgIC8vIHJlbmRlcmluZyBtdXN0IGJlIHN5bmNocm9ub3VzLCBvciBlbHNlIGl0IGZsaWNrZXJzXHJcbiAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKFJlbmRlci5yZW5kZXIpO1xyXG5cclxuICAgIGF3YWl0IGluaXQoKTtcclxufTsiLCJpbXBvcnQgKiBhcyBMaWIgZnJvbSAnLi4vbGliJztcclxuaW1wb3J0ICogYXMgU3RhdGUgZnJvbSAnLi9zdGF0ZSc7XHJcbmltcG9ydCAqIGFzIFZQIGZyb20gJy4vdmlldy1wYXJhbXMnO1xyXG5pbXBvcnQgVmVjdG9yIGZyb20gJy4vdmVjdG9yJztcclxuaW1wb3J0IFNwcml0ZSBmcm9tICcuL3Nwcml0ZSc7XHJcblxyXG5pbnRlcmZhY2UgVGFrZUZyb21PdGhlclBsYXllciB7XHJcbiAgICB0eXBlOiBcIlRha2VGcm9tT3RoZXJQbGF5ZXJcIjtcclxuICAgIG1vdXNlUG9zaXRpb25Ub1Nwcml0ZVBvc2l0aW9uOiBWZWN0b3I7XHJcbiAgICBvdGhlclBsYXllckluZGV4OiBudW1iZXI7XHJcbiAgICBjYXJkSW5kZXg6IG51bWJlcjtcclxuICAgIGNhcmQ6IExpYi5DYXJkO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgRHJhd0Zyb21EZWNrIHtcclxuICAgIHR5cGU6IFwiRHJhd0Zyb21EZWNrXCI7XHJcbiAgICBtb3VzZVBvc2l0aW9uVG9TcHJpdGVQb3NpdGlvbjogVmVjdG9yO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgV2FpdGluZ0Zvck5ld0NhcmQge1xyXG4gICAgdHlwZTogXCJXYWl0aW5nRm9yTmV3Q2FyZFwiO1xyXG4gICAgbW91c2VQb3NpdGlvblRvU3ByaXRlUG9zaXRpb246IFZlY3RvcjtcclxufVxyXG5cclxuaW50ZXJmYWNlIFJldHVyblRvRGVjayB7XHJcbiAgICB0eXBlOiBcIlJldHVyblRvRGVja1wiO1xyXG4gICAgY2FyZEluZGV4OiBudW1iZXI7XHJcbiAgICBtb3VzZVBvc2l0aW9uVG9TcHJpdGVQb3NpdGlvbjogVmVjdG9yO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgUmVvcmRlciB7XHJcbiAgICB0eXBlOiBcIlJlb3JkZXJcIjtcclxuICAgIGNhcmRJbmRleDogbnVtYmVyO1xyXG4gICAgbW91c2VQb3NpdGlvblRvU3ByaXRlUG9zaXRpb246IFZlY3RvcjtcclxufVxyXG5cclxuaW50ZXJmYWNlIENvbnRyb2xTaGlmdENsaWNrIHtcclxuICAgIHR5cGU6IFwiQ29udHJvbFNoaWZ0Q2xpY2tcIjtcclxuICAgIGNhcmRJbmRleDogbnVtYmVyO1xyXG4gICAgbW91c2VQb3NpdGlvblRvU3ByaXRlUG9zaXRpb246IFZlY3RvcjtcclxufVxyXG5cclxuaW50ZXJmYWNlIENvbnRyb2xDbGljayB7XHJcbiAgICB0eXBlOiBcIkNvbnRyb2xDbGlja1wiO1xyXG4gICAgY2FyZEluZGV4OiBudW1iZXI7XHJcbiAgICBtb3VzZVBvc2l0aW9uVG9TcHJpdGVQb3NpdGlvbjogVmVjdG9yO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgU2hpZnRDbGljayB7XHJcbiAgICB0eXBlOiBcIlNoaWZ0Q2xpY2tcIjtcclxuICAgIGNhcmRJbmRleDogbnVtYmVyO1xyXG4gICAgbW91c2VQb3NpdGlvblRvU3ByaXRlUG9zaXRpb246IFZlY3RvcjtcclxufVxyXG5cclxuaW50ZXJmYWNlIENsaWNrIHtcclxuICAgIHR5cGU6IFwiQ2xpY2tcIjtcclxuICAgIGNhcmRJbmRleDogbnVtYmVyO1xyXG4gICAgbW91c2VQb3NpdGlvblRvU3ByaXRlUG9zaXRpb246IFZlY3RvcjtcclxufVxyXG5cclxuZXhwb3J0IHR5cGUgQWN0aW9uID1cclxuICAgIFwiTm9uZVwiIHxcclxuICAgIFwiU29ydEJ5U3VpdFwiIHxcclxuICAgIFwiU29ydEJ5UmFua1wiIHxcclxuICAgIFwiV2FpdFwiIHxcclxuICAgIFwiUHJvY2VlZFwiIHxcclxuICAgIFwiRGVzZWxlY3RcIiB8XHJcbiAgICBUYWtlRnJvbU90aGVyUGxheWVyIHxcclxuICAgIERyYXdGcm9tRGVjayB8XHJcbiAgICBXYWl0aW5nRm9yTmV3Q2FyZCB8XHJcbiAgICBSZXR1cm5Ub0RlY2sgfFxyXG4gICAgUmVvcmRlciB8XHJcbiAgICBDb250cm9sU2hpZnRDbGljayB8XHJcbiAgICBDb250cm9sQ2xpY2sgfFxyXG4gICAgU2hpZnRDbGljayB8XHJcbiAgICBDbGljaztcclxuXHJcbmNvbnN0IGRvdWJsZUNsaWNrVGhyZXNob2xkID0gNTAwOyAvLyBtaWxsaXNlY29uZHNcclxuY29uc3QgbW92ZVRocmVzaG9sZCA9IDAuNSAqIFZQLnBpeGVsc1BlckNNO1xyXG5cclxuZXhwb3J0IGxldCBhY3Rpb246IEFjdGlvbiA9IFwiTm9uZVwiO1xyXG5cclxubGV0IHByZXZpb3VzQ2xpY2tUaW1lID0gLTE7XHJcbmxldCBwcmV2aW91c0NsaWNrSW5kZXggPSAtMTtcclxubGV0IG1vdXNlRG93blBvc2l0aW9uID0gPFZlY3Rvcj57IHg6IDAsIHk6IDAgfTtcclxubGV0IG1vdXNlTW92ZVBvc2l0aW9uID0gPFZlY3Rvcj57IHg6IDAsIHk6IDAgfTtcclxubGV0IGV4Y2VlZGVkRHJhZ1RocmVzaG9sZCA9IGZhbHNlO1xyXG5cclxubGV0IGhvbGRpbmdDb250cm9sID0gZmFsc2U7XHJcbmxldCBob2xkaW5nU2hpZnQgPSBmYWxzZTtcclxud2luZG93Lm9ua2V5ZG93biA9IChlOiBLZXlib2FyZEV2ZW50KSA9PiB7XHJcbiAgICBpZiAoZS5rZXkgPT09IFwiQ29udHJvbFwiKSB7XHJcbiAgICAgICAgaG9sZGluZ0NvbnRyb2wgPSB0cnVlO1xyXG4gICAgfSBlbHNlIGlmIChlLmtleSA9PT0gXCJTaGlmdFwiKSB7XHJcbiAgICAgICAgaG9sZGluZ1NoaWZ0ID0gdHJ1ZTtcclxuICAgIH1cclxufTtcclxuXHJcbndpbmRvdy5vbmtleXVwID0gKGU6IEtleWJvYXJkRXZlbnQpID0+IHtcclxuICAgIGlmIChlLmtleSA9PT0gXCJDb250cm9sXCIpIHtcclxuICAgICAgICBob2xkaW5nQ29udHJvbCA9IGZhbHNlO1xyXG4gICAgfSBlbHNlIGlmIChlLmtleSA9PT0gXCJTaGlmdFwiKSB7XHJcbiAgICAgICAgaG9sZGluZ1NoaWZ0ID0gZmFsc2U7XHJcbiAgICB9XHJcbn07XHJcblxyXG5pbnRlcmZhY2UgSGFzQ2xpZW50UG9zaXRpb24ge1xyXG4gICAgY2xpZW50WDogbnVtYmVyO1xyXG4gICAgY2xpZW50WTogbnVtYmVyO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgSGFzTW92ZW1lbnQge1xyXG4gICAgbW92ZW1lbnRYOiBudW1iZXI7XHJcbiAgICBtb3ZlbWVudFk6IG51bWJlcjtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0TW91c2VQb3NpdGlvbihlOiBIYXNDbGllbnRQb3NpdGlvbikge1xyXG4gICAgcmV0dXJuIG5ldyBWZWN0b3IoXHJcbiAgICAgICAgVlAuY2FudmFzLndpZHRoICogKGUuY2xpZW50WCAtIFZQLmNhbnZhc1JlY3QubGVmdCkgLyBWUC5jYW52YXNSZWN0LndpZHRoLFxyXG4gICAgICAgIFZQLmNhbnZhcy5oZWlnaHQgKiAoZS5jbGllbnRZIC0gVlAuY2FudmFzUmVjdC50b3ApIC8gVlAuY2FudmFzUmVjdC5oZWlnaHRcclxuICAgICk7XHJcbn1cclxuXHJcblZQLmNhbnZhcy5vbm1vdXNlZG93biA9IGFzeW5jIGV2ZW50ID0+IHtcclxuICAgIGF3YWl0IG9uRG93bihldmVudCk7XHJcbn1cclxuXHJcblZQLmNhbnZhcy5vbnRvdWNoc3RhcnQgPSBhc3luYyBldmVudCA9PiB7XHJcbiAgICBjb25zdCB0b3VjaCA9IGV2ZW50LnRvdWNoZXNbMF07XHJcbiAgICBpZiAodG91Y2ggIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIGF3YWl0IG9uRG93bih0b3VjaCk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5hc3luYyBmdW5jdGlvbiBvbkRvd24oZXZlbnQ6IEhhc0NsaWVudFBvc2l0aW9uKSB7XHJcbiAgICBjb25zdCB1bmxvY2sgPSBhd2FpdCBTdGF0ZS5sb2NrKCk7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIG1vdXNlRG93blBvc2l0aW9uID0gZ2V0TW91c2VQb3NpdGlvbihldmVudCk7XHJcbiAgICAgICAgbW91c2VNb3ZlUG9zaXRpb24gPSBtb3VzZURvd25Qb3NpdGlvbjtcclxuICAgICAgICBleGNlZWRlZERyYWdUaHJlc2hvbGQgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgY29uc3QgZGVja1Bvc2l0aW9uID0gU3RhdGUuZGVja1Nwcml0ZXNbU3RhdGUuZGVja1Nwcml0ZXMubGVuZ3RoIC0gMV0/LnBvc2l0aW9uO1xyXG5cclxuICAgICAgICBpZiAoVlAuc29ydEJ5UmFua0JvdW5kc1swXS54IDwgbW91c2VEb3duUG9zaXRpb24ueCAmJiBtb3VzZURvd25Qb3NpdGlvbi54IDwgVlAuc29ydEJ5UmFua0JvdW5kc1sxXS54ICYmXHJcbiAgICAgICAgICAgIFZQLnNvcnRCeVJhbmtCb3VuZHNbMF0ueSA8IG1vdXNlRG93blBvc2l0aW9uLnkgJiYgbW91c2VEb3duUG9zaXRpb24ueSA8IFZQLnNvcnRCeVJhbmtCb3VuZHNbMV0ueVxyXG4gICAgICAgICkge1xyXG4gICAgICAgICAgICBhY3Rpb24gPSBcIlNvcnRCeVJhbmtcIjtcclxuICAgICAgICB9IGVsc2UgaWYgKFxyXG4gICAgICAgICAgICBWUC5zb3J0QnlTdWl0Qm91bmRzWzBdLnggPCBtb3VzZURvd25Qb3NpdGlvbi54ICYmIG1vdXNlRG93blBvc2l0aW9uLnggPCBWUC5zb3J0QnlTdWl0Qm91bmRzWzFdLnggJiZcclxuICAgICAgICAgICAgVlAuc29ydEJ5U3VpdEJvdW5kc1swXS55IDwgbW91c2VEb3duUG9zaXRpb24ueSAmJiBtb3VzZURvd25Qb3NpdGlvbi55IDwgVlAuc29ydEJ5U3VpdEJvdW5kc1sxXS55XHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICAgIGFjdGlvbiA9IFwiU29ydEJ5U3VpdFwiO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoXHJcbiAgICAgICAgICAgIFZQLndhaXRCb3VuZHNbMF0ueCA8IG1vdXNlRG93blBvc2l0aW9uLnggJiYgbW91c2VEb3duUG9zaXRpb24ueCA8IFZQLndhaXRCb3VuZHNbMV0ueCAmJlxyXG4gICAgICAgICAgICBWUC53YWl0Qm91bmRzWzBdLnkgPCBtb3VzZURvd25Qb3NpdGlvbi55ICYmIG1vdXNlRG93blBvc2l0aW9uLnkgPCBWUC53YWl0Qm91bmRzWzFdLnlcclxuICAgICAgICApIHtcclxuICAgICAgICAgICAgYWN0aW9uID0gXCJXYWl0XCI7XHJcbiAgICAgICAgfSBlbHNlIGlmIChcclxuICAgICAgICAgICAgVlAucHJvY2VlZEJvdW5kc1swXS54IDwgbW91c2VEb3duUG9zaXRpb24ueCAmJiBtb3VzZURvd25Qb3NpdGlvbi54IDwgVlAucHJvY2VlZEJvdW5kc1sxXS54ICYmXHJcbiAgICAgICAgICAgIFZQLnByb2NlZWRCb3VuZHNbMF0ueSA8IG1vdXNlRG93blBvc2l0aW9uLnkgJiYgbW91c2VEb3duUG9zaXRpb24ueSA8IFZQLnByb2NlZWRCb3VuZHNbMV0ueVxyXG4gICAgICAgICkge1xyXG4gICAgICAgICAgICBhY3Rpb24gPSBcIlByb2NlZWRcIjtcclxuICAgICAgICB9IGVsc2UgaWYgKGRlY2tQb3NpdGlvbiAhPT0gdW5kZWZpbmVkICYmXHJcbiAgICAgICAgICAgIGRlY2tQb3NpdGlvbi54IDwgbW91c2VEb3duUG9zaXRpb24ueCAmJiBtb3VzZURvd25Qb3NpdGlvbi54IDwgZGVja1Bvc2l0aW9uLnggKyBWUC5zcHJpdGVXaWR0aCAmJlxyXG4gICAgICAgICAgICBkZWNrUG9zaXRpb24ueSA8IG1vdXNlRG93blBvc2l0aW9uLnkgJiYgbW91c2VEb3duUG9zaXRpb24ueSA8IGRlY2tQb3NpdGlvbi55ICsgVlAuc3ByaXRlSGVpZ2h0XHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICAgIGFjdGlvbiA9IHtcclxuICAgICAgICAgICAgICAgIG1vdXNlUG9zaXRpb25Ub1Nwcml0ZVBvc2l0aW9uOiBkZWNrUG9zaXRpb24uc3ViKG1vdXNlRG93blBvc2l0aW9uKSxcclxuICAgICAgICAgICAgICAgIHR5cGU6IFwiRHJhd0Zyb21EZWNrXCJcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBjb25zdCBnYW1lU3RhdGUgPSBTdGF0ZS5nYW1lU3RhdGU7XHJcbiAgICAgICAgICAgIGlmIChnYW1lU3RhdGUgPT09IHVuZGVmaW5lZCkgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgLy8gYmVjYXVzZSB3ZSByZW5kZXIgbGVmdCB0byByaWdodCwgdGhlIHJpZ2h0bW9zdCBjYXJkIHVuZGVyIHRoZSBtb3VzZSBwb3NpdGlvbiBpcyB3aGF0IHdlIHNob3VsZCByZXR1cm5cclxuICAgICAgICAgICAgY29uc3Qgc3ByaXRlcyA9IFN0YXRlLmZhY2VTcHJpdGVzRm9yUGxheWVyW2dhbWVTdGF0ZS5wbGF5ZXJJbmRleF07XHJcbiAgICAgICAgICAgIGlmIChzcHJpdGVzID09PSB1bmRlZmluZWQpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgIGxldCBkZXNlbGVjdCA9IHRydWU7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSBzcHJpdGVzLmxlbmd0aCAtIDE7IGkgPj0gMDsgLS1pKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBwb3NpdGlvbiA9IHNwcml0ZXNbaV0/LnBvc2l0aW9uO1xyXG4gICAgICAgICAgICAgICAgaWYgKHBvc2l0aW9uICE9PSB1bmRlZmluZWQgJiZcclxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbi54IDwgbW91c2VEb3duUG9zaXRpb24ueCAmJiBtb3VzZURvd25Qb3NpdGlvbi54IDwgcG9zaXRpb24ueCArIFZQLnNwcml0ZVdpZHRoICYmXHJcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb24ueSA8IG1vdXNlRG93blBvc2l0aW9uLnkgJiYgbW91c2VEb3duUG9zaXRpb24ueSA8IHBvc2l0aW9uLnkgKyBWUC5zcHJpdGVIZWlnaHRcclxuICAgICAgICAgICAgICAgICkge1xyXG4gICAgICAgICAgICAgICAgICAgIGRlc2VsZWN0ID0gZmFsc2U7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGFjdGlvbiA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FyZEluZGV4OiBpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtb3VzZVBvc2l0aW9uVG9TcHJpdGVQb3NpdGlvbjogcG9zaXRpb24uc3ViKG1vdXNlRG93blBvc2l0aW9uKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogaG9sZGluZ0NvbnRyb2wgJiYgaG9sZGluZ1NoaWZ0ID8gXCJDb250cm9sU2hpZnRDbGlja1wiIDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhvbGRpbmdDb250cm9sID8gXCJDb250cm9sQ2xpY2tcIiA6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBob2xkaW5nU2hpZnQgPyBcIlNoaWZ0Q2xpY2tcIiA6IFwiQ2xpY2tcIlxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgNDsgKytpKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBvdGhlclBsYXllciA9IGdhbWVTdGF0ZS5vdGhlclBsYXllcnNbaV07XHJcbiAgICAgICAgICAgICAgICBpZiAob3RoZXJQbGF5ZXIgIT09IG51bGwgJiYgb3RoZXJQbGF5ZXIgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRyYW5zZm9ybSA9IFZQLmdldFRyYW5zZm9ybUZvclBsYXllcihWUC5nZXRSZWxhdGl2ZVBsYXllckluZGV4KGksIGdhbWVTdGF0ZS5wbGF5ZXJJbmRleCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRyYW5zZm9ybS5pbnZlcnRTZWxmKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdHJhbnNmb3JtZWRQb3NpdGlvbiA9IHRyYW5zZm9ybS50cmFuc2Zvcm1Qb2ludChtb3VzZURvd25Qb3NpdGlvbik7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGogPSBvdGhlclBsYXllci5zaGFyZUNvdW50IC0gMTsgaiA+PSAwOyAtLWopIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3ByaXRlID0gU3RhdGUuZmFjZVNwcml0ZXNGb3JQbGF5ZXJbaV0/LltqXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNwcml0ZSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNwcml0ZS5wb3NpdGlvbi54IDwgdHJhbnNmb3JtZWRQb3NpdGlvbi54ICYmIHRyYW5zZm9ybWVkUG9zaXRpb24ueCA8IHNwcml0ZS5wb3NpdGlvbi54ICsgVlAuc3ByaXRlV2lkdGggJiZcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNwcml0ZS5wb3NpdGlvbi55IDwgdHJhbnNmb3JtZWRQb3NpdGlvbi55ICYmIHRyYW5zZm9ybWVkUG9zaXRpb24ueSA8IHNwcml0ZS5wb3NpdGlvbi55ICsgVlAuc3ByaXRlSGVpZ2h0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYG1vdXNlIGRvd24gb24gJHtpfSdzIGNhcmQgJHtqfWApO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNhcmQgPSBvdGhlclBsYXllci5yZXZlYWxlZENhcmRzW2pdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNhcmQgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb24gPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJUYWtlRnJvbU90aGVyUGxheWVyXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbW91c2VQb3NpdGlvblRvU3ByaXRlUG9zaXRpb246IG5ldyBWZWN0b3IoMCwgMCksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3RoZXJQbGF5ZXJJbmRleDogaSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXJkSW5kZXg6IGosXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FyZFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNlbGVjdCA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoZGVzZWxlY3QpIHtcclxuICAgICAgICAgICAgICAgIGFjdGlvbiA9IFwiRGVzZWxlY3RcIjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgdW5sb2NrKCk7XHJcbiAgICB9XHJcbn1cclxuXHJcblZQLmNhbnZhcy5vbm1vdXNlbW92ZSA9IGFzeW5jIGV2ZW50ID0+IHtcclxuICAgIGF3YWl0IG9uTW92ZShldmVudCwgZXZlbnQpO1xyXG59O1xyXG5cclxubGV0IHByZXZpb3VzVG91Y2g6IFRvdWNoIHwgdW5kZWZpbmVkO1xyXG5WUC5jYW52YXMub250b3VjaG1vdmUgPSBhc3luYyBldmVudCA9PiB7XHJcbiAgICBjb25zdCB0b3VjaCA9IGV2ZW50LnRvdWNoZXNbMF07XHJcbiAgICBpZiAodG91Y2ggIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIGF3YWl0IG9uTW92ZSh0b3VjaCwge1xyXG4gICAgICAgICAgICBtb3ZlbWVudFg6IHRvdWNoLmNsaWVudFggLSAocHJldmlvdXNUb3VjaD8uY2xpZW50WCA/PyB0b3VjaC5jbGllbnRYKSxcclxuICAgICAgICAgICAgbW92ZW1lbnRZOiB0b3VjaC5jbGllbnRZIC0gKHByZXZpb3VzVG91Y2g/LmNsaWVudFkgPz8gdG91Y2guY2xpZW50WSlcclxuICAgICAgICB9KTtcclxuICAgICAgICBwcmV2aW91c1RvdWNoID0gdG91Y2g7XHJcbiAgICB9XHJcbn07XHJcblxyXG5hc3luYyBmdW5jdGlvbiBvbk1vdmUoZXZlbnQ6IEhhc0NsaWVudFBvc2l0aW9uLCBtb3ZlbWVudDogSGFzTW92ZW1lbnQpIHtcclxuICAgIGNvbnN0IGdhbWVTdGF0ZSA9IFN0YXRlLmdhbWVTdGF0ZTtcclxuICAgIGlmIChnYW1lU3RhdGUgPT09IHVuZGVmaW5lZCkgcmV0dXJuO1xyXG5cclxuICAgIGNvbnN0IHVubG9jayA9IGF3YWl0IFN0YXRlLmxvY2soKTtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgbW91c2VNb3ZlUG9zaXRpb24gPSBnZXRNb3VzZVBvc2l0aW9uKGV2ZW50KTtcclxuICAgICAgICBleGNlZWRlZERyYWdUaHJlc2hvbGQgPSBleGNlZWRlZERyYWdUaHJlc2hvbGQgfHwgbW91c2VNb3ZlUG9zaXRpb24uZGlzdGFuY2UobW91c2VEb3duUG9zaXRpb24pID4gbW92ZVRocmVzaG9sZDtcclxuXHJcbiAgICAgICAgaWYgKGFjdGlvbiA9PT0gXCJOb25lXCIpIHtcclxuICAgICAgICAgICAgLy8gZG8gbm90aGluZ1xyXG4gICAgICAgIH0gZWxzZSBpZiAoYWN0aW9uID09PSBcIlNvcnRCeVN1aXRcIikge1xyXG4gICAgICAgICAgICAvLyBUT0RPOiBjaGVjayB3aGV0aGVyIG1vdXNlIHBvc2l0aW9uIGhhcyBsZWZ0IGJ1dHRvbiBib3VuZHNcclxuICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbiA9PT0gXCJTb3J0QnlSYW5rXCIpIHtcclxuICAgICAgICAgICAgLy8gVE9ETzogY2hlY2sgd2hldGhlciBtb3VzZSBwb3NpdGlvbiBoYXMgbGVmdCBidXR0b24gYm91bmRzXHJcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24gPT09IFwiV2FpdFwiKSB7XHJcbiAgICAgICAgICAgIC8vIFRPRE86IGNoZWNrIHdoZXRoZXIgbW91c2UgcG9zaXRpb24gaGFzIGxlZnQgYnV0dG9uIGJvdW5kc1xyXG4gICAgICAgIH0gZWxzZSBpZiAoYWN0aW9uID09PSBcIlByb2NlZWRcIikge1xyXG4gICAgICAgICAgICAvLyBUT0RPOiBjaGVjayB3aGV0aGVyIG1vdXNlIHBvc2l0aW9uIGhhcyBsZWZ0IGJ1dHRvbiBib3VuZHNcclxuICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbiA9PT0gXCJEZXNlbGVjdFwiKSB7XHJcbiAgICAgICAgICAgIC8vIFRPRE86IGJveCBzZWxlY3Rpb24/XHJcbiAgICAgICAgfSBlbHNlIGlmIChcclxuICAgICAgICAgICAgYWN0aW9uLnR5cGUgPT09IFwiVGFrZUZyb21PdGhlclBsYXllclwiIHx8XHJcbiAgICAgICAgICAgIGFjdGlvbi50eXBlID09PSBcIkRyYXdGcm9tRGVja1wiIHx8XHJcbiAgICAgICAgICAgIGFjdGlvbi50eXBlID09PSBcIldhaXRpbmdGb3JOZXdDYXJkXCJcclxuICAgICAgICApIHtcclxuICAgICAgICAgICAgaWYgKGV4Y2VlZGVkRHJhZ1RocmVzaG9sZCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IHByb21pc2U6IFByb21pc2U8dm9pZD4gfCB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgICAgICBsZXQgc3ByaXRlOiBTcHJpdGUgfCB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgICAgICBpZiAoYWN0aW9uLnR5cGUgPT09IFwiVGFrZUZyb21PdGhlclBsYXllclwiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcHJvbWlzZSA9IFN0YXRlLnRha2VDYXJkKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb24ub3RoZXJQbGF5ZXJJbmRleCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uLmNhcmRJbmRleCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uLmNhcmRcclxuICAgICAgICAgICAgICAgICAgICApO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBzcHJpdGUgPSBTdGF0ZS5mYWNlU3ByaXRlc0ZvclBsYXllclthY3Rpb24ub3RoZXJQbGF5ZXJJbmRleF0/LlthY3Rpb24uY2FyZEluZGV4XTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoYWN0aW9uLnR5cGUgPT09IFwiRHJhd0Zyb21EZWNrXCIpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBjYXJkIGRyYXdpbmcgd2lsbCB0cnkgdG8gbG9jayB0aGUgc3RhdGUsIHNvIHdlIG11c3QgYXR0YWNoIGEgY2FsbGJhY2sgaW5zdGVhZCBvZiBhd2FpdGluZ1xyXG4gICAgICAgICAgICAgICAgICAgIHByb21pc2UgPSBTdGF0ZS5kcmF3Q2FyZCgpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBzcHJpdGUgPSBTdGF0ZS5kZWNrU3ByaXRlc1tTdGF0ZS5kZWNrU3ByaXRlcy5sZW5ndGggLSAxXTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAocHJvbWlzZSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNwcml0ZSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICAgICAgICAgICAgICAgICAgICBzcHJpdGUudGFyZ2V0ID0gbW91c2VNb3ZlUG9zaXRpb24uYWRkKGFjdGlvbi5tb3VzZVBvc2l0aW9uVG9TcHJpdGVQb3NpdGlvbik7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGFjdGlvbiA9IHsgLi4uYWN0aW9uLCB0eXBlOiBcIldhaXRpbmdGb3JOZXdDYXJkXCIgfTtcclxuICAgICAgICAgICAgICAgICAgICBwcm9taXNlLnRoZW4ob25DYXJkRHJhd24oc3ByaXRlKSkuY2F0Y2goXyA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhY3Rpb24gIT09IFwiTm9uZVwiICYmXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb24gIT09IFwiRGVzZWxlY3RcIiAmJlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uICE9PSBcIlNvcnRCeVJhbmtcIiAmJlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uICE9PSBcIlNvcnRCeVN1aXRcIiAmJlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uICE9PSBcIldhaXRcIiAmJlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uICE9PSBcIlByb2NlZWRcIiAmJlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uLnR5cGUgPT09IFwiV2FpdGluZ0Zvck5ld0NhcmRcIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbiA9IFwiTm9uZVwiO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbi50eXBlID09PSBcIlJldHVyblRvRGVja1wiIHx8IGFjdGlvbi50eXBlID09PSBcIlJlb3JkZXJcIiApIHtcclxuICAgICAgICAgICAgZHJhZyhnYW1lU3RhdGUsIGFjdGlvbi5jYXJkSW5kZXgsIGFjdGlvbi5tb3VzZVBvc2l0aW9uVG9TcHJpdGVQb3NpdGlvbik7XHJcbiAgICAgICAgfSBlbHNlIGlmIChcclxuICAgICAgICAgICAgYWN0aW9uLnR5cGUgPT09IFwiQ29udHJvbFNoaWZ0Q2xpY2tcIiB8fFxyXG4gICAgICAgICAgICBhY3Rpb24udHlwZSA9PT0gXCJDb250cm9sQ2xpY2tcIiB8fFxyXG4gICAgICAgICAgICBhY3Rpb24udHlwZSA9PT0gXCJTaGlmdENsaWNrXCIgfHxcclxuICAgICAgICAgICAgYWN0aW9uLnR5cGUgPT09IFwiQ2xpY2tcIlxyXG4gICAgICAgICkge1xyXG4gICAgICAgICAgICBsZXQgaSA9IExpYi5iaW5hcnlTZWFyY2hOdW1iZXIoU3RhdGUuc2VsZWN0ZWRJbmRpY2VzLCBhY3Rpb24uY2FyZEluZGV4KTtcclxuICAgICAgICAgICAgaWYgKGV4Y2VlZGVkRHJhZ1RocmVzaG9sZCkge1xyXG4gICAgICAgICAgICAgICAgLy8gZHJhZ2dpbmcgYSBub24tc2VsZWN0ZWQgY2FyZCBzZWxlY3RzIGl0IGFuZCBvbmx5IGl0XHJcbiAgICAgICAgICAgICAgICBpZiAoaSA8IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBTdGF0ZS5zZWxlY3RlZEluZGljZXMuc3BsaWNlKDAsIFN0YXRlLnNlbGVjdGVkSW5kaWNlcy5sZW5ndGgsIGFjdGlvbi5jYXJkSW5kZXgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGRyYWcoZ2FtZVN0YXRlLCBhY3Rpb24uY2FyZEluZGV4LCBhY3Rpb24ubW91c2VQb3NpdGlvblRvU3ByaXRlUG9zaXRpb24pO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgc3ByaXRlcyA9IFN0YXRlLmZhY2VTcHJpdGVzRm9yUGxheWVyW2dhbWVTdGF0ZS5wbGF5ZXJJbmRleF07XHJcbiAgICAgICAgICAgICAgICBpZiAoc3ByaXRlcyA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICAgIFxyXG4gICAgICAgICAgICAgICAgaWYgKGkgPCAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3ByaXRlID0gc3ByaXRlc1thY3Rpb24uY2FyZEluZGV4XTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoc3ByaXRlID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG4gICAgICAgICAgICAgICAgICAgIHNwcml0ZS50YXJnZXQgPSBzcHJpdGUudGFyZ2V0LmFkZChuZXcgVmVjdG9yKG1vdmVtZW50Lm1vdmVtZW50WCwgbW92ZW1lbnQubW92ZW1lbnRZKSk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgaiBvZiBTdGF0ZS5zZWxlY3RlZEluZGljZXMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3ByaXRlID0gc3ByaXRlc1tqXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNwcml0ZSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3ByaXRlLnRhcmdldCA9IHNwcml0ZS50YXJnZXQuYWRkKG5ldyBWZWN0b3IobW92ZW1lbnQubW92ZW1lbnRYLCBtb3ZlbWVudC5tb3ZlbWVudFkpKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBjb25zdCBfOiBuZXZlciA9IGFjdGlvbjtcclxuICAgICAgICB9XHJcbiAgICB9IGZpbmFsbHkge1xyXG4gICAgICAgIHVubG9jaygpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuVlAuY2FudmFzLm9ubW91c2V1cCA9IGFzeW5jIGV2ZW50ID0+IHtcclxuICAgIGF3YWl0IG9uVXAoKTtcclxufTtcclxuXHJcblZQLmNhbnZhcy5vbnRvdWNoZW5kID0gYXN5bmMgZXZlbnQgPT4ge1xyXG4gICAgYXdhaXQgb25VcCgpO1xyXG59O1xyXG5cclxuYXN5bmMgZnVuY3Rpb24gb25VcCgpIHtcclxuICAgIGNvbnN0IGdhbWVTdGF0ZSA9IFN0YXRlLmdhbWVTdGF0ZTtcclxuICAgIGlmIChnYW1lU3RhdGUgPT09IHVuZGVmaW5lZCkgcmV0dXJuO1xyXG5cclxuICAgIGNvbnN0IHVubG9jayA9IGF3YWl0IFN0YXRlLmxvY2soKTtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgaWYgKGFjdGlvbiA9PT0gXCJOb25lXCIpIHtcclxuICAgICAgICAgICAgLy8gZG8gbm90aGluZ1xyXG4gICAgICAgIH0gZWxzZSBpZiAoYWN0aW9uID09PSBcIlNvcnRCeVJhbmtcIikge1xyXG4gICAgICAgICAgICBhd2FpdCBTdGF0ZS5zb3J0QnlSYW5rKGdhbWVTdGF0ZSk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24gPT09IFwiU29ydEJ5U3VpdFwiKSB7XHJcbiAgICAgICAgICAgIGF3YWl0IFN0YXRlLnNvcnRCeVN1aXQoZ2FtZVN0YXRlKTtcclxuICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbiA9PT0gXCJXYWl0XCIpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ3dhaXRpbmcnKTtcclxuICAgICAgICAgICAgYXdhaXQgU3RhdGUud2FpdCgpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoYWN0aW9uID09PSBcIlByb2NlZWRcIikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygncHJvY2VlZGluZycpO1xyXG4gICAgICAgICAgICBhd2FpdCBTdGF0ZS5wcm9jZWVkKCk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24gPT09IFwiRGVzZWxlY3RcIikge1xyXG4gICAgICAgICAgICBTdGF0ZS5zZWxlY3RlZEluZGljZXMuc3BsaWNlKDAsIFN0YXRlLnNlbGVjdGVkSW5kaWNlcy5sZW5ndGgpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoYWN0aW9uLnR5cGUgPT09IFwiRHJhd0Zyb21EZWNrXCIgfHwgYWN0aW9uLnR5cGUgPT09IFwiV2FpdGluZ0Zvck5ld0NhcmRcIikge1xyXG4gICAgICAgICAgICAvLyBkbyBub3RoaW5nXHJcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24udHlwZSA9PT0gXCJSZW9yZGVyXCIpIHtcclxuICAgICAgICAgICAgcHJldmlvdXNDbGlja0luZGV4ID0gYWN0aW9uLmNhcmRJbmRleDtcclxuICAgICAgICAgICAgYXdhaXQgU3RhdGUucmVvcmRlckNhcmRzKGdhbWVTdGF0ZSk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24udHlwZSA9PT0gXCJSZXR1cm5Ub0RlY2tcIikge1xyXG4gICAgICAgICAgICBwcmV2aW91c0NsaWNrSW5kZXggPSAtMTtcclxuICAgICAgICAgICAgYXdhaXQgU3RhdGUucmV0dXJuQ2FyZHNUb0RlY2soZ2FtZVN0YXRlKTtcclxuICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbi50eXBlID09PSBcIkNvbnRyb2xTaGlmdENsaWNrXCIpIHtcclxuICAgICAgICAgICAgaWYgKHByZXZpb3VzQ2xpY2tJbmRleCA9PT0gLTEpIHtcclxuICAgICAgICAgICAgICAgIHByZXZpb3VzQ2xpY2tJbmRleCA9IGFjdGlvbi5jYXJkSW5kZXg7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHN0YXJ0ID0gTWF0aC5taW4oYWN0aW9uLmNhcmRJbmRleCwgcHJldmlvdXNDbGlja0luZGV4KTtcclxuICAgICAgICAgICAgY29uc3QgZW5kID0gTWF0aC5tYXgoYWN0aW9uLmNhcmRJbmRleCwgcHJldmlvdXNDbGlja0luZGV4KTtcclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IHN0YXJ0OyBpIDw9IGVuZDsgKytpKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgaiA9IExpYi5iaW5hcnlTZWFyY2hOdW1iZXIoU3RhdGUuc2VsZWN0ZWRJbmRpY2VzLCBpKTtcclxuICAgICAgICAgICAgICAgIGlmIChqIDwgMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIFN0YXRlLnNlbGVjdGVkSW5kaWNlcy5zcGxpY2UofmosIDAsIGkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24udHlwZSA9PT0gXCJDb250cm9sQ2xpY2tcIikge1xyXG4gICAgICAgICAgICBwcmV2aW91c0NsaWNrSW5kZXggPSBhY3Rpb24uY2FyZEluZGV4O1xyXG4gICAgICAgICAgICBsZXQgaSA9IExpYi5iaW5hcnlTZWFyY2hOdW1iZXIoU3RhdGUuc2VsZWN0ZWRJbmRpY2VzLCBhY3Rpb24uY2FyZEluZGV4KTtcclxuICAgICAgICAgICAgaWYgKGkgPCAwKSB7XHJcbiAgICAgICAgICAgICAgICBTdGF0ZS5zZWxlY3RlZEluZGljZXMuc3BsaWNlKH5pLCAwLCBhY3Rpb24uY2FyZEluZGV4KTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIFN0YXRlLnNlbGVjdGVkSW5kaWNlcy5zcGxpY2UoaSwgMSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbi50eXBlID09PSBcIlNoaWZ0Q2xpY2tcIikge1xyXG4gICAgICAgICAgICBpZiAocHJldmlvdXNDbGlja0luZGV4ID09PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgcHJldmlvdXNDbGlja0luZGV4ID0gYWN0aW9uLmNhcmRJbmRleDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3Qgc3RhcnQgPSBNYXRoLm1pbihhY3Rpb24uY2FyZEluZGV4LCBwcmV2aW91c0NsaWNrSW5kZXgpO1xyXG4gICAgICAgICAgICBjb25zdCBlbmQgPSBNYXRoLm1heChhY3Rpb24uY2FyZEluZGV4LCBwcmV2aW91c0NsaWNrSW5kZXgpO1xyXG4gICAgICAgICAgICBTdGF0ZS5zZWxlY3RlZEluZGljZXMuc3BsaWNlKDAsIFN0YXRlLnNlbGVjdGVkSW5kaWNlcy5sZW5ndGgpO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gc3RhcnQ7IGkgPD0gZW5kOyArK2kpIHtcclxuICAgICAgICAgICAgICAgIFN0YXRlLnNlbGVjdGVkSW5kaWNlcy5wdXNoKGkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24udHlwZSA9PT0gXCJDbGlja1wiKSB7XHJcbiAgICAgICAgICAgIHByZXZpb3VzQ2xpY2tJbmRleCA9IGFjdGlvbi5jYXJkSW5kZXg7XHJcbiAgICAgICAgICAgIFN0YXRlLnNlbGVjdGVkSW5kaWNlcy5zcGxpY2UoMCwgU3RhdGUuc2VsZWN0ZWRJbmRpY2VzLmxlbmd0aCwgYWN0aW9uLmNhcmRJbmRleCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBTdGF0ZS5zZXRTcHJpdGVUYXJnZXRzKGdhbWVTdGF0ZSk7XHJcblxyXG4gICAgICAgIGFjdGlvbiA9IFwiTm9uZVwiO1xyXG4gICAgfSBmaW5hbGx5IHtcclxuICAgICAgICB1bmxvY2soKTtcclxuICAgIH1cclxufTtcclxuXHJcbmZ1bmN0aW9uIG9uQ2FyZERyYXduKGRlY2tTcHJpdGU6IFNwcml0ZSkge1xyXG4gICAgcmV0dXJuIGFzeW5jICgpID0+IHtcclxuICAgICAgICBjb25zdCBnYW1lU3RhdGUgPSBTdGF0ZS5nYW1lU3RhdGU7XHJcbiAgICAgICAgaWYgKGdhbWVTdGF0ZSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuXHJcbiAgICAgICAgY29uc3QgdW5sb2NrID0gYXdhaXQgU3RhdGUubG9jaygpO1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGlmIChhY3Rpb24gIT09IFwiTm9uZVwiICYmXHJcbiAgICAgICAgICAgICAgICBhY3Rpb24gIT09IFwiU29ydEJ5U3VpdFwiICYmXHJcbiAgICAgICAgICAgICAgICBhY3Rpb24gIT09IFwiU29ydEJ5UmFua1wiICYmXHJcbiAgICAgICAgICAgICAgICBhY3Rpb24gIT09IFwiV2FpdFwiICYmXHJcbiAgICAgICAgICAgICAgICBhY3Rpb24gIT09IFwiUHJvY2VlZFwiICYmXHJcbiAgICAgICAgICAgICAgICBhY3Rpb24gIT09IFwiRGVzZWxlY3RcIiAmJlxyXG4gICAgICAgICAgICAgICAgYWN0aW9uLnR5cGUgPT09IFwiV2FpdGluZ0Zvck5ld0NhcmRcIlxyXG4gICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgIC8vIGltbWVkaWF0ZWx5IHNlbGVjdCBuZXdseSBhY3F1aXJlZCBjYXJkXHJcbiAgICAgICAgICAgICAgICBjb25zdCBjYXJkSW5kZXggPSBnYW1lU3RhdGUucGxheWVyQ2FyZHMubGVuZ3RoIC0gMTtcclxuICAgICAgICAgICAgICAgIFN0YXRlLnNlbGVjdGVkSW5kaWNlcy5zcGxpY2UoMCwgU3RhdGUuc2VsZWN0ZWRJbmRpY2VzLmxlbmd0aCk7XHJcbiAgICAgICAgICAgICAgICBTdGF0ZS5zZWxlY3RlZEluZGljZXMucHVzaChjYXJkSW5kZXgpO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIG5ldyBjYXJkIHNob3VsZCBhcHBlYXIgaW4gcGxhY2Ugb2YgZHJhZ2dlZCBjYXJkIGZyb20gZGVjayB3aXRob3V0IGFuaW1hdGlvblxyXG4gICAgICAgICAgICAgICAgY29uc3QgZmFjZVNwcml0ZUF0TW91c2VEb3duID0gU3RhdGUuZmFjZVNwcml0ZXNGb3JQbGF5ZXJbZ2FtZVN0YXRlLnBsYXllckluZGV4XT8uW2NhcmRJbmRleF07XHJcbiAgICAgICAgICAgICAgICBpZiAoZmFjZVNwcml0ZUF0TW91c2VEb3duID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG4gICAgICAgICAgICAgICAgZmFjZVNwcml0ZUF0TW91c2VEb3duLnRhcmdldCA9IGRlY2tTcHJpdGUucG9zaXRpb247XHJcbiAgICAgICAgICAgICAgICBmYWNlU3ByaXRlQXRNb3VzZURvd24ucG9zaXRpb24gPSBkZWNrU3ByaXRlLnBvc2l0aW9uO1xyXG4gICAgICAgICAgICAgICAgZmFjZVNwcml0ZUF0TW91c2VEb3duLnZlbG9jaXR5ID0gZGVja1Nwcml0ZS52ZWxvY2l0eTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgZHJhZyhnYW1lU3RhdGUsIGNhcmRJbmRleCwgYWN0aW9uLm1vdXNlUG9zaXRpb25Ub1Nwcml0ZVBvc2l0aW9uKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgICAgIHVubG9jaygpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRyYWcoZ2FtZVN0YXRlOiBMaWIuR2FtZVN0YXRlLCBjYXJkSW5kZXg6IG51bWJlciwgbW91c2VQb3NpdGlvblRvU3ByaXRlUG9zaXRpb246IFZlY3Rvcikge1xyXG4gICAgY29uc3Qgc3ByaXRlcyA9IFN0YXRlLmZhY2VTcHJpdGVzRm9yUGxheWVyW2dhbWVTdGF0ZS5wbGF5ZXJJbmRleF07XHJcbiAgICBpZiAoc3ByaXRlcyA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuXHJcbiAgICBjb25zdCBjYXJkcyA9IGdhbWVTdGF0ZS5wbGF5ZXJDYXJkcztcclxuXHJcbiAgICBjb25zdCBtb3ZpbmdTcHJpdGVzQW5kQ2FyZHM6IFtTcHJpdGUsIExpYi5DYXJkXVtdID0gW107XHJcbiAgICBjb25zdCByZXNlcnZlZFNwcml0ZXNBbmRDYXJkczogW1Nwcml0ZSwgTGliLkNhcmRdW10gPSBbXTtcclxuXHJcbiAgICBsZXQgc3BsaXRJbmRleDogbnVtYmVyIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xyXG4gICAgbGV0IHNoYXJlQ291bnQgPSBnYW1lU3RhdGUucGxheWVyU2hhcmVDb3VudDtcclxuICAgIGxldCByZXZlYWxDb3VudCA9IGdhbWVTdGF0ZS5wbGF5ZXJSZXZlYWxDb3VudDtcclxuXHJcbiAgICAvLyBleHRyYWN0IG1vdmluZyBzcHJpdGVzXHJcbiAgICBmb3IgKGNvbnN0IGkgb2YgU3RhdGUuc2VsZWN0ZWRJbmRpY2VzKSB7XHJcbiAgICAgICAgY29uc3Qgc3ByaXRlID0gc3ByaXRlc1tpXTtcclxuICAgICAgICBjb25zdCBjYXJkID0gY2FyZHNbaV07XHJcbiAgICAgICAgaWYgKHNwcml0ZSA9PT0gdW5kZWZpbmVkIHx8IGNhcmQgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICAgICAgbW92aW5nU3ByaXRlc0FuZENhcmRzLnB1c2goW3Nwcml0ZSwgY2FyZF0pO1xyXG5cclxuICAgICAgICBpZiAoaSA8IGdhbWVTdGF0ZS5wbGF5ZXJTaGFyZUNvdW50KSB7XHJcbiAgICAgICAgICAgIC0tc2hhcmVDb3VudDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChpIDwgZ2FtZVN0YXRlLnBsYXllclJldmVhbENvdW50KSB7XHJcbiAgICAgICAgICAgIC0tcmV2ZWFsQ291bnQ7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIGV4dHJhY3QgcmVzZXJ2ZWQgc3ByaXRlc1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzcHJpdGVzLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgaWYgKExpYi5iaW5hcnlTZWFyY2hOdW1iZXIoU3RhdGUuc2VsZWN0ZWRJbmRpY2VzLCBpKSA8IDApIHtcclxuICAgICAgICAgICAgY29uc3Qgc3ByaXRlID0gc3ByaXRlc1tpXTtcclxuICAgICAgICAgICAgY29uc3QgY2FyZCA9IGNhcmRzW2ldO1xyXG4gICAgICAgICAgICBpZiAoc3ByaXRlID09PSB1bmRlZmluZWQgfHwgY2FyZCA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICAgICAgICAgICAgcmVzZXJ2ZWRTcHJpdGVzQW5kQ2FyZHMucHVzaChbc3ByaXRlLCBjYXJkXSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIGZpbmQgdGhlIGhlbGQgc3ByaXRlcywgaWYgYW55LCBvdmVybGFwcGVkIGJ5IHRoZSBkcmFnZ2VkIHNwcml0ZXNcclxuICAgIGNvbnN0IGxlZnRNb3ZpbmdTcHJpdGUgPSBtb3ZpbmdTcHJpdGVzQW5kQ2FyZHNbMF0/LlswXTtcclxuICAgIGNvbnN0IHJpZ2h0TW92aW5nU3ByaXRlID0gbW92aW5nU3ByaXRlc0FuZENhcmRzW21vdmluZ1Nwcml0ZXNBbmRDYXJkcy5sZW5ndGggLSAxXT8uWzBdO1xyXG4gICAgaWYgKGxlZnRNb3ZpbmdTcHJpdGUgPT09IHVuZGVmaW5lZCB8fCByaWdodE1vdmluZ1Nwcml0ZSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgZGVja0Rpc3RhbmNlID0gTWF0aC5hYnMobGVmdE1vdmluZ1Nwcml0ZS50YXJnZXQueSAtIChTdGF0ZS5kZWNrU3ByaXRlc1swXT8ucG9zaXRpb24ueSA/PyBJbmZpbml0eSkpO1xyXG4gICAgY29uc3QgcmV2ZWFsRGlzdGFuY2UgPSBNYXRoLmFicyhsZWZ0TW92aW5nU3ByaXRlLnRhcmdldC55IC0gKFZQLmNhbnZhcy5oZWlnaHQgLSAyICogVlAuc3ByaXRlSGVpZ2h0KSk7XHJcbiAgICBjb25zdCBoaWRlRGlzdGFuY2UgPSBNYXRoLmFicyhsZWZ0TW92aW5nU3ByaXRlLnRhcmdldC55IC0gKFZQLmNhbnZhcy5oZWlnaHQgLSBWUC5zcHJpdGVIZWlnaHQpKTtcclxuXHJcbiAgICAvLyBzZXQgdGhlIGFjdGlvbiBmb3Igb25tb3VzZXVwXHJcbiAgICBpZiAoZGVja0Rpc3RhbmNlIDwgcmV2ZWFsRGlzdGFuY2UgJiYgZGVja0Rpc3RhbmNlIDwgaGlkZURpc3RhbmNlKSB7XHJcbiAgICAgICAgYWN0aW9uID0geyBjYXJkSW5kZXgsIG1vdXNlUG9zaXRpb25Ub1Nwcml0ZVBvc2l0aW9uLCB0eXBlOiBcIlJldHVyblRvRGVja1wiIH07XHJcblxyXG4gICAgICAgIHNwbGl0SW5kZXggPSByZXNlcnZlZFNwcml0ZXNBbmRDYXJkcy5sZW5ndGg7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIGFjdGlvbiA9IHsgY2FyZEluZGV4LCBtb3VzZVBvc2l0aW9uVG9TcHJpdGVQb3NpdGlvbiwgdHlwZTogXCJSZW9yZGVyXCIgfTtcclxuXHJcbiAgICAgICAgLy8gZGV0ZXJtaW5lIHdoZXRoZXIgdGhlIG1vdmluZyBzcHJpdGVzIGFyZSBjbG9zZXIgdG8gdGhlIHJldmVhbGVkIHNwcml0ZXMgb3IgdG8gdGhlIGhpZGRlbiBzcHJpdGVzXHJcbiAgICAgICAgY29uc3Qgc3BsaXRSZXZlYWxlZCA9IHJldmVhbERpc3RhbmNlIDwgaGlkZURpc3RhbmNlO1xyXG4gICAgICAgIGxldCBzcGxpdFNoYXJlZDogYm9vbGVhbjtcclxuICAgICAgICBsZXQgc3BlY2lhbFNwbGl0OiBib29sZWFuO1xyXG4gICAgICAgIGxldCBzdGFydDogbnVtYmVyO1xyXG4gICAgICAgIGxldCBlbmQ6IG51bWJlcjtcclxuICAgICAgICBpZiAoc3BsaXRSZXZlYWxlZCkge1xyXG4gICAgICAgICAgICBpZiAobGVmdE1vdmluZ1Nwcml0ZS50YXJnZXQueCA8IFZQLmNhbnZhcy53aWR0aCAvIDIgJiZcclxuICAgICAgICAgICAgICAgIFZQLmNhbnZhcy53aWR0aCAvIDIgPCByaWdodE1vdmluZ1Nwcml0ZS50YXJnZXQueCArIFZQLnNwcml0ZVdpZHRoXHJcbiAgICAgICAgICAgICkge1xyXG4gICAgICAgICAgICAgICAgc3BsaXRJbmRleCA9IHNoYXJlQ291bnQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIHNwbGl0U2hhcmVkID0gKGxlZnRNb3ZpbmdTcHJpdGUudGFyZ2V0LnggKyByaWdodE1vdmluZ1Nwcml0ZS50YXJnZXQueCArIFZQLnNwcml0ZVdpZHRoKSAvIDIgPCBWUC5jYW52YXMud2lkdGggLyAyO1xyXG4gICAgICAgICAgICBpZiAoc3BsaXRTaGFyZWQpIHtcclxuICAgICAgICAgICAgICAgIHN0YXJ0ID0gMDtcclxuICAgICAgICAgICAgICAgIGVuZCA9IHNoYXJlQ291bnQ7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBzdGFydCA9IHNoYXJlQ291bnQ7XHJcbiAgICAgICAgICAgICAgICBlbmQgPSByZXZlYWxDb3VudDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHNwbGl0U2hhcmVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHNwZWNpYWxTcGxpdCA9IGZhbHNlO1xyXG4gICAgICAgICAgICBzdGFydCA9IHJldmVhbENvdW50O1xyXG4gICAgICAgICAgICBlbmQgPSByZXNlcnZlZFNwcml0ZXNBbmRDYXJkcy5sZW5ndGg7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoc3BsaXRJbmRleCA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIGxldCBsZWZ0SW5kZXg6IG51bWJlciB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgbGV0IHJpZ2h0SW5kZXg6IG51bWJlciB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IHN0YXJ0OyBpIDwgZW5kOyArK2kpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc2VydmVkU3ByaXRlID0gcmVzZXJ2ZWRTcHJpdGVzQW5kQ2FyZHNbaV0/LlswXTtcclxuICAgICAgICAgICAgICAgIGlmIChyZXNlcnZlZFNwcml0ZSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICAgICAgICAgICAgICAgIGlmIChsZWZ0TW92aW5nU3ByaXRlLnRhcmdldC54IDwgcmVzZXJ2ZWRTcHJpdGUudGFyZ2V0LnggJiZcclxuICAgICAgICAgICAgICAgICAgICByZXNlcnZlZFNwcml0ZS50YXJnZXQueCA8IHJpZ2h0TW92aW5nU3ByaXRlLnRhcmdldC54XHJcbiAgICAgICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAobGVmdEluZGV4ID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGVmdEluZGV4ID0gaTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgcmlnaHRJbmRleCA9IGk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICAgICAgaWYgKGxlZnRJbmRleCAhPT0gdW5kZWZpbmVkICYmIHJpZ2h0SW5kZXggIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgbGVmdFJlc2VydmVkU3ByaXRlID0gcmVzZXJ2ZWRTcHJpdGVzQW5kQ2FyZHNbbGVmdEluZGV4XT8uWzBdO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcmlnaHRSZXNlcnZlZFNwcml0ZSA9IHJlc2VydmVkU3ByaXRlc0FuZENhcmRzW3JpZ2h0SW5kZXhdPy5bMF07XHJcbiAgICAgICAgICAgICAgICBpZiAobGVmdFJlc2VydmVkU3ByaXRlID09PSB1bmRlZmluZWQgfHwgcmlnaHRSZXNlcnZlZFNwcml0ZSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGxlZnRHYXAgPSBsZWZ0UmVzZXJ2ZWRTcHJpdGUudGFyZ2V0LnggLSBsZWZ0TW92aW5nU3ByaXRlLnRhcmdldC54O1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcmlnaHRHYXAgPSByaWdodE1vdmluZ1Nwcml0ZS50YXJnZXQueCAtIHJpZ2h0UmVzZXJ2ZWRTcHJpdGUudGFyZ2V0Lng7XHJcbiAgICAgICAgICAgICAgICBpZiAobGVmdEdhcCA8IHJpZ2h0R2FwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc3BsaXRJbmRleCA9IGxlZnRJbmRleDtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc3BsaXRJbmRleCA9IHJpZ2h0SW5kZXggKyAxO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIGlmIChzcGxpdEluZGV4ID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgLy8gbm8gb3ZlcmxhcHBlZCBzcHJpdGVzLCBzbyB0aGUgaW5kZXggaXMgdGhlIGZpcnN0IHJlc2VydmVkIHNwcml0ZSB0byB0aGUgcmlnaHQgb2YgdGhlIG1vdmluZyBzcHJpdGVzXHJcbiAgICAgICAgICAgIGZvciAoc3BsaXRJbmRleCA9IHN0YXJ0OyBzcGxpdEluZGV4IDwgZW5kOyArK3NwbGl0SW5kZXgpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc2VydmVkU3ByaXRlID0gcmVzZXJ2ZWRTcHJpdGVzQW5kQ2FyZHNbc3BsaXRJbmRleF0/LlswXTtcclxuICAgICAgICAgICAgICAgIGlmIChyZXNlcnZlZFNwcml0ZSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICAgICAgICAgICAgICAgIGlmIChyaWdodE1vdmluZ1Nwcml0ZS50YXJnZXQueCA8IHJlc2VydmVkU3ByaXRlLnRhcmdldC54KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGFkanVzdCBzaGFyZSBjb3VudFxyXG4gICAgICAgIGlmIChzcGxpdEluZGV4IDwgc2hhcmVDb3VudCB8fCBzcGxpdEluZGV4ID09PSBzaGFyZUNvdW50ICYmIHNwbGl0U2hhcmVkKSB7XHJcbiAgICAgICAgICAgIHNoYXJlQ291bnQgKz0gbW92aW5nU3ByaXRlc0FuZENhcmRzLmxlbmd0aDtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coYHNldCBzaGFyZUNvdW50IHRvICR7c2hhcmVDb3VudH1gKTtcclxuICAgICAgICB9XHJcbiAgICBcclxuICAgICAgICAvLyBhZGp1c3QgcmV2ZWFsIGNvdW50XHJcbiAgICAgICAgaWYgKHNwbGl0SW5kZXggPCByZXZlYWxDb3VudCB8fCBzcGxpdEluZGV4ID09PSByZXZlYWxDb3VudCAmJiBzcGxpdFJldmVhbGVkKSB7XHJcbiAgICAgICAgICAgIHJldmVhbENvdW50ICs9IG1vdmluZ1Nwcml0ZXNBbmRDYXJkcy5sZW5ndGg7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBzZXQgcmV2ZWFsQ291bnQgdG8gJHtyZXZlYWxDb3VudH1gKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gYWRqdXN0IHNlbGVjdGVkIGluZGljZXNcclxuICAgIC8vIG1vZGlmeWluZyBhY3Rpb24uY2FyZEluZGV4IGRpcmVjdGx5IGluIHRoZSBsb29wIHdvdWxkIGNhdXNlIHVzIHRvXHJcbiAgICAvLyBjaGVjayBpdHMgYWRqdXN0ZWQgdmFsdWUgYWdhaW5zdCBvbGQgaW5kaWNlcywgd2hpY2ggaXMgaW5jb3JyZWN0XHJcbiAgICBsZXQgbmV3Q2FyZEluZGV4ID0gYWN0aW9uLmNhcmRJbmRleDtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgU3RhdGUuc2VsZWN0ZWRJbmRpY2VzLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgaWYgKGFjdGlvbi5jYXJkSW5kZXggPT09IFN0YXRlLnNlbGVjdGVkSW5kaWNlc1tpXSkge1xyXG4gICAgICAgICAgICBuZXdDYXJkSW5kZXggPSBzcGxpdEluZGV4ICsgaTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIFN0YXRlLnNlbGVjdGVkSW5kaWNlc1tpXSA9IHNwbGl0SW5kZXggKyBpO1xyXG4gICAgfVxyXG5cclxuICAgIGFjdGlvbi5jYXJkSW5kZXggPSBuZXdDYXJkSW5kZXg7XHJcblxyXG4gICAgLy8gZHJhZyBhbGwgc2VsZWN0ZWQgY2FyZHMgYXMgYSBncm91cCBhcm91bmQgdGhlIGNhcmQgdW5kZXIgdGhlIG1vdXNlIHBvc2l0aW9uXHJcbiAgICBmb3IgKGNvbnN0IHNlbGVjdGVkSW5kZXggb2YgU3RhdGUuc2VsZWN0ZWRJbmRpY2VzKSB7XHJcbiAgICAgICAgY29uc3QgbW92aW5nU3ByaXRlQW5kQ2FyZCA9IG1vdmluZ1Nwcml0ZXNBbmRDYXJkc1tzZWxlY3RlZEluZGV4IC0gc3BsaXRJbmRleF07XHJcbiAgICAgICAgaWYgKG1vdmluZ1Nwcml0ZUFuZENhcmQgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICAgICAgY29uc3QgW21vdmluZ1Nwcml0ZSwgbW92aW5nQ2FyZF0gPSBtb3ZpbmdTcHJpdGVBbmRDYXJkO1xyXG4gICAgICAgIG1vdmluZ1Nwcml0ZS50YXJnZXQgPSBtb3VzZU1vdmVQb3NpdGlvblxyXG4gICAgICAgICAgICAuYWRkKG1vdXNlUG9zaXRpb25Ub1Nwcml0ZVBvc2l0aW9uKVxyXG4gICAgICAgICAgICAuYWRkKG5ldyBWZWN0b3IoKHNlbGVjdGVkSW5kZXggLSBhY3Rpb24uY2FyZEluZGV4KSAqIFZQLnNwcml0ZUdhcCwgMCkpO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGByZWFycmFuZ2VkIHNwcml0ZSAke3NlbGVjdGVkSW5kZXh9YCk7XHJcbiAgICB9XHJcblxyXG4gICAgU3RhdGUuc2V0U3ByaXRlVGFyZ2V0cyhcclxuICAgICAgICBnYW1lU3RhdGUsXHJcbiAgICAgICAgcmVzZXJ2ZWRTcHJpdGVzQW5kQ2FyZHMsXHJcbiAgICAgICAgbW92aW5nU3ByaXRlc0FuZENhcmRzLFxyXG4gICAgICAgIHNoYXJlQ291bnQsXHJcbiAgICAgICAgcmV2ZWFsQ291bnQsXHJcbiAgICAgICAgc3BsaXRJbmRleCxcclxuICAgICAgICBhY3Rpb24udHlwZSA9PT0gXCJSZXR1cm5Ub0RlY2tcIlxyXG4gICAgKTtcclxufSIsImltcG9ydCAqIGFzIExpYiBmcm9tIFwiLi4vbGliXCI7XHJcblxyXG5jb25zdCBwbGF5ZXJOYW1lRWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwbGF5ZXJOYW1lJyk7XHJcbmNvbnN0IHBsYXllck5hbWVWYWx1ZSA9IExpYi5nZXRDb29raWUoJ3BsYXllck5hbWUnKTtcclxuaWYgKHBsYXllck5hbWVFbGVtZW50ICE9PSBudWxsICYmIHBsYXllck5hbWVWYWx1ZSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAoPEhUTUxJbnB1dEVsZW1lbnQ+cGxheWVyTmFtZUVsZW1lbnQpLnZhbHVlID0gZGVjb2RlVVJJKHBsYXllck5hbWVWYWx1ZSk7XHJcbn1cclxuXHJcbmNvbnN0IGdhbWVJZEVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZ2FtZUlkJyk7XHJcbmNvbnN0IGdhbWVJZFZhbHVlID0gTGliLmdldENvb2tpZSgnZ2FtZUlkJyk7XHJcbmlmIChnYW1lSWRFbGVtZW50ICE9PSBudWxsICYmIGdhbWVJZFZhbHVlICE9PSB1bmRlZmluZWQpIHtcclxuICAgICg8SFRNTElucHV0RWxlbWVudD5nYW1lSWRFbGVtZW50KS52YWx1ZSA9IGdhbWVJZFZhbHVlO1xyXG59XHJcbiIsImltcG9ydCB7IHJhbmRvbSB9IGZyb20gJ25hbm9pZCc7XHJcblxyXG5pbXBvcnQgKiBhcyBMaWIgZnJvbSAnLi4vbGliJztcclxuaW1wb3J0ICogYXMgU3RhdGUgZnJvbSAnLi9zdGF0ZSc7XHJcbmltcG9ydCAqIGFzIElucHV0IGZyb20gJy4vaW5wdXQnO1xyXG5pbXBvcnQgKiBhcyBWUCBmcm9tICcuL3ZpZXctcGFyYW1zJztcclxuaW1wb3J0IFZlY3RvciBmcm9tICcuL3ZlY3Rvcic7XHJcblxyXG5jb25zdCBkZWNrRGVhbER1cmF0aW9uID0gMTAwMDtcclxubGV0IGRlY2tEZWFsVGltZTogbnVtYmVyIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xyXG5sZXQgY3VycmVudFRpbWU6IG51bWJlciB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZW5kZXIodGltZTogbnVtYmVyKSB7XHJcbiAgICB3aGlsZSAoU3RhdGUuZ2FtZVN0YXRlID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICBhd2FpdCBMaWIuZGVsYXkoMTAwKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBkZWx0YVRpbWUgPSB0aW1lIC0gKGN1cnJlbnRUaW1lICE9PSB1bmRlZmluZWQgPyBjdXJyZW50VGltZSA6IHRpbWUpO1xyXG4gICAgY3VycmVudFRpbWUgPSB0aW1lO1xyXG5cclxuICAgIGNvbnN0IHVubG9jayA9IGF3YWl0IFN0YXRlLmxvY2soKTtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgLy8gY2xlYXIgdGhlIHNjcmVlblxyXG4gICAgICAgIFZQLmNvbnRleHQuY2xlYXJSZWN0KDAsIDAsIFZQLmNhbnZhcy53aWR0aCwgVlAuY2FudmFzLmhlaWdodCk7XHJcblxyXG4gICAgICAgIHJlbmRlckJhc2ljcyhTdGF0ZS5nYW1lSWQsIFN0YXRlLnBsYXllck5hbWUpO1xyXG4gICAgICAgIHJlbmRlckRlY2sodGltZSwgZGVsdGFUaW1lLCBTdGF0ZS5nYW1lU3RhdGUuZGVja0NvdW50KTtcclxuICAgICAgICByZW5kZXJPdGhlclBsYXllcnMoZGVsdGFUaW1lLCBTdGF0ZS5nYW1lU3RhdGUpO1xyXG4gICAgICAgIHJlbmRlclBsYXllcihkZWx0YVRpbWUsIFN0YXRlLmdhbWVTdGF0ZSk7XHJcbiAgICAgICAgcmVuZGVyQnV0dG9ucyh0aW1lLCBTdGF0ZS5nYW1lU3RhdGUpO1xyXG4gICAgfSBmaW5hbGx5IHtcclxuICAgICAgICB1bmxvY2soKTtcclxuICAgIH1cclxuXHJcbiAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKHJlbmRlcik7XHJcbn1cclxuLypcclxuY29uc3Qgd2lnZ2xlcyA9IG5ldyBNYXA8c3RyaW5nLCBbc3RyaW5nLCBudW1iZXJbXSwgbnVtYmVyXT4oKTtcclxuY29uc3Qgd2lnZ2xlSW50ZXJ2YWwgPSAxMDA7XHJcbmZ1bmN0aW9uIHdpZ2dsZVRleHQoczogc3RyaW5nLCB4OiBudW1iZXIsIHk6IG51bWJlcikge1xyXG4gICAgaWYgKGN1cnJlbnRUaW1lID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgbG93ZXIgPSBzLnRvTG93ZXJDYXNlKCk7XHJcbiAgICBsZXQgd2lnZ2xlID0gd2lnZ2xlcy5nZXQobG93ZXIpO1xyXG4gICAgaWYgKHdpZ2dsZSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgY29uc3QgdXBwZXIgPSBzLnRvVXBwZXJDYXNlKCk7XHJcbiAgICAgICAgY29uc3Qgd2lkdGhzID0gW107XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsb3dlci5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgICAgICB3aWR0aHMucHVzaCgoXHJcbiAgICAgICAgICAgICAgICBWUC5jb250ZXh0Lm1lYXN1cmVUZXh0KDxzdHJpbmc+bG93ZXJbaV0pLndpZHRoICtcclxuICAgICAgICAgICAgICAgIFZQLmNvbnRleHQubWVhc3VyZVRleHQoPHN0cmluZz51cHBlcltpXSkud2lkdGgpIC8gMik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB3aWdnbGUgPSBbcywgd2lkdGhzLCBjdXJyZW50VGltZV07XHJcbiAgICAgICAgd2lnZ2xlcy5zZXQobG93ZXIsIHdpZ2dsZSk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgW3NzLCB3cywgdF0gPSB3aWdnbGU7XHJcbiAgICBzID0gXCJcIjtcclxuICAgIGxldCB0dCA9IHQ7XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNzLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgbGV0IGMgPSA8c3RyaW5nPnNzW2ldO1xyXG4gICAgICAgIGlmICh0ICsgd2lnZ2xlSW50ZXJ2YWwgPCBjdXJyZW50VGltZSkge1xyXG4gICAgICAgICAgICB0dCA9IGN1cnJlbnRUaW1lO1xyXG4gICAgICAgICAgICBpZiAoPG51bWJlcj5yYW5kb20oMSlbMF0gPCAxMjcpIHtcclxuICAgICAgICAgICAgICAgIGMgPSBjLnRvVXBwZXJDYXNlKCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBjID0gYy50b0xvd2VyQ2FzZSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzICs9IGM7XHJcbiAgICAgICAgVlAuY29udGV4dC5maWxsVGV4dChjLCB4ICs9IDxudW1iZXI+d3NbaV0sIHkpO1xyXG4gICAgfVxyXG5cclxuICAgIHdpZ2dsZXMuc2V0KGxvd2VyLCBbcywgd3MsIHR0XSk7XHJcbn1cclxuKi9cclxuZnVuY3Rpb24gcmVuZGVyQmFzaWNzKGdhbWVJZDogc3RyaW5nLCBwbGF5ZXJOYW1lOiBzdHJpbmcpIHtcclxuICAgIFZQLmNvbnRleHQuZmlsbFN0eWxlID0gJyMwMDAwMDBmZic7XHJcbiAgICBWUC5jb250ZXh0LnRleHRBbGlnbiA9ICdsZWZ0JztcclxuICAgIFZQLmNvbnRleHQuZm9udCA9IGAke1ZQLnNwcml0ZUhlaWdodCAvIDR9cHggU3VnYXJsaWtlYDtcclxuICAgIFZQLmNvbnRleHQuZmlsbFN0eWxlID0gJ2ZvbnQtdmFyaWFudC1lYXN0LWFzaWFuOiBmdWxsLXdpZHRoJztcclxuXHJcbiAgICBWUC5jb250ZXh0LnRleHRCYXNlbGluZSA9ICd0b3AnO1xyXG4gICAgVlAuY29udGV4dC5maWxsVGV4dChgR2FtZTogJHtnYW1lSWR9YCwgMCwgMSAqIFZQLnBpeGVsc1BlclBlcmNlbnQpO1xyXG5cclxuICAgIFZQLmNvbnRleHQudGV4dEJhc2VsaW5lID0gJ2JvdHRvbSc7XHJcbiAgICBWUC5jb250ZXh0LmZpbGxUZXh0KGBZb3VyIG5hbWUgaXM6ICR7cGxheWVyTmFtZX1gLCAwLCBWUC5jYW52YXMuaGVpZ2h0KTtcclxuXHJcbiAgICBWUC5jb250ZXh0LnNldExpbmVEYXNoKFs0LCAxXSk7XHJcbiAgICBWUC5jb250ZXh0LnN0cm9rZVJlY3QoVlAuc3ByaXRlSGVpZ2h0LCBWUC5zcHJpdGVIZWlnaHQsIFZQLmNhbnZhcy53aWR0aCAtIDIgKiBWUC5zcHJpdGVIZWlnaHQsIFZQLmNhbnZhcy5oZWlnaHQgLSAyICogVlAuc3ByaXRlSGVpZ2h0KTtcclxufVxyXG5cclxuZnVuY3Rpb24gcmVuZGVyRGVjayh0aW1lOiBudW1iZXIsIGRlbHRhVGltZTogbnVtYmVyLCBkZWNrQ291bnQ6IG51bWJlcikge1xyXG4gICAgVlAuY29udGV4dC5zYXZlKCk7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIGlmIChkZWNrRGVhbFRpbWUgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICBkZWNrRGVhbFRpbWUgPSB0aW1lO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBTdGF0ZS5kZWNrU3ByaXRlcy5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgICAgICBjb25zdCBkZWNrU3ByaXRlID0gU3RhdGUuZGVja1Nwcml0ZXNbaV07XHJcbiAgICAgICAgICAgIGlmIChkZWNrU3ByaXRlID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG5cclxuICAgICAgICAgICAgaWYgKGkgPT09IGRlY2tDb3VudCAtIDEgJiZcclxuICAgICAgICAgICAgICAgIElucHV0LmFjdGlvbiAhPT0gXCJOb25lXCIgJiZcclxuICAgICAgICAgICAgICAgIElucHV0LmFjdGlvbiAhPT0gXCJTb3J0QnlTdWl0XCIgJiZcclxuICAgICAgICAgICAgICAgIElucHV0LmFjdGlvbiAhPT0gXCJTb3J0QnlSYW5rXCIgJiZcclxuICAgICAgICAgICAgICAgIElucHV0LmFjdGlvbiAhPT0gXCJXYWl0XCIgJiZcclxuICAgICAgICAgICAgICAgIElucHV0LmFjdGlvbiAhPT0gXCJQcm9jZWVkXCIgJiZcclxuICAgICAgICAgICAgICAgIElucHV0LmFjdGlvbiAhPT0gXCJEZXNlbGVjdFwiICYmIChcclxuICAgICAgICAgICAgICAgIElucHV0LmFjdGlvbi50eXBlID09PSBcIkRyYXdGcm9tRGVja1wiIHx8XHJcbiAgICAgICAgICAgICAgICBJbnB1dC5hY3Rpb24udHlwZSA9PT0gXCJXYWl0aW5nRm9yTmV3Q2FyZFwiXHJcbiAgICAgICAgICAgICkpIHtcclxuICAgICAgICAgICAgICAgIC8vIHNldCBpbiBvbm1vdXNlbW92ZVxyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRpbWUgLSBkZWNrRGVhbFRpbWUgPCBpICogZGVja0RlYWxEdXJhdGlvbiAvIGRlY2tDb3VudCkge1xyXG4gICAgICAgICAgICAgICAgLy8gY2FyZCBub3QgeWV0IGRlYWx0OyBrZWVwIHRvcCBsZWZ0XHJcbiAgICAgICAgICAgICAgICBkZWNrU3ByaXRlLnBvc2l0aW9uID0gbmV3IFZlY3RvcigtVlAuc3ByaXRlV2lkdGgsIC1WUC5zcHJpdGVIZWlnaHQpO1xyXG4gICAgICAgICAgICAgICAgZGVja1Nwcml0ZS50YXJnZXQgPSBuZXcgVmVjdG9yKC1WUC5zcHJpdGVXaWR0aCwgLVZQLnNwcml0ZUhlaWdodCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBkZWNrU3ByaXRlLnRhcmdldCA9IG5ldyBWZWN0b3IoXHJcbiAgICAgICAgICAgICAgICAgICAgVlAuY2FudmFzLndpZHRoIC8gMiAtIFZQLnNwcml0ZVdpZHRoIC8gMiAtIChpIC0gZGVja0NvdW50IC8gMikgKiBWUC5zcHJpdGVEZWNrR2FwLFxyXG4gICAgICAgICAgICAgICAgICAgIFZQLmNhbnZhcy5oZWlnaHQgLyAyIC0gVlAuc3ByaXRlSGVpZ2h0IC8gMlxyXG4gICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZGVja1Nwcml0ZS5hbmltYXRlKGRlbHRhVGltZSk7XHJcbiAgICAgICAgfVxyXG4gICAgfSBmaW5hbGx5IHtcclxuICAgICAgICBWUC5jb250ZXh0LnJlc3RvcmUoKTtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gcmVuZGVyT3RoZXJQbGF5ZXJzKGRlbHRhVGltZTogbnVtYmVyLCBnYW1lU3RhdGU6IExpYi5HYW1lU3RhdGUpIHtcclxuICAgIFZQLmNvbnRleHQuc2F2ZSgpO1xyXG4gICAgdHJ5IHtcclxuICAgICAgICBWUC5jb250ZXh0LnNldFRyYW5zZm9ybShWUC5nZXRUcmFuc2Zvcm1Gb3JQbGF5ZXIoMSkpO1xyXG4gICAgICAgIC8vVlAuY29udGV4dC50cmFuc2xhdGUoMCwgKFZQLmNhbnZhcy53aWR0aCArIFZQLmNhbnZhcy5oZWlnaHQpIC8gMik7XHJcbiAgICAgICAgLy9WUC5jb250ZXh0LnJvdGF0ZSgtTWF0aC5QSSAvIDIpO1xyXG4gICAgICAgIHJlbmRlck90aGVyUGxheWVyKGRlbHRhVGltZSwgZ2FtZVN0YXRlLCAoZ2FtZVN0YXRlLnBsYXllckluZGV4ICsgMSkgJSA0KTtcclxuICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgVlAuY29udGV4dC5yZXN0b3JlKCk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIFZQLmNvbnRleHQuc2F2ZSgpO1xyXG4gICAgdHJ5IHtcclxuICAgICAgICBWUC5jb250ZXh0LnNldFRyYW5zZm9ybShWUC5nZXRUcmFuc2Zvcm1Gb3JQbGF5ZXIoMikpO1xyXG4gICAgICAgIHJlbmRlck90aGVyUGxheWVyKGRlbHRhVGltZSwgZ2FtZVN0YXRlLCAoZ2FtZVN0YXRlLnBsYXllckluZGV4ICsgMikgJSA0KTtcclxuICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgVlAuY29udGV4dC5yZXN0b3JlKCk7XHJcbiAgICB9XHJcblxyXG4gICAgVlAuY29udGV4dC5zYXZlKCk7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIFZQLmNvbnRleHQuc2V0VHJhbnNmb3JtKFZQLmdldFRyYW5zZm9ybUZvclBsYXllcigzKSk7XHJcbiAgICAgICAgLy9WUC5jb250ZXh0LnRyYW5zbGF0ZShWUC5jYW52YXMud2lkdGgsIChWUC5jYW52YXMuaGVpZ2h0IC0gVlAuY2FudmFzLndpZHRoKSAvIDIpO1xyXG4gICAgICAgIC8vVlAuY29udGV4dC5yb3RhdGUoTWF0aC5QSSAvIDIpO1xyXG4gICAgICAgIHJlbmRlck90aGVyUGxheWVyKGRlbHRhVGltZSwgZ2FtZVN0YXRlLCAoZ2FtZVN0YXRlLnBsYXllckluZGV4ICsgMykgJSA0KTtcclxuICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgVlAuY29udGV4dC5yZXN0b3JlKCk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbmRlck90aGVyUGxheWVyKGRlbHRhVGltZTogbnVtYmVyLCBnYW1lU3RhdGU6IExpYi5HYW1lU3RhdGUsIHBsYXllckluZGV4OiBudW1iZXIpIHtcclxuICAgIGNvbnN0IHBsYXllciA9IGdhbWVTdGF0ZS5vdGhlclBsYXllcnNbcGxheWVySW5kZXhdO1xyXG4gICAgaWYgKHBsYXllciA9PT0gdW5kZWZpbmVkIHx8IHBsYXllciA9PT0gbnVsbCkgcmV0dXJuO1xyXG5cclxuICAgIGNvbnN0IGZhY2VTcHJpdGVzID0gU3RhdGUuZmFjZVNwcml0ZXNGb3JQbGF5ZXJbcGxheWVySW5kZXhdID8/IFtdO1xyXG4gICAgbGV0IGkgPSAwO1xyXG4gICAgZm9yIChjb25zdCBmYWNlU3ByaXRlIG9mIGZhY2VTcHJpdGVzKSB7XHJcbiAgICAgICAgaWYgKGkgPCBwbGF5ZXIuc2hhcmVDb3VudCkge1xyXG4gICAgICAgICAgICBmYWNlU3ByaXRlLnRhcmdldCA9IG5ldyBWZWN0b3IoXHJcbiAgICAgICAgICAgICAgICBWUC5jYW52YXMud2lkdGggLyAyICsgKHBsYXllci5zaGFyZUNvdW50IC0gaSkgKiBWUC5zcHJpdGVHYXAsXHJcbiAgICAgICAgICAgICAgICBWUC5zcHJpdGVIZWlnaHQgKyBWUC5zcHJpdGVHYXBcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBmYWNlU3ByaXRlLnRhcmdldCA9IG5ldyBWZWN0b3IoXHJcbiAgICAgICAgICAgICAgICBWUC5jYW52YXMud2lkdGggLyAyIC0gVlAuc3ByaXRlV2lkdGggLSAoaSAtIHBsYXllci5zaGFyZUNvdW50KSAqIFZQLnNwcml0ZUdhcCxcclxuICAgICAgICAgICAgICAgIFZQLnNwcml0ZUhlaWdodFxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZmFjZVNwcml0ZS5hbmltYXRlKGRlbHRhVGltZSk7XHJcblxyXG4gICAgICAgICsraTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBiYWNrU3ByaXRlcyA9IFN0YXRlLmJhY2tTcHJpdGVzRm9yUGxheWVyW3BsYXllckluZGV4XSA/PyBbXTtcclxuICAgIGkgPSAwO1xyXG4gICAgZm9yIChjb25zdCBiYWNrU3ByaXRlIG9mIGJhY2tTcHJpdGVzKSB7XHJcbiAgICAgICAgYmFja1Nwcml0ZS50YXJnZXQgPSBuZXcgVmVjdG9yKFZQLmNhbnZhcy53aWR0aCAvIDIgLSBWUC5zcHJpdGVXaWR0aCAvIDIgKyAoaSAtIGJhY2tTcHJpdGVzLmxlbmd0aCAvIDIpICogVlAuc3ByaXRlR2FwLCAwKTtcclxuICAgICAgICBiYWNrU3ByaXRlLmFuaW1hdGUoZGVsdGFUaW1lKTtcclxuXHJcbiAgICAgICAgKytpO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBWUC5jb250ZXh0LmZpbGxTdHlsZSA9ICcjMDAwMDAwZmYnO1xyXG4gICAgVlAuY29udGV4dC5mb250ID0gYCR7VlAuc3ByaXRlSGVpZ2h0IC8gMn1weCBTdWdhcmxpa2VgO1xyXG4gICAgVlAuY29udGV4dC50ZXh0QmFzZWxpbmUgPSBcIm1pZGRsZVwiO1xyXG4gICAgVlAuY29udGV4dC50ZXh0QWxpZ24gPSBcImNlbnRlclwiO1xyXG4gICAgVlAuY29udGV4dC5maWxsVGV4dChwbGF5ZXIubmFtZSwgVlAuY2FudmFzLndpZHRoIC8gMiwgVlAuc3ByaXRlSGVpZ2h0IC8gMik7XHJcbn1cclxuXHJcbi8vIHJldHVybnMgdGhlIGFkanVzdGVkIHJldmVhbCBpbmRleFxyXG5mdW5jdGlvbiByZW5kZXJQbGF5ZXIoZGVsdGFUaW1lOiBudW1iZXIsIGdhbWVTdGF0ZTogTGliLkdhbWVTdGF0ZSkge1xyXG4gICAgY29uc3Qgc3ByaXRlcyA9IFN0YXRlLmZhY2VTcHJpdGVzRm9yUGxheWVyW2dhbWVTdGF0ZS5wbGF5ZXJJbmRleF07XHJcbiAgICBpZiAoc3ByaXRlcyA9PT0gdW5kZWZpbmVkKSByZXR1cm47XHJcblxyXG4gICAgbGV0IGkgPSAwO1xyXG4gICAgZm9yIChjb25zdCBzcHJpdGUgb2Ygc3ByaXRlcykge1xyXG4gICAgICAgIHNwcml0ZS5hbmltYXRlKGRlbHRhVGltZSk7XHJcblxyXG4gICAgICAgIGlmIChMaWIuYmluYXJ5U2VhcmNoTnVtYmVyKFN0YXRlLnNlbGVjdGVkSW5kaWNlcywgaSsrKSA+PSAwKSB7XHJcbiAgICAgICAgICAgIFZQLmNvbnRleHQuZmlsbFN0eWxlID0gJyMwMDgwODA0MCc7XHJcbiAgICAgICAgICAgIFZQLmNvbnRleHQuZmlsbFJlY3Qoc3ByaXRlLnBvc2l0aW9uLngsIHNwcml0ZS5wb3NpdGlvbi55LCBWUC5zcHJpdGVXaWR0aCwgVlAuc3ByaXRlSGVpZ2h0KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbmRlckJ1dHRvbnModGltZTogbnVtYmVyLCBnYW1lU3RhdGU6IExpYi5HYW1lU3RhdGUpIHtcclxuICAgIFZQLmNvbnRleHQuc2F2ZSgpO1xyXG4gICAgdHJ5IHtcclxuICAgICAgICAvLyBibHVyIGltYWdlIGJlaGluZFxyXG4gICAgICAgIC8vc3RhY2tCbHVyQ2FudmFzUkdCQSgnY2FudmFzJywgeCwgeSwgY2FudmFzLndpZHRoIC0geCwgY2FudmFzLmhlaWdodCAtIHksIDE2KTtcclxuICAgICAgICAvKlxyXG4gICAgICAgIGNvbnN0IHggPSBWUC5zb3J0QnlTdWl0Qm91bmRzWzBdLnggLSA0ICogVlAucGl4ZWxzUGVyQ007XHJcbiAgICAgICAgY29uc3QgeSA9IFZQLnNvcnRCeVN1aXRCb3VuZHNbMF0ueTtcclxuICAgICAgICBWUC5jb250ZXh0LmZpbGxTdHlsZSA9ICcjMDBmZmZmNzcnO1xyXG4gICAgICAgIFZQLmNvbnRleHQuZmlsbFJlY3QoeCwgeSwgVlAuY2FudmFzLndpZHRoIC0geCwgVlAuY2FudmFzLmhlaWdodCAtIHkpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIFZQLmNvbnRleHQuZmlsbFN0eWxlID0gJyMwMDAwMDBmZic7XHJcbiAgICAgICAgVlAuY29udGV4dC5mb250ID0gJzEuNWNtIFN1Z2FybGlrZSc7XHJcbiAgICAgICAgVlAuY29udGV4dC5maWxsVGV4dCgnU09SVCcsIHggKyAwLjI1ICogVlAucGl4ZWxzUGVyQ00sIHkgKyAyLjI1ICogVlAucGl4ZWxzUGVyQ00pO1xyXG5cclxuICAgICAgICBWUC5jb250ZXh0LmZvbnQgPSAnM2NtIFN1Z2FybGlrZSc7XHJcbiAgICAgICAgVlAuY29udGV4dC5maWxsVGV4dCgneycsIHggKyAzICogVlAucGl4ZWxzUGVyQ00sIHkgKyAyLjc1ICogVlAucGl4ZWxzUGVyQ00pO1xyXG5cclxuICAgICAgICBWUC5jb250ZXh0LmZvbnQgPSAnMS41Y20gU3VnYXJsaWtlJztcclxuICAgICAgICBWUC5jb250ZXh0LmZpbGxUZXh0KCdTVUlUJywgVlAuc29ydEJ5U3VpdEJvdW5kc1swXS54LCBWUC5zb3J0QnlTdWl0Qm91bmRzWzFdLnkpO1xyXG5cclxuICAgICAgICBWUC5jb250ZXh0LmZvbnQgPSAnMS41Y20gU3VnYXJsaWtlJztcclxuICAgICAgICBWUC5jb250ZXh0LmZpbGxUZXh0KCdSQU5LJywgVlAuc29ydEJ5UmFua0JvdW5kc1swXS54LCBWUC5zb3J0QnlSYW5rQm91bmRzWzFdLnkpO1xyXG4gICAgICAgICovXHJcbiAgICAgICAgLy9jb250ZXh0LmZpbGxTdHlsZSA9ICcjZmYwMDAwNzcnO1xyXG4gICAgICAgIC8vY29udGV4dC5maWxsUmVjdChWUC5zb3J0QnlTdWl0Qm91bmRzWzBdLngsIFZQLnNvcnRCeVN1aXRCb3VuZHNbMF0ueSxcclxuICAgICAgICAgICAgLy9zb3J0QnlTdWl0Qm91bmRzWzFdLnggLSBzb3J0QnlTdWl0Qm91bmRzWzBdLngsIHNvcnRCeVN1aXRCb3VuZHNbMV0ueSAtIHNvcnRCeVN1aXRCb3VuZHNbMF0ueSk7XHJcblxyXG4gICAgICAgIC8vY29udGV4dC5maWxsU3R5bGUgPSAnIzAwMDBmZjc3JztcclxuICAgICAgICAvL2NvbnRleHQuZmlsbFJlY3Qoc29ydEJ5UmFua0JvdW5kc1swXS54LCBzb3J0QnlSYW5rQm91bmRzWzBdLnksXHJcbiAgICAgICAgICAgIC8vc29ydEJ5UmFua0JvdW5kc1sxXS54IC0gc29ydEJ5UmFua0JvdW5kc1swXS54LCBzb3J0QnlSYW5rQm91bmRzWzFdLnkgLSBzb3J0QnlSYW5rQm91bmRzWzBdLnkpO1xyXG5cclxuICAgICAgICAvKmlmIChnYW1lU3RhdGUucGxheWVyU3RhdGUgPT09IFwiUHJvY2VlZFwiIHx8IGdhbWVTdGF0ZS5wbGF5ZXJTdGF0ZSA9PT0gXCJXYWl0XCIpIHtcclxuICAgICAgICAgICAgVlAuY29udGV4dC50ZXh0QmFzZWxpbmUgPSAndG9wJztcclxuXHJcbiAgICAgICAgICAgIGlmIChnYW1lU3RhdGUucGxheWVyU3RhdGUgPT09IFwiV2FpdFwiKSB7XHJcbiAgICAgICAgICAgICAgICBWUC5jb250ZXh0LmZpbGxTdHlsZSA9ICcjMDBmZmZmNjAnO1xyXG4gICAgICAgICAgICAgICAgVlAuY29udGV4dC5maWxsUmVjdChcclxuICAgICAgICAgICAgICAgICAgICBWUC53YWl0Qm91bmRzWzBdLngsIFZQLndhaXRCb3VuZHNbMF0ueSxcclxuICAgICAgICAgICAgICAgICAgICBWUC53YWl0Qm91bmRzWzFdLnggLSBWUC53YWl0Qm91bmRzWzBdLngsIFZQLndhaXRCb3VuZHNbMV0ueSAtIFZQLndhaXRCb3VuZHNbMF0ueVxyXG4gICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgVlAuY29udGV4dC5maWxsU3R5bGUgPSAnIzAwMDAwMGZmJztcclxuICAgICAgICAgICAgVlAuY29udGV4dC5mb250ID0gVlAud2FpdEZvbnQ7XHJcbiAgICAgICAgICAgIFZQLmNvbnRleHQuZmlsbFRleHQoJ1dhaXQhJywgVlAud2FpdEJvdW5kc1swXS54LCBWUC53YWl0Qm91bmRzWzBdLnkpO1xyXG4gICAgICAgICAgICBib3VuZHNSZWN0KFZQLndhaXRCb3VuZHMpO1xyXG5cclxuICAgICAgICAgICAgaWYgKGdhbWVTdGF0ZS5wbGF5ZXJTdGF0ZSA9PT0gXCJQcm9jZWVkXCIpIHtcclxuICAgICAgICAgICAgICAgIFZQLmNvbnRleHQuZmlsbFN0eWxlID0gJyMwMGZmZmY2MCc7XHJcbiAgICAgICAgICAgICAgICBWUC5jb250ZXh0LmZpbGxSZWN0KFxyXG4gICAgICAgICAgICAgICAgICAgIFZQLnByb2NlZWRCb3VuZHNbMF0ueCwgVlAucHJvY2VlZEJvdW5kc1swXS55LFxyXG4gICAgICAgICAgICAgICAgICAgIFZQLnByb2NlZWRCb3VuZHNbMV0ueCAtIFZQLnByb2NlZWRCb3VuZHNbMF0ueCwgVlAucHJvY2VlZEJvdW5kc1sxXS55IC0gVlAucHJvY2VlZEJvdW5kc1swXS55XHJcbiAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBWUC5jb250ZXh0LmZpbGxTdHlsZSA9ICcjMDAwMDAwZmYnO1xyXG4gICAgICAgICAgICBWUC5jb250ZXh0LmZvbnQgPSBWUC5wcm9jZWVkRm9udDtcclxuICAgICAgICAgICAgVlAuY29udGV4dC5maWxsVGV4dCgnUHJvY2VlZC4nLCBWUC5wcm9jZWVkQm91bmRzWzBdLngsIFZQLnByb2NlZWRCb3VuZHNbMF0ueSk7XHJcbiAgICAgICAgICAgIGJvdW5kc1JlY3QoVlAucHJvY2VlZEJvdW5kcyk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgaWYgKGdhbWVTdGF0ZS5wbGF5ZXJTdGF0ZSA9PT0gJ1JlYWR5Jykge1xyXG4gICAgICAgICAgICAgICAgVlAuY29udGV4dC5maWxsU3R5bGUgPSAnIzAwMDAwMGZmJztcclxuICAgICAgICAgICAgICAgIFZQLmNvbnRleHQuZm9udCA9IFZQLnJlYWR5Rm9udDtcclxuICAgICAgICAgICAgICAgIFZQLmNvbnRleHQuZmlsbFRleHQoJ1JlYWR5IScsIFZQLnJlYWR5Qm91bmRzWzBdLngsIFZQLnJlYWR5Qm91bmRzWzBdLnkpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgVlAuY29udGV4dC5maWxsU3R5bGUgPSAnIzAwMDAwMGZmJztcclxuICAgICAgICAgICAgICAgIFZQLmNvbnRleHQuZm9udCA9IFZQLmNvdW50ZG93bkZvbnQ7XHJcbiAgICAgICAgICAgICAgICBWUC5jb250ZXh0LmZpbGxUZXh0KGBXYWl0aW5nICR7XHJcbiAgICAgICAgICAgICAgICAgICAgTWF0aC5mbG9vcigxICsgKGdhbWVTdGF0ZS5wbGF5ZXJTdGF0ZS5hY3RpdmVUaW1lICsgTGliLmFjdGl2ZUNvb2xkb3duIC0gRGF0ZS5ub3coKSkgLyAxMDAwKVxyXG4gICAgICAgICAgICAgICAgfSBzZWNvbmRzLi4uYCwgVlAuY291bnRkb3duQm91bmRzWzBdLngsIFZQLmNvdW50ZG93bkJvdW5kc1swXS55KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0qL1xyXG4gICAgfSBmaW5hbGx5IHtcclxuICAgICAgICBWUC5jb250ZXh0LnJlc3RvcmUoKTtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gYm91bmRzUmVjdChbdG9wTGVmdCwgYm90dG9tUmlnaHRdOiBbVmVjdG9yLCBWZWN0b3JdKSB7XHJcbiAgICBWUC5jb250ZXh0LnN0cm9rZVJlY3QodG9wTGVmdC54LCB0b3BMZWZ0LnksIGJvdHRvbVJpZ2h0LnggLSB0b3BMZWZ0LngsIGJvdHRvbVJpZ2h0LnkgLSB0b3BMZWZ0LnkpO1xyXG59XHJcbiIsImltcG9ydCBWZWN0b3IgZnJvbSAnLi92ZWN0b3InO1xyXG5pbXBvcnQgKiBhcyBWUCBmcm9tICcuL3ZpZXctcGFyYW1zJztcclxuXHJcbmNvbnN0IHNwcmluZ0NvbnN0YW50ID0gMTAwMDtcclxuY29uc3QgbWFzcyA9IDE7XHJcbmNvbnN0IGRyYWcgPSBNYXRoLnNxcnQoNCAqIG1hc3MgKiBzcHJpbmdDb25zdGFudCk7XHJcblxyXG4vLyBzdGF0ZSBmb3IgcGh5c2ljcy1iYXNlZCBhbmltYXRpb25zXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFNwcml0ZSB7XHJcbiAgICBpbWFnZTogSFRNTEltYWdlRWxlbWVudDtcclxuICAgIHRhcmdldDogVmVjdG9yO1xyXG4gICAgcG9zaXRpb246IFZlY3RvcjtcclxuICAgIHZlbG9jaXR5OiBWZWN0b3I7XHJcblxyXG4gICAgLy9iYWQgPSBmYWxzZTtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihpbWFnZTogSFRNTEltYWdlRWxlbWVudCkge1xyXG4gICAgICAgIHRoaXMuaW1hZ2UgPSBpbWFnZTtcclxuICAgICAgICB0aGlzLnRhcmdldCA9IG5ldyBWZWN0b3IoMCwgMCk7XHJcbiAgICAgICAgdGhpcy5wb3NpdGlvbiA9IG5ldyBWZWN0b3IoMCwgMCk7XHJcbiAgICAgICAgdGhpcy52ZWxvY2l0eSA9IG5ldyBWZWN0b3IoMCwgMCk7XHJcbiAgICB9XHJcblxyXG4gICAgYW5pbWF0ZShkZWx0YVRpbWU6IG51bWJlcikge1xyXG4gICAgICAgIGNvbnN0IHNwcmluZ0ZvcmNlID0gdGhpcy50YXJnZXQuc3ViKHRoaXMucG9zaXRpb24pLnNjYWxlKHNwcmluZ0NvbnN0YW50KTtcclxuICAgICAgICBjb25zdCBkcmFnRm9yY2UgPSB0aGlzLnZlbG9jaXR5LnNjYWxlKC1kcmFnKTtcclxuICAgICAgICBjb25zdCBhY2NlbGVyYXRpb24gPSBzcHJpbmdGb3JjZS5hZGQoZHJhZ0ZvcmNlKS5zY2FsZSgxIC8gbWFzcyk7XHJcblxyXG4gICAgICAgIC8vY29uc3Qgc2F2ZWRWZWxvY2l0eSA9IHRoaXMudmVsb2NpdHk7XHJcbiAgICAgICAgLy9jb25zdCBzYXZlZFBvc2l0aW9uID0gdGhpcy5wb3NpdGlvbjtcclxuICAgICAgICBcclxuICAgICAgICB0aGlzLnZlbG9jaXR5ID0gdGhpcy52ZWxvY2l0eS5hZGQoYWNjZWxlcmF0aW9uLnNjYWxlKGRlbHRhVGltZSAvIDEwMDApKTtcclxuICAgICAgICB0aGlzLnBvc2l0aW9uID0gdGhpcy5wb3NpdGlvbi5hZGQodGhpcy52ZWxvY2l0eS5zY2FsZShkZWx0YVRpbWUgLyAxMDAwKSk7XHJcblxyXG4gICAgICAgIC8qXHJcbiAgICAgICAgaWYgKCF0aGlzLmJhZCAmJiAoXHJcbiAgICAgICAgICAgICFpc0Zpbml0ZSh0aGlzLnZlbG9jaXR5LngpIHx8IGlzTmFOKHRoaXMudmVsb2NpdHkueCkgfHxcclxuICAgICAgICAgICAgIWlzRmluaXRlKHRoaXMudmVsb2NpdHkueSkgfHwgaXNOYU4odGhpcy52ZWxvY2l0eS55KSB8fFxyXG4gICAgICAgICAgICAhaXNGaW5pdGUodGhpcy5wb3NpdGlvbi54KSB8fCBpc05hTih0aGlzLnBvc2l0aW9uLngpIHx8XHJcbiAgICAgICAgICAgICFpc0Zpbml0ZSh0aGlzLnBvc2l0aW9uLnkpIHx8IGlzTmFOKHRoaXMucG9zaXRpb24ueSlcclxuICAgICAgICApKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYmFkID0gdHJ1ZTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBkZWx0YVRpbWU6ICR7ZGVsdGFUaW1lfSwgc3ByaW5nRm9yY2U6ICR7SlNPTi5zdHJpbmdpZnkoc3ByaW5nRm9yY2UpfSwgZHJhZ0ZvcmNlOiAke0pTT04uc3RyaW5naWZ5KGRyYWdGb3JjZSl9YCk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGB0YXJnZXQ6ICR7SlNPTi5zdHJpbmdpZnkodGhpcy50YXJnZXQpfSwgcG9zaXRpb246ICR7SlNPTi5zdHJpbmdpZnkoc2F2ZWRQb3NpdGlvbil9LCB2ZWxvY2l0eTogJHtKU09OLnN0cmluZ2lmeShzYXZlZFZlbG9jaXR5KX0sIGFjY2VsZXJhdGlvbjogJHtKU09OLnN0cmluZ2lmeShhY2NlbGVyYXRpb24pfWApO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgbmV3IHBvc2l0aW9uOiAke0pTT04uc3RyaW5naWZ5KHRoaXMucG9zaXRpb24pfSwgbmV3IHZlbG9jaXR5OiAke0pTT04uc3RyaW5naWZ5KHRoaXMudmVsb2NpdHkpfWApO1xyXG4gICAgICAgIH1cclxuICAgICAgICAqL1xyXG5cclxuICAgICAgICBWUC5jb250ZXh0LmRyYXdJbWFnZSh0aGlzLmltYWdlLCB0aGlzLnBvc2l0aW9uLngsIHRoaXMucG9zaXRpb24ueSwgVlAuc3ByaXRlV2lkdGgsIFZQLnNwcml0ZUhlaWdodCk7XHJcbiAgICB9XHJcbn0iLCJpbXBvcnQgeyBNdXRleCB9IGZyb20gJ2F3YWl0LXNlbWFwaG9yZSc7XHJcblxyXG5pbXBvcnQgKiBhcyBMaWIgZnJvbSAnLi4vbGliJztcclxuaW1wb3J0ICogYXMgQ2FyZEltYWdlcyBmcm9tICcuL2NhcmQtaW1hZ2VzJztcclxuaW1wb3J0ICogYXMgVlAgZnJvbSAnLi92aWV3LXBhcmFtcyc7XHJcbmltcG9ydCBTcHJpdGUgZnJvbSAnLi9zcHJpdGUnO1xyXG5pbXBvcnQgVmVjdG9yIGZyb20gJy4vdmVjdG9yJztcclxuXHJcbmNvbnN0IHBsYXllck5hbWVGcm9tQ29va2llID0gTGliLmdldENvb2tpZSgncGxheWVyTmFtZScpO1xyXG5pZiAocGxheWVyTmFtZUZyb21Db29raWUgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCdObyBwbGF5ZXIgbmFtZSEnKTtcclxuZXhwb3J0IGNvbnN0IHBsYXllck5hbWUgPSBkZWNvZGVVUkkocGxheWVyTmFtZUZyb21Db29raWUpO1xyXG5cclxuY29uc3QgZ2FtZUlkRnJvbUNvb2tpZSA9IExpYi5nZXRDb29raWUoJ2dhbWVJZCcpO1xyXG5pZiAoZ2FtZUlkRnJvbUNvb2tpZSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoJ05vIGdhbWUgaWQhJyk7XHJcbmV4cG9ydCBjb25zdCBnYW1lSWQgPSBnYW1lSWRGcm9tQ29va2llO1xyXG5cclxuLy8gc29tZSBzdGF0ZS1tYW5pcHVsYXRpbmcgb3BlcmF0aW9ucyBhcmUgYXN5bmNocm9ub3VzLCBzbyB3ZSBuZWVkIHRvIGd1YXJkIGFnYWluc3QgcmFjZXNcclxuY29uc3Qgc3RhdGVNdXRleCA9IG5ldyBNdXRleCgpO1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbG9jaygpOiBQcm9taXNlPCgpID0+IHZvaWQ+IHtcclxuICAgIC8vY29uc29sZS5sb2coYGFjcXVpcmluZyBzdGF0ZSBsb2NrLi4uXFxuJHtuZXcgRXJyb3IoKS5zdGFja31gKTtcclxuICAgIGNvbnN0IHJlbGVhc2UgPSBhd2FpdCBzdGF0ZU11dGV4LmFjcXVpcmUoKTtcclxuICAgIC8vY29uc29sZS5sb2coYGFjcXVpcmVkIHN0YXRlIGxvY2tcXG4ke25ldyBFcnJvcigpLnN0YWNrfWApO1xyXG4gICAgcmV0dXJuICgpID0+IHtcclxuICAgICAgICByZWxlYXNlKCk7XHJcbiAgICAgICAgLy9jb25zb2xlLmxvZyhgcmVsZWFzZWQgc3RhdGUgbG9ja2ApO1xyXG4gICAgfTtcclxufVxyXG5cclxuLy8gd2UgbmVlZCB0byBrZWVwIGEgY29weSBvZiB0aGUgcHJldmlvdXMgZ2FtZSBzdGF0ZSBhcm91bmQgZm9yIGJvb2trZWVwaW5nIHB1cnBvc2VzXHJcbmV4cG9ydCBsZXQgcHJldmlvdXNHYW1lU3RhdGU6IExpYi5HYW1lU3RhdGUgfCB1bmRlZmluZWQ7XHJcbi8vIHRoZSBtb3N0IHJlY2VudGx5IHJlY2VpdmVkIGdhbWUgc3RhdGUsIGlmIGFueVxyXG5leHBvcnQgbGV0IGdhbWVTdGF0ZTogTGliLkdhbWVTdGF0ZSB8IHVuZGVmaW5lZDtcclxuXHJcbi8vIGluZGljZXMgb2YgY2FyZHMgZm9yIGRyYWcgJiBkcm9wXHJcbi8vIElNUE9SVEFOVDogdGhpcyBhcnJheSBtdXN0IGFsd2F5cyBiZSBzb3J0ZWQhXHJcbi8vIEFsd2F5cyB1c2UgYmluYXJ5U2VhcmNoIHRvIGluc2VydCBhbmQgZGVsZXRlIG9yIHNvcnQgYWZ0ZXIgbWFuaXB1bGF0aW9uXHJcbmV4cG9ydCBjb25zdCBzZWxlY3RlZEluZGljZXM6IG51bWJlcltdID0gW107XHJcblxyXG4vLyBmb3IgYW5pbWF0aW5nIHRoZSBkZWNrXHJcbmV4cG9ydCBsZXQgZGVja1Nwcml0ZXM6IFNwcml0ZVtdID0gW107XHJcblxyXG4vLyBhc3NvY2lhdGl2ZSBhcnJheXMsIG9uZSBmb3IgZWFjaCBwbGF5ZXIgYXQgdGhlaXIgcGxheWVyIGluZGV4XHJcbi8vIGVhY2ggZWxlbWVudCBjb3JyZXNwb25kcyB0byBhIGZhY2UtZG93biBjYXJkIGJ5IGluZGV4XHJcbmV4cG9ydCBsZXQgYmFja1Nwcml0ZXNGb3JQbGF5ZXI6IFNwcml0ZVtdW10gPSBbXTtcclxuLy8gZWFjaCBlbGVtZW50IGNvcnJlc3BvbmRzIHRvIGEgZmFjZS11cCBjYXJkIGJ5IGluZGV4XHJcbmV4cG9ydCBsZXQgZmFjZVNwcml0ZXNGb3JQbGF5ZXI6IFNwcml0ZVtdW10gPSBbXTtcclxuXHJcbi8vIG9wZW4gd2Vic29ja2V0IGNvbm5lY3Rpb24gdG8gZ2V0IGdhbWUgc3RhdGUgdXBkYXRlc1xyXG5sZXQgd3MgPSBuZXcgV2ViU29ja2V0KGB3c3M6Ly8ke3dpbmRvdy5sb2NhdGlvbi5ob3N0bmFtZX0vYCk7XHJcblxyXG5jb25zdCBjYWxsYmFja3NGb3JNZXRob2ROYW1lID0gbmV3IE1hcDxMaWIuTWV0aG9kTmFtZSwgKChyZXN1bHQ6IExpYi5NZXRob2RSZXN1bHQpID0+IHZvaWQpW10+KCk7XHJcbmZ1bmN0aW9uIGFkZENhbGxiYWNrKG1ldGhvZE5hbWU6IExpYi5NZXRob2ROYW1lLCByZXNvbHZlOiAoKSA9PiB2b2lkLCByZWplY3Q6IChyZWFzb246IGFueSkgPT4gdm9pZCkge1xyXG4gICAgY29uc29sZS5sb2coYGFkZGluZyBjYWxsYmFjayBmb3IgbWV0aG9kICcke21ldGhvZE5hbWV9J2ApO1xyXG5cclxuICAgIGxldCBjYWxsYmFja3MgPSBjYWxsYmFja3NGb3JNZXRob2ROYW1lLmdldChtZXRob2ROYW1lKTtcclxuICAgIGlmIChjYWxsYmFja3MgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIGNhbGxiYWNrcyA9IFtdO1xyXG4gICAgICAgIGNhbGxiYWNrc0Zvck1ldGhvZE5hbWUuc2V0KG1ldGhvZE5hbWUsIGNhbGxiYWNrcyk7XHJcbiAgICB9XHJcblxyXG4gICAgY2FsbGJhY2tzLnB1c2gocmVzdWx0ID0+IHtcclxuICAgICAgICBjb25zb2xlLmxvZyhgaW52b2tpbmcgY2FsbGJhY2sgZm9yIG1ldGhvZCAnJHttZXRob2ROYW1lfSdgKTtcclxuICAgICAgICBpZiAoJ2Vycm9yRGVzY3JpcHRpb24nIGluIHJlc3VsdCkge1xyXG4gICAgICAgICAgICByZWplY3QocmVzdWx0LmVycm9yRGVzY3JpcHRpb24pO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHJlc29sdmUoKTtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxufVxyXG5cclxud3Mub25tZXNzYWdlID0gYXN5bmMgZSA9PiB7XHJcbiAgICBjb25zdCBvYmogPSBKU09OLnBhcnNlKGUuZGF0YSk7XHJcbiAgICBpZiAoJ21ldGhvZE5hbWUnIGluIG9iaikge1xyXG4gICAgICAgIGNvbnN0IHJldHVybk1lc3NhZ2UgPSA8TGliLk1ldGhvZFJlc3VsdD5vYmo7XHJcbiAgICAgICAgY29uc3QgbWV0aG9kTmFtZSA9IHJldHVybk1lc3NhZ2UubWV0aG9kTmFtZTtcclxuICAgICAgICBjb25zdCBjYWxsYmFja3MgPSBjYWxsYmFja3NGb3JNZXRob2ROYW1lLmdldChtZXRob2ROYW1lKTtcclxuICAgICAgICBpZiAoY2FsbGJhY2tzID09PSB1bmRlZmluZWQgfHwgY2FsbGJhY2tzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYG5vIGNhbGxiYWNrcyBmb3VuZCBmb3IgbWV0aG9kOiAke21ldGhvZE5hbWV9YCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBjYWxsYmFjayA9IGNhbGxiYWNrcy5zaGlmdCgpO1xyXG4gICAgICAgIGlmIChjYWxsYmFjayA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgY2FsbGJhY2sgaXMgdW5kZWZpbmVkIGZvciBtZXRob2Q6ICR7bWV0aG9kTmFtZX1gKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgY2FsbGJhY2socmV0dXJuTWVzc2FnZSk7XHJcbiAgICB9IGVsc2UgaWYgKFxyXG4gICAgICAgICdkZWNrQ291bnQnIGluIG9iaiAmJlxyXG4gICAgICAgICdwbGF5ZXJJbmRleCcgaW4gb2JqICYmXHJcbiAgICAgICAgJ3BsYXllckNhcmRzJyBpbiBvYmogJiZcclxuICAgICAgICAncGxheWVyUmV2ZWFsQ291bnQnIGluIG9iaiAmJlxyXG4gICAgICAgIC8vJ3BsYXllclN0YXRlJyBpbiBvYmogJiZcclxuICAgICAgICAnb3RoZXJQbGF5ZXJzJyBpbiBvYmpcclxuICAgICkge1xyXG4gICAgICAgIGNvbnN0IHVubG9jayA9IGF3YWl0IGxvY2soKTtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBwcmV2aW91c0dhbWVTdGF0ZSA9IGdhbWVTdGF0ZTtcclxuICAgICAgICAgICAgZ2FtZVN0YXRlID0gPExpYi5HYW1lU3RhdGU+b2JqO1xyXG5cclxuICAgICAgICAgICAgaWYgKHByZXZpb3VzR2FtZVN0YXRlICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBwcmV2aW91c0dhbWVTdGF0ZS5wbGF5ZXJDYXJkczogJHtKU09OLnN0cmluZ2lmeShwcmV2aW91c0dhbWVTdGF0ZS5wbGF5ZXJDYXJkcyl9YCk7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgcHJldmlvdXMgc2VsZWN0ZWRJbmRpY2VzOiAke0pTT04uc3RyaW5naWZ5KHNlbGVjdGVkSW5kaWNlcyl9YCk7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgcHJldmlvdXMgc2VsZWN0ZWRDYXJkczogJHtKU09OLnN0cmluZ2lmeShzZWxlY3RlZEluZGljZXMubWFwKGkgPT4gcHJldmlvdXNHYW1lU3RhdGU/LnBsYXllckNhcmRzW2ldKSl9YCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIHNlbGVjdGVkIGluZGljZXMgbWlnaHQgaGF2ZSBzaGlmdGVkXHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2VsZWN0ZWRJbmRpY2VzLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBzZWxlY3RlZEluZGV4ID0gc2VsZWN0ZWRJbmRpY2VzW2ldO1xyXG4gICAgICAgICAgICAgICAgaWYgKHNlbGVjdGVkSW5kZXggPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKEpTT04uc3RyaW5naWZ5KGdhbWVTdGF0ZS5wbGF5ZXJDYXJkc1tzZWxlY3RlZEluZGV4XSkgIT09IEpTT04uc3RyaW5naWZ5KHByZXZpb3VzR2FtZVN0YXRlPy5wbGF5ZXJDYXJkc1tzZWxlY3RlZEluZGV4XSkpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgZm91bmQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGdhbWVTdGF0ZS5wbGF5ZXJDYXJkcy5sZW5ndGg7ICsraikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoSlNPTi5zdHJpbmdpZnkoZ2FtZVN0YXRlLnBsYXllckNhcmRzW2pdKSA9PT0gSlNPTi5zdHJpbmdpZnkocHJldmlvdXNHYW1lU3RhdGU/LnBsYXllckNhcmRzW3NlbGVjdGVkSW5kZXhdKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWRJbmRpY2VzW2ldID0gajtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvdW5kID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoIWZvdW5kKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkSW5kaWNlcy5zcGxpY2UoaSwgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC0taTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIGJpbmFyeSBzZWFyY2ggc3RpbGwgbmVlZHMgdG8gd29ya1xyXG4gICAgICAgICAgICBzZWxlY3RlZEluZGljZXMuc29ydCgoYSwgYikgPT4gYSAtIGIpO1xyXG5cclxuICAgICAgICAgICAgLy8gaW5pdGlhbGl6ZSBhbmltYXRpb24gc3RhdGVzXHJcbiAgICAgICAgICAgIGFzc29jaWF0ZUFuaW1hdGlvbnNXaXRoQ2FyZHMocHJldmlvdXNHYW1lU3RhdGUsIGdhbWVTdGF0ZSk7XHJcblxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgZ2FtZVN0YXRlLnBsYXllckNhcmRzOiAke0pTT04uc3RyaW5naWZ5KGdhbWVTdGF0ZS5wbGF5ZXJDYXJkcyl9YCk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBnYW1lU3RhdGUucGxheWVyU2hhcmVDb3VudCA9ICR7Z2FtZVN0YXRlLnBsYXllclNoYXJlQ291bnR9YCk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBnYW1lU3RhdGUucGxheWVyUmV2ZWFsQ291bnQgPSAke2dhbWVTdGF0ZS5wbGF5ZXJSZXZlYWxDb3VudH1gKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coYHNlbGVjdGVkSW5kaWNlczogJHtKU09OLnN0cmluZ2lmeShzZWxlY3RlZEluZGljZXMpfWApO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgc2VsZWN0ZWRDYXJkczogJHtKU09OLnN0cmluZ2lmeShzZWxlY3RlZEluZGljZXMubWFwKGkgPT4gZ2FtZVN0YXRlPy5wbGF5ZXJDYXJkc1tpXSkpfWApO1xyXG4gICAgICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgICAgIHVubG9jaygpO1xyXG4gICAgICAgIH1cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKEpTT04uc3RyaW5naWZ5KGUuZGF0YSkpO1xyXG4gICAgfVxyXG59O1xyXG5cclxubGV0IG9uQW5pbWF0aW9uc0Fzc29jaWF0ZWQgPSAoKSA9PiB7fTtcclxuXHJcbmZ1bmN0aW9uIGFzc29jaWF0ZUFuaW1hdGlvbnNXaXRoQ2FyZHMocHJldmlvdXNHYW1lU3RhdGU6IExpYi5HYW1lU3RhdGUgfCB1bmRlZmluZWQsIGdhbWVTdGF0ZTogTGliLkdhbWVTdGF0ZSkge1xyXG4gICAgY29uc3QgcHJldmlvdXNEZWNrU3ByaXRlcyA9IGRlY2tTcHJpdGVzO1xyXG4gICAgY29uc3QgcHJldmlvdXNCYWNrU3ByaXRlc0ZvclBsYXllciA9IGJhY2tTcHJpdGVzRm9yUGxheWVyO1xyXG4gICAgY29uc3QgcHJldmlvdXNGYWNlU3ByaXRlc0ZvclBsYXllciA9IGZhY2VTcHJpdGVzRm9yUGxheWVyO1xyXG5cclxuICAgIGJhY2tTcHJpdGVzRm9yUGxheWVyID0gW107XHJcbiAgICBmYWNlU3ByaXRlc0ZvclBsYXllciA9IFtdO1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCA0OyArK2kpIHtcclxuICAgICAgICBjb25zdCBwcmV2aW91c0JhY2tTcHJpdGVzID0gcHJldmlvdXNCYWNrU3ByaXRlc0ZvclBsYXllcltpXSA/PyBbXTtcclxuICAgICAgICBwcmV2aW91c0JhY2tTcHJpdGVzRm9yUGxheWVyW2ldID0gcHJldmlvdXNCYWNrU3ByaXRlcztcclxuXHJcbiAgICAgICAgY29uc3QgcHJldmlvdXNGYWNlU3ByaXRlcyA9IHByZXZpb3VzRmFjZVNwcml0ZXNGb3JQbGF5ZXJbaV0gPz8gW107XHJcbiAgICAgICAgcHJldmlvdXNGYWNlU3ByaXRlc0ZvclBsYXllcltpXSA9IHByZXZpb3VzRmFjZVNwcml0ZXM7XHJcblxyXG4gICAgICAgIGxldCBwcmV2aW91c0ZhY2VDYXJkczogTGliLkNhcmRbXTtcclxuICAgICAgICBsZXQgZmFjZUNhcmRzOiBMaWIuQ2FyZFtdO1xyXG4gICAgICAgIGlmIChpID09PSBnYW1lU3RhdGUucGxheWVySW5kZXgpIHtcclxuICAgICAgICAgICAgcHJldmlvdXNGYWNlQ2FyZHMgPSBwcmV2aW91c0dhbWVTdGF0ZT8ucGxheWVyQ2FyZHMgPz8gW107XHJcbiAgICAgICAgICAgIGZhY2VDYXJkcyA9IGdhbWVTdGF0ZS5wbGF5ZXJDYXJkcztcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBwcmV2aW91c0ZhY2VDYXJkcyA9IHByZXZpb3VzR2FtZVN0YXRlPy5vdGhlclBsYXllcnNbaV0/LnJldmVhbGVkQ2FyZHMgPz8gW107XHJcbiAgICAgICAgICAgIGZhY2VDYXJkcyA9IGdhbWVTdGF0ZS5vdGhlclBsYXllcnNbaV0/LnJldmVhbGVkQ2FyZHMgPz8gW107XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgZmFjZVNwcml0ZXM6IFNwcml0ZVtdID0gW107XHJcbiAgICAgICAgZmFjZVNwcml0ZXNGb3JQbGF5ZXJbaV0gPSBmYWNlU3ByaXRlcztcclxuICAgICAgICBmb3IgKGNvbnN0IGZhY2VDYXJkIG9mIGZhY2VDYXJkcykge1xyXG4gICAgICAgICAgICBsZXQgZmFjZVNwcml0ZTogU3ByaXRlIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICBpZiAoZmFjZVNwcml0ZSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IHByZXZpb3VzRmFjZUNhcmRzLmxlbmd0aDsgKytqKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJldmlvdXNGYWNlQ2FyZCA9IHByZXZpb3VzRmFjZUNhcmRzW2pdO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChwcmV2aW91c0ZhY2VDYXJkID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChKU09OLnN0cmluZ2lmeShmYWNlQ2FyZCkgPT09IEpTT04uc3RyaW5naWZ5KHByZXZpb3VzRmFjZUNhcmQpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHByZXZpb3VzRmFjZUNhcmRzLnNwbGljZShqLCAxKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZmFjZVNwcml0ZSA9IHByZXZpb3VzRmFjZVNwcml0ZXMuc3BsaWNlKGosIDEpWzBdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZmFjZVNwcml0ZSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoZmFjZVNwcml0ZSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IDQ7ICsraikge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHByZXZpb3VzT3RoZXJQbGF5ZXIgPSBwcmV2aW91c0dhbWVTdGF0ZT8ub3RoZXJQbGF5ZXJzW2pdO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG90aGVyUGxheWVyID0gZ2FtZVN0YXRlLm90aGVyUGxheWVyc1tqXTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAocHJldmlvdXNPdGhlclBsYXllciA9PT0gdW5kZWZpbmVkIHx8IHByZXZpb3VzT3RoZXJQbGF5ZXIgPT09IG51bGwgfHxcclxuICAgICAgICAgICAgICAgICAgICAgICAgb3RoZXJQbGF5ZXIgPT09IHVuZGVmaW5lZCB8fCBvdGhlclBsYXllciA9PT0gbnVsbFxyXG4gICAgICAgICAgICAgICAgICAgICkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChwcmV2aW91c090aGVyUGxheWVyLnNoYXJlQ291bnQgPiBvdGhlclBsYXllci5zaGFyZUNvdW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGsgPSAwOyBrIDwgcHJldmlvdXNPdGhlclBsYXllci5zaGFyZUNvdW50OyArK2spIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChKU09OLnN0cmluZ2lmeShmYWNlQ2FyZCkgPT09IEpTT04uc3RyaW5naWZ5KHByZXZpb3VzT3RoZXJQbGF5ZXIucmV2ZWFsZWRDYXJkc1trXSkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAtLXByZXZpb3VzT3RoZXJQbGF5ZXIuc2hhcmVDb3VudDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcmV2aW91c090aGVyUGxheWVyLnJldmVhbGVkQ2FyZHMuc3BsaWNlKGssIDEpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmYWNlU3ByaXRlID0gcHJldmlvdXNGYWNlU3ByaXRlc0ZvclBsYXllcltqXT8uc3BsaWNlKGssIDEpWzBdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmYWNlU3ByaXRlID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNvdXJjZVRyYW5zZm9ybSA9IFZQLmdldFRyYW5zZm9ybUZvclBsYXllcihWUC5nZXRSZWxhdGl2ZVBsYXllckluZGV4KGosIGdhbWVTdGF0ZS5wbGF5ZXJJbmRleCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRlc3RpbmF0aW9uVHJhbnNmb3JtID0gVlAuZ2V0VHJhbnNmb3JtRm9yUGxheWVyKFZQLmdldFJlbGF0aXZlUGxheWVySW5kZXgoaSwgZ2FtZVN0YXRlLnBsYXllckluZGV4KSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzdGluYXRpb25UcmFuc2Zvcm0uaW52ZXJ0U2VsZigpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgcCA9IHNvdXJjZVRyYW5zZm9ybS50cmFuc2Zvcm1Qb2ludChmYWNlU3ByaXRlLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwID0gZGVzdGluYXRpb25UcmFuc2Zvcm0udHJhbnNmb3JtUG9pbnQocCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmFjZVNwcml0ZS5wb3NpdGlvbiA9IG5ldyBWZWN0b3IocC54LCBwLnkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoZmFjZVNwcml0ZSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGZhY2VTcHJpdGUgPT09IHVuZGVmaW5lZCAmJiBwcmV2aW91c0JhY2tTcHJpdGVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgIC8vIG1ha2UgaXQgbG9vayBsaWtlIHRoaXMgY2FyZCB3YXMgcmV2ZWFsZWQgYW1vbmcgcHJldmlvdXNseSBoaWRkZW4gY2FyZHNcclxuICAgICAgICAgICAgICAgIC8vIHdoaWNoLCBvZiBjb3Vyc2UsIHJlcXVpcmVzIHRoYXQgdGhlIHBsYXllciBoYWQgcHJldmlvdXNseSBoaWRkZW4gY2FyZHNcclxuICAgICAgICAgICAgICAgIGZhY2VTcHJpdGUgPSBwcmV2aW91c0JhY2tTcHJpdGVzLnNwbGljZSgwLCAxKVswXTtcclxuICAgICAgICAgICAgICAgIGlmIChmYWNlU3ByaXRlID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG4gICAgICAgICAgICAgICAgZmFjZVNwcml0ZS5pbWFnZSA9IENhcmRJbWFnZXMuZ2V0KEpTT04uc3RyaW5naWZ5KGZhY2VDYXJkKSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChmYWNlU3ByaXRlID09PSB1bmRlZmluZWQgJiYgcHJldmlvdXNEZWNrU3ByaXRlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBtYWtlIGl0IGxvb2sgbGlrZSB0aGlzIGNhcmQgY2FtZSBmcm9tIHRoZSBkZWNrO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZmFjZVNwcml0ZSA9IHByZXZpb3VzRGVja1Nwcml0ZXMuc3BsaWNlKHByZXZpb3VzRGVja1Nwcml0ZXMubGVuZ3RoIC0gMSwgMSlbMF07XHJcbiAgICAgICAgICAgICAgICBpZiAoZmFjZVNwcml0ZSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICAgICAgICAgICAgICAgIGZhY2VTcHJpdGUuaW1hZ2UgPSBDYXJkSW1hZ2VzLmdldChKU09OLnN0cmluZ2lmeShmYWNlQ2FyZCkpO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIHRoaXMgc3ByaXRlIGlzIHJlbmRlcmVkIGluIHRoZSBwbGF5ZXIncyB0cmFuc2Zvcm1lZCBjYW52YXMgY29udGV4dFxyXG4gICAgICAgICAgICAgICAgY29uc3QgdHJhbnNmb3JtID0gVlAuZ2V0VHJhbnNmb3JtRm9yUGxheWVyKFZQLmdldFJlbGF0aXZlUGxheWVySW5kZXgoaSwgZ2FtZVN0YXRlLnBsYXllckluZGV4KSk7XHJcbiAgICAgICAgICAgICAgICB0cmFuc2Zvcm0uaW52ZXJ0U2VsZigpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcG9pbnQgPSB0cmFuc2Zvcm0udHJhbnNmb3JtUG9pbnQoZmFjZVNwcml0ZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICBmYWNlU3ByaXRlLnBvc2l0aW9uID0gbmV3IFZlY3Rvcihwb2ludC54LCBwb2ludC55KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGZhY2VTcHJpdGUgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgZmFjZVNwcml0ZSA9IG5ldyBTcHJpdGUoQ2FyZEltYWdlcy5nZXQoSlNPTi5zdHJpbmdpZnkoZmFjZUNhcmQpKSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGZhY2VTcHJpdGVzLnB1c2goZmFjZVNwcml0ZSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgNDsgKytpKSB7XHJcbiAgICAgICAgY29uc3QgcHJldmlvdXNCYWNrU3ByaXRlcyA9IHByZXZpb3VzQmFja1Nwcml0ZXNGb3JQbGF5ZXJbaV0gPz8gW107XHJcbiAgICAgICAgcHJldmlvdXNCYWNrU3ByaXRlc0ZvclBsYXllcltpXSA9IHByZXZpb3VzQmFja1Nwcml0ZXM7XHJcblxyXG4gICAgICAgIGNvbnN0IHByZXZpb3VzRmFjZVNwcml0ZXMgPSBwcmV2aW91c0ZhY2VTcHJpdGVzRm9yUGxheWVyW2ldID8/IFtdO1xyXG4gICAgICAgIHByZXZpb3VzRmFjZVNwcml0ZXNGb3JQbGF5ZXJbaV0gPSBwcmV2aW91c0ZhY2VTcHJpdGVzO1xyXG5cclxuICAgICAgICBsZXQgYmFja1Nwcml0ZXM6IFNwcml0ZVtdID0gW107XHJcbiAgICAgICAgYmFja1Nwcml0ZXNGb3JQbGF5ZXJbaV0gPSBiYWNrU3ByaXRlcztcclxuICAgICAgICBjb25zdCBvdGhlclBsYXllciA9IGdhbWVTdGF0ZS5vdGhlclBsYXllcnNbaV07XHJcbiAgICAgICAgaWYgKGkgIT09IGdhbWVTdGF0ZS5wbGF5ZXJJbmRleCAmJiBvdGhlclBsYXllciAhPT0gbnVsbCAmJiBvdGhlclBsYXllciAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIC8vIG9ubHkgb3RoZXIgcGxheWVycyBoYXZlIGFueSBoaWRkZW4gY2FyZHNcclxuICAgICAgICAgICAgd2hpbGUgKGJhY2tTcHJpdGVzLmxlbmd0aCA8IG90aGVyUGxheWVyLmNhcmRDb3VudCAtIG90aGVyUGxheWVyLnJldmVhbGVkQ2FyZHMubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgYmFja1Nwcml0ZTogU3ByaXRlIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICAgICAgaWYgKGJhY2tTcHJpdGUgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgNDsgKytqKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHByZXZpb3VzT3RoZXJQbGF5ZXIgPSBwcmV2aW91c0dhbWVTdGF0ZT8ub3RoZXJQbGF5ZXJzW2pdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBvdGhlclBsYXllciA9IGdhbWVTdGF0ZS5vdGhlclBsYXllcnNbal07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwcmV2aW91c090aGVyUGxheWVyID09PSB1bmRlZmluZWQgfHwgcHJldmlvdXNPdGhlclBsYXllciA9PT0gbnVsbCB8fFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3RoZXJQbGF5ZXIgPT09IHVuZGVmaW5lZCB8fCBvdGhlclBsYXllciA9PT0gbnVsbFxyXG4gICAgICAgICAgICAgICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJldmlvdXNPdGhlclBsYXllci5zaGFyZUNvdW50ID4gb3RoZXJQbGF5ZXIuc2hhcmVDb3VudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJldmlvdXNPdGhlclBsYXllci5zaGFyZUNvdW50LS07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcmV2aW91c090aGVyUGxheWVyLnJldmVhbGVkQ2FyZHMuc3BsaWNlKDAsIDEpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJhY2tTcHJpdGUgPSBwcmV2aW91c0ZhY2VTcHJpdGVzRm9yUGxheWVyW2pdPy5zcGxpY2UoMCwgMSlbMF07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYmFja1Nwcml0ZSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJhY2tTcHJpdGUuaW1hZ2UgPSBDYXJkSW1hZ2VzLmdldChgQmFjayR7aX1gKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzb3VyY2VUcmFuc2Zvcm0gPSBWUC5nZXRUcmFuc2Zvcm1Gb3JQbGF5ZXIoVlAuZ2V0UmVsYXRpdmVQbGF5ZXJJbmRleChqLCBnYW1lU3RhdGUucGxheWVySW5kZXgpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRlc3RpbmF0aW9uVHJhbnNmb3JtID0gVlAuZ2V0VHJhbnNmb3JtRm9yUGxheWVyKFZQLmdldFJlbGF0aXZlUGxheWVySW5kZXgoaSwgZ2FtZVN0YXRlLnBsYXllckluZGV4KSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBwID0gc291cmNlVHJhbnNmb3JtLnRyYW5zZm9ybVBvaW50KGJhY2tTcHJpdGUucG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcCA9IGRlc3RpbmF0aW9uVHJhbnNmb3JtLnRyYW5zZm9ybVBvaW50KHApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYmFja1Nwcml0ZS5wb3NpdGlvbiA9IG5ldyBWZWN0b3IocC54LCBwLnkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGJhY2tTcHJpdGUgPT09IHVuZGVmaW5lZCAmJiBwcmV2aW91c0JhY2tTcHJpdGVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBiYWNrU3ByaXRlID0gcHJldmlvdXNCYWNrU3ByaXRlcy5zcGxpY2UoMCwgMSlbMF07XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGJhY2tTcHJpdGUgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGlmIChiYWNrU3ByaXRlID09PSB1bmRlZmluZWQgJiYgcHJldmlvdXNGYWNlU3ByaXRlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYmFja1Nwcml0ZSA9IHByZXZpb3VzRmFjZVNwcml0ZXMuc3BsaWNlKDAsIDEpWzBdO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChiYWNrU3ByaXRlID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJhY2tTcHJpdGUuaW1hZ2UgPSBDYXJkSW1hZ2VzLmdldChgQmFjayR7aX1gKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgaWYgKGJhY2tTcHJpdGUgPT09IHVuZGVmaW5lZCAmJiBwcmV2aW91c0RlY2tTcHJpdGVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBiYWNrU3ByaXRlID0gcHJldmlvdXNEZWNrU3ByaXRlcy5zcGxpY2UocHJldmlvdXNEZWNrU3ByaXRlcy5sZW5ndGggLSAxLCAxKVswXTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoYmFja1Nwcml0ZSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICAgICAgICAgICAgICAgICAgICBiYWNrU3ByaXRlLmltYWdlID0gQ2FyZEltYWdlcy5nZXQoYEJhY2ske2l9YCk7XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gdGhpcyBzcHJpdGUgY29tZXMgZnJvbSB0aGUgZGVjaywgd2hpY2ggaXMgcmVuZGVyZWQgaW4gdGhlIGNsaWVudCBwbGF5ZXIncyB0cmFuc2Zvcm1cclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0cmFuc2Zvcm0gPSBWUC5nZXRUcmFuc2Zvcm1Gb3JQbGF5ZXIoVlAuZ2V0UmVsYXRpdmVQbGF5ZXJJbmRleChpLCBnYW1lU3RhdGUucGxheWVySW5kZXgpKTtcclxuICAgICAgICAgICAgICAgICAgICB0cmFuc2Zvcm0uaW52ZXJ0U2VsZigpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBvaW50ID0gdHJhbnNmb3JtLnRyYW5zZm9ybVBvaW50KGJhY2tTcHJpdGUucG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgIGJhY2tTcHJpdGUucG9zaXRpb24gPSBuZXcgVmVjdG9yKHBvaW50LngsIHBvaW50LnkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBpZiAoYmFja1Nwcml0ZSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYmFja1Nwcml0ZSA9IG5ldyBTcHJpdGUoQ2FyZEltYWdlcy5nZXQoYEJhY2ske2l9YCkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGJhY2tTcHJpdGVzLnB1c2goYmFja1Nwcml0ZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZGVja1Nwcml0ZXMgPSBbXTtcclxuICAgIHdoaWxlIChkZWNrU3ByaXRlcy5sZW5ndGggPCBnYW1lU3RhdGUuZGVja0NvdW50KSB7XHJcbiAgICAgICAgbGV0IGRlY2tTcHJpdGU6IFNwcml0ZSB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcclxuICAgICAgICBpZiAoZGVja1Nwcml0ZSA9PSB1bmRlZmluZWQgJiYgcHJldmlvdXNEZWNrU3ByaXRlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIGRlY2tTcHJpdGUgPSBwcmV2aW91c0RlY2tTcHJpdGVzLnNwbGljZSgwLCAxKVswXTtcclxuICAgICAgICAgICAgaWYgKGRlY2tTcHJpdGUgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoZGVja1Nwcml0ZSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIGxldCBpID0gMDtcclxuICAgICAgICAgICAgZm9yIChjb25zdCBwcmV2aW91c0JhY2tTcHJpdGVzIG9mIHByZXZpb3VzQmFja1Nwcml0ZXNGb3JQbGF5ZXIpIHtcclxuICAgICAgICAgICAgICAgIGlmIChwcmV2aW91c0JhY2tTcHJpdGVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBkZWNrU3ByaXRlID0gcHJldmlvdXNCYWNrU3ByaXRlcy5zcGxpY2UoMCwgMSlbMF07XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRlY2tTcHJpdGUgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVja1Nwcml0ZS5pbWFnZSA9IENhcmRJbWFnZXMuZ2V0KCdCYWNrNCcpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLyB0aGUgc3ByaXRlIGNhbWUgZnJvbSB0aGUgcGxheWVyJ3MgdHJhbnNmb3JtZWQgY2FudmFzIGNvbnRleHRcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0cmFuc2Zvcm0gPSBWUC5nZXRUcmFuc2Zvcm1Gb3JQbGF5ZXIoVlAuZ2V0UmVsYXRpdmVQbGF5ZXJJbmRleChpLCBnYW1lU3RhdGUucGxheWVySW5kZXgpKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBwb2ludCA9IHRyYW5zZm9ybS50cmFuc2Zvcm1Qb2ludChkZWNrU3ByaXRlLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICBkZWNrU3ByaXRlLnBvc2l0aW9uID0gbmV3IFZlY3Rvcihwb2ludC54LCBwb2ludC55KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgKytpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoZGVja1Nwcml0ZSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIGxldCBpID0gMDtcclxuICAgICAgICAgICAgZm9yIChjb25zdCBwcmV2aW91c0ZhY2VTcHJpdGVzIG9mIHByZXZpb3VzRmFjZVNwcml0ZXNGb3JQbGF5ZXIpIHtcclxuICAgICAgICAgICAgICAgIGlmIChwcmV2aW91c0ZhY2VTcHJpdGVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBkZWNrU3ByaXRlID0gcHJldmlvdXNGYWNlU3ByaXRlcy5zcGxpY2UoMCwgMSlbMF07XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRlY2tTcHJpdGUgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVja1Nwcml0ZS5pbWFnZSA9IENhcmRJbWFnZXMuZ2V0KCdCYWNrNCcpO1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIHRoZSBzcHJpdGUgY2FtZSBmcm9tIHRoZSBwbGF5ZXIncyB0cmFuc2Zvcm1lZCBjYW52YXMgY29udGV4dFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRyYW5zZm9ybSA9IFZQLmdldFRyYW5zZm9ybUZvclBsYXllcihWUC5nZXRSZWxhdGl2ZVBsYXllckluZGV4KGksIGdhbWVTdGF0ZS5wbGF5ZXJJbmRleCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBvaW50ID0gdHJhbnNmb3JtLnRyYW5zZm9ybVBvaW50KGRlY2tTcHJpdGUucG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgIGRlY2tTcHJpdGUucG9zaXRpb24gPSBuZXcgVmVjdG9yKHBvaW50LngsIHBvaW50LnkpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICArK2k7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChkZWNrU3ByaXRlID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgZGVja1Nwcml0ZSA9IG5ldyBTcHJpdGUoQ2FyZEltYWdlcy5nZXQoJ0JhY2s0JykpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZGVja1Nwcml0ZXMucHVzaChkZWNrU3ByaXRlKTtcclxuICAgIH1cclxuXHJcbiAgICBzZXRTcHJpdGVUYXJnZXRzKGdhbWVTdGF0ZSk7XHJcblxyXG4gICAgb25BbmltYXRpb25zQXNzb2NpYXRlZCgpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc2V0U3ByaXRlVGFyZ2V0cyhcclxuICAgIGdhbWVTdGF0ZTogTGliLkdhbWVTdGF0ZSxcclxuICAgIHJlc2VydmVkU3ByaXRlc0FuZENhcmRzPzogW1Nwcml0ZSwgTGliLkNhcmRdW10sXHJcbiAgICBtb3ZpbmdTcHJpdGVzQW5kQ2FyZHM/OiBbU3ByaXRlLCBMaWIuQ2FyZF1bXSxcclxuICAgIHNoYXJlQ291bnQ/OiBudW1iZXIsXHJcbiAgICByZXZlYWxDb3VudD86IG51bWJlcixcclxuICAgIHNwbGl0SW5kZXg/OiBudW1iZXIsXHJcbiAgICByZXR1cm5Ub0RlY2s/OiBib29sZWFuXHJcbikge1xyXG4gICAgY29uc3Qgc3ByaXRlcyA9IGZhY2VTcHJpdGVzRm9yUGxheWVyW2dhbWVTdGF0ZS5wbGF5ZXJJbmRleF07XHJcbiAgICBpZiAoc3ByaXRlcyA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuXHJcbiAgICBjb25zdCBjYXJkcyA9IGdhbWVTdGF0ZS5wbGF5ZXJDYXJkcztcclxuXHJcbiAgICByZXNlcnZlZFNwcml0ZXNBbmRDYXJkcyA9IHJlc2VydmVkU3ByaXRlc0FuZENhcmRzID8/IGNhcmRzLm1hcCgoY2FyZCwgaW5kZXgpID0+IDxbU3ByaXRlLCBMaWIuQ2FyZF0+W3Nwcml0ZXNbaW5kZXhdLCBjYXJkXSk7XHJcbiAgICBtb3ZpbmdTcHJpdGVzQW5kQ2FyZHMgPSBtb3ZpbmdTcHJpdGVzQW5kQ2FyZHMgPz8gW107XHJcbiAgICBzaGFyZUNvdW50ID0gc2hhcmVDb3VudCA/PyBnYW1lU3RhdGUucGxheWVyU2hhcmVDb3VudDtcclxuICAgIHJldmVhbENvdW50ID0gcmV2ZWFsQ291bnQgPz8gZ2FtZVN0YXRlLnBsYXllclJldmVhbENvdW50O1xyXG4gICAgc3BsaXRJbmRleCA9IHNwbGl0SW5kZXggPz8gY2FyZHMubGVuZ3RoO1xyXG4gICAgcmV0dXJuVG9EZWNrID0gcmV0dXJuVG9EZWNrID8/IGZhbHNlO1xyXG5cclxuICAgIC8vIGNsZWFyIGZvciByZWluc2VydGlvblxyXG4gICAgc3ByaXRlcy5zcGxpY2UoMCwgc3ByaXRlcy5sZW5ndGgpO1xyXG4gICAgY2FyZHMuc3BsaWNlKDAsIGNhcmRzLmxlbmd0aCk7XHJcblxyXG4gICAgZm9yIChjb25zdCBbcmVzZXJ2ZWRTcHJpdGUsIHJlc2VydmVkQ2FyZF0gb2YgcmVzZXJ2ZWRTcHJpdGVzQW5kQ2FyZHMpIHtcclxuICAgICAgICBpZiAoY2FyZHMubGVuZ3RoID09PSBzcGxpdEluZGV4KSB7XHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgW21vdmluZ1Nwcml0ZSwgbW92aW5nQ2FyZF0gb2YgbW92aW5nU3ByaXRlc0FuZENhcmRzKSB7XHJcbiAgICAgICAgICAgICAgICBzcHJpdGVzLnB1c2gobW92aW5nU3ByaXRlKTtcclxuICAgICAgICAgICAgICAgIGNhcmRzLnB1c2gobW92aW5nQ2FyZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChjYXJkcy5sZW5ndGggPCBzaGFyZUNvdW50KSB7XHJcbiAgICAgICAgICAgIHJlc2VydmVkU3ByaXRlLnRhcmdldCA9IG5ldyBWZWN0b3IoXHJcbiAgICAgICAgICAgICAgICBWUC5jYW52YXMud2lkdGggLyAyIC0gVlAuc3ByaXRlV2lkdGggLSBzaGFyZUNvdW50ICogVlAuc3ByaXRlR2FwICsgY2FyZHMubGVuZ3RoICogVlAuc3ByaXRlR2FwLFxyXG4gICAgICAgICAgICAgICAgVlAuY2FudmFzLmhlaWdodCAtIDIgKiBWUC5zcHJpdGVIZWlnaHQgLSBWUC5zcHJpdGVHYXBcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICB9IGVsc2UgaWYgKGNhcmRzLmxlbmd0aCA8IHJldmVhbENvdW50KSB7XHJcbiAgICAgICAgICAgIHJlc2VydmVkU3ByaXRlLnRhcmdldCA9IG5ldyBWZWN0b3IoXHJcbiAgICAgICAgICAgICAgICBWUC5jYW52YXMud2lkdGggLyAyICsgKGNhcmRzLmxlbmd0aCAtIHNoYXJlQ291bnQpICogVlAuc3ByaXRlR2FwLFxyXG4gICAgICAgICAgICAgICAgVlAuY2FudmFzLmhlaWdodCAtIDIgKiBWUC5zcHJpdGVIZWlnaHRcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBsZXQgY291bnQgPSByZXNlcnZlZFNwcml0ZXNBbmRDYXJkcy5sZW5ndGggLSByZXZlYWxDb3VudDtcclxuICAgICAgICAgICAgaWYgKCFyZXR1cm5Ub0RlY2spIHtcclxuICAgICAgICAgICAgICAgIGNvdW50ICs9IG1vdmluZ1Nwcml0ZXNBbmRDYXJkcy5sZW5ndGg7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJlc2VydmVkU3ByaXRlLnRhcmdldCA9IG5ldyBWZWN0b3IoXHJcbiAgICAgICAgICAgICAgICBWUC5jYW52YXMud2lkdGggLyAyIC0gVlAuc3ByaXRlV2lkdGggLyAyICsgKGNhcmRzLmxlbmd0aCAtIHJldmVhbENvdW50IC0gKGNvdW50IC0gMSkgLyAyKSAqIFZQLnNwcml0ZUdhcCxcclxuICAgICAgICAgICAgICAgIFZQLmNhbnZhcy5oZWlnaHQgLSBWUC5zcHJpdGVIZWlnaHRcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgc3ByaXRlcy5wdXNoKHJlc2VydmVkU3ByaXRlKTtcclxuICAgICAgICBjYXJkcy5wdXNoKHJlc2VydmVkQ2FyZCk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGNhcmRzLmxlbmd0aCA9PT0gc3BsaXRJbmRleCkge1xyXG4gICAgICAgIGZvciAoY29uc3QgW21vdmluZ1Nwcml0ZSwgbW92aW5nQ2FyZF0gb2YgbW92aW5nU3ByaXRlc0FuZENhcmRzKSB7XHJcbiAgICAgICAgICAgIHNwcml0ZXMucHVzaChtb3ZpbmdTcHJpdGUpO1xyXG4gICAgICAgICAgICBjYXJkcy5wdXNoKG1vdmluZ0NhcmQpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBnYW1lU3RhdGUucGxheWVyU2hhcmVDb3VudCA9IHNoYXJlQ291bnQ7XHJcbiAgICBnYW1lU3RhdGUucGxheWVyUmV2ZWFsQ291bnQgPSByZXZlYWxDb3VudDtcclxufVxyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGpvaW5HYW1lKGdhbWVJZDogc3RyaW5nLCBwbGF5ZXJOYW1lOiBzdHJpbmcpIHtcclxuICAgIC8vIHdhaXQgZm9yIGNvbm5lY3Rpb25cclxuICAgIGRvIHtcclxuICAgICAgICBhd2FpdCBMaWIuZGVsYXkoMTAwMCk7XHJcbiAgICAgICAgY29uc29sZS5sb2coYHdzLnJlYWR5U3RhdGU6ICR7d3MucmVhZHlTdGF0ZX0sIFdlYlNvY2tldC5PUEVOOiAke1dlYlNvY2tldC5PUEVOfWApO1xyXG4gICAgfSB3aGlsZSAod3MucmVhZHlTdGF0ZSAhPSBXZWJTb2NrZXQuT1BFTik7XHJcblxyXG4gICAgLy8gdHJ5IHRvIGpvaW4gdGhlIGdhbWVcclxuICAgIGF3YWl0IG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICBhZGRDYWxsYmFjaygnam9pbkdhbWUnLCByZXNvbHZlLCByZWplY3QpO1xyXG4gICAgICAgIHdzLnNlbmQoSlNPTi5zdHJpbmdpZnkoPExpYi5Kb2luR2FtZU1lc3NhZ2U+eyBnYW1lSWQsIHBsYXllck5hbWUgfSkpO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB0YWtlQ2FyZChvdGhlclBsYXllckluZGV4OiBudW1iZXIsIGNhcmRJbmRleDogbnVtYmVyLCBjYXJkOiBMaWIuQ2FyZCkge1xyXG4gICAgY29uc3QgYW5pbWF0aW9uc0Fzc29jaWF0ZWQgPSBuZXcgUHJvbWlzZTx2b2lkPihyZXNvbHZlID0+IHtcclxuICAgICAgICBvbkFuaW1hdGlvbnNBc3NvY2lhdGVkID0gKCkgPT4ge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgYXNzb2NpYXRlZCBhbmltYXRpb25zYCk7XHJcbiAgICAgICAgICAgIG9uQW5pbWF0aW9uc0Fzc29jaWF0ZWQgPSAoKSA9PiB7fTtcclxuICAgICAgICAgICAgcmVzb2x2ZSgpO1xyXG4gICAgICAgIH07XHJcbiAgICB9KTtcclxuXHJcbiAgICBhd2FpdCBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgYWRkQ2FsbGJhY2soJ3Rha2VDYXJkJywgcmVzb2x2ZSwgcmVqZWN0KTtcclxuICAgICAgICB3cy5zZW5kKEpTT04uc3RyaW5naWZ5KDxMaWIuVGFrZUNhcmRNZXNzYWdlPntcclxuICAgICAgICAgICAgb3RoZXJQbGF5ZXJJbmRleCxcclxuICAgICAgICAgICAgY2FyZEluZGV4LFxyXG4gICAgICAgICAgICBjYXJkXHJcbiAgICAgICAgfSkpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgYXdhaXQgYW5pbWF0aW9uc0Fzc29jaWF0ZWQ7XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkcmF3Q2FyZCgpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGNvbnN0IGFuaW1hdGlvbnNBc3NvY2lhdGVkID0gbmV3IFByb21pc2U8dm9pZD4ocmVzb2x2ZSA9PiB7XHJcbiAgICAgICAgb25BbmltYXRpb25zQXNzb2NpYXRlZCA9ICgpID0+IHtcclxuICAgICAgICAgICAgb25BbmltYXRpb25zQXNzb2NpYXRlZCA9ICgpID0+IHt9O1xyXG4gICAgICAgICAgICByZXNvbHZlKCk7XHJcbiAgICAgICAgfTtcclxuICAgIH0pO1xyXG5cclxuICAgIGF3YWl0IG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICBhZGRDYWxsYmFjaygnZHJhd0NhcmQnLCByZXNvbHZlLCByZWplY3QpO1xyXG4gICAgICAgIHdzLnNlbmQoSlNPTi5zdHJpbmdpZnkoPExpYi5EcmF3Q2FyZE1lc3NhZ2U+e1xyXG4gICAgICAgICAgICBkcmF3Q2FyZDogbnVsbFxyXG4gICAgICAgIH0pKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGF3YWl0IGFuaW1hdGlvbnNBc3NvY2lhdGVkO1xyXG59XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmV0dXJuQ2FyZHNUb0RlY2soZ2FtZVN0YXRlOiBMaWIuR2FtZVN0YXRlKSB7XHJcbiAgICBhd2FpdCBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgYWRkQ2FsbGJhY2soJ3JldHVybkNhcmRzVG9EZWNrJywgcmVzb2x2ZSwgcmVqZWN0KTtcclxuICAgICAgICB3cy5zZW5kKEpTT04uc3RyaW5naWZ5KDxMaWIuUmV0dXJuQ2FyZHNUb0RlY2tNZXNzYWdlPntcclxuICAgICAgICAgICAgY2FyZHNUb1JldHVyblRvRGVjazogc2VsZWN0ZWRJbmRpY2VzLm1hcChpID0+IGdhbWVTdGF0ZS5wbGF5ZXJDYXJkc1tpXSlcclxuICAgICAgICB9KSk7XHJcbiAgICB9KTtcclxuICAgIFxyXG4gICAgLy8gbWFrZSB0aGUgc2VsZWN0ZWQgY2FyZHMgZGlzYXBwZWFyXHJcbiAgICBzZWxlY3RlZEluZGljZXMuc3BsaWNlKDAsIHNlbGVjdGVkSW5kaWNlcy5sZW5ndGgpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmVvcmRlckNhcmRzKGdhbWVTdGF0ZTogTGliLkdhbWVTdGF0ZSkge1xyXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICBhZGRDYWxsYmFjaygncmVvcmRlckNhcmRzJywgcmVzb2x2ZSwgcmVqZWN0KTtcclxuICAgICAgICB3cy5zZW5kKEpTT04uc3RyaW5naWZ5KDxMaWIuUmVvcmRlckNhcmRzTWVzc2FnZT57XHJcbiAgICAgICAgICAgIHJlb3JkZXJlZENhcmRzOiBnYW1lU3RhdGUucGxheWVyQ2FyZHMsXHJcbiAgICAgICAgICAgIG5ld1NoYXJlQ291bnQ6IGdhbWVTdGF0ZS5wbGF5ZXJTaGFyZUNvdW50LFxyXG4gICAgICAgICAgICBuZXdSZXZlYWxDb3VudDogZ2FtZVN0YXRlLnBsYXllclJldmVhbENvdW50XHJcbiAgICAgICAgfSkpO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzb3J0QnlTdWl0KGdhbWVTdGF0ZTogTGliLkdhbWVTdGF0ZSkge1xyXG4gICAgbGV0IGNvbXBhcmVGbiA9IChbYVN1aXQsIGFSYW5rXTogTGliLkNhcmQsIFtiU3VpdCwgYlJhbmtdOiBMaWIuQ2FyZCkgPT4ge1xyXG4gICAgICAgIGlmIChhU3VpdCAhPT0gYlN1aXQpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGFTdWl0IC0gYlN1aXQ7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcmV0dXJuIGFSYW5rIC0gYlJhbms7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBwcmV2aW91c0dhbWVTdGF0ZSA9IDxMaWIuR2FtZVN0YXRlPkpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoZ2FtZVN0YXRlKSk7XHJcbiAgICBzb3J0Q2FyZHMoZ2FtZVN0YXRlLnBsYXllckNhcmRzLCAwLCBnYW1lU3RhdGUucGxheWVyU2hhcmVDb3VudCwgY29tcGFyZUZuKTtcclxuICAgIHNvcnRDYXJkcyhnYW1lU3RhdGUucGxheWVyQ2FyZHMsIGdhbWVTdGF0ZS5wbGF5ZXJTaGFyZUNvdW50LCBnYW1lU3RhdGUucGxheWVyUmV2ZWFsQ291bnQsIGNvbXBhcmVGbik7XHJcbiAgICBzb3J0Q2FyZHMoZ2FtZVN0YXRlLnBsYXllckNhcmRzLCBnYW1lU3RhdGUucGxheWVyUmV2ZWFsQ291bnQsIGdhbWVTdGF0ZS5wbGF5ZXJDYXJkcy5sZW5ndGgsIGNvbXBhcmVGbik7XHJcbiAgICBhc3NvY2lhdGVBbmltYXRpb25zV2l0aENhcmRzKGdhbWVTdGF0ZSwgcHJldmlvdXNHYW1lU3RhdGUpO1xyXG4gICAgcmV0dXJuIHJlb3JkZXJDYXJkcyhnYW1lU3RhdGUpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc29ydEJ5UmFuayhnYW1lU3RhdGU6IExpYi5HYW1lU3RhdGUpIHtcclxuICAgIGxldCBjb21wYXJlRm4gPSAoW2FTdWl0LCBhUmFua106IExpYi5DYXJkLCBbYlN1aXQsIGJSYW5rXTogTGliLkNhcmQpID0+IHtcclxuICAgICAgICBpZiAoYVJhbmsgIT09IGJSYW5rKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBhUmFuayAtIGJSYW5rO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHJldHVybiBhU3VpdCAtIGJTdWl0O1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgcHJldmlvdXNHYW1lU3RhdGUgPSA8TGliLkdhbWVTdGF0ZT5KU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGdhbWVTdGF0ZSkpO1xyXG4gICAgc29ydENhcmRzKGdhbWVTdGF0ZS5wbGF5ZXJDYXJkcywgMCwgZ2FtZVN0YXRlLnBsYXllclNoYXJlQ291bnQsIGNvbXBhcmVGbik7XHJcbiAgICBzb3J0Q2FyZHMoZ2FtZVN0YXRlLnBsYXllckNhcmRzLCBnYW1lU3RhdGUucGxheWVyU2hhcmVDb3VudCwgZ2FtZVN0YXRlLnBsYXllclJldmVhbENvdW50LCBjb21wYXJlRm4pO1xyXG4gICAgc29ydENhcmRzKGdhbWVTdGF0ZS5wbGF5ZXJDYXJkcywgZ2FtZVN0YXRlLnBsYXllclJldmVhbENvdW50LCBnYW1lU3RhdGUucGxheWVyQ2FyZHMubGVuZ3RoLCBjb21wYXJlRm4pO1xyXG4gICAgYXNzb2NpYXRlQW5pbWF0aW9uc1dpdGhDYXJkcyhnYW1lU3RhdGUsIHByZXZpb3VzR2FtZVN0YXRlKTtcclxuICAgIHJldHVybiByZW9yZGVyQ2FyZHMoZ2FtZVN0YXRlKTtcclxufVxyXG5cclxuZnVuY3Rpb24gc29ydENhcmRzKFxyXG4gICAgY2FyZHM6IExpYi5DYXJkW10sXHJcbiAgICBzdGFydDogbnVtYmVyLFxyXG4gICAgZW5kOiBudW1iZXIsXHJcbiAgICBjb21wYXJlRm46IChhOiBMaWIuQ2FyZCwgYjogTGliLkNhcmQpID0+IG51bWJlclxyXG4pIHtcclxuICAgIGNvbnN0IHNlY3Rpb24gPSBjYXJkcy5zbGljZShzdGFydCwgZW5kKTtcclxuICAgIHNlY3Rpb24uc29ydChjb21wYXJlRm4pO1xyXG4gICAgY2FyZHMuc3BsaWNlKHN0YXJ0LCBlbmQgLSBzdGFydCwgLi4uc2VjdGlvbik7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiB3YWl0KCkge1xyXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICBhZGRDYWxsYmFjaygnd2FpdCcsIHJlc29sdmUsIHJlamVjdCk7XHJcbiAgICAgICAgd3Muc2VuZChKU09OLnN0cmluZ2lmeSg8TGliLldhaXRNZXNzYWdlPntcclxuICAgICAgICAgICAgd2FpdDogbnVsbFxyXG4gICAgICAgIH0pKTtcclxuICAgIH0pO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcHJvY2VlZCgpIHtcclxuICAgIHJldHVybiBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgYWRkQ2FsbGJhY2soJ3Byb2NlZWQnLCByZXNvbHZlLCByZWplY3QpO1xyXG4gICAgICAgIHdzLnNlbmQoSlNPTi5zdHJpbmdpZnkoPExpYi5Qcm9jZWVkTWVzc2FnZT57XHJcbiAgICAgICAgICAgIHByb2NlZWQ6IG51bGxcclxuICAgICAgICB9KSk7XHJcbiAgICB9KTtcclxufSIsImV4cG9ydCBkZWZhdWx0IGNsYXNzIFZlY3RvciB7XHJcbiAgICByZWFkb25seSB4OiBudW1iZXIgPSAwO1xyXG4gICAgcmVhZG9ubHkgeTogbnVtYmVyID0gMDtcclxuXHJcbiAgICBjb25zdHJ1Y3Rvcih4OiBudW1iZXIsIHk6IG51bWJlcikge1xyXG4gICAgICAgIHRoaXMueCA9IHg7XHJcbiAgICAgICAgdGhpcy55ID0geTtcclxuICAgIH1cclxuXHJcbiAgICAvKlxyXG4gICAgYXNzaWduKHY6IFZlY3Rvcikge1xyXG4gICAgICAgIHRoaXMueCA9IHYueDtcclxuICAgICAgICB0aGlzLnkgPSB2Lnk7XHJcbiAgICB9XHJcbiAgICAqL1xyXG5cclxuICAgIGFkZCh2OiBWZWN0b3IpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlY3Rvcih0aGlzLnggKyB2LngsIHRoaXMueSArIHYueSk7XHJcbiAgICB9XHJcblxyXG4gICAgLypcclxuICAgIGFkZFNlbGYodjogVmVjdG9yKSB7XHJcbiAgICAgICAgdGhpcy54ICs9IHYueDtcclxuICAgICAgICB0aGlzLnkgKz0gdi55O1xyXG4gICAgfVxyXG4gICAgKi9cclxuICAgIFxyXG4gICAgc3ViKHY6IFZlY3Rvcikge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjdG9yKHRoaXMueCAtIHYueCwgdGhpcy55IC0gdi55KTtcclxuICAgIH1cclxuXHJcbiAgICAvKlxyXG4gICAgc3ViU2VsZih2OiBWZWN0b3IpIHtcclxuICAgICAgICB0aGlzLnggLT0gdi54O1xyXG4gICAgICAgIHRoaXMueSAtPSB2Lnk7XHJcbiAgICB9XHJcbiAgICAqL1xyXG4gICAgXHJcbiAgICBnZXQgbGVuZ3RoKCkge1xyXG4gICAgICAgIHJldHVybiBNYXRoLnNxcnQodGhpcy54ICogdGhpcy54ICsgdGhpcy55ICogdGhpcy55KTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgZGlzdGFuY2UodjogVmVjdG9yKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5zdWIodikubGVuZ3RoO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBzY2FsZShzOiBudW1iZXIpOiBWZWN0b3Ige1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjdG9yKHMgKiB0aGlzLngsIHMgKiB0aGlzLnkpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qXHJcbiAgICBzY2FsZVNlbGYoczogbnVtYmVyKSB7XHJcbiAgICAgICAgdGhpcy54ICo9IHM7XHJcbiAgICAgICAgdGhpcy55ICo9IHM7XHJcbiAgICB9XHJcbiAgICAqL1xyXG59IiwiaW1wb3J0IFZlY3RvciBmcm9tICcuL3ZlY3Rvcic7XHJcblxyXG5leHBvcnQgY29uc3QgY2FudmFzID0gPEhUTUxDYW52YXNFbGVtZW50PmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjYW52YXMnKTtcclxuZXhwb3J0IGNvbnN0IGNvbnRleHQgPSA8Q2FudmFzUmVuZGVyaW5nQ29udGV4dDJEPmNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xyXG5cclxuLy8gZ2V0IHBpeGVscyBwZXIgY2VudGltZXRlciwgd2hpY2ggaXMgY29uc3RhbnRcclxuY29uc3QgdGVzdEVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxudGVzdEVsZW1lbnQuc3R5bGUud2lkdGggPSAnMWNtJztcclxuZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh0ZXN0RWxlbWVudCk7XHJcbmV4cG9ydCBjb25zdCBwaXhlbHNQZXJDTSA9IHRlc3RFbGVtZW50Lm9mZnNldFdpZHRoO1xyXG5kb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKHRlc3RFbGVtZW50KTtcclxuXHJcbi8vIHRoZXNlIHBhcmFtZXRlcnMgY2hhbmdlIHdpdGggcmVzaXppbmdcclxuZXhwb3J0IGxldCBjYW52YXNSZWN0ID0gY2FudmFzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG5leHBvcnQgbGV0IHBpeGVsc1BlclBlcmNlbnQgPSAwO1xyXG5cclxuZXhwb3J0IGxldCBzcHJpdGVXaWR0aDogbnVtYmVyO1xyXG5leHBvcnQgbGV0IHNwcml0ZUhlaWdodDogbnVtYmVyO1xyXG5leHBvcnQgbGV0IHNwcml0ZUdhcDogbnVtYmVyO1xyXG5leHBvcnQgbGV0IHNwcml0ZURlY2tHYXA6IG51bWJlcjtcclxuXHJcbmV4cG9ydCBsZXQgc29ydEJ5UmFua0ZvbnQ6IHN0cmluZztcclxuZXhwb3J0IGxldCBzb3J0QnlSYW5rQm91bmRzOiBbVmVjdG9yLCBWZWN0b3JdO1xyXG5cclxuZXhwb3J0IGxldCBzb3J0QnlTdWl0Rm9udDogc3RyaW5nO1xyXG5leHBvcnQgbGV0IHNvcnRCeVN1aXRCb3VuZHM6IFtWZWN0b3IsIFZlY3Rvcl07XHJcblxyXG5leHBvcnQgbGV0IHdhaXRGb250OiBzdHJpbmc7XHJcbmV4cG9ydCBsZXQgd2FpdEJvdW5kczogW1ZlY3RvciwgVmVjdG9yXTtcclxuXHJcbmV4cG9ydCBsZXQgcHJvY2VlZEZvbnQ6IHN0cmluZztcclxuZXhwb3J0IGxldCBwcm9jZWVkQm91bmRzOiBbVmVjdG9yLCBWZWN0b3JdO1xyXG5cclxuZXhwb3J0IGxldCByZWFkeUZvbnQ6IHN0cmluZztcclxuZXhwb3J0IGxldCByZWFkeUJvdW5kczogW1ZlY3RvciwgVmVjdG9yXTtcclxuXHJcbmV4cG9ydCBsZXQgY291bnRkb3duRm9udDogc3RyaW5nO1xyXG5leHBvcnQgbGV0IGNvdW50ZG93bkJvdW5kczogW1ZlY3RvciwgVmVjdG9yXTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiByZWNhbGN1bGF0ZVBhcmFtZXRlcnMoKSB7XHJcbiAgICBjYW52YXMud2lkdGggPSB3aW5kb3cuaW5uZXJXaWR0aDtcclxuICAgIGNhbnZhcy5oZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQgLSAwLjUgKiBwaXhlbHNQZXJDTTtcclxuICAgIGNhbnZhc1JlY3QgPSBjYW52YXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcblxyXG4gICAgcGl4ZWxzUGVyUGVyY2VudCA9IGNhbnZhcy5oZWlnaHQgLyAxMDA7XHJcbiAgICBzcHJpdGVXaWR0aCA9IDEyICogcGl4ZWxzUGVyUGVyY2VudDtcclxuICAgIHNwcml0ZUhlaWdodCA9IDE4ICogcGl4ZWxzUGVyUGVyY2VudDtcclxuICAgIHNwcml0ZUdhcCA9IDIgKiBwaXhlbHNQZXJQZXJjZW50O1xyXG4gICAgc3ByaXRlRGVja0dhcCA9IDAuNSAqIHBpeGVsc1BlclBlcmNlbnQ7XHJcblxyXG4gICAgc29ydEJ5UmFua0JvdW5kcyA9IFtuZXcgVmVjdG9yKDAsIDApLCBuZXcgVmVjdG9yKDAsIDApXTtcclxuXHJcbiAgICBzb3J0QnlTdWl0Qm91bmRzID0gW25ldyBWZWN0b3IoMCwgMCksIG5ldyBWZWN0b3IoMCwgMCldO1xyXG5cclxuICAgIGNvbnN0IGFwcHJvdmVQb3NpdGlvbiA9IG5ldyBWZWN0b3IoY2FudmFzLndpZHRoIC0gMiAqIHNwcml0ZUhlaWdodCwgY2FudmFzLmhlaWdodCAtIDExICogc3ByaXRlSGVpZ2h0IC8gMTIpO1xyXG4gICAgd2FpdEZvbnQgPSBgJHtzcHJpdGVIZWlnaHQgLyAzfXB4IFN1Z2FybGlrZWA7XHJcbiAgICB3YWl0Qm91bmRzID0gW2FwcHJvdmVQb3NpdGlvbiwgZ2V0Qm90dG9tUmlnaHQoJ1dhaXQhJywgd2FpdEZvbnQsIGFwcHJvdmVQb3NpdGlvbildO1xyXG5cclxuICAgIGNvbnN0IGRpc2FwcHJvdmVQb3NpdGlvbiA9IG5ldyBWZWN0b3IoY2FudmFzLndpZHRoIC0gMiAqIHNwcml0ZUhlaWdodCwgY2FudmFzLmhlaWdodCAtIDUgKiBzcHJpdGVIZWlnaHQgLyAxMik7XHJcbiAgICBwcm9jZWVkRm9udCA9IGAke3Nwcml0ZUhlaWdodCAvIDN9cHggU3VnYXJsaWtlYDtcclxuICAgIHByb2NlZWRCb3VuZHMgPSBbZGlzYXBwcm92ZVBvc2l0aW9uLCBnZXRCb3R0b21SaWdodCgnUHJvY2VlZC4nLCBwcm9jZWVkRm9udCwgZGlzYXBwcm92ZVBvc2l0aW9uKV07XHJcblxyXG4gICAgY29uc3QgcmVhZHlQb3NpdGlvbiA9IG5ldyBWZWN0b3IoY2FudmFzLndpZHRoIC0gMiAqIHNwcml0ZUhlaWdodCwgY2FudmFzLmhlaWdodCAtIDMgKiBzcHJpdGVIZWlnaHQgLyA0KTtcclxuICAgIHJlYWR5Rm9udCA9IGAke3Nwcml0ZUhlaWdodCAvIDJ9cHggU3VnYXJsaWtlYDtcclxuICAgIHJlYWR5Qm91bmRzID0gW3JlYWR5UG9zaXRpb24sIGdldEJvdHRvbVJpZ2h0KCdSZWFkeSEnLCByZWFkeUZvbnQsIHJlYWR5UG9zaXRpb24pXTtcclxuXHJcbiAgICBjb25zdCBjb3VudGRvd25Qb3NpdGlvbiA9IG5ldyBWZWN0b3IoY2FudmFzLndpZHRoIC0gMy41ICogc3ByaXRlSGVpZ2h0LCBjYW52YXMuaGVpZ2h0IC0gMiAqIHNwcml0ZUhlaWdodCAvIDMpO1xyXG4gICAgY291bnRkb3duRm9udCA9IGAke3Nwcml0ZUhlaWdodCAvIDJ9cHggU3VnYXJsaWtlYDtcclxuICAgIGNvdW50ZG93bkJvdW5kcyA9IFtjb3VudGRvd25Qb3NpdGlvbiwgZ2V0Qm90dG9tUmlnaHQoJ1dhaXRpbmcgMTAgc2Vjb25kcy4uLicsIGNvdW50ZG93bkZvbnQsIGNvdW50ZG93blBvc2l0aW9uKV07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldEJvdHRvbVJpZ2h0KHRleHQ6IHN0cmluZywgZm9udDogc3RyaW5nLCBwb3NpdGlvbjogVmVjdG9yKTogVmVjdG9yIHtcclxuICAgIGNvbnRleHQuZm9udCA9IGZvbnQ7XHJcbiAgICBjb250ZXh0LnRleHRCYXNlbGluZSA9ICd0b3AnO1xyXG4gICAgY29uc3QgdGV4dE1ldHJpY3MgPSBjb250ZXh0Lm1lYXN1cmVUZXh0KHRleHQpO1xyXG4gICAgcmV0dXJuIHBvc2l0aW9uLmFkZChuZXcgVmVjdG9yKHRleHRNZXRyaWNzLndpZHRoLCB0ZXh0TWV0cmljcy5hY3R1YWxCb3VuZGluZ0JveERlc2NlbnQpKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldFRyYW5zZm9ybUZvclBsYXllcihyZWxhdGl2ZUluZGV4OiBudW1iZXIpOiBET01NYXRyaXgge1xyXG4gICAgY29udGV4dC5zYXZlKCk7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIGlmIChyZWxhdGl2ZUluZGV4ID09PSAwKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBjb250ZXh0LmdldFRyYW5zZm9ybSgpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAocmVsYXRpdmVJbmRleCA9PT0gMSkge1xyXG4gICAgICAgICAgICBjb250ZXh0LnRyYW5zbGF0ZSgwLCAoY2FudmFzLndpZHRoICsgY2FudmFzLmhlaWdodCkgLyAyKTtcclxuICAgICAgICAgICAgY29udGV4dC5yb3RhdGUoLU1hdGguUEkgLyAyKTtcclxuICAgICAgICAgICAgcmV0dXJuIGNvbnRleHQuZ2V0VHJhbnNmb3JtKCk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChyZWxhdGl2ZUluZGV4ID09PSAyKSB7XHJcbiAgICAgICAgICAgIC8vIG5vIHRyYW5zZm9ybVxyXG4gICAgICAgICAgICByZXR1cm4gY29udGV4dC5nZXRUcmFuc2Zvcm0oKTtcclxuICAgICAgICB9IGVsc2UgaWYgKHJlbGF0aXZlSW5kZXggPT09IDMpIHtcclxuICAgICAgICAgICAgY29udGV4dC50cmFuc2xhdGUoY2FudmFzLndpZHRoLCAoY2FudmFzLmhlaWdodCAtIGNhbnZhcy53aWR0aCkgLyAyKTtcclxuICAgICAgICAgICAgY29udGV4dC5yb3RhdGUoTWF0aC5QSSAvIDIpO1xyXG4gICAgICAgICAgICByZXR1cm4gY29udGV4dC5nZXRUcmFuc2Zvcm0oKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGluZGV4IG11c3QgYmUgMCwgMSwgMiwgb3IgMzsgZ290OiAke3JlbGF0aXZlSW5kZXh9YCk7XHJcbiAgICAgICAgfVxyXG4gICAgfSBmaW5hbGx5IHtcclxuICAgICAgICBjb250ZXh0LnJlc3RvcmUoKTtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldFJlbGF0aXZlUGxheWVySW5kZXgob3RoZXJQbGF5ZXJJbmRleDogbnVtYmVyLCBwbGF5ZXJJbmRleDogbnVtYmVyKSB7XHJcbiAgICBsZXQgcmVsYXRpdmVJbmRleCA9IG90aGVyUGxheWVySW5kZXggLSBwbGF5ZXJJbmRleDtcclxuICAgIGlmIChyZWxhdGl2ZUluZGV4ID49IDApIHtcclxuICAgICAgICByZXR1cm4gcmVsYXRpdmVJbmRleDtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gb3RoZXJQbGF5ZXJJbmRleCAtIChwbGF5ZXJJbmRleCAtIDQpO1xyXG59IiwiaW1wb3J0IGJpbmFyeVNlYXJjaCBmcm9tICdiaW5hcnktc2VhcmNoJztcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBiaW5hcnlTZWFyY2hOdW1iZXIoaGF5c3RhY2s6IG51bWJlcltdLCBuZWVkbGU6IG51bWJlciwgbG93PzogbnVtYmVyLCBoaWdoPzogbnVtYmVyKSB7XHJcbiAgICByZXR1cm4gYmluYXJ5U2VhcmNoKGhheXN0YWNrLCBuZWVkbGUsIChhLCBiKSA9PiBhIC0gYiwgbG93LCBoaWdoKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldENvb2tpZShuYW1lOiBzdHJpbmcpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xyXG4gICAgY29uc3QgcGFydHMgPSBgOyAke2RvY3VtZW50LmNvb2tpZX1gLnNwbGl0KGA7ICR7bmFtZX09YCk7XHJcbiAgICBpZiAocGFydHMubGVuZ3RoID09PSAyKSB7XHJcbiAgICAgICAgcmV0dXJuIHBhcnRzLnBvcCgpPy5zcGxpdCgnOycpLnNoaWZ0KCk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRQYXJhbShuYW1lOiBzdHJpbmcpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xyXG4gICAgcmV0dXJuIHdpbmRvdy5sb2NhdGlvbi5zZWFyY2guc3BsaXQoYCR7bmFtZX09YClbMV0/LnNwbGl0KFwiJlwiKVswXTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGRlbGF5KG1zOiBudW1iZXIpIHtcclxuICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgbXMpKTtcclxufVxyXG5cclxuZXhwb3J0IGVudW0gU3VpdCB7XHJcbiAgICBDbHViLCAvLyAwXHJcbiAgICBEaWFtb25kLFxyXG4gICAgSGVhcnQsXHJcbiAgICBTcGFkZSxcclxuICAgIEpva2VyLCAvLyA0XHJcbn1cclxuXHJcbmV4cG9ydCBlbnVtIFJhbmsge1xyXG4gICAgU21hbGwsIC8vIDBcclxuICAgIEFjZSxcclxuICAgIFR3byxcclxuICAgIFRocmVlLFxyXG4gICAgRm91cixcclxuICAgIEZpdmUsXHJcbiAgICBTaXgsXHJcbiAgICBTZXZlbixcclxuICAgIEVpZ2h0LFxyXG4gICAgTmluZSxcclxuICAgIFRlbixcclxuICAgIEphY2ssXHJcbiAgICBRdWVlbixcclxuICAgIEtpbmcsXHJcbiAgICBCaWcsIC8vIDE0XHJcbn1cclxuXHJcbmV4cG9ydCB0eXBlIENhcmQgPSBbU3VpdCwgUmFua107XHJcblxyXG5leHBvcnQgdHlwZSBQbGF5ZXJTdGF0ZSA9IFwiV2FpdFwiIHwgXCJQcm9jZWVkXCIgfCBcIlJlYWR5XCIgfCBBY3RpdmU7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEFjdGl2ZSB7XHJcbiAgICB0eXBlOiBcIkFjdGl2ZVwiO1xyXG4gICAgYWN0aXZlVGltZTogbnVtYmVyO1xyXG59XHJcblxyXG5leHBvcnQgY29uc3QgYWN0aXZlQ29vbGRvd24gPSAxMDAwMDsgLy9taWxsaXNlY29uZHNcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgT3RoZXJQbGF5ZXIge1xyXG4gICAgbmFtZTogc3RyaW5nO1xyXG4gICAgc2hhcmVDb3VudDogbnVtYmVyO1xyXG4gICAgcmV2ZWFsZWRDYXJkczogQ2FyZFtdO1xyXG4gICAgY2FyZENvdW50OiBudW1iZXI7XHJcbiAgICAvL3N0YXRlOiBQbGF5ZXJTdGF0ZTtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBHYW1lU3RhdGUge1xyXG4gICAgZGVja0NvdW50OiBudW1iZXI7XHJcbiAgICBwbGF5ZXJJbmRleDogbnVtYmVyO1xyXG4gICAgcGxheWVyQ2FyZHM6IENhcmRbXTtcclxuICAgIHBsYXllclNoYXJlQ291bnQ6IG51bWJlcjtcclxuICAgIHBsYXllclJldmVhbENvdW50OiBudW1iZXI7XHJcbiAgICAvL3BsYXllclN0YXRlOiBQbGF5ZXJTdGF0ZTtcclxuICAgIG90aGVyUGxheWVyczogKE90aGVyUGxheWVyIHwgbnVsbClbXTtcclxufVxyXG5cclxuZXhwb3J0IHR5cGUgTWV0aG9kTmFtZSA9XHJcbiAgICBcImpvaW5HYW1lXCIgfFxyXG4gICAgXCJ0YWtlQ2FyZFwiIHxcclxuICAgIFwiZHJhd0NhcmRcIiB8XHJcbiAgICBcInJldHVybkNhcmRzVG9EZWNrXCIgfFxyXG4gICAgXCJyZW9yZGVyQ2FyZHNcIiB8XHJcbiAgICBcIndhaXRcIiB8XHJcbiAgICBcInByb2NlZWRcIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgTWV0aG9kUmVzdWx0IHtcclxuICAgIG1ldGhvZE5hbWU6IE1ldGhvZE5hbWU7XHJcbiAgICBlcnJvckRlc2NyaXB0aW9uPzogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEpvaW5HYW1lTWVzc2FnZSB7XHJcbiAgICBnYW1lSWQ6IHN0cmluZztcclxuICAgIHBsYXllck5hbWU6IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBUYWtlQ2FyZE1lc3NhZ2Uge1xyXG4gICAgb3RoZXJQbGF5ZXJJbmRleDogbnVtYmVyO1xyXG4gICAgY2FyZEluZGV4OiBudW1iZXI7XHJcbiAgICBjYXJkOiBDYXJkO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIERyYXdDYXJkTWVzc2FnZSB7XHJcbiAgICBkcmF3Q2FyZDogbnVsbDtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBSZXR1cm5DYXJkc1RvRGVja01lc3NhZ2Uge1xyXG4gICAgY2FyZHNUb1JldHVyblRvRGVjazogQ2FyZFtdO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFJlb3JkZXJDYXJkc01lc3NhZ2Uge1xyXG4gICAgcmVvcmRlcmVkQ2FyZHM6IENhcmRbXTtcclxuICAgIG5ld1NoYXJlQ291bnQ6IG51bWJlcjtcclxuICAgIG5ld1JldmVhbENvdW50OiBudW1iZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgV2FpdE1lc3NhZ2Uge1xyXG4gICAgd2FpdDogbnVsbDtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBQcm9jZWVkTWVzc2FnZSB7XHJcbiAgICBwcm9jZWVkOiBudWxsO1xyXG59Il19
