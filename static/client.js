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
    await onUp(event);
};
VP.canvas.ontouchend = async (event) => {
    const touch = event.touches[0];
    if (touch !== undefined) {
        onUp(touch);
    }
};
async function onUp(event) {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYXdhaXQtc2VtYXBob3JlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2JpbmFyeS1zZWFyY2gvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL3RpbWVycy1icm93c2VyaWZ5L21haW4uanMiLCJzcmMvY2xpZW50L2NhcmQtaW1hZ2VzLnRzIiwic3JjL2NsaWVudC9nYW1lLnRzIiwic3JjL2NsaWVudC9pbnB1dC50cyIsInNyYy9jbGllbnQvbG9iYnkudHMiLCJzcmMvY2xpZW50L3JlbmRlci50cyIsInNyYy9jbGllbnQvc3ByaXRlLnRzIiwic3JjL2NsaWVudC9zdGF0ZS50cyIsInNyYy9jbGllbnQvdmVjdG9yLnRzIiwic3JjL2NsaWVudC92aWV3LXBhcmFtcy50cyIsInNyYy9saWIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUN4TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FDM0VBLDRDQUE4QjtBQUU5QixNQUFNLEtBQUssR0FBRyxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQztBQUM5RCxNQUFNLEtBQUssR0FBRyxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFFakcsTUFBTSxVQUFVLEdBQUcsSUFBSSxHQUFHLEVBQTRCLENBQUM7QUFFaEQsS0FBSyxVQUFVLElBQUk7SUFDdEIsa0NBQWtDO0lBQ2xDLEtB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QUM7QUFDM0QsQ0FBQztBQUZELHNCQUVDO0FBRUQsSUFBWSxJQU1YO0FBTkQsV0FBWSxJQUFJO0lBQ1osK0JBQUksQ0FBQTtJQUNKLHFDQUFPLENBQUE7SUFDUCxpQ0FBSyxDQUFBO0lBQ0wsaUNBQUssQ0FBQTtJQUNMLGlDQUFLLENBQUE7QUFDVCxDQUFDLEVBTlcsSUFBSSxHQUFKLFlBQUksS0FBSixZQUFJLFFBTWY7QUFFRCxJQUFZLElBZ0JYO0FBaEJELFdBQVksSUFBSTtJQUNaLGlDQUFLLENBQUE7SUFDTCw2QkFBRyxDQUFBO0lBQ0gsNkJBQUcsQ0FBQTtJQUNILGlDQUFLLENBQUE7SUFDTCwrQkFBSSxDQUFBO0lBQ0osK0JBQUksQ0FBQTtJQUNKLDZCQUFHLENBQUE7SUFDSCxpQ0FBSyxDQUFBO0lBQ0wsaUNBQUssQ0FBQTtJQUNMLCtCQUFJLENBQUE7SUFDSiw4QkFBRyxDQUFBO0lBQ0gsZ0NBQUksQ0FBQTtJQUNKLGtDQUFLLENBQUE7SUFDTCxnQ0FBSSxDQUFBO0lBQ0osOEJBQUcsQ0FBQTtBQUNQLENBQUMsRUFoQlcsSUFBSSxHQUFKLFlBQUksS0FBSixZQUFJLFFBZ0JmO0FBV1ksUUFBQSxjQUFjLEdBQUcsS0FBSyxDQUFDLENBQUMsY0FBYyIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIlwidXNlIHN0cmljdFwiO1xuY2xhc3MgU2VtYXBob3JlIHtcbiAgICBjb25zdHJ1Y3Rvcihjb3VudCkge1xuICAgICAgICB0aGlzLnRhc2tzID0gW107XG4gICAgICAgIHRoaXMuY291bnQgPSBjb3VudDtcbiAgICB9XG4gICAgc2NoZWQoKSB7XG4gICAgICAgIGlmICh0aGlzLmNvdW50ID4gMCAmJiB0aGlzLnRhc2tzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHRoaXMuY291bnQtLTtcbiAgICAgICAgICAgIGxldCBuZXh0ID0gdGhpcy50YXNrcy5zaGlmdCgpO1xuICAgICAgICAgICAgaWYgKG5leHQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHRocm93IFwiVW5leHBlY3RlZCB1bmRlZmluZWQgdmFsdWUgaW4gdGFza3MgbGlzdFwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGFjcXVpcmUoKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzLCByZWopID0+IHtcbiAgICAgICAgICAgIHZhciB0YXNrID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIHZhciByZWxlYXNlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHJlcygoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghcmVsZWFzZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbGVhc2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY291bnQrKztcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2NoZWQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHRoaXMudGFza3MucHVzaCh0YXNrKTtcbiAgICAgICAgICAgIGlmIChwcm9jZXNzICYmIHByb2Nlc3MubmV4dFRpY2spIHtcbiAgICAgICAgICAgICAgICBwcm9jZXNzLm5leHRUaWNrKHRoaXMuc2NoZWQuYmluZCh0aGlzKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBzZXRJbW1lZGlhdGUodGhpcy5zY2hlZC5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHVzZShmKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmFjcXVpcmUoKVxuICAgICAgICAgICAgLnRoZW4ocmVsZWFzZSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gZigpXG4gICAgICAgICAgICAgICAgLnRoZW4oKHJlcykgPT4ge1xuICAgICAgICAgICAgICAgIHJlbGVhc2UoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgICAgICAgIHJlbGVhc2UoKTtcbiAgICAgICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxufVxuZXhwb3J0cy5TZW1hcGhvcmUgPSBTZW1hcGhvcmU7XG5jbGFzcyBNdXRleCBleHRlbmRzIFNlbWFwaG9yZSB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKDEpO1xuICAgIH1cbn1cbmV4cG9ydHMuTXV0ZXggPSBNdXRleDtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWluZGV4LmpzLm1hcCIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oaGF5c3RhY2ssIG5lZWRsZSwgY29tcGFyYXRvciwgbG93LCBoaWdoKSB7XG4gIHZhciBtaWQsIGNtcDtcblxuICBpZihsb3cgPT09IHVuZGVmaW5lZClcbiAgICBsb3cgPSAwO1xuXG4gIGVsc2Uge1xuICAgIGxvdyA9IGxvd3wwO1xuICAgIGlmKGxvdyA8IDAgfHwgbG93ID49IGhheXN0YWNrLmxlbmd0aClcbiAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKFwiaW52YWxpZCBsb3dlciBib3VuZFwiKTtcbiAgfVxuXG4gIGlmKGhpZ2ggPT09IHVuZGVmaW5lZClcbiAgICBoaWdoID0gaGF5c3RhY2subGVuZ3RoIC0gMTtcblxuICBlbHNlIHtcbiAgICBoaWdoID0gaGlnaHwwO1xuICAgIGlmKGhpZ2ggPCBsb3cgfHwgaGlnaCA+PSBoYXlzdGFjay5sZW5ndGgpXG4gICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcihcImludmFsaWQgdXBwZXIgYm91bmRcIik7XG4gIH1cblxuICB3aGlsZShsb3cgPD0gaGlnaCkge1xuICAgIC8vIFRoZSBuYWl2ZSBgbG93ICsgaGlnaCA+Pj4gMWAgY291bGQgZmFpbCBmb3IgYXJyYXkgbGVuZ3RocyA+IDIqKjMxXG4gICAgLy8gYmVjYXVzZSBgPj4+YCBjb252ZXJ0cyBpdHMgb3BlcmFuZHMgdG8gaW50MzIuIGBsb3cgKyAoaGlnaCAtIGxvdyA+Pj4gMSlgXG4gICAgLy8gd29ya3MgZm9yIGFycmF5IGxlbmd0aHMgPD0gMioqMzItMSB3aGljaCBpcyBhbHNvIEphdmFzY3JpcHQncyBtYXggYXJyYXlcbiAgICAvLyBsZW5ndGguXG4gICAgbWlkID0gbG93ICsgKChoaWdoIC0gbG93KSA+Pj4gMSk7XG4gICAgY21wID0gK2NvbXBhcmF0b3IoaGF5c3RhY2tbbWlkXSwgbmVlZGxlLCBtaWQsIGhheXN0YWNrKTtcblxuICAgIC8vIFRvbyBsb3cuXG4gICAgaWYoY21wIDwgMC4wKVxuICAgICAgbG93ICA9IG1pZCArIDE7XG5cbiAgICAvLyBUb28gaGlnaC5cbiAgICBlbHNlIGlmKGNtcCA+IDAuMClcbiAgICAgIGhpZ2ggPSBtaWQgLSAxO1xuXG4gICAgLy8gS2V5IGZvdW5kLlxuICAgIGVsc2VcbiAgICAgIHJldHVybiBtaWQ7XG4gIH1cblxuICAvLyBLZXkgbm90IGZvdW5kLlxuICByZXR1cm4gfmxvdztcbn1cbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG4vLyBjYWNoZWQgZnJvbSB3aGF0ZXZlciBnbG9iYWwgaXMgcHJlc2VudCBzbyB0aGF0IHRlc3QgcnVubmVycyB0aGF0IHN0dWIgaXRcbi8vIGRvbid0IGJyZWFrIHRoaW5ncy4gIEJ1dCB3ZSBuZWVkIHRvIHdyYXAgaXQgaW4gYSB0cnkgY2F0Y2ggaW4gY2FzZSBpdCBpc1xuLy8gd3JhcHBlZCBpbiBzdHJpY3QgbW9kZSBjb2RlIHdoaWNoIGRvZXNuJ3QgZGVmaW5lIGFueSBnbG9iYWxzLiAgSXQncyBpbnNpZGUgYVxuLy8gZnVuY3Rpb24gYmVjYXVzZSB0cnkvY2F0Y2hlcyBkZW9wdGltaXplIGluIGNlcnRhaW4gZW5naW5lcy5cblxudmFyIGNhY2hlZFNldFRpbWVvdXQ7XG52YXIgY2FjaGVkQ2xlYXJUaW1lb3V0O1xuXG5mdW5jdGlvbiBkZWZhdWx0U2V0VGltb3V0KCkge1xuICAgIHRocm93IG5ldyBFcnJvcignc2V0VGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuZnVuY3Rpb24gZGVmYXVsdENsZWFyVGltZW91dCAoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdjbGVhclRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbihmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBzZXRUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBjbGVhclRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgfVxufSAoKSlcbmZ1bmN0aW9uIHJ1blRpbWVvdXQoZnVuKSB7XG4gICAgaWYgKGNhY2hlZFNldFRpbWVvdXQgPT09IHNldFRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIC8vIGlmIHNldFRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRTZXRUaW1lb3V0ID09PSBkZWZhdWx0U2V0VGltb3V0IHx8ICFjYWNoZWRTZXRUaW1lb3V0KSAmJiBzZXRUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfSBjYXRjaChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbChudWxsLCBmdW4sIDApO1xuICAgICAgICB9IGNhdGNoKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3JcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwodGhpcywgZnVuLCAwKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG59XG5mdW5jdGlvbiBydW5DbGVhclRpbWVvdXQobWFya2VyKSB7XG4gICAgaWYgKGNhY2hlZENsZWFyVGltZW91dCA9PT0gY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIC8vIGlmIGNsZWFyVGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZENsZWFyVGltZW91dCA9PT0gZGVmYXVsdENsZWFyVGltZW91dCB8fCAhY2FjaGVkQ2xlYXJUaW1lb3V0KSAmJiBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0ICB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKG51bGwsIG1hcmtlcik7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3IuXG4gICAgICAgICAgICAvLyBTb21lIHZlcnNpb25zIG9mIEkuRS4gaGF2ZSBkaWZmZXJlbnQgcnVsZXMgZm9yIGNsZWFyVGltZW91dCB2cyBzZXRUaW1lb3V0XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwodGhpcywgbWFya2VyKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG5cbn1cbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGlmICghZHJhaW5pbmcgfHwgIWN1cnJlbnRRdWV1ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHJ1blRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRRdWV1ZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIHJ1bkNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHJ1blRpbWVvdXQoZHJhaW5RdWV1ZSk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZE9uY2VMaXN0ZW5lciA9IG5vb3A7XG5cbnByb2Nlc3MubGlzdGVuZXJzID0gZnVuY3Rpb24gKG5hbWUpIHsgcmV0dXJuIFtdIH1cblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iLCJ2YXIgbmV4dFRpY2sgPSByZXF1aXJlKCdwcm9jZXNzL2Jyb3dzZXIuanMnKS5uZXh0VGljaztcbnZhciBhcHBseSA9IEZ1bmN0aW9uLnByb3RvdHlwZS5hcHBseTtcbnZhciBzbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcbnZhciBpbW1lZGlhdGVJZHMgPSB7fTtcbnZhciBuZXh0SW1tZWRpYXRlSWQgPSAwO1xuXG4vLyBET00gQVBJcywgZm9yIGNvbXBsZXRlbmVzc1xuXG5leHBvcnRzLnNldFRpbWVvdXQgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIG5ldyBUaW1lb3V0KGFwcGx5LmNhbGwoc2V0VGltZW91dCwgd2luZG93LCBhcmd1bWVudHMpLCBjbGVhclRpbWVvdXQpO1xufTtcbmV4cG9ydHMuc2V0SW50ZXJ2YWwgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIG5ldyBUaW1lb3V0KGFwcGx5LmNhbGwoc2V0SW50ZXJ2YWwsIHdpbmRvdywgYXJndW1lbnRzKSwgY2xlYXJJbnRlcnZhbCk7XG59O1xuZXhwb3J0cy5jbGVhclRpbWVvdXQgPVxuZXhwb3J0cy5jbGVhckludGVydmFsID0gZnVuY3Rpb24odGltZW91dCkgeyB0aW1lb3V0LmNsb3NlKCk7IH07XG5cbmZ1bmN0aW9uIFRpbWVvdXQoaWQsIGNsZWFyRm4pIHtcbiAgdGhpcy5faWQgPSBpZDtcbiAgdGhpcy5fY2xlYXJGbiA9IGNsZWFyRm47XG59XG5UaW1lb3V0LnByb3RvdHlwZS51bnJlZiA9IFRpbWVvdXQucHJvdG90eXBlLnJlZiA9IGZ1bmN0aW9uKCkge307XG5UaW1lb3V0LnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLl9jbGVhckZuLmNhbGwod2luZG93LCB0aGlzLl9pZCk7XG59O1xuXG4vLyBEb2VzIG5vdCBzdGFydCB0aGUgdGltZSwganVzdCBzZXRzIHVwIHRoZSBtZW1iZXJzIG5lZWRlZC5cbmV4cG9ydHMuZW5yb2xsID0gZnVuY3Rpb24oaXRlbSwgbXNlY3MpIHtcbiAgY2xlYXJUaW1lb3V0KGl0ZW0uX2lkbGVUaW1lb3V0SWQpO1xuICBpdGVtLl9pZGxlVGltZW91dCA9IG1zZWNzO1xufTtcblxuZXhwb3J0cy51bmVucm9sbCA9IGZ1bmN0aW9uKGl0ZW0pIHtcbiAgY2xlYXJUaW1lb3V0KGl0ZW0uX2lkbGVUaW1lb3V0SWQpO1xuICBpdGVtLl9pZGxlVGltZW91dCA9IC0xO1xufTtcblxuZXhwb3J0cy5fdW5yZWZBY3RpdmUgPSBleHBvcnRzLmFjdGl2ZSA9IGZ1bmN0aW9uKGl0ZW0pIHtcbiAgY2xlYXJUaW1lb3V0KGl0ZW0uX2lkbGVUaW1lb3V0SWQpO1xuXG4gIHZhciBtc2VjcyA9IGl0ZW0uX2lkbGVUaW1lb3V0O1xuICBpZiAobXNlY3MgPj0gMCkge1xuICAgIGl0ZW0uX2lkbGVUaW1lb3V0SWQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uIG9uVGltZW91dCgpIHtcbiAgICAgIGlmIChpdGVtLl9vblRpbWVvdXQpXG4gICAgICAgIGl0ZW0uX29uVGltZW91dCgpO1xuICAgIH0sIG1zZWNzKTtcbiAgfVxufTtcblxuLy8gVGhhdCdzIG5vdCBob3cgbm9kZS5qcyBpbXBsZW1lbnRzIGl0IGJ1dCB0aGUgZXhwb3NlZCBhcGkgaXMgdGhlIHNhbWUuXG5leHBvcnRzLnNldEltbWVkaWF0ZSA9IHR5cGVvZiBzZXRJbW1lZGlhdGUgPT09IFwiZnVuY3Rpb25cIiA/IHNldEltbWVkaWF0ZSA6IGZ1bmN0aW9uKGZuKSB7XG4gIHZhciBpZCA9IG5leHRJbW1lZGlhdGVJZCsrO1xuICB2YXIgYXJncyA9IGFyZ3VtZW50cy5sZW5ndGggPCAyID8gZmFsc2UgOiBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG5cbiAgaW1tZWRpYXRlSWRzW2lkXSA9IHRydWU7XG5cbiAgbmV4dFRpY2soZnVuY3Rpb24gb25OZXh0VGljaygpIHtcbiAgICBpZiAoaW1tZWRpYXRlSWRzW2lkXSkge1xuICAgICAgLy8gZm4uY2FsbCgpIGlzIGZhc3RlciBzbyB3ZSBvcHRpbWl6ZSBmb3IgdGhlIGNvbW1vbiB1c2UtY2FzZVxuICAgICAgLy8gQHNlZSBodHRwOi8vanNwZXJmLmNvbS9jYWxsLWFwcGx5LXNlZ3VcbiAgICAgIGlmIChhcmdzKSB7XG4gICAgICAgIGZuLmFwcGx5KG51bGwsIGFyZ3MpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm4uY2FsbChudWxsKTtcbiAgICAgIH1cbiAgICAgIC8vIFByZXZlbnQgaWRzIGZyb20gbGVha2luZ1xuICAgICAgZXhwb3J0cy5jbGVhckltbWVkaWF0ZShpZCk7XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gaWQ7XG59O1xuXG5leHBvcnRzLmNsZWFySW1tZWRpYXRlID0gdHlwZW9mIGNsZWFySW1tZWRpYXRlID09PSBcImZ1bmN0aW9uXCIgPyBjbGVhckltbWVkaWF0ZSA6IGZ1bmN0aW9uKGlkKSB7XG4gIGRlbGV0ZSBpbW1lZGlhdGVJZHNbaWRdO1xufTsiLCJpbXBvcnQgKiBhcyBMaWIgZnJvbSAnLi4vbGliJztcclxuXHJcbmNvbnN0IHN1aXRzID0gWydDbHVicycsICdEbW5kcycsICdIZWFydHMnLCAnU3BhZGVzJywgJ0pva2VyJ107XHJcbmNvbnN0IHJhbmtzID0gWydTbWFsbCcsICdBJywgJzInLCAnMycsICc0JywgJzUnLCAnNicsICc3JywgJzgnLCAnOScsICcxMCcsICdKJywgJ1EnLCAnSycsICdCaWcnXTtcclxuXHJcbmNvbnN0IGNhcmRJbWFnZXMgPSBuZXcgTWFwPHN0cmluZywgSFRNTEltYWdlRWxlbWVudD4oKTtcclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBsb2FkKCkge1xyXG4gICAgLy8gbG9hZCBjYXJkIGltYWdlcyBhc3luY2hyb25vdXNseVxyXG4gICAgZm9yIChsZXQgc3VpdCA9IDA7IHN1aXQgPD0gNDsgKytzdWl0KSB7XHJcbiAgICAgICAgZm9yIChsZXQgcmFuayA9IDA7IHJhbmsgPD0gMTQ7ICsrcmFuaykge1xyXG4gICAgICAgICAgICBpZiAoc3VpdCA9PT0gTGliLlN1aXQuSm9rZXIpIHtcclxuICAgICAgICAgICAgICAgIGlmICgwIDwgcmFuayAmJiByYW5rIDwgMTQpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGlmIChyYW5rIDwgMSB8fCAxMyA8IHJhbmspIHtcclxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgaW1hZ2UgPSBuZXcgSW1hZ2UoKTtcclxuICAgICAgICAgICAgaW1hZ2Uuc3JjID0gYFBhcGVyQ2FyZHMvJHtzdWl0c1tzdWl0XX0vJHtyYW5rc1tyYW5rXX1vZiR7c3VpdHNbc3VpdF19LnBuZ2A7XHJcbiAgICAgICAgICAgIGltYWdlLm9ubG9hZCA9ICgpID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBsb2FkZWQgJyR7aW1hZ2Uuc3JjfSdgKTtcclxuICAgICAgICAgICAgICAgIGNhcmRJbWFnZXMuc2V0KEpTT04uc3RyaW5naWZ5KFtzdWl0LCByYW5rXSksIGltYWdlKTtcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCA1OyArK2kpIHtcclxuICAgICAgICBjb25zdCBpbWFnZSA9IG5ldyBJbWFnZSgpO1xyXG4gICAgICAgIGltYWdlLnNyYyA9IGBQYXBlckNhcmRzL0NhcmRCYWNrJHtpfS5wbmdgO1xyXG4gICAgICAgIGltYWdlLm9ubG9hZCA9ICgpID0+IHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coYGxvYWRlZCAnJHtpbWFnZS5zcmN9J2ApO1xyXG4gICAgICAgICAgICBjYXJkSW1hZ2VzLnNldChgQmFjayR7aX1gLCBpbWFnZSk7XHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBibGFua0ltYWdlID0gbmV3IEltYWdlKCk7XHJcbiAgICBibGFua0ltYWdlLnNyYyA9ICdQYXBlckNhcmRzL0JsYW5rIENhcmQucG5nJztcclxuICAgIGJsYW5rSW1hZ2Uub25sb2FkID0gKCkgPT4ge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGBsb2FkZWQgJyR7YmxhbmtJbWFnZS5zcmN9J2ApO1xyXG4gICAgICAgIGNhcmRJbWFnZXMuc2V0KCdCbGFuaycsIGJsYW5rSW1hZ2UpO1xyXG4gICAgfTtcclxuXHJcbiAgICB3aGlsZSAoY2FyZEltYWdlcy5zaXplIDwgNCAqIDEzICsgNykge1xyXG4gICAgICAgIGF3YWl0IExpYi5kZWxheSgxMCk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc29sZS5sb2coJ2FsbCBjYXJkIGltYWdlcyBsb2FkZWQnKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldChzdHJpbmdGcm9tQ2FyZDogc3RyaW5nKTogSFRNTEltYWdlRWxlbWVudCB7XHJcbiAgICBjb25zdCBpbWFnZSA9IGNhcmRJbWFnZXMuZ2V0KHN0cmluZ0Zyb21DYXJkKTtcclxuICAgIGlmIChpbWFnZSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBjb3VsZG4ndCBmaW5kIGltYWdlOiAke3N0cmluZ0Zyb21DYXJkfWApO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBpbWFnZTtcclxufVxyXG4iLCJpbXBvcnQgKiBhcyBMaWIgZnJvbSAnLi4vbGliJztcclxuaW1wb3J0ICogYXMgU3RhdGUgZnJvbSAnLi9zdGF0ZSc7XHJcbmltcG9ydCAqIGFzIFZQIGZyb20gJy4vdmlldy1wYXJhbXMnO1xyXG5pbXBvcnQgKiBhcyBDYXJkSW1hZ2VzIGZyb20gJy4vY2FyZC1pbWFnZXMnO1xyXG5pbXBvcnQgKiBhcyBSZW5kZXIgZnJvbSAnLi9yZW5kZXInO1xyXG5cclxuLy8gcmVmcmVzaGluZyBzaG91bGQgcmVqb2luIHRoZSBzYW1lIGdhbWVcclxud2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKHVuZGVmaW5lZCwgU3RhdGUuZ2FtZUlkLCBgL2dhbWU/Z2FtZUlkPSR7U3RhdGUuZ2FtZUlkfSZwbGF5ZXJOYW1lPSR7U3RhdGUucGxheWVyTmFtZX1gKTtcclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGluaXQoKSB7XHJcbiAgICBWUC5yZWNhbGN1bGF0ZVBhcmFtZXRlcnMoKTtcclxuXHJcbiAgICAvLyBpbml0aWFsaXplIGlucHV0XHJcbiAgICB3aGlsZSAoU3RhdGUuZ2FtZVN0YXRlID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICBhd2FpdCBMaWIuZGVsYXkoMTAwKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCB1bmxvY2sgPSBhd2FpdCBTdGF0ZS5sb2NrKCk7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIFN0YXRlLnNldFNwcml0ZVRhcmdldHMoU3RhdGUuZ2FtZVN0YXRlKTtcclxuICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgdW5sb2NrKCk7XHJcbiAgICB9XHJcbn1cclxuXHJcbndpbmRvdy5vbnJlc2l6ZSA9IGluaXQ7XHJcblxyXG53aW5kb3cub25zY3JvbGwgPSBpbml0O1xyXG5cclxuKDxhbnk+d2luZG93KS5nYW1lID0gYXN5bmMgZnVuY3Rpb24gZ2FtZSgpIHtcclxuICAgIGNvbnN0IGpvaW5Qcm9taXNlID0gU3RhdGUuam9pbkdhbWUoU3RhdGUuZ2FtZUlkLCBTdGF0ZS5wbGF5ZXJOYW1lKTtcclxuICAgIGF3YWl0IENhcmRJbWFnZXMubG9hZCgpOyAvLyBjb25jdXJyZW50bHlcclxuICAgIGF3YWl0IGpvaW5Qcm9taXNlO1xyXG4gICAgXHJcbiAgICAvLyByZW5kZXJpbmcgbXVzdCBiZSBzeW5jaHJvbm91cywgb3IgZWxzZSBpdCBmbGlja2Vyc1xyXG4gICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShSZW5kZXIucmVuZGVyKTtcclxuXHJcbiAgICBhd2FpdCBpbml0KCk7XHJcbn07IiwiaW1wb3J0ICogYXMgTGliIGZyb20gJy4uL2xpYic7XHJcbmltcG9ydCAqIGFzIFN0YXRlIGZyb20gJy4vc3RhdGUnO1xyXG5pbXBvcnQgKiBhcyBWUCBmcm9tICcuL3ZpZXctcGFyYW1zJztcclxuaW1wb3J0IFZlY3RvciBmcm9tICcuL3ZlY3Rvcic7XHJcbmltcG9ydCBTcHJpdGUgZnJvbSAnLi9zcHJpdGUnO1xyXG5cclxuaW50ZXJmYWNlIFRha2VGcm9tT3RoZXJQbGF5ZXIge1xyXG4gICAgdHlwZTogXCJUYWtlRnJvbU90aGVyUGxheWVyXCI7XHJcbiAgICBtb3VzZVBvc2l0aW9uVG9TcHJpdGVQb3NpdGlvbjogVmVjdG9yO1xyXG4gICAgb3RoZXJQbGF5ZXJJbmRleDogbnVtYmVyO1xyXG4gICAgY2FyZEluZGV4OiBudW1iZXI7XHJcbiAgICBjYXJkOiBMaWIuQ2FyZDtcclxufVxyXG5cclxuaW50ZXJmYWNlIERyYXdGcm9tRGVjayB7XHJcbiAgICB0eXBlOiBcIkRyYXdGcm9tRGVja1wiO1xyXG4gICAgbW91c2VQb3NpdGlvblRvU3ByaXRlUG9zaXRpb246IFZlY3RvcjtcclxufVxyXG5cclxuaW50ZXJmYWNlIFdhaXRpbmdGb3JOZXdDYXJkIHtcclxuICAgIHR5cGU6IFwiV2FpdGluZ0Zvck5ld0NhcmRcIjtcclxuICAgIG1vdXNlUG9zaXRpb25Ub1Nwcml0ZVBvc2l0aW9uOiBWZWN0b3I7XHJcbn1cclxuXHJcbmludGVyZmFjZSBSZXR1cm5Ub0RlY2sge1xyXG4gICAgdHlwZTogXCJSZXR1cm5Ub0RlY2tcIjtcclxuICAgIGNhcmRJbmRleDogbnVtYmVyO1xyXG4gICAgbW91c2VQb3NpdGlvblRvU3ByaXRlUG9zaXRpb246IFZlY3RvcjtcclxufVxyXG5cclxuaW50ZXJmYWNlIFJlb3JkZXIge1xyXG4gICAgdHlwZTogXCJSZW9yZGVyXCI7XHJcbiAgICBjYXJkSW5kZXg6IG51bWJlcjtcclxuICAgIG1vdXNlUG9zaXRpb25Ub1Nwcml0ZVBvc2l0aW9uOiBWZWN0b3I7XHJcbn1cclxuXHJcbmludGVyZmFjZSBDb250cm9sU2hpZnRDbGljayB7XHJcbiAgICB0eXBlOiBcIkNvbnRyb2xTaGlmdENsaWNrXCI7XHJcbiAgICBjYXJkSW5kZXg6IG51bWJlcjtcclxuICAgIG1vdXNlUG9zaXRpb25Ub1Nwcml0ZVBvc2l0aW9uOiBWZWN0b3I7XHJcbn1cclxuXHJcbmludGVyZmFjZSBDb250cm9sQ2xpY2sge1xyXG4gICAgdHlwZTogXCJDb250cm9sQ2xpY2tcIjtcclxuICAgIGNhcmRJbmRleDogbnVtYmVyO1xyXG4gICAgbW91c2VQb3NpdGlvblRvU3ByaXRlUG9zaXRpb246IFZlY3RvcjtcclxufVxyXG5cclxuaW50ZXJmYWNlIFNoaWZ0Q2xpY2sge1xyXG4gICAgdHlwZTogXCJTaGlmdENsaWNrXCI7XHJcbiAgICBjYXJkSW5kZXg6IG51bWJlcjtcclxuICAgIG1vdXNlUG9zaXRpb25Ub1Nwcml0ZVBvc2l0aW9uOiBWZWN0b3I7XHJcbn1cclxuXHJcbmludGVyZmFjZSBDbGljayB7XHJcbiAgICB0eXBlOiBcIkNsaWNrXCI7XHJcbiAgICBjYXJkSW5kZXg6IG51bWJlcjtcclxuICAgIG1vdXNlUG9zaXRpb25Ub1Nwcml0ZVBvc2l0aW9uOiBWZWN0b3I7XHJcbn1cclxuXHJcbmV4cG9ydCB0eXBlIEFjdGlvbiA9XHJcbiAgICBcIk5vbmVcIiB8XHJcbiAgICBcIlNvcnRCeVN1aXRcIiB8XHJcbiAgICBcIlNvcnRCeVJhbmtcIiB8XHJcbiAgICBcIldhaXRcIiB8XHJcbiAgICBcIlByb2NlZWRcIiB8XHJcbiAgICBcIkRlc2VsZWN0XCIgfFxyXG4gICAgVGFrZUZyb21PdGhlclBsYXllciB8XHJcbiAgICBEcmF3RnJvbURlY2sgfFxyXG4gICAgV2FpdGluZ0Zvck5ld0NhcmQgfFxyXG4gICAgUmV0dXJuVG9EZWNrIHxcclxuICAgIFJlb3JkZXIgfFxyXG4gICAgQ29udHJvbFNoaWZ0Q2xpY2sgfFxyXG4gICAgQ29udHJvbENsaWNrIHxcclxuICAgIFNoaWZ0Q2xpY2sgfFxyXG4gICAgQ2xpY2s7XHJcblxyXG5jb25zdCBkb3VibGVDbGlja1RocmVzaG9sZCA9IDUwMDsgLy8gbWlsbGlzZWNvbmRzXHJcbmNvbnN0IG1vdmVUaHJlc2hvbGQgPSAwLjUgKiBWUC5waXhlbHNQZXJDTTtcclxuXHJcbmV4cG9ydCBsZXQgYWN0aW9uOiBBY3Rpb24gPSBcIk5vbmVcIjtcclxuXHJcbmxldCBwcmV2aW91c0NsaWNrVGltZSA9IC0xO1xyXG5sZXQgcHJldmlvdXNDbGlja0luZGV4ID0gLTE7XHJcbmxldCBtb3VzZURvd25Qb3NpdGlvbiA9IDxWZWN0b3I+eyB4OiAwLCB5OiAwIH07XHJcbmxldCBtb3VzZU1vdmVQb3NpdGlvbiA9IDxWZWN0b3I+eyB4OiAwLCB5OiAwIH07XHJcbmxldCBleGNlZWRlZERyYWdUaHJlc2hvbGQgPSBmYWxzZTtcclxuXHJcbmxldCBob2xkaW5nQ29udHJvbCA9IGZhbHNlO1xyXG5sZXQgaG9sZGluZ1NoaWZ0ID0gZmFsc2U7XHJcbndpbmRvdy5vbmtleWRvd24gPSAoZTogS2V5Ym9hcmRFdmVudCkgPT4ge1xyXG4gICAgaWYgKGUua2V5ID09PSBcIkNvbnRyb2xcIikge1xyXG4gICAgICAgIGhvbGRpbmdDb250cm9sID0gdHJ1ZTtcclxuICAgIH0gZWxzZSBpZiAoZS5rZXkgPT09IFwiU2hpZnRcIikge1xyXG4gICAgICAgIGhvbGRpbmdTaGlmdCA9IHRydWU7XHJcbiAgICB9XHJcbn07XHJcblxyXG53aW5kb3cub25rZXl1cCA9IChlOiBLZXlib2FyZEV2ZW50KSA9PiB7XHJcbiAgICBpZiAoZS5rZXkgPT09IFwiQ29udHJvbFwiKSB7XHJcbiAgICAgICAgaG9sZGluZ0NvbnRyb2wgPSBmYWxzZTtcclxuICAgIH0gZWxzZSBpZiAoZS5rZXkgPT09IFwiU2hpZnRcIikge1xyXG4gICAgICAgIGhvbGRpbmdTaGlmdCA9IGZhbHNlO1xyXG4gICAgfVxyXG59O1xyXG5cclxuaW50ZXJmYWNlIEhhc0NsaWVudFBvc2l0aW9uIHtcclxuICAgIGNsaWVudFg6IG51bWJlcjtcclxuICAgIGNsaWVudFk6IG51bWJlcjtcclxufVxyXG5cclxuaW50ZXJmYWNlIEhhc01vdmVtZW50IHtcclxuICAgIG1vdmVtZW50WDogbnVtYmVyO1xyXG4gICAgbW92ZW1lbnRZOiBudW1iZXI7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldE1vdXNlUG9zaXRpb24oZTogSGFzQ2xpZW50UG9zaXRpb24pIHtcclxuICAgIHJldHVybiBuZXcgVmVjdG9yKFxyXG4gICAgICAgIFZQLmNhbnZhcy53aWR0aCAqIChlLmNsaWVudFggLSBWUC5jYW52YXNSZWN0LmxlZnQpIC8gVlAuY2FudmFzUmVjdC53aWR0aCxcclxuICAgICAgICBWUC5jYW52YXMuaGVpZ2h0ICogKGUuY2xpZW50WSAtIFZQLmNhbnZhc1JlY3QudG9wKSAvIFZQLmNhbnZhc1JlY3QuaGVpZ2h0XHJcbiAgICApO1xyXG59XHJcblxyXG5WUC5jYW52YXMub25tb3VzZWRvd24gPSBhc3luYyBldmVudCA9PiB7XHJcbiAgICBhd2FpdCBvbkRvd24oZXZlbnQpO1xyXG59XHJcblxyXG5WUC5jYW52YXMub250b3VjaHN0YXJ0ID0gYXN5bmMgZXZlbnQgPT4ge1xyXG4gICAgY29uc3QgdG91Y2ggPSBldmVudC50b3VjaGVzWzBdO1xyXG4gICAgaWYgKHRvdWNoICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICBhd2FpdCBvbkRvd24odG91Y2gpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuYXN5bmMgZnVuY3Rpb24gb25Eb3duKGV2ZW50OiBIYXNDbGllbnRQb3NpdGlvbikge1xyXG4gICAgY29uc3QgdW5sb2NrID0gYXdhaXQgU3RhdGUubG9jaygpO1xyXG4gICAgdHJ5IHtcclxuICAgICAgICBtb3VzZURvd25Qb3NpdGlvbiA9IGdldE1vdXNlUG9zaXRpb24oZXZlbnQpO1xyXG4gICAgICAgIG1vdXNlTW92ZVBvc2l0aW9uID0gbW91c2VEb3duUG9zaXRpb247XHJcbiAgICAgICAgZXhjZWVkZWREcmFnVGhyZXNob2xkID0gZmFsc2U7XHJcblxyXG4gICAgICAgIGNvbnN0IGRlY2tQb3NpdGlvbiA9IFN0YXRlLmRlY2tTcHJpdGVzW1N0YXRlLmRlY2tTcHJpdGVzLmxlbmd0aCAtIDFdPy5wb3NpdGlvbjtcclxuXHJcbiAgICAgICAgaWYgKFZQLnNvcnRCeVJhbmtCb3VuZHNbMF0ueCA8IG1vdXNlRG93blBvc2l0aW9uLnggJiYgbW91c2VEb3duUG9zaXRpb24ueCA8IFZQLnNvcnRCeVJhbmtCb3VuZHNbMV0ueCAmJlxyXG4gICAgICAgICAgICBWUC5zb3J0QnlSYW5rQm91bmRzWzBdLnkgPCBtb3VzZURvd25Qb3NpdGlvbi55ICYmIG1vdXNlRG93blBvc2l0aW9uLnkgPCBWUC5zb3J0QnlSYW5rQm91bmRzWzFdLnlcclxuICAgICAgICApIHtcclxuICAgICAgICAgICAgYWN0aW9uID0gXCJTb3J0QnlSYW5rXCI7XHJcbiAgICAgICAgfSBlbHNlIGlmIChcclxuICAgICAgICAgICAgVlAuc29ydEJ5U3VpdEJvdW5kc1swXS54IDwgbW91c2VEb3duUG9zaXRpb24ueCAmJiBtb3VzZURvd25Qb3NpdGlvbi54IDwgVlAuc29ydEJ5U3VpdEJvdW5kc1sxXS54ICYmXHJcbiAgICAgICAgICAgIFZQLnNvcnRCeVN1aXRCb3VuZHNbMF0ueSA8IG1vdXNlRG93blBvc2l0aW9uLnkgJiYgbW91c2VEb3duUG9zaXRpb24ueSA8IFZQLnNvcnRCeVN1aXRCb3VuZHNbMV0ueVxyXG4gICAgICAgICkge1xyXG4gICAgICAgICAgICBhY3Rpb24gPSBcIlNvcnRCeVN1aXRcIjtcclxuICAgICAgICB9IGVsc2UgaWYgKFxyXG4gICAgICAgICAgICBWUC53YWl0Qm91bmRzWzBdLnggPCBtb3VzZURvd25Qb3NpdGlvbi54ICYmIG1vdXNlRG93blBvc2l0aW9uLnggPCBWUC53YWl0Qm91bmRzWzFdLnggJiZcclxuICAgICAgICAgICAgVlAud2FpdEJvdW5kc1swXS55IDwgbW91c2VEb3duUG9zaXRpb24ueSAmJiBtb3VzZURvd25Qb3NpdGlvbi55IDwgVlAud2FpdEJvdW5kc1sxXS55XHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICAgIGFjdGlvbiA9IFwiV2FpdFwiO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoXHJcbiAgICAgICAgICAgIFZQLnByb2NlZWRCb3VuZHNbMF0ueCA8IG1vdXNlRG93blBvc2l0aW9uLnggJiYgbW91c2VEb3duUG9zaXRpb24ueCA8IFZQLnByb2NlZWRCb3VuZHNbMV0ueCAmJlxyXG4gICAgICAgICAgICBWUC5wcm9jZWVkQm91bmRzWzBdLnkgPCBtb3VzZURvd25Qb3NpdGlvbi55ICYmIG1vdXNlRG93blBvc2l0aW9uLnkgPCBWUC5wcm9jZWVkQm91bmRzWzFdLnlcclxuICAgICAgICApIHtcclxuICAgICAgICAgICAgYWN0aW9uID0gXCJQcm9jZWVkXCI7XHJcbiAgICAgICAgfSBlbHNlIGlmIChkZWNrUG9zaXRpb24gIT09IHVuZGVmaW5lZCAmJlxyXG4gICAgICAgICAgICBkZWNrUG9zaXRpb24ueCA8IG1vdXNlRG93blBvc2l0aW9uLnggJiYgbW91c2VEb3duUG9zaXRpb24ueCA8IGRlY2tQb3NpdGlvbi54ICsgVlAuc3ByaXRlV2lkdGggJiZcclxuICAgICAgICAgICAgZGVja1Bvc2l0aW9uLnkgPCBtb3VzZURvd25Qb3NpdGlvbi55ICYmIG1vdXNlRG93blBvc2l0aW9uLnkgPCBkZWNrUG9zaXRpb24ueSArIFZQLnNwcml0ZUhlaWdodFxyXG4gICAgICAgICkge1xyXG4gICAgICAgICAgICBhY3Rpb24gPSB7XHJcbiAgICAgICAgICAgICAgICBtb3VzZVBvc2l0aW9uVG9TcHJpdGVQb3NpdGlvbjogZGVja1Bvc2l0aW9uLnN1Yihtb3VzZURvd25Qb3NpdGlvbiksXHJcbiAgICAgICAgICAgICAgICB0eXBlOiBcIkRyYXdGcm9tRGVja1wiXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgY29uc3QgZ2FtZVN0YXRlID0gU3RhdGUuZ2FtZVN0YXRlO1xyXG4gICAgICAgICAgICBpZiAoZ2FtZVN0YXRlID09PSB1bmRlZmluZWQpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgIC8vIGJlY2F1c2Ugd2UgcmVuZGVyIGxlZnQgdG8gcmlnaHQsIHRoZSByaWdodG1vc3QgY2FyZCB1bmRlciB0aGUgbW91c2UgcG9zaXRpb24gaXMgd2hhdCB3ZSBzaG91bGQgcmV0dXJuXHJcbiAgICAgICAgICAgIGNvbnN0IHNwcml0ZXMgPSBTdGF0ZS5mYWNlU3ByaXRlc0ZvclBsYXllcltnYW1lU3RhdGUucGxheWVySW5kZXhdO1xyXG4gICAgICAgICAgICBpZiAoc3ByaXRlcyA9PT0gdW5kZWZpbmVkKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICBsZXQgZGVzZWxlY3QgPSB0cnVlO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gc3ByaXRlcy5sZW5ndGggLSAxOyBpID49IDA7IC0taSkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcG9zaXRpb24gPSBzcHJpdGVzW2ldPy5wb3NpdGlvbjtcclxuICAgICAgICAgICAgICAgIGlmIChwb3NpdGlvbiAhPT0gdW5kZWZpbmVkICYmXHJcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb24ueCA8IG1vdXNlRG93blBvc2l0aW9uLnggJiYgbW91c2VEb3duUG9zaXRpb24ueCA8IHBvc2l0aW9uLnggKyBWUC5zcHJpdGVXaWR0aCAmJlxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uLnkgPCBtb3VzZURvd25Qb3NpdGlvbi55ICYmIG1vdXNlRG93blBvc2l0aW9uLnkgPCBwb3NpdGlvbi55ICsgVlAuc3ByaXRlSGVpZ2h0XHJcbiAgICAgICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgICAgICBkZXNlbGVjdCA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBhY3Rpb24gPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhcmRJbmRleDogaSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbW91c2VQb3NpdGlvblRvU3ByaXRlUG9zaXRpb246IHBvc2l0aW9uLnN1Yihtb3VzZURvd25Qb3NpdGlvbiksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IGhvbGRpbmdDb250cm9sICYmIGhvbGRpbmdTaGlmdCA/IFwiQ29udHJvbFNoaWZ0Q2xpY2tcIiA6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBob2xkaW5nQ29udHJvbCA/IFwiQ29udHJvbENsaWNrXCIgOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaG9sZGluZ1NoaWZ0ID8gXCJTaGlmdENsaWNrXCIgOiBcIkNsaWNrXCJcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IDQ7ICsraSkge1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgb3RoZXJQbGF5ZXIgPSBnYW1lU3RhdGUub3RoZXJQbGF5ZXJzW2ldO1xyXG4gICAgICAgICAgICAgICAgaWYgKG90aGVyUGxheWVyICE9PSBudWxsICYmIG90aGVyUGxheWVyICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0cmFuc2Zvcm0gPSBWUC5nZXRUcmFuc2Zvcm1Gb3JQbGF5ZXIoVlAuZ2V0UmVsYXRpdmVQbGF5ZXJJbmRleChpLCBnYW1lU3RhdGUucGxheWVySW5kZXgpKTtcclxuICAgICAgICAgICAgICAgICAgICB0cmFuc2Zvcm0uaW52ZXJ0U2VsZigpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRyYW5zZm9ybWVkUG9zaXRpb24gPSB0cmFuc2Zvcm0udHJhbnNmb3JtUG9pbnQobW91c2VEb3duUG9zaXRpb24pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBqID0gb3RoZXJQbGF5ZXIuc2hhcmVDb3VudCAtIDE7IGogPj0gMDsgLS1qKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNwcml0ZSA9IFN0YXRlLmZhY2VTcHJpdGVzRm9yUGxheWVyW2ldPy5bal07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzcHJpdGUgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzcHJpdGUucG9zaXRpb24ueCA8IHRyYW5zZm9ybWVkUG9zaXRpb24ueCAmJiB0cmFuc2Zvcm1lZFBvc2l0aW9uLnggPCBzcHJpdGUucG9zaXRpb24ueCArIFZQLnNwcml0ZVdpZHRoICYmXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzcHJpdGUucG9zaXRpb24ueSA8IHRyYW5zZm9ybWVkUG9zaXRpb24ueSAmJiB0cmFuc2Zvcm1lZFBvc2l0aW9uLnkgPCBzcHJpdGUucG9zaXRpb24ueSArIFZQLnNwcml0ZUhlaWdodFxyXG4gICAgICAgICAgICAgICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBtb3VzZSBkb3duIG9uICR7aX0ncyBjYXJkICR7an1gKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjYXJkID0gb3RoZXJQbGF5ZXIucmV2ZWFsZWRDYXJkc1tqXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjYXJkID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiVGFrZUZyb21PdGhlclBsYXllclwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1vdXNlUG9zaXRpb25Ub1Nwcml0ZVBvc2l0aW9uOiBuZXcgVmVjdG9yKDAsIDApLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG90aGVyUGxheWVySW5kZXg6IGksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FyZEluZGV4OiBqLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhcmRcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzZWxlY3QgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGRlc2VsZWN0KSB7XHJcbiAgICAgICAgICAgICAgICBhY3Rpb24gPSBcIkRlc2VsZWN0XCI7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9IGZpbmFsbHkge1xyXG4gICAgICAgIHVubG9jaygpO1xyXG4gICAgfVxyXG59XHJcblxyXG5WUC5jYW52YXMub25tb3VzZW1vdmUgPSBhc3luYyBldmVudCA9PiB7XHJcbiAgICBhd2FpdCBvbk1vdmUoZXZlbnQsIGV2ZW50KTtcclxufTtcclxuXHJcbmxldCBwcmV2aW91c1RvdWNoOiBUb3VjaCB8IHVuZGVmaW5lZDtcclxuXHJcblZQLmNhbnZhcy5vbnRvdWNobW92ZSA9IGFzeW5jIGV2ZW50ID0+IHtcclxuICAgIGNvbnN0IHRvdWNoID0gZXZlbnQudG91Y2hlc1swXTtcclxuICAgIGlmICh0b3VjaCAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgYXdhaXQgb25Nb3ZlKHRvdWNoLCB7XHJcbiAgICAgICAgICAgIG1vdmVtZW50WDogdG91Y2guY2xpZW50WCAtIChwcmV2aW91c1RvdWNoPy5jbGllbnRYID8/IHRvdWNoLmNsaWVudFgpLFxyXG4gICAgICAgICAgICBtb3ZlbWVudFk6IHRvdWNoLmNsaWVudFkgLSAocHJldmlvdXNUb3VjaD8uY2xpZW50WSA/PyB0b3VjaC5jbGllbnRZKVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHByZXZpb3VzVG91Y2ggPSB0b3VjaDtcclxuICAgIH1cclxufTtcclxuXHJcbmFzeW5jIGZ1bmN0aW9uIG9uTW92ZShldmVudDogSGFzQ2xpZW50UG9zaXRpb24sIG1vdmVtZW50OiBIYXNNb3ZlbWVudCkge1xyXG4gICAgY29uc3QgZ2FtZVN0YXRlID0gU3RhdGUuZ2FtZVN0YXRlO1xyXG4gICAgaWYgKGdhbWVTdGF0ZSA9PT0gdW5kZWZpbmVkKSByZXR1cm47XHJcblxyXG4gICAgY29uc3QgdW5sb2NrID0gYXdhaXQgU3RhdGUubG9jaygpO1xyXG4gICAgdHJ5IHtcclxuICAgICAgICBtb3VzZU1vdmVQb3NpdGlvbiA9IGdldE1vdXNlUG9zaXRpb24oZXZlbnQpO1xyXG4gICAgICAgIGV4Y2VlZGVkRHJhZ1RocmVzaG9sZCA9IGV4Y2VlZGVkRHJhZ1RocmVzaG9sZCB8fCBtb3VzZU1vdmVQb3NpdGlvbi5kaXN0YW5jZShtb3VzZURvd25Qb3NpdGlvbikgPiBtb3ZlVGhyZXNob2xkO1xyXG5cclxuICAgICAgICBpZiAoYWN0aW9uID09PSBcIk5vbmVcIikge1xyXG4gICAgICAgICAgICAvLyBkbyBub3RoaW5nXHJcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24gPT09IFwiU29ydEJ5U3VpdFwiKSB7XHJcbiAgICAgICAgICAgIC8vIFRPRE86IGNoZWNrIHdoZXRoZXIgbW91c2UgcG9zaXRpb24gaGFzIGxlZnQgYnV0dG9uIGJvdW5kc1xyXG4gICAgICAgIH0gZWxzZSBpZiAoYWN0aW9uID09PSBcIlNvcnRCeVJhbmtcIikge1xyXG4gICAgICAgICAgICAvLyBUT0RPOiBjaGVjayB3aGV0aGVyIG1vdXNlIHBvc2l0aW9uIGhhcyBsZWZ0IGJ1dHRvbiBib3VuZHNcclxuICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbiA9PT0gXCJXYWl0XCIpIHtcclxuICAgICAgICAgICAgLy8gVE9ETzogY2hlY2sgd2hldGhlciBtb3VzZSBwb3NpdGlvbiBoYXMgbGVmdCBidXR0b24gYm91bmRzXHJcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24gPT09IFwiUHJvY2VlZFwiKSB7XHJcbiAgICAgICAgICAgIC8vIFRPRE86IGNoZWNrIHdoZXRoZXIgbW91c2UgcG9zaXRpb24gaGFzIGxlZnQgYnV0dG9uIGJvdW5kc1xyXG4gICAgICAgIH0gZWxzZSBpZiAoYWN0aW9uID09PSBcIkRlc2VsZWN0XCIpIHtcclxuICAgICAgICAgICAgLy8gVE9ETzogYm94IHNlbGVjdGlvbj9cclxuICAgICAgICB9IGVsc2UgaWYgKFxyXG4gICAgICAgICAgICBhY3Rpb24udHlwZSA9PT0gXCJUYWtlRnJvbU90aGVyUGxheWVyXCIgfHxcclxuICAgICAgICAgICAgYWN0aW9uLnR5cGUgPT09IFwiRHJhd0Zyb21EZWNrXCIgfHxcclxuICAgICAgICAgICAgYWN0aW9uLnR5cGUgPT09IFwiV2FpdGluZ0Zvck5ld0NhcmRcIlxyXG4gICAgICAgICkge1xyXG4gICAgICAgICAgICBpZiAoZXhjZWVkZWREcmFnVGhyZXNob2xkKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgcHJvbWlzZTogUHJvbWlzZTx2b2lkPiB8IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgICAgIGxldCBzcHJpdGU6IFNwcml0ZSB8IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgICAgIGlmIChhY3Rpb24udHlwZSA9PT0gXCJUYWtlRnJvbU90aGVyUGxheWVyXCIpIHtcclxuICAgICAgICAgICAgICAgICAgICBwcm9taXNlID0gU3RhdGUudGFrZUNhcmQoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbi5vdGhlclBsYXllckluZGV4LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb24uY2FyZEluZGV4LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb24uY2FyZFxyXG4gICAgICAgICAgICAgICAgICAgICk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHNwcml0ZSA9IFN0YXRlLmZhY2VTcHJpdGVzRm9yUGxheWVyW2FjdGlvbi5vdGhlclBsYXllckluZGV4XT8uW2FjdGlvbi5jYXJkSW5kZXhdO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24udHlwZSA9PT0gXCJEcmF3RnJvbURlY2tcIikge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGNhcmQgZHJhd2luZyB3aWxsIHRyeSB0byBsb2NrIHRoZSBzdGF0ZSwgc28gd2UgbXVzdCBhdHRhY2ggYSBjYWxsYmFjayBpbnN0ZWFkIG9mIGF3YWl0aW5nXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvbWlzZSA9IFN0YXRlLmRyYXdDYXJkKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHNwcml0ZSA9IFN0YXRlLmRlY2tTcHJpdGVzW1N0YXRlLmRlY2tTcHJpdGVzLmxlbmd0aCAtIDFdO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmIChwcm9taXNlICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoc3ByaXRlID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG4gICAgICAgICAgICAgICAgICAgIHNwcml0ZS50YXJnZXQgPSBtb3VzZU1vdmVQb3NpdGlvbi5hZGQoYWN0aW9uLm1vdXNlUG9zaXRpb25Ub1Nwcml0ZVBvc2l0aW9uKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgYWN0aW9uID0geyAuLi5hY3Rpb24sIHR5cGU6IFwiV2FpdGluZ0Zvck5ld0NhcmRcIiB9O1xyXG4gICAgICAgICAgICAgICAgICAgIHByb21pc2UudGhlbihvbkNhcmREcmF3bihzcHJpdGUpKS5jYXRjaChfID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFjdGlvbiAhPT0gXCJOb25lXCIgJiZcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbiAhPT0gXCJEZXNlbGVjdFwiICYmXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb24gIT09IFwiU29ydEJ5UmFua1wiICYmXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb24gIT09IFwiU29ydEJ5U3VpdFwiICYmXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb24gIT09IFwiV2FpdFwiICYmXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb24gIT09IFwiUHJvY2VlZFwiICYmXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb24udHlwZSA9PT0gXCJXYWl0aW5nRm9yTmV3Q2FyZFwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uID0gXCJOb25lXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSBpZiAoYWN0aW9uLnR5cGUgPT09IFwiUmV0dXJuVG9EZWNrXCIgfHwgYWN0aW9uLnR5cGUgPT09IFwiUmVvcmRlclwiICkge1xyXG4gICAgICAgICAgICBkcmFnKGdhbWVTdGF0ZSwgYWN0aW9uLmNhcmRJbmRleCwgYWN0aW9uLm1vdXNlUG9zaXRpb25Ub1Nwcml0ZVBvc2l0aW9uKTtcclxuICAgICAgICB9IGVsc2UgaWYgKFxyXG4gICAgICAgICAgICBhY3Rpb24udHlwZSA9PT0gXCJDb250cm9sU2hpZnRDbGlja1wiIHx8XHJcbiAgICAgICAgICAgIGFjdGlvbi50eXBlID09PSBcIkNvbnRyb2xDbGlja1wiIHx8XHJcbiAgICAgICAgICAgIGFjdGlvbi50eXBlID09PSBcIlNoaWZ0Q2xpY2tcIiB8fFxyXG4gICAgICAgICAgICBhY3Rpb24udHlwZSA9PT0gXCJDbGlja1wiXHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICAgIGxldCBpID0gTGliLmJpbmFyeVNlYXJjaE51bWJlcihTdGF0ZS5zZWxlY3RlZEluZGljZXMsIGFjdGlvbi5jYXJkSW5kZXgpO1xyXG4gICAgICAgICAgICBpZiAoZXhjZWVkZWREcmFnVGhyZXNob2xkKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBkcmFnZ2luZyBhIG5vbi1zZWxlY3RlZCBjYXJkIHNlbGVjdHMgaXQgYW5kIG9ubHkgaXRcclxuICAgICAgICAgICAgICAgIGlmIChpIDwgMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIFN0YXRlLnNlbGVjdGVkSW5kaWNlcy5zcGxpY2UoMCwgU3RhdGUuc2VsZWN0ZWRJbmRpY2VzLmxlbmd0aCwgYWN0aW9uLmNhcmRJbmRleCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgZHJhZyhnYW1lU3RhdGUsIGFjdGlvbi5jYXJkSW5kZXgsIGFjdGlvbi5tb3VzZVBvc2l0aW9uVG9TcHJpdGVQb3NpdGlvbik7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBzcHJpdGVzID0gU3RhdGUuZmFjZVNwcml0ZXNGb3JQbGF5ZXJbZ2FtZVN0YXRlLnBsYXllckluZGV4XTtcclxuICAgICAgICAgICAgICAgIGlmIChzcHJpdGVzID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG4gICAgXHJcbiAgICAgICAgICAgICAgICBpZiAoaSA8IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzcHJpdGUgPSBzcHJpdGVzW2FjdGlvbi5jYXJkSW5kZXhdO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChzcHJpdGUgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgc3ByaXRlLnRhcmdldCA9IHNwcml0ZS50YXJnZXQuYWRkKG5ldyBWZWN0b3IobW92ZW1lbnQubW92ZW1lbnRYLCBtb3ZlbWVudC5tb3ZlbWVudFkpKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBqIG9mIFN0YXRlLnNlbGVjdGVkSW5kaWNlcykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzcHJpdGUgPSBzcHJpdGVzW2pdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc3ByaXRlID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzcHJpdGUudGFyZ2V0ID0gc3ByaXRlLnRhcmdldC5hZGQobmV3IFZlY3Rvcihtb3ZlbWVudC5tb3ZlbWVudFgsIG1vdmVtZW50Lm1vdmVtZW50WSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGNvbnN0IF86IG5ldmVyID0gYWN0aW9uO1xyXG4gICAgICAgIH1cclxuICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgdW5sb2NrKCk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5WUC5jYW52YXMub25tb3VzZXVwID0gYXN5bmMgZXZlbnQgPT4ge1xyXG4gICAgYXdhaXQgb25VcChldmVudCk7XHJcbn07XHJcblxyXG5WUC5jYW52YXMub250b3VjaGVuZCA9IGFzeW5jIGV2ZW50ID0+IHtcclxuICAgIGNvbnN0IHRvdWNoID0gZXZlbnQudG91Y2hlc1swXTtcclxuICAgIGlmICh0b3VjaCAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgb25VcCh0b3VjaCk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5hc3luYyBmdW5jdGlvbiBvblVwKGV2ZW50OiBIYXNDbGllbnRQb3NpdGlvbiwgKSB7XHJcbiAgICBjb25zdCBnYW1lU3RhdGUgPSBTdGF0ZS5nYW1lU3RhdGU7XHJcbiAgICBpZiAoZ2FtZVN0YXRlID09PSB1bmRlZmluZWQpIHJldHVybjtcclxuXHJcbiAgICBjb25zdCB1bmxvY2sgPSBhd2FpdCBTdGF0ZS5sb2NrKCk7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIGlmIChhY3Rpb24gPT09IFwiTm9uZVwiKSB7XHJcbiAgICAgICAgICAgIC8vIGRvIG5vdGhpbmdcclxuICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbiA9PT0gXCJTb3J0QnlSYW5rXCIpIHtcclxuICAgICAgICAgICAgYXdhaXQgU3RhdGUuc29ydEJ5UmFuayhnYW1lU3RhdGUpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoYWN0aW9uID09PSBcIlNvcnRCeVN1aXRcIikge1xyXG4gICAgICAgICAgICBhd2FpdCBTdGF0ZS5zb3J0QnlTdWl0KGdhbWVTdGF0ZSk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24gPT09IFwiV2FpdFwiKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCd3YWl0aW5nJyk7XHJcbiAgICAgICAgICAgIGF3YWl0IFN0YXRlLndhaXQoKTtcclxuICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbiA9PT0gXCJQcm9jZWVkXCIpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ3Byb2NlZWRpbmcnKTtcclxuICAgICAgICAgICAgYXdhaXQgU3RhdGUucHJvY2VlZCgpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoYWN0aW9uID09PSBcIkRlc2VsZWN0XCIpIHtcclxuICAgICAgICAgICAgU3RhdGUuc2VsZWN0ZWRJbmRpY2VzLnNwbGljZSgwLCBTdGF0ZS5zZWxlY3RlZEluZGljZXMubGVuZ3RoKTtcclxuICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbi50eXBlID09PSBcIkRyYXdGcm9tRGVja1wiIHx8IGFjdGlvbi50eXBlID09PSBcIldhaXRpbmdGb3JOZXdDYXJkXCIpIHtcclxuICAgICAgICAgICAgLy8gZG8gbm90aGluZ1xyXG4gICAgICAgIH0gZWxzZSBpZiAoYWN0aW9uLnR5cGUgPT09IFwiUmVvcmRlclwiKSB7XHJcbiAgICAgICAgICAgIHByZXZpb3VzQ2xpY2tJbmRleCA9IGFjdGlvbi5jYXJkSW5kZXg7XHJcbiAgICAgICAgICAgIGF3YWl0IFN0YXRlLnJlb3JkZXJDYXJkcyhnYW1lU3RhdGUpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoYWN0aW9uLnR5cGUgPT09IFwiUmV0dXJuVG9EZWNrXCIpIHtcclxuICAgICAgICAgICAgcHJldmlvdXNDbGlja0luZGV4ID0gLTE7XHJcbiAgICAgICAgICAgIGF3YWl0IFN0YXRlLnJldHVybkNhcmRzVG9EZWNrKGdhbWVTdGF0ZSk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24udHlwZSA9PT0gXCJDb250cm9sU2hpZnRDbGlja1wiKSB7XHJcbiAgICAgICAgICAgIGlmIChwcmV2aW91c0NsaWNrSW5kZXggPT09IC0xKSB7XHJcbiAgICAgICAgICAgICAgICBwcmV2aW91c0NsaWNrSW5kZXggPSBhY3Rpb24uY2FyZEluZGV4O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBzdGFydCA9IE1hdGgubWluKGFjdGlvbi5jYXJkSW5kZXgsIHByZXZpb3VzQ2xpY2tJbmRleCk7XHJcbiAgICAgICAgICAgIGNvbnN0IGVuZCA9IE1hdGgubWF4KGFjdGlvbi5jYXJkSW5kZXgsIHByZXZpb3VzQ2xpY2tJbmRleCk7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSBzdGFydDsgaSA8PSBlbmQ7ICsraSkge1xyXG4gICAgICAgICAgICAgICAgbGV0IGogPSBMaWIuYmluYXJ5U2VhcmNoTnVtYmVyKFN0YXRlLnNlbGVjdGVkSW5kaWNlcywgaSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoaiA8IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBTdGF0ZS5zZWxlY3RlZEluZGljZXMuc3BsaWNlKH5qLCAwLCBpKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSBpZiAoYWN0aW9uLnR5cGUgPT09IFwiQ29udHJvbENsaWNrXCIpIHtcclxuICAgICAgICAgICAgcHJldmlvdXNDbGlja0luZGV4ID0gYWN0aW9uLmNhcmRJbmRleDtcclxuICAgICAgICAgICAgbGV0IGkgPSBMaWIuYmluYXJ5U2VhcmNoTnVtYmVyKFN0YXRlLnNlbGVjdGVkSW5kaWNlcywgYWN0aW9uLmNhcmRJbmRleCk7XHJcbiAgICAgICAgICAgIGlmIChpIDwgMCkge1xyXG4gICAgICAgICAgICAgICAgU3RhdGUuc2VsZWN0ZWRJbmRpY2VzLnNwbGljZSh+aSwgMCwgYWN0aW9uLmNhcmRJbmRleCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBTdGF0ZS5zZWxlY3RlZEluZGljZXMuc3BsaWNlKGksIDEpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24udHlwZSA9PT0gXCJTaGlmdENsaWNrXCIpIHtcclxuICAgICAgICAgICAgaWYgKHByZXZpb3VzQ2xpY2tJbmRleCA9PT0gLTEpIHtcclxuICAgICAgICAgICAgICAgIHByZXZpb3VzQ2xpY2tJbmRleCA9IGFjdGlvbi5jYXJkSW5kZXg7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHN0YXJ0ID0gTWF0aC5taW4oYWN0aW9uLmNhcmRJbmRleCwgcHJldmlvdXNDbGlja0luZGV4KTtcclxuICAgICAgICAgICAgY29uc3QgZW5kID0gTWF0aC5tYXgoYWN0aW9uLmNhcmRJbmRleCwgcHJldmlvdXNDbGlja0luZGV4KTtcclxuICAgICAgICAgICAgU3RhdGUuc2VsZWN0ZWRJbmRpY2VzLnNwbGljZSgwLCBTdGF0ZS5zZWxlY3RlZEluZGljZXMubGVuZ3RoKTtcclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IHN0YXJ0OyBpIDw9IGVuZDsgKytpKSB7XHJcbiAgICAgICAgICAgICAgICBTdGF0ZS5zZWxlY3RlZEluZGljZXMucHVzaChpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSBpZiAoYWN0aW9uLnR5cGUgPT09IFwiQ2xpY2tcIikge1xyXG4gICAgICAgICAgICBwcmV2aW91c0NsaWNrSW5kZXggPSBhY3Rpb24uY2FyZEluZGV4O1xyXG4gICAgICAgICAgICBTdGF0ZS5zZWxlY3RlZEluZGljZXMuc3BsaWNlKDAsIFN0YXRlLnNlbGVjdGVkSW5kaWNlcy5sZW5ndGgsIGFjdGlvbi5jYXJkSW5kZXgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgU3RhdGUuc2V0U3ByaXRlVGFyZ2V0cyhnYW1lU3RhdGUpO1xyXG5cclxuICAgICAgICBhY3Rpb24gPSBcIk5vbmVcIjtcclxuICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgdW5sb2NrKCk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5mdW5jdGlvbiBvbkNhcmREcmF3bihkZWNrU3ByaXRlOiBTcHJpdGUpIHtcclxuICAgIHJldHVybiBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgY29uc3QgZ2FtZVN0YXRlID0gU3RhdGUuZ2FtZVN0YXRlO1xyXG4gICAgICAgIGlmIChnYW1lU3RhdGUgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcblxyXG4gICAgICAgIGNvbnN0IHVubG9jayA9IGF3YWl0IFN0YXRlLmxvY2soKTtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBpZiAoYWN0aW9uICE9PSBcIk5vbmVcIiAmJlxyXG4gICAgICAgICAgICAgICAgYWN0aW9uICE9PSBcIlNvcnRCeVN1aXRcIiAmJlxyXG4gICAgICAgICAgICAgICAgYWN0aW9uICE9PSBcIlNvcnRCeVJhbmtcIiAmJlxyXG4gICAgICAgICAgICAgICAgYWN0aW9uICE9PSBcIldhaXRcIiAmJlxyXG4gICAgICAgICAgICAgICAgYWN0aW9uICE9PSBcIlByb2NlZWRcIiAmJlxyXG4gICAgICAgICAgICAgICAgYWN0aW9uICE9PSBcIkRlc2VsZWN0XCIgJiZcclxuICAgICAgICAgICAgICAgIGFjdGlvbi50eXBlID09PSBcIldhaXRpbmdGb3JOZXdDYXJkXCJcclxuICAgICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBpbW1lZGlhdGVseSBzZWxlY3QgbmV3bHkgYWNxdWlyZWQgY2FyZFxyXG4gICAgICAgICAgICAgICAgY29uc3QgY2FyZEluZGV4ID0gZ2FtZVN0YXRlLnBsYXllckNhcmRzLmxlbmd0aCAtIDE7XHJcbiAgICAgICAgICAgICAgICBTdGF0ZS5zZWxlY3RlZEluZGljZXMuc3BsaWNlKDAsIFN0YXRlLnNlbGVjdGVkSW5kaWNlcy5sZW5ndGgpO1xyXG4gICAgICAgICAgICAgICAgU3RhdGUuc2VsZWN0ZWRJbmRpY2VzLnB1c2goY2FyZEluZGV4KTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBuZXcgY2FyZCBzaG91bGQgYXBwZWFyIGluIHBsYWNlIG9mIGRyYWdnZWQgY2FyZCBmcm9tIGRlY2sgd2l0aG91dCBhbmltYXRpb25cclxuICAgICAgICAgICAgICAgIGNvbnN0IGZhY2VTcHJpdGVBdE1vdXNlRG93biA9IFN0YXRlLmZhY2VTcHJpdGVzRm9yUGxheWVyW2dhbWVTdGF0ZS5wbGF5ZXJJbmRleF0/LltjYXJkSW5kZXhdO1xyXG4gICAgICAgICAgICAgICAgaWYgKGZhY2VTcHJpdGVBdE1vdXNlRG93biA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICAgICAgICAgICAgICAgIGZhY2VTcHJpdGVBdE1vdXNlRG93bi50YXJnZXQgPSBkZWNrU3ByaXRlLnBvc2l0aW9uO1xyXG4gICAgICAgICAgICAgICAgZmFjZVNwcml0ZUF0TW91c2VEb3duLnBvc2l0aW9uID0gZGVja1Nwcml0ZS5wb3NpdGlvbjtcclxuICAgICAgICAgICAgICAgIGZhY2VTcHJpdGVBdE1vdXNlRG93bi52ZWxvY2l0eSA9IGRlY2tTcHJpdGUudmVsb2NpdHk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGRyYWcoZ2FtZVN0YXRlLCBjYXJkSW5kZXgsIGFjdGlvbi5tb3VzZVBvc2l0aW9uVG9TcHJpdGVQb3NpdGlvbik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGZpbmFsbHkge1xyXG4gICAgICAgICAgICB1bmxvY2soKTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG59XHJcblxyXG5mdW5jdGlvbiBkcmFnKGdhbWVTdGF0ZTogTGliLkdhbWVTdGF0ZSwgY2FyZEluZGV4OiBudW1iZXIsIG1vdXNlUG9zaXRpb25Ub1Nwcml0ZVBvc2l0aW9uOiBWZWN0b3IpIHtcclxuICAgIGNvbnN0IHNwcml0ZXMgPSBTdGF0ZS5mYWNlU3ByaXRlc0ZvclBsYXllcltnYW1lU3RhdGUucGxheWVySW5kZXhdO1xyXG4gICAgaWYgKHNwcml0ZXMgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcblxyXG4gICAgY29uc3QgY2FyZHMgPSBnYW1lU3RhdGUucGxheWVyQ2FyZHM7XHJcblxyXG4gICAgY29uc3QgbW92aW5nU3ByaXRlc0FuZENhcmRzOiBbU3ByaXRlLCBMaWIuQ2FyZF1bXSA9IFtdO1xyXG4gICAgY29uc3QgcmVzZXJ2ZWRTcHJpdGVzQW5kQ2FyZHM6IFtTcHJpdGUsIExpYi5DYXJkXVtdID0gW107XHJcblxyXG4gICAgbGV0IHNwbGl0SW5kZXg6IG51bWJlciB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcclxuICAgIGxldCBzaGFyZUNvdW50ID0gZ2FtZVN0YXRlLnBsYXllclNoYXJlQ291bnQ7XHJcbiAgICBsZXQgcmV2ZWFsQ291bnQgPSBnYW1lU3RhdGUucGxheWVyUmV2ZWFsQ291bnQ7XHJcblxyXG4gICAgLy8gZXh0cmFjdCBtb3Zpbmcgc3ByaXRlc1xyXG4gICAgZm9yIChjb25zdCBpIG9mIFN0YXRlLnNlbGVjdGVkSW5kaWNlcykge1xyXG4gICAgICAgIGNvbnN0IHNwcml0ZSA9IHNwcml0ZXNbaV07XHJcbiAgICAgICAgY29uc3QgY2FyZCA9IGNhcmRzW2ldO1xyXG4gICAgICAgIGlmIChzcHJpdGUgPT09IHVuZGVmaW5lZCB8fCBjYXJkID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG4gICAgICAgIG1vdmluZ1Nwcml0ZXNBbmRDYXJkcy5wdXNoKFtzcHJpdGUsIGNhcmRdKTtcclxuXHJcbiAgICAgICAgaWYgKGkgPCBnYW1lU3RhdGUucGxheWVyU2hhcmVDb3VudCkge1xyXG4gICAgICAgICAgICAtLXNoYXJlQ291bnQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoaSA8IGdhbWVTdGF0ZS5wbGF5ZXJSZXZlYWxDb3VudCkge1xyXG4gICAgICAgICAgICAtLXJldmVhbENvdW50O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBleHRyYWN0IHJlc2VydmVkIHNwcml0ZXNcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc3ByaXRlcy5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgIGlmIChMaWIuYmluYXJ5U2VhcmNoTnVtYmVyKFN0YXRlLnNlbGVjdGVkSW5kaWNlcywgaSkgPCAwKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHNwcml0ZSA9IHNwcml0ZXNbaV07XHJcbiAgICAgICAgICAgIGNvbnN0IGNhcmQgPSBjYXJkc1tpXTtcclxuICAgICAgICAgICAgaWYgKHNwcml0ZSA9PT0gdW5kZWZpbmVkIHx8IGNhcmQgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICAgICAgICAgIHJlc2VydmVkU3ByaXRlc0FuZENhcmRzLnB1c2goW3Nwcml0ZSwgY2FyZF0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBmaW5kIHRoZSBoZWxkIHNwcml0ZXMsIGlmIGFueSwgb3ZlcmxhcHBlZCBieSB0aGUgZHJhZ2dlZCBzcHJpdGVzXHJcbiAgICBjb25zdCBsZWZ0TW92aW5nU3ByaXRlID0gbW92aW5nU3ByaXRlc0FuZENhcmRzWzBdPy5bMF07XHJcbiAgICBjb25zdCByaWdodE1vdmluZ1Nwcml0ZSA9IG1vdmluZ1Nwcml0ZXNBbmRDYXJkc1ttb3ZpbmdTcHJpdGVzQW5kQ2FyZHMubGVuZ3RoIC0gMV0/LlswXTtcclxuICAgIGlmIChsZWZ0TW92aW5nU3ByaXRlID09PSB1bmRlZmluZWQgfHwgcmlnaHRNb3ZpbmdTcHJpdGUgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcigpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGRlY2tEaXN0YW5jZSA9IE1hdGguYWJzKGxlZnRNb3ZpbmdTcHJpdGUudGFyZ2V0LnkgLSAoU3RhdGUuZGVja1Nwcml0ZXNbMF0/LnBvc2l0aW9uLnkgPz8gSW5maW5pdHkpKTtcclxuICAgIGNvbnN0IHJldmVhbERpc3RhbmNlID0gTWF0aC5hYnMobGVmdE1vdmluZ1Nwcml0ZS50YXJnZXQueSAtIChWUC5jYW52YXMuaGVpZ2h0IC0gMiAqIFZQLnNwcml0ZUhlaWdodCkpO1xyXG4gICAgY29uc3QgaGlkZURpc3RhbmNlID0gTWF0aC5hYnMobGVmdE1vdmluZ1Nwcml0ZS50YXJnZXQueSAtIChWUC5jYW52YXMuaGVpZ2h0IC0gVlAuc3ByaXRlSGVpZ2h0KSk7XHJcblxyXG4gICAgLy8gc2V0IHRoZSBhY3Rpb24gZm9yIG9ubW91c2V1cFxyXG4gICAgaWYgKGRlY2tEaXN0YW5jZSA8IHJldmVhbERpc3RhbmNlICYmIGRlY2tEaXN0YW5jZSA8IGhpZGVEaXN0YW5jZSkge1xyXG4gICAgICAgIGFjdGlvbiA9IHsgY2FyZEluZGV4LCBtb3VzZVBvc2l0aW9uVG9TcHJpdGVQb3NpdGlvbiwgdHlwZTogXCJSZXR1cm5Ub0RlY2tcIiB9O1xyXG5cclxuICAgICAgICBzcGxpdEluZGV4ID0gcmVzZXJ2ZWRTcHJpdGVzQW5kQ2FyZHMubGVuZ3RoO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBhY3Rpb24gPSB7IGNhcmRJbmRleCwgbW91c2VQb3NpdGlvblRvU3ByaXRlUG9zaXRpb24sIHR5cGU6IFwiUmVvcmRlclwiIH07XHJcblxyXG4gICAgICAgIC8vIGRldGVybWluZSB3aGV0aGVyIHRoZSBtb3Zpbmcgc3ByaXRlcyBhcmUgY2xvc2VyIHRvIHRoZSByZXZlYWxlZCBzcHJpdGVzIG9yIHRvIHRoZSBoaWRkZW4gc3ByaXRlc1xyXG4gICAgICAgIGNvbnN0IHNwbGl0UmV2ZWFsZWQgPSByZXZlYWxEaXN0YW5jZSA8IGhpZGVEaXN0YW5jZTtcclxuICAgICAgICBsZXQgc3BsaXRTaGFyZWQ6IGJvb2xlYW47XHJcbiAgICAgICAgbGV0IHNwZWNpYWxTcGxpdDogYm9vbGVhbjtcclxuICAgICAgICBsZXQgc3RhcnQ6IG51bWJlcjtcclxuICAgICAgICBsZXQgZW5kOiBudW1iZXI7XHJcbiAgICAgICAgaWYgKHNwbGl0UmV2ZWFsZWQpIHtcclxuICAgICAgICAgICAgaWYgKGxlZnRNb3ZpbmdTcHJpdGUudGFyZ2V0LnggPCBWUC5jYW52YXMud2lkdGggLyAyICYmXHJcbiAgICAgICAgICAgICAgICBWUC5jYW52YXMud2lkdGggLyAyIDwgcmlnaHRNb3ZpbmdTcHJpdGUudGFyZ2V0LnggKyBWUC5zcHJpdGVXaWR0aFxyXG4gICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgIHNwbGl0SW5kZXggPSBzaGFyZUNvdW50O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBzcGxpdFNoYXJlZCA9IChsZWZ0TW92aW5nU3ByaXRlLnRhcmdldC54ICsgcmlnaHRNb3ZpbmdTcHJpdGUudGFyZ2V0LnggKyBWUC5zcHJpdGVXaWR0aCkgLyAyIDwgVlAuY2FudmFzLndpZHRoIC8gMjtcclxuICAgICAgICAgICAgaWYgKHNwbGl0U2hhcmVkKSB7XHJcbiAgICAgICAgICAgICAgICBzdGFydCA9IDA7XHJcbiAgICAgICAgICAgICAgICBlbmQgPSBzaGFyZUNvdW50O1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgc3RhcnQgPSBzaGFyZUNvdW50O1xyXG4gICAgICAgICAgICAgICAgZW5kID0gcmV2ZWFsQ291bnQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBzcGxpdFNoYXJlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICBzcGVjaWFsU3BsaXQgPSBmYWxzZTtcclxuICAgICAgICAgICAgc3RhcnQgPSByZXZlYWxDb3VudDtcclxuICAgICAgICAgICAgZW5kID0gcmVzZXJ2ZWRTcHJpdGVzQW5kQ2FyZHMubGVuZ3RoO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHNwbGl0SW5kZXggPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICBsZXQgbGVmdEluZGV4OiBudW1iZXIgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIGxldCByaWdodEluZGV4OiBudW1iZXIgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSBzdGFydDsgaSA8IGVuZDsgKytpKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCByZXNlcnZlZFNwcml0ZSA9IHJlc2VydmVkU3ByaXRlc0FuZENhcmRzW2ldPy5bMF07XHJcbiAgICAgICAgICAgICAgICBpZiAocmVzZXJ2ZWRTcHJpdGUgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICAgICAgICAgICAgICBpZiAobGVmdE1vdmluZ1Nwcml0ZS50YXJnZXQueCA8IHJlc2VydmVkU3ByaXRlLnRhcmdldC54ICYmXHJcbiAgICAgICAgICAgICAgICAgICAgcmVzZXJ2ZWRTcHJpdGUudGFyZ2V0LnggPCByaWdodE1vdmluZ1Nwcml0ZS50YXJnZXQueFxyXG4gICAgICAgICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGxlZnRJbmRleCA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxlZnRJbmRleCA9IGk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIHJpZ2h0SW5kZXggPSBpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgICAgIGlmIChsZWZ0SW5kZXggIT09IHVuZGVmaW5lZCAmJiByaWdodEluZGV4ICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGxlZnRSZXNlcnZlZFNwcml0ZSA9IHJlc2VydmVkU3ByaXRlc0FuZENhcmRzW2xlZnRJbmRleF0/LlswXTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJpZ2h0UmVzZXJ2ZWRTcHJpdGUgPSByZXNlcnZlZFNwcml0ZXNBbmRDYXJkc1tyaWdodEluZGV4XT8uWzBdO1xyXG4gICAgICAgICAgICAgICAgaWYgKGxlZnRSZXNlcnZlZFNwcml0ZSA9PT0gdW5kZWZpbmVkIHx8IHJpZ2h0UmVzZXJ2ZWRTcHJpdGUgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBsZWZ0R2FwID0gbGVmdFJlc2VydmVkU3ByaXRlLnRhcmdldC54IC0gbGVmdE1vdmluZ1Nwcml0ZS50YXJnZXQueDtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJpZ2h0R2FwID0gcmlnaHRNb3ZpbmdTcHJpdGUudGFyZ2V0LnggLSByaWdodFJlc2VydmVkU3ByaXRlLnRhcmdldC54O1xyXG4gICAgICAgICAgICAgICAgaWYgKGxlZnRHYXAgPCByaWdodEdhcCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHNwbGl0SW5kZXggPSBsZWZ0SW5kZXg7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHNwbGl0SW5kZXggPSByaWdodEluZGV4ICsgMTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICBpZiAoc3BsaXRJbmRleCA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIC8vIG5vIG92ZXJsYXBwZWQgc3ByaXRlcywgc28gdGhlIGluZGV4IGlzIHRoZSBmaXJzdCByZXNlcnZlZCBzcHJpdGUgdG8gdGhlIHJpZ2h0IG9mIHRoZSBtb3Zpbmcgc3ByaXRlc1xyXG4gICAgICAgICAgICBmb3IgKHNwbGl0SW5kZXggPSBzdGFydDsgc3BsaXRJbmRleCA8IGVuZDsgKytzcGxpdEluZGV4KSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCByZXNlcnZlZFNwcml0ZSA9IHJlc2VydmVkU3ByaXRlc0FuZENhcmRzW3NwbGl0SW5kZXhdPy5bMF07XHJcbiAgICAgICAgICAgICAgICBpZiAocmVzZXJ2ZWRTcHJpdGUgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICAgICAgICAgICAgICBpZiAocmlnaHRNb3ZpbmdTcHJpdGUudGFyZ2V0LnggPCByZXNlcnZlZFNwcml0ZS50YXJnZXQueCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBhZGp1c3Qgc2hhcmUgY291bnRcclxuICAgICAgICBpZiAoc3BsaXRJbmRleCA8IHNoYXJlQ291bnQgfHwgc3BsaXRJbmRleCA9PT0gc2hhcmVDb3VudCAmJiBzcGxpdFNoYXJlZCkge1xyXG4gICAgICAgICAgICBzaGFyZUNvdW50ICs9IG1vdmluZ1Nwcml0ZXNBbmRDYXJkcy5sZW5ndGg7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBzZXQgc2hhcmVDb3VudCB0byAke3NoYXJlQ291bnR9YCk7XHJcbiAgICAgICAgfVxyXG4gICAgXHJcbiAgICAgICAgLy8gYWRqdXN0IHJldmVhbCBjb3VudFxyXG4gICAgICAgIGlmIChzcGxpdEluZGV4IDwgcmV2ZWFsQ291bnQgfHwgc3BsaXRJbmRleCA9PT0gcmV2ZWFsQ291bnQgJiYgc3BsaXRSZXZlYWxlZCkge1xyXG4gICAgICAgICAgICByZXZlYWxDb3VudCArPSBtb3ZpbmdTcHJpdGVzQW5kQ2FyZHMubGVuZ3RoO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgc2V0IHJldmVhbENvdW50IHRvICR7cmV2ZWFsQ291bnR9YCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIGFkanVzdCBzZWxlY3RlZCBpbmRpY2VzXHJcbiAgICAvLyBtb2RpZnlpbmcgYWN0aW9uLmNhcmRJbmRleCBkaXJlY3RseSBpbiB0aGUgbG9vcCB3b3VsZCBjYXVzZSB1cyB0b1xyXG4gICAgLy8gY2hlY2sgaXRzIGFkanVzdGVkIHZhbHVlIGFnYWluc3Qgb2xkIGluZGljZXMsIHdoaWNoIGlzIGluY29ycmVjdFxyXG4gICAgbGV0IG5ld0NhcmRJbmRleCA9IGFjdGlvbi5jYXJkSW5kZXg7XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IFN0YXRlLnNlbGVjdGVkSW5kaWNlcy5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgIGlmIChhY3Rpb24uY2FyZEluZGV4ID09PSBTdGF0ZS5zZWxlY3RlZEluZGljZXNbaV0pIHtcclxuICAgICAgICAgICAgbmV3Q2FyZEluZGV4ID0gc3BsaXRJbmRleCArIGk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBTdGF0ZS5zZWxlY3RlZEluZGljZXNbaV0gPSBzcGxpdEluZGV4ICsgaTtcclxuICAgIH1cclxuXHJcbiAgICBhY3Rpb24uY2FyZEluZGV4ID0gbmV3Q2FyZEluZGV4O1xyXG5cclxuICAgIC8vIGRyYWcgYWxsIHNlbGVjdGVkIGNhcmRzIGFzIGEgZ3JvdXAgYXJvdW5kIHRoZSBjYXJkIHVuZGVyIHRoZSBtb3VzZSBwb3NpdGlvblxyXG4gICAgZm9yIChjb25zdCBzZWxlY3RlZEluZGV4IG9mIFN0YXRlLnNlbGVjdGVkSW5kaWNlcykge1xyXG4gICAgICAgIGNvbnN0IG1vdmluZ1Nwcml0ZUFuZENhcmQgPSBtb3ZpbmdTcHJpdGVzQW5kQ2FyZHNbc2VsZWN0ZWRJbmRleCAtIHNwbGl0SW5kZXhdO1xyXG4gICAgICAgIGlmIChtb3ZpbmdTcHJpdGVBbmRDYXJkID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG4gICAgICAgIGNvbnN0IFttb3ZpbmdTcHJpdGUsIG1vdmluZ0NhcmRdID0gbW92aW5nU3ByaXRlQW5kQ2FyZDtcclxuICAgICAgICBtb3ZpbmdTcHJpdGUudGFyZ2V0ID0gbW91c2VNb3ZlUG9zaXRpb25cclxuICAgICAgICAgICAgLmFkZChtb3VzZVBvc2l0aW9uVG9TcHJpdGVQb3NpdGlvbilcclxuICAgICAgICAgICAgLmFkZChuZXcgVmVjdG9yKChzZWxlY3RlZEluZGV4IC0gYWN0aW9uLmNhcmRJbmRleCkgKiBWUC5zcHJpdGVHYXAsIDApKTtcclxuICAgICAgICBjb25zb2xlLmxvZyhgcmVhcnJhbmdlZCBzcHJpdGUgJHtzZWxlY3RlZEluZGV4fWApO1xyXG4gICAgfVxyXG5cclxuICAgIFN0YXRlLnNldFNwcml0ZVRhcmdldHMoXHJcbiAgICAgICAgZ2FtZVN0YXRlLFxyXG4gICAgICAgIHJlc2VydmVkU3ByaXRlc0FuZENhcmRzLFxyXG4gICAgICAgIG1vdmluZ1Nwcml0ZXNBbmRDYXJkcyxcclxuICAgICAgICBzaGFyZUNvdW50LFxyXG4gICAgICAgIHJldmVhbENvdW50LFxyXG4gICAgICAgIHNwbGl0SW5kZXgsXHJcbiAgICAgICAgYWN0aW9uLnR5cGUgPT09IFwiUmV0dXJuVG9EZWNrXCJcclxuICAgICk7XHJcbn0iLCJpbXBvcnQgKiBhcyBMaWIgZnJvbSBcIi4uL2xpYlwiO1xyXG5cclxuY29uc3QgcGxheWVyTmFtZUVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGxheWVyTmFtZScpO1xyXG5jb25zdCBwbGF5ZXJOYW1lVmFsdWUgPSBMaWIuZ2V0Q29va2llKCdwbGF5ZXJOYW1lJyk7XHJcbmlmIChwbGF5ZXJOYW1lRWxlbWVudCAhPT0gbnVsbCAmJiBwbGF5ZXJOYW1lVmFsdWUgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgKDxIVE1MSW5wdXRFbGVtZW50PnBsYXllck5hbWVFbGVtZW50KS52YWx1ZSA9IGRlY29kZVVSSShwbGF5ZXJOYW1lVmFsdWUpO1xyXG59XHJcblxyXG5jb25zdCBnYW1lSWRFbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2dhbWVJZCcpO1xyXG5jb25zdCBnYW1lSWRWYWx1ZSA9IExpYi5nZXRDb29raWUoJ2dhbWVJZCcpO1xyXG5pZiAoZ2FtZUlkRWxlbWVudCAhPT0gbnVsbCAmJiBnYW1lSWRWYWx1ZSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAoPEhUTUxJbnB1dEVsZW1lbnQ+Z2FtZUlkRWxlbWVudCkudmFsdWUgPSBnYW1lSWRWYWx1ZTtcclxufVxyXG4iLCJpbXBvcnQgeyByYW5kb20gfSBmcm9tICduYW5vaWQnO1xyXG5cclxuaW1wb3J0ICogYXMgTGliIGZyb20gJy4uL2xpYic7XHJcbmltcG9ydCAqIGFzIFN0YXRlIGZyb20gJy4vc3RhdGUnO1xyXG5pbXBvcnQgKiBhcyBJbnB1dCBmcm9tICcuL2lucHV0JztcclxuaW1wb3J0ICogYXMgVlAgZnJvbSAnLi92aWV3LXBhcmFtcyc7XHJcbmltcG9ydCBWZWN0b3IgZnJvbSAnLi92ZWN0b3InO1xyXG5cclxuY29uc3QgZGVja0RlYWxEdXJhdGlvbiA9IDEwMDA7XHJcbmxldCBkZWNrRGVhbFRpbWU6IG51bWJlciB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcclxubGV0IGN1cnJlbnRUaW1lOiBudW1iZXIgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVuZGVyKHRpbWU6IG51bWJlcikge1xyXG4gICAgd2hpbGUgKFN0YXRlLmdhbWVTdGF0ZSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgYXdhaXQgTGliLmRlbGF5KDEwMCk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgZGVsdGFUaW1lID0gdGltZSAtIChjdXJyZW50VGltZSAhPT0gdW5kZWZpbmVkID8gY3VycmVudFRpbWUgOiB0aW1lKTtcclxuICAgIGN1cnJlbnRUaW1lID0gdGltZTtcclxuXHJcbiAgICBjb25zdCB1bmxvY2sgPSBhd2FpdCBTdGF0ZS5sb2NrKCk7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIC8vIGNsZWFyIHRoZSBzY3JlZW5cclxuICAgICAgICBWUC5jb250ZXh0LmNsZWFyUmVjdCgwLCAwLCBWUC5jYW52YXMud2lkdGgsIFZQLmNhbnZhcy5oZWlnaHQpO1xyXG5cclxuICAgICAgICByZW5kZXJCYXNpY3MoU3RhdGUuZ2FtZUlkLCBTdGF0ZS5wbGF5ZXJOYW1lKTtcclxuICAgICAgICByZW5kZXJEZWNrKHRpbWUsIGRlbHRhVGltZSwgU3RhdGUuZ2FtZVN0YXRlLmRlY2tDb3VudCk7XHJcbiAgICAgICAgcmVuZGVyT3RoZXJQbGF5ZXJzKGRlbHRhVGltZSwgU3RhdGUuZ2FtZVN0YXRlKTtcclxuICAgICAgICByZW5kZXJQbGF5ZXIoZGVsdGFUaW1lLCBTdGF0ZS5nYW1lU3RhdGUpO1xyXG4gICAgICAgIHJlbmRlckJ1dHRvbnModGltZSwgU3RhdGUuZ2FtZVN0YXRlKTtcclxuICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgdW5sb2NrKCk7XHJcbiAgICB9XHJcblxyXG4gICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShyZW5kZXIpO1xyXG59XHJcbi8qXHJcbmNvbnN0IHdpZ2dsZXMgPSBuZXcgTWFwPHN0cmluZywgW3N0cmluZywgbnVtYmVyW10sIG51bWJlcl0+KCk7XHJcbmNvbnN0IHdpZ2dsZUludGVydmFsID0gMTAwO1xyXG5mdW5jdGlvbiB3aWdnbGVUZXh0KHM6IHN0cmluZywgeDogbnVtYmVyLCB5OiBudW1iZXIpIHtcclxuICAgIGlmIChjdXJyZW50VGltZSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGxvd2VyID0gcy50b0xvd2VyQ2FzZSgpO1xyXG4gICAgbGV0IHdpZ2dsZSA9IHdpZ2dsZXMuZ2V0KGxvd2VyKTtcclxuICAgIGlmICh3aWdnbGUgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIGNvbnN0IHVwcGVyID0gcy50b1VwcGVyQ2FzZSgpO1xyXG4gICAgICAgIGNvbnN0IHdpZHRocyA9IFtdO1xyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbG93ZXIubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAgICAgd2lkdGhzLnB1c2goKFxyXG4gICAgICAgICAgICAgICAgVlAuY29udGV4dC5tZWFzdXJlVGV4dCg8c3RyaW5nPmxvd2VyW2ldKS53aWR0aCArXHJcbiAgICAgICAgICAgICAgICBWUC5jb250ZXh0Lm1lYXN1cmVUZXh0KDxzdHJpbmc+dXBwZXJbaV0pLndpZHRoKSAvIDIpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgd2lnZ2xlID0gW3MsIHdpZHRocywgY3VycmVudFRpbWVdO1xyXG4gICAgICAgIHdpZ2dsZXMuc2V0KGxvd2VyLCB3aWdnbGUpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IFtzcywgd3MsIHRdID0gd2lnZ2xlO1xyXG4gICAgcyA9IFwiXCI7XHJcbiAgICBsZXQgdHQgPSB0O1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzcy5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgIGxldCBjID0gPHN0cmluZz5zc1tpXTtcclxuICAgICAgICBpZiAodCArIHdpZ2dsZUludGVydmFsIDwgY3VycmVudFRpbWUpIHtcclxuICAgICAgICAgICAgdHQgPSBjdXJyZW50VGltZTtcclxuICAgICAgICAgICAgaWYgKDxudW1iZXI+cmFuZG9tKDEpWzBdIDwgMTI3KSB7XHJcbiAgICAgICAgICAgICAgICBjID0gYy50b1VwcGVyQ2FzZSgpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgYyA9IGMudG9Mb3dlckNhc2UoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcyArPSBjO1xyXG4gICAgICAgIFZQLmNvbnRleHQuZmlsbFRleHQoYywgeCArPSA8bnVtYmVyPndzW2ldLCB5KTtcclxuICAgIH1cclxuXHJcbiAgICB3aWdnbGVzLnNldChsb3dlciwgW3MsIHdzLCB0dF0pO1xyXG59XHJcbiovXHJcbmZ1bmN0aW9uIHJlbmRlckJhc2ljcyhnYW1lSWQ6IHN0cmluZywgcGxheWVyTmFtZTogc3RyaW5nKSB7XHJcbiAgICBWUC5jb250ZXh0LmZpbGxTdHlsZSA9ICcjMDAwMDAwZmYnO1xyXG4gICAgVlAuY29udGV4dC50ZXh0QWxpZ24gPSAnbGVmdCc7XHJcbiAgICBWUC5jb250ZXh0LmZvbnQgPSBgJHtWUC5zcHJpdGVIZWlnaHQgLyA0fXB4IFN1Z2FybGlrZWA7XHJcbiAgICBWUC5jb250ZXh0LmZpbGxTdHlsZSA9ICdmb250LXZhcmlhbnQtZWFzdC1hc2lhbjogZnVsbC13aWR0aCc7XHJcblxyXG4gICAgVlAuY29udGV4dC50ZXh0QmFzZWxpbmUgPSAndG9wJztcclxuICAgIFZQLmNvbnRleHQuZmlsbFRleHQoYEdhbWU6ICR7Z2FtZUlkfWAsIDAsIDEgKiBWUC5waXhlbHNQZXJQZXJjZW50KTtcclxuXHJcbiAgICBWUC5jb250ZXh0LnRleHRCYXNlbGluZSA9ICdib3R0b20nO1xyXG4gICAgVlAuY29udGV4dC5maWxsVGV4dChgWW91ciBuYW1lIGlzOiAke3BsYXllck5hbWV9YCwgMCwgVlAuY2FudmFzLmhlaWdodCk7XHJcblxyXG4gICAgVlAuY29udGV4dC5zZXRMaW5lRGFzaChbNCwgMV0pO1xyXG4gICAgVlAuY29udGV4dC5zdHJva2VSZWN0KFZQLnNwcml0ZUhlaWdodCwgVlAuc3ByaXRlSGVpZ2h0LCBWUC5jYW52YXMud2lkdGggLSAyICogVlAuc3ByaXRlSGVpZ2h0LCBWUC5jYW52YXMuaGVpZ2h0IC0gMiAqIFZQLnNwcml0ZUhlaWdodCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbmRlckRlY2sodGltZTogbnVtYmVyLCBkZWx0YVRpbWU6IG51bWJlciwgZGVja0NvdW50OiBudW1iZXIpIHtcclxuICAgIFZQLmNvbnRleHQuc2F2ZSgpO1xyXG4gICAgdHJ5IHtcclxuICAgICAgICBpZiAoZGVja0RlYWxUaW1lID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgZGVja0RlYWxUaW1lID0gdGltZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgU3RhdGUuZGVja1Nwcml0ZXMubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAgICAgY29uc3QgZGVja1Nwcml0ZSA9IFN0YXRlLmRlY2tTcHJpdGVzW2ldO1xyXG4gICAgICAgICAgICBpZiAoZGVja1Nwcml0ZSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChpID09PSBkZWNrQ291bnQgLSAxICYmXHJcbiAgICAgICAgICAgICAgICBJbnB1dC5hY3Rpb24gIT09IFwiTm9uZVwiICYmXHJcbiAgICAgICAgICAgICAgICBJbnB1dC5hY3Rpb24gIT09IFwiU29ydEJ5U3VpdFwiICYmXHJcbiAgICAgICAgICAgICAgICBJbnB1dC5hY3Rpb24gIT09IFwiU29ydEJ5UmFua1wiICYmXHJcbiAgICAgICAgICAgICAgICBJbnB1dC5hY3Rpb24gIT09IFwiV2FpdFwiICYmXHJcbiAgICAgICAgICAgICAgICBJbnB1dC5hY3Rpb24gIT09IFwiUHJvY2VlZFwiICYmXHJcbiAgICAgICAgICAgICAgICBJbnB1dC5hY3Rpb24gIT09IFwiRGVzZWxlY3RcIiAmJiAoXHJcbiAgICAgICAgICAgICAgICBJbnB1dC5hY3Rpb24udHlwZSA9PT0gXCJEcmF3RnJvbURlY2tcIiB8fFxyXG4gICAgICAgICAgICAgICAgSW5wdXQuYWN0aW9uLnR5cGUgPT09IFwiV2FpdGluZ0Zvck5ld0NhcmRcIlxyXG4gICAgICAgICAgICApKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBzZXQgaW4gb25tb3VzZW1vdmVcclxuICAgICAgICAgICAgfSBlbHNlIGlmICh0aW1lIC0gZGVja0RlYWxUaW1lIDwgaSAqIGRlY2tEZWFsRHVyYXRpb24gLyBkZWNrQ291bnQpIHtcclxuICAgICAgICAgICAgICAgIC8vIGNhcmQgbm90IHlldCBkZWFsdDsga2VlcCB0b3AgbGVmdFxyXG4gICAgICAgICAgICAgICAgZGVja1Nwcml0ZS5wb3NpdGlvbiA9IG5ldyBWZWN0b3IoLVZQLnNwcml0ZVdpZHRoLCAtVlAuc3ByaXRlSGVpZ2h0KTtcclxuICAgICAgICAgICAgICAgIGRlY2tTcHJpdGUudGFyZ2V0ID0gbmV3IFZlY3RvcigtVlAuc3ByaXRlV2lkdGgsIC1WUC5zcHJpdGVIZWlnaHQpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgZGVja1Nwcml0ZS50YXJnZXQgPSBuZXcgVmVjdG9yKFxyXG4gICAgICAgICAgICAgICAgICAgIFZQLmNhbnZhcy53aWR0aCAvIDIgLSBWUC5zcHJpdGVXaWR0aCAvIDIgLSAoaSAtIGRlY2tDb3VudCAvIDIpICogVlAuc3ByaXRlRGVja0dhcCxcclxuICAgICAgICAgICAgICAgICAgICBWUC5jYW52YXMuaGVpZ2h0IC8gMiAtIFZQLnNwcml0ZUhlaWdodCAvIDJcclxuICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGRlY2tTcHJpdGUuYW5pbWF0ZShkZWx0YVRpbWUpO1xyXG4gICAgICAgIH1cclxuICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgVlAuY29udGV4dC5yZXN0b3JlKCk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbmRlck90aGVyUGxheWVycyhkZWx0YVRpbWU6IG51bWJlciwgZ2FtZVN0YXRlOiBMaWIuR2FtZVN0YXRlKSB7XHJcbiAgICBWUC5jb250ZXh0LnNhdmUoKTtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgVlAuY29udGV4dC5zZXRUcmFuc2Zvcm0oVlAuZ2V0VHJhbnNmb3JtRm9yUGxheWVyKDEpKTtcclxuICAgICAgICAvL1ZQLmNvbnRleHQudHJhbnNsYXRlKDAsIChWUC5jYW52YXMud2lkdGggKyBWUC5jYW52YXMuaGVpZ2h0KSAvIDIpO1xyXG4gICAgICAgIC8vVlAuY29udGV4dC5yb3RhdGUoLU1hdGguUEkgLyAyKTtcclxuICAgICAgICByZW5kZXJPdGhlclBsYXllcihkZWx0YVRpbWUsIGdhbWVTdGF0ZSwgKGdhbWVTdGF0ZS5wbGF5ZXJJbmRleCArIDEpICUgNCk7XHJcbiAgICB9IGZpbmFsbHkge1xyXG4gICAgICAgIFZQLmNvbnRleHQucmVzdG9yZSgpO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBWUC5jb250ZXh0LnNhdmUoKTtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgVlAuY29udGV4dC5zZXRUcmFuc2Zvcm0oVlAuZ2V0VHJhbnNmb3JtRm9yUGxheWVyKDIpKTtcclxuICAgICAgICByZW5kZXJPdGhlclBsYXllcihkZWx0YVRpbWUsIGdhbWVTdGF0ZSwgKGdhbWVTdGF0ZS5wbGF5ZXJJbmRleCArIDIpICUgNCk7XHJcbiAgICB9IGZpbmFsbHkge1xyXG4gICAgICAgIFZQLmNvbnRleHQucmVzdG9yZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIFZQLmNvbnRleHQuc2F2ZSgpO1xyXG4gICAgdHJ5IHtcclxuICAgICAgICBWUC5jb250ZXh0LnNldFRyYW5zZm9ybShWUC5nZXRUcmFuc2Zvcm1Gb3JQbGF5ZXIoMykpO1xyXG4gICAgICAgIC8vVlAuY29udGV4dC50cmFuc2xhdGUoVlAuY2FudmFzLndpZHRoLCAoVlAuY2FudmFzLmhlaWdodCAtIFZQLmNhbnZhcy53aWR0aCkgLyAyKTtcclxuICAgICAgICAvL1ZQLmNvbnRleHQucm90YXRlKE1hdGguUEkgLyAyKTtcclxuICAgICAgICByZW5kZXJPdGhlclBsYXllcihkZWx0YVRpbWUsIGdhbWVTdGF0ZSwgKGdhbWVTdGF0ZS5wbGF5ZXJJbmRleCArIDMpICUgNCk7XHJcbiAgICB9IGZpbmFsbHkge1xyXG4gICAgICAgIFZQLmNvbnRleHQucmVzdG9yZSgpO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiByZW5kZXJPdGhlclBsYXllcihkZWx0YVRpbWU6IG51bWJlciwgZ2FtZVN0YXRlOiBMaWIuR2FtZVN0YXRlLCBwbGF5ZXJJbmRleDogbnVtYmVyKSB7XHJcbiAgICBjb25zdCBwbGF5ZXIgPSBnYW1lU3RhdGUub3RoZXJQbGF5ZXJzW3BsYXllckluZGV4XTtcclxuICAgIGlmIChwbGF5ZXIgPT09IHVuZGVmaW5lZCB8fCBwbGF5ZXIgPT09IG51bGwpIHJldHVybjtcclxuXHJcbiAgICBjb25zdCBmYWNlU3ByaXRlcyA9IFN0YXRlLmZhY2VTcHJpdGVzRm9yUGxheWVyW3BsYXllckluZGV4XSA/PyBbXTtcclxuICAgIGxldCBpID0gMDtcclxuICAgIGZvciAoY29uc3QgZmFjZVNwcml0ZSBvZiBmYWNlU3ByaXRlcykge1xyXG4gICAgICAgIGlmIChpIDwgcGxheWVyLnNoYXJlQ291bnQpIHtcclxuICAgICAgICAgICAgZmFjZVNwcml0ZS50YXJnZXQgPSBuZXcgVmVjdG9yKFxyXG4gICAgICAgICAgICAgICAgVlAuY2FudmFzLndpZHRoIC8gMiArIChwbGF5ZXIuc2hhcmVDb3VudCAtIGkpICogVlAuc3ByaXRlR2FwLFxyXG4gICAgICAgICAgICAgICAgVlAuc3ByaXRlSGVpZ2h0ICsgVlAuc3ByaXRlR2FwXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgZmFjZVNwcml0ZS50YXJnZXQgPSBuZXcgVmVjdG9yKFxyXG4gICAgICAgICAgICAgICAgVlAuY2FudmFzLndpZHRoIC8gMiAtIFZQLnNwcml0ZVdpZHRoIC0gKGkgLSBwbGF5ZXIuc2hhcmVDb3VudCkgKiBWUC5zcHJpdGVHYXAsXHJcbiAgICAgICAgICAgICAgICBWUC5zcHJpdGVIZWlnaHRcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZhY2VTcHJpdGUuYW5pbWF0ZShkZWx0YVRpbWUpO1xyXG5cclxuICAgICAgICArK2k7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgYmFja1Nwcml0ZXMgPSBTdGF0ZS5iYWNrU3ByaXRlc0ZvclBsYXllcltwbGF5ZXJJbmRleF0gPz8gW107XHJcbiAgICBpID0gMDtcclxuICAgIGZvciAoY29uc3QgYmFja1Nwcml0ZSBvZiBiYWNrU3ByaXRlcykge1xyXG4gICAgICAgIGJhY2tTcHJpdGUudGFyZ2V0ID0gbmV3IFZlY3RvcihWUC5jYW52YXMud2lkdGggLyAyIC0gVlAuc3ByaXRlV2lkdGggLyAyICsgKGkgLSBiYWNrU3ByaXRlcy5sZW5ndGggLyAyKSAqIFZQLnNwcml0ZUdhcCwgMCk7XHJcbiAgICAgICAgYmFja1Nwcml0ZS5hbmltYXRlKGRlbHRhVGltZSk7XHJcblxyXG4gICAgICAgICsraTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgVlAuY29udGV4dC5maWxsU3R5bGUgPSAnIzAwMDAwMGZmJztcclxuICAgIFZQLmNvbnRleHQuZm9udCA9IGAke1ZQLnNwcml0ZUhlaWdodCAvIDJ9cHggU3VnYXJsaWtlYDtcclxuICAgIFZQLmNvbnRleHQudGV4dEJhc2VsaW5lID0gXCJtaWRkbGVcIjtcclxuICAgIFZQLmNvbnRleHQudGV4dEFsaWduID0gXCJjZW50ZXJcIjtcclxuICAgIFZQLmNvbnRleHQuZmlsbFRleHQocGxheWVyLm5hbWUsIFZQLmNhbnZhcy53aWR0aCAvIDIsIFZQLnNwcml0ZUhlaWdodCAvIDIpO1xyXG59XHJcblxyXG4vLyByZXR1cm5zIHRoZSBhZGp1c3RlZCByZXZlYWwgaW5kZXhcclxuZnVuY3Rpb24gcmVuZGVyUGxheWVyKGRlbHRhVGltZTogbnVtYmVyLCBnYW1lU3RhdGU6IExpYi5HYW1lU3RhdGUpIHtcclxuICAgIGNvbnN0IHNwcml0ZXMgPSBTdGF0ZS5mYWNlU3ByaXRlc0ZvclBsYXllcltnYW1lU3RhdGUucGxheWVySW5kZXhdO1xyXG4gICAgaWYgKHNwcml0ZXMgPT09IHVuZGVmaW5lZCkgcmV0dXJuO1xyXG5cclxuICAgIGxldCBpID0gMDtcclxuICAgIGZvciAoY29uc3Qgc3ByaXRlIG9mIHNwcml0ZXMpIHtcclxuICAgICAgICBzcHJpdGUuYW5pbWF0ZShkZWx0YVRpbWUpO1xyXG5cclxuICAgICAgICBpZiAoTGliLmJpbmFyeVNlYXJjaE51bWJlcihTdGF0ZS5zZWxlY3RlZEluZGljZXMsIGkrKykgPj0gMCkge1xyXG4gICAgICAgICAgICBWUC5jb250ZXh0LmZpbGxTdHlsZSA9ICcjMDA4MDgwNDAnO1xyXG4gICAgICAgICAgICBWUC5jb250ZXh0LmZpbGxSZWN0KHNwcml0ZS5wb3NpdGlvbi54LCBzcHJpdGUucG9zaXRpb24ueSwgVlAuc3ByaXRlV2lkdGgsIFZQLnNwcml0ZUhlaWdodCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiByZW5kZXJCdXR0b25zKHRpbWU6IG51bWJlciwgZ2FtZVN0YXRlOiBMaWIuR2FtZVN0YXRlKSB7XHJcbiAgICBWUC5jb250ZXh0LnNhdmUoKTtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgLy8gYmx1ciBpbWFnZSBiZWhpbmRcclxuICAgICAgICAvL3N0YWNrQmx1ckNhbnZhc1JHQkEoJ2NhbnZhcycsIHgsIHksIGNhbnZhcy53aWR0aCAtIHgsIGNhbnZhcy5oZWlnaHQgLSB5LCAxNik7XHJcbiAgICAgICAgLypcclxuICAgICAgICBjb25zdCB4ID0gVlAuc29ydEJ5U3VpdEJvdW5kc1swXS54IC0gNCAqIFZQLnBpeGVsc1BlckNNO1xyXG4gICAgICAgIGNvbnN0IHkgPSBWUC5zb3J0QnlTdWl0Qm91bmRzWzBdLnk7XHJcbiAgICAgICAgVlAuY29udGV4dC5maWxsU3R5bGUgPSAnIzAwZmZmZjc3JztcclxuICAgICAgICBWUC5jb250ZXh0LmZpbGxSZWN0KHgsIHksIFZQLmNhbnZhcy53aWR0aCAtIHgsIFZQLmNhbnZhcy5oZWlnaHQgLSB5KTtcclxuICAgICAgICBcclxuICAgICAgICBWUC5jb250ZXh0LmZpbGxTdHlsZSA9ICcjMDAwMDAwZmYnO1xyXG4gICAgICAgIFZQLmNvbnRleHQuZm9udCA9ICcxLjVjbSBTdWdhcmxpa2UnO1xyXG4gICAgICAgIFZQLmNvbnRleHQuZmlsbFRleHQoJ1NPUlQnLCB4ICsgMC4yNSAqIFZQLnBpeGVsc1BlckNNLCB5ICsgMi4yNSAqIFZQLnBpeGVsc1BlckNNKTtcclxuXHJcbiAgICAgICAgVlAuY29udGV4dC5mb250ID0gJzNjbSBTdWdhcmxpa2UnO1xyXG4gICAgICAgIFZQLmNvbnRleHQuZmlsbFRleHQoJ3snLCB4ICsgMyAqIFZQLnBpeGVsc1BlckNNLCB5ICsgMi43NSAqIFZQLnBpeGVsc1BlckNNKTtcclxuXHJcbiAgICAgICAgVlAuY29udGV4dC5mb250ID0gJzEuNWNtIFN1Z2FybGlrZSc7XHJcbiAgICAgICAgVlAuY29udGV4dC5maWxsVGV4dCgnU1VJVCcsIFZQLnNvcnRCeVN1aXRCb3VuZHNbMF0ueCwgVlAuc29ydEJ5U3VpdEJvdW5kc1sxXS55KTtcclxuXHJcbiAgICAgICAgVlAuY29udGV4dC5mb250ID0gJzEuNWNtIFN1Z2FybGlrZSc7XHJcbiAgICAgICAgVlAuY29udGV4dC5maWxsVGV4dCgnUkFOSycsIFZQLnNvcnRCeVJhbmtCb3VuZHNbMF0ueCwgVlAuc29ydEJ5UmFua0JvdW5kc1sxXS55KTtcclxuICAgICAgICAqL1xyXG4gICAgICAgIC8vY29udGV4dC5maWxsU3R5bGUgPSAnI2ZmMDAwMDc3JztcclxuICAgICAgICAvL2NvbnRleHQuZmlsbFJlY3QoVlAuc29ydEJ5U3VpdEJvdW5kc1swXS54LCBWUC5zb3J0QnlTdWl0Qm91bmRzWzBdLnksXHJcbiAgICAgICAgICAgIC8vc29ydEJ5U3VpdEJvdW5kc1sxXS54IC0gc29ydEJ5U3VpdEJvdW5kc1swXS54LCBzb3J0QnlTdWl0Qm91bmRzWzFdLnkgLSBzb3J0QnlTdWl0Qm91bmRzWzBdLnkpO1xyXG5cclxuICAgICAgICAvL2NvbnRleHQuZmlsbFN0eWxlID0gJyMwMDAwZmY3Nyc7XHJcbiAgICAgICAgLy9jb250ZXh0LmZpbGxSZWN0KHNvcnRCeVJhbmtCb3VuZHNbMF0ueCwgc29ydEJ5UmFua0JvdW5kc1swXS55LFxyXG4gICAgICAgICAgICAvL3NvcnRCeVJhbmtCb3VuZHNbMV0ueCAtIHNvcnRCeVJhbmtCb3VuZHNbMF0ueCwgc29ydEJ5UmFua0JvdW5kc1sxXS55IC0gc29ydEJ5UmFua0JvdW5kc1swXS55KTtcclxuXHJcbiAgICAgICAgLyppZiAoZ2FtZVN0YXRlLnBsYXllclN0YXRlID09PSBcIlByb2NlZWRcIiB8fCBnYW1lU3RhdGUucGxheWVyU3RhdGUgPT09IFwiV2FpdFwiKSB7XHJcbiAgICAgICAgICAgIFZQLmNvbnRleHQudGV4dEJhc2VsaW5lID0gJ3RvcCc7XHJcblxyXG4gICAgICAgICAgICBpZiAoZ2FtZVN0YXRlLnBsYXllclN0YXRlID09PSBcIldhaXRcIikge1xyXG4gICAgICAgICAgICAgICAgVlAuY29udGV4dC5maWxsU3R5bGUgPSAnIzAwZmZmZjYwJztcclxuICAgICAgICAgICAgICAgIFZQLmNvbnRleHQuZmlsbFJlY3QoXHJcbiAgICAgICAgICAgICAgICAgICAgVlAud2FpdEJvdW5kc1swXS54LCBWUC53YWl0Qm91bmRzWzBdLnksXHJcbiAgICAgICAgICAgICAgICAgICAgVlAud2FpdEJvdW5kc1sxXS54IC0gVlAud2FpdEJvdW5kc1swXS54LCBWUC53YWl0Qm91bmRzWzFdLnkgLSBWUC53YWl0Qm91bmRzWzBdLnlcclxuICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIFZQLmNvbnRleHQuZmlsbFN0eWxlID0gJyMwMDAwMDBmZic7XHJcbiAgICAgICAgICAgIFZQLmNvbnRleHQuZm9udCA9IFZQLndhaXRGb250O1xyXG4gICAgICAgICAgICBWUC5jb250ZXh0LmZpbGxUZXh0KCdXYWl0IScsIFZQLndhaXRCb3VuZHNbMF0ueCwgVlAud2FpdEJvdW5kc1swXS55KTtcclxuICAgICAgICAgICAgYm91bmRzUmVjdChWUC53YWl0Qm91bmRzKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChnYW1lU3RhdGUucGxheWVyU3RhdGUgPT09IFwiUHJvY2VlZFwiKSB7XHJcbiAgICAgICAgICAgICAgICBWUC5jb250ZXh0LmZpbGxTdHlsZSA9ICcjMDBmZmZmNjAnO1xyXG4gICAgICAgICAgICAgICAgVlAuY29udGV4dC5maWxsUmVjdChcclxuICAgICAgICAgICAgICAgICAgICBWUC5wcm9jZWVkQm91bmRzWzBdLngsIFZQLnByb2NlZWRCb3VuZHNbMF0ueSxcclxuICAgICAgICAgICAgICAgICAgICBWUC5wcm9jZWVkQm91bmRzWzFdLnggLSBWUC5wcm9jZWVkQm91bmRzWzBdLngsIFZQLnByb2NlZWRCb3VuZHNbMV0ueSAtIFZQLnByb2NlZWRCb3VuZHNbMF0ueVxyXG4gICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgVlAuY29udGV4dC5maWxsU3R5bGUgPSAnIzAwMDAwMGZmJztcclxuICAgICAgICAgICAgVlAuY29udGV4dC5mb250ID0gVlAucHJvY2VlZEZvbnQ7XHJcbiAgICAgICAgICAgIFZQLmNvbnRleHQuZmlsbFRleHQoJ1Byb2NlZWQuJywgVlAucHJvY2VlZEJvdW5kc1swXS54LCBWUC5wcm9jZWVkQm91bmRzWzBdLnkpO1xyXG4gICAgICAgICAgICBib3VuZHNSZWN0KFZQLnByb2NlZWRCb3VuZHMpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGlmIChnYW1lU3RhdGUucGxheWVyU3RhdGUgPT09ICdSZWFkeScpIHtcclxuICAgICAgICAgICAgICAgIFZQLmNvbnRleHQuZmlsbFN0eWxlID0gJyMwMDAwMDBmZic7XHJcbiAgICAgICAgICAgICAgICBWUC5jb250ZXh0LmZvbnQgPSBWUC5yZWFkeUZvbnQ7XHJcbiAgICAgICAgICAgICAgICBWUC5jb250ZXh0LmZpbGxUZXh0KCdSZWFkeSEnLCBWUC5yZWFkeUJvdW5kc1swXS54LCBWUC5yZWFkeUJvdW5kc1swXS55KTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIFZQLmNvbnRleHQuZmlsbFN0eWxlID0gJyMwMDAwMDBmZic7XHJcbiAgICAgICAgICAgICAgICBWUC5jb250ZXh0LmZvbnQgPSBWUC5jb3VudGRvd25Gb250O1xyXG4gICAgICAgICAgICAgICAgVlAuY29udGV4dC5maWxsVGV4dChgV2FpdGluZyAke1xyXG4gICAgICAgICAgICAgICAgICAgIE1hdGguZmxvb3IoMSArIChnYW1lU3RhdGUucGxheWVyU3RhdGUuYWN0aXZlVGltZSArIExpYi5hY3RpdmVDb29sZG93biAtIERhdGUubm93KCkpIC8gMTAwMClcclxuICAgICAgICAgICAgICAgIH0gc2Vjb25kcy4uLmAsIFZQLmNvdW50ZG93bkJvdW5kc1swXS54LCBWUC5jb3VudGRvd25Cb3VuZHNbMF0ueSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9Ki9cclxuICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgVlAuY29udGV4dC5yZXN0b3JlKCk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGJvdW5kc1JlY3QoW3RvcExlZnQsIGJvdHRvbVJpZ2h0XTogW1ZlY3RvciwgVmVjdG9yXSkge1xyXG4gICAgVlAuY29udGV4dC5zdHJva2VSZWN0KHRvcExlZnQueCwgdG9wTGVmdC55LCBib3R0b21SaWdodC54IC0gdG9wTGVmdC54LCBib3R0b21SaWdodC55IC0gdG9wTGVmdC55KTtcclxufVxyXG4iLCJpbXBvcnQgVmVjdG9yIGZyb20gJy4vdmVjdG9yJztcclxuaW1wb3J0ICogYXMgVlAgZnJvbSAnLi92aWV3LXBhcmFtcyc7XHJcblxyXG5jb25zdCBzcHJpbmdDb25zdGFudCA9IDEwMDA7XHJcbmNvbnN0IG1hc3MgPSAxO1xyXG5jb25zdCBkcmFnID0gTWF0aC5zcXJ0KDQgKiBtYXNzICogc3ByaW5nQ29uc3RhbnQpO1xyXG5cclxuLy8gc3RhdGUgZm9yIHBoeXNpY3MtYmFzZWQgYW5pbWF0aW9uc1xyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBTcHJpdGUge1xyXG4gICAgaW1hZ2U6IEhUTUxJbWFnZUVsZW1lbnQ7XHJcbiAgICB0YXJnZXQ6IFZlY3RvcjtcclxuICAgIHBvc2l0aW9uOiBWZWN0b3I7XHJcbiAgICB2ZWxvY2l0eTogVmVjdG9yO1xyXG5cclxuICAgIC8vYmFkID0gZmFsc2U7XHJcblxyXG4gICAgY29uc3RydWN0b3IoaW1hZ2U6IEhUTUxJbWFnZUVsZW1lbnQpIHtcclxuICAgICAgICB0aGlzLmltYWdlID0gaW1hZ2U7XHJcbiAgICAgICAgdGhpcy50YXJnZXQgPSBuZXcgVmVjdG9yKDAsIDApO1xyXG4gICAgICAgIHRoaXMucG9zaXRpb24gPSBuZXcgVmVjdG9yKDAsIDApO1xyXG4gICAgICAgIHRoaXMudmVsb2NpdHkgPSBuZXcgVmVjdG9yKDAsIDApO1xyXG4gICAgfVxyXG5cclxuICAgIGFuaW1hdGUoZGVsdGFUaW1lOiBudW1iZXIpIHtcclxuICAgICAgICBjb25zdCBzcHJpbmdGb3JjZSA9IHRoaXMudGFyZ2V0LnN1Yih0aGlzLnBvc2l0aW9uKS5zY2FsZShzcHJpbmdDb25zdGFudCk7XHJcbiAgICAgICAgY29uc3QgZHJhZ0ZvcmNlID0gdGhpcy52ZWxvY2l0eS5zY2FsZSgtZHJhZyk7XHJcbiAgICAgICAgY29uc3QgYWNjZWxlcmF0aW9uID0gc3ByaW5nRm9yY2UuYWRkKGRyYWdGb3JjZSkuc2NhbGUoMSAvIG1hc3MpO1xyXG5cclxuICAgICAgICAvL2NvbnN0IHNhdmVkVmVsb2NpdHkgPSB0aGlzLnZlbG9jaXR5O1xyXG4gICAgICAgIC8vY29uc3Qgc2F2ZWRQb3NpdGlvbiA9IHRoaXMucG9zaXRpb247XHJcbiAgICAgICAgXHJcbiAgICAgICAgdGhpcy52ZWxvY2l0eSA9IHRoaXMudmVsb2NpdHkuYWRkKGFjY2VsZXJhdGlvbi5zY2FsZShkZWx0YVRpbWUgLyAxMDAwKSk7XHJcbiAgICAgICAgdGhpcy5wb3NpdGlvbiA9IHRoaXMucG9zaXRpb24uYWRkKHRoaXMudmVsb2NpdHkuc2NhbGUoZGVsdGFUaW1lIC8gMTAwMCkpO1xyXG5cclxuICAgICAgICAvKlxyXG4gICAgICAgIGlmICghdGhpcy5iYWQgJiYgKFxyXG4gICAgICAgICAgICAhaXNGaW5pdGUodGhpcy52ZWxvY2l0eS54KSB8fCBpc05hTih0aGlzLnZlbG9jaXR5LngpIHx8XHJcbiAgICAgICAgICAgICFpc0Zpbml0ZSh0aGlzLnZlbG9jaXR5LnkpIHx8IGlzTmFOKHRoaXMudmVsb2NpdHkueSkgfHxcclxuICAgICAgICAgICAgIWlzRmluaXRlKHRoaXMucG9zaXRpb24ueCkgfHwgaXNOYU4odGhpcy5wb3NpdGlvbi54KSB8fFxyXG4gICAgICAgICAgICAhaXNGaW5pdGUodGhpcy5wb3NpdGlvbi55KSB8fCBpc05hTih0aGlzLnBvc2l0aW9uLnkpXHJcbiAgICAgICAgKSkge1xyXG4gICAgICAgICAgICB0aGlzLmJhZCA9IHRydWU7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgZGVsdGFUaW1lOiAke2RlbHRhVGltZX0sIHNwcmluZ0ZvcmNlOiAke0pTT04uc3RyaW5naWZ5KHNwcmluZ0ZvcmNlKX0sIGRyYWdGb3JjZTogJHtKU09OLnN0cmluZ2lmeShkcmFnRm9yY2UpfWApO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgdGFyZ2V0OiAke0pTT04uc3RyaW5naWZ5KHRoaXMudGFyZ2V0KX0sIHBvc2l0aW9uOiAke0pTT04uc3RyaW5naWZ5KHNhdmVkUG9zaXRpb24pfSwgdmVsb2NpdHk6ICR7SlNPTi5zdHJpbmdpZnkoc2F2ZWRWZWxvY2l0eSl9LCBhY2NlbGVyYXRpb246ICR7SlNPTi5zdHJpbmdpZnkoYWNjZWxlcmF0aW9uKX1gKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coYG5ldyBwb3NpdGlvbjogJHtKU09OLnN0cmluZ2lmeSh0aGlzLnBvc2l0aW9uKX0sIG5ldyB2ZWxvY2l0eTogJHtKU09OLnN0cmluZ2lmeSh0aGlzLnZlbG9jaXR5KX1gKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgKi9cclxuXHJcbiAgICAgICAgVlAuY29udGV4dC5kcmF3SW1hZ2UodGhpcy5pbWFnZSwgdGhpcy5wb3NpdGlvbi54LCB0aGlzLnBvc2l0aW9uLnksIFZQLnNwcml0ZVdpZHRoLCBWUC5zcHJpdGVIZWlnaHQpO1xyXG4gICAgfVxyXG59IiwiaW1wb3J0IHsgTXV0ZXggfSBmcm9tICdhd2FpdC1zZW1hcGhvcmUnO1xyXG5cclxuaW1wb3J0ICogYXMgTGliIGZyb20gJy4uL2xpYic7XHJcbmltcG9ydCAqIGFzIENhcmRJbWFnZXMgZnJvbSAnLi9jYXJkLWltYWdlcyc7XHJcbmltcG9ydCAqIGFzIFZQIGZyb20gJy4vdmlldy1wYXJhbXMnO1xyXG5pbXBvcnQgU3ByaXRlIGZyb20gJy4vc3ByaXRlJztcclxuaW1wb3J0IFZlY3RvciBmcm9tICcuL3ZlY3Rvcic7XHJcblxyXG5jb25zdCBwbGF5ZXJOYW1lRnJvbUNvb2tpZSA9IExpYi5nZXRDb29raWUoJ3BsYXllck5hbWUnKTtcclxuaWYgKHBsYXllck5hbWVGcm9tQ29va2llID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcignTm8gcGxheWVyIG5hbWUhJyk7XHJcbmV4cG9ydCBjb25zdCBwbGF5ZXJOYW1lID0gZGVjb2RlVVJJKHBsYXllck5hbWVGcm9tQ29va2llKTtcclxuXHJcbmNvbnN0IGdhbWVJZEZyb21Db29raWUgPSBMaWIuZ2V0Q29va2llKCdnYW1lSWQnKTtcclxuaWYgKGdhbWVJZEZyb21Db29raWUgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCdObyBnYW1lIGlkIScpO1xyXG5leHBvcnQgY29uc3QgZ2FtZUlkID0gZ2FtZUlkRnJvbUNvb2tpZTtcclxuXHJcbi8vIHNvbWUgc3RhdGUtbWFuaXB1bGF0aW5nIG9wZXJhdGlvbnMgYXJlIGFzeW5jaHJvbm91cywgc28gd2UgbmVlZCB0byBndWFyZCBhZ2FpbnN0IHJhY2VzXHJcbmNvbnN0IHN0YXRlTXV0ZXggPSBuZXcgTXV0ZXgoKTtcclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxvY2soKTogUHJvbWlzZTwoKSA9PiB2b2lkPiB7XHJcbiAgICAvL2NvbnNvbGUubG9nKGBhY3F1aXJpbmcgc3RhdGUgbG9jay4uLlxcbiR7bmV3IEVycm9yKCkuc3RhY2t9YCk7XHJcbiAgICBjb25zdCByZWxlYXNlID0gYXdhaXQgc3RhdGVNdXRleC5hY3F1aXJlKCk7XHJcbiAgICAvL2NvbnNvbGUubG9nKGBhY3F1aXJlZCBzdGF0ZSBsb2NrXFxuJHtuZXcgRXJyb3IoKS5zdGFja31gKTtcclxuICAgIHJldHVybiAoKSA9PiB7XHJcbiAgICAgICAgcmVsZWFzZSgpO1xyXG4gICAgICAgIC8vY29uc29sZS5sb2coYHJlbGVhc2VkIHN0YXRlIGxvY2tgKTtcclxuICAgIH07XHJcbn1cclxuXHJcbi8vIHdlIG5lZWQgdG8ga2VlcCBhIGNvcHkgb2YgdGhlIHByZXZpb3VzIGdhbWUgc3RhdGUgYXJvdW5kIGZvciBib29ra2VlcGluZyBwdXJwb3Nlc1xyXG5leHBvcnQgbGV0IHByZXZpb3VzR2FtZVN0YXRlOiBMaWIuR2FtZVN0YXRlIHwgdW5kZWZpbmVkO1xyXG4vLyB0aGUgbW9zdCByZWNlbnRseSByZWNlaXZlZCBnYW1lIHN0YXRlLCBpZiBhbnlcclxuZXhwb3J0IGxldCBnYW1lU3RhdGU6IExpYi5HYW1lU3RhdGUgfCB1bmRlZmluZWQ7XHJcblxyXG4vLyBpbmRpY2VzIG9mIGNhcmRzIGZvciBkcmFnICYgZHJvcFxyXG4vLyBJTVBPUlRBTlQ6IHRoaXMgYXJyYXkgbXVzdCBhbHdheXMgYmUgc29ydGVkIVxyXG4vLyBBbHdheXMgdXNlIGJpbmFyeVNlYXJjaCB0byBpbnNlcnQgYW5kIGRlbGV0ZSBvciBzb3J0IGFmdGVyIG1hbmlwdWxhdGlvblxyXG5leHBvcnQgY29uc3Qgc2VsZWN0ZWRJbmRpY2VzOiBudW1iZXJbXSA9IFtdO1xyXG5cclxuLy8gZm9yIGFuaW1hdGluZyB0aGUgZGVja1xyXG5leHBvcnQgbGV0IGRlY2tTcHJpdGVzOiBTcHJpdGVbXSA9IFtdO1xyXG5cclxuLy8gYXNzb2NpYXRpdmUgYXJyYXlzLCBvbmUgZm9yIGVhY2ggcGxheWVyIGF0IHRoZWlyIHBsYXllciBpbmRleFxyXG4vLyBlYWNoIGVsZW1lbnQgY29ycmVzcG9uZHMgdG8gYSBmYWNlLWRvd24gY2FyZCBieSBpbmRleFxyXG5leHBvcnQgbGV0IGJhY2tTcHJpdGVzRm9yUGxheWVyOiBTcHJpdGVbXVtdID0gW107XHJcbi8vIGVhY2ggZWxlbWVudCBjb3JyZXNwb25kcyB0byBhIGZhY2UtdXAgY2FyZCBieSBpbmRleFxyXG5leHBvcnQgbGV0IGZhY2VTcHJpdGVzRm9yUGxheWVyOiBTcHJpdGVbXVtdID0gW107XHJcblxyXG4vLyBvcGVuIHdlYnNvY2tldCBjb25uZWN0aW9uIHRvIGdldCBnYW1lIHN0YXRlIHVwZGF0ZXNcclxubGV0IHdzID0gbmV3IFdlYlNvY2tldChgd3NzOi8vJHt3aW5kb3cubG9jYXRpb24uaG9zdG5hbWV9L2ApO1xyXG5cclxuY29uc3QgY2FsbGJhY2tzRm9yTWV0aG9kTmFtZSA9IG5ldyBNYXA8TGliLk1ldGhvZE5hbWUsICgocmVzdWx0OiBMaWIuTWV0aG9kUmVzdWx0KSA9PiB2b2lkKVtdPigpO1xyXG5mdW5jdGlvbiBhZGRDYWxsYmFjayhtZXRob2ROYW1lOiBMaWIuTWV0aG9kTmFtZSwgcmVzb2x2ZTogKCkgPT4gdm9pZCwgcmVqZWN0OiAocmVhc29uOiBhbnkpID0+IHZvaWQpIHtcclxuICAgIGNvbnNvbGUubG9nKGBhZGRpbmcgY2FsbGJhY2sgZm9yIG1ldGhvZCAnJHttZXRob2ROYW1lfSdgKTtcclxuXHJcbiAgICBsZXQgY2FsbGJhY2tzID0gY2FsbGJhY2tzRm9yTWV0aG9kTmFtZS5nZXQobWV0aG9kTmFtZSk7XHJcbiAgICBpZiAoY2FsbGJhY2tzID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICBjYWxsYmFja3MgPSBbXTtcclxuICAgICAgICBjYWxsYmFja3NGb3JNZXRob2ROYW1lLnNldChtZXRob2ROYW1lLCBjYWxsYmFja3MpO1xyXG4gICAgfVxyXG5cclxuICAgIGNhbGxiYWNrcy5wdXNoKHJlc3VsdCA9PiB7XHJcbiAgICAgICAgY29uc29sZS5sb2coYGludm9raW5nIGNhbGxiYWNrIGZvciBtZXRob2QgJyR7bWV0aG9kTmFtZX0nYCk7XHJcbiAgICAgICAgaWYgKCdlcnJvckRlc2NyaXB0aW9uJyBpbiByZXN1bHQpIHtcclxuICAgICAgICAgICAgcmVqZWN0KHJlc3VsdC5lcnJvckRlc2NyaXB0aW9uKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICByZXNvbHZlKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcbn1cclxuXHJcbndzLm9ubWVzc2FnZSA9IGFzeW5jIGUgPT4ge1xyXG4gICAgY29uc3Qgb2JqID0gSlNPTi5wYXJzZShlLmRhdGEpO1xyXG4gICAgaWYgKCdtZXRob2ROYW1lJyBpbiBvYmopIHtcclxuICAgICAgICBjb25zdCByZXR1cm5NZXNzYWdlID0gPExpYi5NZXRob2RSZXN1bHQ+b2JqO1xyXG4gICAgICAgIGNvbnN0IG1ldGhvZE5hbWUgPSByZXR1cm5NZXNzYWdlLm1ldGhvZE5hbWU7XHJcbiAgICAgICAgY29uc3QgY2FsbGJhY2tzID0gY2FsbGJhY2tzRm9yTWV0aG9kTmFtZS5nZXQobWV0aG9kTmFtZSk7XHJcbiAgICAgICAgaWYgKGNhbGxiYWNrcyA9PT0gdW5kZWZpbmVkIHx8IGNhbGxiYWNrcy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBubyBjYWxsYmFja3MgZm91bmQgZm9yIG1ldGhvZDogJHttZXRob2ROYW1lfWApO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgY2FsbGJhY2sgPSBjYWxsYmFja3Muc2hpZnQoKTtcclxuICAgICAgICBpZiAoY2FsbGJhY2sgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGNhbGxiYWNrIGlzIHVuZGVmaW5lZCBmb3IgbWV0aG9kOiAke21ldGhvZE5hbWV9YCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIGNhbGxiYWNrKHJldHVybk1lc3NhZ2UpO1xyXG4gICAgfSBlbHNlIGlmIChcclxuICAgICAgICAnZGVja0NvdW50JyBpbiBvYmogJiZcclxuICAgICAgICAncGxheWVySW5kZXgnIGluIG9iaiAmJlxyXG4gICAgICAgICdwbGF5ZXJDYXJkcycgaW4gb2JqICYmXHJcbiAgICAgICAgJ3BsYXllclJldmVhbENvdW50JyBpbiBvYmogJiZcclxuICAgICAgICAvLydwbGF5ZXJTdGF0ZScgaW4gb2JqICYmXHJcbiAgICAgICAgJ290aGVyUGxheWVycycgaW4gb2JqXHJcbiAgICApIHtcclxuICAgICAgICBjb25zdCB1bmxvY2sgPSBhd2FpdCBsb2NrKCk7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgcHJldmlvdXNHYW1lU3RhdGUgPSBnYW1lU3RhdGU7XHJcbiAgICAgICAgICAgIGdhbWVTdGF0ZSA9IDxMaWIuR2FtZVN0YXRlPm9iajtcclxuXHJcbiAgICAgICAgICAgIGlmIChwcmV2aW91c0dhbWVTdGF0ZSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgcHJldmlvdXNHYW1lU3RhdGUucGxheWVyQ2FyZHM6ICR7SlNPTi5zdHJpbmdpZnkocHJldmlvdXNHYW1lU3RhdGUucGxheWVyQ2FyZHMpfWApO1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYHByZXZpb3VzIHNlbGVjdGVkSW5kaWNlczogJHtKU09OLnN0cmluZ2lmeShzZWxlY3RlZEluZGljZXMpfWApO1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYHByZXZpb3VzIHNlbGVjdGVkQ2FyZHM6ICR7SlNPTi5zdHJpbmdpZnkoc2VsZWN0ZWRJbmRpY2VzLm1hcChpID0+IHByZXZpb3VzR2FtZVN0YXRlPy5wbGF5ZXJDYXJkc1tpXSkpfWApO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBzZWxlY3RlZCBpbmRpY2VzIG1pZ2h0IGhhdmUgc2hpZnRlZFxyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNlbGVjdGVkSW5kaWNlcy5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgc2VsZWN0ZWRJbmRleCA9IHNlbGVjdGVkSW5kaWNlc1tpXTtcclxuICAgICAgICAgICAgICAgIGlmIChzZWxlY3RlZEluZGV4ID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChKU09OLnN0cmluZ2lmeShnYW1lU3RhdGUucGxheWVyQ2FyZHNbc2VsZWN0ZWRJbmRleF0pICE9PSBKU09OLnN0cmluZ2lmeShwcmV2aW91c0dhbWVTdGF0ZT8ucGxheWVyQ2FyZHNbc2VsZWN0ZWRJbmRleF0pKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGZvdW5kID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBnYW1lU3RhdGUucGxheWVyQ2FyZHMubGVuZ3RoOyArK2opIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKEpTT04uc3RyaW5naWZ5KGdhbWVTdGF0ZS5wbGF5ZXJDYXJkc1tqXSkgPT09IEpTT04uc3RyaW5naWZ5KHByZXZpb3VzR2FtZVN0YXRlPy5wbGF5ZXJDYXJkc1tzZWxlY3RlZEluZGV4XSkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkSW5kaWNlc1tpXSA9IGo7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3VuZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFmb3VuZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZEluZGljZXMuc3BsaWNlKGksIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAtLWk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBiaW5hcnkgc2VhcmNoIHN0aWxsIG5lZWRzIHRvIHdvcmtcclxuICAgICAgICAgICAgc2VsZWN0ZWRJbmRpY2VzLnNvcnQoKGEsIGIpID0+IGEgLSBiKTtcclxuXHJcbiAgICAgICAgICAgIC8vIGluaXRpYWxpemUgYW5pbWF0aW9uIHN0YXRlc1xyXG4gICAgICAgICAgICBhc3NvY2lhdGVBbmltYXRpb25zV2l0aENhcmRzKHByZXZpb3VzR2FtZVN0YXRlLCBnYW1lU3RhdGUpO1xyXG5cclxuICAgICAgICAgICAgY29uc29sZS5sb2coYGdhbWVTdGF0ZS5wbGF5ZXJDYXJkczogJHtKU09OLnN0cmluZ2lmeShnYW1lU3RhdGUucGxheWVyQ2FyZHMpfWApO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgZ2FtZVN0YXRlLnBsYXllclNoYXJlQ291bnQgPSAke2dhbWVTdGF0ZS5wbGF5ZXJTaGFyZUNvdW50fWApO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgZ2FtZVN0YXRlLnBsYXllclJldmVhbENvdW50ID0gJHtnYW1lU3RhdGUucGxheWVyUmV2ZWFsQ291bnR9YCk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBzZWxlY3RlZEluZGljZXM6ICR7SlNPTi5zdHJpbmdpZnkoc2VsZWN0ZWRJbmRpY2VzKX1gKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coYHNlbGVjdGVkQ2FyZHM6ICR7SlNPTi5zdHJpbmdpZnkoc2VsZWN0ZWRJbmRpY2VzLm1hcChpID0+IGdhbWVTdGF0ZT8ucGxheWVyQ2FyZHNbaV0pKX1gKTtcclxuICAgICAgICB9IGZpbmFsbHkge1xyXG4gICAgICAgICAgICB1bmxvY2soKTtcclxuICAgICAgICB9XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihKU09OLnN0cmluZ2lmeShlLmRhdGEpKTtcclxuICAgIH1cclxufTtcclxuXHJcbmxldCBvbkFuaW1hdGlvbnNBc3NvY2lhdGVkID0gKCkgPT4ge307XHJcblxyXG5mdW5jdGlvbiBhc3NvY2lhdGVBbmltYXRpb25zV2l0aENhcmRzKHByZXZpb3VzR2FtZVN0YXRlOiBMaWIuR2FtZVN0YXRlIHwgdW5kZWZpbmVkLCBnYW1lU3RhdGU6IExpYi5HYW1lU3RhdGUpIHtcclxuICAgIGNvbnN0IHByZXZpb3VzRGVja1Nwcml0ZXMgPSBkZWNrU3ByaXRlcztcclxuICAgIGNvbnN0IHByZXZpb3VzQmFja1Nwcml0ZXNGb3JQbGF5ZXIgPSBiYWNrU3ByaXRlc0ZvclBsYXllcjtcclxuICAgIGNvbnN0IHByZXZpb3VzRmFjZVNwcml0ZXNGb3JQbGF5ZXIgPSBmYWNlU3ByaXRlc0ZvclBsYXllcjtcclxuXHJcbiAgICBiYWNrU3ByaXRlc0ZvclBsYXllciA9IFtdO1xyXG4gICAgZmFjZVNwcml0ZXNGb3JQbGF5ZXIgPSBbXTtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgNDsgKytpKSB7XHJcbiAgICAgICAgY29uc3QgcHJldmlvdXNCYWNrU3ByaXRlcyA9IHByZXZpb3VzQmFja1Nwcml0ZXNGb3JQbGF5ZXJbaV0gPz8gW107XHJcbiAgICAgICAgcHJldmlvdXNCYWNrU3ByaXRlc0ZvclBsYXllcltpXSA9IHByZXZpb3VzQmFja1Nwcml0ZXM7XHJcblxyXG4gICAgICAgIGNvbnN0IHByZXZpb3VzRmFjZVNwcml0ZXMgPSBwcmV2aW91c0ZhY2VTcHJpdGVzRm9yUGxheWVyW2ldID8/IFtdO1xyXG4gICAgICAgIHByZXZpb3VzRmFjZVNwcml0ZXNGb3JQbGF5ZXJbaV0gPSBwcmV2aW91c0ZhY2VTcHJpdGVzO1xyXG5cclxuICAgICAgICBsZXQgcHJldmlvdXNGYWNlQ2FyZHM6IExpYi5DYXJkW107XHJcbiAgICAgICAgbGV0IGZhY2VDYXJkczogTGliLkNhcmRbXTtcclxuICAgICAgICBpZiAoaSA9PT0gZ2FtZVN0YXRlLnBsYXllckluZGV4KSB7XHJcbiAgICAgICAgICAgIHByZXZpb3VzRmFjZUNhcmRzID0gcHJldmlvdXNHYW1lU3RhdGU/LnBsYXllckNhcmRzID8/IFtdO1xyXG4gICAgICAgICAgICBmYWNlQ2FyZHMgPSBnYW1lU3RhdGUucGxheWVyQ2FyZHM7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcHJldmlvdXNGYWNlQ2FyZHMgPSBwcmV2aW91c0dhbWVTdGF0ZT8ub3RoZXJQbGF5ZXJzW2ldPy5yZXZlYWxlZENhcmRzID8/IFtdO1xyXG4gICAgICAgICAgICBmYWNlQ2FyZHMgPSBnYW1lU3RhdGUub3RoZXJQbGF5ZXJzW2ldPy5yZXZlYWxlZENhcmRzID8/IFtdO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IGZhY2VTcHJpdGVzOiBTcHJpdGVbXSA9IFtdO1xyXG4gICAgICAgIGZhY2VTcHJpdGVzRm9yUGxheWVyW2ldID0gZmFjZVNwcml0ZXM7XHJcbiAgICAgICAgZm9yIChjb25zdCBmYWNlQ2FyZCBvZiBmYWNlQ2FyZHMpIHtcclxuICAgICAgICAgICAgbGV0IGZhY2VTcHJpdGU6IFNwcml0ZSB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgaWYgKGZhY2VTcHJpdGUgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBwcmV2aW91c0ZhY2VDYXJkcy5sZW5ndGg7ICsraikge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHByZXZpb3VzRmFjZUNhcmQgPSBwcmV2aW91c0ZhY2VDYXJkc1tqXTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAocHJldmlvdXNGYWNlQ2FyZCA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoSlNPTi5zdHJpbmdpZnkoZmFjZUNhcmQpID09PSBKU09OLnN0cmluZ2lmeShwcmV2aW91c0ZhY2VDYXJkKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwcmV2aW91c0ZhY2VDYXJkcy5zcGxpY2UoaiwgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZhY2VTcHJpdGUgPSBwcmV2aW91c0ZhY2VTcHJpdGVzLnNwbGljZShqLCAxKVswXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZhY2VTcHJpdGUgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGZhY2VTcHJpdGUgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCA0OyArK2opIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBwcmV2aW91c090aGVyUGxheWVyID0gcHJldmlvdXNHYW1lU3RhdGU/Lm90aGVyUGxheWVyc1tqXTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBvdGhlclBsYXllciA9IGdhbWVTdGF0ZS5vdGhlclBsYXllcnNbal07XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHByZXZpb3VzT3RoZXJQbGF5ZXIgPT09IHVuZGVmaW5lZCB8fCBwcmV2aW91c090aGVyUGxheWVyID09PSBudWxsIHx8XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG90aGVyUGxheWVyID09PSB1bmRlZmluZWQgfHwgb3RoZXJQbGF5ZXIgPT09IG51bGxcclxuICAgICAgICAgICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAocHJldmlvdXNPdGhlclBsYXllci5zaGFyZUNvdW50ID4gb3RoZXJQbGF5ZXIuc2hhcmVDb3VudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBrID0gMDsgayA8IHByZXZpb3VzT3RoZXJQbGF5ZXIuc2hhcmVDb3VudDsgKytrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoSlNPTi5zdHJpbmdpZnkoZmFjZUNhcmQpID09PSBKU09OLnN0cmluZ2lmeShwcmV2aW91c090aGVyUGxheWVyLnJldmVhbGVkQ2FyZHNba10pKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLS1wcmV2aW91c090aGVyUGxheWVyLnNoYXJlQ291bnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJldmlvdXNPdGhlclBsYXllci5yZXZlYWxlZENhcmRzLnNwbGljZShrLCAxKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmFjZVNwcml0ZSA9IHByZXZpb3VzRmFjZVNwcml0ZXNGb3JQbGF5ZXJbal0/LnNwbGljZShrLCAxKVswXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZmFjZVNwcml0ZSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzb3VyY2VUcmFuc2Zvcm0gPSBWUC5nZXRUcmFuc2Zvcm1Gb3JQbGF5ZXIoVlAuZ2V0UmVsYXRpdmVQbGF5ZXJJbmRleChqLCBnYW1lU3RhdGUucGxheWVySW5kZXgpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkZXN0aW5hdGlvblRyYW5zZm9ybSA9IFZQLmdldFRyYW5zZm9ybUZvclBsYXllcihWUC5nZXRSZWxhdGl2ZVBsYXllckluZGV4KGksIGdhbWVTdGF0ZS5wbGF5ZXJJbmRleCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc3RpbmF0aW9uVHJhbnNmb3JtLmludmVydFNlbGYoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHAgPSBzb3VyY2VUcmFuc2Zvcm0udHJhbnNmb3JtUG9pbnQoZmFjZVNwcml0ZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcCA9IGRlc3RpbmF0aW9uVHJhbnNmb3JtLnRyYW5zZm9ybVBvaW50KHApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZhY2VTcHJpdGUucG9zaXRpb24gPSBuZXcgVmVjdG9yKHAueCwgcC55KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZhY2VTcHJpdGUgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChmYWNlU3ByaXRlID09PSB1bmRlZmluZWQgJiYgcHJldmlvdXNCYWNrU3ByaXRlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBtYWtlIGl0IGxvb2sgbGlrZSB0aGlzIGNhcmQgd2FzIHJldmVhbGVkIGFtb25nIHByZXZpb3VzbHkgaGlkZGVuIGNhcmRzXHJcbiAgICAgICAgICAgICAgICAvLyB3aGljaCwgb2YgY291cnNlLCByZXF1aXJlcyB0aGF0IHRoZSBwbGF5ZXIgaGFkIHByZXZpb3VzbHkgaGlkZGVuIGNhcmRzXHJcbiAgICAgICAgICAgICAgICBmYWNlU3ByaXRlID0gcHJldmlvdXNCYWNrU3ByaXRlcy5zcGxpY2UoMCwgMSlbMF07XHJcbiAgICAgICAgICAgICAgICBpZiAoZmFjZVNwcml0ZSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICAgICAgICAgICAgICAgIGZhY2VTcHJpdGUuaW1hZ2UgPSBDYXJkSW1hZ2VzLmdldChKU09OLnN0cmluZ2lmeShmYWNlQ2FyZCkpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoZmFjZVNwcml0ZSA9PT0gdW5kZWZpbmVkICYmIHByZXZpb3VzRGVja1Nwcml0ZXMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgLy8gbWFrZSBpdCBsb29rIGxpa2UgdGhpcyBjYXJkIGNhbWUgZnJvbSB0aGUgZGVjaztcclxuICAgICAgICAgICAgICAgIGNvbnN0IGZhY2VTcHJpdGUgPSBwcmV2aW91c0RlY2tTcHJpdGVzLnNwbGljZShwcmV2aW91c0RlY2tTcHJpdGVzLmxlbmd0aCAtIDEsIDEpWzBdO1xyXG4gICAgICAgICAgICAgICAgaWYgKGZhY2VTcHJpdGUgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICAgICAgICAgICAgICBmYWNlU3ByaXRlLmltYWdlID0gQ2FyZEltYWdlcy5nZXQoSlNPTi5zdHJpbmdpZnkoZmFjZUNhcmQpKTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyB0aGlzIHNwcml0ZSBpcyByZW5kZXJlZCBpbiB0aGUgcGxheWVyJ3MgdHJhbnNmb3JtZWQgY2FudmFzIGNvbnRleHRcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRyYW5zZm9ybSA9IFZQLmdldFRyYW5zZm9ybUZvclBsYXllcihWUC5nZXRSZWxhdGl2ZVBsYXllckluZGV4KGksIGdhbWVTdGF0ZS5wbGF5ZXJJbmRleCkpO1xyXG4gICAgICAgICAgICAgICAgdHJhbnNmb3JtLmludmVydFNlbGYoKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHBvaW50ID0gdHJhbnNmb3JtLnRyYW5zZm9ybVBvaW50KGZhY2VTcHJpdGUucG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgZmFjZVNwcml0ZS5wb3NpdGlvbiA9IG5ldyBWZWN0b3IocG9pbnQueCwgcG9pbnQueSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChmYWNlU3ByaXRlID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIGZhY2VTcHJpdGUgPSBuZXcgU3ByaXRlKENhcmRJbWFnZXMuZ2V0KEpTT04uc3RyaW5naWZ5KGZhY2VDYXJkKSkpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBmYWNlU3ByaXRlcy5wdXNoKGZhY2VTcHJpdGUpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDQ7ICsraSkge1xyXG4gICAgICAgIGNvbnN0IHByZXZpb3VzQmFja1Nwcml0ZXMgPSBwcmV2aW91c0JhY2tTcHJpdGVzRm9yUGxheWVyW2ldID8/IFtdO1xyXG4gICAgICAgIHByZXZpb3VzQmFja1Nwcml0ZXNGb3JQbGF5ZXJbaV0gPSBwcmV2aW91c0JhY2tTcHJpdGVzO1xyXG5cclxuICAgICAgICBjb25zdCBwcmV2aW91c0ZhY2VTcHJpdGVzID0gcHJldmlvdXNGYWNlU3ByaXRlc0ZvclBsYXllcltpXSA/PyBbXTtcclxuICAgICAgICBwcmV2aW91c0ZhY2VTcHJpdGVzRm9yUGxheWVyW2ldID0gcHJldmlvdXNGYWNlU3ByaXRlcztcclxuXHJcbiAgICAgICAgbGV0IGJhY2tTcHJpdGVzOiBTcHJpdGVbXSA9IFtdO1xyXG4gICAgICAgIGJhY2tTcHJpdGVzRm9yUGxheWVyW2ldID0gYmFja1Nwcml0ZXM7XHJcbiAgICAgICAgY29uc3Qgb3RoZXJQbGF5ZXIgPSBnYW1lU3RhdGUub3RoZXJQbGF5ZXJzW2ldO1xyXG4gICAgICAgIGlmIChpICE9PSBnYW1lU3RhdGUucGxheWVySW5kZXggJiYgb3RoZXJQbGF5ZXIgIT09IG51bGwgJiYgb3RoZXJQbGF5ZXIgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAvLyBvbmx5IG90aGVyIHBsYXllcnMgaGF2ZSBhbnkgaGlkZGVuIGNhcmRzXHJcbiAgICAgICAgICAgIHdoaWxlIChiYWNrU3ByaXRlcy5sZW5ndGggPCBvdGhlclBsYXllci5jYXJkQ291bnQgLSBvdGhlclBsYXllci5yZXZlYWxlZENhcmRzLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IGJhY2tTcHJpdGU6IFNwcml0ZSB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgICAgIGlmIChiYWNrU3ByaXRlID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IDQ7ICsraikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwcmV2aW91c090aGVyUGxheWVyID0gcHJldmlvdXNHYW1lU3RhdGU/Lm90aGVyUGxheWVyc1tqXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgb3RoZXJQbGF5ZXIgPSBnYW1lU3RhdGUub3RoZXJQbGF5ZXJzW2pdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJldmlvdXNPdGhlclBsYXllciA9PT0gdW5kZWZpbmVkIHx8IHByZXZpb3VzT3RoZXJQbGF5ZXIgPT09IG51bGwgfHxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG90aGVyUGxheWVyID09PSB1bmRlZmluZWQgfHwgb3RoZXJQbGF5ZXIgPT09IG51bGxcclxuICAgICAgICAgICAgICAgICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByZXZpb3VzT3RoZXJQbGF5ZXIuc2hhcmVDb3VudCA+IG90aGVyUGxheWVyLnNoYXJlQ291bnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByZXZpb3VzT3RoZXJQbGF5ZXIuc2hhcmVDb3VudC0tO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJldmlvdXNPdGhlclBsYXllci5yZXZlYWxlZENhcmRzLnNwbGljZSgwLCAxKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBiYWNrU3ByaXRlID0gcHJldmlvdXNGYWNlU3ByaXRlc0ZvclBsYXllcltqXT8uc3BsaWNlKDAsIDEpWzBdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGJhY2tTcHJpdGUgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBiYWNrU3ByaXRlLmltYWdlID0gQ2FyZEltYWdlcy5nZXQoYEJhY2ske2l9YCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc291cmNlVHJhbnNmb3JtID0gVlAuZ2V0VHJhbnNmb3JtRm9yUGxheWVyKFZQLmdldFJlbGF0aXZlUGxheWVySW5kZXgoaiwgZ2FtZVN0YXRlLnBsYXllckluZGV4KSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkZXN0aW5hdGlvblRyYW5zZm9ybSA9IFZQLmdldFRyYW5zZm9ybUZvclBsYXllcihWUC5nZXRSZWxhdGl2ZVBsYXllckluZGV4KGksIGdhbWVTdGF0ZS5wbGF5ZXJJbmRleCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgcCA9IHNvdXJjZVRyYW5zZm9ybS50cmFuc2Zvcm1Qb2ludChiYWNrU3ByaXRlLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHAgPSBkZXN0aW5hdGlvblRyYW5zZm9ybS50cmFuc2Zvcm1Qb2ludChwKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJhY2tTcHJpdGUucG9zaXRpb24gPSBuZXcgVmVjdG9yKHAueCwgcC55KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmIChiYWNrU3ByaXRlID09PSB1bmRlZmluZWQgJiYgcHJldmlvdXNCYWNrU3ByaXRlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYmFja1Nwcml0ZSA9IHByZXZpb3VzQmFja1Nwcml0ZXMuc3BsaWNlKDAsIDEpWzBdO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChiYWNrU3ByaXRlID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBpZiAoYmFja1Nwcml0ZSA9PT0gdW5kZWZpbmVkICYmIHByZXZpb3VzRmFjZVNwcml0ZXMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGJhY2tTcHJpdGUgPSBwcmV2aW91c0ZhY2VTcHJpdGVzLnNwbGljZSgwLCAxKVswXTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoYmFja1Nwcml0ZSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICAgICAgICAgICAgICAgICAgICBiYWNrU3ByaXRlLmltYWdlID0gQ2FyZEltYWdlcy5nZXQoYEJhY2ske2l9YCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGlmIChiYWNrU3ByaXRlID09PSB1bmRlZmluZWQgJiYgcHJldmlvdXNEZWNrU3ByaXRlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYmFja1Nwcml0ZSA9IHByZXZpb3VzRGVja1Nwcml0ZXMuc3BsaWNlKHByZXZpb3VzRGVja1Nwcml0ZXMubGVuZ3RoIC0gMSwgMSlbMF07XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGJhY2tTcHJpdGUgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYmFja1Nwcml0ZS5pbWFnZSA9IENhcmRJbWFnZXMuZ2V0KGBCYWNrJHtpfWApO1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIHRoaXMgc3ByaXRlIGNvbWVzIGZyb20gdGhlIGRlY2ssIHdoaWNoIGlzIHJlbmRlcmVkIGluIHRoZSBjbGllbnQgcGxheWVyJ3MgdHJhbnNmb3JtXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdHJhbnNmb3JtID0gVlAuZ2V0VHJhbnNmb3JtRm9yUGxheWVyKFZQLmdldFJlbGF0aXZlUGxheWVySW5kZXgoaSwgZ2FtZVN0YXRlLnBsYXllckluZGV4KSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdHJhbnNmb3JtLmludmVydFNlbGYoKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBwb2ludCA9IHRyYW5zZm9ybS50cmFuc2Zvcm1Qb2ludChiYWNrU3ByaXRlLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICBiYWNrU3ByaXRlLnBvc2l0aW9uID0gbmV3IFZlY3Rvcihwb2ludC54LCBwb2ludC55KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgaWYgKGJhY2tTcHJpdGUgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGJhY2tTcHJpdGUgPSBuZXcgU3ByaXRlKENhcmRJbWFnZXMuZ2V0KGBCYWNrJHtpfWApKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBiYWNrU3ByaXRlcy5wdXNoKGJhY2tTcHJpdGUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGRlY2tTcHJpdGVzID0gW107XHJcbiAgICB3aGlsZSAoZGVja1Nwcml0ZXMubGVuZ3RoIDwgZ2FtZVN0YXRlLmRlY2tDb3VudCkge1xyXG4gICAgICAgIGxldCBkZWNrU3ByaXRlOiBTcHJpdGUgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgaWYgKGRlY2tTcHJpdGUgPT0gdW5kZWZpbmVkICYmIHByZXZpb3VzRGVja1Nwcml0ZXMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICBkZWNrU3ByaXRlID0gcHJldmlvdXNEZWNrU3ByaXRlcy5zcGxpY2UoMCwgMSlbMF07XHJcbiAgICAgICAgICAgIGlmIChkZWNrU3ByaXRlID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGRlY2tTcHJpdGUgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICBsZXQgaSA9IDA7XHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgcHJldmlvdXNCYWNrU3ByaXRlcyBvZiBwcmV2aW91c0JhY2tTcHJpdGVzRm9yUGxheWVyKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAocHJldmlvdXNCYWNrU3ByaXRlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVja1Nwcml0ZSA9IHByZXZpb3VzQmFja1Nwcml0ZXMuc3BsaWNlKDAsIDEpWzBdO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChkZWNrU3ByaXRlID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG4gICAgICAgICAgICAgICAgICAgIGRlY2tTcHJpdGUuaW1hZ2UgPSBDYXJkSW1hZ2VzLmdldCgnQmFjazQnKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gdGhlIHNwcml0ZSBjYW1lIGZyb20gdGhlIHBsYXllcidzIHRyYW5zZm9ybWVkIGNhbnZhcyBjb250ZXh0XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdHJhbnNmb3JtID0gVlAuZ2V0VHJhbnNmb3JtRm9yUGxheWVyKFZQLmdldFJlbGF0aXZlUGxheWVySW5kZXgoaSwgZ2FtZVN0YXRlLnBsYXllckluZGV4KSk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcG9pbnQgPSB0cmFuc2Zvcm0udHJhbnNmb3JtUG9pbnQoZGVja1Nwcml0ZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVja1Nwcml0ZS5wb3NpdGlvbiA9IG5ldyBWZWN0b3IocG9pbnQueCwgcG9pbnQueSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICsraTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGRlY2tTcHJpdGUgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICBsZXQgaSA9IDA7XHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgcHJldmlvdXNGYWNlU3ByaXRlcyBvZiBwcmV2aW91c0ZhY2VTcHJpdGVzRm9yUGxheWVyKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAocHJldmlvdXNGYWNlU3ByaXRlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVja1Nwcml0ZSA9IHByZXZpb3VzRmFjZVNwcml0ZXMuc3BsaWNlKDAsIDEpWzBdO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChkZWNrU3ByaXRlID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG4gICAgICAgICAgICAgICAgICAgIGRlY2tTcHJpdGUuaW1hZ2UgPSBDYXJkSW1hZ2VzLmdldCgnQmFjazQnKTtcclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAvLyB0aGUgc3ByaXRlIGNhbWUgZnJvbSB0aGUgcGxheWVyJ3MgdHJhbnNmb3JtZWQgY2FudmFzIGNvbnRleHRcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0cmFuc2Zvcm0gPSBWUC5nZXRUcmFuc2Zvcm1Gb3JQbGF5ZXIoVlAuZ2V0UmVsYXRpdmVQbGF5ZXJJbmRleChpLCBnYW1lU3RhdGUucGxheWVySW5kZXgpKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBwb2ludCA9IHRyYW5zZm9ybS50cmFuc2Zvcm1Qb2ludChkZWNrU3ByaXRlLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICBkZWNrU3ByaXRlLnBvc2l0aW9uID0gbmV3IFZlY3Rvcihwb2ludC54LCBwb2ludC55KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgKytpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoZGVja1Nwcml0ZSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIGRlY2tTcHJpdGUgPSBuZXcgU3ByaXRlKENhcmRJbWFnZXMuZ2V0KCdCYWNrNCcpKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGRlY2tTcHJpdGVzLnB1c2goZGVja1Nwcml0ZSk7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0U3ByaXRlVGFyZ2V0cyhnYW1lU3RhdGUpO1xyXG5cclxuICAgIG9uQW5pbWF0aW9uc0Fzc29jaWF0ZWQoKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHNldFNwcml0ZVRhcmdldHMoXHJcbiAgICBnYW1lU3RhdGU6IExpYi5HYW1lU3RhdGUsXHJcbiAgICByZXNlcnZlZFNwcml0ZXNBbmRDYXJkcz86IFtTcHJpdGUsIExpYi5DYXJkXVtdLFxyXG4gICAgbW92aW5nU3ByaXRlc0FuZENhcmRzPzogW1Nwcml0ZSwgTGliLkNhcmRdW10sXHJcbiAgICBzaGFyZUNvdW50PzogbnVtYmVyLFxyXG4gICAgcmV2ZWFsQ291bnQ/OiBudW1iZXIsXHJcbiAgICBzcGxpdEluZGV4PzogbnVtYmVyLFxyXG4gICAgcmV0dXJuVG9EZWNrPzogYm9vbGVhblxyXG4pIHtcclxuICAgIGNvbnN0IHNwcml0ZXMgPSBmYWNlU3ByaXRlc0ZvclBsYXllcltnYW1lU3RhdGUucGxheWVySW5kZXhdO1xyXG4gICAgaWYgKHNwcml0ZXMgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcblxyXG4gICAgY29uc3QgY2FyZHMgPSBnYW1lU3RhdGUucGxheWVyQ2FyZHM7XHJcblxyXG4gICAgcmVzZXJ2ZWRTcHJpdGVzQW5kQ2FyZHMgPSByZXNlcnZlZFNwcml0ZXNBbmRDYXJkcyA/PyBjYXJkcy5tYXAoKGNhcmQsIGluZGV4KSA9PiA8W1Nwcml0ZSwgTGliLkNhcmRdPltzcHJpdGVzW2luZGV4XSwgY2FyZF0pO1xyXG4gICAgbW92aW5nU3ByaXRlc0FuZENhcmRzID0gbW92aW5nU3ByaXRlc0FuZENhcmRzID8/IFtdO1xyXG4gICAgc2hhcmVDb3VudCA9IHNoYXJlQ291bnQgPz8gZ2FtZVN0YXRlLnBsYXllclNoYXJlQ291bnQ7XHJcbiAgICByZXZlYWxDb3VudCA9IHJldmVhbENvdW50ID8/IGdhbWVTdGF0ZS5wbGF5ZXJSZXZlYWxDb3VudDtcclxuICAgIHNwbGl0SW5kZXggPSBzcGxpdEluZGV4ID8/IGNhcmRzLmxlbmd0aDtcclxuICAgIHJldHVyblRvRGVjayA9IHJldHVyblRvRGVjayA/PyBmYWxzZTtcclxuXHJcbiAgICAvLyBjbGVhciBmb3IgcmVpbnNlcnRpb25cclxuICAgIHNwcml0ZXMuc3BsaWNlKDAsIHNwcml0ZXMubGVuZ3RoKTtcclxuICAgIGNhcmRzLnNwbGljZSgwLCBjYXJkcy5sZW5ndGgpO1xyXG5cclxuICAgIGZvciAoY29uc3QgW3Jlc2VydmVkU3ByaXRlLCByZXNlcnZlZENhcmRdIG9mIHJlc2VydmVkU3ByaXRlc0FuZENhcmRzKSB7XHJcbiAgICAgICAgaWYgKGNhcmRzLmxlbmd0aCA9PT0gc3BsaXRJbmRleCkge1xyXG4gICAgICAgICAgICBmb3IgKGNvbnN0IFttb3ZpbmdTcHJpdGUsIG1vdmluZ0NhcmRdIG9mIG1vdmluZ1Nwcml0ZXNBbmRDYXJkcykge1xyXG4gICAgICAgICAgICAgICAgc3ByaXRlcy5wdXNoKG1vdmluZ1Nwcml0ZSk7XHJcbiAgICAgICAgICAgICAgICBjYXJkcy5wdXNoKG1vdmluZ0NhcmQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoY2FyZHMubGVuZ3RoIDwgc2hhcmVDb3VudCkge1xyXG4gICAgICAgICAgICByZXNlcnZlZFNwcml0ZS50YXJnZXQgPSBuZXcgVmVjdG9yKFxyXG4gICAgICAgICAgICAgICAgVlAuY2FudmFzLndpZHRoIC8gMiAtIFZQLnNwcml0ZVdpZHRoIC0gc2hhcmVDb3VudCAqIFZQLnNwcml0ZUdhcCArIGNhcmRzLmxlbmd0aCAqIFZQLnNwcml0ZUdhcCxcclxuICAgICAgICAgICAgICAgIFZQLmNhbnZhcy5oZWlnaHQgLSAyICogVlAuc3ByaXRlSGVpZ2h0IC0gVlAuc3ByaXRlR2FwXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChjYXJkcy5sZW5ndGggPCByZXZlYWxDb3VudCkge1xyXG4gICAgICAgICAgICByZXNlcnZlZFNwcml0ZS50YXJnZXQgPSBuZXcgVmVjdG9yKFxyXG4gICAgICAgICAgICAgICAgVlAuY2FudmFzLndpZHRoIC8gMiArIChjYXJkcy5sZW5ndGggLSBzaGFyZUNvdW50KSAqIFZQLnNwcml0ZUdhcCxcclxuICAgICAgICAgICAgICAgIFZQLmNhbnZhcy5oZWlnaHQgLSAyICogVlAuc3ByaXRlSGVpZ2h0XHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgbGV0IGNvdW50ID0gcmVzZXJ2ZWRTcHJpdGVzQW5kQ2FyZHMubGVuZ3RoIC0gcmV2ZWFsQ291bnQ7XHJcbiAgICAgICAgICAgIGlmICghcmV0dXJuVG9EZWNrKSB7XHJcbiAgICAgICAgICAgICAgICBjb3VudCArPSBtb3ZpbmdTcHJpdGVzQW5kQ2FyZHMubGVuZ3RoO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXNlcnZlZFNwcml0ZS50YXJnZXQgPSBuZXcgVmVjdG9yKFxyXG4gICAgICAgICAgICAgICAgVlAuY2FudmFzLndpZHRoIC8gMiAtIFZQLnNwcml0ZVdpZHRoIC8gMiArIChjYXJkcy5sZW5ndGggLSByZXZlYWxDb3VudCAtIChjb3VudCAtIDEpIC8gMikgKiBWUC5zcHJpdGVHYXAsXHJcbiAgICAgICAgICAgICAgICBWUC5jYW52YXMuaGVpZ2h0IC0gVlAuc3ByaXRlSGVpZ2h0XHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIHNwcml0ZXMucHVzaChyZXNlcnZlZFNwcml0ZSk7XHJcbiAgICAgICAgY2FyZHMucHVzaChyZXNlcnZlZENhcmQpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChjYXJkcy5sZW5ndGggPT09IHNwbGl0SW5kZXgpIHtcclxuICAgICAgICBmb3IgKGNvbnN0IFttb3ZpbmdTcHJpdGUsIG1vdmluZ0NhcmRdIG9mIG1vdmluZ1Nwcml0ZXNBbmRDYXJkcykge1xyXG4gICAgICAgICAgICBzcHJpdGVzLnB1c2gobW92aW5nU3ByaXRlKTtcclxuICAgICAgICAgICAgY2FyZHMucHVzaChtb3ZpbmdDYXJkKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZ2FtZVN0YXRlLnBsYXllclNoYXJlQ291bnQgPSBzaGFyZUNvdW50O1xyXG4gICAgZ2FtZVN0YXRlLnBsYXllclJldmVhbENvdW50ID0gcmV2ZWFsQ291bnQ7XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBqb2luR2FtZShnYW1lSWQ6IHN0cmluZywgcGxheWVyTmFtZTogc3RyaW5nKSB7XHJcbiAgICAvLyB3YWl0IGZvciBjb25uZWN0aW9uXHJcbiAgICBkbyB7XHJcbiAgICAgICAgYXdhaXQgTGliLmRlbGF5KDEwMDApO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGB3cy5yZWFkeVN0YXRlOiAke3dzLnJlYWR5U3RhdGV9LCBXZWJTb2NrZXQuT1BFTjogJHtXZWJTb2NrZXQuT1BFTn1gKTtcclxuICAgIH0gd2hpbGUgKHdzLnJlYWR5U3RhdGUgIT0gV2ViU29ja2V0Lk9QRU4pO1xyXG5cclxuICAgIC8vIHRyeSB0byBqb2luIHRoZSBnYW1lXHJcbiAgICBhd2FpdCBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgYWRkQ2FsbGJhY2soJ2pvaW5HYW1lJywgcmVzb2x2ZSwgcmVqZWN0KTtcclxuICAgICAgICB3cy5zZW5kKEpTT04uc3RyaW5naWZ5KDxMaWIuSm9pbkdhbWVNZXNzYWdlPnsgZ2FtZUlkLCBwbGF5ZXJOYW1lIH0pKTtcclxuICAgIH0pO1xyXG59XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdGFrZUNhcmQob3RoZXJQbGF5ZXJJbmRleDogbnVtYmVyLCBjYXJkSW5kZXg6IG51bWJlciwgY2FyZDogTGliLkNhcmQpIHtcclxuICAgIGNvbnN0IGFuaW1hdGlvbnNBc3NvY2lhdGVkID0gbmV3IFByb21pc2U8dm9pZD4ocmVzb2x2ZSA9PiB7XHJcbiAgICAgICAgb25BbmltYXRpb25zQXNzb2NpYXRlZCA9ICgpID0+IHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coYGFzc29jaWF0ZWQgYW5pbWF0aW9uc2ApO1xyXG4gICAgICAgICAgICBvbkFuaW1hdGlvbnNBc3NvY2lhdGVkID0gKCkgPT4ge307XHJcbiAgICAgICAgICAgIHJlc29sdmUoKTtcclxuICAgICAgICB9O1xyXG4gICAgfSk7XHJcblxyXG4gICAgYXdhaXQgbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgIGFkZENhbGxiYWNrKCd0YWtlQ2FyZCcsIHJlc29sdmUsIHJlamVjdCk7XHJcbiAgICAgICAgd3Muc2VuZChKU09OLnN0cmluZ2lmeSg8TGliLlRha2VDYXJkTWVzc2FnZT57XHJcbiAgICAgICAgICAgIG90aGVyUGxheWVySW5kZXgsXHJcbiAgICAgICAgICAgIGNhcmRJbmRleCxcclxuICAgICAgICAgICAgY2FyZFxyXG4gICAgICAgIH0pKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGF3YWl0IGFuaW1hdGlvbnNBc3NvY2lhdGVkO1xyXG59XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZHJhd0NhcmQoKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBjb25zdCBhbmltYXRpb25zQXNzb2NpYXRlZCA9IG5ldyBQcm9taXNlPHZvaWQ+KHJlc29sdmUgPT4ge1xyXG4gICAgICAgIG9uQW5pbWF0aW9uc0Fzc29jaWF0ZWQgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgIG9uQW5pbWF0aW9uc0Fzc29jaWF0ZWQgPSAoKSA9PiB7fTtcclxuICAgICAgICAgICAgcmVzb2x2ZSgpO1xyXG4gICAgICAgIH07XHJcbiAgICB9KTtcclxuXHJcbiAgICBhd2FpdCBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgYWRkQ2FsbGJhY2soJ2RyYXdDYXJkJywgcmVzb2x2ZSwgcmVqZWN0KTtcclxuICAgICAgICB3cy5zZW5kKEpTT04uc3RyaW5naWZ5KDxMaWIuRHJhd0NhcmRNZXNzYWdlPntcclxuICAgICAgICAgICAgZHJhd0NhcmQ6IG51bGxcclxuICAgICAgICB9KSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBhd2FpdCBhbmltYXRpb25zQXNzb2NpYXRlZDtcclxufVxyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJldHVybkNhcmRzVG9EZWNrKGdhbWVTdGF0ZTogTGliLkdhbWVTdGF0ZSkge1xyXG4gICAgYXdhaXQgbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgIGFkZENhbGxiYWNrKCdyZXR1cm5DYXJkc1RvRGVjaycsIHJlc29sdmUsIHJlamVjdCk7XHJcbiAgICAgICAgd3Muc2VuZChKU09OLnN0cmluZ2lmeSg8TGliLlJldHVybkNhcmRzVG9EZWNrTWVzc2FnZT57XHJcbiAgICAgICAgICAgIGNhcmRzVG9SZXR1cm5Ub0RlY2s6IHNlbGVjdGVkSW5kaWNlcy5tYXAoaSA9PiBnYW1lU3RhdGUucGxheWVyQ2FyZHNbaV0pXHJcbiAgICAgICAgfSkpO1xyXG4gICAgfSk7XHJcbiAgICBcclxuICAgIC8vIG1ha2UgdGhlIHNlbGVjdGVkIGNhcmRzIGRpc2FwcGVhclxyXG4gICAgc2VsZWN0ZWRJbmRpY2VzLnNwbGljZSgwLCBzZWxlY3RlZEluZGljZXMubGVuZ3RoKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHJlb3JkZXJDYXJkcyhnYW1lU3RhdGU6IExpYi5HYW1lU3RhdGUpIHtcclxuICAgIHJldHVybiBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgYWRkQ2FsbGJhY2soJ3Jlb3JkZXJDYXJkcycsIHJlc29sdmUsIHJlamVjdCk7XHJcbiAgICAgICAgd3Muc2VuZChKU09OLnN0cmluZ2lmeSg8TGliLlJlb3JkZXJDYXJkc01lc3NhZ2U+e1xyXG4gICAgICAgICAgICByZW9yZGVyZWRDYXJkczogZ2FtZVN0YXRlLnBsYXllckNhcmRzLFxyXG4gICAgICAgICAgICBuZXdTaGFyZUNvdW50OiBnYW1lU3RhdGUucGxheWVyU2hhcmVDb3VudCxcclxuICAgICAgICAgICAgbmV3UmV2ZWFsQ291bnQ6IGdhbWVTdGF0ZS5wbGF5ZXJSZXZlYWxDb3VudFxyXG4gICAgICAgIH0pKTtcclxuICAgIH0pO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc29ydEJ5U3VpdChnYW1lU3RhdGU6IExpYi5HYW1lU3RhdGUpIHtcclxuICAgIGxldCBjb21wYXJlRm4gPSAoW2FTdWl0LCBhUmFua106IExpYi5DYXJkLCBbYlN1aXQsIGJSYW5rXTogTGliLkNhcmQpID0+IHtcclxuICAgICAgICBpZiAoYVN1aXQgIT09IGJTdWl0KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBhU3VpdCAtIGJTdWl0O1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHJldHVybiBhUmFuayAtIGJSYW5rO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgcHJldmlvdXNHYW1lU3RhdGUgPSA8TGliLkdhbWVTdGF0ZT5KU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGdhbWVTdGF0ZSkpO1xyXG4gICAgc29ydENhcmRzKGdhbWVTdGF0ZS5wbGF5ZXJDYXJkcywgMCwgZ2FtZVN0YXRlLnBsYXllclNoYXJlQ291bnQsIGNvbXBhcmVGbik7XHJcbiAgICBzb3J0Q2FyZHMoZ2FtZVN0YXRlLnBsYXllckNhcmRzLCBnYW1lU3RhdGUucGxheWVyU2hhcmVDb3VudCwgZ2FtZVN0YXRlLnBsYXllclJldmVhbENvdW50LCBjb21wYXJlRm4pO1xyXG4gICAgc29ydENhcmRzKGdhbWVTdGF0ZS5wbGF5ZXJDYXJkcywgZ2FtZVN0YXRlLnBsYXllclJldmVhbENvdW50LCBnYW1lU3RhdGUucGxheWVyQ2FyZHMubGVuZ3RoLCBjb21wYXJlRm4pO1xyXG4gICAgYXNzb2NpYXRlQW5pbWF0aW9uc1dpdGhDYXJkcyhnYW1lU3RhdGUsIHByZXZpb3VzR2FtZVN0YXRlKTtcclxuICAgIHJldHVybiByZW9yZGVyQ2FyZHMoZ2FtZVN0YXRlKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHNvcnRCeVJhbmsoZ2FtZVN0YXRlOiBMaWIuR2FtZVN0YXRlKSB7XHJcbiAgICBsZXQgY29tcGFyZUZuID0gKFthU3VpdCwgYVJhbmtdOiBMaWIuQ2FyZCwgW2JTdWl0LCBiUmFua106IExpYi5DYXJkKSA9PiB7XHJcbiAgICAgICAgaWYgKGFSYW5rICE9PSBiUmFuaykge1xyXG4gICAgICAgICAgICByZXR1cm4gYVJhbmsgLSBiUmFuaztcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICByZXR1cm4gYVN1aXQgLSBiU3VpdDtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIHByZXZpb3VzR2FtZVN0YXRlID0gPExpYi5HYW1lU3RhdGU+SlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShnYW1lU3RhdGUpKTtcclxuICAgIHNvcnRDYXJkcyhnYW1lU3RhdGUucGxheWVyQ2FyZHMsIDAsIGdhbWVTdGF0ZS5wbGF5ZXJTaGFyZUNvdW50LCBjb21wYXJlRm4pO1xyXG4gICAgc29ydENhcmRzKGdhbWVTdGF0ZS5wbGF5ZXJDYXJkcywgZ2FtZVN0YXRlLnBsYXllclNoYXJlQ291bnQsIGdhbWVTdGF0ZS5wbGF5ZXJSZXZlYWxDb3VudCwgY29tcGFyZUZuKTtcclxuICAgIHNvcnRDYXJkcyhnYW1lU3RhdGUucGxheWVyQ2FyZHMsIGdhbWVTdGF0ZS5wbGF5ZXJSZXZlYWxDb3VudCwgZ2FtZVN0YXRlLnBsYXllckNhcmRzLmxlbmd0aCwgY29tcGFyZUZuKTtcclxuICAgIGFzc29jaWF0ZUFuaW1hdGlvbnNXaXRoQ2FyZHMoZ2FtZVN0YXRlLCBwcmV2aW91c0dhbWVTdGF0ZSk7XHJcbiAgICByZXR1cm4gcmVvcmRlckNhcmRzKGdhbWVTdGF0ZSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNvcnRDYXJkcyhcclxuICAgIGNhcmRzOiBMaWIuQ2FyZFtdLFxyXG4gICAgc3RhcnQ6IG51bWJlcixcclxuICAgIGVuZDogbnVtYmVyLFxyXG4gICAgY29tcGFyZUZuOiAoYTogTGliLkNhcmQsIGI6IExpYi5DYXJkKSA9PiBudW1iZXJcclxuKSB7XHJcbiAgICBjb25zdCBzZWN0aW9uID0gY2FyZHMuc2xpY2Uoc3RhcnQsIGVuZCk7XHJcbiAgICBzZWN0aW9uLnNvcnQoY29tcGFyZUZuKTtcclxuICAgIGNhcmRzLnNwbGljZShzdGFydCwgZW5kIC0gc3RhcnQsIC4uLnNlY3Rpb24pO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gd2FpdCgpIHtcclxuICAgIHJldHVybiBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgYWRkQ2FsbGJhY2soJ3dhaXQnLCByZXNvbHZlLCByZWplY3QpO1xyXG4gICAgICAgIHdzLnNlbmQoSlNPTi5zdHJpbmdpZnkoPExpYi5XYWl0TWVzc2FnZT57XHJcbiAgICAgICAgICAgIHdhaXQ6IG51bGxcclxuICAgICAgICB9KSk7XHJcbiAgICB9KTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHByb2NlZWQoKSB7XHJcbiAgICByZXR1cm4gbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgIGFkZENhbGxiYWNrKCdwcm9jZWVkJywgcmVzb2x2ZSwgcmVqZWN0KTtcclxuICAgICAgICB3cy5zZW5kKEpTT04uc3RyaW5naWZ5KDxMaWIuUHJvY2VlZE1lc3NhZ2U+e1xyXG4gICAgICAgICAgICBwcm9jZWVkOiBudWxsXHJcbiAgICAgICAgfSkpO1xyXG4gICAgfSk7XHJcbn0iLCJleHBvcnQgZGVmYXVsdCBjbGFzcyBWZWN0b3Ige1xyXG4gICAgcmVhZG9ubHkgeDogbnVtYmVyID0gMDtcclxuICAgIHJlYWRvbmx5IHk6IG51bWJlciA9IDA7XHJcblxyXG4gICAgY29uc3RydWN0b3IoeDogbnVtYmVyLCB5OiBudW1iZXIpIHtcclxuICAgICAgICB0aGlzLnggPSB4O1xyXG4gICAgICAgIHRoaXMueSA9IHk7XHJcbiAgICB9XHJcblxyXG4gICAgLypcclxuICAgIGFzc2lnbih2OiBWZWN0b3IpIHtcclxuICAgICAgICB0aGlzLnggPSB2Lng7XHJcbiAgICAgICAgdGhpcy55ID0gdi55O1xyXG4gICAgfVxyXG4gICAgKi9cclxuXHJcbiAgICBhZGQodjogVmVjdG9yKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWN0b3IodGhpcy54ICsgdi54LCB0aGlzLnkgKyB2LnkpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qXHJcbiAgICBhZGRTZWxmKHY6IFZlY3Rvcikge1xyXG4gICAgICAgIHRoaXMueCArPSB2Lng7XHJcbiAgICAgICAgdGhpcy55ICs9IHYueTtcclxuICAgIH1cclxuICAgICovXHJcbiAgICBcclxuICAgIHN1Yih2OiBWZWN0b3IpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlY3Rvcih0aGlzLnggLSB2LngsIHRoaXMueSAtIHYueSk7XHJcbiAgICB9XHJcblxyXG4gICAgLypcclxuICAgIHN1YlNlbGYodjogVmVjdG9yKSB7XHJcbiAgICAgICAgdGhpcy54IC09IHYueDtcclxuICAgICAgICB0aGlzLnkgLT0gdi55O1xyXG4gICAgfVxyXG4gICAgKi9cclxuICAgIFxyXG4gICAgZ2V0IGxlbmd0aCgpIHtcclxuICAgICAgICByZXR1cm4gTWF0aC5zcXJ0KHRoaXMueCAqIHRoaXMueCArIHRoaXMueSAqIHRoaXMueSk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIGRpc3RhbmNlKHY6IFZlY3Rvcik6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuc3ViKHYpLmxlbmd0aDtcclxuICAgIH1cclxuICAgIFxyXG4gICAgc2NhbGUoczogbnVtYmVyKTogVmVjdG9yIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlY3RvcihzICogdGhpcy54LCBzICogdGhpcy55KTtcclxuICAgIH1cclxuXHJcbiAgICAvKlxyXG4gICAgc2NhbGVTZWxmKHM6IG51bWJlcikge1xyXG4gICAgICAgIHRoaXMueCAqPSBzO1xyXG4gICAgICAgIHRoaXMueSAqPSBzO1xyXG4gICAgfVxyXG4gICAgKi9cclxufSIsImltcG9ydCBWZWN0b3IgZnJvbSAnLi92ZWN0b3InO1xyXG5cclxuZXhwb3J0IGNvbnN0IGNhbnZhcyA9IDxIVE1MQ2FudmFzRWxlbWVudD5kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2FudmFzJyk7XHJcbmV4cG9ydCBjb25zdCBjb250ZXh0ID0gPENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRD5jYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcclxuXHJcbi8vIGdldCBwaXhlbHMgcGVyIGNlbnRpbWV0ZXIsIHdoaWNoIGlzIGNvbnN0YW50XHJcbmNvbnN0IHRlc3RFbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcbnRlc3RFbGVtZW50LnN0eWxlLndpZHRoID0gJzFjbSc7XHJcbmRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodGVzdEVsZW1lbnQpO1xyXG5leHBvcnQgY29uc3QgcGl4ZWxzUGVyQ00gPSB0ZXN0RWxlbWVudC5vZmZzZXRXaWR0aDtcclxuZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZCh0ZXN0RWxlbWVudCk7XHJcblxyXG4vLyB0aGVzZSBwYXJhbWV0ZXJzIGNoYW5nZSB3aXRoIHJlc2l6aW5nXHJcbmV4cG9ydCBsZXQgY2FudmFzUmVjdCA9IGNhbnZhcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuZXhwb3J0IGxldCBwaXhlbHNQZXJQZXJjZW50ID0gMDtcclxuXHJcbmV4cG9ydCBsZXQgc3ByaXRlV2lkdGg6IG51bWJlcjtcclxuZXhwb3J0IGxldCBzcHJpdGVIZWlnaHQ6IG51bWJlcjtcclxuZXhwb3J0IGxldCBzcHJpdGVHYXA6IG51bWJlcjtcclxuZXhwb3J0IGxldCBzcHJpdGVEZWNrR2FwOiBudW1iZXI7XHJcblxyXG5leHBvcnQgbGV0IHNvcnRCeVJhbmtGb250OiBzdHJpbmc7XHJcbmV4cG9ydCBsZXQgc29ydEJ5UmFua0JvdW5kczogW1ZlY3RvciwgVmVjdG9yXTtcclxuXHJcbmV4cG9ydCBsZXQgc29ydEJ5U3VpdEZvbnQ6IHN0cmluZztcclxuZXhwb3J0IGxldCBzb3J0QnlTdWl0Qm91bmRzOiBbVmVjdG9yLCBWZWN0b3JdO1xyXG5cclxuZXhwb3J0IGxldCB3YWl0Rm9udDogc3RyaW5nO1xyXG5leHBvcnQgbGV0IHdhaXRCb3VuZHM6IFtWZWN0b3IsIFZlY3Rvcl07XHJcblxyXG5leHBvcnQgbGV0IHByb2NlZWRGb250OiBzdHJpbmc7XHJcbmV4cG9ydCBsZXQgcHJvY2VlZEJvdW5kczogW1ZlY3RvciwgVmVjdG9yXTtcclxuXHJcbmV4cG9ydCBsZXQgcmVhZHlGb250OiBzdHJpbmc7XHJcbmV4cG9ydCBsZXQgcmVhZHlCb3VuZHM6IFtWZWN0b3IsIFZlY3Rvcl07XHJcblxyXG5leHBvcnQgbGV0IGNvdW50ZG93bkZvbnQ6IHN0cmluZztcclxuZXhwb3J0IGxldCBjb3VudGRvd25Cb3VuZHM6IFtWZWN0b3IsIFZlY3Rvcl07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmVjYWxjdWxhdGVQYXJhbWV0ZXJzKCkge1xyXG4gICAgY2FudmFzLndpZHRoID0gd2luZG93LmlubmVyV2lkdGg7XHJcbiAgICBjYW52YXMuaGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IC0gMC41ICogcGl4ZWxzUGVyQ007XHJcbiAgICBjYW52YXNSZWN0ID0gY2FudmFzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG5cclxuICAgIHBpeGVsc1BlclBlcmNlbnQgPSBjYW52YXMuaGVpZ2h0IC8gMTAwO1xyXG4gICAgc3ByaXRlV2lkdGggPSAxMiAqIHBpeGVsc1BlclBlcmNlbnQ7XHJcbiAgICBzcHJpdGVIZWlnaHQgPSAxOCAqIHBpeGVsc1BlclBlcmNlbnQ7XHJcbiAgICBzcHJpdGVHYXAgPSAyICogcGl4ZWxzUGVyUGVyY2VudDtcclxuICAgIHNwcml0ZURlY2tHYXAgPSAwLjUgKiBwaXhlbHNQZXJQZXJjZW50O1xyXG5cclxuICAgIHNvcnRCeVJhbmtCb3VuZHMgPSBbbmV3IFZlY3RvcigwLCAwKSwgbmV3IFZlY3RvcigwLCAwKV07XHJcblxyXG4gICAgc29ydEJ5U3VpdEJvdW5kcyA9IFtuZXcgVmVjdG9yKDAsIDApLCBuZXcgVmVjdG9yKDAsIDApXTtcclxuXHJcbiAgICBjb25zdCBhcHByb3ZlUG9zaXRpb24gPSBuZXcgVmVjdG9yKGNhbnZhcy53aWR0aCAtIDIgKiBzcHJpdGVIZWlnaHQsIGNhbnZhcy5oZWlnaHQgLSAxMSAqIHNwcml0ZUhlaWdodCAvIDEyKTtcclxuICAgIHdhaXRGb250ID0gYCR7c3ByaXRlSGVpZ2h0IC8gM31weCBTdWdhcmxpa2VgO1xyXG4gICAgd2FpdEJvdW5kcyA9IFthcHByb3ZlUG9zaXRpb24sIGdldEJvdHRvbVJpZ2h0KCdXYWl0IScsIHdhaXRGb250LCBhcHByb3ZlUG9zaXRpb24pXTtcclxuXHJcbiAgICBjb25zdCBkaXNhcHByb3ZlUG9zaXRpb24gPSBuZXcgVmVjdG9yKGNhbnZhcy53aWR0aCAtIDIgKiBzcHJpdGVIZWlnaHQsIGNhbnZhcy5oZWlnaHQgLSA1ICogc3ByaXRlSGVpZ2h0IC8gMTIpO1xyXG4gICAgcHJvY2VlZEZvbnQgPSBgJHtzcHJpdGVIZWlnaHQgLyAzfXB4IFN1Z2FybGlrZWA7XHJcbiAgICBwcm9jZWVkQm91bmRzID0gW2Rpc2FwcHJvdmVQb3NpdGlvbiwgZ2V0Qm90dG9tUmlnaHQoJ1Byb2NlZWQuJywgcHJvY2VlZEZvbnQsIGRpc2FwcHJvdmVQb3NpdGlvbildO1xyXG5cclxuICAgIGNvbnN0IHJlYWR5UG9zaXRpb24gPSBuZXcgVmVjdG9yKGNhbnZhcy53aWR0aCAtIDIgKiBzcHJpdGVIZWlnaHQsIGNhbnZhcy5oZWlnaHQgLSAzICogc3ByaXRlSGVpZ2h0IC8gNCk7XHJcbiAgICByZWFkeUZvbnQgPSBgJHtzcHJpdGVIZWlnaHQgLyAyfXB4IFN1Z2FybGlrZWA7XHJcbiAgICByZWFkeUJvdW5kcyA9IFtyZWFkeVBvc2l0aW9uLCBnZXRCb3R0b21SaWdodCgnUmVhZHkhJywgcmVhZHlGb250LCByZWFkeVBvc2l0aW9uKV07XHJcblxyXG4gICAgY29uc3QgY291bnRkb3duUG9zaXRpb24gPSBuZXcgVmVjdG9yKGNhbnZhcy53aWR0aCAtIDMuNSAqIHNwcml0ZUhlaWdodCwgY2FudmFzLmhlaWdodCAtIDIgKiBzcHJpdGVIZWlnaHQgLyAzKTtcclxuICAgIGNvdW50ZG93bkZvbnQgPSBgJHtzcHJpdGVIZWlnaHQgLyAyfXB4IFN1Z2FybGlrZWA7XHJcbiAgICBjb3VudGRvd25Cb3VuZHMgPSBbY291bnRkb3duUG9zaXRpb24sIGdldEJvdHRvbVJpZ2h0KCdXYWl0aW5nIDEwIHNlY29uZHMuLi4nLCBjb3VudGRvd25Gb250LCBjb3VudGRvd25Qb3NpdGlvbildO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRCb3R0b21SaWdodCh0ZXh0OiBzdHJpbmcsIGZvbnQ6IHN0cmluZywgcG9zaXRpb246IFZlY3Rvcik6IFZlY3RvciB7XHJcbiAgICBjb250ZXh0LmZvbnQgPSBmb250O1xyXG4gICAgY29udGV4dC50ZXh0QmFzZWxpbmUgPSAndG9wJztcclxuICAgIGNvbnN0IHRleHRNZXRyaWNzID0gY29udGV4dC5tZWFzdXJlVGV4dCh0ZXh0KTtcclxuICAgIHJldHVybiBwb3NpdGlvbi5hZGQobmV3IFZlY3Rvcih0ZXh0TWV0cmljcy53aWR0aCwgdGV4dE1ldHJpY3MuYWN0dWFsQm91bmRpbmdCb3hEZXNjZW50KSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRUcmFuc2Zvcm1Gb3JQbGF5ZXIocmVsYXRpdmVJbmRleDogbnVtYmVyKTogRE9NTWF0cml4IHtcclxuICAgIGNvbnRleHQuc2F2ZSgpO1xyXG4gICAgdHJ5IHtcclxuICAgICAgICBpZiAocmVsYXRpdmVJbmRleCA9PT0gMCkge1xyXG4gICAgICAgICAgICByZXR1cm4gY29udGV4dC5nZXRUcmFuc2Zvcm0oKTtcclxuICAgICAgICB9IGVsc2UgaWYgKHJlbGF0aXZlSW5kZXggPT09IDEpIHtcclxuICAgICAgICAgICAgY29udGV4dC50cmFuc2xhdGUoMCwgKGNhbnZhcy53aWR0aCArIGNhbnZhcy5oZWlnaHQpIC8gMik7XHJcbiAgICAgICAgICAgIGNvbnRleHQucm90YXRlKC1NYXRoLlBJIC8gMik7XHJcbiAgICAgICAgICAgIHJldHVybiBjb250ZXh0LmdldFRyYW5zZm9ybSgpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAocmVsYXRpdmVJbmRleCA9PT0gMikge1xyXG4gICAgICAgICAgICAvLyBubyB0cmFuc2Zvcm1cclxuICAgICAgICAgICAgcmV0dXJuIGNvbnRleHQuZ2V0VHJhbnNmb3JtKCk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChyZWxhdGl2ZUluZGV4ID09PSAzKSB7XHJcbiAgICAgICAgICAgIGNvbnRleHQudHJhbnNsYXRlKGNhbnZhcy53aWR0aCwgKGNhbnZhcy5oZWlnaHQgLSBjYW52YXMud2lkdGgpIC8gMik7XHJcbiAgICAgICAgICAgIGNvbnRleHQucm90YXRlKE1hdGguUEkgLyAyKTtcclxuICAgICAgICAgICAgcmV0dXJuIGNvbnRleHQuZ2V0VHJhbnNmb3JtKCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBpbmRleCBtdXN0IGJlIDAsIDEsIDIsIG9yIDM7IGdvdDogJHtyZWxhdGl2ZUluZGV4fWApO1xyXG4gICAgICAgIH1cclxuICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgY29udGV4dC5yZXN0b3JlKCk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRSZWxhdGl2ZVBsYXllckluZGV4KG90aGVyUGxheWVySW5kZXg6IG51bWJlciwgcGxheWVySW5kZXg6IG51bWJlcikge1xyXG4gICAgbGV0IHJlbGF0aXZlSW5kZXggPSBvdGhlclBsYXllckluZGV4IC0gcGxheWVySW5kZXg7XHJcbiAgICBpZiAocmVsYXRpdmVJbmRleCA+PSAwKSB7XHJcbiAgICAgICAgcmV0dXJuIHJlbGF0aXZlSW5kZXg7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIG90aGVyUGxheWVySW5kZXggLSAocGxheWVySW5kZXggLSA0KTtcclxufSIsImltcG9ydCBiaW5hcnlTZWFyY2ggZnJvbSAnYmluYXJ5LXNlYXJjaCc7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gYmluYXJ5U2VhcmNoTnVtYmVyKGhheXN0YWNrOiBudW1iZXJbXSwgbmVlZGxlOiBudW1iZXIsIGxvdz86IG51bWJlciwgaGlnaD86IG51bWJlcikge1xyXG4gICAgcmV0dXJuIGJpbmFyeVNlYXJjaChoYXlzdGFjaywgbmVlZGxlLCAoYSwgYikgPT4gYSAtIGIsIGxvdywgaGlnaCk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRDb29raWUobmFtZTogc3RyaW5nKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcclxuICAgIGNvbnN0IHBhcnRzID0gYDsgJHtkb2N1bWVudC5jb29raWV9YC5zcGxpdChgOyAke25hbWV9PWApO1xyXG4gICAgaWYgKHBhcnRzLmxlbmd0aCA9PT0gMikge1xyXG4gICAgICAgIHJldHVybiBwYXJ0cy5wb3AoKT8uc3BsaXQoJzsnKS5zaGlmdCgpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0UGFyYW0obmFtZTogc3RyaW5nKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcclxuICAgIHJldHVybiB3aW5kb3cubG9jYXRpb24uc2VhcmNoLnNwbGl0KGAke25hbWV9PWApWzFdPy5zcGxpdChcIiZcIilbMF07XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBkZWxheShtczogbnVtYmVyKSB7XHJcbiAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIG1zKSk7XHJcbn1cclxuXHJcbmV4cG9ydCBlbnVtIFN1aXQge1xyXG4gICAgQ2x1YiwgLy8gMFxyXG4gICAgRGlhbW9uZCxcclxuICAgIEhlYXJ0LFxyXG4gICAgU3BhZGUsXHJcbiAgICBKb2tlciwgLy8gNFxyXG59XHJcblxyXG5leHBvcnQgZW51bSBSYW5rIHtcclxuICAgIFNtYWxsLCAvLyAwXHJcbiAgICBBY2UsXHJcbiAgICBUd28sXHJcbiAgICBUaHJlZSxcclxuICAgIEZvdXIsXHJcbiAgICBGaXZlLFxyXG4gICAgU2l4LFxyXG4gICAgU2V2ZW4sXHJcbiAgICBFaWdodCxcclxuICAgIE5pbmUsXHJcbiAgICBUZW4sXHJcbiAgICBKYWNrLFxyXG4gICAgUXVlZW4sXHJcbiAgICBLaW5nLFxyXG4gICAgQmlnLCAvLyAxNFxyXG59XHJcblxyXG5leHBvcnQgdHlwZSBDYXJkID0gW1N1aXQsIFJhbmtdO1xyXG5cclxuZXhwb3J0IHR5cGUgUGxheWVyU3RhdGUgPSBcIldhaXRcIiB8IFwiUHJvY2VlZFwiIHwgXCJSZWFkeVwiIHwgQWN0aXZlO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBBY3RpdmUge1xyXG4gICAgdHlwZTogXCJBY3RpdmVcIjtcclxuICAgIGFjdGl2ZVRpbWU6IG51bWJlcjtcclxufVxyXG5cclxuZXhwb3J0IGNvbnN0IGFjdGl2ZUNvb2xkb3duID0gMTAwMDA7IC8vbWlsbGlzZWNvbmRzXHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIE90aGVyUGxheWVyIHtcclxuICAgIG5hbWU6IHN0cmluZztcclxuICAgIHNoYXJlQ291bnQ6IG51bWJlcjtcclxuICAgIHJldmVhbGVkQ2FyZHM6IENhcmRbXTtcclxuICAgIGNhcmRDb3VudDogbnVtYmVyO1xyXG4gICAgLy9zdGF0ZTogUGxheWVyU3RhdGU7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgR2FtZVN0YXRlIHtcclxuICAgIGRlY2tDb3VudDogbnVtYmVyO1xyXG4gICAgcGxheWVySW5kZXg6IG51bWJlcjtcclxuICAgIHBsYXllckNhcmRzOiBDYXJkW107XHJcbiAgICBwbGF5ZXJTaGFyZUNvdW50OiBudW1iZXI7XHJcbiAgICBwbGF5ZXJSZXZlYWxDb3VudDogbnVtYmVyO1xyXG4gICAgLy9wbGF5ZXJTdGF0ZTogUGxheWVyU3RhdGU7XHJcbiAgICBvdGhlclBsYXllcnM6IChPdGhlclBsYXllciB8IG51bGwpW107XHJcbn1cclxuXHJcbmV4cG9ydCB0eXBlIE1ldGhvZE5hbWUgPVxyXG4gICAgXCJqb2luR2FtZVwiIHxcclxuICAgIFwidGFrZUNhcmRcIiB8XHJcbiAgICBcImRyYXdDYXJkXCIgfFxyXG4gICAgXCJyZXR1cm5DYXJkc1RvRGVja1wiIHxcclxuICAgIFwicmVvcmRlckNhcmRzXCIgfFxyXG4gICAgXCJ3YWl0XCIgfFxyXG4gICAgXCJwcm9jZWVkXCI7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIE1ldGhvZFJlc3VsdCB7XHJcbiAgICBtZXRob2ROYW1lOiBNZXRob2ROYW1lO1xyXG4gICAgZXJyb3JEZXNjcmlwdGlvbj86IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBKb2luR2FtZU1lc3NhZ2Uge1xyXG4gICAgZ2FtZUlkOiBzdHJpbmc7XHJcbiAgICBwbGF5ZXJOYW1lOiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgVGFrZUNhcmRNZXNzYWdlIHtcclxuICAgIG90aGVyUGxheWVySW5kZXg6IG51bWJlcjtcclxuICAgIGNhcmRJbmRleDogbnVtYmVyO1xyXG4gICAgY2FyZDogQ2FyZDtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBEcmF3Q2FyZE1lc3NhZ2Uge1xyXG4gICAgZHJhd0NhcmQ6IG51bGw7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgUmV0dXJuQ2FyZHNUb0RlY2tNZXNzYWdlIHtcclxuICAgIGNhcmRzVG9SZXR1cm5Ub0RlY2s6IENhcmRbXTtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBSZW9yZGVyQ2FyZHNNZXNzYWdlIHtcclxuICAgIHJlb3JkZXJlZENhcmRzOiBDYXJkW107XHJcbiAgICBuZXdTaGFyZUNvdW50OiBudW1iZXI7XHJcbiAgICBuZXdSZXZlYWxDb3VudDogbnVtYmVyO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFdhaXRNZXNzYWdlIHtcclxuICAgIHdhaXQ6IG51bGw7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgUHJvY2VlZE1lc3NhZ2Uge1xyXG4gICAgcHJvY2VlZDogbnVsbDtcclxufSJdfQ==
