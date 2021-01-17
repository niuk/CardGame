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
        } /*else if (
            VP.waitBounds[0].x < mouseDownPosition.x && mouseDownPosition.x < VP.waitBounds[1].x &&
            VP.waitBounds[0].y < mouseDownPosition.y && mouseDownPosition.y < VP.waitBounds[1].y
        ) {
            action = "Wait";
        } else if (
            VP.proceedBounds[0].x < mouseDownPosition.x && mouseDownPosition.x < VP.proceedBounds[1].x &&
            VP.proceedBounds[0].y < mouseDownPosition.y && mouseDownPosition.y < VP.proceedBounds[1].y
        ) {
            action = "Proceed";
        } */
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
        } /*else if (action === "Wait") {
            // TODO: check whether mouse position has left button bounds
        } else if (action === "Proceed") {
            // TODO: check whether mouse position has left button bounds
        } */
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
                            //action !== "Wait" &&
                            //action !== "Proceed" &&
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
        } /*else if (action === "Wait") {
            console.log('waiting');
            await State.wait();
        } else if (action === "Proceed") {
            console.log('proceeding');
            await State.proceed();
        } */
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
                //action !== "Wait" &&
                //action !== "Proceed" &&
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
                //faceSpriteAtMouseDown.velocity = deckSprite.velocity;
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
async function render(time) {
    if (currentTime === undefined) {
        currentTime = time;
    }
    while (State.gameState === undefined) {
        await Lib.delay(100);
    }
    const deltaTime = time - currentTime;
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
                //Input.action !== "Wait" &&
                //Input.action !== "Proceed" &&
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
const decayPerSecond = 1 / 60;
class Sprite {
    constructor(image) {
        this.image = image;
        this.target = new vector_1.default(0, 0);
        this.position = new vector_1.default(0, 0);
    }
    animate(deltaTime) {
        this.position = this.position.add(this.target.sub(this.position).scale(1 - Math.pow(1 - decayPerSecond, deltaTime)));
        VP.context.drawImage(this.image, 0, 0, VP.spriteWidth, VP.spriteHeight, this.position.x, this.position.y, VP.spriteWidth, VP.spriteHeight);
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
exports.sortByRank = exports.sortBySuit = exports.reorderCards = exports.returnCardsToDeck = exports.drawCard = exports.takeCard = exports.joinGame = exports.setSpriteTargets = exports.faceSpritesForPlayer = exports.backSpritesForPlayer = exports.deckSprites = exports.selectedIndices = exports.gameState = exports.previousGameState = exports.lock = exports.gameId = exports.playerName = void 0;
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
/*
export function wait() {
    return new Promise<void>((resolve, reject) => {
        addCallback('wait', resolve, reject);
        ws.send(JSON.stringify(<Lib.WaitMessage>{
            wait: null
        }));
    });
}

export function proceed() {
    return new Promise<void>((resolve, reject) => {
        addCallback('proceed', resolve, reject);
        ws.send(JSON.stringify(<Lib.ProceedMessage>{
            proceed: null
        }));
    });
}
*/ 
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
/*
export interface WaitMessage {
    wait: null;
}

export interface ProceedMessage {
    proceed: null;
}
*/ 
},{"binary-search":2}]},{},[8,6])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYXdhaXQtc2VtYXBob3JlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2JpbmFyeS1zZWFyY2gvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL3RpbWVycy1icm93c2VyaWZ5L21haW4uanMiLCJzcmMvY2xpZW50L2NhcmQtaW1hZ2VzLnRzIiwic3JjL2NsaWVudC9nYW1lLnRzIiwic3JjL2NsaWVudC9pbnB1dC50cyIsInNyYy9jbGllbnQvbG9iYnkudHMiLCJzcmMvY2xpZW50L3JlbmRlci50cyIsInNyYy9jbGllbnQvc3ByaXRlLnRzIiwic3JjL2NsaWVudC9zdGF0ZS50cyIsInNyYy9jbGllbnQvdmVjdG9yLnRzIiwic3JjL2NsaWVudC92aWV3LXBhcmFtcy50cyIsInNyYy9saWIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUN4TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FDM0VBLDRDQUE4QjtBQUU5QixNQUFNLEtBQUssR0FBRyxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQztBQUM5RCxNQUFNLEtBQUssR0FBRyxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFFakcsTUFBTSxVQUFVLEdBQUcsSUFBSSxHQUFHLEVBQTRCLENBQUM7QUFFaEQsS0FBSyxVQUFVLElBQUk7SUFDdEIsa0NBQWtDO0lBQ2xDLEtB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QUFBO0lBQ0wsNkJBQUcsQ0FBQTtJQUNILDZCQUFHLENBQUE7SUFDSCxpQ0FBSyxDQUFBO0lBQ0wsK0JBQUksQ0FBQTtJQUNKLCtCQUFJLENBQUE7SUFDSiw2QkFBRyxDQUFBO0lBQ0gsaUNBQUssQ0FBQTtJQUNMLGlDQUFLLENBQUE7SUFDTCwrQkFBSSxDQUFBO0lBQ0osOEJBQUcsQ0FBQTtJQUNILGdDQUFJLENBQUE7SUFDSixrQ0FBSyxDQUFBO0lBQ0wsZ0NBQUksQ0FBQTtJQUNKLDhCQUFHLENBQUE7QUFDUCxDQUFDLEVBaEJXLElBQUksR0FBSixZQUFJLEtBQUosWUFBSSxRQWdCZjtBQVdZLFFBQUEsY0FBYyxHQUFHLEtBQUssQ0FBQyxDQUFDLGNBQWM7QUEwRG5EOzs7Ozs7OztFQVFFIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiXCJ1c2Ugc3RyaWN0XCI7XG5jbGFzcyBTZW1hcGhvcmUge1xuICAgIGNvbnN0cnVjdG9yKGNvdW50KSB7XG4gICAgICAgIHRoaXMudGFza3MgPSBbXTtcbiAgICAgICAgdGhpcy5jb3VudCA9IGNvdW50O1xuICAgIH1cbiAgICBzY2hlZCgpIHtcbiAgICAgICAgaWYgKHRoaXMuY291bnQgPiAwICYmIHRoaXMudGFza3MubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgdGhpcy5jb3VudC0tO1xuICAgICAgICAgICAgbGV0IG5leHQgPSB0aGlzLnRhc2tzLnNoaWZ0KCk7XG4gICAgICAgICAgICBpZiAobmV4dCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgXCJVbmV4cGVjdGVkIHVuZGVmaW5lZCB2YWx1ZSBpbiB0YXNrcyBsaXN0XCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgYWNxdWlyZSgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXMsIHJlaikgPT4ge1xuICAgICAgICAgICAgdmFyIHRhc2sgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgdmFyIHJlbGVhc2VkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgcmVzKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFyZWxlYXNlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVsZWFzZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb3VudCsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zY2hlZCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdGhpcy50YXNrcy5wdXNoKHRhc2spO1xuICAgICAgICAgICAgaWYgKHByb2Nlc3MgJiYgcHJvY2Vzcy5uZXh0VGljaykge1xuICAgICAgICAgICAgICAgIHByb2Nlc3MubmV4dFRpY2sodGhpcy5zY2hlZC5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHNldEltbWVkaWF0ZSh0aGlzLnNjaGVkLmJpbmQodGhpcykpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgdXNlKGYpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYWNxdWlyZSgpXG4gICAgICAgICAgICAudGhlbihyZWxlYXNlID0+IHtcbiAgICAgICAgICAgIHJldHVybiBmKClcbiAgICAgICAgICAgICAgICAudGhlbigocmVzKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVsZWFzZSgpO1xuICAgICAgICAgICAgICAgIHJldHVybiByZXM7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVsZWFzZSgpO1xuICAgICAgICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG59XG5leHBvcnRzLlNlbWFwaG9yZSA9IFNlbWFwaG9yZTtcbmNsYXNzIE11dGV4IGV4dGVuZHMgU2VtYXBob3JlIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoMSk7XG4gICAgfVxufVxuZXhwb3J0cy5NdXRleCA9IE11dGV4O1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9aW5kZXguanMubWFwIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihoYXlzdGFjaywgbmVlZGxlLCBjb21wYXJhdG9yLCBsb3csIGhpZ2gpIHtcbiAgdmFyIG1pZCwgY21wO1xuXG4gIGlmKGxvdyA9PT0gdW5kZWZpbmVkKVxuICAgIGxvdyA9IDA7XG5cbiAgZWxzZSB7XG4gICAgbG93ID0gbG93fDA7XG4gICAgaWYobG93IDwgMCB8fCBsb3cgPj0gaGF5c3RhY2subGVuZ3RoKVxuICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoXCJpbnZhbGlkIGxvd2VyIGJvdW5kXCIpO1xuICB9XG5cbiAgaWYoaGlnaCA9PT0gdW5kZWZpbmVkKVxuICAgIGhpZ2ggPSBoYXlzdGFjay5sZW5ndGggLSAxO1xuXG4gIGVsc2Uge1xuICAgIGhpZ2ggPSBoaWdofDA7XG4gICAgaWYoaGlnaCA8IGxvdyB8fCBoaWdoID49IGhheXN0YWNrLmxlbmd0aClcbiAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKFwiaW52YWxpZCB1cHBlciBib3VuZFwiKTtcbiAgfVxuXG4gIHdoaWxlKGxvdyA8PSBoaWdoKSB7XG4gICAgLy8gVGhlIG5haXZlIGBsb3cgKyBoaWdoID4+PiAxYCBjb3VsZCBmYWlsIGZvciBhcnJheSBsZW5ndGhzID4gMioqMzFcbiAgICAvLyBiZWNhdXNlIGA+Pj5gIGNvbnZlcnRzIGl0cyBvcGVyYW5kcyB0byBpbnQzMi4gYGxvdyArIChoaWdoIC0gbG93ID4+PiAxKWBcbiAgICAvLyB3b3JrcyBmb3IgYXJyYXkgbGVuZ3RocyA8PSAyKiozMi0xIHdoaWNoIGlzIGFsc28gSmF2YXNjcmlwdCdzIG1heCBhcnJheVxuICAgIC8vIGxlbmd0aC5cbiAgICBtaWQgPSBsb3cgKyAoKGhpZ2ggLSBsb3cpID4+PiAxKTtcbiAgICBjbXAgPSArY29tcGFyYXRvcihoYXlzdGFja1ttaWRdLCBuZWVkbGUsIG1pZCwgaGF5c3RhY2spO1xuXG4gICAgLy8gVG9vIGxvdy5cbiAgICBpZihjbXAgPCAwLjApXG4gICAgICBsb3cgID0gbWlkICsgMTtcblxuICAgIC8vIFRvbyBoaWdoLlxuICAgIGVsc2UgaWYoY21wID4gMC4wKVxuICAgICAgaGlnaCA9IG1pZCAtIDE7XG5cbiAgICAvLyBLZXkgZm91bmQuXG4gICAgZWxzZVxuICAgICAgcmV0dXJuIG1pZDtcbiAgfVxuXG4gIC8vIEtleSBub3QgZm91bmQuXG4gIHJldHVybiB+bG93O1xufVxuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbi8vIGNhY2hlZCBmcm9tIHdoYXRldmVyIGdsb2JhbCBpcyBwcmVzZW50IHNvIHRoYXQgdGVzdCBydW5uZXJzIHRoYXQgc3R1YiBpdFxuLy8gZG9uJ3QgYnJlYWsgdGhpbmdzLiAgQnV0IHdlIG5lZWQgdG8gd3JhcCBpdCBpbiBhIHRyeSBjYXRjaCBpbiBjYXNlIGl0IGlzXG4vLyB3cmFwcGVkIGluIHN0cmljdCBtb2RlIGNvZGUgd2hpY2ggZG9lc24ndCBkZWZpbmUgYW55IGdsb2JhbHMuICBJdCdzIGluc2lkZSBhXG4vLyBmdW5jdGlvbiBiZWNhdXNlIHRyeS9jYXRjaGVzIGRlb3B0aW1pemUgaW4gY2VydGFpbiBlbmdpbmVzLlxuXG52YXIgY2FjaGVkU2V0VGltZW91dDtcbnZhciBjYWNoZWRDbGVhclRpbWVvdXQ7XG5cbmZ1bmN0aW9uIGRlZmF1bHRTZXRUaW1vdXQoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdzZXRUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG5mdW5jdGlvbiBkZWZhdWx0Q2xlYXJUaW1lb3V0ICgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2NsZWFyVGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuKGZ1bmN0aW9uICgpIHtcbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIHNldFRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIGNsZWFyVGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICB9XG59ICgpKVxuZnVuY3Rpb24gcnVuVGltZW91dChmdW4pIHtcbiAgICBpZiAoY2FjaGVkU2V0VGltZW91dCA9PT0gc2V0VGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgLy8gaWYgc2V0VGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZFNldFRpbWVvdXQgPT09IGRlZmF1bHRTZXRUaW1vdXQgfHwgIWNhY2hlZFNldFRpbWVvdXQpICYmIHNldFRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9IGNhdGNoKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0IHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKG51bGwsIGZ1biwgMCk7XG4gICAgICAgIH0gY2F0Y2goZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvclxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbCh0aGlzLCBmdW4sIDApO1xuICAgICAgICB9XG4gICAgfVxuXG5cbn1cbmZ1bmN0aW9uIHJ1bkNsZWFyVGltZW91dChtYXJrZXIpIHtcbiAgICBpZiAoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgLy8gaWYgY2xlYXJUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBkZWZhdWx0Q2xlYXJUaW1lb3V0IHx8ICFjYWNoZWRDbGVhclRpbWVvdXQpICYmIGNsZWFyVGltZW91dCkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfSBjYXRjaCAoZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgIHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwobnVsbCwgbWFya2VyKTtcbiAgICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvci5cbiAgICAgICAgICAgIC8vIFNvbWUgdmVyc2lvbnMgb2YgSS5FLiBoYXZlIGRpZmZlcmVudCBydWxlcyBmb3IgY2xlYXJUaW1lb3V0IHZzIHNldFRpbWVvdXRcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbCh0aGlzLCBtYXJrZXIpO1xuICAgICAgICB9XG4gICAgfVxuXG5cblxufVxudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcbnZhciBjdXJyZW50UXVldWU7XG52YXIgcXVldWVJbmRleCA9IC0xO1xuXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XG4gICAgaWYgKCFkcmFpbmluZyB8fCAhY3VycmVudFF1ZXVlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICB9XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBkcmFpblF1ZXVlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0ID0gcnVuVGltZW91dChjbGVhblVwTmV4dFRpY2spO1xuICAgIGRyYWluaW5nID0gdHJ1ZTtcblxuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICBpZiAoY3VycmVudFF1ZXVlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFF1ZXVlW3F1ZXVlSW5kZXhdLnJ1bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBjdXJyZW50UXVldWUgPSBudWxsO1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgcnVuQ2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xufVxuXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLnB1c2gobmV3IEl0ZW0oZnVuLCBhcmdzKSk7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcbiAgICAgICAgcnVuVGltZW91dChkcmFpblF1ZXVlKTtcbiAgICB9XG59O1xuXG4vLyB2OCBsaWtlcyBwcmVkaWN0aWJsZSBvYmplY3RzXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcbiAgICB0aGlzLmZ1biA9IGZ1bjtcbiAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG59XG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5mdW4uYXBwbHkobnVsbCwgdGhpcy5hcnJheSk7XG59O1xucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xucHJvY2Vzcy5wcmVwZW5kTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5wcmVwZW5kT25jZUxpc3RlbmVyID0gbm9vcDtcblxucHJvY2Vzcy5saXN0ZW5lcnMgPSBmdW5jdGlvbiAobmFtZSkgeyByZXR1cm4gW10gfVxuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiIsInZhciBuZXh0VGljayA9IHJlcXVpcmUoJ3Byb2Nlc3MvYnJvd3Nlci5qcycpLm5leHRUaWNrO1xudmFyIGFwcGx5ID0gRnVuY3Rpb24ucHJvdG90eXBlLmFwcGx5O1xudmFyIHNsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlO1xudmFyIGltbWVkaWF0ZUlkcyA9IHt9O1xudmFyIG5leHRJbW1lZGlhdGVJZCA9IDA7XG5cbi8vIERPTSBBUElzLCBmb3IgY29tcGxldGVuZXNzXG5cbmV4cG9ydHMuc2V0VGltZW91dCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gbmV3IFRpbWVvdXQoYXBwbHkuY2FsbChzZXRUaW1lb3V0LCB3aW5kb3csIGFyZ3VtZW50cyksIGNsZWFyVGltZW91dCk7XG59O1xuZXhwb3J0cy5zZXRJbnRlcnZhbCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gbmV3IFRpbWVvdXQoYXBwbHkuY2FsbChzZXRJbnRlcnZhbCwgd2luZG93LCBhcmd1bWVudHMpLCBjbGVhckludGVydmFsKTtcbn07XG5leHBvcnRzLmNsZWFyVGltZW91dCA9XG5leHBvcnRzLmNsZWFySW50ZXJ2YWwgPSBmdW5jdGlvbih0aW1lb3V0KSB7IHRpbWVvdXQuY2xvc2UoKTsgfTtcblxuZnVuY3Rpb24gVGltZW91dChpZCwgY2xlYXJGbikge1xuICB0aGlzLl9pZCA9IGlkO1xuICB0aGlzLl9jbGVhckZuID0gY2xlYXJGbjtcbn1cblRpbWVvdXQucHJvdG90eXBlLnVucmVmID0gVGltZW91dC5wcm90b3R5cGUucmVmID0gZnVuY3Rpb24oKSB7fTtcblRpbWVvdXQucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuX2NsZWFyRm4uY2FsbCh3aW5kb3csIHRoaXMuX2lkKTtcbn07XG5cbi8vIERvZXMgbm90IHN0YXJ0IHRoZSB0aW1lLCBqdXN0IHNldHMgdXAgdGhlIG1lbWJlcnMgbmVlZGVkLlxuZXhwb3J0cy5lbnJvbGwgPSBmdW5jdGlvbihpdGVtLCBtc2Vjcykge1xuICBjbGVhclRpbWVvdXQoaXRlbS5faWRsZVRpbWVvdXRJZCk7XG4gIGl0ZW0uX2lkbGVUaW1lb3V0ID0gbXNlY3M7XG59O1xuXG5leHBvcnRzLnVuZW5yb2xsID0gZnVuY3Rpb24oaXRlbSkge1xuICBjbGVhclRpbWVvdXQoaXRlbS5faWRsZVRpbWVvdXRJZCk7XG4gIGl0ZW0uX2lkbGVUaW1lb3V0ID0gLTE7XG59O1xuXG5leHBvcnRzLl91bnJlZkFjdGl2ZSA9IGV4cG9ydHMuYWN0aXZlID0gZnVuY3Rpb24oaXRlbSkge1xuICBjbGVhclRpbWVvdXQoaXRlbS5faWRsZVRpbWVvdXRJZCk7XG5cbiAgdmFyIG1zZWNzID0gaXRlbS5faWRsZVRpbWVvdXQ7XG4gIGlmIChtc2VjcyA+PSAwKSB7XG4gICAgaXRlbS5faWRsZVRpbWVvdXRJZCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gb25UaW1lb3V0KCkge1xuICAgICAgaWYgKGl0ZW0uX29uVGltZW91dClcbiAgICAgICAgaXRlbS5fb25UaW1lb3V0KCk7XG4gICAgfSwgbXNlY3MpO1xuICB9XG59O1xuXG4vLyBUaGF0J3Mgbm90IGhvdyBub2RlLmpzIGltcGxlbWVudHMgaXQgYnV0IHRoZSBleHBvc2VkIGFwaSBpcyB0aGUgc2FtZS5cbmV4cG9ydHMuc2V0SW1tZWRpYXRlID0gdHlwZW9mIHNldEltbWVkaWF0ZSA9PT0gXCJmdW5jdGlvblwiID8gc2V0SW1tZWRpYXRlIDogZnVuY3Rpb24oZm4pIHtcbiAgdmFyIGlkID0gbmV4dEltbWVkaWF0ZUlkKys7XG4gIHZhciBhcmdzID0gYXJndW1lbnRzLmxlbmd0aCA8IDIgPyBmYWxzZSA6IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcblxuICBpbW1lZGlhdGVJZHNbaWRdID0gdHJ1ZTtcblxuICBuZXh0VGljayhmdW5jdGlvbiBvbk5leHRUaWNrKCkge1xuICAgIGlmIChpbW1lZGlhdGVJZHNbaWRdKSB7XG4gICAgICAvLyBmbi5jYWxsKCkgaXMgZmFzdGVyIHNvIHdlIG9wdGltaXplIGZvciB0aGUgY29tbW9uIHVzZS1jYXNlXG4gICAgICAvLyBAc2VlIGh0dHA6Ly9qc3BlcmYuY29tL2NhbGwtYXBwbHktc2VndVxuICAgICAgaWYgKGFyZ3MpIHtcbiAgICAgICAgZm4uYXBwbHkobnVsbCwgYXJncyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmbi5jYWxsKG51bGwpO1xuICAgICAgfVxuICAgICAgLy8gUHJldmVudCBpZHMgZnJvbSBsZWFraW5nXG4gICAgICBleHBvcnRzLmNsZWFySW1tZWRpYXRlKGlkKTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiBpZDtcbn07XG5cbmV4cG9ydHMuY2xlYXJJbW1lZGlhdGUgPSB0eXBlb2YgY2xlYXJJbW1lZGlhdGUgPT09IFwiZnVuY3Rpb25cIiA/IGNsZWFySW1tZWRpYXRlIDogZnVuY3Rpb24oaWQpIHtcbiAgZGVsZXRlIGltbWVkaWF0ZUlkc1tpZF07XG59OyIsImltcG9ydCAqIGFzIExpYiBmcm9tICcuLi9saWInO1xyXG5cclxuY29uc3Qgc3VpdHMgPSBbJ0NsdWJzJywgJ0RtbmRzJywgJ0hlYXJ0cycsICdTcGFkZXMnLCAnSm9rZXInXTtcclxuY29uc3QgcmFua3MgPSBbJ1NtYWxsJywgJ0EnLCAnMicsICczJywgJzQnLCAnNScsICc2JywgJzcnLCAnOCcsICc5JywgJzEwJywgJ0onLCAnUScsICdLJywgJ0JpZyddO1xyXG5cclxuY29uc3QgY2FyZEltYWdlcyA9IG5ldyBNYXA8c3RyaW5nLCBIVE1MSW1hZ2VFbGVtZW50PigpO1xyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxvYWQoKSB7XHJcbiAgICAvLyBsb2FkIGNhcmQgaW1hZ2VzIGFzeW5jaHJvbm91c2x5XHJcbiAgICBmb3IgKGxldCBzdWl0ID0gMDsgc3VpdCA8PSA0OyArK3N1aXQpIHtcclxuICAgICAgICBmb3IgKGxldCByYW5rID0gMDsgcmFuayA8PSAxNDsgKytyYW5rKSB7XHJcbiAgICAgICAgICAgIGlmIChzdWl0ID09PSBMaWIuU3VpdC5Kb2tlcikge1xyXG4gICAgICAgICAgICAgICAgaWYgKDAgPCByYW5rICYmIHJhbmsgPCAxNCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgaWYgKHJhbmsgPCAxIHx8IDEzIDwgcmFuaykge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBpbWFnZSA9IG5ldyBJbWFnZSgpO1xyXG4gICAgICAgICAgICBpbWFnZS5zcmMgPSBgUGFwZXJDYXJkcy8ke3N1aXRzW3N1aXRdfS8ke3JhbmtzW3JhbmtdfW9mJHtzdWl0c1tzdWl0XX0ucG5nYDtcclxuICAgICAgICAgICAgaW1hZ2Uub25sb2FkID0gKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYGxvYWRlZCAnJHtpbWFnZS5zcmN9J2ApO1xyXG4gICAgICAgICAgICAgICAgY2FyZEltYWdlcy5zZXQoSlNPTi5zdHJpbmdpZnkoW3N1aXQsIHJhbmtdKSwgaW1hZ2UpO1xyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDU7ICsraSkge1xyXG4gICAgICAgIGNvbnN0IGltYWdlID0gbmV3IEltYWdlKCk7XHJcbiAgICAgICAgaW1hZ2Uuc3JjID0gYFBhcGVyQ2FyZHMvQ2FyZEJhY2ske2l9LnBuZ2A7XHJcbiAgICAgICAgaW1hZ2Uub25sb2FkID0gKCkgPT4ge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgbG9hZGVkICcke2ltYWdlLnNyY30nYCk7XHJcbiAgICAgICAgICAgIGNhcmRJbWFnZXMuc2V0KGBCYWNrJHtpfWAsIGltYWdlKTtcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGJsYW5rSW1hZ2UgPSBuZXcgSW1hZ2UoKTtcclxuICAgIGJsYW5rSW1hZ2Uuc3JjID0gJ1BhcGVyQ2FyZHMvQmxhbmsgQ2FyZC5wbmcnO1xyXG4gICAgYmxhbmtJbWFnZS5vbmxvYWQgPSAoKSA9PiB7XHJcbiAgICAgICAgY29uc29sZS5sb2coYGxvYWRlZCAnJHtibGFua0ltYWdlLnNyY30nYCk7XHJcbiAgICAgICAgY2FyZEltYWdlcy5zZXQoJ0JsYW5rJywgYmxhbmtJbWFnZSk7XHJcbiAgICB9O1xyXG5cclxuICAgIHdoaWxlIChjYXJkSW1hZ2VzLnNpemUgPCA0ICogMTMgKyA3KSB7XHJcbiAgICAgICAgYXdhaXQgTGliLmRlbGF5KDEwKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zb2xlLmxvZygnYWxsIGNhcmQgaW1hZ2VzIGxvYWRlZCcpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0KHN0cmluZ0Zyb21DYXJkOiBzdHJpbmcpOiBIVE1MSW1hZ2VFbGVtZW50IHtcclxuICAgIGNvbnN0IGltYWdlID0gY2FyZEltYWdlcy5nZXQoc3RyaW5nRnJvbUNhcmQpO1xyXG4gICAgaWYgKGltYWdlID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGNvdWxkbid0IGZpbmQgaW1hZ2U6ICR7c3RyaW5nRnJvbUNhcmR9YCk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGltYWdlO1xyXG59XHJcbiIsImltcG9ydCAqIGFzIExpYiBmcm9tICcuLi9saWInO1xyXG5pbXBvcnQgKiBhcyBTdGF0ZSBmcm9tICcuL3N0YXRlJztcclxuaW1wb3J0ICogYXMgVlAgZnJvbSAnLi92aWV3LXBhcmFtcyc7XHJcbmltcG9ydCAqIGFzIENhcmRJbWFnZXMgZnJvbSAnLi9jYXJkLWltYWdlcyc7XHJcbmltcG9ydCAqIGFzIFJlbmRlciBmcm9tICcuL3JlbmRlcic7XHJcblxyXG4vLyByZWZyZXNoaW5nIHNob3VsZCByZWpvaW4gdGhlIHNhbWUgZ2FtZVxyXG53aW5kb3cuaGlzdG9yeS5wdXNoU3RhdGUodW5kZWZpbmVkLCBTdGF0ZS5nYW1lSWQsIGAvZ2FtZT9nYW1lSWQ9JHtTdGF0ZS5nYW1lSWR9JnBsYXllck5hbWU9JHtTdGF0ZS5wbGF5ZXJOYW1lfWApO1xyXG5cclxuYXN5bmMgZnVuY3Rpb24gaW5pdCgpIHtcclxuICAgIFZQLnJlY2FsY3VsYXRlUGFyYW1ldGVycygpO1xyXG5cclxuICAgIC8vIGluaXRpYWxpemUgaW5wdXRcclxuICAgIHdoaWxlIChTdGF0ZS5nYW1lU3RhdGUgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIGF3YWl0IExpYi5kZWxheSgxMDApO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHVubG9jayA9IGF3YWl0IFN0YXRlLmxvY2soKTtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgU3RhdGUuc2V0U3ByaXRlVGFyZ2V0cyhTdGF0ZS5nYW1lU3RhdGUpO1xyXG4gICAgfSBmaW5hbGx5IHtcclxuICAgICAgICB1bmxvY2soKTtcclxuICAgIH1cclxufVxyXG5cclxud2luZG93Lm9ucmVzaXplID0gaW5pdDtcclxuXHJcbndpbmRvdy5vbnNjcm9sbCA9IGluaXQ7XHJcblxyXG4oPGFueT53aW5kb3cpLmdhbWUgPSBhc3luYyBmdW5jdGlvbiBnYW1lKCkge1xyXG4gICAgY29uc3Qgam9pblByb21pc2UgPSBTdGF0ZS5qb2luR2FtZShTdGF0ZS5nYW1lSWQsIFN0YXRlLnBsYXllck5hbWUpO1xyXG4gICAgYXdhaXQgQ2FyZEltYWdlcy5sb2FkKCk7IC8vIGNvbmN1cnJlbnRseVxyXG4gICAgYXdhaXQgam9pblByb21pc2U7XHJcbiAgICBcclxuICAgIC8vIHJlbmRlcmluZyBtdXN0IGJlIHN5bmNocm9ub3VzLCBvciBlbHNlIGl0IGZsaWNrZXJzXHJcbiAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKFJlbmRlci5yZW5kZXIpO1xyXG5cclxuICAgIGF3YWl0IGluaXQoKTtcclxufTsiLCJpbXBvcnQgKiBhcyBMaWIgZnJvbSAnLi4vbGliJztcclxuaW1wb3J0ICogYXMgU3RhdGUgZnJvbSAnLi9zdGF0ZSc7XHJcbmltcG9ydCAqIGFzIFZQIGZyb20gJy4vdmlldy1wYXJhbXMnO1xyXG5pbXBvcnQgVmVjdG9yIGZyb20gJy4vdmVjdG9yJztcclxuaW1wb3J0IFNwcml0ZSBmcm9tICcuL3Nwcml0ZSc7XHJcblxyXG5pbnRlcmZhY2UgVGFrZUZyb21PdGhlclBsYXllciB7XHJcbiAgICB0eXBlOiBcIlRha2VGcm9tT3RoZXJQbGF5ZXJcIjtcclxuICAgIG1vdXNlUG9zaXRpb25Ub1Nwcml0ZVBvc2l0aW9uOiBWZWN0b3I7XHJcbiAgICBvdGhlclBsYXllckluZGV4OiBudW1iZXI7XHJcbiAgICBjYXJkSW5kZXg6IG51bWJlcjtcclxuICAgIGNhcmQ6IExpYi5DYXJkO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgRHJhd0Zyb21EZWNrIHtcclxuICAgIHR5cGU6IFwiRHJhd0Zyb21EZWNrXCI7XHJcbiAgICBtb3VzZVBvc2l0aW9uVG9TcHJpdGVQb3NpdGlvbjogVmVjdG9yO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgV2FpdGluZ0Zvck5ld0NhcmQge1xyXG4gICAgdHlwZTogXCJXYWl0aW5nRm9yTmV3Q2FyZFwiO1xyXG4gICAgbW91c2VQb3NpdGlvblRvU3ByaXRlUG9zaXRpb246IFZlY3RvcjtcclxufVxyXG5cclxuaW50ZXJmYWNlIFJldHVyblRvRGVjayB7XHJcbiAgICB0eXBlOiBcIlJldHVyblRvRGVja1wiO1xyXG4gICAgY2FyZEluZGV4OiBudW1iZXI7XHJcbiAgICBtb3VzZVBvc2l0aW9uVG9TcHJpdGVQb3NpdGlvbjogVmVjdG9yO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgUmVvcmRlciB7XHJcbiAgICB0eXBlOiBcIlJlb3JkZXJcIjtcclxuICAgIGNhcmRJbmRleDogbnVtYmVyO1xyXG4gICAgbW91c2VQb3NpdGlvblRvU3ByaXRlUG9zaXRpb246IFZlY3RvcjtcclxufVxyXG5cclxuaW50ZXJmYWNlIENvbnRyb2xTaGlmdENsaWNrIHtcclxuICAgIHR5cGU6IFwiQ29udHJvbFNoaWZ0Q2xpY2tcIjtcclxuICAgIGNhcmRJbmRleDogbnVtYmVyO1xyXG4gICAgbW91c2VQb3NpdGlvblRvU3ByaXRlUG9zaXRpb246IFZlY3RvcjtcclxufVxyXG5cclxuaW50ZXJmYWNlIENvbnRyb2xDbGljayB7XHJcbiAgICB0eXBlOiBcIkNvbnRyb2xDbGlja1wiO1xyXG4gICAgY2FyZEluZGV4OiBudW1iZXI7XHJcbiAgICBtb3VzZVBvc2l0aW9uVG9TcHJpdGVQb3NpdGlvbjogVmVjdG9yO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgU2hpZnRDbGljayB7XHJcbiAgICB0eXBlOiBcIlNoaWZ0Q2xpY2tcIjtcclxuICAgIGNhcmRJbmRleDogbnVtYmVyO1xyXG4gICAgbW91c2VQb3NpdGlvblRvU3ByaXRlUG9zaXRpb246IFZlY3RvcjtcclxufVxyXG5cclxuaW50ZXJmYWNlIENsaWNrIHtcclxuICAgIHR5cGU6IFwiQ2xpY2tcIjtcclxuICAgIGNhcmRJbmRleDogbnVtYmVyO1xyXG4gICAgbW91c2VQb3NpdGlvblRvU3ByaXRlUG9zaXRpb246IFZlY3RvcjtcclxufVxyXG5cclxuZXhwb3J0IHR5cGUgQWN0aW9uID1cclxuICAgIFwiTm9uZVwiIHxcclxuICAgIFwiU29ydEJ5U3VpdFwiIHxcclxuICAgIFwiU29ydEJ5UmFua1wiIHxcclxuICAgIC8vXCJXYWl0XCIgfFxyXG4gICAgLy9cIlByb2NlZWRcIiB8XHJcbiAgICBcIkRlc2VsZWN0XCIgfFxyXG4gICAgVGFrZUZyb21PdGhlclBsYXllciB8XHJcbiAgICBEcmF3RnJvbURlY2sgfFxyXG4gICAgV2FpdGluZ0Zvck5ld0NhcmQgfFxyXG4gICAgUmV0dXJuVG9EZWNrIHxcclxuICAgIFJlb3JkZXIgfFxyXG4gICAgQ29udHJvbFNoaWZ0Q2xpY2sgfFxyXG4gICAgQ29udHJvbENsaWNrIHxcclxuICAgIFNoaWZ0Q2xpY2sgfFxyXG4gICAgQ2xpY2s7XHJcblxyXG5jb25zdCBkb3VibGVDbGlja1RocmVzaG9sZCA9IDUwMDsgLy8gbWlsbGlzZWNvbmRzXHJcbmNvbnN0IG1vdmVUaHJlc2hvbGQgPSAwLjUgKiBWUC5waXhlbHNQZXJDTTtcclxuXHJcbmV4cG9ydCBsZXQgYWN0aW9uOiBBY3Rpb24gPSBcIk5vbmVcIjtcclxuXHJcbmxldCBwcmV2aW91c0NsaWNrVGltZSA9IC0xO1xyXG5sZXQgcHJldmlvdXNDbGlja0luZGV4ID0gLTE7XHJcbmxldCBtb3VzZURvd25Qb3NpdGlvbiA9IDxWZWN0b3I+eyB4OiAwLCB5OiAwIH07XHJcbmxldCBtb3VzZU1vdmVQb3NpdGlvbiA9IDxWZWN0b3I+eyB4OiAwLCB5OiAwIH07XHJcbmxldCBleGNlZWRlZERyYWdUaHJlc2hvbGQgPSBmYWxzZTtcclxuXHJcbmxldCBob2xkaW5nQ29udHJvbCA9IGZhbHNlO1xyXG5sZXQgaG9sZGluZ1NoaWZ0ID0gZmFsc2U7XHJcbndpbmRvdy5vbmtleWRvd24gPSAoZTogS2V5Ym9hcmRFdmVudCkgPT4ge1xyXG4gICAgaWYgKGUua2V5ID09PSBcIkNvbnRyb2xcIikge1xyXG4gICAgICAgIGhvbGRpbmdDb250cm9sID0gdHJ1ZTtcclxuICAgIH0gZWxzZSBpZiAoZS5rZXkgPT09IFwiU2hpZnRcIikge1xyXG4gICAgICAgIGhvbGRpbmdTaGlmdCA9IHRydWU7XHJcbiAgICB9XHJcbn07XHJcblxyXG53aW5kb3cub25rZXl1cCA9IChlOiBLZXlib2FyZEV2ZW50KSA9PiB7XHJcbiAgICBpZiAoZS5rZXkgPT09IFwiQ29udHJvbFwiKSB7XHJcbiAgICAgICAgaG9sZGluZ0NvbnRyb2wgPSBmYWxzZTtcclxuICAgIH0gZWxzZSBpZiAoZS5rZXkgPT09IFwiU2hpZnRcIikge1xyXG4gICAgICAgIGhvbGRpbmdTaGlmdCA9IGZhbHNlO1xyXG4gICAgfVxyXG59O1xyXG5cclxuaW50ZXJmYWNlIEhhc0NsaWVudFBvc2l0aW9uIHtcclxuICAgIGNsaWVudFg6IG51bWJlcjtcclxuICAgIGNsaWVudFk6IG51bWJlcjtcclxufVxyXG5cclxuaW50ZXJmYWNlIEhhc01vdmVtZW50IHtcclxuICAgIG1vdmVtZW50WDogbnVtYmVyO1xyXG4gICAgbW92ZW1lbnRZOiBudW1iZXI7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldE1vdXNlUG9zaXRpb24oZTogSGFzQ2xpZW50UG9zaXRpb24pIHtcclxuICAgIHJldHVybiBuZXcgVmVjdG9yKFxyXG4gICAgICAgIFZQLmNhbnZhcy53aWR0aCAqIChlLmNsaWVudFggLSBWUC5jYW52YXNSZWN0LmxlZnQpIC8gVlAuY2FudmFzUmVjdC53aWR0aCxcclxuICAgICAgICBWUC5jYW52YXMuaGVpZ2h0ICogKGUuY2xpZW50WSAtIFZQLmNhbnZhc1JlY3QudG9wKSAvIFZQLmNhbnZhc1JlY3QuaGVpZ2h0XHJcbiAgICApO1xyXG59XHJcblxyXG5sZXQgcHJldmlvdXNUb3VjaDogVG91Y2ggfCB1bmRlZmluZWQ7XHJcblZQLmNhbnZhcy5vbm1vdXNlZG93biA9IGFzeW5jIGV2ZW50ID0+IHtcclxuICAgIGF3YWl0IG9uRG93bihldmVudCk7XHJcbn1cclxuXHJcblZQLmNhbnZhcy5vbnRvdWNoc3RhcnQgPSBhc3luYyBldmVudCA9PiB7XHJcbiAgICBjb25zdCB0b3VjaCA9IGV2ZW50LnRvdWNoZXNbMF07XHJcbiAgICBpZiAodG91Y2ggIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIGF3YWl0IG9uRG93bih0b3VjaCk7XHJcbiAgICAgICAgcHJldmlvdXNUb3VjaCA9IHRvdWNoO1xyXG4gICAgfVxyXG59O1xyXG5cclxuYXN5bmMgZnVuY3Rpb24gb25Eb3duKGV2ZW50OiBIYXNDbGllbnRQb3NpdGlvbikge1xyXG4gICAgY29uc3QgdW5sb2NrID0gYXdhaXQgU3RhdGUubG9jaygpO1xyXG4gICAgdHJ5IHtcclxuICAgICAgICBtb3VzZURvd25Qb3NpdGlvbiA9IGdldE1vdXNlUG9zaXRpb24oZXZlbnQpO1xyXG4gICAgICAgIG1vdXNlTW92ZVBvc2l0aW9uID0gbW91c2VEb3duUG9zaXRpb247XHJcbiAgICAgICAgZXhjZWVkZWREcmFnVGhyZXNob2xkID0gZmFsc2U7XHJcblxyXG4gICAgICAgIGNvbnN0IGRlY2tQb3NpdGlvbiA9IFN0YXRlLmRlY2tTcHJpdGVzW1N0YXRlLmRlY2tTcHJpdGVzLmxlbmd0aCAtIDFdPy5wb3NpdGlvbjtcclxuXHJcbiAgICAgICAgaWYgKFZQLnNvcnRCeVJhbmtCb3VuZHNbMF0ueCA8IG1vdXNlRG93blBvc2l0aW9uLnggJiYgbW91c2VEb3duUG9zaXRpb24ueCA8IFZQLnNvcnRCeVJhbmtCb3VuZHNbMV0ueCAmJlxyXG4gICAgICAgICAgICBWUC5zb3J0QnlSYW5rQm91bmRzWzBdLnkgPCBtb3VzZURvd25Qb3NpdGlvbi55ICYmIG1vdXNlRG93blBvc2l0aW9uLnkgPCBWUC5zb3J0QnlSYW5rQm91bmRzWzFdLnlcclxuICAgICAgICApIHtcclxuICAgICAgICAgICAgYWN0aW9uID0gXCJTb3J0QnlSYW5rXCI7XHJcbiAgICAgICAgfSBlbHNlIGlmIChcclxuICAgICAgICAgICAgVlAuc29ydEJ5U3VpdEJvdW5kc1swXS54IDwgbW91c2VEb3duUG9zaXRpb24ueCAmJiBtb3VzZURvd25Qb3NpdGlvbi54IDwgVlAuc29ydEJ5U3VpdEJvdW5kc1sxXS54ICYmXHJcbiAgICAgICAgICAgIFZQLnNvcnRCeVN1aXRCb3VuZHNbMF0ueSA8IG1vdXNlRG93blBvc2l0aW9uLnkgJiYgbW91c2VEb3duUG9zaXRpb24ueSA8IFZQLnNvcnRCeVN1aXRCb3VuZHNbMV0ueVxyXG4gICAgICAgICkge1xyXG4gICAgICAgICAgICBhY3Rpb24gPSBcIlNvcnRCeVN1aXRcIjtcclxuICAgICAgICB9IC8qZWxzZSBpZiAoXHJcbiAgICAgICAgICAgIFZQLndhaXRCb3VuZHNbMF0ueCA8IG1vdXNlRG93blBvc2l0aW9uLnggJiYgbW91c2VEb3duUG9zaXRpb24ueCA8IFZQLndhaXRCb3VuZHNbMV0ueCAmJlxyXG4gICAgICAgICAgICBWUC53YWl0Qm91bmRzWzBdLnkgPCBtb3VzZURvd25Qb3NpdGlvbi55ICYmIG1vdXNlRG93blBvc2l0aW9uLnkgPCBWUC53YWl0Qm91bmRzWzFdLnlcclxuICAgICAgICApIHtcclxuICAgICAgICAgICAgYWN0aW9uID0gXCJXYWl0XCI7XHJcbiAgICAgICAgfSBlbHNlIGlmIChcclxuICAgICAgICAgICAgVlAucHJvY2VlZEJvdW5kc1swXS54IDwgbW91c2VEb3duUG9zaXRpb24ueCAmJiBtb3VzZURvd25Qb3NpdGlvbi54IDwgVlAucHJvY2VlZEJvdW5kc1sxXS54ICYmXHJcbiAgICAgICAgICAgIFZQLnByb2NlZWRCb3VuZHNbMF0ueSA8IG1vdXNlRG93blBvc2l0aW9uLnkgJiYgbW91c2VEb3duUG9zaXRpb24ueSA8IFZQLnByb2NlZWRCb3VuZHNbMV0ueVxyXG4gICAgICAgICkge1xyXG4gICAgICAgICAgICBhY3Rpb24gPSBcIlByb2NlZWRcIjtcclxuICAgICAgICB9ICovZWxzZSBpZiAoZGVja1Bvc2l0aW9uICE9PSB1bmRlZmluZWQgJiZcclxuICAgICAgICAgICAgZGVja1Bvc2l0aW9uLnggPCBtb3VzZURvd25Qb3NpdGlvbi54ICYmIG1vdXNlRG93blBvc2l0aW9uLnggPCBkZWNrUG9zaXRpb24ueCArIFZQLnNwcml0ZVdpZHRoICYmXHJcbiAgICAgICAgICAgIGRlY2tQb3NpdGlvbi55IDwgbW91c2VEb3duUG9zaXRpb24ueSAmJiBtb3VzZURvd25Qb3NpdGlvbi55IDwgZGVja1Bvc2l0aW9uLnkgKyBWUC5zcHJpdGVIZWlnaHRcclxuICAgICAgICApIHtcclxuICAgICAgICAgICAgYWN0aW9uID0ge1xyXG4gICAgICAgICAgICAgICAgbW91c2VQb3NpdGlvblRvU3ByaXRlUG9zaXRpb246IGRlY2tQb3NpdGlvbi5zdWIobW91c2VEb3duUG9zaXRpb24pLFxyXG4gICAgICAgICAgICAgICAgdHlwZTogXCJEcmF3RnJvbURlY2tcIlxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGdhbWVTdGF0ZSA9IFN0YXRlLmdhbWVTdGF0ZTtcclxuICAgICAgICAgICAgaWYgKGdhbWVTdGF0ZSA9PT0gdW5kZWZpbmVkKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICAvLyBiZWNhdXNlIHdlIHJlbmRlciBsZWZ0IHRvIHJpZ2h0LCB0aGUgcmlnaHRtb3N0IGNhcmQgdW5kZXIgdGhlIG1vdXNlIHBvc2l0aW9uIGlzIHdoYXQgd2Ugc2hvdWxkIHJldHVyblxyXG4gICAgICAgICAgICBjb25zdCBzcHJpdGVzID0gU3RhdGUuZmFjZVNwcml0ZXNGb3JQbGF5ZXJbZ2FtZVN0YXRlLnBsYXllckluZGV4XTtcclxuICAgICAgICAgICAgaWYgKHNwcml0ZXMgPT09IHVuZGVmaW5lZCkgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgbGV0IGRlc2VsZWN0ID0gdHJ1ZTtcclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IHNwcml0ZXMubGVuZ3RoIC0gMTsgaSA+PSAwOyAtLWkpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHBvc2l0aW9uID0gc3ByaXRlc1tpXT8ucG9zaXRpb247XHJcbiAgICAgICAgICAgICAgICBpZiAocG9zaXRpb24gIT09IHVuZGVmaW5lZCAmJlxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uLnggPCBtb3VzZURvd25Qb3NpdGlvbi54ICYmIG1vdXNlRG93blBvc2l0aW9uLnggPCBwb3NpdGlvbi54ICsgVlAuc3ByaXRlV2lkdGggJiZcclxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbi55IDwgbW91c2VEb3duUG9zaXRpb24ueSAmJiBtb3VzZURvd25Qb3NpdGlvbi55IDwgcG9zaXRpb24ueSArIFZQLnNwcml0ZUhlaWdodFxyXG4gICAgICAgICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVzZWxlY3QgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgYWN0aW9uID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXJkSW5kZXg6IGksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1vdXNlUG9zaXRpb25Ub1Nwcml0ZVBvc2l0aW9uOiBwb3NpdGlvbi5zdWIobW91c2VEb3duUG9zaXRpb24pLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBob2xkaW5nQ29udHJvbCAmJiBob2xkaW5nU2hpZnQgPyBcIkNvbnRyb2xTaGlmdENsaWNrXCIgOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaG9sZGluZ0NvbnRyb2wgPyBcIkNvbnRyb2xDbGlja1wiIDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhvbGRpbmdTaGlmdCA/IFwiU2hpZnRDbGlja1wiIDogXCJDbGlja1wiXHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCA0OyArK2kpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IG90aGVyUGxheWVyID0gZ2FtZVN0YXRlLm90aGVyUGxheWVyc1tpXTtcclxuICAgICAgICAgICAgICAgIGlmIChvdGhlclBsYXllciAhPT0gbnVsbCAmJiBvdGhlclBsYXllciAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdHJhbnNmb3JtID0gVlAuZ2V0VHJhbnNmb3JtRm9yUGxheWVyKFZQLmdldFJlbGF0aXZlUGxheWVySW5kZXgoaSwgZ2FtZVN0YXRlLnBsYXllckluZGV4KSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdHJhbnNmb3JtLmludmVydFNlbGYoKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0cmFuc2Zvcm1lZFBvc2l0aW9uID0gdHJhbnNmb3JtLnRyYW5zZm9ybVBvaW50KG1vdXNlRG93blBvc2l0aW9uKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaiA9IG90aGVyUGxheWVyLnNoYXJlQ291bnQgLSAxOyBqID49IDA7IC0taikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzcHJpdGUgPSBTdGF0ZS5mYWNlU3ByaXRlc0ZvclBsYXllcltpXT8uW2pdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc3ByaXRlID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc3ByaXRlLnBvc2l0aW9uLnggPCB0cmFuc2Zvcm1lZFBvc2l0aW9uLnggJiYgdHJhbnNmb3JtZWRQb3NpdGlvbi54IDwgc3ByaXRlLnBvc2l0aW9uLnggKyBWUC5zcHJpdGVXaWR0aCAmJlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3ByaXRlLnBvc2l0aW9uLnkgPCB0cmFuc2Zvcm1lZFBvc2l0aW9uLnkgJiYgdHJhbnNmb3JtZWRQb3NpdGlvbi55IDwgc3ByaXRlLnBvc2l0aW9uLnkgKyBWUC5zcHJpdGVIZWlnaHRcclxuICAgICAgICAgICAgICAgICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgbW91c2UgZG93biBvbiAke2l9J3MgY2FyZCAke2p9YCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY2FyZCA9IG90aGVyUGxheWVyLnJldmVhbGVkQ2FyZHNbal07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2FyZCA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbiA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIlRha2VGcm9tT3RoZXJQbGF5ZXJcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtb3VzZVBvc2l0aW9uVG9TcHJpdGVQb3NpdGlvbjogbmV3IFZlY3RvcigwLCAwKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvdGhlclBsYXllckluZGV4OiBpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhcmRJbmRleDogaixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXJkXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2VsZWN0ID0gZmFsc2U7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChkZXNlbGVjdCkge1xyXG4gICAgICAgICAgICAgICAgYWN0aW9uID0gXCJEZXNlbGVjdFwiO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfSBmaW5hbGx5IHtcclxuICAgICAgICB1bmxvY2soKTtcclxuICAgIH1cclxufVxyXG5cclxuVlAuY2FudmFzLm9ubW91c2Vtb3ZlID0gYXN5bmMgZXZlbnQgPT4ge1xyXG4gICAgYXdhaXQgb25Nb3ZlKGV2ZW50LCBldmVudCk7XHJcbn07XHJcblxyXG5WUC5jYW52YXMub250b3VjaG1vdmUgPSBhc3luYyBldmVudCA9PiB7XHJcbiAgICBjb25zdCB0b3VjaCA9IGV2ZW50LnRvdWNoZXNbMF07XHJcbiAgICBpZiAodG91Y2ggIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIGF3YWl0IG9uTW92ZSh0b3VjaCwge1xyXG4gICAgICAgICAgICBtb3ZlbWVudFg6IHRvdWNoLmNsaWVudFggLSAocHJldmlvdXNUb3VjaD8uY2xpZW50WCA/PyB0b3VjaC5jbGllbnRYKSxcclxuICAgICAgICAgICAgbW92ZW1lbnRZOiB0b3VjaC5jbGllbnRZIC0gKHByZXZpb3VzVG91Y2g/LmNsaWVudFkgPz8gdG91Y2guY2xpZW50WSlcclxuICAgICAgICB9KTtcclxuICAgICAgICBwcmV2aW91c1RvdWNoID0gdG91Y2g7XHJcbiAgICB9XHJcbn07XHJcblxyXG5hc3luYyBmdW5jdGlvbiBvbk1vdmUoZXZlbnQ6IEhhc0NsaWVudFBvc2l0aW9uLCBtb3ZlbWVudDogSGFzTW92ZW1lbnQpIHtcclxuICAgIGNvbnN0IGdhbWVTdGF0ZSA9IFN0YXRlLmdhbWVTdGF0ZTtcclxuICAgIGlmIChnYW1lU3RhdGUgPT09IHVuZGVmaW5lZCkgcmV0dXJuO1xyXG5cclxuICAgIGNvbnN0IHVubG9jayA9IGF3YWl0IFN0YXRlLmxvY2soKTtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgbW91c2VNb3ZlUG9zaXRpb24gPSBnZXRNb3VzZVBvc2l0aW9uKGV2ZW50KTtcclxuICAgICAgICBleGNlZWRlZERyYWdUaHJlc2hvbGQgPSBleGNlZWRlZERyYWdUaHJlc2hvbGQgfHwgbW91c2VNb3ZlUG9zaXRpb24uZGlzdGFuY2UobW91c2VEb3duUG9zaXRpb24pID4gbW92ZVRocmVzaG9sZDtcclxuXHJcbiAgICAgICAgaWYgKGFjdGlvbiA9PT0gXCJOb25lXCIpIHtcclxuICAgICAgICAgICAgLy8gZG8gbm90aGluZ1xyXG4gICAgICAgIH0gZWxzZSBpZiAoYWN0aW9uID09PSBcIlNvcnRCeVN1aXRcIikge1xyXG4gICAgICAgICAgICAvLyBUT0RPOiBjaGVjayB3aGV0aGVyIG1vdXNlIHBvc2l0aW9uIGhhcyBsZWZ0IGJ1dHRvbiBib3VuZHNcclxuICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbiA9PT0gXCJTb3J0QnlSYW5rXCIpIHtcclxuICAgICAgICAgICAgLy8gVE9ETzogY2hlY2sgd2hldGhlciBtb3VzZSBwb3NpdGlvbiBoYXMgbGVmdCBidXR0b24gYm91bmRzXHJcbiAgICAgICAgfSAvKmVsc2UgaWYgKGFjdGlvbiA9PT0gXCJXYWl0XCIpIHtcclxuICAgICAgICAgICAgLy8gVE9ETzogY2hlY2sgd2hldGhlciBtb3VzZSBwb3NpdGlvbiBoYXMgbGVmdCBidXR0b24gYm91bmRzXHJcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24gPT09IFwiUHJvY2VlZFwiKSB7XHJcbiAgICAgICAgICAgIC8vIFRPRE86IGNoZWNrIHdoZXRoZXIgbW91c2UgcG9zaXRpb24gaGFzIGxlZnQgYnV0dG9uIGJvdW5kc1xyXG4gICAgICAgIH0gKi9lbHNlIGlmIChhY3Rpb24gPT09IFwiRGVzZWxlY3RcIikge1xyXG4gICAgICAgICAgICAvLyBUT0RPOiBib3ggc2VsZWN0aW9uP1xyXG4gICAgICAgIH0gZWxzZSBpZiAoXHJcbiAgICAgICAgICAgIGFjdGlvbi50eXBlID09PSBcIlRha2VGcm9tT3RoZXJQbGF5ZXJcIiB8fFxyXG4gICAgICAgICAgICBhY3Rpb24udHlwZSA9PT0gXCJEcmF3RnJvbURlY2tcIiB8fFxyXG4gICAgICAgICAgICBhY3Rpb24udHlwZSA9PT0gXCJXYWl0aW5nRm9yTmV3Q2FyZFwiXHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICAgIGlmIChleGNlZWRlZERyYWdUaHJlc2hvbGQpIHtcclxuICAgICAgICAgICAgICAgIGxldCBwcm9taXNlOiBQcm9taXNlPHZvaWQ+IHwgdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICAgICAgbGV0IHNwcml0ZTogU3ByaXRlIHwgdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICAgICAgaWYgKGFjdGlvbi50eXBlID09PSBcIlRha2VGcm9tT3RoZXJQbGF5ZXJcIikge1xyXG4gICAgICAgICAgICAgICAgICAgIHByb21pc2UgPSBTdGF0ZS50YWtlQ2FyZChcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uLm90aGVyUGxheWVySW5kZXgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbi5jYXJkSW5kZXgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbi5jYXJkXHJcbiAgICAgICAgICAgICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgc3ByaXRlID0gU3RhdGUuZmFjZVNwcml0ZXNGb3JQbGF5ZXJbYWN0aW9uLm90aGVyUGxheWVySW5kZXhdPy5bYWN0aW9uLmNhcmRJbmRleF07XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbi50eXBlID09PSBcIkRyYXdGcm9tRGVja1wiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gY2FyZCBkcmF3aW5nIHdpbGwgdHJ5IHRvIGxvY2sgdGhlIHN0YXRlLCBzbyB3ZSBtdXN0IGF0dGFjaCBhIGNhbGxiYWNrIGluc3RlYWQgb2YgYXdhaXRpbmdcclxuICAgICAgICAgICAgICAgICAgICBwcm9taXNlID0gU3RhdGUuZHJhd0NhcmQoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgc3ByaXRlID0gU3RhdGUuZGVja1Nwcml0ZXNbU3RhdGUuZGVja1Nwcml0ZXMubGVuZ3RoIC0gMV07XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHByb21pc2UgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChzcHJpdGUgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgc3ByaXRlLnRhcmdldCA9IG1vdXNlTW92ZVBvc2l0aW9uLmFkZChhY3Rpb24ubW91c2VQb3NpdGlvblRvU3ByaXRlUG9zaXRpb24pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBhY3Rpb24gPSB7IC4uLmFjdGlvbiwgdHlwZTogXCJXYWl0aW5nRm9yTmV3Q2FyZFwiIH07XHJcbiAgICAgICAgICAgICAgICAgICAgcHJvbWlzZS50aGVuKG9uQ2FyZERyYXduKHNwcml0ZSkpLmNhdGNoKF8gPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWN0aW9uICE9PSBcIk5vbmVcIiAmJlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uICE9PSBcIkRlc2VsZWN0XCIgJiZcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbiAhPT0gXCJTb3J0QnlSYW5rXCIgJiZcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbiAhPT0gXCJTb3J0QnlTdWl0XCIgJiZcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vYWN0aW9uICE9PSBcIldhaXRcIiAmJlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9hY3Rpb24gIT09IFwiUHJvY2VlZFwiICYmXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb24udHlwZSA9PT0gXCJXYWl0aW5nRm9yTmV3Q2FyZFwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uID0gXCJOb25lXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSBpZiAoYWN0aW9uLnR5cGUgPT09IFwiUmV0dXJuVG9EZWNrXCIgfHwgYWN0aW9uLnR5cGUgPT09IFwiUmVvcmRlclwiICkge1xyXG4gICAgICAgICAgICBkcmFnKGdhbWVTdGF0ZSwgYWN0aW9uLmNhcmRJbmRleCwgYWN0aW9uLm1vdXNlUG9zaXRpb25Ub1Nwcml0ZVBvc2l0aW9uKTtcclxuICAgICAgICB9IGVsc2UgaWYgKFxyXG4gICAgICAgICAgICBhY3Rpb24udHlwZSA9PT0gXCJDb250cm9sU2hpZnRDbGlja1wiIHx8XHJcbiAgICAgICAgICAgIGFjdGlvbi50eXBlID09PSBcIkNvbnRyb2xDbGlja1wiIHx8XHJcbiAgICAgICAgICAgIGFjdGlvbi50eXBlID09PSBcIlNoaWZ0Q2xpY2tcIiB8fFxyXG4gICAgICAgICAgICBhY3Rpb24udHlwZSA9PT0gXCJDbGlja1wiXHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICAgIGxldCBpID0gTGliLmJpbmFyeVNlYXJjaE51bWJlcihTdGF0ZS5zZWxlY3RlZEluZGljZXMsIGFjdGlvbi5jYXJkSW5kZXgpO1xyXG4gICAgICAgICAgICBpZiAoZXhjZWVkZWREcmFnVGhyZXNob2xkKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBkcmFnZ2luZyBhIG5vbi1zZWxlY3RlZCBjYXJkIHNlbGVjdHMgaXQgYW5kIG9ubHkgaXRcclxuICAgICAgICAgICAgICAgIGlmIChpIDwgMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIFN0YXRlLnNlbGVjdGVkSW5kaWNlcy5zcGxpY2UoMCwgU3RhdGUuc2VsZWN0ZWRJbmRpY2VzLmxlbmd0aCwgYWN0aW9uLmNhcmRJbmRleCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgZHJhZyhnYW1lU3RhdGUsIGFjdGlvbi5jYXJkSW5kZXgsIGFjdGlvbi5tb3VzZVBvc2l0aW9uVG9TcHJpdGVQb3NpdGlvbik7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBzcHJpdGVzID0gU3RhdGUuZmFjZVNwcml0ZXNGb3JQbGF5ZXJbZ2FtZVN0YXRlLnBsYXllckluZGV4XTtcclxuICAgICAgICAgICAgICAgIGlmIChzcHJpdGVzID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG4gICAgXHJcbiAgICAgICAgICAgICAgICBpZiAoaSA8IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzcHJpdGUgPSBzcHJpdGVzW2FjdGlvbi5jYXJkSW5kZXhdO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChzcHJpdGUgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgc3ByaXRlLnRhcmdldCA9IHNwcml0ZS50YXJnZXQuYWRkKG5ldyBWZWN0b3IobW92ZW1lbnQubW92ZW1lbnRYLCBtb3ZlbWVudC5tb3ZlbWVudFkpKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBqIG9mIFN0YXRlLnNlbGVjdGVkSW5kaWNlcykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzcHJpdGUgPSBzcHJpdGVzW2pdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc3ByaXRlID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzcHJpdGUudGFyZ2V0ID0gc3ByaXRlLnRhcmdldC5hZGQobmV3IFZlY3Rvcihtb3ZlbWVudC5tb3ZlbWVudFgsIG1vdmVtZW50Lm1vdmVtZW50WSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGNvbnN0IF86IG5ldmVyID0gYWN0aW9uO1xyXG4gICAgICAgIH1cclxuICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgdW5sb2NrKCk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5WUC5jYW52YXMub25tb3VzZXVwID0gYXN5bmMgZXZlbnQgPT4ge1xyXG4gICAgYXdhaXQgb25VcCgpO1xyXG59O1xyXG5cclxuVlAuY2FudmFzLm9udG91Y2hlbmQgPSBhc3luYyBldmVudCA9PiB7XHJcbiAgICBhd2FpdCBvblVwKCk7XHJcbn07XHJcblxyXG5hc3luYyBmdW5jdGlvbiBvblVwKCkge1xyXG4gICAgY29uc3QgZ2FtZVN0YXRlID0gU3RhdGUuZ2FtZVN0YXRlO1xyXG4gICAgaWYgKGdhbWVTdGF0ZSA9PT0gdW5kZWZpbmVkKSByZXR1cm47XHJcblxyXG4gICAgY29uc3QgdW5sb2NrID0gYXdhaXQgU3RhdGUubG9jaygpO1xyXG4gICAgdHJ5IHtcclxuICAgICAgICBpZiAoYWN0aW9uID09PSBcIk5vbmVcIikge1xyXG4gICAgICAgICAgICAvLyBkbyBub3RoaW5nXHJcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24gPT09IFwiU29ydEJ5UmFua1wiKSB7XHJcbiAgICAgICAgICAgIGF3YWl0IFN0YXRlLnNvcnRCeVJhbmsoZ2FtZVN0YXRlKTtcclxuICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbiA9PT0gXCJTb3J0QnlTdWl0XCIpIHtcclxuICAgICAgICAgICAgYXdhaXQgU3RhdGUuc29ydEJ5U3VpdChnYW1lU3RhdGUpO1xyXG4gICAgICAgIH0gLyplbHNlIGlmIChhY3Rpb24gPT09IFwiV2FpdFwiKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCd3YWl0aW5nJyk7XHJcbiAgICAgICAgICAgIGF3YWl0IFN0YXRlLndhaXQoKTtcclxuICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbiA9PT0gXCJQcm9jZWVkXCIpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ3Byb2NlZWRpbmcnKTtcclxuICAgICAgICAgICAgYXdhaXQgU3RhdGUucHJvY2VlZCgpO1xyXG4gICAgICAgIH0gKi9lbHNlIGlmIChhY3Rpb24gPT09IFwiRGVzZWxlY3RcIikge1xyXG4gICAgICAgICAgICBTdGF0ZS5zZWxlY3RlZEluZGljZXMuc3BsaWNlKDAsIFN0YXRlLnNlbGVjdGVkSW5kaWNlcy5sZW5ndGgpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoYWN0aW9uLnR5cGUgPT09IFwiRHJhd0Zyb21EZWNrXCIgfHwgYWN0aW9uLnR5cGUgPT09IFwiV2FpdGluZ0Zvck5ld0NhcmRcIikge1xyXG4gICAgICAgICAgICAvLyBkbyBub3RoaW5nXHJcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24udHlwZSA9PT0gXCJSZW9yZGVyXCIpIHtcclxuICAgICAgICAgICAgcHJldmlvdXNDbGlja0luZGV4ID0gYWN0aW9uLmNhcmRJbmRleDtcclxuICAgICAgICAgICAgYXdhaXQgU3RhdGUucmVvcmRlckNhcmRzKGdhbWVTdGF0ZSk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24udHlwZSA9PT0gXCJSZXR1cm5Ub0RlY2tcIikge1xyXG4gICAgICAgICAgICBwcmV2aW91c0NsaWNrSW5kZXggPSAtMTtcclxuICAgICAgICAgICAgYXdhaXQgU3RhdGUucmV0dXJuQ2FyZHNUb0RlY2soZ2FtZVN0YXRlKTtcclxuICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbi50eXBlID09PSBcIkNvbnRyb2xTaGlmdENsaWNrXCIpIHtcclxuICAgICAgICAgICAgaWYgKHByZXZpb3VzQ2xpY2tJbmRleCA9PT0gLTEpIHtcclxuICAgICAgICAgICAgICAgIHByZXZpb3VzQ2xpY2tJbmRleCA9IGFjdGlvbi5jYXJkSW5kZXg7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHN0YXJ0ID0gTWF0aC5taW4oYWN0aW9uLmNhcmRJbmRleCwgcHJldmlvdXNDbGlja0luZGV4KTtcclxuICAgICAgICAgICAgY29uc3QgZW5kID0gTWF0aC5tYXgoYWN0aW9uLmNhcmRJbmRleCwgcHJldmlvdXNDbGlja0luZGV4KTtcclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IHN0YXJ0OyBpIDw9IGVuZDsgKytpKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgaiA9IExpYi5iaW5hcnlTZWFyY2hOdW1iZXIoU3RhdGUuc2VsZWN0ZWRJbmRpY2VzLCBpKTtcclxuICAgICAgICAgICAgICAgIGlmIChqIDwgMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIFN0YXRlLnNlbGVjdGVkSW5kaWNlcy5zcGxpY2UofmosIDAsIGkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24udHlwZSA9PT0gXCJDb250cm9sQ2xpY2tcIikge1xyXG4gICAgICAgICAgICBwcmV2aW91c0NsaWNrSW5kZXggPSBhY3Rpb24uY2FyZEluZGV4O1xyXG4gICAgICAgICAgICBsZXQgaSA9IExpYi5iaW5hcnlTZWFyY2hOdW1iZXIoU3RhdGUuc2VsZWN0ZWRJbmRpY2VzLCBhY3Rpb24uY2FyZEluZGV4KTtcclxuICAgICAgICAgICAgaWYgKGkgPCAwKSB7XHJcbiAgICAgICAgICAgICAgICBTdGF0ZS5zZWxlY3RlZEluZGljZXMuc3BsaWNlKH5pLCAwLCBhY3Rpb24uY2FyZEluZGV4KTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIFN0YXRlLnNlbGVjdGVkSW5kaWNlcy5zcGxpY2UoaSwgMSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbi50eXBlID09PSBcIlNoaWZ0Q2xpY2tcIikge1xyXG4gICAgICAgICAgICBpZiAocHJldmlvdXNDbGlja0luZGV4ID09PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgcHJldmlvdXNDbGlja0luZGV4ID0gYWN0aW9uLmNhcmRJbmRleDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3Qgc3RhcnQgPSBNYXRoLm1pbihhY3Rpb24uY2FyZEluZGV4LCBwcmV2aW91c0NsaWNrSW5kZXgpO1xyXG4gICAgICAgICAgICBjb25zdCBlbmQgPSBNYXRoLm1heChhY3Rpb24uY2FyZEluZGV4LCBwcmV2aW91c0NsaWNrSW5kZXgpO1xyXG4gICAgICAgICAgICBTdGF0ZS5zZWxlY3RlZEluZGljZXMuc3BsaWNlKDAsIFN0YXRlLnNlbGVjdGVkSW5kaWNlcy5sZW5ndGgpO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gc3RhcnQ7IGkgPD0gZW5kOyArK2kpIHtcclxuICAgICAgICAgICAgICAgIFN0YXRlLnNlbGVjdGVkSW5kaWNlcy5wdXNoKGkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24udHlwZSA9PT0gXCJDbGlja1wiKSB7XHJcbiAgICAgICAgICAgIHByZXZpb3VzQ2xpY2tJbmRleCA9IGFjdGlvbi5jYXJkSW5kZXg7XHJcbiAgICAgICAgICAgIFN0YXRlLnNlbGVjdGVkSW5kaWNlcy5zcGxpY2UoMCwgU3RhdGUuc2VsZWN0ZWRJbmRpY2VzLmxlbmd0aCwgYWN0aW9uLmNhcmRJbmRleCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBTdGF0ZS5zZXRTcHJpdGVUYXJnZXRzKGdhbWVTdGF0ZSk7XHJcblxyXG4gICAgICAgIGFjdGlvbiA9IFwiTm9uZVwiO1xyXG4gICAgfSBmaW5hbGx5IHtcclxuICAgICAgICB1bmxvY2soKTtcclxuICAgIH1cclxufTtcclxuXHJcbmZ1bmN0aW9uIG9uQ2FyZERyYXduKGRlY2tTcHJpdGU6IFNwcml0ZSkge1xyXG4gICAgcmV0dXJuIGFzeW5jICgpID0+IHtcclxuICAgICAgICBjb25zdCBnYW1lU3RhdGUgPSBTdGF0ZS5nYW1lU3RhdGU7XHJcbiAgICAgICAgaWYgKGdhbWVTdGF0ZSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuXHJcbiAgICAgICAgY29uc3QgdW5sb2NrID0gYXdhaXQgU3RhdGUubG9jaygpO1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGlmIChhY3Rpb24gIT09IFwiTm9uZVwiICYmXHJcbiAgICAgICAgICAgICAgICBhY3Rpb24gIT09IFwiU29ydEJ5U3VpdFwiICYmXHJcbiAgICAgICAgICAgICAgICBhY3Rpb24gIT09IFwiU29ydEJ5UmFua1wiICYmXHJcbiAgICAgICAgICAgICAgICAvL2FjdGlvbiAhPT0gXCJXYWl0XCIgJiZcclxuICAgICAgICAgICAgICAgIC8vYWN0aW9uICE9PSBcIlByb2NlZWRcIiAmJlxyXG4gICAgICAgICAgICAgICAgYWN0aW9uICE9PSBcIkRlc2VsZWN0XCIgJiZcclxuICAgICAgICAgICAgICAgIGFjdGlvbi50eXBlID09PSBcIldhaXRpbmdGb3JOZXdDYXJkXCJcclxuICAgICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBpbW1lZGlhdGVseSBzZWxlY3QgbmV3bHkgYWNxdWlyZWQgY2FyZFxyXG4gICAgICAgICAgICAgICAgY29uc3QgY2FyZEluZGV4ID0gZ2FtZVN0YXRlLnBsYXllckNhcmRzLmxlbmd0aCAtIDE7XHJcbiAgICAgICAgICAgICAgICBTdGF0ZS5zZWxlY3RlZEluZGljZXMuc3BsaWNlKDAsIFN0YXRlLnNlbGVjdGVkSW5kaWNlcy5sZW5ndGgpO1xyXG4gICAgICAgICAgICAgICAgU3RhdGUuc2VsZWN0ZWRJbmRpY2VzLnB1c2goY2FyZEluZGV4KTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBuZXcgY2FyZCBzaG91bGQgYXBwZWFyIGluIHBsYWNlIG9mIGRyYWdnZWQgY2FyZCBmcm9tIGRlY2sgd2l0aG91dCBhbmltYXRpb25cclxuICAgICAgICAgICAgICAgIGNvbnN0IGZhY2VTcHJpdGVBdE1vdXNlRG93biA9IFN0YXRlLmZhY2VTcHJpdGVzRm9yUGxheWVyW2dhbWVTdGF0ZS5wbGF5ZXJJbmRleF0/LltjYXJkSW5kZXhdO1xyXG4gICAgICAgICAgICAgICAgaWYgKGZhY2VTcHJpdGVBdE1vdXNlRG93biA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICAgICAgICAgICAgICAgIGZhY2VTcHJpdGVBdE1vdXNlRG93bi50YXJnZXQgPSBkZWNrU3ByaXRlLnBvc2l0aW9uO1xyXG4gICAgICAgICAgICAgICAgZmFjZVNwcml0ZUF0TW91c2VEb3duLnBvc2l0aW9uID0gZGVja1Nwcml0ZS5wb3NpdGlvbjtcclxuICAgICAgICAgICAgICAgIC8vZmFjZVNwcml0ZUF0TW91c2VEb3duLnZlbG9jaXR5ID0gZGVja1Nwcml0ZS52ZWxvY2l0eTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgZHJhZyhnYW1lU3RhdGUsIGNhcmRJbmRleCwgYWN0aW9uLm1vdXNlUG9zaXRpb25Ub1Nwcml0ZVBvc2l0aW9uKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgICAgIHVubG9jaygpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRyYWcoZ2FtZVN0YXRlOiBMaWIuR2FtZVN0YXRlLCBjYXJkSW5kZXg6IG51bWJlciwgbW91c2VQb3NpdGlvblRvU3ByaXRlUG9zaXRpb246IFZlY3Rvcikge1xyXG4gICAgY29uc3Qgc3ByaXRlcyA9IFN0YXRlLmZhY2VTcHJpdGVzRm9yUGxheWVyW2dhbWVTdGF0ZS5wbGF5ZXJJbmRleF07XHJcbiAgICBpZiAoc3ByaXRlcyA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuXHJcbiAgICBjb25zdCBjYXJkcyA9IGdhbWVTdGF0ZS5wbGF5ZXJDYXJkcztcclxuXHJcbiAgICBjb25zdCBtb3ZpbmdTcHJpdGVzQW5kQ2FyZHM6IFtTcHJpdGUsIExpYi5DYXJkXVtdID0gW107XHJcbiAgICBjb25zdCByZXNlcnZlZFNwcml0ZXNBbmRDYXJkczogW1Nwcml0ZSwgTGliLkNhcmRdW10gPSBbXTtcclxuXHJcbiAgICBsZXQgc3BsaXRJbmRleDogbnVtYmVyIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xyXG4gICAgbGV0IHNoYXJlQ291bnQgPSBnYW1lU3RhdGUucGxheWVyU2hhcmVDb3VudDtcclxuICAgIGxldCByZXZlYWxDb3VudCA9IGdhbWVTdGF0ZS5wbGF5ZXJSZXZlYWxDb3VudDtcclxuXHJcbiAgICAvLyBleHRyYWN0IG1vdmluZyBzcHJpdGVzXHJcbiAgICBmb3IgKGNvbnN0IGkgb2YgU3RhdGUuc2VsZWN0ZWRJbmRpY2VzKSB7XHJcbiAgICAgICAgY29uc3Qgc3ByaXRlID0gc3ByaXRlc1tpXTtcclxuICAgICAgICBjb25zdCBjYXJkID0gY2FyZHNbaV07XHJcbiAgICAgICAgaWYgKHNwcml0ZSA9PT0gdW5kZWZpbmVkIHx8IGNhcmQgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICAgICAgbW92aW5nU3ByaXRlc0FuZENhcmRzLnB1c2goW3Nwcml0ZSwgY2FyZF0pO1xyXG5cclxuICAgICAgICBpZiAoaSA8IGdhbWVTdGF0ZS5wbGF5ZXJTaGFyZUNvdW50KSB7XHJcbiAgICAgICAgICAgIC0tc2hhcmVDb3VudDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChpIDwgZ2FtZVN0YXRlLnBsYXllclJldmVhbENvdW50KSB7XHJcbiAgICAgICAgICAgIC0tcmV2ZWFsQ291bnQ7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIGV4dHJhY3QgcmVzZXJ2ZWQgc3ByaXRlc1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzcHJpdGVzLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgaWYgKExpYi5iaW5hcnlTZWFyY2hOdW1iZXIoU3RhdGUuc2VsZWN0ZWRJbmRpY2VzLCBpKSA8IDApIHtcclxuICAgICAgICAgICAgY29uc3Qgc3ByaXRlID0gc3ByaXRlc1tpXTtcclxuICAgICAgICAgICAgY29uc3QgY2FyZCA9IGNhcmRzW2ldO1xyXG4gICAgICAgICAgICBpZiAoc3ByaXRlID09PSB1bmRlZmluZWQgfHwgY2FyZCA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICAgICAgICAgICAgcmVzZXJ2ZWRTcHJpdGVzQW5kQ2FyZHMucHVzaChbc3ByaXRlLCBjYXJkXSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIGZpbmQgdGhlIGhlbGQgc3ByaXRlcywgaWYgYW55LCBvdmVybGFwcGVkIGJ5IHRoZSBkcmFnZ2VkIHNwcml0ZXNcclxuICAgIGNvbnN0IGxlZnRNb3ZpbmdTcHJpdGUgPSBtb3ZpbmdTcHJpdGVzQW5kQ2FyZHNbMF0/LlswXTtcclxuICAgIGNvbnN0IHJpZ2h0TW92aW5nU3ByaXRlID0gbW92aW5nU3ByaXRlc0FuZENhcmRzW21vdmluZ1Nwcml0ZXNBbmRDYXJkcy5sZW5ndGggLSAxXT8uWzBdO1xyXG4gICAgaWYgKGxlZnRNb3ZpbmdTcHJpdGUgPT09IHVuZGVmaW5lZCB8fCByaWdodE1vdmluZ1Nwcml0ZSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgZGVja0Rpc3RhbmNlID0gTWF0aC5hYnMobGVmdE1vdmluZ1Nwcml0ZS50YXJnZXQueSAtIChWUC5jYW52YXMuaGVpZ2h0IC8gMiAtIFZQLnNwcml0ZUhlaWdodCAvIDIpKTtcclxuICAgIGNvbnN0IHJldmVhbERpc3RhbmNlID0gTWF0aC5hYnMobGVmdE1vdmluZ1Nwcml0ZS50YXJnZXQueSAtIChWUC5jYW52YXMuaGVpZ2h0IC0gMiAqIFZQLnNwcml0ZUhlaWdodCkpO1xyXG4gICAgY29uc3QgaGlkZURpc3RhbmNlID0gTWF0aC5hYnMobGVmdE1vdmluZ1Nwcml0ZS50YXJnZXQueSAtIChWUC5jYW52YXMuaGVpZ2h0IC0gVlAuc3ByaXRlSGVpZ2h0KSk7XHJcblxyXG4gICAgLy8gc2V0IHRoZSBhY3Rpb24gZm9yIG9ubW91c2V1cFxyXG4gICAgaWYgKGRlY2tEaXN0YW5jZSA8IHJldmVhbERpc3RhbmNlICYmIGRlY2tEaXN0YW5jZSA8IGhpZGVEaXN0YW5jZSkge1xyXG4gICAgICAgIGFjdGlvbiA9IHsgY2FyZEluZGV4LCBtb3VzZVBvc2l0aW9uVG9TcHJpdGVQb3NpdGlvbiwgdHlwZTogXCJSZXR1cm5Ub0RlY2tcIiB9O1xyXG5cclxuICAgICAgICBzcGxpdEluZGV4ID0gcmVzZXJ2ZWRTcHJpdGVzQW5kQ2FyZHMubGVuZ3RoO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBhY3Rpb24gPSB7IGNhcmRJbmRleCwgbW91c2VQb3NpdGlvblRvU3ByaXRlUG9zaXRpb24sIHR5cGU6IFwiUmVvcmRlclwiIH07XHJcblxyXG4gICAgICAgIC8vIGRldGVybWluZSB3aGV0aGVyIHRoZSBtb3Zpbmcgc3ByaXRlcyBhcmUgY2xvc2VyIHRvIHRoZSByZXZlYWxlZCBzcHJpdGVzIG9yIHRvIHRoZSBoaWRkZW4gc3ByaXRlc1xyXG4gICAgICAgIGNvbnN0IHNwbGl0UmV2ZWFsZWQgPSByZXZlYWxEaXN0YW5jZSA8IGhpZGVEaXN0YW5jZTtcclxuICAgICAgICBsZXQgc3BsaXRTaGFyZWQ6IGJvb2xlYW47XHJcbiAgICAgICAgbGV0IHNwZWNpYWxTcGxpdDogYm9vbGVhbjtcclxuICAgICAgICBsZXQgc3RhcnQ6IG51bWJlcjtcclxuICAgICAgICBsZXQgZW5kOiBudW1iZXI7XHJcbiAgICAgICAgaWYgKHNwbGl0UmV2ZWFsZWQpIHtcclxuICAgICAgICAgICAgaWYgKGxlZnRNb3ZpbmdTcHJpdGUudGFyZ2V0LnggPCBWUC5jYW52YXMud2lkdGggLyAyICYmXHJcbiAgICAgICAgICAgICAgICBWUC5jYW52YXMud2lkdGggLyAyIDwgcmlnaHRNb3ZpbmdTcHJpdGUudGFyZ2V0LnggKyBWUC5zcHJpdGVXaWR0aFxyXG4gICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgIHNwbGl0SW5kZXggPSBzaGFyZUNvdW50O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBzcGxpdFNoYXJlZCA9IChsZWZ0TW92aW5nU3ByaXRlLnRhcmdldC54ICsgcmlnaHRNb3ZpbmdTcHJpdGUudGFyZ2V0LnggKyBWUC5zcHJpdGVXaWR0aCkgLyAyIDwgVlAuY2FudmFzLndpZHRoIC8gMjtcclxuICAgICAgICAgICAgaWYgKHNwbGl0U2hhcmVkKSB7XHJcbiAgICAgICAgICAgICAgICBzdGFydCA9IDA7XHJcbiAgICAgICAgICAgICAgICBlbmQgPSBzaGFyZUNvdW50O1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgc3RhcnQgPSBzaGFyZUNvdW50O1xyXG4gICAgICAgICAgICAgICAgZW5kID0gcmV2ZWFsQ291bnQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBzcGxpdFNoYXJlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICBzcGVjaWFsU3BsaXQgPSBmYWxzZTtcclxuICAgICAgICAgICAgc3RhcnQgPSByZXZlYWxDb3VudDtcclxuICAgICAgICAgICAgZW5kID0gcmVzZXJ2ZWRTcHJpdGVzQW5kQ2FyZHMubGVuZ3RoO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHNwbGl0SW5kZXggPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICBsZXQgbGVmdEluZGV4OiBudW1iZXIgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIGxldCByaWdodEluZGV4OiBudW1iZXIgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSBzdGFydDsgaSA8IGVuZDsgKytpKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCByZXNlcnZlZFNwcml0ZSA9IHJlc2VydmVkU3ByaXRlc0FuZENhcmRzW2ldPy5bMF07XHJcbiAgICAgICAgICAgICAgICBpZiAocmVzZXJ2ZWRTcHJpdGUgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICAgICAgICAgICAgICBpZiAobGVmdE1vdmluZ1Nwcml0ZS50YXJnZXQueCA8IHJlc2VydmVkU3ByaXRlLnRhcmdldC54ICYmXHJcbiAgICAgICAgICAgICAgICAgICAgcmVzZXJ2ZWRTcHJpdGUudGFyZ2V0LnggPCByaWdodE1vdmluZ1Nwcml0ZS50YXJnZXQueFxyXG4gICAgICAgICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGxlZnRJbmRleCA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxlZnRJbmRleCA9IGk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIHJpZ2h0SW5kZXggPSBpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgICAgIGlmIChsZWZ0SW5kZXggIT09IHVuZGVmaW5lZCAmJiByaWdodEluZGV4ICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGxlZnRSZXNlcnZlZFNwcml0ZSA9IHJlc2VydmVkU3ByaXRlc0FuZENhcmRzW2xlZnRJbmRleF0/LlswXTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJpZ2h0UmVzZXJ2ZWRTcHJpdGUgPSByZXNlcnZlZFNwcml0ZXNBbmRDYXJkc1tyaWdodEluZGV4XT8uWzBdO1xyXG4gICAgICAgICAgICAgICAgaWYgKGxlZnRSZXNlcnZlZFNwcml0ZSA9PT0gdW5kZWZpbmVkIHx8IHJpZ2h0UmVzZXJ2ZWRTcHJpdGUgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBsZWZ0R2FwID0gbGVmdFJlc2VydmVkU3ByaXRlLnRhcmdldC54IC0gbGVmdE1vdmluZ1Nwcml0ZS50YXJnZXQueDtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJpZ2h0R2FwID0gcmlnaHRNb3ZpbmdTcHJpdGUudGFyZ2V0LnggLSByaWdodFJlc2VydmVkU3ByaXRlLnRhcmdldC54O1xyXG4gICAgICAgICAgICAgICAgaWYgKGxlZnRHYXAgPCByaWdodEdhcCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHNwbGl0SW5kZXggPSBsZWZ0SW5kZXg7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHNwbGl0SW5kZXggPSByaWdodEluZGV4ICsgMTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICBpZiAoc3BsaXRJbmRleCA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIC8vIG5vIG92ZXJsYXBwZWQgc3ByaXRlcywgc28gdGhlIGluZGV4IGlzIHRoZSBmaXJzdCByZXNlcnZlZCBzcHJpdGUgdG8gdGhlIHJpZ2h0IG9mIHRoZSBtb3Zpbmcgc3ByaXRlc1xyXG4gICAgICAgICAgICBmb3IgKHNwbGl0SW5kZXggPSBzdGFydDsgc3BsaXRJbmRleCA8IGVuZDsgKytzcGxpdEluZGV4KSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCByZXNlcnZlZFNwcml0ZSA9IHJlc2VydmVkU3ByaXRlc0FuZENhcmRzW3NwbGl0SW5kZXhdPy5bMF07XHJcbiAgICAgICAgICAgICAgICBpZiAocmVzZXJ2ZWRTcHJpdGUgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICAgICAgICAgICAgICBpZiAocmlnaHRNb3ZpbmdTcHJpdGUudGFyZ2V0LnggPCByZXNlcnZlZFNwcml0ZS50YXJnZXQueCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBhZGp1c3Qgc2hhcmUgY291bnRcclxuICAgICAgICBpZiAoc3BsaXRJbmRleCA8IHNoYXJlQ291bnQgfHwgc3BsaXRJbmRleCA9PT0gc2hhcmVDb3VudCAmJiBzcGxpdFNoYXJlZCkge1xyXG4gICAgICAgICAgICBzaGFyZUNvdW50ICs9IG1vdmluZ1Nwcml0ZXNBbmRDYXJkcy5sZW5ndGg7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBzZXQgc2hhcmVDb3VudCB0byAke3NoYXJlQ291bnR9YCk7XHJcbiAgICAgICAgfVxyXG4gICAgXHJcbiAgICAgICAgLy8gYWRqdXN0IHJldmVhbCBjb3VudFxyXG4gICAgICAgIGlmIChzcGxpdEluZGV4IDwgcmV2ZWFsQ291bnQgfHwgc3BsaXRJbmRleCA9PT0gcmV2ZWFsQ291bnQgJiYgc3BsaXRSZXZlYWxlZCkge1xyXG4gICAgICAgICAgICByZXZlYWxDb3VudCArPSBtb3ZpbmdTcHJpdGVzQW5kQ2FyZHMubGVuZ3RoO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgc2V0IHJldmVhbENvdW50IHRvICR7cmV2ZWFsQ291bnR9YCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIGFkanVzdCBzZWxlY3RlZCBpbmRpY2VzXHJcbiAgICAvLyBtb2RpZnlpbmcgYWN0aW9uLmNhcmRJbmRleCBkaXJlY3RseSBpbiB0aGUgbG9vcCB3b3VsZCBjYXVzZSB1cyB0b1xyXG4gICAgLy8gY2hlY2sgaXRzIGFkanVzdGVkIHZhbHVlIGFnYWluc3Qgb2xkIGluZGljZXMsIHdoaWNoIGlzIGluY29ycmVjdFxyXG4gICAgbGV0IG5ld0NhcmRJbmRleCA9IGFjdGlvbi5jYXJkSW5kZXg7XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IFN0YXRlLnNlbGVjdGVkSW5kaWNlcy5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgIGlmIChhY3Rpb24uY2FyZEluZGV4ID09PSBTdGF0ZS5zZWxlY3RlZEluZGljZXNbaV0pIHtcclxuICAgICAgICAgICAgbmV3Q2FyZEluZGV4ID0gc3BsaXRJbmRleCArIGk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBTdGF0ZS5zZWxlY3RlZEluZGljZXNbaV0gPSBzcGxpdEluZGV4ICsgaTtcclxuICAgIH1cclxuXHJcbiAgICBhY3Rpb24uY2FyZEluZGV4ID0gbmV3Q2FyZEluZGV4O1xyXG5cclxuICAgIC8vIGRyYWcgYWxsIHNlbGVjdGVkIGNhcmRzIGFzIGEgZ3JvdXAgYXJvdW5kIHRoZSBjYXJkIHVuZGVyIHRoZSBtb3VzZSBwb3NpdGlvblxyXG4gICAgZm9yIChjb25zdCBzZWxlY3RlZEluZGV4IG9mIFN0YXRlLnNlbGVjdGVkSW5kaWNlcykge1xyXG4gICAgICAgIGNvbnN0IG1vdmluZ1Nwcml0ZUFuZENhcmQgPSBtb3ZpbmdTcHJpdGVzQW5kQ2FyZHNbc2VsZWN0ZWRJbmRleCAtIHNwbGl0SW5kZXhdO1xyXG4gICAgICAgIGlmIChtb3ZpbmdTcHJpdGVBbmRDYXJkID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG4gICAgICAgIGNvbnN0IFttb3ZpbmdTcHJpdGUsIG1vdmluZ0NhcmRdID0gbW92aW5nU3ByaXRlQW5kQ2FyZDtcclxuICAgICAgICBtb3ZpbmdTcHJpdGUudGFyZ2V0ID0gbW91c2VNb3ZlUG9zaXRpb25cclxuICAgICAgICAgICAgLmFkZChtb3VzZVBvc2l0aW9uVG9TcHJpdGVQb3NpdGlvbilcclxuICAgICAgICAgICAgLmFkZChuZXcgVmVjdG9yKChzZWxlY3RlZEluZGV4IC0gYWN0aW9uLmNhcmRJbmRleCkgKiBWUC5zcHJpdGVHYXAsIDApKTtcclxuICAgICAgICBjb25zb2xlLmxvZyhgcmVhcnJhbmdlZCBzcHJpdGUgJHtzZWxlY3RlZEluZGV4fWApO1xyXG4gICAgfVxyXG5cclxuICAgIFN0YXRlLnNldFNwcml0ZVRhcmdldHMoXHJcbiAgICAgICAgZ2FtZVN0YXRlLFxyXG4gICAgICAgIHJlc2VydmVkU3ByaXRlc0FuZENhcmRzLFxyXG4gICAgICAgIG1vdmluZ1Nwcml0ZXNBbmRDYXJkcyxcclxuICAgICAgICBzaGFyZUNvdW50LFxyXG4gICAgICAgIHJldmVhbENvdW50LFxyXG4gICAgICAgIHNwbGl0SW5kZXgsXHJcbiAgICAgICAgYWN0aW9uLnR5cGUgPT09IFwiUmV0dXJuVG9EZWNrXCJcclxuICAgICk7XHJcbn0iLCJpbXBvcnQgKiBhcyBMaWIgZnJvbSBcIi4uL2xpYlwiO1xyXG5cclxuY29uc3QgcGxheWVyTmFtZUVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGxheWVyTmFtZScpO1xyXG5jb25zdCBwbGF5ZXJOYW1lVmFsdWUgPSBMaWIuZ2V0Q29va2llKCdwbGF5ZXJOYW1lJyk7XHJcbmlmIChwbGF5ZXJOYW1lRWxlbWVudCAhPT0gbnVsbCAmJiBwbGF5ZXJOYW1lVmFsdWUgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgKDxIVE1MSW5wdXRFbGVtZW50PnBsYXllck5hbWVFbGVtZW50KS52YWx1ZSA9IGRlY29kZVVSSShwbGF5ZXJOYW1lVmFsdWUpO1xyXG59XHJcblxyXG5jb25zdCBnYW1lSWRFbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2dhbWVJZCcpO1xyXG5jb25zdCBnYW1lSWRWYWx1ZSA9IExpYi5nZXRDb29raWUoJ2dhbWVJZCcpO1xyXG5pZiAoZ2FtZUlkRWxlbWVudCAhPT0gbnVsbCAmJiBnYW1lSWRWYWx1ZSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAoPEhUTUxJbnB1dEVsZW1lbnQ+Z2FtZUlkRWxlbWVudCkudmFsdWUgPSBnYW1lSWRWYWx1ZTtcclxufVxyXG4iLCJpbXBvcnQgeyByYW5kb20gfSBmcm9tICduYW5vaWQnO1xyXG5cclxuaW1wb3J0ICogYXMgTGliIGZyb20gJy4uL2xpYic7XHJcbmltcG9ydCAqIGFzIFN0YXRlIGZyb20gJy4vc3RhdGUnO1xyXG5pbXBvcnQgKiBhcyBJbnB1dCBmcm9tICcuL2lucHV0JztcclxuaW1wb3J0ICogYXMgVlAgZnJvbSAnLi92aWV3LXBhcmFtcyc7XHJcbmltcG9ydCBWZWN0b3IgZnJvbSAnLi92ZWN0b3InO1xyXG5cclxuY29uc3QgZGVja0RlYWxEdXJhdGlvbiA9IDEwMDA7XHJcbmxldCBkZWNrRGVhbFRpbWU6IG51bWJlciB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcclxubGV0IGN1cnJlbnRUaW1lOiBudW1iZXIgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVuZGVyKHRpbWU6IG51bWJlcikge1xyXG4gICAgaWYgKGN1cnJlbnRUaW1lID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICBjdXJyZW50VGltZSA9IHRpbWU7XHJcbiAgICB9XHJcblxyXG4gICAgd2hpbGUgKFN0YXRlLmdhbWVTdGF0ZSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgYXdhaXQgTGliLmRlbGF5KDEwMCk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgZGVsdGFUaW1lID0gdGltZSAtIGN1cnJlbnRUaW1lO1xyXG4gICAgY3VycmVudFRpbWUgPSB0aW1lO1xyXG5cclxuICAgIGNvbnN0IHVubG9jayA9IGF3YWl0IFN0YXRlLmxvY2soKTtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgLy8gY2xlYXIgdGhlIHNjcmVlblxyXG4gICAgICAgIFZQLmNvbnRleHQuY2xlYXJSZWN0KDAsIDAsIFZQLmNhbnZhcy53aWR0aCwgVlAuY2FudmFzLmhlaWdodCk7XHJcblxyXG4gICAgICAgIHJlbmRlckJhc2ljcyhTdGF0ZS5nYW1lSWQsIFN0YXRlLnBsYXllck5hbWUpO1xyXG4gICAgICAgIHJlbmRlckRlY2sodGltZSwgZGVsdGFUaW1lLCBTdGF0ZS5nYW1lU3RhdGUuZGVja0NvdW50KTtcclxuICAgICAgICByZW5kZXJPdGhlclBsYXllcnMoZGVsdGFUaW1lLCBTdGF0ZS5nYW1lU3RhdGUpO1xyXG4gICAgICAgIHJlbmRlclBsYXllcihkZWx0YVRpbWUsIFN0YXRlLmdhbWVTdGF0ZSk7XHJcbiAgICAgICAgcmVuZGVyQnV0dG9ucyh0aW1lLCBTdGF0ZS5nYW1lU3RhdGUpO1xyXG4gICAgfSBmaW5hbGx5IHtcclxuICAgICAgICB1bmxvY2soKTtcclxuICAgIH1cclxuXHJcbiAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKHJlbmRlcik7XHJcbn1cclxuLypcclxuY29uc3Qgd2lnZ2xlcyA9IG5ldyBNYXA8c3RyaW5nLCBbc3RyaW5nLCBudW1iZXJbXSwgbnVtYmVyXT4oKTtcclxuY29uc3Qgd2lnZ2xlSW50ZXJ2YWwgPSAxMDA7XHJcbmZ1bmN0aW9uIHdpZ2dsZVRleHQoczogc3RyaW5nLCB4OiBudW1iZXIsIHk6IG51bWJlcikge1xyXG4gICAgaWYgKGN1cnJlbnRUaW1lID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgbG93ZXIgPSBzLnRvTG93ZXJDYXNlKCk7XHJcbiAgICBsZXQgd2lnZ2xlID0gd2lnZ2xlcy5nZXQobG93ZXIpO1xyXG4gICAgaWYgKHdpZ2dsZSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgY29uc3QgdXBwZXIgPSBzLnRvVXBwZXJDYXNlKCk7XHJcbiAgICAgICAgY29uc3Qgd2lkdGhzID0gW107XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsb3dlci5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgICAgICB3aWR0aHMucHVzaCgoXHJcbiAgICAgICAgICAgICAgICBWUC5jb250ZXh0Lm1lYXN1cmVUZXh0KDxzdHJpbmc+bG93ZXJbaV0pLndpZHRoICtcclxuICAgICAgICAgICAgICAgIFZQLmNvbnRleHQubWVhc3VyZVRleHQoPHN0cmluZz51cHBlcltpXSkud2lkdGgpIC8gMik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB3aWdnbGUgPSBbcywgd2lkdGhzLCBjdXJyZW50VGltZV07XHJcbiAgICAgICAgd2lnZ2xlcy5zZXQobG93ZXIsIHdpZ2dsZSk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgW3NzLCB3cywgdF0gPSB3aWdnbGU7XHJcbiAgICBzID0gXCJcIjtcclxuICAgIGxldCB0dCA9IHQ7XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNzLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgbGV0IGMgPSA8c3RyaW5nPnNzW2ldO1xyXG4gICAgICAgIGlmICh0ICsgd2lnZ2xlSW50ZXJ2YWwgPCBjdXJyZW50VGltZSkge1xyXG4gICAgICAgICAgICB0dCA9IGN1cnJlbnRUaW1lO1xyXG4gICAgICAgICAgICBpZiAoPG51bWJlcj5yYW5kb20oMSlbMF0gPCAxMjcpIHtcclxuICAgICAgICAgICAgICAgIGMgPSBjLnRvVXBwZXJDYXNlKCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBjID0gYy50b0xvd2VyQ2FzZSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzICs9IGM7XHJcbiAgICAgICAgVlAuY29udGV4dC5maWxsVGV4dChjLCB4ICs9IDxudW1iZXI+d3NbaV0sIHkpO1xyXG4gICAgfVxyXG5cclxuICAgIHdpZ2dsZXMuc2V0KGxvd2VyLCBbcywgd3MsIHR0XSk7XHJcbn1cclxuKi9cclxuZnVuY3Rpb24gcmVuZGVyQmFzaWNzKGdhbWVJZDogc3RyaW5nLCBwbGF5ZXJOYW1lOiBzdHJpbmcpIHtcclxuICAgIFZQLmNvbnRleHQuZmlsbFN0eWxlID0gJyMwMDAwMDBmZic7XHJcbiAgICBWUC5jb250ZXh0LnRleHRBbGlnbiA9ICdsZWZ0JztcclxuICAgIFZQLmNvbnRleHQuZm9udCA9IGAke1ZQLnNwcml0ZUhlaWdodCAvIDR9cHggU3VnYXJsaWtlYDtcclxuICAgIFZQLmNvbnRleHQuZmlsbFN0eWxlID0gJ2ZvbnQtdmFyaWFudC1lYXN0LWFzaWFuOiBmdWxsLXdpZHRoJztcclxuXHJcbiAgICBWUC5jb250ZXh0LnRleHRCYXNlbGluZSA9ICd0b3AnO1xyXG4gICAgVlAuY29udGV4dC5maWxsVGV4dChgR2FtZTogJHtnYW1lSWR9YCwgMCwgMSAqIFZQLnBpeGVsc1BlclBlcmNlbnQpO1xyXG5cclxuICAgIFZQLmNvbnRleHQudGV4dEJhc2VsaW5lID0gJ2JvdHRvbSc7XHJcbiAgICBWUC5jb250ZXh0LmZpbGxUZXh0KGBZb3VyIG5hbWUgaXM6ICR7cGxheWVyTmFtZX1gLCAwLCBWUC5jYW52YXMuaGVpZ2h0KTtcclxuXHJcbiAgICBWUC5jb250ZXh0LnNldExpbmVEYXNoKFs0LCAxXSk7XHJcbiAgICBWUC5jb250ZXh0LnN0cm9rZVJlY3QoVlAuc3ByaXRlSGVpZ2h0LCBWUC5zcHJpdGVIZWlnaHQsIFZQLmNhbnZhcy53aWR0aCAtIDIgKiBWUC5zcHJpdGVIZWlnaHQsIFZQLmNhbnZhcy5oZWlnaHQgLSAyICogVlAuc3ByaXRlSGVpZ2h0KTtcclxufVxyXG5cclxuZnVuY3Rpb24gcmVuZGVyRGVjayh0aW1lOiBudW1iZXIsIGRlbHRhVGltZTogbnVtYmVyLCBkZWNrQ291bnQ6IG51bWJlcikge1xyXG4gICAgVlAuY29udGV4dC5zYXZlKCk7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIGlmIChkZWNrRGVhbFRpbWUgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICBkZWNrRGVhbFRpbWUgPSB0aW1lO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBTdGF0ZS5kZWNrU3ByaXRlcy5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgICAgICBjb25zdCBkZWNrU3ByaXRlID0gU3RhdGUuZGVja1Nwcml0ZXNbaV07XHJcbiAgICAgICAgICAgIGlmIChkZWNrU3ByaXRlID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG5cclxuICAgICAgICAgICAgaWYgKGkgPT09IGRlY2tDb3VudCAtIDEgJiZcclxuICAgICAgICAgICAgICAgIElucHV0LmFjdGlvbiAhPT0gXCJOb25lXCIgJiZcclxuICAgICAgICAgICAgICAgIElucHV0LmFjdGlvbiAhPT0gXCJTb3J0QnlTdWl0XCIgJiZcclxuICAgICAgICAgICAgICAgIElucHV0LmFjdGlvbiAhPT0gXCJTb3J0QnlSYW5rXCIgJiZcclxuICAgICAgICAgICAgICAgIC8vSW5wdXQuYWN0aW9uICE9PSBcIldhaXRcIiAmJlxyXG4gICAgICAgICAgICAgICAgLy9JbnB1dC5hY3Rpb24gIT09IFwiUHJvY2VlZFwiICYmXHJcbiAgICAgICAgICAgICAgICBJbnB1dC5hY3Rpb24gIT09IFwiRGVzZWxlY3RcIiAmJiAoXHJcbiAgICAgICAgICAgICAgICBJbnB1dC5hY3Rpb24udHlwZSA9PT0gXCJEcmF3RnJvbURlY2tcIiB8fFxyXG4gICAgICAgICAgICAgICAgSW5wdXQuYWN0aW9uLnR5cGUgPT09IFwiV2FpdGluZ0Zvck5ld0NhcmRcIlxyXG4gICAgICAgICAgICApKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBzZXQgaW4gb25tb3VzZW1vdmVcclxuICAgICAgICAgICAgfSBlbHNlIGlmICh0aW1lIC0gZGVja0RlYWxUaW1lIDwgaSAqIGRlY2tEZWFsRHVyYXRpb24gLyBkZWNrQ291bnQpIHtcclxuICAgICAgICAgICAgICAgIC8vIGNhcmQgbm90IHlldCBkZWFsdDsga2VlcCB0b3AgbGVmdFxyXG4gICAgICAgICAgICAgICAgZGVja1Nwcml0ZS5wb3NpdGlvbiA9IG5ldyBWZWN0b3IoLVZQLnNwcml0ZVdpZHRoLCAtVlAuc3ByaXRlSGVpZ2h0KTtcclxuICAgICAgICAgICAgICAgIGRlY2tTcHJpdGUudGFyZ2V0ID0gbmV3IFZlY3RvcigtVlAuc3ByaXRlV2lkdGgsIC1WUC5zcHJpdGVIZWlnaHQpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgZGVja1Nwcml0ZS50YXJnZXQgPSBuZXcgVmVjdG9yKFxyXG4gICAgICAgICAgICAgICAgICAgIFZQLmNhbnZhcy53aWR0aCAvIDIgLSBWUC5zcHJpdGVXaWR0aCAvIDIgLSAoaSAtIGRlY2tDb3VudCAvIDIpICogVlAuc3ByaXRlRGVja0dhcCxcclxuICAgICAgICAgICAgICAgICAgICBWUC5jYW52YXMuaGVpZ2h0IC8gMiAtIFZQLnNwcml0ZUhlaWdodCAvIDJcclxuICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGRlY2tTcHJpdGUuYW5pbWF0ZShkZWx0YVRpbWUpO1xyXG4gICAgICAgIH1cclxuICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgVlAuY29udGV4dC5yZXN0b3JlKCk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbmRlck90aGVyUGxheWVycyhkZWx0YVRpbWU6IG51bWJlciwgZ2FtZVN0YXRlOiBMaWIuR2FtZVN0YXRlKSB7XHJcbiAgICBWUC5jb250ZXh0LnNhdmUoKTtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgVlAuY29udGV4dC5zZXRUcmFuc2Zvcm0oVlAuZ2V0VHJhbnNmb3JtRm9yUGxheWVyKDEpKTtcclxuICAgICAgICAvL1ZQLmNvbnRleHQudHJhbnNsYXRlKDAsIChWUC5jYW52YXMud2lkdGggKyBWUC5jYW52YXMuaGVpZ2h0KSAvIDIpO1xyXG4gICAgICAgIC8vVlAuY29udGV4dC5yb3RhdGUoLU1hdGguUEkgLyAyKTtcclxuICAgICAgICByZW5kZXJPdGhlclBsYXllcihkZWx0YVRpbWUsIGdhbWVTdGF0ZSwgKGdhbWVTdGF0ZS5wbGF5ZXJJbmRleCArIDEpICUgNCk7XHJcbiAgICB9IGZpbmFsbHkge1xyXG4gICAgICAgIFZQLmNvbnRleHQucmVzdG9yZSgpO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBWUC5jb250ZXh0LnNhdmUoKTtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgVlAuY29udGV4dC5zZXRUcmFuc2Zvcm0oVlAuZ2V0VHJhbnNmb3JtRm9yUGxheWVyKDIpKTtcclxuICAgICAgICByZW5kZXJPdGhlclBsYXllcihkZWx0YVRpbWUsIGdhbWVTdGF0ZSwgKGdhbWVTdGF0ZS5wbGF5ZXJJbmRleCArIDIpICUgNCk7XHJcbiAgICB9IGZpbmFsbHkge1xyXG4gICAgICAgIFZQLmNvbnRleHQucmVzdG9yZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIFZQLmNvbnRleHQuc2F2ZSgpO1xyXG4gICAgdHJ5IHtcclxuICAgICAgICBWUC5jb250ZXh0LnNldFRyYW5zZm9ybShWUC5nZXRUcmFuc2Zvcm1Gb3JQbGF5ZXIoMykpO1xyXG4gICAgICAgIC8vVlAuY29udGV4dC50cmFuc2xhdGUoVlAuY2FudmFzLndpZHRoLCAoVlAuY2FudmFzLmhlaWdodCAtIFZQLmNhbnZhcy53aWR0aCkgLyAyKTtcclxuICAgICAgICAvL1ZQLmNvbnRleHQucm90YXRlKE1hdGguUEkgLyAyKTtcclxuICAgICAgICByZW5kZXJPdGhlclBsYXllcihkZWx0YVRpbWUsIGdhbWVTdGF0ZSwgKGdhbWVTdGF0ZS5wbGF5ZXJJbmRleCArIDMpICUgNCk7XHJcbiAgICB9IGZpbmFsbHkge1xyXG4gICAgICAgIFZQLmNvbnRleHQucmVzdG9yZSgpO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiByZW5kZXJPdGhlclBsYXllcihkZWx0YVRpbWU6IG51bWJlciwgZ2FtZVN0YXRlOiBMaWIuR2FtZVN0YXRlLCBwbGF5ZXJJbmRleDogbnVtYmVyKSB7XHJcbiAgICBjb25zdCBwbGF5ZXIgPSBnYW1lU3RhdGUub3RoZXJQbGF5ZXJzW3BsYXllckluZGV4XTtcclxuICAgIGlmIChwbGF5ZXIgPT09IHVuZGVmaW5lZCB8fCBwbGF5ZXIgPT09IG51bGwpIHJldHVybjtcclxuXHJcbiAgICBjb25zdCBmYWNlU3ByaXRlcyA9IFN0YXRlLmZhY2VTcHJpdGVzRm9yUGxheWVyW3BsYXllckluZGV4XSA/PyBbXTtcclxuICAgIGxldCBpID0gMDtcclxuICAgIGZvciAoY29uc3QgZmFjZVNwcml0ZSBvZiBmYWNlU3ByaXRlcykge1xyXG4gICAgICAgIGlmIChpIDwgcGxheWVyLnNoYXJlQ291bnQpIHtcclxuICAgICAgICAgICAgZmFjZVNwcml0ZS50YXJnZXQgPSBuZXcgVmVjdG9yKFxyXG4gICAgICAgICAgICAgICAgVlAuY2FudmFzLndpZHRoIC8gMiArIChwbGF5ZXIuc2hhcmVDb3VudCAtIGkpICogVlAuc3ByaXRlR2FwLFxyXG4gICAgICAgICAgICAgICAgVlAuc3ByaXRlSGVpZ2h0ICsgVlAuc3ByaXRlR2FwXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgZmFjZVNwcml0ZS50YXJnZXQgPSBuZXcgVmVjdG9yKFxyXG4gICAgICAgICAgICAgICAgVlAuY2FudmFzLndpZHRoIC8gMiAtIFZQLnNwcml0ZVdpZHRoIC0gKGkgLSBwbGF5ZXIuc2hhcmVDb3VudCkgKiBWUC5zcHJpdGVHYXAsXHJcbiAgICAgICAgICAgICAgICBWUC5zcHJpdGVIZWlnaHRcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZhY2VTcHJpdGUuYW5pbWF0ZShkZWx0YVRpbWUpO1xyXG5cclxuICAgICAgICArK2k7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgYmFja1Nwcml0ZXMgPSBTdGF0ZS5iYWNrU3ByaXRlc0ZvclBsYXllcltwbGF5ZXJJbmRleF0gPz8gW107XHJcbiAgICBpID0gMDtcclxuICAgIGZvciAoY29uc3QgYmFja1Nwcml0ZSBvZiBiYWNrU3ByaXRlcykge1xyXG4gICAgICAgIGJhY2tTcHJpdGUudGFyZ2V0ID0gbmV3IFZlY3RvcihWUC5jYW52YXMud2lkdGggLyAyIC0gVlAuc3ByaXRlV2lkdGggLyAyICsgKGkgLSBiYWNrU3ByaXRlcy5sZW5ndGggLyAyKSAqIFZQLnNwcml0ZUdhcCwgMCk7XHJcbiAgICAgICAgYmFja1Nwcml0ZS5hbmltYXRlKGRlbHRhVGltZSk7XHJcblxyXG4gICAgICAgICsraTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgVlAuY29udGV4dC5maWxsU3R5bGUgPSAnIzAwMDAwMGZmJztcclxuICAgIFZQLmNvbnRleHQuZm9udCA9IGAke1ZQLnNwcml0ZUhlaWdodCAvIDJ9cHggU3VnYXJsaWtlYDtcclxuICAgIFZQLmNvbnRleHQudGV4dEJhc2VsaW5lID0gXCJtaWRkbGVcIjtcclxuICAgIFZQLmNvbnRleHQudGV4dEFsaWduID0gXCJjZW50ZXJcIjtcclxuICAgIFZQLmNvbnRleHQuZmlsbFRleHQocGxheWVyLm5hbWUsIFZQLmNhbnZhcy53aWR0aCAvIDIsIFZQLnNwcml0ZUhlaWdodCAvIDIpO1xyXG59XHJcblxyXG4vLyByZXR1cm5zIHRoZSBhZGp1c3RlZCByZXZlYWwgaW5kZXhcclxuZnVuY3Rpb24gcmVuZGVyUGxheWVyKGRlbHRhVGltZTogbnVtYmVyLCBnYW1lU3RhdGU6IExpYi5HYW1lU3RhdGUpIHtcclxuICAgIGNvbnN0IHNwcml0ZXMgPSBTdGF0ZS5mYWNlU3ByaXRlc0ZvclBsYXllcltnYW1lU3RhdGUucGxheWVySW5kZXhdO1xyXG4gICAgaWYgKHNwcml0ZXMgPT09IHVuZGVmaW5lZCkgcmV0dXJuO1xyXG5cclxuICAgIGxldCBpID0gMDtcclxuICAgIGZvciAoY29uc3Qgc3ByaXRlIG9mIHNwcml0ZXMpIHtcclxuICAgICAgICBzcHJpdGUuYW5pbWF0ZShkZWx0YVRpbWUpO1xyXG5cclxuICAgICAgICBpZiAoTGliLmJpbmFyeVNlYXJjaE51bWJlcihTdGF0ZS5zZWxlY3RlZEluZGljZXMsIGkrKykgPj0gMCkge1xyXG4gICAgICAgICAgICBWUC5jb250ZXh0LmZpbGxTdHlsZSA9ICcjMDA4MDgwNDAnO1xyXG4gICAgICAgICAgICBWUC5jb250ZXh0LmZpbGxSZWN0KHNwcml0ZS5wb3NpdGlvbi54LCBzcHJpdGUucG9zaXRpb24ueSwgVlAuc3ByaXRlV2lkdGgsIFZQLnNwcml0ZUhlaWdodCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiByZW5kZXJCdXR0b25zKHRpbWU6IG51bWJlciwgZ2FtZVN0YXRlOiBMaWIuR2FtZVN0YXRlKSB7XHJcbiAgICBWUC5jb250ZXh0LnNhdmUoKTtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgLy8gYmx1ciBpbWFnZSBiZWhpbmRcclxuICAgICAgICAvL3N0YWNrQmx1ckNhbnZhc1JHQkEoJ2NhbnZhcycsIHgsIHksIGNhbnZhcy53aWR0aCAtIHgsIGNhbnZhcy5oZWlnaHQgLSB5LCAxNik7XHJcbiAgICAgICAgLypcclxuICAgICAgICBjb25zdCB4ID0gVlAuc29ydEJ5U3VpdEJvdW5kc1swXS54IC0gNCAqIFZQLnBpeGVsc1BlckNNO1xyXG4gICAgICAgIGNvbnN0IHkgPSBWUC5zb3J0QnlTdWl0Qm91bmRzWzBdLnk7XHJcbiAgICAgICAgVlAuY29udGV4dC5maWxsU3R5bGUgPSAnIzAwZmZmZjc3JztcclxuICAgICAgICBWUC5jb250ZXh0LmZpbGxSZWN0KHgsIHksIFZQLmNhbnZhcy53aWR0aCAtIHgsIFZQLmNhbnZhcy5oZWlnaHQgLSB5KTtcclxuICAgICAgICBcclxuICAgICAgICBWUC5jb250ZXh0LmZpbGxTdHlsZSA9ICcjMDAwMDAwZmYnO1xyXG4gICAgICAgIFZQLmNvbnRleHQuZm9udCA9ICcxLjVjbSBTdWdhcmxpa2UnO1xyXG4gICAgICAgIFZQLmNvbnRleHQuZmlsbFRleHQoJ1NPUlQnLCB4ICsgMC4yNSAqIFZQLnBpeGVsc1BlckNNLCB5ICsgMi4yNSAqIFZQLnBpeGVsc1BlckNNKTtcclxuXHJcbiAgICAgICAgVlAuY29udGV4dC5mb250ID0gJzNjbSBTdWdhcmxpa2UnO1xyXG4gICAgICAgIFZQLmNvbnRleHQuZmlsbFRleHQoJ3snLCB4ICsgMyAqIFZQLnBpeGVsc1BlckNNLCB5ICsgMi43NSAqIFZQLnBpeGVsc1BlckNNKTtcclxuXHJcbiAgICAgICAgVlAuY29udGV4dC5mb250ID0gJzEuNWNtIFN1Z2FybGlrZSc7XHJcbiAgICAgICAgVlAuY29udGV4dC5maWxsVGV4dCgnU1VJVCcsIFZQLnNvcnRCeVN1aXRCb3VuZHNbMF0ueCwgVlAuc29ydEJ5U3VpdEJvdW5kc1sxXS55KTtcclxuXHJcbiAgICAgICAgVlAuY29udGV4dC5mb250ID0gJzEuNWNtIFN1Z2FybGlrZSc7XHJcbiAgICAgICAgVlAuY29udGV4dC5maWxsVGV4dCgnUkFOSycsIFZQLnNvcnRCeVJhbmtCb3VuZHNbMF0ueCwgVlAuc29ydEJ5UmFua0JvdW5kc1sxXS55KTtcclxuICAgICAgICAqL1xyXG4gICAgICAgIC8vY29udGV4dC5maWxsU3R5bGUgPSAnI2ZmMDAwMDc3JztcclxuICAgICAgICAvL2NvbnRleHQuZmlsbFJlY3QoVlAuc29ydEJ5U3VpdEJvdW5kc1swXS54LCBWUC5zb3J0QnlTdWl0Qm91bmRzWzBdLnksXHJcbiAgICAgICAgICAgIC8vc29ydEJ5U3VpdEJvdW5kc1sxXS54IC0gc29ydEJ5U3VpdEJvdW5kc1swXS54LCBzb3J0QnlTdWl0Qm91bmRzWzFdLnkgLSBzb3J0QnlTdWl0Qm91bmRzWzBdLnkpO1xyXG5cclxuICAgICAgICAvL2NvbnRleHQuZmlsbFN0eWxlID0gJyMwMDAwZmY3Nyc7XHJcbiAgICAgICAgLy9jb250ZXh0LmZpbGxSZWN0KHNvcnRCeVJhbmtCb3VuZHNbMF0ueCwgc29ydEJ5UmFua0JvdW5kc1swXS55LFxyXG4gICAgICAgICAgICAvL3NvcnRCeVJhbmtCb3VuZHNbMV0ueCAtIHNvcnRCeVJhbmtCb3VuZHNbMF0ueCwgc29ydEJ5UmFua0JvdW5kc1sxXS55IC0gc29ydEJ5UmFua0JvdW5kc1swXS55KTtcclxuXHJcbiAgICAgICAgLyppZiAoZ2FtZVN0YXRlLnBsYXllclN0YXRlID09PSBcIlByb2NlZWRcIiB8fCBnYW1lU3RhdGUucGxheWVyU3RhdGUgPT09IFwiV2FpdFwiKSB7XHJcbiAgICAgICAgICAgIFZQLmNvbnRleHQudGV4dEJhc2VsaW5lID0gJ3RvcCc7XHJcblxyXG4gICAgICAgICAgICBpZiAoZ2FtZVN0YXRlLnBsYXllclN0YXRlID09PSBcIldhaXRcIikge1xyXG4gICAgICAgICAgICAgICAgVlAuY29udGV4dC5maWxsU3R5bGUgPSAnIzAwZmZmZjYwJztcclxuICAgICAgICAgICAgICAgIFZQLmNvbnRleHQuZmlsbFJlY3QoXHJcbiAgICAgICAgICAgICAgICAgICAgVlAud2FpdEJvdW5kc1swXS54LCBWUC53YWl0Qm91bmRzWzBdLnksXHJcbiAgICAgICAgICAgICAgICAgICAgVlAud2FpdEJvdW5kc1sxXS54IC0gVlAud2FpdEJvdW5kc1swXS54LCBWUC53YWl0Qm91bmRzWzFdLnkgLSBWUC53YWl0Qm91bmRzWzBdLnlcclxuICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIFZQLmNvbnRleHQuZmlsbFN0eWxlID0gJyMwMDAwMDBmZic7XHJcbiAgICAgICAgICAgIFZQLmNvbnRleHQuZm9udCA9IFZQLndhaXRGb250O1xyXG4gICAgICAgICAgICBWUC5jb250ZXh0LmZpbGxUZXh0KCdXYWl0IScsIFZQLndhaXRCb3VuZHNbMF0ueCwgVlAud2FpdEJvdW5kc1swXS55KTtcclxuICAgICAgICAgICAgYm91bmRzUmVjdChWUC53YWl0Qm91bmRzKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChnYW1lU3RhdGUucGxheWVyU3RhdGUgPT09IFwiUHJvY2VlZFwiKSB7XHJcbiAgICAgICAgICAgICAgICBWUC5jb250ZXh0LmZpbGxTdHlsZSA9ICcjMDBmZmZmNjAnO1xyXG4gICAgICAgICAgICAgICAgVlAuY29udGV4dC5maWxsUmVjdChcclxuICAgICAgICAgICAgICAgICAgICBWUC5wcm9jZWVkQm91bmRzWzBdLngsIFZQLnByb2NlZWRCb3VuZHNbMF0ueSxcclxuICAgICAgICAgICAgICAgICAgICBWUC5wcm9jZWVkQm91bmRzWzFdLnggLSBWUC5wcm9jZWVkQm91bmRzWzBdLngsIFZQLnByb2NlZWRCb3VuZHNbMV0ueSAtIFZQLnByb2NlZWRCb3VuZHNbMF0ueVxyXG4gICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgVlAuY29udGV4dC5maWxsU3R5bGUgPSAnIzAwMDAwMGZmJztcclxuICAgICAgICAgICAgVlAuY29udGV4dC5mb250ID0gVlAucHJvY2VlZEZvbnQ7XHJcbiAgICAgICAgICAgIFZQLmNvbnRleHQuZmlsbFRleHQoJ1Byb2NlZWQuJywgVlAucHJvY2VlZEJvdW5kc1swXS54LCBWUC5wcm9jZWVkQm91bmRzWzBdLnkpO1xyXG4gICAgICAgICAgICBib3VuZHNSZWN0KFZQLnByb2NlZWRCb3VuZHMpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGlmIChnYW1lU3RhdGUucGxheWVyU3RhdGUgPT09ICdSZWFkeScpIHtcclxuICAgICAgICAgICAgICAgIFZQLmNvbnRleHQuZmlsbFN0eWxlID0gJyMwMDAwMDBmZic7XHJcbiAgICAgICAgICAgICAgICBWUC5jb250ZXh0LmZvbnQgPSBWUC5yZWFkeUZvbnQ7XHJcbiAgICAgICAgICAgICAgICBWUC5jb250ZXh0LmZpbGxUZXh0KCdSZWFkeSEnLCBWUC5yZWFkeUJvdW5kc1swXS54LCBWUC5yZWFkeUJvdW5kc1swXS55KTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIFZQLmNvbnRleHQuZmlsbFN0eWxlID0gJyMwMDAwMDBmZic7XHJcbiAgICAgICAgICAgICAgICBWUC5jb250ZXh0LmZvbnQgPSBWUC5jb3VudGRvd25Gb250O1xyXG4gICAgICAgICAgICAgICAgVlAuY29udGV4dC5maWxsVGV4dChgV2FpdGluZyAke1xyXG4gICAgICAgICAgICAgICAgICAgIE1hdGguZmxvb3IoMSArIChnYW1lU3RhdGUucGxheWVyU3RhdGUuYWN0aXZlVGltZSArIExpYi5hY3RpdmVDb29sZG93biAtIERhdGUubm93KCkpIC8gMTAwMClcclxuICAgICAgICAgICAgICAgIH0gc2Vjb25kcy4uLmAsIFZQLmNvdW50ZG93bkJvdW5kc1swXS54LCBWUC5jb3VudGRvd25Cb3VuZHNbMF0ueSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9Ki9cclxuICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgVlAuY29udGV4dC5yZXN0b3JlKCk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGJvdW5kc1JlY3QoW3RvcExlZnQsIGJvdHRvbVJpZ2h0XTogW1ZlY3RvciwgVmVjdG9yXSkge1xyXG4gICAgVlAuY29udGV4dC5zdHJva2VSZWN0KHRvcExlZnQueCwgdG9wTGVmdC55LCBib3R0b21SaWdodC54IC0gdG9wTGVmdC54LCBib3R0b21SaWdodC55IC0gdG9wTGVmdC55KTtcclxufVxyXG4iLCJpbXBvcnQgVmVjdG9yIGZyb20gJy4vdmVjdG9yJztcclxuaW1wb3J0ICogYXMgVlAgZnJvbSAnLi92aWV3LXBhcmFtcyc7XHJcblxyXG5jb25zdCBkZWNheVBlclNlY29uZCA9IDEvNjA7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBTcHJpdGUge1xyXG4gICAgaW1hZ2U6IEhUTUxJbWFnZUVsZW1lbnQ7XHJcbiAgICB0YXJnZXQ6IFZlY3RvcjtcclxuICAgIHBvc2l0aW9uOiBWZWN0b3I7XHJcblxyXG4gICAgY29uc3RydWN0b3IoaW1hZ2U6IEhUTUxJbWFnZUVsZW1lbnQpIHtcclxuICAgICAgICB0aGlzLmltYWdlID0gaW1hZ2U7XHJcbiAgICAgICAgdGhpcy50YXJnZXQgPSBuZXcgVmVjdG9yKDAsIDApO1xyXG4gICAgICAgIHRoaXMucG9zaXRpb24gPSBuZXcgVmVjdG9yKDAsIDApO1xyXG4gICAgfVxyXG5cclxuICAgIGFuaW1hdGUoZGVsdGFUaW1lOiBudW1iZXIpIHtcclxuICAgICAgICB0aGlzLnBvc2l0aW9uID0gdGhpcy5wb3NpdGlvbi5hZGQodGhpcy50YXJnZXQuc3ViKHRoaXMucG9zaXRpb24pLnNjYWxlKFxyXG4gICAgICAgICAgICAxIC0gTWF0aC5wb3coMSAtIGRlY2F5UGVyU2Vjb25kLCBkZWx0YVRpbWUpXHJcbiAgICAgICAgKSk7XHJcblxyXG4gICAgICAgIFZQLmNvbnRleHQuZHJhd0ltYWdlKFxyXG4gICAgICAgICAgICB0aGlzLmltYWdlLFxyXG4gICAgICAgICAgICAwLCAwLCBWUC5zcHJpdGVXaWR0aCwgVlAuc3ByaXRlSGVpZ2h0LFxyXG4gICAgICAgICAgICB0aGlzLnBvc2l0aW9uLngsIHRoaXMucG9zaXRpb24ueSwgVlAuc3ByaXRlV2lkdGgsIFZQLnNwcml0ZUhlaWdodFxyXG4gICAgICAgICk7XHJcbiAgICB9XHJcbn0iLCJpbXBvcnQgeyBNdXRleCB9IGZyb20gJ2F3YWl0LXNlbWFwaG9yZSc7XHJcblxyXG5pbXBvcnQgKiBhcyBMaWIgZnJvbSAnLi4vbGliJztcclxuaW1wb3J0ICogYXMgQ2FyZEltYWdlcyBmcm9tICcuL2NhcmQtaW1hZ2VzJztcclxuaW1wb3J0ICogYXMgVlAgZnJvbSAnLi92aWV3LXBhcmFtcyc7XHJcbmltcG9ydCBTcHJpdGUgZnJvbSAnLi9zcHJpdGUnO1xyXG5pbXBvcnQgVmVjdG9yIGZyb20gJy4vdmVjdG9yJztcclxuXHJcbmNvbnN0IHBsYXllck5hbWVGcm9tQ29va2llID0gTGliLmdldENvb2tpZSgncGxheWVyTmFtZScpO1xyXG5pZiAocGxheWVyTmFtZUZyb21Db29raWUgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCdObyBwbGF5ZXIgbmFtZSEnKTtcclxuZXhwb3J0IGNvbnN0IHBsYXllck5hbWUgPSBkZWNvZGVVUkkocGxheWVyTmFtZUZyb21Db29raWUpO1xyXG5cclxuY29uc3QgZ2FtZUlkRnJvbUNvb2tpZSA9IExpYi5nZXRDb29raWUoJ2dhbWVJZCcpO1xyXG5pZiAoZ2FtZUlkRnJvbUNvb2tpZSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoJ05vIGdhbWUgaWQhJyk7XHJcbmV4cG9ydCBjb25zdCBnYW1lSWQgPSBnYW1lSWRGcm9tQ29va2llO1xyXG5cclxuLy8gc29tZSBzdGF0ZS1tYW5pcHVsYXRpbmcgb3BlcmF0aW9ucyBhcmUgYXN5bmNocm9ub3VzLCBzbyB3ZSBuZWVkIHRvIGd1YXJkIGFnYWluc3QgcmFjZXNcclxuY29uc3Qgc3RhdGVNdXRleCA9IG5ldyBNdXRleCgpO1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbG9jaygpOiBQcm9taXNlPCgpID0+IHZvaWQ+IHtcclxuICAgIC8vY29uc29sZS5sb2coYGFjcXVpcmluZyBzdGF0ZSBsb2NrLi4uXFxuJHtuZXcgRXJyb3IoKS5zdGFja31gKTtcclxuICAgIGNvbnN0IHJlbGVhc2UgPSBhd2FpdCBzdGF0ZU11dGV4LmFjcXVpcmUoKTtcclxuICAgIC8vY29uc29sZS5sb2coYGFjcXVpcmVkIHN0YXRlIGxvY2tcXG4ke25ldyBFcnJvcigpLnN0YWNrfWApO1xyXG4gICAgcmV0dXJuICgpID0+IHtcclxuICAgICAgICByZWxlYXNlKCk7XHJcbiAgICAgICAgLy9jb25zb2xlLmxvZyhgcmVsZWFzZWQgc3RhdGUgbG9ja2ApO1xyXG4gICAgfTtcclxufVxyXG5cclxuLy8gd2UgbmVlZCB0byBrZWVwIGEgY29weSBvZiB0aGUgcHJldmlvdXMgZ2FtZSBzdGF0ZSBhcm91bmQgZm9yIGJvb2trZWVwaW5nIHB1cnBvc2VzXHJcbmV4cG9ydCBsZXQgcHJldmlvdXNHYW1lU3RhdGU6IExpYi5HYW1lU3RhdGUgfCB1bmRlZmluZWQ7XHJcbi8vIHRoZSBtb3N0IHJlY2VudGx5IHJlY2VpdmVkIGdhbWUgc3RhdGUsIGlmIGFueVxyXG5leHBvcnQgbGV0IGdhbWVTdGF0ZTogTGliLkdhbWVTdGF0ZSB8IHVuZGVmaW5lZDtcclxuXHJcbi8vIGluZGljZXMgb2YgY2FyZHMgZm9yIGRyYWcgJiBkcm9wXHJcbi8vIElNUE9SVEFOVDogdGhpcyBhcnJheSBtdXN0IGFsd2F5cyBiZSBzb3J0ZWQhXHJcbi8vIEFsd2F5cyB1c2UgYmluYXJ5U2VhcmNoIHRvIGluc2VydCBhbmQgZGVsZXRlIG9yIHNvcnQgYWZ0ZXIgbWFuaXB1bGF0aW9uXHJcbmV4cG9ydCBjb25zdCBzZWxlY3RlZEluZGljZXM6IG51bWJlcltdID0gW107XHJcblxyXG4vLyBmb3IgYW5pbWF0aW5nIHRoZSBkZWNrXHJcbmV4cG9ydCBsZXQgZGVja1Nwcml0ZXM6IFNwcml0ZVtdID0gW107XHJcblxyXG4vLyBhc3NvY2lhdGl2ZSBhcnJheXMsIG9uZSBmb3IgZWFjaCBwbGF5ZXIgYXQgdGhlaXIgcGxheWVyIGluZGV4XHJcbi8vIGVhY2ggZWxlbWVudCBjb3JyZXNwb25kcyB0byBhIGZhY2UtZG93biBjYXJkIGJ5IGluZGV4XHJcbmV4cG9ydCBsZXQgYmFja1Nwcml0ZXNGb3JQbGF5ZXI6IFNwcml0ZVtdW10gPSBbXTtcclxuLy8gZWFjaCBlbGVtZW50IGNvcnJlc3BvbmRzIHRvIGEgZmFjZS11cCBjYXJkIGJ5IGluZGV4XHJcbmV4cG9ydCBsZXQgZmFjZVNwcml0ZXNGb3JQbGF5ZXI6IFNwcml0ZVtdW10gPSBbXTtcclxuXHJcbi8vIG9wZW4gd2Vic29ja2V0IGNvbm5lY3Rpb24gdG8gZ2V0IGdhbWUgc3RhdGUgdXBkYXRlc1xyXG5sZXQgd3MgPSBuZXcgV2ViU29ja2V0KGB3c3M6Ly8ke3dpbmRvdy5sb2NhdGlvbi5ob3N0bmFtZX0vYCk7XHJcblxyXG5jb25zdCBjYWxsYmFja3NGb3JNZXRob2ROYW1lID0gbmV3IE1hcDxMaWIuTWV0aG9kTmFtZSwgKChyZXN1bHQ6IExpYi5NZXRob2RSZXN1bHQpID0+IHZvaWQpW10+KCk7XHJcbmZ1bmN0aW9uIGFkZENhbGxiYWNrKG1ldGhvZE5hbWU6IExpYi5NZXRob2ROYW1lLCByZXNvbHZlOiAoKSA9PiB2b2lkLCByZWplY3Q6IChyZWFzb246IGFueSkgPT4gdm9pZCkge1xyXG4gICAgY29uc29sZS5sb2coYGFkZGluZyBjYWxsYmFjayBmb3IgbWV0aG9kICcke21ldGhvZE5hbWV9J2ApO1xyXG5cclxuICAgIGxldCBjYWxsYmFja3MgPSBjYWxsYmFja3NGb3JNZXRob2ROYW1lLmdldChtZXRob2ROYW1lKTtcclxuICAgIGlmIChjYWxsYmFja3MgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIGNhbGxiYWNrcyA9IFtdO1xyXG4gICAgICAgIGNhbGxiYWNrc0Zvck1ldGhvZE5hbWUuc2V0KG1ldGhvZE5hbWUsIGNhbGxiYWNrcyk7XHJcbiAgICB9XHJcblxyXG4gICAgY2FsbGJhY2tzLnB1c2gocmVzdWx0ID0+IHtcclxuICAgICAgICBjb25zb2xlLmxvZyhgaW52b2tpbmcgY2FsbGJhY2sgZm9yIG1ldGhvZCAnJHttZXRob2ROYW1lfSdgKTtcclxuICAgICAgICBpZiAoJ2Vycm9yRGVzY3JpcHRpb24nIGluIHJlc3VsdCkge1xyXG4gICAgICAgICAgICByZWplY3QocmVzdWx0LmVycm9yRGVzY3JpcHRpb24pO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHJlc29sdmUoKTtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxufVxyXG5cclxud3Mub25tZXNzYWdlID0gYXN5bmMgZSA9PiB7XHJcbiAgICBjb25zdCBvYmogPSBKU09OLnBhcnNlKGUuZGF0YSk7XHJcbiAgICBpZiAoJ21ldGhvZE5hbWUnIGluIG9iaikge1xyXG4gICAgICAgIGNvbnN0IHJldHVybk1lc3NhZ2UgPSA8TGliLk1ldGhvZFJlc3VsdD5vYmo7XHJcbiAgICAgICAgY29uc3QgbWV0aG9kTmFtZSA9IHJldHVybk1lc3NhZ2UubWV0aG9kTmFtZTtcclxuICAgICAgICBjb25zdCBjYWxsYmFja3MgPSBjYWxsYmFja3NGb3JNZXRob2ROYW1lLmdldChtZXRob2ROYW1lKTtcclxuICAgICAgICBpZiAoY2FsbGJhY2tzID09PSB1bmRlZmluZWQgfHwgY2FsbGJhY2tzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYG5vIGNhbGxiYWNrcyBmb3VuZCBmb3IgbWV0aG9kOiAke21ldGhvZE5hbWV9YCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBjYWxsYmFjayA9IGNhbGxiYWNrcy5zaGlmdCgpO1xyXG4gICAgICAgIGlmIChjYWxsYmFjayA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgY2FsbGJhY2sgaXMgdW5kZWZpbmVkIGZvciBtZXRob2Q6ICR7bWV0aG9kTmFtZX1gKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgY2FsbGJhY2socmV0dXJuTWVzc2FnZSk7XHJcbiAgICB9IGVsc2UgaWYgKFxyXG4gICAgICAgICdkZWNrQ291bnQnIGluIG9iaiAmJlxyXG4gICAgICAgICdwbGF5ZXJJbmRleCcgaW4gb2JqICYmXHJcbiAgICAgICAgJ3BsYXllckNhcmRzJyBpbiBvYmogJiZcclxuICAgICAgICAncGxheWVyUmV2ZWFsQ291bnQnIGluIG9iaiAmJlxyXG4gICAgICAgIC8vJ3BsYXllclN0YXRlJyBpbiBvYmogJiZcclxuICAgICAgICAnb3RoZXJQbGF5ZXJzJyBpbiBvYmpcclxuICAgICkge1xyXG4gICAgICAgIGNvbnN0IHVubG9jayA9IGF3YWl0IGxvY2soKTtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBwcmV2aW91c0dhbWVTdGF0ZSA9IGdhbWVTdGF0ZTtcclxuICAgICAgICAgICAgZ2FtZVN0YXRlID0gPExpYi5HYW1lU3RhdGU+b2JqO1xyXG5cclxuICAgICAgICAgICAgaWYgKHByZXZpb3VzR2FtZVN0YXRlICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBwcmV2aW91c0dhbWVTdGF0ZS5wbGF5ZXJDYXJkczogJHtKU09OLnN0cmluZ2lmeShwcmV2aW91c0dhbWVTdGF0ZS5wbGF5ZXJDYXJkcyl9YCk7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgcHJldmlvdXMgc2VsZWN0ZWRJbmRpY2VzOiAke0pTT04uc3RyaW5naWZ5KHNlbGVjdGVkSW5kaWNlcyl9YCk7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgcHJldmlvdXMgc2VsZWN0ZWRDYXJkczogJHtKU09OLnN0cmluZ2lmeShzZWxlY3RlZEluZGljZXMubWFwKGkgPT4gcHJldmlvdXNHYW1lU3RhdGU/LnBsYXllckNhcmRzW2ldKSl9YCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIHNlbGVjdGVkIGluZGljZXMgbWlnaHQgaGF2ZSBzaGlmdGVkXHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2VsZWN0ZWRJbmRpY2VzLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBzZWxlY3RlZEluZGV4ID0gc2VsZWN0ZWRJbmRpY2VzW2ldO1xyXG4gICAgICAgICAgICAgICAgaWYgKHNlbGVjdGVkSW5kZXggPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKEpTT04uc3RyaW5naWZ5KGdhbWVTdGF0ZS5wbGF5ZXJDYXJkc1tzZWxlY3RlZEluZGV4XSkgIT09IEpTT04uc3RyaW5naWZ5KHByZXZpb3VzR2FtZVN0YXRlPy5wbGF5ZXJDYXJkc1tzZWxlY3RlZEluZGV4XSkpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgZm91bmQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGdhbWVTdGF0ZS5wbGF5ZXJDYXJkcy5sZW5ndGg7ICsraikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoSlNPTi5zdHJpbmdpZnkoZ2FtZVN0YXRlLnBsYXllckNhcmRzW2pdKSA9PT0gSlNPTi5zdHJpbmdpZnkocHJldmlvdXNHYW1lU3RhdGU/LnBsYXllckNhcmRzW3NlbGVjdGVkSW5kZXhdKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWRJbmRpY2VzW2ldID0gajtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvdW5kID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoIWZvdW5kKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkSW5kaWNlcy5zcGxpY2UoaSwgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC0taTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIGJpbmFyeSBzZWFyY2ggc3RpbGwgbmVlZHMgdG8gd29ya1xyXG4gICAgICAgICAgICBzZWxlY3RlZEluZGljZXMuc29ydCgoYSwgYikgPT4gYSAtIGIpO1xyXG5cclxuICAgICAgICAgICAgLy8gaW5pdGlhbGl6ZSBhbmltYXRpb24gc3RhdGVzXHJcbiAgICAgICAgICAgIGFzc29jaWF0ZUFuaW1hdGlvbnNXaXRoQ2FyZHMocHJldmlvdXNHYW1lU3RhdGUsIGdhbWVTdGF0ZSk7XHJcblxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgZ2FtZVN0YXRlLnBsYXllckNhcmRzOiAke0pTT04uc3RyaW5naWZ5KGdhbWVTdGF0ZS5wbGF5ZXJDYXJkcyl9YCk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBnYW1lU3RhdGUucGxheWVyU2hhcmVDb3VudCA9ICR7Z2FtZVN0YXRlLnBsYXllclNoYXJlQ291bnR9YCk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBnYW1lU3RhdGUucGxheWVyUmV2ZWFsQ291bnQgPSAke2dhbWVTdGF0ZS5wbGF5ZXJSZXZlYWxDb3VudH1gKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coYHNlbGVjdGVkSW5kaWNlczogJHtKU09OLnN0cmluZ2lmeShzZWxlY3RlZEluZGljZXMpfWApO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgc2VsZWN0ZWRDYXJkczogJHtKU09OLnN0cmluZ2lmeShzZWxlY3RlZEluZGljZXMubWFwKGkgPT4gZ2FtZVN0YXRlPy5wbGF5ZXJDYXJkc1tpXSkpfWApO1xyXG4gICAgICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgICAgIHVubG9jaygpO1xyXG4gICAgICAgIH1cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKEpTT04uc3RyaW5naWZ5KGUuZGF0YSkpO1xyXG4gICAgfVxyXG59O1xyXG5cclxubGV0IG9uQW5pbWF0aW9uc0Fzc29jaWF0ZWQgPSAoKSA9PiB7fTtcclxuXHJcbmZ1bmN0aW9uIGFzc29jaWF0ZUFuaW1hdGlvbnNXaXRoQ2FyZHMocHJldmlvdXNHYW1lU3RhdGU6IExpYi5HYW1lU3RhdGUgfCB1bmRlZmluZWQsIGdhbWVTdGF0ZTogTGliLkdhbWVTdGF0ZSkge1xyXG4gICAgY29uc3QgcHJldmlvdXNEZWNrU3ByaXRlcyA9IGRlY2tTcHJpdGVzO1xyXG4gICAgY29uc3QgcHJldmlvdXNCYWNrU3ByaXRlc0ZvclBsYXllciA9IGJhY2tTcHJpdGVzRm9yUGxheWVyO1xyXG4gICAgY29uc3QgcHJldmlvdXNGYWNlU3ByaXRlc0ZvclBsYXllciA9IGZhY2VTcHJpdGVzRm9yUGxheWVyO1xyXG5cclxuICAgIGJhY2tTcHJpdGVzRm9yUGxheWVyID0gW107XHJcbiAgICBmYWNlU3ByaXRlc0ZvclBsYXllciA9IFtdO1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCA0OyArK2kpIHtcclxuICAgICAgICBjb25zdCBwcmV2aW91c0JhY2tTcHJpdGVzID0gcHJldmlvdXNCYWNrU3ByaXRlc0ZvclBsYXllcltpXSA/PyBbXTtcclxuICAgICAgICBwcmV2aW91c0JhY2tTcHJpdGVzRm9yUGxheWVyW2ldID0gcHJldmlvdXNCYWNrU3ByaXRlcztcclxuXHJcbiAgICAgICAgY29uc3QgcHJldmlvdXNGYWNlU3ByaXRlcyA9IHByZXZpb3VzRmFjZVNwcml0ZXNGb3JQbGF5ZXJbaV0gPz8gW107XHJcbiAgICAgICAgcHJldmlvdXNGYWNlU3ByaXRlc0ZvclBsYXllcltpXSA9IHByZXZpb3VzRmFjZVNwcml0ZXM7XHJcblxyXG4gICAgICAgIGxldCBwcmV2aW91c0ZhY2VDYXJkczogTGliLkNhcmRbXTtcclxuICAgICAgICBsZXQgZmFjZUNhcmRzOiBMaWIuQ2FyZFtdO1xyXG4gICAgICAgIGlmIChpID09PSBnYW1lU3RhdGUucGxheWVySW5kZXgpIHtcclxuICAgICAgICAgICAgcHJldmlvdXNGYWNlQ2FyZHMgPSBwcmV2aW91c0dhbWVTdGF0ZT8ucGxheWVyQ2FyZHMgPz8gW107XHJcbiAgICAgICAgICAgIGZhY2VDYXJkcyA9IGdhbWVTdGF0ZS5wbGF5ZXJDYXJkcztcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBwcmV2aW91c0ZhY2VDYXJkcyA9IHByZXZpb3VzR2FtZVN0YXRlPy5vdGhlclBsYXllcnNbaV0/LnJldmVhbGVkQ2FyZHMgPz8gW107XHJcbiAgICAgICAgICAgIGZhY2VDYXJkcyA9IGdhbWVTdGF0ZS5vdGhlclBsYXllcnNbaV0/LnJldmVhbGVkQ2FyZHMgPz8gW107XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgZmFjZVNwcml0ZXM6IFNwcml0ZVtdID0gW107XHJcbiAgICAgICAgZmFjZVNwcml0ZXNGb3JQbGF5ZXJbaV0gPSBmYWNlU3ByaXRlcztcclxuICAgICAgICBmb3IgKGNvbnN0IGZhY2VDYXJkIG9mIGZhY2VDYXJkcykge1xyXG4gICAgICAgICAgICBsZXQgZmFjZVNwcml0ZTogU3ByaXRlIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICBpZiAoZmFjZVNwcml0ZSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IHByZXZpb3VzRmFjZUNhcmRzLmxlbmd0aDsgKytqKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJldmlvdXNGYWNlQ2FyZCA9IHByZXZpb3VzRmFjZUNhcmRzW2pdO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChwcmV2aW91c0ZhY2VDYXJkID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChKU09OLnN0cmluZ2lmeShmYWNlQ2FyZCkgPT09IEpTT04uc3RyaW5naWZ5KHByZXZpb3VzRmFjZUNhcmQpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHByZXZpb3VzRmFjZUNhcmRzLnNwbGljZShqLCAxKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZmFjZVNwcml0ZSA9IHByZXZpb3VzRmFjZVNwcml0ZXMuc3BsaWNlKGosIDEpWzBdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZmFjZVNwcml0ZSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoZmFjZVNwcml0ZSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IDQ7ICsraikge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHByZXZpb3VzT3RoZXJQbGF5ZXIgPSBwcmV2aW91c0dhbWVTdGF0ZT8ub3RoZXJQbGF5ZXJzW2pdO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG90aGVyUGxheWVyID0gZ2FtZVN0YXRlLm90aGVyUGxheWVyc1tqXTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAocHJldmlvdXNPdGhlclBsYXllciA9PT0gdW5kZWZpbmVkIHx8IHByZXZpb3VzT3RoZXJQbGF5ZXIgPT09IG51bGwgfHxcclxuICAgICAgICAgICAgICAgICAgICAgICAgb3RoZXJQbGF5ZXIgPT09IHVuZGVmaW5lZCB8fCBvdGhlclBsYXllciA9PT0gbnVsbFxyXG4gICAgICAgICAgICAgICAgICAgICkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChwcmV2aW91c090aGVyUGxheWVyLnNoYXJlQ291bnQgPiBvdGhlclBsYXllci5zaGFyZUNvdW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGsgPSAwOyBrIDwgcHJldmlvdXNPdGhlclBsYXllci5zaGFyZUNvdW50OyArK2spIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChKU09OLnN0cmluZ2lmeShmYWNlQ2FyZCkgPT09IEpTT04uc3RyaW5naWZ5KHByZXZpb3VzT3RoZXJQbGF5ZXIucmV2ZWFsZWRDYXJkc1trXSkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAtLXByZXZpb3VzT3RoZXJQbGF5ZXIuc2hhcmVDb3VudDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcmV2aW91c090aGVyUGxheWVyLnJldmVhbGVkQ2FyZHMuc3BsaWNlKGssIDEpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmYWNlU3ByaXRlID0gcHJldmlvdXNGYWNlU3ByaXRlc0ZvclBsYXllcltqXT8uc3BsaWNlKGssIDEpWzBdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmYWNlU3ByaXRlID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNvdXJjZVRyYW5zZm9ybSA9IFZQLmdldFRyYW5zZm9ybUZvclBsYXllcihWUC5nZXRSZWxhdGl2ZVBsYXllckluZGV4KGosIGdhbWVTdGF0ZS5wbGF5ZXJJbmRleCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRlc3RpbmF0aW9uVHJhbnNmb3JtID0gVlAuZ2V0VHJhbnNmb3JtRm9yUGxheWVyKFZQLmdldFJlbGF0aXZlUGxheWVySW5kZXgoaSwgZ2FtZVN0YXRlLnBsYXllckluZGV4KSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzdGluYXRpb25UcmFuc2Zvcm0uaW52ZXJ0U2VsZigpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgcCA9IHNvdXJjZVRyYW5zZm9ybS50cmFuc2Zvcm1Qb2ludChmYWNlU3ByaXRlLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwID0gZGVzdGluYXRpb25UcmFuc2Zvcm0udHJhbnNmb3JtUG9pbnQocCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmFjZVNwcml0ZS5wb3NpdGlvbiA9IG5ldyBWZWN0b3IocC54LCBwLnkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoZmFjZVNwcml0ZSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGZhY2VTcHJpdGUgPT09IHVuZGVmaW5lZCAmJiBwcmV2aW91c0JhY2tTcHJpdGVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgIC8vIG1ha2UgaXQgbG9vayBsaWtlIHRoaXMgY2FyZCB3YXMgcmV2ZWFsZWQgYW1vbmcgcHJldmlvdXNseSBoaWRkZW4gY2FyZHNcclxuICAgICAgICAgICAgICAgIC8vIHdoaWNoLCBvZiBjb3Vyc2UsIHJlcXVpcmVzIHRoYXQgdGhlIHBsYXllciBoYWQgcHJldmlvdXNseSBoaWRkZW4gY2FyZHNcclxuICAgICAgICAgICAgICAgIGZhY2VTcHJpdGUgPSBwcmV2aW91c0JhY2tTcHJpdGVzLnNwbGljZSgwLCAxKVswXTtcclxuICAgICAgICAgICAgICAgIGlmIChmYWNlU3ByaXRlID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG4gICAgICAgICAgICAgICAgZmFjZVNwcml0ZS5pbWFnZSA9IENhcmRJbWFnZXMuZ2V0KEpTT04uc3RyaW5naWZ5KGZhY2VDYXJkKSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChmYWNlU3ByaXRlID09PSB1bmRlZmluZWQgJiYgcHJldmlvdXNEZWNrU3ByaXRlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBtYWtlIGl0IGxvb2sgbGlrZSB0aGlzIGNhcmQgY2FtZSBmcm9tIHRoZSBkZWNrO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZmFjZVNwcml0ZSA9IHByZXZpb3VzRGVja1Nwcml0ZXMuc3BsaWNlKHByZXZpb3VzRGVja1Nwcml0ZXMubGVuZ3RoIC0gMSwgMSlbMF07XHJcbiAgICAgICAgICAgICAgICBpZiAoZmFjZVNwcml0ZSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICAgICAgICAgICAgICAgIGZhY2VTcHJpdGUuaW1hZ2UgPSBDYXJkSW1hZ2VzLmdldChKU09OLnN0cmluZ2lmeShmYWNlQ2FyZCkpO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIHRoaXMgc3ByaXRlIGlzIHJlbmRlcmVkIGluIHRoZSBwbGF5ZXIncyB0cmFuc2Zvcm1lZCBjYW52YXMgY29udGV4dFxyXG4gICAgICAgICAgICAgICAgY29uc3QgdHJhbnNmb3JtID0gVlAuZ2V0VHJhbnNmb3JtRm9yUGxheWVyKFZQLmdldFJlbGF0aXZlUGxheWVySW5kZXgoaSwgZ2FtZVN0YXRlLnBsYXllckluZGV4KSk7XHJcbiAgICAgICAgICAgICAgICB0cmFuc2Zvcm0uaW52ZXJ0U2VsZigpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcG9pbnQgPSB0cmFuc2Zvcm0udHJhbnNmb3JtUG9pbnQoZmFjZVNwcml0ZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICBmYWNlU3ByaXRlLnBvc2l0aW9uID0gbmV3IFZlY3Rvcihwb2ludC54LCBwb2ludC55KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGZhY2VTcHJpdGUgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgZmFjZVNwcml0ZSA9IG5ldyBTcHJpdGUoQ2FyZEltYWdlcy5nZXQoSlNPTi5zdHJpbmdpZnkoZmFjZUNhcmQpKSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGZhY2VTcHJpdGVzLnB1c2goZmFjZVNwcml0ZSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgNDsgKytpKSB7XHJcbiAgICAgICAgY29uc3QgcHJldmlvdXNCYWNrU3ByaXRlcyA9IHByZXZpb3VzQmFja1Nwcml0ZXNGb3JQbGF5ZXJbaV0gPz8gW107XHJcbiAgICAgICAgcHJldmlvdXNCYWNrU3ByaXRlc0ZvclBsYXllcltpXSA9IHByZXZpb3VzQmFja1Nwcml0ZXM7XHJcblxyXG4gICAgICAgIGNvbnN0IHByZXZpb3VzRmFjZVNwcml0ZXMgPSBwcmV2aW91c0ZhY2VTcHJpdGVzRm9yUGxheWVyW2ldID8/IFtdO1xyXG4gICAgICAgIHByZXZpb3VzRmFjZVNwcml0ZXNGb3JQbGF5ZXJbaV0gPSBwcmV2aW91c0ZhY2VTcHJpdGVzO1xyXG5cclxuICAgICAgICBsZXQgYmFja1Nwcml0ZXM6IFNwcml0ZVtdID0gW107XHJcbiAgICAgICAgYmFja1Nwcml0ZXNGb3JQbGF5ZXJbaV0gPSBiYWNrU3ByaXRlcztcclxuICAgICAgICBjb25zdCBvdGhlclBsYXllciA9IGdhbWVTdGF0ZS5vdGhlclBsYXllcnNbaV07XHJcbiAgICAgICAgaWYgKGkgIT09IGdhbWVTdGF0ZS5wbGF5ZXJJbmRleCAmJiBvdGhlclBsYXllciAhPT0gbnVsbCAmJiBvdGhlclBsYXllciAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIC8vIG9ubHkgb3RoZXIgcGxheWVycyBoYXZlIGFueSBoaWRkZW4gY2FyZHNcclxuICAgICAgICAgICAgd2hpbGUgKGJhY2tTcHJpdGVzLmxlbmd0aCA8IG90aGVyUGxheWVyLmNhcmRDb3VudCAtIG90aGVyUGxheWVyLnJldmVhbGVkQ2FyZHMubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgYmFja1Nwcml0ZTogU3ByaXRlIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICAgICAgaWYgKGJhY2tTcHJpdGUgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgNDsgKytqKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHByZXZpb3VzT3RoZXJQbGF5ZXIgPSBwcmV2aW91c0dhbWVTdGF0ZT8ub3RoZXJQbGF5ZXJzW2pdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBvdGhlclBsYXllciA9IGdhbWVTdGF0ZS5vdGhlclBsYXllcnNbal07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwcmV2aW91c090aGVyUGxheWVyID09PSB1bmRlZmluZWQgfHwgcHJldmlvdXNPdGhlclBsYXllciA9PT0gbnVsbCB8fFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3RoZXJQbGF5ZXIgPT09IHVuZGVmaW5lZCB8fCBvdGhlclBsYXllciA9PT0gbnVsbFxyXG4gICAgICAgICAgICAgICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJldmlvdXNPdGhlclBsYXllci5zaGFyZUNvdW50ID4gb3RoZXJQbGF5ZXIuc2hhcmVDb3VudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJldmlvdXNPdGhlclBsYXllci5zaGFyZUNvdW50LS07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcmV2aW91c090aGVyUGxheWVyLnJldmVhbGVkQ2FyZHMuc3BsaWNlKDAsIDEpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJhY2tTcHJpdGUgPSBwcmV2aW91c0ZhY2VTcHJpdGVzRm9yUGxheWVyW2pdPy5zcGxpY2UoMCwgMSlbMF07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYmFja1Nwcml0ZSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJhY2tTcHJpdGUuaW1hZ2UgPSBDYXJkSW1hZ2VzLmdldChgQmFjayR7aX1gKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzb3VyY2VUcmFuc2Zvcm0gPSBWUC5nZXRUcmFuc2Zvcm1Gb3JQbGF5ZXIoVlAuZ2V0UmVsYXRpdmVQbGF5ZXJJbmRleChqLCBnYW1lU3RhdGUucGxheWVySW5kZXgpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRlc3RpbmF0aW9uVHJhbnNmb3JtID0gVlAuZ2V0VHJhbnNmb3JtRm9yUGxheWVyKFZQLmdldFJlbGF0aXZlUGxheWVySW5kZXgoaSwgZ2FtZVN0YXRlLnBsYXllckluZGV4KSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBwID0gc291cmNlVHJhbnNmb3JtLnRyYW5zZm9ybVBvaW50KGJhY2tTcHJpdGUucG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcCA9IGRlc3RpbmF0aW9uVHJhbnNmb3JtLnRyYW5zZm9ybVBvaW50KHApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYmFja1Nwcml0ZS5wb3NpdGlvbiA9IG5ldyBWZWN0b3IocC54LCBwLnkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGJhY2tTcHJpdGUgPT09IHVuZGVmaW5lZCAmJiBwcmV2aW91c0JhY2tTcHJpdGVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBiYWNrU3ByaXRlID0gcHJldmlvdXNCYWNrU3ByaXRlcy5zcGxpY2UoMCwgMSlbMF07XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGJhY2tTcHJpdGUgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGlmIChiYWNrU3ByaXRlID09PSB1bmRlZmluZWQgJiYgcHJldmlvdXNGYWNlU3ByaXRlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYmFja1Nwcml0ZSA9IHByZXZpb3VzRmFjZVNwcml0ZXMuc3BsaWNlKDAsIDEpWzBdO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChiYWNrU3ByaXRlID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJhY2tTcHJpdGUuaW1hZ2UgPSBDYXJkSW1hZ2VzLmdldChgQmFjayR7aX1gKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgaWYgKGJhY2tTcHJpdGUgPT09IHVuZGVmaW5lZCAmJiBwcmV2aW91c0RlY2tTcHJpdGVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBiYWNrU3ByaXRlID0gcHJldmlvdXNEZWNrU3ByaXRlcy5zcGxpY2UocHJldmlvdXNEZWNrU3ByaXRlcy5sZW5ndGggLSAxLCAxKVswXTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoYmFja1Nwcml0ZSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICAgICAgICAgICAgICAgICAgICBiYWNrU3ByaXRlLmltYWdlID0gQ2FyZEltYWdlcy5nZXQoYEJhY2ske2l9YCk7XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gdGhpcyBzcHJpdGUgY29tZXMgZnJvbSB0aGUgZGVjaywgd2hpY2ggaXMgcmVuZGVyZWQgaW4gdGhlIGNsaWVudCBwbGF5ZXIncyB0cmFuc2Zvcm1cclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0cmFuc2Zvcm0gPSBWUC5nZXRUcmFuc2Zvcm1Gb3JQbGF5ZXIoVlAuZ2V0UmVsYXRpdmVQbGF5ZXJJbmRleChpLCBnYW1lU3RhdGUucGxheWVySW5kZXgpKTtcclxuICAgICAgICAgICAgICAgICAgICB0cmFuc2Zvcm0uaW52ZXJ0U2VsZigpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBvaW50ID0gdHJhbnNmb3JtLnRyYW5zZm9ybVBvaW50KGJhY2tTcHJpdGUucG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgIGJhY2tTcHJpdGUucG9zaXRpb24gPSBuZXcgVmVjdG9yKHBvaW50LngsIHBvaW50LnkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBpZiAoYmFja1Nwcml0ZSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYmFja1Nwcml0ZSA9IG5ldyBTcHJpdGUoQ2FyZEltYWdlcy5nZXQoYEJhY2ske2l9YCkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGJhY2tTcHJpdGVzLnB1c2goYmFja1Nwcml0ZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZGVja1Nwcml0ZXMgPSBbXTtcclxuICAgIHdoaWxlIChkZWNrU3ByaXRlcy5sZW5ndGggPCBnYW1lU3RhdGUuZGVja0NvdW50KSB7XHJcbiAgICAgICAgbGV0IGRlY2tTcHJpdGU6IFNwcml0ZSB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcclxuICAgICAgICBpZiAoZGVja1Nwcml0ZSA9PSB1bmRlZmluZWQgJiYgcHJldmlvdXNEZWNrU3ByaXRlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIGRlY2tTcHJpdGUgPSBwcmV2aW91c0RlY2tTcHJpdGVzLnNwbGljZSgwLCAxKVswXTtcclxuICAgICAgICAgICAgaWYgKGRlY2tTcHJpdGUgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoZGVja1Nwcml0ZSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIGxldCBpID0gMDtcclxuICAgICAgICAgICAgZm9yIChjb25zdCBwcmV2aW91c0JhY2tTcHJpdGVzIG9mIHByZXZpb3VzQmFja1Nwcml0ZXNGb3JQbGF5ZXIpIHtcclxuICAgICAgICAgICAgICAgIGlmIChwcmV2aW91c0JhY2tTcHJpdGVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBkZWNrU3ByaXRlID0gcHJldmlvdXNCYWNrU3ByaXRlcy5zcGxpY2UoMCwgMSlbMF07XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRlY2tTcHJpdGUgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVja1Nwcml0ZS5pbWFnZSA9IENhcmRJbWFnZXMuZ2V0KCdCYWNrNCcpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLyB0aGUgc3ByaXRlIGNhbWUgZnJvbSB0aGUgcGxheWVyJ3MgdHJhbnNmb3JtZWQgY2FudmFzIGNvbnRleHRcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0cmFuc2Zvcm0gPSBWUC5nZXRUcmFuc2Zvcm1Gb3JQbGF5ZXIoVlAuZ2V0UmVsYXRpdmVQbGF5ZXJJbmRleChpLCBnYW1lU3RhdGUucGxheWVySW5kZXgpKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBwb2ludCA9IHRyYW5zZm9ybS50cmFuc2Zvcm1Qb2ludChkZWNrU3ByaXRlLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICBkZWNrU3ByaXRlLnBvc2l0aW9uID0gbmV3IFZlY3Rvcihwb2ludC54LCBwb2ludC55KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgKytpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoZGVja1Nwcml0ZSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIGxldCBpID0gMDtcclxuICAgICAgICAgICAgZm9yIChjb25zdCBwcmV2aW91c0ZhY2VTcHJpdGVzIG9mIHByZXZpb3VzRmFjZVNwcml0ZXNGb3JQbGF5ZXIpIHtcclxuICAgICAgICAgICAgICAgIGlmIChwcmV2aW91c0ZhY2VTcHJpdGVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBkZWNrU3ByaXRlID0gcHJldmlvdXNGYWNlU3ByaXRlcy5zcGxpY2UoMCwgMSlbMF07XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRlY2tTcHJpdGUgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVja1Nwcml0ZS5pbWFnZSA9IENhcmRJbWFnZXMuZ2V0KCdCYWNrNCcpO1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIHRoZSBzcHJpdGUgY2FtZSBmcm9tIHRoZSBwbGF5ZXIncyB0cmFuc2Zvcm1lZCBjYW52YXMgY29udGV4dFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRyYW5zZm9ybSA9IFZQLmdldFRyYW5zZm9ybUZvclBsYXllcihWUC5nZXRSZWxhdGl2ZVBsYXllckluZGV4KGksIGdhbWVTdGF0ZS5wbGF5ZXJJbmRleCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBvaW50ID0gdHJhbnNmb3JtLnRyYW5zZm9ybVBvaW50KGRlY2tTcHJpdGUucG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgIGRlY2tTcHJpdGUucG9zaXRpb24gPSBuZXcgVmVjdG9yKHBvaW50LngsIHBvaW50LnkpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICArK2k7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChkZWNrU3ByaXRlID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgZGVja1Nwcml0ZSA9IG5ldyBTcHJpdGUoQ2FyZEltYWdlcy5nZXQoJ0JhY2s0JykpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZGVja1Nwcml0ZXMucHVzaChkZWNrU3ByaXRlKTtcclxuICAgIH1cclxuXHJcbiAgICBzZXRTcHJpdGVUYXJnZXRzKGdhbWVTdGF0ZSk7XHJcblxyXG4gICAgb25BbmltYXRpb25zQXNzb2NpYXRlZCgpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc2V0U3ByaXRlVGFyZ2V0cyhcclxuICAgIGdhbWVTdGF0ZTogTGliLkdhbWVTdGF0ZSxcclxuICAgIHJlc2VydmVkU3ByaXRlc0FuZENhcmRzPzogW1Nwcml0ZSwgTGliLkNhcmRdW10sXHJcbiAgICBtb3ZpbmdTcHJpdGVzQW5kQ2FyZHM/OiBbU3ByaXRlLCBMaWIuQ2FyZF1bXSxcclxuICAgIHNoYXJlQ291bnQ/OiBudW1iZXIsXHJcbiAgICByZXZlYWxDb3VudD86IG51bWJlcixcclxuICAgIHNwbGl0SW5kZXg/OiBudW1iZXIsXHJcbiAgICByZXR1cm5Ub0RlY2s/OiBib29sZWFuXHJcbikge1xyXG4gICAgY29uc3Qgc3ByaXRlcyA9IGZhY2VTcHJpdGVzRm9yUGxheWVyW2dhbWVTdGF0ZS5wbGF5ZXJJbmRleF07XHJcbiAgICBpZiAoc3ByaXRlcyA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuXHJcbiAgICBjb25zdCBjYXJkcyA9IGdhbWVTdGF0ZS5wbGF5ZXJDYXJkcztcclxuXHJcbiAgICByZXNlcnZlZFNwcml0ZXNBbmRDYXJkcyA9IHJlc2VydmVkU3ByaXRlc0FuZENhcmRzID8/IGNhcmRzLm1hcCgoY2FyZCwgaW5kZXgpID0+IDxbU3ByaXRlLCBMaWIuQ2FyZF0+W3Nwcml0ZXNbaW5kZXhdLCBjYXJkXSk7XHJcbiAgICBtb3ZpbmdTcHJpdGVzQW5kQ2FyZHMgPSBtb3ZpbmdTcHJpdGVzQW5kQ2FyZHMgPz8gW107XHJcbiAgICBzaGFyZUNvdW50ID0gc2hhcmVDb3VudCA/PyBnYW1lU3RhdGUucGxheWVyU2hhcmVDb3VudDtcclxuICAgIHJldmVhbENvdW50ID0gcmV2ZWFsQ291bnQgPz8gZ2FtZVN0YXRlLnBsYXllclJldmVhbENvdW50O1xyXG4gICAgc3BsaXRJbmRleCA9IHNwbGl0SW5kZXggPz8gY2FyZHMubGVuZ3RoO1xyXG4gICAgcmV0dXJuVG9EZWNrID0gcmV0dXJuVG9EZWNrID8/IGZhbHNlO1xyXG5cclxuICAgIC8vIGNsZWFyIGZvciByZWluc2VydGlvblxyXG4gICAgc3ByaXRlcy5zcGxpY2UoMCwgc3ByaXRlcy5sZW5ndGgpO1xyXG4gICAgY2FyZHMuc3BsaWNlKDAsIGNhcmRzLmxlbmd0aCk7XHJcblxyXG4gICAgZm9yIChjb25zdCBbcmVzZXJ2ZWRTcHJpdGUsIHJlc2VydmVkQ2FyZF0gb2YgcmVzZXJ2ZWRTcHJpdGVzQW5kQ2FyZHMpIHtcclxuICAgICAgICBpZiAoY2FyZHMubGVuZ3RoID09PSBzcGxpdEluZGV4KSB7XHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgW21vdmluZ1Nwcml0ZSwgbW92aW5nQ2FyZF0gb2YgbW92aW5nU3ByaXRlc0FuZENhcmRzKSB7XHJcbiAgICAgICAgICAgICAgICBzcHJpdGVzLnB1c2gobW92aW5nU3ByaXRlKTtcclxuICAgICAgICAgICAgICAgIGNhcmRzLnB1c2gobW92aW5nQ2FyZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChjYXJkcy5sZW5ndGggPCBzaGFyZUNvdW50KSB7XHJcbiAgICAgICAgICAgIHJlc2VydmVkU3ByaXRlLnRhcmdldCA9IG5ldyBWZWN0b3IoXHJcbiAgICAgICAgICAgICAgICBWUC5jYW52YXMud2lkdGggLyAyIC0gVlAuc3ByaXRlV2lkdGggLSBzaGFyZUNvdW50ICogVlAuc3ByaXRlR2FwICsgY2FyZHMubGVuZ3RoICogVlAuc3ByaXRlR2FwLFxyXG4gICAgICAgICAgICAgICAgVlAuY2FudmFzLmhlaWdodCAtIDIgKiBWUC5zcHJpdGVIZWlnaHQgLSBWUC5zcHJpdGVHYXBcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICB9IGVsc2UgaWYgKGNhcmRzLmxlbmd0aCA8IHJldmVhbENvdW50KSB7XHJcbiAgICAgICAgICAgIHJlc2VydmVkU3ByaXRlLnRhcmdldCA9IG5ldyBWZWN0b3IoXHJcbiAgICAgICAgICAgICAgICBWUC5jYW52YXMud2lkdGggLyAyICsgKGNhcmRzLmxlbmd0aCAtIHNoYXJlQ291bnQpICogVlAuc3ByaXRlR2FwLFxyXG4gICAgICAgICAgICAgICAgVlAuY2FudmFzLmhlaWdodCAtIDIgKiBWUC5zcHJpdGVIZWlnaHRcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBsZXQgY291bnQgPSByZXNlcnZlZFNwcml0ZXNBbmRDYXJkcy5sZW5ndGggLSByZXZlYWxDb3VudDtcclxuICAgICAgICAgICAgaWYgKCFyZXR1cm5Ub0RlY2spIHtcclxuICAgICAgICAgICAgICAgIGNvdW50ICs9IG1vdmluZ1Nwcml0ZXNBbmRDYXJkcy5sZW5ndGg7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJlc2VydmVkU3ByaXRlLnRhcmdldCA9IG5ldyBWZWN0b3IoXHJcbiAgICAgICAgICAgICAgICBWUC5jYW52YXMud2lkdGggLyAyIC0gVlAuc3ByaXRlV2lkdGggLyAyICsgKGNhcmRzLmxlbmd0aCAtIHJldmVhbENvdW50IC0gKGNvdW50IC0gMSkgLyAyKSAqIFZQLnNwcml0ZUdhcCxcclxuICAgICAgICAgICAgICAgIFZQLmNhbnZhcy5oZWlnaHQgLSBWUC5zcHJpdGVIZWlnaHRcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgc3ByaXRlcy5wdXNoKHJlc2VydmVkU3ByaXRlKTtcclxuICAgICAgICBjYXJkcy5wdXNoKHJlc2VydmVkQ2FyZCk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGNhcmRzLmxlbmd0aCA9PT0gc3BsaXRJbmRleCkge1xyXG4gICAgICAgIGZvciAoY29uc3QgW21vdmluZ1Nwcml0ZSwgbW92aW5nQ2FyZF0gb2YgbW92aW5nU3ByaXRlc0FuZENhcmRzKSB7XHJcbiAgICAgICAgICAgIHNwcml0ZXMucHVzaChtb3ZpbmdTcHJpdGUpO1xyXG4gICAgICAgICAgICBjYXJkcy5wdXNoKG1vdmluZ0NhcmQpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBnYW1lU3RhdGUucGxheWVyU2hhcmVDb3VudCA9IHNoYXJlQ291bnQ7XHJcbiAgICBnYW1lU3RhdGUucGxheWVyUmV2ZWFsQ291bnQgPSByZXZlYWxDb3VudDtcclxufVxyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGpvaW5HYW1lKGdhbWVJZDogc3RyaW5nLCBwbGF5ZXJOYW1lOiBzdHJpbmcpIHtcclxuICAgIC8vIHdhaXQgZm9yIGNvbm5lY3Rpb25cclxuICAgIGRvIHtcclxuICAgICAgICBhd2FpdCBMaWIuZGVsYXkoMTAwMCk7XHJcbiAgICAgICAgY29uc29sZS5sb2coYHdzLnJlYWR5U3RhdGU6ICR7d3MucmVhZHlTdGF0ZX0sIFdlYlNvY2tldC5PUEVOOiAke1dlYlNvY2tldC5PUEVOfWApO1xyXG4gICAgfSB3aGlsZSAod3MucmVhZHlTdGF0ZSAhPSBXZWJTb2NrZXQuT1BFTik7XHJcblxyXG4gICAgLy8gdHJ5IHRvIGpvaW4gdGhlIGdhbWVcclxuICAgIGF3YWl0IG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICBhZGRDYWxsYmFjaygnam9pbkdhbWUnLCByZXNvbHZlLCByZWplY3QpO1xyXG4gICAgICAgIHdzLnNlbmQoSlNPTi5zdHJpbmdpZnkoPExpYi5Kb2luR2FtZU1lc3NhZ2U+eyBnYW1lSWQsIHBsYXllck5hbWUgfSkpO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB0YWtlQ2FyZChvdGhlclBsYXllckluZGV4OiBudW1iZXIsIGNhcmRJbmRleDogbnVtYmVyLCBjYXJkOiBMaWIuQ2FyZCkge1xyXG4gICAgY29uc3QgYW5pbWF0aW9uc0Fzc29jaWF0ZWQgPSBuZXcgUHJvbWlzZTx2b2lkPihyZXNvbHZlID0+IHtcclxuICAgICAgICBvbkFuaW1hdGlvbnNBc3NvY2lhdGVkID0gKCkgPT4ge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgYXNzb2NpYXRlZCBhbmltYXRpb25zYCk7XHJcbiAgICAgICAgICAgIG9uQW5pbWF0aW9uc0Fzc29jaWF0ZWQgPSAoKSA9PiB7fTtcclxuICAgICAgICAgICAgcmVzb2x2ZSgpO1xyXG4gICAgICAgIH07XHJcbiAgICB9KTtcclxuXHJcbiAgICBhd2FpdCBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgYWRkQ2FsbGJhY2soJ3Rha2VDYXJkJywgcmVzb2x2ZSwgcmVqZWN0KTtcclxuICAgICAgICB3cy5zZW5kKEpTT04uc3RyaW5naWZ5KDxMaWIuVGFrZUNhcmRNZXNzYWdlPntcclxuICAgICAgICAgICAgb3RoZXJQbGF5ZXJJbmRleCxcclxuICAgICAgICAgICAgY2FyZEluZGV4LFxyXG4gICAgICAgICAgICBjYXJkXHJcbiAgICAgICAgfSkpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgYXdhaXQgYW5pbWF0aW9uc0Fzc29jaWF0ZWQ7XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkcmF3Q2FyZCgpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGNvbnN0IGFuaW1hdGlvbnNBc3NvY2lhdGVkID0gbmV3IFByb21pc2U8dm9pZD4ocmVzb2x2ZSA9PiB7XHJcbiAgICAgICAgb25BbmltYXRpb25zQXNzb2NpYXRlZCA9ICgpID0+IHtcclxuICAgICAgICAgICAgb25BbmltYXRpb25zQXNzb2NpYXRlZCA9ICgpID0+IHt9O1xyXG4gICAgICAgICAgICByZXNvbHZlKCk7XHJcbiAgICAgICAgfTtcclxuICAgIH0pO1xyXG5cclxuICAgIGF3YWl0IG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICBhZGRDYWxsYmFjaygnZHJhd0NhcmQnLCByZXNvbHZlLCByZWplY3QpO1xyXG4gICAgICAgIHdzLnNlbmQoSlNPTi5zdHJpbmdpZnkoPExpYi5EcmF3Q2FyZE1lc3NhZ2U+e1xyXG4gICAgICAgICAgICBkcmF3Q2FyZDogbnVsbFxyXG4gICAgICAgIH0pKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGF3YWl0IGFuaW1hdGlvbnNBc3NvY2lhdGVkO1xyXG59XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmV0dXJuQ2FyZHNUb0RlY2soZ2FtZVN0YXRlOiBMaWIuR2FtZVN0YXRlKSB7XHJcbiAgICBhd2FpdCBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgYWRkQ2FsbGJhY2soJ3JldHVybkNhcmRzVG9EZWNrJywgcmVzb2x2ZSwgcmVqZWN0KTtcclxuICAgICAgICB3cy5zZW5kKEpTT04uc3RyaW5naWZ5KDxMaWIuUmV0dXJuQ2FyZHNUb0RlY2tNZXNzYWdlPntcclxuICAgICAgICAgICAgY2FyZHNUb1JldHVyblRvRGVjazogc2VsZWN0ZWRJbmRpY2VzLm1hcChpID0+IGdhbWVTdGF0ZS5wbGF5ZXJDYXJkc1tpXSlcclxuICAgICAgICB9KSk7XHJcbiAgICB9KTtcclxuICAgIFxyXG4gICAgLy8gbWFrZSB0aGUgc2VsZWN0ZWQgY2FyZHMgZGlzYXBwZWFyXHJcbiAgICBzZWxlY3RlZEluZGljZXMuc3BsaWNlKDAsIHNlbGVjdGVkSW5kaWNlcy5sZW5ndGgpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmVvcmRlckNhcmRzKGdhbWVTdGF0ZTogTGliLkdhbWVTdGF0ZSkge1xyXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICBhZGRDYWxsYmFjaygncmVvcmRlckNhcmRzJywgcmVzb2x2ZSwgcmVqZWN0KTtcclxuICAgICAgICB3cy5zZW5kKEpTT04uc3RyaW5naWZ5KDxMaWIuUmVvcmRlckNhcmRzTWVzc2FnZT57XHJcbiAgICAgICAgICAgIHJlb3JkZXJlZENhcmRzOiBnYW1lU3RhdGUucGxheWVyQ2FyZHMsXHJcbiAgICAgICAgICAgIG5ld1NoYXJlQ291bnQ6IGdhbWVTdGF0ZS5wbGF5ZXJTaGFyZUNvdW50LFxyXG4gICAgICAgICAgICBuZXdSZXZlYWxDb3VudDogZ2FtZVN0YXRlLnBsYXllclJldmVhbENvdW50XHJcbiAgICAgICAgfSkpO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzb3J0QnlTdWl0KGdhbWVTdGF0ZTogTGliLkdhbWVTdGF0ZSkge1xyXG4gICAgbGV0IGNvbXBhcmVGbiA9IChbYVN1aXQsIGFSYW5rXTogTGliLkNhcmQsIFtiU3VpdCwgYlJhbmtdOiBMaWIuQ2FyZCkgPT4ge1xyXG4gICAgICAgIGlmIChhU3VpdCAhPT0gYlN1aXQpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGFTdWl0IC0gYlN1aXQ7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcmV0dXJuIGFSYW5rIC0gYlJhbms7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBwcmV2aW91c0dhbWVTdGF0ZSA9IDxMaWIuR2FtZVN0YXRlPkpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoZ2FtZVN0YXRlKSk7XHJcbiAgICBzb3J0Q2FyZHMoZ2FtZVN0YXRlLnBsYXllckNhcmRzLCAwLCBnYW1lU3RhdGUucGxheWVyU2hhcmVDb3VudCwgY29tcGFyZUZuKTtcclxuICAgIHNvcnRDYXJkcyhnYW1lU3RhdGUucGxheWVyQ2FyZHMsIGdhbWVTdGF0ZS5wbGF5ZXJTaGFyZUNvdW50LCBnYW1lU3RhdGUucGxheWVyUmV2ZWFsQ291bnQsIGNvbXBhcmVGbik7XHJcbiAgICBzb3J0Q2FyZHMoZ2FtZVN0YXRlLnBsYXllckNhcmRzLCBnYW1lU3RhdGUucGxheWVyUmV2ZWFsQ291bnQsIGdhbWVTdGF0ZS5wbGF5ZXJDYXJkcy5sZW5ndGgsIGNvbXBhcmVGbik7XHJcbiAgICBhc3NvY2lhdGVBbmltYXRpb25zV2l0aENhcmRzKGdhbWVTdGF0ZSwgcHJldmlvdXNHYW1lU3RhdGUpO1xyXG4gICAgcmV0dXJuIHJlb3JkZXJDYXJkcyhnYW1lU3RhdGUpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc29ydEJ5UmFuayhnYW1lU3RhdGU6IExpYi5HYW1lU3RhdGUpIHtcclxuICAgIGxldCBjb21wYXJlRm4gPSAoW2FTdWl0LCBhUmFua106IExpYi5DYXJkLCBbYlN1aXQsIGJSYW5rXTogTGliLkNhcmQpID0+IHtcclxuICAgICAgICBpZiAoYVJhbmsgIT09IGJSYW5rKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBhUmFuayAtIGJSYW5rO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHJldHVybiBhU3VpdCAtIGJTdWl0O1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgcHJldmlvdXNHYW1lU3RhdGUgPSA8TGliLkdhbWVTdGF0ZT5KU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGdhbWVTdGF0ZSkpO1xyXG4gICAgc29ydENhcmRzKGdhbWVTdGF0ZS5wbGF5ZXJDYXJkcywgMCwgZ2FtZVN0YXRlLnBsYXllclNoYXJlQ291bnQsIGNvbXBhcmVGbik7XHJcbiAgICBzb3J0Q2FyZHMoZ2FtZVN0YXRlLnBsYXllckNhcmRzLCBnYW1lU3RhdGUucGxheWVyU2hhcmVDb3VudCwgZ2FtZVN0YXRlLnBsYXllclJldmVhbENvdW50LCBjb21wYXJlRm4pO1xyXG4gICAgc29ydENhcmRzKGdhbWVTdGF0ZS5wbGF5ZXJDYXJkcywgZ2FtZVN0YXRlLnBsYXllclJldmVhbENvdW50LCBnYW1lU3RhdGUucGxheWVyQ2FyZHMubGVuZ3RoLCBjb21wYXJlRm4pO1xyXG4gICAgYXNzb2NpYXRlQW5pbWF0aW9uc1dpdGhDYXJkcyhnYW1lU3RhdGUsIHByZXZpb3VzR2FtZVN0YXRlKTtcclxuICAgIHJldHVybiByZW9yZGVyQ2FyZHMoZ2FtZVN0YXRlKTtcclxufVxyXG5cclxuZnVuY3Rpb24gc29ydENhcmRzKFxyXG4gICAgY2FyZHM6IExpYi5DYXJkW10sXHJcbiAgICBzdGFydDogbnVtYmVyLFxyXG4gICAgZW5kOiBudW1iZXIsXHJcbiAgICBjb21wYXJlRm46IChhOiBMaWIuQ2FyZCwgYjogTGliLkNhcmQpID0+IG51bWJlclxyXG4pIHtcclxuICAgIGNvbnN0IHNlY3Rpb24gPSBjYXJkcy5zbGljZShzdGFydCwgZW5kKTtcclxuICAgIHNlY3Rpb24uc29ydChjb21wYXJlRm4pO1xyXG4gICAgY2FyZHMuc3BsaWNlKHN0YXJ0LCBlbmQgLSBzdGFydCwgLi4uc2VjdGlvbik7XHJcbn1cclxuLypcclxuZXhwb3J0IGZ1bmN0aW9uIHdhaXQoKSB7XHJcbiAgICByZXR1cm4gbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgIGFkZENhbGxiYWNrKCd3YWl0JywgcmVzb2x2ZSwgcmVqZWN0KTtcclxuICAgICAgICB3cy5zZW5kKEpTT04uc3RyaW5naWZ5KDxMaWIuV2FpdE1lc3NhZ2U+e1xyXG4gICAgICAgICAgICB3YWl0OiBudWxsXHJcbiAgICAgICAgfSkpO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBwcm9jZWVkKCkge1xyXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICBhZGRDYWxsYmFjaygncHJvY2VlZCcsIHJlc29sdmUsIHJlamVjdCk7XHJcbiAgICAgICAgd3Muc2VuZChKU09OLnN0cmluZ2lmeSg8TGliLlByb2NlZWRNZXNzYWdlPntcclxuICAgICAgICAgICAgcHJvY2VlZDogbnVsbFxyXG4gICAgICAgIH0pKTtcclxuICAgIH0pO1xyXG59XHJcbiovIiwiZXhwb3J0IGRlZmF1bHQgY2xhc3MgVmVjdG9yIHtcclxuICAgIHJlYWRvbmx5IHg6IG51bWJlciA9IDA7XHJcbiAgICByZWFkb25seSB5OiBudW1iZXIgPSAwO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKHg6IG51bWJlciwgeTogbnVtYmVyKSB7XHJcbiAgICAgICAgdGhpcy54ID0geDtcclxuICAgICAgICB0aGlzLnkgPSB5O1xyXG4gICAgfVxyXG5cclxuICAgIC8qXHJcbiAgICBhc3NpZ24odjogVmVjdG9yKSB7XHJcbiAgICAgICAgdGhpcy54ID0gdi54O1xyXG4gICAgICAgIHRoaXMueSA9IHYueTtcclxuICAgIH1cclxuICAgICovXHJcblxyXG4gICAgYWRkKHY6IFZlY3Rvcikge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjdG9yKHRoaXMueCArIHYueCwgdGhpcy55ICsgdi55KTtcclxuICAgIH1cclxuXHJcbiAgICAvKlxyXG4gICAgYWRkU2VsZih2OiBWZWN0b3IpIHtcclxuICAgICAgICB0aGlzLnggKz0gdi54O1xyXG4gICAgICAgIHRoaXMueSArPSB2Lnk7XHJcbiAgICB9XHJcbiAgICAqL1xyXG4gICAgXHJcbiAgICBzdWIodjogVmVjdG9yKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWN0b3IodGhpcy54IC0gdi54LCB0aGlzLnkgLSB2LnkpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qXHJcbiAgICBzdWJTZWxmKHY6IFZlY3Rvcikge1xyXG4gICAgICAgIHRoaXMueCAtPSB2Lng7XHJcbiAgICAgICAgdGhpcy55IC09IHYueTtcclxuICAgIH1cclxuICAgICovXHJcbiAgICBcclxuICAgIGdldCBsZW5ndGgoKSB7XHJcbiAgICAgICAgcmV0dXJuIE1hdGguc3FydCh0aGlzLnggKiB0aGlzLnggKyB0aGlzLnkgKiB0aGlzLnkpO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBkaXN0YW5jZSh2OiBWZWN0b3IpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLnN1Yih2KS5sZW5ndGg7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHNjYWxlKHM6IG51bWJlcik6IFZlY3RvciB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWN0b3IocyAqIHRoaXMueCwgcyAqIHRoaXMueSk7XHJcbiAgICB9XHJcblxyXG4gICAgLypcclxuICAgIHNjYWxlU2VsZihzOiBudW1iZXIpIHtcclxuICAgICAgICB0aGlzLnggKj0gcztcclxuICAgICAgICB0aGlzLnkgKj0gcztcclxuICAgIH1cclxuICAgICovXHJcbn0iLCJpbXBvcnQgVmVjdG9yIGZyb20gJy4vdmVjdG9yJztcclxuXHJcbmV4cG9ydCBjb25zdCBjYW52YXMgPSA8SFRNTENhbnZhc0VsZW1lbnQ+ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NhbnZhcycpO1xyXG5leHBvcnQgY29uc3QgY29udGV4dCA9IDxDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQ+Y2FudmFzLmdldENvbnRleHQoJzJkJyk7XHJcblxyXG4vLyBnZXQgcGl4ZWxzIHBlciBjZW50aW1ldGVyLCB3aGljaCBpcyBjb25zdGFudFxyXG5jb25zdCB0ZXN0RWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xyXG50ZXN0RWxlbWVudC5zdHlsZS53aWR0aCA9ICcxY20nO1xyXG5kb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHRlc3RFbGVtZW50KTtcclxuZXhwb3J0IGNvbnN0IHBpeGVsc1BlckNNID0gdGVzdEVsZW1lbnQub2Zmc2V0V2lkdGg7XHJcbmRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQodGVzdEVsZW1lbnQpO1xyXG5cclxuLy8gdGhlc2UgcGFyYW1ldGVycyBjaGFuZ2Ugd2l0aCByZXNpemluZ1xyXG5leHBvcnQgbGV0IGNhbnZhc1JlY3QgPSBjYW52YXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcbmV4cG9ydCBsZXQgcGl4ZWxzUGVyUGVyY2VudCA9IDA7XHJcblxyXG5leHBvcnQgbGV0IHNwcml0ZVdpZHRoOiBudW1iZXI7XHJcbmV4cG9ydCBsZXQgc3ByaXRlSGVpZ2h0OiBudW1iZXI7XHJcbmV4cG9ydCBsZXQgc3ByaXRlR2FwOiBudW1iZXI7XHJcbmV4cG9ydCBsZXQgc3ByaXRlRGVja0dhcDogbnVtYmVyO1xyXG5cclxuZXhwb3J0IGxldCBzb3J0QnlSYW5rRm9udDogc3RyaW5nO1xyXG5leHBvcnQgbGV0IHNvcnRCeVJhbmtCb3VuZHM6IFtWZWN0b3IsIFZlY3Rvcl07XHJcblxyXG5leHBvcnQgbGV0IHNvcnRCeVN1aXRGb250OiBzdHJpbmc7XHJcbmV4cG9ydCBsZXQgc29ydEJ5U3VpdEJvdW5kczogW1ZlY3RvciwgVmVjdG9yXTtcclxuXHJcbmV4cG9ydCBsZXQgd2FpdEZvbnQ6IHN0cmluZztcclxuZXhwb3J0IGxldCB3YWl0Qm91bmRzOiBbVmVjdG9yLCBWZWN0b3JdO1xyXG5cclxuZXhwb3J0IGxldCBwcm9jZWVkRm9udDogc3RyaW5nO1xyXG5leHBvcnQgbGV0IHByb2NlZWRCb3VuZHM6IFtWZWN0b3IsIFZlY3Rvcl07XHJcblxyXG5leHBvcnQgbGV0IHJlYWR5Rm9udDogc3RyaW5nO1xyXG5leHBvcnQgbGV0IHJlYWR5Qm91bmRzOiBbVmVjdG9yLCBWZWN0b3JdO1xyXG5cclxuZXhwb3J0IGxldCBjb3VudGRvd25Gb250OiBzdHJpbmc7XHJcbmV4cG9ydCBsZXQgY291bnRkb3duQm91bmRzOiBbVmVjdG9yLCBWZWN0b3JdO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHJlY2FsY3VsYXRlUGFyYW1ldGVycygpIHtcclxuICAgIGNhbnZhcy53aWR0aCA9IHdpbmRvdy5pbm5lcldpZHRoO1xyXG4gICAgY2FudmFzLmhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodCAtIDAuNSAqIHBpeGVsc1BlckNNO1xyXG4gICAgY2FudmFzUmVjdCA9IGNhbnZhcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuXHJcbiAgICBwaXhlbHNQZXJQZXJjZW50ID0gY2FudmFzLmhlaWdodCAvIDEwMDtcclxuICAgIHNwcml0ZVdpZHRoID0gMTIgKiBwaXhlbHNQZXJQZXJjZW50O1xyXG4gICAgc3ByaXRlSGVpZ2h0ID0gMTggKiBwaXhlbHNQZXJQZXJjZW50O1xyXG4gICAgc3ByaXRlR2FwID0gMiAqIHBpeGVsc1BlclBlcmNlbnQ7XHJcbiAgICBzcHJpdGVEZWNrR2FwID0gMC41ICogcGl4ZWxzUGVyUGVyY2VudDtcclxuXHJcbiAgICBzb3J0QnlSYW5rQm91bmRzID0gW25ldyBWZWN0b3IoMCwgMCksIG5ldyBWZWN0b3IoMCwgMCldO1xyXG5cclxuICAgIHNvcnRCeVN1aXRCb3VuZHMgPSBbbmV3IFZlY3RvcigwLCAwKSwgbmV3IFZlY3RvcigwLCAwKV07XHJcblxyXG4gICAgY29uc3QgYXBwcm92ZVBvc2l0aW9uID0gbmV3IFZlY3RvcihjYW52YXMud2lkdGggLSAyICogc3ByaXRlSGVpZ2h0LCBjYW52YXMuaGVpZ2h0IC0gMTEgKiBzcHJpdGVIZWlnaHQgLyAxMik7XHJcbiAgICB3YWl0Rm9udCA9IGAke3Nwcml0ZUhlaWdodCAvIDN9cHggU3VnYXJsaWtlYDtcclxuICAgIHdhaXRCb3VuZHMgPSBbYXBwcm92ZVBvc2l0aW9uLCBnZXRCb3R0b21SaWdodCgnV2FpdCEnLCB3YWl0Rm9udCwgYXBwcm92ZVBvc2l0aW9uKV07XHJcblxyXG4gICAgY29uc3QgZGlzYXBwcm92ZVBvc2l0aW9uID0gbmV3IFZlY3RvcihjYW52YXMud2lkdGggLSAyICogc3ByaXRlSGVpZ2h0LCBjYW52YXMuaGVpZ2h0IC0gNSAqIHNwcml0ZUhlaWdodCAvIDEyKTtcclxuICAgIHByb2NlZWRGb250ID0gYCR7c3ByaXRlSGVpZ2h0IC8gM31weCBTdWdhcmxpa2VgO1xyXG4gICAgcHJvY2VlZEJvdW5kcyA9IFtkaXNhcHByb3ZlUG9zaXRpb24sIGdldEJvdHRvbVJpZ2h0KCdQcm9jZWVkLicsIHByb2NlZWRGb250LCBkaXNhcHByb3ZlUG9zaXRpb24pXTtcclxuXHJcbiAgICBjb25zdCByZWFkeVBvc2l0aW9uID0gbmV3IFZlY3RvcihjYW52YXMud2lkdGggLSAyICogc3ByaXRlSGVpZ2h0LCBjYW52YXMuaGVpZ2h0IC0gMyAqIHNwcml0ZUhlaWdodCAvIDQpO1xyXG4gICAgcmVhZHlGb250ID0gYCR7c3ByaXRlSGVpZ2h0IC8gMn1weCBTdWdhcmxpa2VgO1xyXG4gICAgcmVhZHlCb3VuZHMgPSBbcmVhZHlQb3NpdGlvbiwgZ2V0Qm90dG9tUmlnaHQoJ1JlYWR5IScsIHJlYWR5Rm9udCwgcmVhZHlQb3NpdGlvbildO1xyXG5cclxuICAgIGNvbnN0IGNvdW50ZG93blBvc2l0aW9uID0gbmV3IFZlY3RvcihjYW52YXMud2lkdGggLSAzLjUgKiBzcHJpdGVIZWlnaHQsIGNhbnZhcy5oZWlnaHQgLSAyICogc3ByaXRlSGVpZ2h0IC8gMyk7XHJcbiAgICBjb3VudGRvd25Gb250ID0gYCR7c3ByaXRlSGVpZ2h0IC8gMn1weCBTdWdhcmxpa2VgO1xyXG4gICAgY291bnRkb3duQm91bmRzID0gW2NvdW50ZG93blBvc2l0aW9uLCBnZXRCb3R0b21SaWdodCgnV2FpdGluZyAxMCBzZWNvbmRzLi4uJywgY291bnRkb3duRm9udCwgY291bnRkb3duUG9zaXRpb24pXTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0Qm90dG9tUmlnaHQodGV4dDogc3RyaW5nLCBmb250OiBzdHJpbmcsIHBvc2l0aW9uOiBWZWN0b3IpOiBWZWN0b3Ige1xyXG4gICAgY29udGV4dC5mb250ID0gZm9udDtcclxuICAgIGNvbnRleHQudGV4dEJhc2VsaW5lID0gJ3RvcCc7XHJcbiAgICBjb25zdCB0ZXh0TWV0cmljcyA9IGNvbnRleHQubWVhc3VyZVRleHQodGV4dCk7XHJcbiAgICByZXR1cm4gcG9zaXRpb24uYWRkKG5ldyBWZWN0b3IodGV4dE1ldHJpY3Mud2lkdGgsIHRleHRNZXRyaWNzLmFjdHVhbEJvdW5kaW5nQm94RGVzY2VudCkpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0VHJhbnNmb3JtRm9yUGxheWVyKHJlbGF0aXZlSW5kZXg6IG51bWJlcik6IERPTU1hdHJpeCB7XHJcbiAgICBjb250ZXh0LnNhdmUoKTtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgaWYgKHJlbGF0aXZlSW5kZXggPT09IDApIHtcclxuICAgICAgICAgICAgcmV0dXJuIGNvbnRleHQuZ2V0VHJhbnNmb3JtKCk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChyZWxhdGl2ZUluZGV4ID09PSAxKSB7XHJcbiAgICAgICAgICAgIGNvbnRleHQudHJhbnNsYXRlKDAsIChjYW52YXMud2lkdGggKyBjYW52YXMuaGVpZ2h0KSAvIDIpO1xyXG4gICAgICAgICAgICBjb250ZXh0LnJvdGF0ZSgtTWF0aC5QSSAvIDIpO1xyXG4gICAgICAgICAgICByZXR1cm4gY29udGV4dC5nZXRUcmFuc2Zvcm0oKTtcclxuICAgICAgICB9IGVsc2UgaWYgKHJlbGF0aXZlSW5kZXggPT09IDIpIHtcclxuICAgICAgICAgICAgLy8gbm8gdHJhbnNmb3JtXHJcbiAgICAgICAgICAgIHJldHVybiBjb250ZXh0LmdldFRyYW5zZm9ybSgpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAocmVsYXRpdmVJbmRleCA9PT0gMykge1xyXG4gICAgICAgICAgICBjb250ZXh0LnRyYW5zbGF0ZShjYW52YXMud2lkdGgsIChjYW52YXMuaGVpZ2h0IC0gY2FudmFzLndpZHRoKSAvIDIpO1xyXG4gICAgICAgICAgICBjb250ZXh0LnJvdGF0ZShNYXRoLlBJIC8gMik7XHJcbiAgICAgICAgICAgIHJldHVybiBjb250ZXh0LmdldFRyYW5zZm9ybSgpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgaW5kZXggbXVzdCBiZSAwLCAxLCAyLCBvciAzOyBnb3Q6ICR7cmVsYXRpdmVJbmRleH1gKTtcclxuICAgICAgICB9XHJcbiAgICB9IGZpbmFsbHkge1xyXG4gICAgICAgIGNvbnRleHQucmVzdG9yZSgpO1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0UmVsYXRpdmVQbGF5ZXJJbmRleChvdGhlclBsYXllckluZGV4OiBudW1iZXIsIHBsYXllckluZGV4OiBudW1iZXIpIHtcclxuICAgIGxldCByZWxhdGl2ZUluZGV4ID0gb3RoZXJQbGF5ZXJJbmRleCAtIHBsYXllckluZGV4O1xyXG4gICAgaWYgKHJlbGF0aXZlSW5kZXggPj0gMCkge1xyXG4gICAgICAgIHJldHVybiByZWxhdGl2ZUluZGV4O1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBvdGhlclBsYXllckluZGV4IC0gKHBsYXllckluZGV4IC0gNCk7XHJcbn0iLCJpbXBvcnQgYmluYXJ5U2VhcmNoIGZyb20gJ2JpbmFyeS1zZWFyY2gnO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGJpbmFyeVNlYXJjaE51bWJlcihoYXlzdGFjazogbnVtYmVyW10sIG5lZWRsZTogbnVtYmVyLCBsb3c/OiBudW1iZXIsIGhpZ2g/OiBudW1iZXIpIHtcclxuICAgIHJldHVybiBiaW5hcnlTZWFyY2goaGF5c3RhY2ssIG5lZWRsZSwgKGEsIGIpID0+IGEgLSBiLCBsb3csIGhpZ2gpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q29va2llKG5hbWU6IHN0cmluZyk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XHJcbiAgICBjb25zdCBwYXJ0cyA9IGA7ICR7ZG9jdW1lbnQuY29va2llfWAuc3BsaXQoYDsgJHtuYW1lfT1gKTtcclxuICAgIGlmIChwYXJ0cy5sZW5ndGggPT09IDIpIHtcclxuICAgICAgICByZXR1cm4gcGFydHMucG9wKCk/LnNwbGl0KCc7Jykuc2hpZnQoKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldFBhcmFtKG5hbWU6IHN0cmluZyk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XHJcbiAgICByZXR1cm4gd2luZG93LmxvY2F0aW9uLnNlYXJjaC5zcGxpdChgJHtuYW1lfT1gKVsxXT8uc3BsaXQoXCImXCIpWzBdO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZGVsYXkobXM6IG51bWJlcikge1xyXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCBtcykpO1xyXG59XHJcblxyXG5leHBvcnQgZW51bSBTdWl0IHtcclxuICAgIENsdWIsIC8vIDBcclxuICAgIERpYW1vbmQsXHJcbiAgICBIZWFydCxcclxuICAgIFNwYWRlLFxyXG4gICAgSm9rZXIsIC8vIDRcclxufVxyXG5cclxuZXhwb3J0IGVudW0gUmFuayB7XHJcbiAgICBTbWFsbCwgLy8gMFxyXG4gICAgQWNlLFxyXG4gICAgVHdvLFxyXG4gICAgVGhyZWUsXHJcbiAgICBGb3VyLFxyXG4gICAgRml2ZSxcclxuICAgIFNpeCxcclxuICAgIFNldmVuLFxyXG4gICAgRWlnaHQsXHJcbiAgICBOaW5lLFxyXG4gICAgVGVuLFxyXG4gICAgSmFjayxcclxuICAgIFF1ZWVuLFxyXG4gICAgS2luZyxcclxuICAgIEJpZywgLy8gMTRcclxufVxyXG5cclxuZXhwb3J0IHR5cGUgQ2FyZCA9IFtTdWl0LCBSYW5rXTtcclxuXHJcbmV4cG9ydCB0eXBlIFBsYXllclN0YXRlID0gXCJXYWl0XCIgfCBcIlByb2NlZWRcIiB8IFwiUmVhZHlcIiB8IEFjdGl2ZTtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQWN0aXZlIHtcclxuICAgIHR5cGU6IFwiQWN0aXZlXCI7XHJcbiAgICBhY3RpdmVUaW1lOiBudW1iZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBjb25zdCBhY3RpdmVDb29sZG93biA9IDEwMDAwOyAvL21pbGxpc2Vjb25kc1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBPdGhlclBsYXllciB7XHJcbiAgICBuYW1lOiBzdHJpbmc7XHJcbiAgICBzaGFyZUNvdW50OiBudW1iZXI7XHJcbiAgICByZXZlYWxlZENhcmRzOiBDYXJkW107XHJcbiAgICBjYXJkQ291bnQ6IG51bWJlcjtcclxuICAgIC8vc3RhdGU6IFBsYXllclN0YXRlO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEdhbWVTdGF0ZSB7XHJcbiAgICBkZWNrQ291bnQ6IG51bWJlcjtcclxuICAgIHBsYXllckluZGV4OiBudW1iZXI7XHJcbiAgICBwbGF5ZXJDYXJkczogQ2FyZFtdO1xyXG4gICAgcGxheWVyU2hhcmVDb3VudDogbnVtYmVyO1xyXG4gICAgcGxheWVyUmV2ZWFsQ291bnQ6IG51bWJlcjtcclxuICAgIC8vcGxheWVyU3RhdGU6IFBsYXllclN0YXRlO1xyXG4gICAgb3RoZXJQbGF5ZXJzOiAoT3RoZXJQbGF5ZXIgfCBudWxsKVtdO1xyXG59XHJcblxyXG5leHBvcnQgdHlwZSBNZXRob2ROYW1lID1cclxuICAgIFwiam9pbkdhbWVcIiB8XHJcbiAgICBcInRha2VDYXJkXCIgfFxyXG4gICAgXCJkcmF3Q2FyZFwiIHxcclxuICAgIFwicmV0dXJuQ2FyZHNUb0RlY2tcIiB8XHJcbiAgICBcInJlb3JkZXJDYXJkc1wiIHxcclxuICAgIFwid2FpdFwiIHxcclxuICAgIFwicHJvY2VlZFwiO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBNZXRob2RSZXN1bHQge1xyXG4gICAgbWV0aG9kTmFtZTogTWV0aG9kTmFtZTtcclxuICAgIGVycm9yRGVzY3JpcHRpb24/OiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSm9pbkdhbWVNZXNzYWdlIHtcclxuICAgIGdhbWVJZDogc3RyaW5nO1xyXG4gICAgcGxheWVyTmFtZTogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFRha2VDYXJkTWVzc2FnZSB7XHJcbiAgICBvdGhlclBsYXllckluZGV4OiBudW1iZXI7XHJcbiAgICBjYXJkSW5kZXg6IG51bWJlcjtcclxuICAgIGNhcmQ6IENhcmQ7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRHJhd0NhcmRNZXNzYWdlIHtcclxuICAgIGRyYXdDYXJkOiBudWxsO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFJldHVybkNhcmRzVG9EZWNrTWVzc2FnZSB7XHJcbiAgICBjYXJkc1RvUmV0dXJuVG9EZWNrOiBDYXJkW107XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgUmVvcmRlckNhcmRzTWVzc2FnZSB7XHJcbiAgICByZW9yZGVyZWRDYXJkczogQ2FyZFtdO1xyXG4gICAgbmV3U2hhcmVDb3VudDogbnVtYmVyO1xyXG4gICAgbmV3UmV2ZWFsQ291bnQ6IG51bWJlcjtcclxufVxyXG4vKlxyXG5leHBvcnQgaW50ZXJmYWNlIFdhaXRNZXNzYWdlIHtcclxuICAgIHdhaXQ6IG51bGw7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgUHJvY2VlZE1lc3NhZ2Uge1xyXG4gICAgcHJvY2VlZDogbnVsbDtcclxufVxyXG4qLyJdfQ==
