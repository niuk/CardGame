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
};
},{"./card-images":5,"./render":9,"./state":11,"./view-params":13}],7:[function(require,module,exports){
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
exports.action = "none";
const moveThreshold = 0.5 * VP.pixelsPerCM;
let mouseDownPosition = { x: 0, y: 0 };
let mouseMovePosition = { x: 0, y: 0 };
let exceededMoveThreshold = false;
function setDropAction(gameState, cardIndex) {
    const dropPosition = (State.faceSpritesForPlayer[gameState.playerIndex] ?? [])[State.selectedIndices[0] ?? 0]?.position;
    if (dropPosition === undefined)
        throw new Error(`${JSON.stringify(State.faceSpritesForPlayer)}`);
    /*
    console.log(`dropPosition.x: ${dropPosition.x}, ${
        deckPositions[gameState.deckCount - 1].x - cardWidth / 2}, ${
        deckPositions[0].x + cardWidth / 2
    }`);
    console.log(`dropPosition.y: ${dropPosition.y}, ${
        deckPositions[gameState.deckCount - 1].y - cardHeight / 2}, ${
        deckPositions[0].y + cardHeight / 2
    }`);
    */
    const hideDistance = Math.abs(dropPosition.y - (VP.canvas.height - VP.spriteHeight));
    const revealDistance = Math.abs(dropPosition.y - (VP.canvas.height - 2 * VP.spriteHeight));
    if (hideDistance < revealDistance) {
        exports.action = { type: "hide", cardIndex };
    }
    else {
        exports.action = { type: "reveal", cardIndex };
    }
}
function getMousePosition(e) {
    return new vector_1.default(VP.canvas.width * (e.clientX - VP.canvasRect.left) / VP.canvasRect.width, VP.canvas.height * (e.clientY - VP.canvasRect.top) / VP.canvasRect.height);
}
VP.canvas.onmousedown = async (event) => {
    const unlock = await State.lock();
    try {
        mouseDownPosition = getMousePosition(event);
        mouseMovePosition = mouseDownPosition;
        exceededMoveThreshold = false;
        if (State.gameState === undefined)
            throw new Error();
        const deckPosition = State.deckSprites[State.deckSprites.length - 1]?.position;
        const faceSprites = State.faceSpritesForPlayer[State.gameState.playerIndex] ?? [];
        if (VP.sortByRankBounds[0].x < mouseDownPosition.x && mouseDownPosition.x < VP.sortByRankBounds[1].x &&
            VP.sortByRankBounds[0].y < mouseDownPosition.y && mouseDownPosition.y < VP.sortByRankBounds[1].y) {
            exports.action = "sortByRank";
        }
        else if (VP.sortBySuitBounds[0].x < mouseDownPosition.x && mouseDownPosition.x < VP.sortBySuitBounds[1].x &&
            VP.sortBySuitBounds[0].y < mouseDownPosition.y && mouseDownPosition.y < VP.sortBySuitBounds[1].y) {
            exports.action = "sortBySuit";
        }
        else if (deckPosition !== undefined &&
            deckPosition.x < mouseDownPosition.x && mouseDownPosition.x < deckPosition.x + VP.spriteWidth &&
            deckPosition.y < mouseDownPosition.y && mouseDownPosition.y < deckPosition.y + VP.spriteHeight) {
            exports.action = "drawFromDeck";
        }
        else {
            // because we render left to right, the rightmost card under the mouse position is what we should return
            for (let i = faceSprites.length - 1; i >= 0; --i) {
                const position = faceSprites[i]?.position;
                if (position !== undefined &&
                    position.x < mouseDownPosition.x && mouseDownPosition.x < position.x + VP.spriteWidth &&
                    position.y < mouseDownPosition.y && mouseDownPosition.y < position.y + VP.spriteHeight) {
                    exports.action = { type: "toggle", cardIndex: i };
                    break;
                }
            }
        }
    }
    finally {
        unlock();
    }
};
VP.canvas.onmousemove = async (event) => {
    let unlock = await State.lock();
    try {
        mouseMovePosition = getMousePosition(event);
        exceededMoveThreshold = exceededMoveThreshold || mouseMovePosition.distance(mouseDownPosition) > moveThreshold;
        let movement = new vector_1.default(event.movementX, event.movementY);
        if (State.gameState === undefined)
            return;
        const faceSprites = State.faceSpritesForPlayer[State.gameState.playerIndex] ?? [];
        if (exports.action === "none") {
            // do nothing
        }
        else if (exports.action === "drawFromDeck" || exports.action === "waitingForNewCard") {
            const deckSprite = State.deckSprites[State.deckSprites.length - 1];
            if (deckSprite === undefined)
                throw new Error();
            deckSprite.target = deckSprite.target.add(movement);
            if (exports.action === "drawFromDeck" && exceededMoveThreshold) {
                exports.action = "waitingForNewCard";
                // card drawing will try to lock the state, so we must attach a callback instead of awaiting
                State.drawCard().then(async (result) => {
                    if (result.errorDescription !== undefined) {
                        console.error(result.errorDescription);
                        if (exports.action === "waitingForNewCard") {
                            exports.action = "none";
                        }
                    }
                    else {
                        const release = await State.lock();
                        try {
                            if (exports.action === "waitingForNewCard") {
                                if (State.gameState === undefined)
                                    throw new Error();
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
                                // transition to hide/reveal/returnToDeck
                                setDropAction(State.gameState, cardIndex);
                            }
                        }
                        finally {
                            release();
                        }
                    }
                });
            }
        }
        else if (exports.action === "sortBySuit") {
            // TODO: check whether mouse position has left button bounds
        }
        else if (exports.action === "sortByRank") {
            // TODO: check whether mouse position has left button bounds
        }
        else if (exports.action.type === "toggle") {
            if (exceededMoveThreshold) {
                // dragging a card selects it
                let selectedIndexIndex = Lib.binarySearchNumber(State.selectedIndices, exports.action.cardIndex);
                if (selectedIndexIndex < 0) {
                    selectedIndexIndex = ~selectedIndexIndex;
                    State.selectedIndices.splice(selectedIndexIndex, 0, exports.action.cardIndex);
                }
                // gather together selected cards around the card under the mouse
                const faceSpriteAtMouseDown = faceSprites[exports.action.cardIndex];
                if (faceSpriteAtMouseDown === undefined)
                    throw new Error();
                let i = 0;
                for (const selectedIndex of State.selectedIndices) {
                    const faceSprite = faceSprites[selectedIndex];
                    if (faceSprite === undefined)
                        throw new Error();
                    // account for movement threshold
                    faceSprite.target = new vector_1.default(event.movementX + faceSpriteAtMouseDown.position.x + (i++ - selectedIndexIndex) * VP.spriteGap, event.movementY + faceSpriteAtMouseDown.position.y).add(mouseMovePosition.sub(mouseDownPosition));
                }
                setDropAction(State.gameState, exports.action.cardIndex);
            }
        }
        else if (exports.action.type === "hide" || exports.action.type === "reveal" || exports.action.type === "returnToDeck") {
            // move all selected cards
            for (const i of State.selectedIndices) {
                const faceSprite = faceSprites[i];
                if (faceSprite === undefined)
                    throw new Error();
                faceSprite.target = faceSprite.target.add(new vector_1.default(event.movementX, event.movementY));
            }
            setDropAction(State.gameState, exports.action.cardIndex);
        }
    }
    finally {
        unlock();
    }
};
VP.canvas.onmouseup = async () => {
    const unlock = await State.lock();
    try {
        if (State.gameState === undefined)
            throw new Error();
        if (exports.action === "none" || exports.action === "drawFromDeck" || exports.action === "waitingForNewCard") {
            // do nothing
        }
        else if (exports.action === "sortByRank") {
            const result = await State.sortByRank(State.gameState);
            if ('errorDescription' in result) {
                console.error(result.errorDescription);
            }
        }
        else if (exports.action === "sortBySuit") {
            const result = await State.sortBySuit(State.gameState);
            if ('errorDescription' in result) {
                console.error(result.errorDescription);
            }
        }
        else if (exports.action.type === "hide" || exports.action.type === "reveal") {
            const result = await State.reorderCards(State.gameState);
            if ('errorDescription' in result) {
                console.error(result.errorDescription);
            }
        }
        else if (exports.action.type === "toggle") {
            let selectedIndexIndex = Lib.binarySearchNumber(State.selectedIndices, exports.action.cardIndex);
            if (selectedIndexIndex < 0) {
                State.selectedIndices.splice(~selectedIndexIndex, 0, exports.action.cardIndex);
            }
            else {
                State.selectedIndices.splice(selectedIndexIndex, 1);
            }
        }
        else if (exports.action.type === "returnToDeck") {
            const result = await State.returnCardsToDeck(State.gameState);
            if ('errorDescription' in result) {
                console.error(result.errorDescription);
            }
            else {
                // make the selected cards disappear
                State.selectedIndices.splice(0, State.selectedIndices.length);
            }
        }
        exports.action = "none";
    }
    finally {
        unlock();
    }
};
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
let deltaTime;
async function render(time) {
    deltaTime = time - (currentTime !== undefined ? currentTime : time);
    currentTime = time;
    if (State.gameState !== undefined) {
        const unlock = await State.lock();
        try {
            // clear the screen
            VP.context.clearRect(0, 0, VP.canvas.width, VP.canvas.height);
            renderBasics(State.gameId, State.playerName);
            renderDeck(time, State.gameState.deckCount);
            renderOtherPlayers(State.gameState);
            renderPlayer(State.gameState);
            renderButtons();
        }
        finally {
            unlock();
        }
        window.requestAnimationFrame(render);
    }
    else {
        // wait until we have a game state
        await Lib.delay(100);
        window.requestAnimationFrame(render);
    }
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
function renderDeck(time, deckCount) {
    VP.context.save();
    try {
        if (deckDealTime === undefined) {
            deckDealTime = time;
        }
        for (let i = 0; i < State.deckSprites.length; ++i) {
            const deckSprite = State.deckSprites[i];
            if (deckSprite === undefined)
                throw new Error();
            if (i === deckCount - 1 && (Input.action === "drawFromDeck" ||
                Input.action === "waitingForNewCard")) {
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
function renderOtherPlayers(gameState) {
    VP.context.save();
    try {
        VP.context.translate(0, (VP.canvas.width + VP.canvas.height) / 2);
        VP.context.rotate(-Math.PI / 2);
        renderOtherPlayer(gameState, (gameState.playerIndex + 1) % 4);
    }
    finally {
        VP.context.restore();
    }
    VP.context.save();
    try {
        renderOtherPlayer(gameState, (gameState.playerIndex + 2) % 4);
    }
    finally {
        VP.context.restore();
    }
    VP.context.save();
    try {
        VP.context.translate(VP.canvas.width, (VP.canvas.height - VP.canvas.width) / 2);
        VP.context.rotate(Math.PI);
        renderOtherPlayer(gameState, (gameState.playerIndex + 3) % 4);
    }
    finally {
        VP.context.restore();
    }
}
function renderOtherPlayer(gameState, playerIndex) {
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
function renderPlayer(gameState) {
    const cards = gameState.playerCards;
    const sprites = State.faceSpritesForPlayer[gameState.playerIndex];
    if (sprites === undefined)
        return;
    const oldCards = JSON.stringify(cards);
    const oldCardsLength = cards.length;
    const oldSprites = JSON.stringify(sprites);
    const oldSpritesLength = sprites.length;
    const movingSpritesAndCards = [];
    const reservedSpritesAndCards = [];
    let splitIndex;
    if (Input.action !== "none" &&
        Input.action !== "drawFromDeck" &&
        Input.action !== "waitingForNewCard" &&
        Input.action !== "sortBySuit" &&
        Input.action !== "sortByRank" && (Input.action.type === "returnToDeck" ||
        Input.action.type === "hide" ||
        Input.action.type === "reveal")) {
        let revealCountAdjustment = 0;
        // extract moving sprites
        for (const i of State.selectedIndices) {
            const sprite = sprites[i];
            const card = cards[i];
            if (sprite === undefined || card === undefined)
                throw new Error();
            movingSpritesAndCards.push([sprite, card]);
            if (i < gameState.playerRevealCount) {
                ++revealCountAdjustment;
            }
        }
        gameState.playerRevealCount -= revealCountAdjustment;
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
        // determine whether the moving sprites are closer to the revealed sprites or to the hidden sprites
        const splitRevealed = Input.action.type === "reveal";
        const start = splitRevealed ? 0 : gameState.playerRevealCount;
        const end = splitRevealed ? gameState.playerRevealCount : reservedSpritesAndCards.length;
        // find the held sprites, if any, overlapped by the dragged sprites
        const leftMovingSprite = movingSpritesAndCards[0]?.[0];
        const rightMovingSprite = movingSpritesAndCards[movingSpritesAndCards.length - 1]?.[0];
        if (leftMovingSprite === undefined || rightMovingSprite === undefined) {
            throw new Error();
        }
        let leftIndex = undefined;
        let rightIndex = undefined;
        for (let i = start; i < end; ++i) {
            const reservedSprite = reservedSpritesAndCards[i]?.[0];
            if (reservedSprite === undefined)
                throw new Error();
            // use targets instead of positions or else the sprites will "wobble"
            if (leftMovingSprite.position.x < reservedSprite.target.x &&
                reservedSprite.target.x < rightMovingSprite.position.x) {
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
            // again, use targets instead of positions to avoid "wobbling"
            const leftGap = leftReservedSprite.target.x - leftMovingSprite.position.x;
            const rightGap = rightMovingSprite.position.x - rightReservedSprite.target.x;
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
                if (rightMovingSprite.position.x < reservedSprite.target.x) {
                    break;
                }
            }
        }
        // adjust selected indices
        for (let i = 0; i < State.selectedIndices.length; ++i) {
            State.selectedIndices[i] = splitIndex + i;
        }
        // adjust the reveal count
        if (splitIndex < gameState.playerRevealCount || splitIndex === gameState.playerRevealCount && splitRevealed) {
            gameState.playerRevealCount += movingSpritesAndCards.length;
        }
    }
    else {
        // every sprite is reserved
        splitIndex = sprites.length;
        reservedSpritesAndCards.push(...sprites.map((sprite, index) => [sprite, cards[index]]));
    }
    // clear for reinsertion
    sprites.splice(0, sprites.length);
    cards.splice(0, cards.length);
    for (const [reservedSprite, reservedCard] of reservedSpritesAndCards) {
        if (sprites.length === splitIndex) {
            for (const [movingSprite, movingCard] of movingSpritesAndCards) {
                movingSprite.animate(deltaTime);
                sprites.push(movingSprite);
                cards.push(movingCard);
            }
        }
        const i = sprites.length < gameState.playerRevealCount ? sprites.length : sprites.length - gameState.playerRevealCount;
        const j = sprites.length < gameState.playerRevealCount ? gameState.playerRevealCount : reservedSpritesAndCards.length - gameState.playerRevealCount;
        const y = sprites.length < gameState.playerRevealCount ? 2 * VP.spriteHeight : VP.spriteHeight;
        reservedSprite.target = new vector_1.default(VP.canvas.width / 2 - VP.spriteWidth / 2 + (i - j / 2) * VP.spriteGap, VP.canvas.height - y - (Lib.binarySearchNumber(State.selectedIndices, sprites.length) < 0 ? 0 : 2 * VP.spriteGap));
        reservedSprite.animate(deltaTime);
        sprites.push(reservedSprite);
        cards.push(reservedCard);
    }
    if (sprites.length === splitIndex) {
        for (const [movingSprite, movingCard] of movingSpritesAndCards) {
            movingSprite.animate(deltaTime);
            sprites.push(movingSprite);
            cards.push(movingCard);
        }
    }
    if (cards.length !== oldCardsLength || sprites.length !== oldSpritesLength) {
        throw new Error(`oldCards: ${oldCards}${oldSprites}\nnewCards: ${JSON.stringify(cards)}\noldSprites: ${oldSprites}\nnewSprites: ${JSON.stringify(sprites)}`);
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
exports.sortByRank = exports.sortBySuit = exports.reorderCards = exports.returnCardsToDeck = exports.drawCard = exports.joinGame = exports.faceSpritesForPlayer = exports.backSpritesForPlayer = exports.deckSprites = exports.selectedIndices = exports.gameState = exports.previousGameState = exports.lock = exports.gameId = exports.playerName = void 0;
const await_semaphore_1 = require("await-semaphore");
const Lib = __importStar(require("../lib"));
const CardImages = __importStar(require("./card-images"));
const sprite_1 = __importDefault(require("./sprite"));
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
function addCallback(methodName, callback) {
    let callbacks = callbacksForMethodName.get(methodName);
    if (callbacks === undefined) {
        callbacks = [];
        callbacksForMethodName.set(methodName, callbacks);
    }
    callbacks.push(callback);
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
    onAnimationsAssociated();
}
async function joinGame(gameId, playerName) {
    // wait for connection
    do {
        await Lib.delay(1000);
        console.log(`ws.readyState: ${ws.readyState}, WebSocket.OPEN: ${WebSocket.OPEN}`);
    } while (ws.readyState != WebSocket.OPEN);
    // try to join the game
    const result = await new Promise(resolve => {
        addCallback('joinGame', resolve);
        ws.send(JSON.stringify({ gameId, playerName }));
    });
    if (result.errorDescription !== undefined) {
        window.alert(result.errorDescription);
        throw new Error(result.errorDescription);
    }
}
exports.joinGame = joinGame;
function drawCard() {
    return new Promise(resolve => {
        addCallback('drawCard', result => {
            if (result.errorDescription !== undefined) {
                resolve(result);
            }
            else {
                onAnimationsAssociated = () => {
                    onAnimationsAssociated = () => { };
                    resolve(result);
                };
            }
        });
        ws.send(JSON.stringify({
            drawCard: null
        }));
    });
}
exports.drawCard = drawCard;
function returnCardsToDeck(gameState) {
    return new Promise(resolve => {
        addCallback('cardsToReturnToDeck', resolve);
        ws.send(JSON.stringify({
            cardsToReturnToDeck: exports.selectedIndices.map(i => gameState.playerCards[i])
        }));
    });
}
exports.returnCardsToDeck = returnCardsToDeck;
function reorderCards(gameState) {
    return new Promise(resolve => {
        addCallback('reorderCards', resolve);
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
    sortCards(gameState.playerCards, 0, gameState.playerRevealCount, compareFn);
    sortCards(gameState.playerCards, gameState.playerRevealCount, gameState.playerCards.length, compareFn);
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
},{"../lib":14,"./card-images":5,"./sprite":10,"await-semaphore":1}],12:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYXdhaXQtc2VtYXBob3JlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2JpbmFyeS1zZWFyY2gvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL3RpbWVycy1icm93c2VyaWZ5L21haW4uanMiLCJzcmMvY2xpZW50L2NhcmQtaW1hZ2VzLnRzIiwic3JjL2NsaWVudC9nYW1lLnRzIiwic3JjL2NsaWVudC9pbnB1dC50cyIsInNyYy9jbGllbnQvbG9iYnkudHMiLCJzcmMvY2xpZW50L3JlbmRlci50cyIsInNyYy9jbGllbnQvc3ByaXRlLnRzIiwic3JjL2NsaWVudC9zdGF0ZS50cyIsInNyYy9jbGllbnQvdmVjdG9yLnRzIiwic3JjL2NsaWVudC92aWV3LXBhcmFtcy50cyIsInNyYy9saWIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUN4TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FDM0VBLDRDQUE4QjtBQUU5QixNQUFNLEtBQUssR0FBRyxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQztBQUM5RCxNQUFNLEtBQUssR0FBRyxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFFakcsTUFBTSxVQUFVLEdBQUcsSUFBSSxHQUFHLEVBQTRCLENBQUM7QUFFaEQsS0FBSyxVQUFVLElBQUk7SUFDdEIsa0NBQWtDO0lBQ2xDLEtB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QyxVQUFVLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDM0QsQ0FBQztBQUZELHNCQUVDO0FBRUQsSUFBWSxJQU1YO0FBTkQsV0FBWSxJQUFJO0lBQ1osK0JBQUksQ0FBQTtJQUNKLHFDQUFPLENBQUE7SUFDUCxpQ0FBSyxDQUFBO0lBQ0wsaUNBQUssQ0FBQTtJQUNMLGlDQUFLLENBQUE7QUFDVCxDQUFDLEVBTlcsSUFBSSxHQUFKLFlBQUksS0FBSixZQUFJLFFBTWY7QUFFRCxJQUFZLElBZ0JYO0FBaEJELFdBQVksSUFBSTtJQUNaLGlDQUFLLENBQUE7SUFDTCw2QkFBRyxDQUFBO0lBQ0gsNkJBQUcsQ0FBQTtJQUNILGlDQUFLLENBQUE7SUFDTCwrQkFBSSxDQUFBO0lBQ0osK0JBQUksQ0FBQTtJQUNKLDZCQUFHLENBQUE7SUFDSCxpQ0FBSyxDQUFBO0lBQ0wsaUNBQUssQ0FBQTtJQUNMLCtCQUFJLENBQUE7SUFDSiw4QkFBRyxDQUFBO0lBQ0gsZ0NBQUksQ0FBQTtJQUNKLGtDQUFLLENBQUE7SUFDTCxnQ0FBSSxDQUFBO0lBQ0osOEJBQUcsQ0FBQTtBQUNQLENBQUMsRUFoQlcsSUFBSSxHQUFKLFlBQUksS0FBSixZQUFJLFFBZ0JmIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiXCJ1c2Ugc3RyaWN0XCI7XG5jbGFzcyBTZW1hcGhvcmUge1xuICAgIGNvbnN0cnVjdG9yKGNvdW50KSB7XG4gICAgICAgIHRoaXMudGFza3MgPSBbXTtcbiAgICAgICAgdGhpcy5jb3VudCA9IGNvdW50O1xuICAgIH1cbiAgICBzY2hlZCgpIHtcbiAgICAgICAgaWYgKHRoaXMuY291bnQgPiAwICYmIHRoaXMudGFza3MubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgdGhpcy5jb3VudC0tO1xuICAgICAgICAgICAgbGV0IG5leHQgPSB0aGlzLnRhc2tzLnNoaWZ0KCk7XG4gICAgICAgICAgICBpZiAobmV4dCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgXCJVbmV4cGVjdGVkIHVuZGVmaW5lZCB2YWx1ZSBpbiB0YXNrcyBsaXN0XCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgYWNxdWlyZSgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXMsIHJlaikgPT4ge1xuICAgICAgICAgICAgdmFyIHRhc2sgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgdmFyIHJlbGVhc2VkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgcmVzKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFyZWxlYXNlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVsZWFzZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb3VudCsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zY2hlZCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdGhpcy50YXNrcy5wdXNoKHRhc2spO1xuICAgICAgICAgICAgaWYgKHByb2Nlc3MgJiYgcHJvY2Vzcy5uZXh0VGljaykge1xuICAgICAgICAgICAgICAgIHByb2Nlc3MubmV4dFRpY2sodGhpcy5zY2hlZC5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHNldEltbWVkaWF0ZSh0aGlzLnNjaGVkLmJpbmQodGhpcykpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgdXNlKGYpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYWNxdWlyZSgpXG4gICAgICAgICAgICAudGhlbihyZWxlYXNlID0+IHtcbiAgICAgICAgICAgIHJldHVybiBmKClcbiAgICAgICAgICAgICAgICAudGhlbigocmVzKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVsZWFzZSgpO1xuICAgICAgICAgICAgICAgIHJldHVybiByZXM7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVsZWFzZSgpO1xuICAgICAgICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG59XG5leHBvcnRzLlNlbWFwaG9yZSA9IFNlbWFwaG9yZTtcbmNsYXNzIE11dGV4IGV4dGVuZHMgU2VtYXBob3JlIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoMSk7XG4gICAgfVxufVxuZXhwb3J0cy5NdXRleCA9IE11dGV4O1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9aW5kZXguanMubWFwIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihoYXlzdGFjaywgbmVlZGxlLCBjb21wYXJhdG9yLCBsb3csIGhpZ2gpIHtcbiAgdmFyIG1pZCwgY21wO1xuXG4gIGlmKGxvdyA9PT0gdW5kZWZpbmVkKVxuICAgIGxvdyA9IDA7XG5cbiAgZWxzZSB7XG4gICAgbG93ID0gbG93fDA7XG4gICAgaWYobG93IDwgMCB8fCBsb3cgPj0gaGF5c3RhY2subGVuZ3RoKVxuICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoXCJpbnZhbGlkIGxvd2VyIGJvdW5kXCIpO1xuICB9XG5cbiAgaWYoaGlnaCA9PT0gdW5kZWZpbmVkKVxuICAgIGhpZ2ggPSBoYXlzdGFjay5sZW5ndGggLSAxO1xuXG4gIGVsc2Uge1xuICAgIGhpZ2ggPSBoaWdofDA7XG4gICAgaWYoaGlnaCA8IGxvdyB8fCBoaWdoID49IGhheXN0YWNrLmxlbmd0aClcbiAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKFwiaW52YWxpZCB1cHBlciBib3VuZFwiKTtcbiAgfVxuXG4gIHdoaWxlKGxvdyA8PSBoaWdoKSB7XG4gICAgLy8gVGhlIG5haXZlIGBsb3cgKyBoaWdoID4+PiAxYCBjb3VsZCBmYWlsIGZvciBhcnJheSBsZW5ndGhzID4gMioqMzFcbiAgICAvLyBiZWNhdXNlIGA+Pj5gIGNvbnZlcnRzIGl0cyBvcGVyYW5kcyB0byBpbnQzMi4gYGxvdyArIChoaWdoIC0gbG93ID4+PiAxKWBcbiAgICAvLyB3b3JrcyBmb3IgYXJyYXkgbGVuZ3RocyA8PSAyKiozMi0xIHdoaWNoIGlzIGFsc28gSmF2YXNjcmlwdCdzIG1heCBhcnJheVxuICAgIC8vIGxlbmd0aC5cbiAgICBtaWQgPSBsb3cgKyAoKGhpZ2ggLSBsb3cpID4+PiAxKTtcbiAgICBjbXAgPSArY29tcGFyYXRvcihoYXlzdGFja1ttaWRdLCBuZWVkbGUsIG1pZCwgaGF5c3RhY2spO1xuXG4gICAgLy8gVG9vIGxvdy5cbiAgICBpZihjbXAgPCAwLjApXG4gICAgICBsb3cgID0gbWlkICsgMTtcblxuICAgIC8vIFRvbyBoaWdoLlxuICAgIGVsc2UgaWYoY21wID4gMC4wKVxuICAgICAgaGlnaCA9IG1pZCAtIDE7XG5cbiAgICAvLyBLZXkgZm91bmQuXG4gICAgZWxzZVxuICAgICAgcmV0dXJuIG1pZDtcbiAgfVxuXG4gIC8vIEtleSBub3QgZm91bmQuXG4gIHJldHVybiB+bG93O1xufVxuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbi8vIGNhY2hlZCBmcm9tIHdoYXRldmVyIGdsb2JhbCBpcyBwcmVzZW50IHNvIHRoYXQgdGVzdCBydW5uZXJzIHRoYXQgc3R1YiBpdFxuLy8gZG9uJ3QgYnJlYWsgdGhpbmdzLiAgQnV0IHdlIG5lZWQgdG8gd3JhcCBpdCBpbiBhIHRyeSBjYXRjaCBpbiBjYXNlIGl0IGlzXG4vLyB3cmFwcGVkIGluIHN0cmljdCBtb2RlIGNvZGUgd2hpY2ggZG9lc24ndCBkZWZpbmUgYW55IGdsb2JhbHMuICBJdCdzIGluc2lkZSBhXG4vLyBmdW5jdGlvbiBiZWNhdXNlIHRyeS9jYXRjaGVzIGRlb3B0aW1pemUgaW4gY2VydGFpbiBlbmdpbmVzLlxuXG52YXIgY2FjaGVkU2V0VGltZW91dDtcbnZhciBjYWNoZWRDbGVhclRpbWVvdXQ7XG5cbmZ1bmN0aW9uIGRlZmF1bHRTZXRUaW1vdXQoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdzZXRUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG5mdW5jdGlvbiBkZWZhdWx0Q2xlYXJUaW1lb3V0ICgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2NsZWFyVGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuKGZ1bmN0aW9uICgpIHtcbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIHNldFRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIGNsZWFyVGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICB9XG59ICgpKVxuZnVuY3Rpb24gcnVuVGltZW91dChmdW4pIHtcbiAgICBpZiAoY2FjaGVkU2V0VGltZW91dCA9PT0gc2V0VGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgLy8gaWYgc2V0VGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZFNldFRpbWVvdXQgPT09IGRlZmF1bHRTZXRUaW1vdXQgfHwgIWNhY2hlZFNldFRpbWVvdXQpICYmIHNldFRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9IGNhdGNoKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0IHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKG51bGwsIGZ1biwgMCk7XG4gICAgICAgIH0gY2F0Y2goZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvclxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbCh0aGlzLCBmdW4sIDApO1xuICAgICAgICB9XG4gICAgfVxuXG5cbn1cbmZ1bmN0aW9uIHJ1bkNsZWFyVGltZW91dChtYXJrZXIpIHtcbiAgICBpZiAoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgLy8gaWYgY2xlYXJUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBkZWZhdWx0Q2xlYXJUaW1lb3V0IHx8ICFjYWNoZWRDbGVhclRpbWVvdXQpICYmIGNsZWFyVGltZW91dCkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfSBjYXRjaCAoZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgIHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwobnVsbCwgbWFya2VyKTtcbiAgICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvci5cbiAgICAgICAgICAgIC8vIFNvbWUgdmVyc2lvbnMgb2YgSS5FLiBoYXZlIGRpZmZlcmVudCBydWxlcyBmb3IgY2xlYXJUaW1lb3V0IHZzIHNldFRpbWVvdXRcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbCh0aGlzLCBtYXJrZXIpO1xuICAgICAgICB9XG4gICAgfVxuXG5cblxufVxudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcbnZhciBjdXJyZW50UXVldWU7XG52YXIgcXVldWVJbmRleCA9IC0xO1xuXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XG4gICAgaWYgKCFkcmFpbmluZyB8fCAhY3VycmVudFF1ZXVlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICB9XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBkcmFpblF1ZXVlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0ID0gcnVuVGltZW91dChjbGVhblVwTmV4dFRpY2spO1xuICAgIGRyYWluaW5nID0gdHJ1ZTtcblxuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICBpZiAoY3VycmVudFF1ZXVlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFF1ZXVlW3F1ZXVlSW5kZXhdLnJ1bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBjdXJyZW50UXVldWUgPSBudWxsO1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgcnVuQ2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xufVxuXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLnB1c2gobmV3IEl0ZW0oZnVuLCBhcmdzKSk7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcbiAgICAgICAgcnVuVGltZW91dChkcmFpblF1ZXVlKTtcbiAgICB9XG59O1xuXG4vLyB2OCBsaWtlcyBwcmVkaWN0aWJsZSBvYmplY3RzXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcbiAgICB0aGlzLmZ1biA9IGZ1bjtcbiAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG59XG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5mdW4uYXBwbHkobnVsbCwgdGhpcy5hcnJheSk7XG59O1xucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xucHJvY2Vzcy5wcmVwZW5kTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5wcmVwZW5kT25jZUxpc3RlbmVyID0gbm9vcDtcblxucHJvY2Vzcy5saXN0ZW5lcnMgPSBmdW5jdGlvbiAobmFtZSkgeyByZXR1cm4gW10gfVxuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiIsInZhciBuZXh0VGljayA9IHJlcXVpcmUoJ3Byb2Nlc3MvYnJvd3Nlci5qcycpLm5leHRUaWNrO1xudmFyIGFwcGx5ID0gRnVuY3Rpb24ucHJvdG90eXBlLmFwcGx5O1xudmFyIHNsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlO1xudmFyIGltbWVkaWF0ZUlkcyA9IHt9O1xudmFyIG5leHRJbW1lZGlhdGVJZCA9IDA7XG5cbi8vIERPTSBBUElzLCBmb3IgY29tcGxldGVuZXNzXG5cbmV4cG9ydHMuc2V0VGltZW91dCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gbmV3IFRpbWVvdXQoYXBwbHkuY2FsbChzZXRUaW1lb3V0LCB3aW5kb3csIGFyZ3VtZW50cyksIGNsZWFyVGltZW91dCk7XG59O1xuZXhwb3J0cy5zZXRJbnRlcnZhbCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gbmV3IFRpbWVvdXQoYXBwbHkuY2FsbChzZXRJbnRlcnZhbCwgd2luZG93LCBhcmd1bWVudHMpLCBjbGVhckludGVydmFsKTtcbn07XG5leHBvcnRzLmNsZWFyVGltZW91dCA9XG5leHBvcnRzLmNsZWFySW50ZXJ2YWwgPSBmdW5jdGlvbih0aW1lb3V0KSB7IHRpbWVvdXQuY2xvc2UoKTsgfTtcblxuZnVuY3Rpb24gVGltZW91dChpZCwgY2xlYXJGbikge1xuICB0aGlzLl9pZCA9IGlkO1xuICB0aGlzLl9jbGVhckZuID0gY2xlYXJGbjtcbn1cblRpbWVvdXQucHJvdG90eXBlLnVucmVmID0gVGltZW91dC5wcm90b3R5cGUucmVmID0gZnVuY3Rpb24oKSB7fTtcblRpbWVvdXQucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuX2NsZWFyRm4uY2FsbCh3aW5kb3csIHRoaXMuX2lkKTtcbn07XG5cbi8vIERvZXMgbm90IHN0YXJ0IHRoZSB0aW1lLCBqdXN0IHNldHMgdXAgdGhlIG1lbWJlcnMgbmVlZGVkLlxuZXhwb3J0cy5lbnJvbGwgPSBmdW5jdGlvbihpdGVtLCBtc2Vjcykge1xuICBjbGVhclRpbWVvdXQoaXRlbS5faWRsZVRpbWVvdXRJZCk7XG4gIGl0ZW0uX2lkbGVUaW1lb3V0ID0gbXNlY3M7XG59O1xuXG5leHBvcnRzLnVuZW5yb2xsID0gZnVuY3Rpb24oaXRlbSkge1xuICBjbGVhclRpbWVvdXQoaXRlbS5faWRsZVRpbWVvdXRJZCk7XG4gIGl0ZW0uX2lkbGVUaW1lb3V0ID0gLTE7XG59O1xuXG5leHBvcnRzLl91bnJlZkFjdGl2ZSA9IGV4cG9ydHMuYWN0aXZlID0gZnVuY3Rpb24oaXRlbSkge1xuICBjbGVhclRpbWVvdXQoaXRlbS5faWRsZVRpbWVvdXRJZCk7XG5cbiAgdmFyIG1zZWNzID0gaXRlbS5faWRsZVRpbWVvdXQ7XG4gIGlmIChtc2VjcyA+PSAwKSB7XG4gICAgaXRlbS5faWRsZVRpbWVvdXRJZCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gb25UaW1lb3V0KCkge1xuICAgICAgaWYgKGl0ZW0uX29uVGltZW91dClcbiAgICAgICAgaXRlbS5fb25UaW1lb3V0KCk7XG4gICAgfSwgbXNlY3MpO1xuICB9XG59O1xuXG4vLyBUaGF0J3Mgbm90IGhvdyBub2RlLmpzIGltcGxlbWVudHMgaXQgYnV0IHRoZSBleHBvc2VkIGFwaSBpcyB0aGUgc2FtZS5cbmV4cG9ydHMuc2V0SW1tZWRpYXRlID0gdHlwZW9mIHNldEltbWVkaWF0ZSA9PT0gXCJmdW5jdGlvblwiID8gc2V0SW1tZWRpYXRlIDogZnVuY3Rpb24oZm4pIHtcbiAgdmFyIGlkID0gbmV4dEltbWVkaWF0ZUlkKys7XG4gIHZhciBhcmdzID0gYXJndW1lbnRzLmxlbmd0aCA8IDIgPyBmYWxzZSA6IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcblxuICBpbW1lZGlhdGVJZHNbaWRdID0gdHJ1ZTtcblxuICBuZXh0VGljayhmdW5jdGlvbiBvbk5leHRUaWNrKCkge1xuICAgIGlmIChpbW1lZGlhdGVJZHNbaWRdKSB7XG4gICAgICAvLyBmbi5jYWxsKCkgaXMgZmFzdGVyIHNvIHdlIG9wdGltaXplIGZvciB0aGUgY29tbW9uIHVzZS1jYXNlXG4gICAgICAvLyBAc2VlIGh0dHA6Ly9qc3BlcmYuY29tL2NhbGwtYXBwbHktc2VndVxuICAgICAgaWYgKGFyZ3MpIHtcbiAgICAgICAgZm4uYXBwbHkobnVsbCwgYXJncyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmbi5jYWxsKG51bGwpO1xuICAgICAgfVxuICAgICAgLy8gUHJldmVudCBpZHMgZnJvbSBsZWFraW5nXG4gICAgICBleHBvcnRzLmNsZWFySW1tZWRpYXRlKGlkKTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiBpZDtcbn07XG5cbmV4cG9ydHMuY2xlYXJJbW1lZGlhdGUgPSB0eXBlb2YgY2xlYXJJbW1lZGlhdGUgPT09IFwiZnVuY3Rpb25cIiA/IGNsZWFySW1tZWRpYXRlIDogZnVuY3Rpb24oaWQpIHtcbiAgZGVsZXRlIGltbWVkaWF0ZUlkc1tpZF07XG59OyIsImltcG9ydCAqIGFzIExpYiBmcm9tICcuLi9saWInO1xyXG5cclxuY29uc3Qgc3VpdHMgPSBbJ0NsdWJzJywgJ0RtbmRzJywgJ0hlYXJ0cycsICdTcGFkZXMnLCAnSm9rZXInXTtcclxuY29uc3QgcmFua3MgPSBbJ1NtYWxsJywgJ0EnLCAnMicsICczJywgJzQnLCAnNScsICc2JywgJzcnLCAnOCcsICc5JywgJzEwJywgJ0onLCAnUScsICdLJywgJ0JpZyddO1xyXG5cclxuY29uc3QgY2FyZEltYWdlcyA9IG5ldyBNYXA8c3RyaW5nLCBIVE1MSW1hZ2VFbGVtZW50PigpO1xyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxvYWQoKSB7XHJcbiAgICAvLyBsb2FkIGNhcmQgaW1hZ2VzIGFzeW5jaHJvbm91c2x5XHJcbiAgICBmb3IgKGxldCBzdWl0ID0gMDsgc3VpdCA8PSA0OyArK3N1aXQpIHtcclxuICAgICAgICBmb3IgKGxldCByYW5rID0gMDsgcmFuayA8PSAxNDsgKytyYW5rKSB7XHJcbiAgICAgICAgICAgIGlmIChzdWl0ID09PSBMaWIuU3VpdC5Kb2tlcikge1xyXG4gICAgICAgICAgICAgICAgaWYgKDAgPCByYW5rICYmIHJhbmsgPCAxNCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgaWYgKHJhbmsgPCAxIHx8IDEzIDwgcmFuaykge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBpbWFnZSA9IG5ldyBJbWFnZSgpO1xyXG4gICAgICAgICAgICBpbWFnZS5zcmMgPSBgUGFwZXJDYXJkcy8ke3N1aXRzW3N1aXRdfS8ke3JhbmtzW3JhbmtdfW9mJHtzdWl0c1tzdWl0XX0ucG5nYDtcclxuICAgICAgICAgICAgaW1hZ2Uub25sb2FkID0gKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYGxvYWRlZCAnJHtpbWFnZS5zcmN9J2ApO1xyXG4gICAgICAgICAgICAgICAgY2FyZEltYWdlcy5zZXQoSlNPTi5zdHJpbmdpZnkoW3N1aXQsIHJhbmtdKSwgaW1hZ2UpO1xyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDQ7ICsraSkge1xyXG4gICAgICAgIGNvbnN0IGltYWdlID0gbmV3IEltYWdlKCk7XHJcbiAgICAgICAgaW1hZ2Uuc3JjID0gYFBhcGVyQ2FyZHMvQ2FyZEJhY2ske2l9LnBuZ2A7XHJcbiAgICAgICAgaW1hZ2Uub25sb2FkID0gKCkgPT4ge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgbG9hZGVkICcke2ltYWdlLnNyY30nYCk7XHJcbiAgICAgICAgICAgIGNhcmRJbWFnZXMuc2V0KGBCYWNrJHtpfWAsIGltYWdlKTtcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGJsYW5rSW1hZ2UgPSBuZXcgSW1hZ2UoKTtcclxuICAgIGJsYW5rSW1hZ2Uuc3JjID0gJ1BhcGVyQ2FyZHMvQmxhbmsgQ2FyZC5wbmcnO1xyXG4gICAgYmxhbmtJbWFnZS5vbmxvYWQgPSAoKSA9PiB7XHJcbiAgICAgICAgY29uc29sZS5sb2coYGxvYWRlZCAnJHtibGFua0ltYWdlLnNyY30nYCk7XHJcbiAgICAgICAgY2FyZEltYWdlcy5zZXQoJ0JsYW5rJywgYmxhbmtJbWFnZSk7XHJcbiAgICB9O1xyXG5cclxuICAgIHdoaWxlIChjYXJkSW1hZ2VzLnNpemUgPCA0ICogMTMgKyA3KSB7XHJcbiAgICAgICAgYXdhaXQgTGliLmRlbGF5KDEwKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zb2xlLmxvZygnYWxsIGNhcmQgaW1hZ2VzIGxvYWRlZCcpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0KHN0cmluZ0Zyb21DYXJkOiBzdHJpbmcpOiBIVE1MSW1hZ2VFbGVtZW50IHtcclxuICAgIGNvbnN0IGltYWdlID0gY2FyZEltYWdlcy5nZXQoc3RyaW5nRnJvbUNhcmQpO1xyXG4gICAgaWYgKGltYWdlID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGNvdWxkbid0IGZpbmQgaW1hZ2U6ICR7c3RyaW5nRnJvbUNhcmR9YCk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGltYWdlO1xyXG59XHJcbiIsImltcG9ydCAqIGFzIFN0YXRlIGZyb20gJy4vc3RhdGUnO1xyXG5pbXBvcnQgKiBhcyBWUCBmcm9tICcuL3ZpZXctcGFyYW1zJztcclxuaW1wb3J0ICogYXMgQ2FyZEltYWdlcyBmcm9tICcuL2NhcmQtaW1hZ2VzJztcclxuaW1wb3J0ICogYXMgUmVuZGVyIGZyb20gJy4vcmVuZGVyJztcclxuXHJcbi8vIHJlZnJlc2hpbmcgc2hvdWxkIHJlam9pbiB0aGUgc2FtZSBnYW1lXHJcbndpbmRvdy5oaXN0b3J5LnB1c2hTdGF0ZSh1bmRlZmluZWQsIFN0YXRlLmdhbWVJZCwgYC9nYW1lP2dhbWVJZD0ke1N0YXRlLmdhbWVJZH0mcGxheWVyTmFtZT0ke1N0YXRlLnBsYXllck5hbWV9YCk7XHJcblxyXG53aW5kb3cub25yZXNpemUgPSBWUC5yZWNhbGN1bGF0ZVBhcmFtZXRlcnM7XHJcbndpbmRvdy5vbnNjcm9sbCA9IFZQLnJlY2FsY3VsYXRlUGFyYW1ldGVycztcclxuXHJcbig8YW55PndpbmRvdykuZ2FtZSA9IGFzeW5jIGZ1bmN0aW9uIGdhbWUoKSB7XHJcbiAgICBjb25zdCBqb2luUHJvbWlzZSA9IFN0YXRlLmpvaW5HYW1lKFN0YXRlLmdhbWVJZCwgU3RhdGUucGxheWVyTmFtZSk7XHJcbiAgICBhd2FpdCBDYXJkSW1hZ2VzLmxvYWQoKTsgLy8gY29uY3VycmVudGx5XHJcbiAgICBhd2FpdCBqb2luUHJvbWlzZTtcclxuICAgIFxyXG4gICAgVlAucmVjYWxjdWxhdGVQYXJhbWV0ZXJzKCk7XHJcblxyXG4gICAgLy8gcmVuZGVyaW5nIG11c3QgYmUgc3luY2hyb25vdXMsIG9yIGVsc2UgaXQgZmxpY2tlcnNcclxuICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoUmVuZGVyLnJlbmRlcik7XHJcbn1cclxuIiwiaW1wb3J0ICogYXMgTGliIGZyb20gJy4uL2xpYic7XHJcbmltcG9ydCAqIGFzIFN0YXRlIGZyb20gJy4vc3RhdGUnO1xyXG5pbXBvcnQgKiBhcyBWUCBmcm9tICcuL3ZpZXctcGFyYW1zJztcclxuaW1wb3J0IFZlY3RvciBmcm9tICcuL3ZlY3Rvcic7XHJcblxyXG5pbnRlcmZhY2UgUmV0dXJuVG9EZWNrIHtcclxuICAgIHR5cGU6IFwicmV0dXJuVG9EZWNrXCI7XHJcbiAgICBjYXJkSW5kZXg6IG51bWJlcjtcclxufVxyXG5cclxuaW50ZXJmYWNlIEhpZGUge1xyXG4gICAgdHlwZTogXCJoaWRlXCI7XHJcbiAgICBjYXJkSW5kZXg6IG51bWJlcjtcclxufVxyXG5cclxuaW50ZXJmYWNlIFJldmVhbCB7XHJcbiAgICB0eXBlOiBcInJldmVhbFwiO1xyXG4gICAgY2FyZEluZGV4OiBudW1iZXI7XHJcbn1cclxuXHJcbmludGVyZmFjZSBUb2dnbGUge1xyXG4gICAgdHlwZTogXCJ0b2dnbGVcIjtcclxuICAgIGNhcmRJbmRleDogbnVtYmVyO1xyXG59XHJcblxyXG5leHBvcnQgdHlwZSBBY3Rpb24gPVxyXG4gICAgXCJub25lXCIgfFxyXG4gICAgXCJkcmF3RnJvbURlY2tcIiB8XHJcbiAgICBcIndhaXRpbmdGb3JOZXdDYXJkXCIgfFxyXG4gICAgXCJzb3J0QnlTdWl0XCIgfFxyXG4gICAgXCJzb3J0QnlSYW5rXCIgfFxyXG4gICAgUmV0dXJuVG9EZWNrIHxcclxuICAgIEhpZGUgfFxyXG4gICAgUmV2ZWFsIHxcclxuICAgIFRvZ2dsZTtcclxuXHJcbmV4cG9ydCBsZXQgYWN0aW9uOiBBY3Rpb24gPSBcIm5vbmVcIjtcclxuXHJcbmNvbnN0IG1vdmVUaHJlc2hvbGQgPSAwLjUgKiBWUC5waXhlbHNQZXJDTTtcclxubGV0IG1vdXNlRG93blBvc2l0aW9uID0gPFZlY3Rvcj57IHg6IDAsIHk6IDAgfTtcclxubGV0IG1vdXNlTW92ZVBvc2l0aW9uID0gPFZlY3Rvcj57IHg6IDAsIHk6IDAgfTtcclxubGV0IGV4Y2VlZGVkTW92ZVRocmVzaG9sZCA9IGZhbHNlO1xyXG5cclxuZnVuY3Rpb24gc2V0RHJvcEFjdGlvbihnYW1lU3RhdGU6IExpYi5HYW1lU3RhdGUsIGNhcmRJbmRleDogbnVtYmVyKSB7XHJcbiAgICBjb25zdCBkcm9wUG9zaXRpb24gPSAoU3RhdGUuZmFjZVNwcml0ZXNGb3JQbGF5ZXJbZ2FtZVN0YXRlLnBsYXllckluZGV4XSA/PyBbXSlbU3RhdGUuc2VsZWN0ZWRJbmRpY2VzWzBdID8/IDBdPy5wb3NpdGlvbjtcclxuICAgIGlmIChkcm9wUG9zaXRpb24gPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKGAke0pTT04uc3RyaW5naWZ5KFN0YXRlLmZhY2VTcHJpdGVzRm9yUGxheWVyKX1gKTtcclxuICAgIFxyXG4gICAgLypcclxuICAgIGNvbnNvbGUubG9nKGBkcm9wUG9zaXRpb24ueDogJHtkcm9wUG9zaXRpb24ueH0sICR7XHJcbiAgICAgICAgZGVja1Bvc2l0aW9uc1tnYW1lU3RhdGUuZGVja0NvdW50IC0gMV0ueCAtIGNhcmRXaWR0aCAvIDJ9LCAke1xyXG4gICAgICAgIGRlY2tQb3NpdGlvbnNbMF0ueCArIGNhcmRXaWR0aCAvIDJcclxuICAgIH1gKTtcclxuICAgIGNvbnNvbGUubG9nKGBkcm9wUG9zaXRpb24ueTogJHtkcm9wUG9zaXRpb24ueX0sICR7XHJcbiAgICAgICAgZGVja1Bvc2l0aW9uc1tnYW1lU3RhdGUuZGVja0NvdW50IC0gMV0ueSAtIGNhcmRIZWlnaHQgLyAyfSwgJHtcclxuICAgICAgICBkZWNrUG9zaXRpb25zWzBdLnkgKyBjYXJkSGVpZ2h0IC8gMlxyXG4gICAgfWApO1xyXG4gICAgKi9cclxuXHJcbiAgICBjb25zdCBoaWRlRGlzdGFuY2UgICA9IE1hdGguYWJzKGRyb3BQb3NpdGlvbi55IC0gKFZQLmNhbnZhcy5oZWlnaHQgLSAgICAgVlAuc3ByaXRlSGVpZ2h0KSk7XHJcbiAgICBjb25zdCByZXZlYWxEaXN0YW5jZSA9IE1hdGguYWJzKGRyb3BQb3NpdGlvbi55IC0gKFZQLmNhbnZhcy5oZWlnaHQgLSAyICogVlAuc3ByaXRlSGVpZ2h0KSk7XHJcbiAgICBpZiAoaGlkZURpc3RhbmNlIDwgcmV2ZWFsRGlzdGFuY2UpIHtcclxuICAgICAgICBhY3Rpb24gPSB7IHR5cGU6IFwiaGlkZVwiLCBjYXJkSW5kZXggfTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgYWN0aW9uID0geyB0eXBlOiBcInJldmVhbFwiLCBjYXJkSW5kZXggfTtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0TW91c2VQb3NpdGlvbihlOiBNb3VzZUV2ZW50KSB7XHJcbiAgICByZXR1cm4gbmV3IFZlY3RvcihcclxuICAgICAgICBWUC5jYW52YXMud2lkdGggKiAoZS5jbGllbnRYIC0gVlAuY2FudmFzUmVjdC5sZWZ0KSAvIFZQLmNhbnZhc1JlY3Qud2lkdGgsXHJcbiAgICAgICAgVlAuY2FudmFzLmhlaWdodCAqIChlLmNsaWVudFkgLSBWUC5jYW52YXNSZWN0LnRvcCkgLyBWUC5jYW52YXNSZWN0LmhlaWdodFxyXG4gICAgKTtcclxufVxyXG5cclxuVlAuY2FudmFzLm9ubW91c2Vkb3duID0gYXN5bmMgKGV2ZW50OiBNb3VzZUV2ZW50KSA9PiB7XHJcbiAgICBjb25zdCB1bmxvY2sgPSBhd2FpdCBTdGF0ZS5sb2NrKCk7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIG1vdXNlRG93blBvc2l0aW9uID0gZ2V0TW91c2VQb3NpdGlvbihldmVudCk7XHJcbiAgICAgICAgbW91c2VNb3ZlUG9zaXRpb24gPSBtb3VzZURvd25Qb3NpdGlvbjtcclxuICAgICAgICBleGNlZWRlZE1vdmVUaHJlc2hvbGQgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgaWYgKFN0YXRlLmdhbWVTdGF0ZSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuXHJcbiAgICAgICAgY29uc3QgZGVja1Bvc2l0aW9uID0gU3RhdGUuZGVja1Nwcml0ZXNbU3RhdGUuZGVja1Nwcml0ZXMubGVuZ3RoIC0gMV0/LnBvc2l0aW9uO1xyXG4gICAgICAgIGNvbnN0IGZhY2VTcHJpdGVzID0gU3RhdGUuZmFjZVNwcml0ZXNGb3JQbGF5ZXJbU3RhdGUuZ2FtZVN0YXRlLnBsYXllckluZGV4XSA/PyBbXTtcclxuXHJcbiAgICAgICAgaWYgKFxyXG4gICAgICAgICAgICBWUC5zb3J0QnlSYW5rQm91bmRzWzBdLnggPCBtb3VzZURvd25Qb3NpdGlvbi54ICYmIG1vdXNlRG93blBvc2l0aW9uLnggPCBWUC5zb3J0QnlSYW5rQm91bmRzWzFdLnggJiZcclxuICAgICAgICAgICAgVlAuc29ydEJ5UmFua0JvdW5kc1swXS55IDwgbW91c2VEb3duUG9zaXRpb24ueSAmJiBtb3VzZURvd25Qb3NpdGlvbi55IDwgVlAuc29ydEJ5UmFua0JvdW5kc1sxXS55XHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICAgIGFjdGlvbiA9IFwic29ydEJ5UmFua1wiO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoXHJcbiAgICAgICAgICAgIFZQLnNvcnRCeVN1aXRCb3VuZHNbMF0ueCA8IG1vdXNlRG93blBvc2l0aW9uLnggJiYgbW91c2VEb3duUG9zaXRpb24ueCA8IFZQLnNvcnRCeVN1aXRCb3VuZHNbMV0ueCAmJlxyXG4gICAgICAgICAgICBWUC5zb3J0QnlTdWl0Qm91bmRzWzBdLnkgPCBtb3VzZURvd25Qb3NpdGlvbi55ICYmIG1vdXNlRG93blBvc2l0aW9uLnkgPCBWUC5zb3J0QnlTdWl0Qm91bmRzWzFdLnlcclxuICAgICAgICApIHtcclxuICAgICAgICAgICAgYWN0aW9uID0gXCJzb3J0QnlTdWl0XCI7XHJcbiAgICAgICAgfSBlbHNlIGlmIChkZWNrUG9zaXRpb24gIT09IHVuZGVmaW5lZCAmJlxyXG4gICAgICAgICAgICBkZWNrUG9zaXRpb24ueCA8IG1vdXNlRG93blBvc2l0aW9uLnggJiYgbW91c2VEb3duUG9zaXRpb24ueCA8IGRlY2tQb3NpdGlvbi54ICsgVlAuc3ByaXRlV2lkdGggJiZcclxuICAgICAgICAgICAgZGVja1Bvc2l0aW9uLnkgPCBtb3VzZURvd25Qb3NpdGlvbi55ICYmIG1vdXNlRG93blBvc2l0aW9uLnkgPCBkZWNrUG9zaXRpb24ueSArIFZQLnNwcml0ZUhlaWdodFxyXG4gICAgICAgICkge1xyXG4gICAgICAgICAgICBhY3Rpb24gPSBcImRyYXdGcm9tRGVja1wiO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIC8vIGJlY2F1c2Ugd2UgcmVuZGVyIGxlZnQgdG8gcmlnaHQsIHRoZSByaWdodG1vc3QgY2FyZCB1bmRlciB0aGUgbW91c2UgcG9zaXRpb24gaXMgd2hhdCB3ZSBzaG91bGQgcmV0dXJuXHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSBmYWNlU3ByaXRlcy5sZW5ndGggLSAxOyBpID49IDA7IC0taSkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcG9zaXRpb24gPSBmYWNlU3ByaXRlc1tpXT8ucG9zaXRpb247XHJcbiAgICAgICAgICAgICAgICBpZiAocG9zaXRpb24gIT09IHVuZGVmaW5lZCAmJlxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uLnggPCBtb3VzZURvd25Qb3NpdGlvbi54ICYmIG1vdXNlRG93blBvc2l0aW9uLnggPCBwb3NpdGlvbi54ICsgVlAuc3ByaXRlV2lkdGggJiZcclxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbi55IDwgbW91c2VEb3duUG9zaXRpb24ueSAmJiBtb3VzZURvd25Qb3NpdGlvbi55IDwgcG9zaXRpb24ueSArIFZQLnNwcml0ZUhlaWdodFxyXG4gICAgICAgICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYWN0aW9uID0geyB0eXBlOiBcInRvZ2dsZVwiLCBjYXJkSW5kZXg6IGkgfTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBcclxuICAgICAgICB9XHJcbiAgICB9IGZpbmFsbHkge1xyXG4gICAgICAgIHVubG9jaygpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuVlAuY2FudmFzLm9ubW91c2Vtb3ZlID0gYXN5bmMgKGV2ZW50OiBNb3VzZUV2ZW50KSA9PiB7XHJcbiAgICBsZXQgdW5sb2NrID0gYXdhaXQgU3RhdGUubG9jaygpO1xyXG4gICAgdHJ5IHtcclxuICAgICAgICBtb3VzZU1vdmVQb3NpdGlvbiA9IGdldE1vdXNlUG9zaXRpb24oZXZlbnQpO1xyXG4gICAgICAgIGV4Y2VlZGVkTW92ZVRocmVzaG9sZCA9IGV4Y2VlZGVkTW92ZVRocmVzaG9sZCB8fCBtb3VzZU1vdmVQb3NpdGlvbi5kaXN0YW5jZShtb3VzZURvd25Qb3NpdGlvbikgPiBtb3ZlVGhyZXNob2xkO1xyXG5cclxuICAgICAgICBsZXQgbW92ZW1lbnQgPSBuZXcgVmVjdG9yKGV2ZW50Lm1vdmVtZW50WCwgZXZlbnQubW92ZW1lbnRZKTtcclxuXHJcbiAgICAgICAgaWYgKFN0YXRlLmdhbWVTdGF0ZSA9PT0gdW5kZWZpbmVkKSByZXR1cm47XHJcblxyXG4gICAgICAgIGNvbnN0IGZhY2VTcHJpdGVzID0gU3RhdGUuZmFjZVNwcml0ZXNGb3JQbGF5ZXJbU3RhdGUuZ2FtZVN0YXRlLnBsYXllckluZGV4XSA/PyBbXTtcclxuXHJcbiAgICAgICAgaWYgKGFjdGlvbiA9PT0gXCJub25lXCIpIHtcclxuICAgICAgICAgICAgLy8gZG8gbm90aGluZ1xyXG4gICAgICAgIH0gZWxzZSBpZiAoYWN0aW9uID09PSBcImRyYXdGcm9tRGVja1wiIHx8IGFjdGlvbiA9PT0gXCJ3YWl0aW5nRm9yTmV3Q2FyZFwiKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGRlY2tTcHJpdGUgPSBTdGF0ZS5kZWNrU3ByaXRlc1tTdGF0ZS5kZWNrU3ByaXRlcy5sZW5ndGggLSAxXTtcclxuICAgICAgICAgICAgaWYgKGRlY2tTcHJpdGUgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICAgICAgICAgIGRlY2tTcHJpdGUudGFyZ2V0ID0gZGVja1Nwcml0ZS50YXJnZXQuYWRkKG1vdmVtZW50KTtcclxuXHJcbiAgICAgICAgICAgIGlmIChhY3Rpb24gPT09IFwiZHJhd0Zyb21EZWNrXCIgJiYgZXhjZWVkZWRNb3ZlVGhyZXNob2xkKSB7XHJcbiAgICAgICAgICAgICAgICBhY3Rpb24gPSBcIndhaXRpbmdGb3JOZXdDYXJkXCI7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gY2FyZCBkcmF3aW5nIHdpbGwgdHJ5IHRvIGxvY2sgdGhlIHN0YXRlLCBzbyB3ZSBtdXN0IGF0dGFjaCBhIGNhbGxiYWNrIGluc3RlYWQgb2YgYXdhaXRpbmdcclxuICAgICAgICAgICAgICAgIFN0YXRlLmRyYXdDYXJkKCkudGhlbihhc3luYyByZXN1bHQgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQuZXJyb3JEZXNjcmlwdGlvbiAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IocmVzdWx0LmVycm9yRGVzY3JpcHRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWN0aW9uID09PSBcIndhaXRpbmdGb3JOZXdDYXJkXCIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbiA9IFwibm9uZVwiO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVsZWFzZSA9IGF3YWl0IFN0YXRlLmxvY2soKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhY3Rpb24gPT09IFwid2FpdGluZ0Zvck5ld0NhcmRcIikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChTdGF0ZS5nYW1lU3RhdGUgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGltbWVkaWF0ZWx5IHNlbGVjdCBuZXdseSBhY3F1aXJlZCBjYXJkXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY2FyZEluZGV4ID0gU3RhdGUuZ2FtZVN0YXRlLnBsYXllckNhcmRzLmxlbmd0aCAtIDE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgU3RhdGUuc2VsZWN0ZWRJbmRpY2VzLnNwbGljZSgwLCBTdGF0ZS5zZWxlY3RlZEluZGljZXMubGVuZ3RoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBTdGF0ZS5zZWxlY3RlZEluZGljZXMucHVzaChjYXJkSW5kZXgpO1xyXG4gICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG5ldyBjYXJkIHNob3VsZCBhcHBlYXIgaW4gcGxhY2Ugb2YgZHJhZ2dlZCBjYXJkIGZyb20gZGVjayB3aXRob3V0IGFuaW1hdGlvblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZhY2VTcHJpdGVBdE1vdXNlRG93biA9IFN0YXRlLmZhY2VTcHJpdGVzRm9yUGxheWVyW1N0YXRlLmdhbWVTdGF0ZS5wbGF5ZXJJbmRleF0/LltjYXJkSW5kZXhdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmYWNlU3ByaXRlQXRNb3VzZURvd24gPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmFjZVNwcml0ZUF0TW91c2VEb3duLnRhcmdldCA9IGRlY2tTcHJpdGUucG9zaXRpb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmFjZVNwcml0ZUF0TW91c2VEb3duLnBvc2l0aW9uID0gZGVja1Nwcml0ZS5wb3NpdGlvbjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmYWNlU3ByaXRlQXRNb3VzZURvd24udmVsb2NpdHkgPSBkZWNrU3ByaXRlLnZlbG9jaXR5O1xyXG4gICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRyYW5zaXRpb24gdG8gaGlkZS9yZXZlYWwvcmV0dXJuVG9EZWNrXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2V0RHJvcEFjdGlvbihTdGF0ZS5nYW1lU3RhdGUsIGNhcmRJbmRleCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWxlYXNlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSBpZiAoYWN0aW9uID09PSBcInNvcnRCeVN1aXRcIikge1xyXG4gICAgICAgICAgICAvLyBUT0RPOiBjaGVjayB3aGV0aGVyIG1vdXNlIHBvc2l0aW9uIGhhcyBsZWZ0IGJ1dHRvbiBib3VuZHNcclxuICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbiA9PT0gXCJzb3J0QnlSYW5rXCIpIHtcclxuICAgICAgICAgICAgLy8gVE9ETzogY2hlY2sgd2hldGhlciBtb3VzZSBwb3NpdGlvbiBoYXMgbGVmdCBidXR0b24gYm91bmRzXHJcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24udHlwZSA9PT0gXCJ0b2dnbGVcIikge1xyXG4gICAgICAgICAgICBpZiAoZXhjZWVkZWRNb3ZlVGhyZXNob2xkKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBkcmFnZ2luZyBhIGNhcmQgc2VsZWN0cyBpdFxyXG4gICAgICAgICAgICAgICAgbGV0IHNlbGVjdGVkSW5kZXhJbmRleCA9IExpYi5iaW5hcnlTZWFyY2hOdW1iZXIoU3RhdGUuc2VsZWN0ZWRJbmRpY2VzLCBhY3Rpb24uY2FyZEluZGV4KTtcclxuICAgICAgICAgICAgICAgIGlmIChzZWxlY3RlZEluZGV4SW5kZXggPCAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWRJbmRleEluZGV4ID0gfnNlbGVjdGVkSW5kZXhJbmRleDtcclxuICAgICAgICAgICAgICAgICAgICBTdGF0ZS5zZWxlY3RlZEluZGljZXMuc3BsaWNlKHNlbGVjdGVkSW5kZXhJbmRleCwgMCwgYWN0aW9uLmNhcmRJbmRleCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gZ2F0aGVyIHRvZ2V0aGVyIHNlbGVjdGVkIGNhcmRzIGFyb3VuZCB0aGUgY2FyZCB1bmRlciB0aGUgbW91c2VcclxuICAgICAgICAgICAgICAgIGNvbnN0IGZhY2VTcHJpdGVBdE1vdXNlRG93biA9IGZhY2VTcHJpdGVzW2FjdGlvbi5jYXJkSW5kZXhdO1xyXG4gICAgICAgICAgICAgICAgaWYgKGZhY2VTcHJpdGVBdE1vdXNlRG93biA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgaSA9IDA7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHNlbGVjdGVkSW5kZXggb2YgU3RhdGUuc2VsZWN0ZWRJbmRpY2VzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZmFjZVNwcml0ZSA9IGZhY2VTcHJpdGVzW3NlbGVjdGVkSW5kZXhdO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChmYWNlU3ByaXRlID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLyBhY2NvdW50IGZvciBtb3ZlbWVudCB0aHJlc2hvbGRcclxuICAgICAgICAgICAgICAgICAgICBmYWNlU3ByaXRlLnRhcmdldCA9IG5ldyBWZWN0b3IoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50Lm1vdmVtZW50WCArIGZhY2VTcHJpdGVBdE1vdXNlRG93bi5wb3NpdGlvbi54ICsgKGkrKyAtIHNlbGVjdGVkSW5kZXhJbmRleCkgKiBWUC5zcHJpdGVHYXAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50Lm1vdmVtZW50WSArIGZhY2VTcHJpdGVBdE1vdXNlRG93bi5wb3NpdGlvbi55XHJcbiAgICAgICAgICAgICAgICAgICAgKS5hZGQobW91c2VNb3ZlUG9zaXRpb24uc3ViKG1vdXNlRG93blBvc2l0aW9uKSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgc2V0RHJvcEFjdGlvbihTdGF0ZS5nYW1lU3RhdGUsIGFjdGlvbi5jYXJkSW5kZXgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24udHlwZSA9PT0gXCJoaWRlXCIgfHwgYWN0aW9uLnR5cGUgPT09IFwicmV2ZWFsXCIgfHwgYWN0aW9uLnR5cGUgPT09IFwicmV0dXJuVG9EZWNrXCIpIHtcclxuICAgICAgICAgICAgLy8gbW92ZSBhbGwgc2VsZWN0ZWQgY2FyZHNcclxuICAgICAgICAgICAgZm9yIChjb25zdCBpIG9mIFN0YXRlLnNlbGVjdGVkSW5kaWNlcykge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZmFjZVNwcml0ZSA9IGZhY2VTcHJpdGVzW2ldO1xyXG4gICAgICAgICAgICAgICAgaWYgKGZhY2VTcHJpdGUgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICAgICAgICAgICAgICBmYWNlU3ByaXRlLnRhcmdldCA9IGZhY2VTcHJpdGUudGFyZ2V0LmFkZChuZXcgVmVjdG9yKGV2ZW50Lm1vdmVtZW50WCwgZXZlbnQubW92ZW1lbnRZKSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHNldERyb3BBY3Rpb24oU3RhdGUuZ2FtZVN0YXRlLCBhY3Rpb24uY2FyZEluZGV4KTtcclxuICAgICAgICB9XHJcbiAgICB9IGZpbmFsbHkge1xyXG4gICAgICAgIHVubG9jaygpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuVlAuY2FudmFzLm9ubW91c2V1cCA9IGFzeW5jICgpID0+IHtcclxuICAgIGNvbnN0IHVubG9jayA9IGF3YWl0IFN0YXRlLmxvY2soKTtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgaWYgKFN0YXRlLmdhbWVTdGF0ZSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuXHJcbiAgICAgICAgaWYgKGFjdGlvbiA9PT0gXCJub25lXCIgfHwgYWN0aW9uID09PSBcImRyYXdGcm9tRGVja1wiIHx8IGFjdGlvbiA9PT0gXCJ3YWl0aW5nRm9yTmV3Q2FyZFwiKSB7XHJcbiAgICAgICAgICAgIC8vIGRvIG5vdGhpbmdcclxuICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbiA9PT0gXCJzb3J0QnlSYW5rXCIpIHtcclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgU3RhdGUuc29ydEJ5UmFuayhTdGF0ZS5nYW1lU3RhdGUpO1xyXG4gICAgICAgICAgICBpZiAoJ2Vycm9yRGVzY3JpcHRpb24nIGluIHJlc3VsdCkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihyZXN1bHQuZXJyb3JEZXNjcmlwdGlvbik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbiA9PT0gXCJzb3J0QnlTdWl0XCIpIHtcclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgU3RhdGUuc29ydEJ5U3VpdChTdGF0ZS5nYW1lU3RhdGUpO1xyXG4gICAgICAgICAgICBpZiAoJ2Vycm9yRGVzY3JpcHRpb24nIGluIHJlc3VsdCkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihyZXN1bHQuZXJyb3JEZXNjcmlwdGlvbik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbi50eXBlID09PSBcImhpZGVcIiB8fCBhY3Rpb24udHlwZSA9PT0gXCJyZXZlYWxcIikge1xyXG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBTdGF0ZS5yZW9yZGVyQ2FyZHMoU3RhdGUuZ2FtZVN0YXRlKTtcclxuICAgICAgICAgICAgaWYgKCdlcnJvckRlc2NyaXB0aW9uJyBpbiByZXN1bHQpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IocmVzdWx0LmVycm9yRGVzY3JpcHRpb24pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24udHlwZSA9PT0gXCJ0b2dnbGVcIikge1xyXG4gICAgICAgICAgICBsZXQgc2VsZWN0ZWRJbmRleEluZGV4ID0gTGliLmJpbmFyeVNlYXJjaE51bWJlcihTdGF0ZS5zZWxlY3RlZEluZGljZXMsIGFjdGlvbi5jYXJkSW5kZXgpO1xyXG4gICAgICAgICAgICBpZiAoc2VsZWN0ZWRJbmRleEluZGV4IDwgMCkge1xyXG4gICAgICAgICAgICAgICAgU3RhdGUuc2VsZWN0ZWRJbmRpY2VzLnNwbGljZSh+c2VsZWN0ZWRJbmRleEluZGV4LCAwLCBhY3Rpb24uY2FyZEluZGV4KTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIFN0YXRlLnNlbGVjdGVkSW5kaWNlcy5zcGxpY2Uoc2VsZWN0ZWRJbmRleEluZGV4LCAxKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSBpZiAoYWN0aW9uLnR5cGUgPT09IFwicmV0dXJuVG9EZWNrXCIpIHtcclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgU3RhdGUucmV0dXJuQ2FyZHNUb0RlY2soU3RhdGUuZ2FtZVN0YXRlKTtcclxuICAgICAgICAgICAgaWYgKCdlcnJvckRlc2NyaXB0aW9uJyBpbiByZXN1bHQpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IocmVzdWx0LmVycm9yRGVzY3JpcHRpb24pO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgLy8gbWFrZSB0aGUgc2VsZWN0ZWQgY2FyZHMgZGlzYXBwZWFyXHJcbiAgICAgICAgICAgICAgICBTdGF0ZS5zZWxlY3RlZEluZGljZXMuc3BsaWNlKDAsIFN0YXRlLnNlbGVjdGVkSW5kaWNlcy5sZW5ndGgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBhY3Rpb24gPSBcIm5vbmVcIjtcclxuICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgdW5sb2NrKCk7XHJcbiAgICB9XHJcbn07XHJcbiIsImltcG9ydCAqIGFzIExpYiBmcm9tIFwiLi4vbGliXCI7XHJcblxyXG5jb25zdCBwbGF5ZXJOYW1lRWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwbGF5ZXJOYW1lJyk7XHJcbmNvbnN0IHBsYXllck5hbWVWYWx1ZSA9IExpYi5nZXRDb29raWUoJ3BsYXllck5hbWUnKTtcclxuaWYgKHBsYXllck5hbWVFbGVtZW50ICE9PSBudWxsICYmIHBsYXllck5hbWVWYWx1ZSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAoPEhUTUxJbnB1dEVsZW1lbnQ+cGxheWVyTmFtZUVsZW1lbnQpLnZhbHVlID0gcGxheWVyTmFtZVZhbHVlO1xyXG59XHJcblxyXG5jb25zdCBnYW1lSWRFbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2dhbWVJZCcpO1xyXG5jb25zdCBnYW1lSWRWYWx1ZSA9IExpYi5nZXRDb29raWUoJ2dhbWVJZCcpO1xyXG5pZiAoZ2FtZUlkRWxlbWVudCAhPT0gbnVsbCAmJiBnYW1lSWRWYWx1ZSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAoPEhUTUxJbnB1dEVsZW1lbnQ+Z2FtZUlkRWxlbWVudCkudmFsdWUgPSBnYW1lSWRWYWx1ZTtcclxufVxyXG4iLCJpbXBvcnQgKiBhcyBMaWIgZnJvbSAnLi4vbGliJztcclxuaW1wb3J0ICogYXMgU3RhdGUgZnJvbSAnLi9zdGF0ZSc7XHJcbmltcG9ydCAqIGFzIElucHV0IGZyb20gJy4vaW5wdXQnO1xyXG5pbXBvcnQgKiBhcyBWUCBmcm9tICcuL3ZpZXctcGFyYW1zJztcclxuaW1wb3J0IFZlY3RvciBmcm9tICcuL3ZlY3Rvcic7XHJcbmltcG9ydCBTcHJpdGUgZnJvbSAnLi9zcHJpdGUnO1xyXG5cclxuY29uc3QgZGVja0RlYWxEdXJhdGlvbiA9IDEwMDA7XHJcbmxldCBkZWNrRGVhbFRpbWU6IG51bWJlciB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcclxuXHJcbmxldCBjdXJyZW50VGltZTogbnVtYmVyIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xyXG5sZXQgZGVsdGFUaW1lOiBudW1iZXI7XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVuZGVyKHRpbWU6IG51bWJlcikge1xyXG4gICAgZGVsdGFUaW1lID0gdGltZSAtIChjdXJyZW50VGltZSAhPT0gdW5kZWZpbmVkID8gY3VycmVudFRpbWUgOiB0aW1lKTtcclxuICAgIGN1cnJlbnRUaW1lID0gdGltZTtcclxuXHJcbiAgICBpZiAoU3RhdGUuZ2FtZVN0YXRlICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICBjb25zdCB1bmxvY2sgPSBhd2FpdCBTdGF0ZS5sb2NrKCk7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgLy8gY2xlYXIgdGhlIHNjcmVlblxyXG4gICAgICAgICAgICBWUC5jb250ZXh0LmNsZWFyUmVjdCgwLCAwLCBWUC5jYW52YXMud2lkdGgsIFZQLmNhbnZhcy5oZWlnaHQpO1xyXG5cclxuICAgICAgICAgICAgcmVuZGVyQmFzaWNzKFN0YXRlLmdhbWVJZCwgU3RhdGUucGxheWVyTmFtZSk7XHJcbiAgICAgICAgICAgIHJlbmRlckRlY2sodGltZSwgU3RhdGUuZ2FtZVN0YXRlLmRlY2tDb3VudCk7XHJcbiAgICAgICAgICAgIHJlbmRlck90aGVyUGxheWVycyhTdGF0ZS5nYW1lU3RhdGUpO1xyXG4gICAgICAgICAgICByZW5kZXJQbGF5ZXIoU3RhdGUuZ2FtZVN0YXRlKTtcclxuICAgICAgICAgICAgcmVuZGVyQnV0dG9ucygpO1xyXG4gICAgICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgICAgIHVubG9jaygpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShyZW5kZXIpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICAvLyB3YWl0IHVudGlsIHdlIGhhdmUgYSBnYW1lIHN0YXRlXHJcbiAgICAgICAgYXdhaXQgTGliLmRlbGF5KDEwMCk7XHJcbiAgICAgICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShyZW5kZXIpO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiByZW5kZXJCYXNpY3MoZ2FtZUlkOiBzdHJpbmcsIHBsYXllck5hbWU6IHN0cmluZykge1xyXG4gICAgVlAuY29udGV4dC5maWxsU3R5bGUgPSAnIzAwMDAwMGZmJztcclxuICAgIFZQLmNvbnRleHQuZm9udCA9ICcwLjc1Y20gSXJyZWd1bGFyaXMnO1xyXG4gICAgVlAuY29udGV4dC5maWxsVGV4dChgR2FtZTogJHtnYW1lSWR9YCwgMCwgMC43NSAqIFZQLnBpeGVsc1BlckNNKTtcclxuICAgIFZQLmNvbnRleHQuZmlsbFRleHQoYFlvdXIgbmFtZSBpczogJHtwbGF5ZXJOYW1lfWAsIDAsIFZQLmNhbnZhcy5oZWlnaHQpO1xyXG4gICAgXHJcbiAgICBWUC5jb250ZXh0LnNldExpbmVEYXNoKFs0LCAyXSk7XHJcbiAgICBWUC5jb250ZXh0LnN0cm9rZVJlY3QoVlAuc3ByaXRlSGVpZ2h0LCBWUC5zcHJpdGVIZWlnaHQsIFZQLmNhbnZhcy53aWR0aCAtIDIgKiBWUC5zcHJpdGVIZWlnaHQsIFZQLmNhbnZhcy5oZWlnaHQgLSAyICogVlAuc3ByaXRlSGVpZ2h0KTtcclxufVxyXG5cclxuZnVuY3Rpb24gcmVuZGVyRGVjayh0aW1lOiBudW1iZXIsIGRlY2tDb3VudDogbnVtYmVyKSB7XHJcbiAgICBWUC5jb250ZXh0LnNhdmUoKTtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgaWYgKGRlY2tEZWFsVGltZSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIGRlY2tEZWFsVGltZSA9IHRpbWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IFN0YXRlLmRlY2tTcHJpdGVzLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGRlY2tTcHJpdGUgPSBTdGF0ZS5kZWNrU3ByaXRlc1tpXTtcclxuICAgICAgICAgICAgaWYgKGRlY2tTcHJpdGUgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcblxyXG4gICAgICAgICAgICBpZiAoaSA9PT0gZGVja0NvdW50IC0gMSAmJiAoXHJcbiAgICAgICAgICAgICAgICBJbnB1dC5hY3Rpb24gPT09IFwiZHJhd0Zyb21EZWNrXCIgfHxcclxuICAgICAgICAgICAgICAgIElucHV0LmFjdGlvbiA9PT0gXCJ3YWl0aW5nRm9yTmV3Q2FyZFwiXHJcbiAgICAgICAgICAgICkpIHtcclxuICAgICAgICAgICAgICAgIC8vIHNldCBpbiBvbm1vdXNlbW92ZVxyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRpbWUgLSBkZWNrRGVhbFRpbWUgPCBpICogZGVja0RlYWxEdXJhdGlvbiAvIGRlY2tDb3VudCkge1xyXG4gICAgICAgICAgICAgICAgLy8gY2FyZCBub3QgeWV0IGRlYWx0OyBrZWVwIHRvcCBsZWZ0XHJcbiAgICAgICAgICAgICAgICBkZWNrU3ByaXRlLnBvc2l0aW9uID0gbmV3IFZlY3RvcigtVlAuc3ByaXRlV2lkdGgsIC1WUC5zcHJpdGVIZWlnaHQpO1xyXG4gICAgICAgICAgICAgICAgZGVja1Nwcml0ZS50YXJnZXQgPSBuZXcgVmVjdG9yKC1WUC5zcHJpdGVXaWR0aCwgLVZQLnNwcml0ZUhlaWdodCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBkZWNrU3ByaXRlLnRhcmdldCA9IG5ldyBWZWN0b3IoXHJcbiAgICAgICAgICAgICAgICAgICAgVlAuY2FudmFzLndpZHRoIC8gMiAtIFZQLnNwcml0ZVdpZHRoIC8gMiAtIChpIC0gZGVja0NvdW50IC8gMikgKiBWUC5zcHJpdGVEZWNrR2FwLFxyXG4gICAgICAgICAgICAgICAgICAgIFZQLmNhbnZhcy5oZWlnaHQgLyAyIC0gVlAuc3ByaXRlSGVpZ2h0IC8gMlxyXG4gICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZGVja1Nwcml0ZS5hbmltYXRlKGRlbHRhVGltZSk7XHJcbiAgICAgICAgfVxyXG4gICAgfSBmaW5hbGx5IHtcclxuICAgICAgICBWUC5jb250ZXh0LnJlc3RvcmUoKTtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gcmVuZGVyT3RoZXJQbGF5ZXJzKGdhbWVTdGF0ZTogTGliLkdhbWVTdGF0ZSkge1xyXG4gICAgVlAuY29udGV4dC5zYXZlKCk7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIFZQLmNvbnRleHQudHJhbnNsYXRlKDAsIChWUC5jYW52YXMud2lkdGggKyBWUC5jYW52YXMuaGVpZ2h0KSAvIDIpO1xyXG4gICAgICAgIFZQLmNvbnRleHQucm90YXRlKC1NYXRoLlBJIC8gMik7XHJcbiAgICAgICAgcmVuZGVyT3RoZXJQbGF5ZXIoZ2FtZVN0YXRlLCAoZ2FtZVN0YXRlLnBsYXllckluZGV4ICsgMSkgJSA0KTtcclxuICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgVlAuY29udGV4dC5yZXN0b3JlKCk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIFZQLmNvbnRleHQuc2F2ZSgpO1xyXG4gICAgdHJ5IHtcclxuICAgICAgICByZW5kZXJPdGhlclBsYXllcihnYW1lU3RhdGUsIChnYW1lU3RhdGUucGxheWVySW5kZXggKyAyKSAlIDQpO1xyXG4gICAgfSBmaW5hbGx5IHtcclxuICAgICAgICBWUC5jb250ZXh0LnJlc3RvcmUoKTtcclxuICAgIH1cclxuXHJcbiAgICBWUC5jb250ZXh0LnNhdmUoKTtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgVlAuY29udGV4dC50cmFuc2xhdGUoVlAuY2FudmFzLndpZHRoLCAoVlAuY2FudmFzLmhlaWdodCAtIFZQLmNhbnZhcy53aWR0aCkgLyAyKTtcclxuICAgICAgICBWUC5jb250ZXh0LnJvdGF0ZShNYXRoLlBJKTtcclxuICAgICAgICByZW5kZXJPdGhlclBsYXllcihnYW1lU3RhdGUsIChnYW1lU3RhdGUucGxheWVySW5kZXggKyAzKSAlIDQpO1xyXG4gICAgfSBmaW5hbGx5IHtcclxuICAgICAgICBWUC5jb250ZXh0LnJlc3RvcmUoKTtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gcmVuZGVyT3RoZXJQbGF5ZXIoZ2FtZVN0YXRlOiBMaWIuR2FtZVN0YXRlLCBwbGF5ZXJJbmRleDogbnVtYmVyKSB7XHJcbiAgICBjb25zdCBwbGF5ZXIgPSBnYW1lU3RhdGUub3RoZXJQbGF5ZXJzW3BsYXllckluZGV4XTtcclxuICAgIGlmIChwbGF5ZXIgPT09IHVuZGVmaW5lZCkgcmV0dXJuO1xyXG5cclxuICAgIFZQLmNvbnRleHQuZmlsbFN0eWxlID0gJyMwMDAwMDBmZic7XHJcbiAgICBWUC5jb250ZXh0LmZvbnQgPSBgJHtWUC5zcHJpdGVHYXB9cHggSXJyZWd1bGFyaXNgO1xyXG4gICAgVlAuY29udGV4dC5maWxsVGV4dChwbGF5ZXIubmFtZSwgVlAuY2FudmFzLndpZHRoIC8gMiwgVlAuc3ByaXRlSGVpZ2h0ICsgVlAuc3ByaXRlR2FwKTtcclxuXHJcbiAgICBjb25zdCBkZWNrUG9zaXRpb24gPSBTdGF0ZS5kZWNrU3ByaXRlc1tTdGF0ZS5kZWNrU3ByaXRlcy5sZW5ndGggLSAxXT8ucG9zaXRpb24gPz9cclxuICAgICAgICBuZXcgVmVjdG9yKFZQLmNhbnZhcy53aWR0aCAvIDIgLSBWUC5zcHJpdGVXaWR0aCAvIDIsIFZQLmNhbnZhcy5oZWlnaHQgLyAyIC0gVlAuc3ByaXRlSGVpZ2h0IC8gMik7XHJcbiAgICBjb25zdCBkZWNrUG9pbnQgPSBWUC5jb250ZXh0LmdldFRyYW5zZm9ybSgpLmludmVyc2UoKS50cmFuc2Zvcm1Qb2ludCh7XHJcbiAgICAgICAgdzogMSxcclxuICAgICAgICB4OiBkZWNrUG9zaXRpb24ueCxcclxuICAgICAgICB5OiBkZWNrUG9zaXRpb24ueSxcclxuICAgICAgICB6OiAwXHJcbiAgICB9KTtcclxuXHJcbiAgICBsZXQgaSA9IDA7XHJcbiAgICBjb25zdCBmYWNlU3ByaXRlcyA9IFN0YXRlLmZhY2VTcHJpdGVzRm9yUGxheWVyW3BsYXllckluZGV4XTtcclxuICAgIGlmIChmYWNlU3ByaXRlcyA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICAgIGZvciAoY29uc3QgZmFjZVNwcml0ZSBvZiBmYWNlU3ByaXRlcykge1xyXG4gICAgICAgIGZhY2VTcHJpdGUudGFyZ2V0ID0gbmV3IFZlY3RvcihWUC5jYW52YXMud2lkdGggLyAyIC0gVlAuc3ByaXRlV2lkdGggLyAyICsgKGkrKyAtIGZhY2VTcHJpdGVzLmxlbmd0aCAvIDIpICogVlAuc3ByaXRlR2FwLCBWUC5zcHJpdGVIZWlnaHQpO1xyXG4gICAgICAgIGZhY2VTcHJpdGUuYW5pbWF0ZShkZWx0YVRpbWUpO1xyXG4gICAgfVxyXG5cclxuICAgIGkgPSAwO1xyXG4gICAgY29uc3QgYmFja1Nwcml0ZXMgPSBTdGF0ZS5iYWNrU3ByaXRlc0ZvclBsYXllcltwbGF5ZXJJbmRleF07XHJcbiAgICBpZiAoYmFja1Nwcml0ZXMgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICBmb3IgKGNvbnN0IGJhY2tTcHJpdGUgb2YgYmFja1Nwcml0ZXMpIHtcclxuICAgICAgICBiYWNrU3ByaXRlLnRhcmdldCA9IG5ldyBWZWN0b3IoVlAuY2FudmFzLndpZHRoIC8gMiAtIFZQLnNwcml0ZVdpZHRoIC8gMiArIChpKysgLSBiYWNrU3ByaXRlcy5sZW5ndGggLyAyKSAqIFZQLnNwcml0ZUdhcCwgMCk7XHJcbiAgICAgICAgYmFja1Nwcml0ZS5hbmltYXRlKGRlbHRhVGltZSk7XHJcbiAgICB9XHJcbn1cclxuXHJcbi8vIHJldHVybnMgdGhlIGFkanVzdGVkIHJldmVhbCBpbmRleFxyXG5mdW5jdGlvbiByZW5kZXJQbGF5ZXIoZ2FtZVN0YXRlOiBMaWIuR2FtZVN0YXRlKSB7XHJcbiAgICBjb25zdCBjYXJkcyA9IGdhbWVTdGF0ZS5wbGF5ZXJDYXJkcztcclxuICAgIGNvbnN0IHNwcml0ZXMgPSBTdGF0ZS5mYWNlU3ByaXRlc0ZvclBsYXllcltnYW1lU3RhdGUucGxheWVySW5kZXhdO1xyXG4gICAgaWYgKHNwcml0ZXMgPT09IHVuZGVmaW5lZCkgcmV0dXJuO1xyXG5cclxuICAgIGNvbnN0IG9sZENhcmRzID0gSlNPTi5zdHJpbmdpZnkoY2FyZHMpO1xyXG4gICAgY29uc3Qgb2xkQ2FyZHNMZW5ndGggPSBjYXJkcy5sZW5ndGg7XHJcbiAgICBjb25zdCBvbGRTcHJpdGVzID0gSlNPTi5zdHJpbmdpZnkoc3ByaXRlcyk7XHJcbiAgICBjb25zdCBvbGRTcHJpdGVzTGVuZ3RoID0gc3ByaXRlcy5sZW5ndGg7XHJcblxyXG4gICAgY29uc3QgbW92aW5nU3ByaXRlc0FuZENhcmRzOiBbU3ByaXRlLCBMaWIuQ2FyZF1bXSA9IFtdO1xyXG4gICAgY29uc3QgcmVzZXJ2ZWRTcHJpdGVzQW5kQ2FyZHM6IFtTcHJpdGUsIExpYi5DYXJkXVtdID0gW107XHJcblxyXG4gICAgbGV0IHNwbGl0SW5kZXg6IG51bWJlcjtcclxuICAgIGlmIChJbnB1dC5hY3Rpb24gIT09IFwibm9uZVwiICYmXHJcbiAgICAgICAgSW5wdXQuYWN0aW9uICE9PSBcImRyYXdGcm9tRGVja1wiICYmXHJcbiAgICAgICAgSW5wdXQuYWN0aW9uICE9PSBcIndhaXRpbmdGb3JOZXdDYXJkXCIgJiZcclxuICAgICAgICBJbnB1dC5hY3Rpb24gIT09IFwic29ydEJ5U3VpdFwiICYmXHJcbiAgICAgICAgSW5wdXQuYWN0aW9uICE9PSBcInNvcnRCeVJhbmtcIiAmJiAoXHJcbiAgICAgICAgICAgIElucHV0LmFjdGlvbi50eXBlID09PSBcInJldHVyblRvRGVja1wiIHx8XHJcbiAgICAgICAgICAgIElucHV0LmFjdGlvbi50eXBlID09PSBcImhpZGVcIiB8fFxyXG4gICAgICAgICAgICBJbnB1dC5hY3Rpb24udHlwZSA9PT0gXCJyZXZlYWxcIlxyXG4gICAgICAgIClcclxuICAgICkge1xyXG4gICAgICAgIGxldCByZXZlYWxDb3VudEFkanVzdG1lbnQgPSAwO1xyXG5cclxuICAgICAgICAvLyBleHRyYWN0IG1vdmluZyBzcHJpdGVzXHJcbiAgICAgICAgZm9yIChjb25zdCBpIG9mIFN0YXRlLnNlbGVjdGVkSW5kaWNlcykge1xyXG4gICAgICAgICAgICBjb25zdCBzcHJpdGUgPSBzcHJpdGVzW2ldO1xyXG4gICAgICAgICAgICBjb25zdCBjYXJkID0gY2FyZHNbaV07XHJcbiAgICAgICAgICAgIGlmIChzcHJpdGUgPT09IHVuZGVmaW5lZCB8fCBjYXJkID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG4gICAgICAgICAgICBtb3ZpbmdTcHJpdGVzQW5kQ2FyZHMucHVzaChbc3ByaXRlLCBjYXJkXSk7XHJcblxyXG4gICAgICAgICAgICBpZiAoaSA8IGdhbWVTdGF0ZS5wbGF5ZXJSZXZlYWxDb3VudCkge1xyXG4gICAgICAgICAgICAgICAgKytyZXZlYWxDb3VudEFkanVzdG1lbnQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGdhbWVTdGF0ZS5wbGF5ZXJSZXZlYWxDb3VudCAtPSByZXZlYWxDb3VudEFkanVzdG1lbnQ7XHJcblxyXG4gICAgICAgIC8vIGV4dHJhY3QgcmVzZXJ2ZWQgc3ByaXRlc1xyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc3ByaXRlcy5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgICAgICBpZiAoTGliLmJpbmFyeVNlYXJjaE51bWJlcihTdGF0ZS5zZWxlY3RlZEluZGljZXMsIGkpIDwgMCkge1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgc3ByaXRlID0gc3ByaXRlc1tpXTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGNhcmQgPSBjYXJkc1tpXTtcclxuICAgICAgICAgICAgICAgIGlmIChzcHJpdGUgPT09IHVuZGVmaW5lZCB8fCBjYXJkID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcigpO1xyXG4gICAgICAgICAgICAgICAgcmVzZXJ2ZWRTcHJpdGVzQW5kQ2FyZHMucHVzaChbc3ByaXRlLCBjYXJkXSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGRldGVybWluZSB3aGV0aGVyIHRoZSBtb3Zpbmcgc3ByaXRlcyBhcmUgY2xvc2VyIHRvIHRoZSByZXZlYWxlZCBzcHJpdGVzIG9yIHRvIHRoZSBoaWRkZW4gc3ByaXRlc1xyXG4gICAgICAgIGNvbnN0IHNwbGl0UmV2ZWFsZWQgPSBJbnB1dC5hY3Rpb24udHlwZSA9PT0gXCJyZXZlYWxcIjtcclxuICAgICAgICBjb25zdCBzdGFydCA9IHNwbGl0UmV2ZWFsZWQgPyAwIDogZ2FtZVN0YXRlLnBsYXllclJldmVhbENvdW50O1xyXG4gICAgICAgIGNvbnN0IGVuZCA9IHNwbGl0UmV2ZWFsZWQgPyBnYW1lU3RhdGUucGxheWVyUmV2ZWFsQ291bnQgOiByZXNlcnZlZFNwcml0ZXNBbmRDYXJkcy5sZW5ndGg7XHJcblxyXG4gICAgICAgIC8vIGZpbmQgdGhlIGhlbGQgc3ByaXRlcywgaWYgYW55LCBvdmVybGFwcGVkIGJ5IHRoZSBkcmFnZ2VkIHNwcml0ZXNcclxuICAgICAgICBjb25zdCBsZWZ0TW92aW5nU3ByaXRlID0gbW92aW5nU3ByaXRlc0FuZENhcmRzWzBdPy5bMF07XHJcbiAgICAgICAgY29uc3QgcmlnaHRNb3ZpbmdTcHJpdGUgPSBtb3ZpbmdTcHJpdGVzQW5kQ2FyZHNbbW92aW5nU3ByaXRlc0FuZENhcmRzLmxlbmd0aCAtIDFdPy5bMF07XHJcbiAgICAgICAgaWYgKGxlZnRNb3ZpbmdTcHJpdGUgPT09IHVuZGVmaW5lZCB8fCByaWdodE1vdmluZ1Nwcml0ZSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcigpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IGxlZnRJbmRleDogbnVtYmVyIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xyXG4gICAgICAgIGxldCByaWdodEluZGV4OiBudW1iZXIgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IHN0YXJ0OyBpIDwgZW5kOyArK2kpIHtcclxuICAgICAgICAgICAgY29uc3QgcmVzZXJ2ZWRTcHJpdGUgPSByZXNlcnZlZFNwcml0ZXNBbmRDYXJkc1tpXT8uWzBdO1xyXG4gICAgICAgICAgICBpZiAocmVzZXJ2ZWRTcHJpdGUgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICAgICAgICAgIC8vIHVzZSB0YXJnZXRzIGluc3RlYWQgb2YgcG9zaXRpb25zIG9yIGVsc2UgdGhlIHNwcml0ZXMgd2lsbCBcIndvYmJsZVwiXHJcbiAgICAgICAgICAgIGlmIChsZWZ0TW92aW5nU3ByaXRlLnBvc2l0aW9uLnggPCByZXNlcnZlZFNwcml0ZS50YXJnZXQueCAmJlxyXG4gICAgICAgICAgICAgICAgcmVzZXJ2ZWRTcHJpdGUudGFyZ2V0LnggPCByaWdodE1vdmluZ1Nwcml0ZS5wb3NpdGlvbi54XHJcbiAgICAgICAgICAgICkge1xyXG4gICAgICAgICAgICAgICAgaWYgKGxlZnRJbmRleCA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGVmdEluZGV4ID0gaTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICByaWdodEluZGV4ID0gaTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGxlZnRJbmRleCAhPT0gdW5kZWZpbmVkICYmIHJpZ2h0SW5kZXggIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICBjb25zdCBsZWZ0UmVzZXJ2ZWRTcHJpdGUgPSByZXNlcnZlZFNwcml0ZXNBbmRDYXJkc1tsZWZ0SW5kZXhdPy5bMF07XHJcbiAgICAgICAgICAgIGNvbnN0IHJpZ2h0UmVzZXJ2ZWRTcHJpdGUgPSByZXNlcnZlZFNwcml0ZXNBbmRDYXJkc1tyaWdodEluZGV4XT8uWzBdO1xyXG4gICAgICAgICAgICBpZiAobGVmdFJlc2VydmVkU3ByaXRlID09PSB1bmRlZmluZWQgfHwgcmlnaHRSZXNlcnZlZFNwcml0ZSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICAgICAgICAgICAgLy8gYWdhaW4sIHVzZSB0YXJnZXRzIGluc3RlYWQgb2YgcG9zaXRpb25zIHRvIGF2b2lkIFwid29iYmxpbmdcIlxyXG4gICAgICAgICAgICBjb25zdCBsZWZ0R2FwID0gbGVmdFJlc2VydmVkU3ByaXRlLnRhcmdldC54IC0gbGVmdE1vdmluZ1Nwcml0ZS5wb3NpdGlvbi54O1xyXG4gICAgICAgICAgICBjb25zdCByaWdodEdhcCA9IHJpZ2h0TW92aW5nU3ByaXRlLnBvc2l0aW9uLnggLSByaWdodFJlc2VydmVkU3ByaXRlLnRhcmdldC54O1xyXG4gICAgICAgICAgICBpZiAobGVmdEdhcCA8IHJpZ2h0R2FwKSB7XHJcbiAgICAgICAgICAgICAgICBzcGxpdEluZGV4ID0gbGVmdEluZGV4O1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgc3BsaXRJbmRleCA9IHJpZ2h0SW5kZXggKyAxO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgLy8gbm8gb3ZlcmxhcHBlZCBzcHJpdGVzLCBzbyB0aGUgaW5kZXggaXMgdGhlIGZpcnN0IHJlc2VydmVkIHNwcml0ZSB0byB0aGUgcmlnaHQgb2YgdGhlIG1vdmluZyBzcHJpdGVzXHJcbiAgICAgICAgICAgIGZvciAoc3BsaXRJbmRleCA9IHN0YXJ0OyBzcGxpdEluZGV4IDwgZW5kOyArK3NwbGl0SW5kZXgpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc2VydmVkU3ByaXRlID0gcmVzZXJ2ZWRTcHJpdGVzQW5kQ2FyZHNbc3BsaXRJbmRleF0/LlswXTtcclxuICAgICAgICAgICAgICAgIGlmIChyZXNlcnZlZFNwcml0ZSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICAgICAgICAgICAgICAgIGlmIChyaWdodE1vdmluZ1Nwcml0ZS5wb3NpdGlvbi54IDwgcmVzZXJ2ZWRTcHJpdGUudGFyZ2V0LngpIHtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gYWRqdXN0IHNlbGVjdGVkIGluZGljZXNcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IFN0YXRlLnNlbGVjdGVkSW5kaWNlcy5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgICAgICBTdGF0ZS5zZWxlY3RlZEluZGljZXNbaV0gPSBzcGxpdEluZGV4ICsgaTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGFkanVzdCB0aGUgcmV2ZWFsIGNvdW50XHJcbiAgICAgICAgaWYgKHNwbGl0SW5kZXggPCBnYW1lU3RhdGUucGxheWVyUmV2ZWFsQ291bnQgfHwgc3BsaXRJbmRleCA9PT0gZ2FtZVN0YXRlLnBsYXllclJldmVhbENvdW50ICYmIHNwbGl0UmV2ZWFsZWQpIHtcclxuICAgICAgICAgICAgZ2FtZVN0YXRlLnBsYXllclJldmVhbENvdW50ICs9IG1vdmluZ1Nwcml0ZXNBbmRDYXJkcy5sZW5ndGg7XHJcbiAgICAgICAgfVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICAvLyBldmVyeSBzcHJpdGUgaXMgcmVzZXJ2ZWRcclxuICAgICAgICBzcGxpdEluZGV4ID0gc3ByaXRlcy5sZW5ndGg7XHJcbiAgICAgICAgcmVzZXJ2ZWRTcHJpdGVzQW5kQ2FyZHMucHVzaCguLi5zcHJpdGVzLm1hcCgoc3ByaXRlLCBpbmRleCkgPT4gPFtTcHJpdGUsIExpYi5DYXJkXT5bc3ByaXRlLCBjYXJkc1tpbmRleF1dKSk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gY2xlYXIgZm9yIHJlaW5zZXJ0aW9uXHJcbiAgICBzcHJpdGVzLnNwbGljZSgwLCBzcHJpdGVzLmxlbmd0aCk7XHJcbiAgICBjYXJkcy5zcGxpY2UoMCwgY2FyZHMubGVuZ3RoKTtcclxuXHJcbiAgICBmb3IgKGNvbnN0IFtyZXNlcnZlZFNwcml0ZSwgcmVzZXJ2ZWRDYXJkXSBvZiByZXNlcnZlZFNwcml0ZXNBbmRDYXJkcykge1xyXG4gICAgICAgIGlmIChzcHJpdGVzLmxlbmd0aCA9PT0gc3BsaXRJbmRleCkge1xyXG4gICAgICAgICAgICBmb3IgKGNvbnN0IFttb3ZpbmdTcHJpdGUsIG1vdmluZ0NhcmRdIG9mIG1vdmluZ1Nwcml0ZXNBbmRDYXJkcykge1xyXG4gICAgICAgICAgICAgICAgbW92aW5nU3ByaXRlLmFuaW1hdGUoZGVsdGFUaW1lKTtcclxuICAgICAgICAgICAgICAgIHNwcml0ZXMucHVzaChtb3ZpbmdTcHJpdGUpO1xyXG4gICAgICAgICAgICAgICAgY2FyZHMucHVzaChtb3ZpbmdDYXJkKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgaSA9IHNwcml0ZXMubGVuZ3RoIDwgZ2FtZVN0YXRlLnBsYXllclJldmVhbENvdW50ID8gc3ByaXRlcy5sZW5ndGggOiBzcHJpdGVzLmxlbmd0aCAtIGdhbWVTdGF0ZS5wbGF5ZXJSZXZlYWxDb3VudDtcclxuICAgICAgICBjb25zdCBqID0gc3ByaXRlcy5sZW5ndGggPCBnYW1lU3RhdGUucGxheWVyUmV2ZWFsQ291bnQgPyBnYW1lU3RhdGUucGxheWVyUmV2ZWFsQ291bnQgOiByZXNlcnZlZFNwcml0ZXNBbmRDYXJkcy5sZW5ndGggLSBnYW1lU3RhdGUucGxheWVyUmV2ZWFsQ291bnQ7XHJcbiAgICAgICAgY29uc3QgeSA9IHNwcml0ZXMubGVuZ3RoIDwgZ2FtZVN0YXRlLnBsYXllclJldmVhbENvdW50ID8gMiAqIFZQLnNwcml0ZUhlaWdodCA6IFZQLnNwcml0ZUhlaWdodDtcclxuICAgICAgICByZXNlcnZlZFNwcml0ZS50YXJnZXQgPSBuZXcgVmVjdG9yKFxyXG4gICAgICAgICAgICBWUC5jYW52YXMud2lkdGggLyAyIC0gVlAuc3ByaXRlV2lkdGggLyAyICsgKGkgLSBqIC8gMikgKiBWUC5zcHJpdGVHYXAsXHJcbiAgICAgICAgICAgIFZQLmNhbnZhcy5oZWlnaHQgLSB5IC0gKExpYi5iaW5hcnlTZWFyY2hOdW1iZXIoU3RhdGUuc2VsZWN0ZWRJbmRpY2VzLCBzcHJpdGVzLmxlbmd0aCkgPCAwID8gMCA6IDIgKiBWUC5zcHJpdGVHYXApXHJcbiAgICAgICAgKTtcclxuXHJcbiAgICAgICAgcmVzZXJ2ZWRTcHJpdGUuYW5pbWF0ZShkZWx0YVRpbWUpO1xyXG4gICAgICAgIHNwcml0ZXMucHVzaChyZXNlcnZlZFNwcml0ZSk7XHJcbiAgICAgICAgY2FyZHMucHVzaChyZXNlcnZlZENhcmQpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChzcHJpdGVzLmxlbmd0aCA9PT0gc3BsaXRJbmRleCkge1xyXG4gICAgICAgIGZvciAoY29uc3QgW21vdmluZ1Nwcml0ZSwgbW92aW5nQ2FyZF0gb2YgbW92aW5nU3ByaXRlc0FuZENhcmRzKSB7XHJcbiAgICAgICAgICAgIG1vdmluZ1Nwcml0ZS5hbmltYXRlKGRlbHRhVGltZSk7XHJcbiAgICAgICAgICAgIHNwcml0ZXMucHVzaChtb3ZpbmdTcHJpdGUpO1xyXG4gICAgICAgICAgICBjYXJkcy5wdXNoKG1vdmluZ0NhcmQpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBpZiAoY2FyZHMubGVuZ3RoICE9PSBvbGRDYXJkc0xlbmd0aCB8fCBzcHJpdGVzLmxlbmd0aCAhPT0gb2xkU3ByaXRlc0xlbmd0aCkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgb2xkQ2FyZHM6ICR7b2xkQ2FyZHN9JHtvbGRTcHJpdGVzfVxcbm5ld0NhcmRzOiAke0pTT04uc3RyaW5naWZ5KGNhcmRzKX1cXG5vbGRTcHJpdGVzOiAke29sZFNwcml0ZXN9XFxubmV3U3ByaXRlczogJHtKU09OLnN0cmluZ2lmeShzcHJpdGVzKX1gKTtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gcmVuZGVyQnV0dG9ucygpIHtcclxuICAgIFZQLmNvbnRleHQuc2F2ZSgpO1xyXG4gICAgdHJ5IHtcclxuICAgICAgICAvLyBibHVyIGltYWdlIGJlaGluZFxyXG4gICAgICAgIC8vc3RhY2tCbHVyQ2FudmFzUkdCQSgnY2FudmFzJywgeCwgeSwgY2FudmFzLndpZHRoIC0geCwgY2FudmFzLmhlaWdodCAtIHksIDE2KTtcclxuXHJcbiAgICAgICAgY29uc3QgeCA9IFZQLnNvcnRCeVN1aXRCb3VuZHNbMF0ueCAtIDQgKiBWUC5waXhlbHNQZXJDTTtcclxuICAgICAgICBjb25zdCB5ID0gVlAuc29ydEJ5U3VpdEJvdW5kc1swXS55O1xyXG4gICAgICAgIFZQLmNvbnRleHQuZmlsbFN0eWxlID0gJyMwMGZmZmY3Nyc7XHJcbiAgICAgICAgVlAuY29udGV4dC5maWxsUmVjdCh4LCB5LCBWUC5jYW52YXMud2lkdGggLSB4LCBWUC5jYW52YXMuaGVpZ2h0IC0geSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgVlAuY29udGV4dC5maWxsU3R5bGUgPSAnIzAwMDAwMGZmJztcclxuICAgICAgICBWUC5jb250ZXh0LmZvbnQgPSAnMS41Y20gSXJyZWd1bGFyaXMnO1xyXG4gICAgICAgIFZQLmNvbnRleHQuZmlsbFRleHQoJ1NPUlQnLCB4ICsgMC4yNSAqIFZQLnBpeGVsc1BlckNNLCB5ICsgMi4yNSAqIFZQLnBpeGVsc1BlckNNKTtcclxuXHJcbiAgICAgICAgVlAuY29udGV4dC5mb250ID0gJzNjbSBJcnJlZ3VsYXJpcyc7XHJcbiAgICAgICAgVlAuY29udGV4dC5maWxsVGV4dCgneycsIHggKyAzICogVlAucGl4ZWxzUGVyQ00sIHkgKyAyLjc1ICogVlAucGl4ZWxzUGVyQ00pO1xyXG5cclxuICAgICAgICBWUC5jb250ZXh0LmZvbnQgPSAnMS41Y20gSXJyZWd1bGFyaXMnO1xyXG4gICAgICAgIFZQLmNvbnRleHQuZmlsbFRleHQoJ1NVSVQnLCBWUC5zb3J0QnlTdWl0Qm91bmRzWzBdLngsIFZQLnNvcnRCeVN1aXRCb3VuZHNbMV0ueSk7XHJcblxyXG4gICAgICAgIFZQLmNvbnRleHQuZm9udCA9ICcxLjVjbSBJcnJlZ3VsYXJpcyc7XHJcbiAgICAgICAgVlAuY29udGV4dC5maWxsVGV4dCgnUkFOSycsIFZQLnNvcnRCeVJhbmtCb3VuZHNbMF0ueCwgVlAuc29ydEJ5UmFua0JvdW5kc1sxXS55KTtcclxuXHJcbiAgICAgICAgLy9jb250ZXh0LmZpbGxTdHlsZSA9ICcjZmYwMDAwNzcnO1xyXG4gICAgICAgIC8vY29udGV4dC5maWxsUmVjdChWUC5zb3J0QnlTdWl0Qm91bmRzWzBdLngsIFZQLnNvcnRCeVN1aXRCb3VuZHNbMF0ueSxcclxuICAgICAgICAgICAgLy9zb3J0QnlTdWl0Qm91bmRzWzFdLnggLSBzb3J0QnlTdWl0Qm91bmRzWzBdLngsIHNvcnRCeVN1aXRCb3VuZHNbMV0ueSAtIHNvcnRCeVN1aXRCb3VuZHNbMF0ueSk7XHJcblxyXG4gICAgICAgIC8vY29udGV4dC5maWxsU3R5bGUgPSAnIzAwMDBmZjc3JztcclxuICAgICAgICAvL2NvbnRleHQuZmlsbFJlY3Qoc29ydEJ5UmFua0JvdW5kc1swXS54LCBzb3J0QnlSYW5rQm91bmRzWzBdLnksXHJcbiAgICAgICAgICAgIC8vc29ydEJ5UmFua0JvdW5kc1sxXS54IC0gc29ydEJ5UmFua0JvdW5kc1swXS54LCBzb3J0QnlSYW5rQm91bmRzWzFdLnkgLSBzb3J0QnlSYW5rQm91bmRzWzBdLnkpO1xyXG4gICAgfSBmaW5hbGx5IHtcclxuICAgICAgICBWUC5jb250ZXh0LnJlc3RvcmUoKTtcclxuICAgIH1cclxufVxyXG4iLCJpbXBvcnQgVmVjdG9yIGZyb20gJy4vdmVjdG9yJztcclxuaW1wb3J0ICogYXMgVlAgZnJvbSAnLi92aWV3LXBhcmFtcyc7XHJcblxyXG5jb25zdCBzcHJpbmdDb25zdGFudCA9IDEwMDA7XHJcbmNvbnN0IG1hc3MgPSAxO1xyXG5jb25zdCBkcmFnID0gTWF0aC5zcXJ0KDQgKiBtYXNzICogc3ByaW5nQ29uc3RhbnQpO1xyXG5cclxuLy8gc3RhdGUgZm9yIHBoeXNpY3MtYmFzZWQgYW5pbWF0aW9uc1xyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBTcHJpdGUge1xyXG4gICAgaW1hZ2U6IEhUTUxJbWFnZUVsZW1lbnQ7XHJcbiAgICB0YXJnZXQ6IFZlY3RvcjtcclxuICAgIHBvc2l0aW9uOiBWZWN0b3I7XHJcbiAgICB2ZWxvY2l0eTogVmVjdG9yO1xyXG5cclxuICAgIC8vYmFkID0gZmFsc2U7XHJcblxyXG4gICAgY29uc3RydWN0b3IoaW1hZ2U6IEhUTUxJbWFnZUVsZW1lbnQpIHtcclxuICAgICAgICB0aGlzLmltYWdlID0gaW1hZ2U7XHJcbiAgICAgICAgdGhpcy50YXJnZXQgPSBuZXcgVmVjdG9yKDAsIDApO1xyXG4gICAgICAgIHRoaXMucG9zaXRpb24gPSBuZXcgVmVjdG9yKDAsIDApO1xyXG4gICAgICAgIHRoaXMudmVsb2NpdHkgPSBuZXcgVmVjdG9yKDAsIDApO1xyXG4gICAgfVxyXG5cclxuICAgIGFuaW1hdGUoZGVsdGFUaW1lOiBudW1iZXIpIHtcclxuICAgICAgICBjb25zdCBzcHJpbmdGb3JjZSA9IHRoaXMudGFyZ2V0LnN1Yih0aGlzLnBvc2l0aW9uKS5zY2FsZShzcHJpbmdDb25zdGFudCk7XHJcbiAgICAgICAgY29uc3QgZHJhZ0ZvcmNlID0gdGhpcy52ZWxvY2l0eS5zY2FsZSgtZHJhZyk7XHJcbiAgICAgICAgY29uc3QgYWNjZWxlcmF0aW9uID0gc3ByaW5nRm9yY2UuYWRkKGRyYWdGb3JjZSkuc2NhbGUoMSAvIG1hc3MpO1xyXG5cclxuICAgICAgICAvL2NvbnN0IHNhdmVkVmVsb2NpdHkgPSB0aGlzLnZlbG9jaXR5O1xyXG4gICAgICAgIC8vY29uc3Qgc2F2ZWRQb3NpdGlvbiA9IHRoaXMucG9zaXRpb247XHJcbiAgICAgICAgXHJcbiAgICAgICAgdGhpcy52ZWxvY2l0eSA9IHRoaXMudmVsb2NpdHkuYWRkKGFjY2VsZXJhdGlvbi5zY2FsZShkZWx0YVRpbWUgLyAxMDAwKSk7XHJcbiAgICAgICAgdGhpcy5wb3NpdGlvbiA9IHRoaXMucG9zaXRpb24uYWRkKHRoaXMudmVsb2NpdHkuc2NhbGUoZGVsdGFUaW1lIC8gMTAwMCkpO1xyXG5cclxuICAgICAgICAvKlxyXG4gICAgICAgIGlmICghdGhpcy5iYWQgJiYgKFxyXG4gICAgICAgICAgICAhaXNGaW5pdGUodGhpcy52ZWxvY2l0eS54KSB8fCBpc05hTih0aGlzLnZlbG9jaXR5LngpIHx8XHJcbiAgICAgICAgICAgICFpc0Zpbml0ZSh0aGlzLnZlbG9jaXR5LnkpIHx8IGlzTmFOKHRoaXMudmVsb2NpdHkueSkgfHxcclxuICAgICAgICAgICAgIWlzRmluaXRlKHRoaXMucG9zaXRpb24ueCkgfHwgaXNOYU4odGhpcy5wb3NpdGlvbi54KSB8fFxyXG4gICAgICAgICAgICAhaXNGaW5pdGUodGhpcy5wb3NpdGlvbi55KSB8fCBpc05hTih0aGlzLnBvc2l0aW9uLnkpXHJcbiAgICAgICAgKSkge1xyXG4gICAgICAgICAgICB0aGlzLmJhZCA9IHRydWU7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgZGVsdGFUaW1lOiAke2RlbHRhVGltZX0sIHNwcmluZ0ZvcmNlOiAke0pTT04uc3RyaW5naWZ5KHNwcmluZ0ZvcmNlKX0sIGRyYWdGb3JjZTogJHtKU09OLnN0cmluZ2lmeShkcmFnRm9yY2UpfWApO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgdGFyZ2V0OiAke0pTT04uc3RyaW5naWZ5KHRoaXMudGFyZ2V0KX0sIHBvc2l0aW9uOiAke0pTT04uc3RyaW5naWZ5KHNhdmVkUG9zaXRpb24pfSwgdmVsb2NpdHk6ICR7SlNPTi5zdHJpbmdpZnkoc2F2ZWRWZWxvY2l0eSl9LCBhY2NlbGVyYXRpb246ICR7SlNPTi5zdHJpbmdpZnkoYWNjZWxlcmF0aW9uKX1gKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coYG5ldyBwb3NpdGlvbjogJHtKU09OLnN0cmluZ2lmeSh0aGlzLnBvc2l0aW9uKX0sIG5ldyB2ZWxvY2l0eTogJHtKU09OLnN0cmluZ2lmeSh0aGlzLnZlbG9jaXR5KX1gKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgKi9cclxuXHJcbiAgICAgICAgVlAuY29udGV4dC5kcmF3SW1hZ2UodGhpcy5pbWFnZSwgdGhpcy5wb3NpdGlvbi54LCB0aGlzLnBvc2l0aW9uLnksIFZQLnNwcml0ZVdpZHRoLCBWUC5zcHJpdGVIZWlnaHQpO1xyXG4gICAgfVxyXG59IiwiaW1wb3J0IHsgTXV0ZXggfSBmcm9tICdhd2FpdC1zZW1hcGhvcmUnO1xyXG5cclxuaW1wb3J0ICogYXMgTGliIGZyb20gJy4uL2xpYic7XHJcbmltcG9ydCAqIGFzIENhcmRJbWFnZXMgZnJvbSAnLi9jYXJkLWltYWdlcyc7XHJcbmltcG9ydCBTcHJpdGUgZnJvbSAnLi9zcHJpdGUnO1xyXG5cclxuY29uc3QgcGxheWVyTmFtZUZyb21Db29raWUgPSBMaWIuZ2V0Q29va2llKCdwbGF5ZXJOYW1lJyk7XHJcbmlmIChwbGF5ZXJOYW1lRnJvbUNvb2tpZSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoJ05vIHBsYXllciBuYW1lIScpO1xyXG5leHBvcnQgY29uc3QgcGxheWVyTmFtZSA9IHBsYXllck5hbWVGcm9tQ29va2llO1xyXG5cclxuY29uc3QgZ2FtZUlkRnJvbUNvb2tpZSA9IExpYi5nZXRDb29raWUoJ2dhbWVJZCcpO1xyXG5pZiAoZ2FtZUlkRnJvbUNvb2tpZSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoJ05vIGdhbWUgaWQhJyk7XHJcbmV4cG9ydCBjb25zdCBnYW1lSWQgPSBnYW1lSWRGcm9tQ29va2llO1xyXG5cclxuLy8gc29tZSBzdGF0ZS1tYW5pcHVsYXRpbmcgb3BlcmF0aW9ucyBhcmUgYXN5bmNocm9ub3VzLCBzbyB3ZSBuZWVkIHRvIGd1YXJkIGFnYWluc3QgcmFjZXNcclxuY29uc3Qgc3RhdGVNdXRleCA9IG5ldyBNdXRleCgpO1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbG9jaygpOiBQcm9taXNlPCgpID0+IHZvaWQ+IHtcclxuICAgIC8vY29uc29sZS5sb2coYGFjcXVpcmluZyBzdGF0ZSBsb2NrLi4uXFxuJHtuZXcgRXJyb3IoKS5zdGFja31gKTtcclxuICAgIGNvbnN0IHJlbGVhc2UgPSBhd2FpdCBzdGF0ZU11dGV4LmFjcXVpcmUoKTtcclxuICAgIC8vY29uc29sZS5sb2coYGFjcXVpcmVkIHN0YXRlIGxvY2tcXG4ke25ldyBFcnJvcigpLnN0YWNrfWApO1xyXG4gICAgcmV0dXJuICgpID0+IHtcclxuICAgICAgICByZWxlYXNlKCk7XHJcbiAgICAgICAgLy9jb25zb2xlLmxvZyhgcmVsZWFzZWQgc3RhdGUgbG9ja2ApO1xyXG4gICAgfVxyXG59XHJcblxyXG4vLyB3ZSBuZWVkIHRvIGtlZXAgYSBjb3B5IG9mIHRoZSBwcmV2aW91cyBnYW1lIHN0YXRlIGFyb3VuZCBmb3IgYm9va2tlZXBpbmcgcHVycG9zZXNcclxuZXhwb3J0IGxldCBwcmV2aW91c0dhbWVTdGF0ZTogTGliLkdhbWVTdGF0ZSB8IHVuZGVmaW5lZDtcclxuLy8gdGhlIG1vc3QgcmVjZW50bHkgcmVjZWl2ZWQgZ2FtZSBzdGF0ZSwgaWYgYW55XHJcbmV4cG9ydCBsZXQgZ2FtZVN0YXRlOiBMaWIuR2FtZVN0YXRlIHwgdW5kZWZpbmVkO1xyXG5cclxuLy8gaW5kaWNlcyBvZiBjYXJkcyBmb3IgZHJhZyAmIGRyb3BcclxuLy8gSU1QT1JUQU5UOiB0aGlzIGFycmF5IG11c3QgYWx3YXlzIGJlIHNvcnRlZCFcclxuLy8gQWx3YXlzIHVzZSBiaW5hcnlTZWFyY2ggdG8gaW5zZXJ0IGFuZCBkZWxldGUgb3Igc29ydCBhZnRlciBtYW5pcHVsYXRpb25cclxuZXhwb3J0IGNvbnN0IHNlbGVjdGVkSW5kaWNlczogbnVtYmVyW10gPSBbXTtcclxuXHJcbi8vIGZvciBhbmltYXRpbmcgdGhlIGRlY2tcclxuZXhwb3J0IGxldCBkZWNrU3ByaXRlczogU3ByaXRlW10gPSBbXTtcclxuXHJcbi8vIGFzc29jaWF0aXZlIGFycmF5cywgb25lIGZvciBlYWNoIHBsYXllciBhdCB0aGVpciBwbGF5ZXIgaW5kZXhcclxuLy8gZWFjaCBlbGVtZW50IGNvcnJlc3BvbmRzIHRvIGEgZmFjZS1kb3duIGNhcmQgYnkgaW5kZXhcclxuZXhwb3J0IGxldCBiYWNrU3ByaXRlc0ZvclBsYXllcjogU3ByaXRlW11bXSA9IFtdO1xyXG4vLyBlYWNoIGVsZW1lbnQgY29ycmVzcG9uZHMgdG8gYSBmYWNlLXVwIGNhcmQgYnkgaW5kZXhcclxuZXhwb3J0IGxldCBmYWNlU3ByaXRlc0ZvclBsYXllcjogU3ByaXRlW11bXSA9IFtdO1xyXG5cclxuLy8gb3BlbiB3ZWJzb2NrZXQgY29ubmVjdGlvbiB0byBnZXQgZ2FtZSBzdGF0ZSB1cGRhdGVzXHJcbmxldCB3cyA9IG5ldyBXZWJTb2NrZXQoYHdzczovLyR7d2luZG93LmxvY2F0aW9uLmhvc3RuYW1lfS9gKTtcclxuXHJcbmNvbnN0IGNhbGxiYWNrc0Zvck1ldGhvZE5hbWUgPSBuZXcgTWFwPHN0cmluZywgKChyZXN1bHQ6IExpYi5NZXRob2RSZXN1bHQpID0+IHZvaWQpW10+KCk7XHJcblxyXG5mdW5jdGlvbiBhZGRDYWxsYmFjayhtZXRob2ROYW1lOiBzdHJpbmcsIGNhbGxiYWNrOiAocmVzdWx0OiBMaWIuTWV0aG9kUmVzdWx0KSA9PiB2b2lkKSB7XHJcbiAgICBsZXQgY2FsbGJhY2tzID0gY2FsbGJhY2tzRm9yTWV0aG9kTmFtZS5nZXQobWV0aG9kTmFtZSk7XHJcbiAgICBpZiAoY2FsbGJhY2tzID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICBjYWxsYmFja3MgPSBbXTtcclxuICAgICAgICBjYWxsYmFja3NGb3JNZXRob2ROYW1lLnNldChtZXRob2ROYW1lLCBjYWxsYmFja3MpO1xyXG4gICAgfVxyXG5cclxuICAgIGNhbGxiYWNrcy5wdXNoKGNhbGxiYWNrKTtcclxufVxyXG5cclxud3Mub25tZXNzYWdlID0gYXN5bmMgZSA9PiB7XHJcbiAgICBjb25zdCBvYmogPSBKU09OLnBhcnNlKGUuZGF0YSk7XHJcbiAgICBpZiAoJ21ldGhvZE5hbWUnIGluIG9iaikge1xyXG4gICAgICAgIGNvbnN0IHJldHVybk1lc3NhZ2UgPSA8TGliLk1ldGhvZFJlc3VsdD5vYmo7XHJcbiAgICAgICAgY29uc3QgbWV0aG9kTmFtZSA9IHJldHVybk1lc3NhZ2UubWV0aG9kTmFtZTtcclxuICAgICAgICBjb25zdCBjYWxsYmFja3MgPSBjYWxsYmFja3NGb3JNZXRob2ROYW1lLmdldChtZXRob2ROYW1lKTtcclxuICAgICAgICBpZiAoY2FsbGJhY2tzID09PSB1bmRlZmluZWQgfHwgY2FsbGJhY2tzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYG5vIGNhbGxiYWNrcyBmb3VuZCBmb3IgbWV0aG9kOiAke21ldGhvZE5hbWV9YCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBjYWxsYmFjayA9IGNhbGxiYWNrcy5zaGlmdCgpO1xyXG4gICAgICAgIGlmIChjYWxsYmFjayA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgY2FsbGJhY2sgaXMgdW5kZWZpbmVkIGZvciBtZXRob2Q6ICR7bWV0aG9kTmFtZX1gKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgY2FsbGJhY2socmV0dXJuTWVzc2FnZSk7XHJcbiAgICB9IGVsc2UgaWYgKFxyXG4gICAgICAgICdkZWNrQ291bnQnIGluIG9iaiAmJlxyXG4gICAgICAgICdhY3RpdmVQbGF5ZXJJbmRleCcgaW4gb2JqICYmXHJcbiAgICAgICAgJ3BsYXllckluZGV4JyBpbiBvYmogJiZcclxuICAgICAgICAncGxheWVyQ2FyZHMnIGluIG9iaiAmJlxyXG4gICAgICAgICdwbGF5ZXJSZXZlYWxDb3VudCcgaW4gb2JqICYmXHJcbiAgICAgICAgJ290aGVyUGxheWVycycgaW4gb2JqXHJcbiAgICApIHtcclxuICAgICAgICBjb25zdCB1bmxvY2sgPSBhd2FpdCBsb2NrKCk7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgcHJldmlvdXNHYW1lU3RhdGUgPSBnYW1lU3RhdGU7XHJcbiAgICAgICAgICAgIGdhbWVTdGF0ZSA9IDxMaWIuR2FtZVN0YXRlPm9iajtcclxuXHJcbiAgICAgICAgICAgIC8vIHNlbGVjdGVkIGluZGljZXMgbWlnaHQgaGF2ZSBzaGlmdGVkXHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2VsZWN0ZWRJbmRpY2VzLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBzZWxlY3RlZEluZGV4ID0gc2VsZWN0ZWRJbmRpY2VzW2ldO1xyXG4gICAgICAgICAgICAgICAgaWYgKHNlbGVjdGVkSW5kZXggPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKEpTT04uc3RyaW5naWZ5KGdhbWVTdGF0ZS5wbGF5ZXJDYXJkc1tzZWxlY3RlZEluZGV4XSkgIT09IEpTT04uc3RyaW5naWZ5KHByZXZpb3VzR2FtZVN0YXRlPy5wbGF5ZXJDYXJkc1tzZWxlY3RlZEluZGV4XSkpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgZm91bmQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGdhbWVTdGF0ZS5wbGF5ZXJDYXJkcy5sZW5ndGg7ICsraikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoSlNPTi5zdHJpbmdpZnkoZ2FtZVN0YXRlLnBsYXllckNhcmRzW2pdKSA9PT0gSlNPTi5zdHJpbmdpZnkocHJldmlvdXNHYW1lU3RhdGU/LnBsYXllckNhcmRzW3NlbGVjdGVkSW5kZXhdKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWRJbmRpY2VzW2ldID0gajtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvdW5kID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoIWZvdW5kKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkSW5kaWNlcy5zcGxpY2UoaSwgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC0taTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIGJpbmFyeSBzZWFyY2ggc3RpbGwgbmVlZHMgdG8gd29ya1xyXG4gICAgICAgICAgICBzZWxlY3RlZEluZGljZXMuc29ydCgoYSwgYikgPT4gYSAtIGIpO1xyXG5cclxuICAgICAgICAgICAgLy8gaW5pdGlhbGl6ZSBhbmltYXRpb24gc3RhdGVzXHJcbiAgICAgICAgICAgIGFzc29jaWF0ZUFuaW1hdGlvbnNXaXRoQ2FyZHMocHJldmlvdXNHYW1lU3RhdGUsIGdhbWVTdGF0ZSk7XHJcbiAgICAgICAgfSBmaW5hbGx5IHtcclxuICAgICAgICAgICAgdW5sb2NrKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoSlNPTi5zdHJpbmdpZnkoZS5kYXRhKSk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5sZXQgb25BbmltYXRpb25zQXNzb2NpYXRlZCA9ICgpID0+IHt9O1xyXG5cclxuZnVuY3Rpb24gYXNzb2NpYXRlQW5pbWF0aW9uc1dpdGhDYXJkcyhwcmV2aW91c0dhbWVTdGF0ZTogTGliLkdhbWVTdGF0ZSB8IHVuZGVmaW5lZCwgZ2FtZVN0YXRlOiBMaWIuR2FtZVN0YXRlKSB7XHJcbiAgICBkZWNrU3ByaXRlcy5zcGxpY2UoZ2FtZVN0YXRlLmRlY2tDb3VudCwgZGVja1Nwcml0ZXMubGVuZ3RoIC0gZ2FtZVN0YXRlLmRlY2tDb3VudCk7XHJcbiAgICBmb3IgKGxldCBpID0gZGVja1Nwcml0ZXMubGVuZ3RoOyBpIDwgZ2FtZVN0YXRlLmRlY2tDb3VudDsgKytpKSB7XHJcbiAgICAgICAgZGVja1Nwcml0ZXNbaV0gPSBuZXcgU3ByaXRlKENhcmRJbWFnZXMuZ2V0KCdCYWNrMCcpKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBwcmV2aW91c0JhY2tTcHJpdGVzRm9yUGxheWVyID0gYmFja1Nwcml0ZXNGb3JQbGF5ZXI7XHJcbiAgICBiYWNrU3ByaXRlc0ZvclBsYXllciA9IFtdO1xyXG5cclxuICAgIC8vIHJldXNlIHByZXZpb3VzIGZhY2Ugc3ByaXRlcyBhcyBtdWNoIGFzIHBvc3NpYmxlIHRvIG1haW50YWluIGNvbnRpbnVpdHlcclxuICAgIGNvbnN0IHByZXZpb3VzRmFjZVNwcml0ZXNGb3JQbGF5ZXIgPSBmYWNlU3ByaXRlc0ZvclBsYXllcjtcclxuICAgIGZhY2VTcHJpdGVzRm9yUGxheWVyID0gW107XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCA0OyArK2kpIHtcclxuICAgICAgICBsZXQgcHJldmlvdXNGYWNlQ2FyZHM6IExpYi5DYXJkW107XHJcbiAgICAgICAgbGV0IGZhY2VDYXJkczogTGliLkNhcmRbXTtcclxuXHJcbiAgICAgICAgbGV0IHByZXZpb3VzQmFja1Nwcml0ZXM6IFNwcml0ZVtdID0gcHJldmlvdXNCYWNrU3ByaXRlc0ZvclBsYXllcltpXSA/PyBbXTtcclxuICAgICAgICBsZXQgYmFja1Nwcml0ZXM6IFNwcml0ZVtdID0gW107XHJcbiAgICAgICAgYmFja1Nwcml0ZXNGb3JQbGF5ZXJbaV0gPSBiYWNrU3ByaXRlcztcclxuICAgICAgICBpZiAoaSA9PSBnYW1lU3RhdGUucGxheWVySW5kZXgpIHtcclxuICAgICAgICAgICAgcHJldmlvdXNGYWNlQ2FyZHMgPSBwcmV2aW91c0dhbWVTdGF0ZT8ucGxheWVyQ2FyZHMgPz8gW107XHJcbiAgICAgICAgICAgIGZhY2VDYXJkcyA9IGdhbWVTdGF0ZS5wbGF5ZXJDYXJkcztcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBsZXQgcHJldmlvdXNPdGhlclBsYXllciA9IHByZXZpb3VzR2FtZVN0YXRlPy5vdGhlclBsYXllcnNbaV07XHJcbiAgICAgICAgICAgIGxldCBvdGhlclBsYXllciA9IGdhbWVTdGF0ZS5vdGhlclBsYXllcnNbaV07XHJcblxyXG4gICAgICAgICAgICBwcmV2aW91c0ZhY2VDYXJkcyA9IHByZXZpb3VzT3RoZXJQbGF5ZXI/LnJldmVhbGVkQ2FyZHMgPz8gW107ICBcclxuICAgICAgICAgICAgZmFjZUNhcmRzID0gb3RoZXJQbGF5ZXI/LnJldmVhbGVkQ2FyZHMgPz8gW107XHJcblxyXG4gICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IChvdGhlclBsYXllcj8uY2FyZENvdW50ID8/IDApIC0gKG90aGVyUGxheWVyPy5yZXZlYWxlZENhcmRzPy5sZW5ndGggPz8gMCk7ICsraikge1xyXG4gICAgICAgICAgICAgICAgYmFja1Nwcml0ZXNbal0gPSBuZXcgU3ByaXRlKENhcmRJbWFnZXMuZ2V0KGBCYWNrJHtpfWApKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IHByZXZpb3VzRmFjZVNwcml0ZXM6IFNwcml0ZVtdID0gcHJldmlvdXNGYWNlU3ByaXRlc0ZvclBsYXllcltpXSA/PyBbXTtcclxuICAgICAgICBsZXQgZmFjZVNwcml0ZXM6IFNwcml0ZVtdID0gW107XHJcbiAgICAgICAgZmFjZVNwcml0ZXNGb3JQbGF5ZXJbaV0gPSBmYWNlU3ByaXRlcztcclxuICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGZhY2VDYXJkcy5sZW5ndGg7ICsraikge1xyXG4gICAgICAgICAgICBsZXQgZm91bmQgPSBmYWxzZTtcclxuICAgICAgICAgICAgZm9yIChsZXQgayA9IDA7IGsgPCBwcmV2aW91c0ZhY2VDYXJkcy5sZW5ndGg7ICsraykge1xyXG4gICAgICAgICAgICAgICAgaWYgKEpTT04uc3RyaW5naWZ5KGZhY2VDYXJkc1tqXSkgPT09IEpTT04uc3RyaW5naWZ5KHByZXZpb3VzRmFjZUNhcmRzW2tdKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHByZXZpb3VzRmFjZVNwcml0ZSA9IHByZXZpb3VzRmFjZVNwcml0ZXNba107XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHByZXZpb3VzRmFjZVNwcml0ZSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICAgICAgICAgICAgICAgICAgICBmYWNlU3ByaXRlc1tqXSA9IHByZXZpb3VzRmFjZVNwcml0ZTtcclxuICAgICAgICAgICAgICAgICAgICAvLyByZW1vdmUgdG8gYXZvaWQgYXNzb2NpYXRpbmcgYW5vdGhlciBzcHJpdGUgd2l0aCB0aGUgc2FtZSBjYXJkXHJcbiAgICAgICAgICAgICAgICAgICAgcHJldmlvdXNGYWNlU3ByaXRlcy5zcGxpY2UoaywgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcHJldmlvdXNGYWNlQ2FyZHMuc3BsaWNlKGssIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIGZvdW5kID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKCFmb3VuZCkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZmFjZUNhcmQgPSBmYWNlQ2FyZHNbal07XHJcbiAgICAgICAgICAgICAgICBpZiAoZmFjZUNhcmQgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICAgICAgICAgICAgICBmYWNlU3ByaXRlc1tqXSA9IG5ldyBTcHJpdGUoQ2FyZEltYWdlcy5nZXQoSlNPTi5zdHJpbmdpZnkoZmFjZUNhcmQpKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgb25BbmltYXRpb25zQXNzb2NpYXRlZCgpO1xyXG59XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gam9pbkdhbWUoZ2FtZUlkOiBzdHJpbmcsIHBsYXllck5hbWU6IHN0cmluZykge1xyXG4gICAgLy8gd2FpdCBmb3IgY29ubmVjdGlvblxyXG4gICAgZG8ge1xyXG4gICAgICAgIGF3YWl0IExpYi5kZWxheSgxMDAwKTtcclxuICAgICAgICBjb25zb2xlLmxvZyhgd3MucmVhZHlTdGF0ZTogJHt3cy5yZWFkeVN0YXRlfSwgV2ViU29ja2V0Lk9QRU46ICR7V2ViU29ja2V0Lk9QRU59YCk7XHJcbiAgICB9IHdoaWxlICh3cy5yZWFkeVN0YXRlICE9IFdlYlNvY2tldC5PUEVOKTtcclxuXHJcbiAgICAvLyB0cnkgdG8gam9pbiB0aGUgZ2FtZVxyXG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgbmV3IFByb21pc2U8TGliLk1ldGhvZFJlc3VsdD4ocmVzb2x2ZSA9PiB7XHJcbiAgICAgICAgYWRkQ2FsbGJhY2soJ2pvaW5HYW1lJywgcmVzb2x2ZSk7XHJcbiAgICAgICAgd3Muc2VuZChKU09OLnN0cmluZ2lmeSg8TGliLkpvaW5HYW1lTWVzc2FnZT57IGdhbWVJZCwgcGxheWVyTmFtZSB9KSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpZiAocmVzdWx0LmVycm9yRGVzY3JpcHRpb24gIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIHdpbmRvdy5hbGVydChyZXN1bHQuZXJyb3JEZXNjcmlwdGlvbik7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKHJlc3VsdC5lcnJvckRlc2NyaXB0aW9uKTtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGRyYXdDYXJkKCkge1xyXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPExpYi5NZXRob2RSZXN1bHQ+KHJlc29sdmUgPT4ge1xyXG4gICAgICAgIGFkZENhbGxiYWNrKCdkcmF3Q2FyZCcsIHJlc3VsdCA9PiB7XHJcbiAgICAgICAgICAgIGlmIChyZXN1bHQuZXJyb3JEZXNjcmlwdGlvbiAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBvbkFuaW1hdGlvbnNBc3NvY2lhdGVkID0gKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIG9uQW5pbWF0aW9uc0Fzc29jaWF0ZWQgPSAoKSA9PiB7fTtcclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHdzLnNlbmQoSlNPTi5zdHJpbmdpZnkoPExpYi5EcmF3Q2FyZE1lc3NhZ2U+e1xyXG4gICAgICAgICAgICBkcmF3Q2FyZDogbnVsbFxyXG4gICAgICAgIH0pKTtcclxuICAgIH0pO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmV0dXJuQ2FyZHNUb0RlY2soZ2FtZVN0YXRlOiBMaWIuR2FtZVN0YXRlKSB7XHJcbiAgICByZXR1cm4gbmV3IFByb21pc2U8TGliLk1ldGhvZFJlc3VsdD4ocmVzb2x2ZSA9PiB7XHJcbiAgICAgICAgYWRkQ2FsbGJhY2soJ2NhcmRzVG9SZXR1cm5Ub0RlY2snLCByZXNvbHZlKTtcclxuICAgICAgICB3cy5zZW5kKEpTT04uc3RyaW5naWZ5KDxMaWIuUmV0dXJuQ2FyZHNUb0RlY2tNZXNzYWdlPntcclxuICAgICAgICAgICAgY2FyZHNUb1JldHVyblRvRGVjazogc2VsZWN0ZWRJbmRpY2VzLm1hcChpID0+IGdhbWVTdGF0ZS5wbGF5ZXJDYXJkc1tpXSlcclxuICAgICAgICB9KSk7XHJcbiAgICB9KVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmVvcmRlckNhcmRzKGdhbWVTdGF0ZTogTGliLkdhbWVTdGF0ZSkge1xyXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPExpYi5NZXRob2RSZXN1bHQ+KHJlc29sdmUgPT4ge1xyXG4gICAgICAgIGFkZENhbGxiYWNrKCdyZW9yZGVyQ2FyZHMnLCByZXNvbHZlKTtcclxuICAgICAgICB3cy5zZW5kKEpTT04uc3RyaW5naWZ5KDxMaWIuUmVvcmRlckNhcmRzTWVzc2FnZT57XHJcbiAgICAgICAgICAgIHJlb3JkZXJlZENhcmRzOiBnYW1lU3RhdGUucGxheWVyQ2FyZHMsXHJcbiAgICAgICAgICAgIG5ld1JldmVhbENvdW50OiBnYW1lU3RhdGUucGxheWVyUmV2ZWFsQ291bnRcclxuICAgICAgICB9KSk7XHJcbiAgICB9KVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc29ydEJ5U3VpdChnYW1lU3RhdGU6IExpYi5HYW1lU3RhdGUpIHtcclxuICAgIGxldCBjb21wYXJlRm4gPSAoW2FTdWl0LCBhUmFua106IExpYi5DYXJkLCBbYlN1aXQsIGJSYW5rXTogTGliLkNhcmQpID0+IHtcclxuICAgICAgICBpZiAoYVN1aXQgIT09IGJTdWl0KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBhU3VpdCAtIGJTdWl0O1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHJldHVybiBhUmFuayAtIGJSYW5rO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgc29ydENhcmRzKGdhbWVTdGF0ZS5wbGF5ZXJDYXJkcywgMCwgZ2FtZVN0YXRlLnBsYXllclJldmVhbENvdW50LCBjb21wYXJlRm4pO1xyXG4gICAgc29ydENhcmRzKGdhbWVTdGF0ZS5wbGF5ZXJDYXJkcywgZ2FtZVN0YXRlLnBsYXllclJldmVhbENvdW50LCBnYW1lU3RhdGUucGxheWVyQ2FyZHMubGVuZ3RoLCBjb21wYXJlRm4pO1xyXG4gICAgcmV0dXJuIHJlb3JkZXJDYXJkcyhnYW1lU3RhdGUpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc29ydEJ5UmFuayhnYW1lU3RhdGU6IExpYi5HYW1lU3RhdGUpIHtcclxuICAgIGxldCBjb21wYXJlRm4gPSAoW2FTdWl0LCBhUmFua106IExpYi5DYXJkLCBbYlN1aXQsIGJSYW5rXTogTGliLkNhcmQpID0+IHtcclxuICAgICAgICBpZiAoYVJhbmsgIT09IGJSYW5rKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBhUmFuayAtIGJSYW5rO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHJldHVybiBhU3VpdCAtIGJTdWl0O1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgcHJldmlvdXNHYW1lU3RhdGUgPSA8TGliLkdhbWVTdGF0ZT5KU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGdhbWVTdGF0ZSkpO1xyXG4gICAgc29ydENhcmRzKGdhbWVTdGF0ZS5wbGF5ZXJDYXJkcywgMCwgZ2FtZVN0YXRlLnBsYXllclJldmVhbENvdW50LCBjb21wYXJlRm4pO1xyXG4gICAgc29ydENhcmRzKGdhbWVTdGF0ZS5wbGF5ZXJDYXJkcywgZ2FtZVN0YXRlLnBsYXllclJldmVhbENvdW50LCBnYW1lU3RhdGUucGxheWVyQ2FyZHMubGVuZ3RoLCBjb21wYXJlRm4pO1xyXG4gICAgYXNzb2NpYXRlQW5pbWF0aW9uc1dpdGhDYXJkcyhnYW1lU3RhdGUsIHByZXZpb3VzR2FtZVN0YXRlKTtcclxuICAgIHJldHVybiByZW9yZGVyQ2FyZHMoZ2FtZVN0YXRlKTtcclxufVxyXG5cclxuZnVuY3Rpb24gc29ydENhcmRzKFxyXG4gICAgY2FyZHM6IExpYi5DYXJkW10sXHJcbiAgICBzdGFydDogbnVtYmVyLFxyXG4gICAgZW5kOiBudW1iZXIsXHJcbiAgICBjb21wYXJlRm46IChhOiBMaWIuQ2FyZCwgYjogTGliLkNhcmQpID0+IG51bWJlclxyXG4pIHtcclxuICAgIGNhcmRzLnNwbGljZShzdGFydCwgZW5kIC0gc3RhcnQsIC4uLmNhcmRzLnNsaWNlKHN0YXJ0LCBlbmQpLnNvcnQoY29tcGFyZUZuKSk7XHJcbn1cclxuIiwiZXhwb3J0IGRlZmF1bHQgY2xhc3MgVmVjdG9yIHtcclxuICAgIHJlYWRvbmx5IHg6IG51bWJlciA9IDA7XHJcbiAgICByZWFkb25seSB5OiBudW1iZXIgPSAwO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKHg6IG51bWJlciwgeTogbnVtYmVyKSB7XHJcbiAgICAgICAgdGhpcy54ID0geDtcclxuICAgICAgICB0aGlzLnkgPSB5O1xyXG4gICAgfVxyXG5cclxuICAgIC8qXHJcbiAgICBhc3NpZ24odjogVmVjdG9yKSB7XHJcbiAgICAgICAgdGhpcy54ID0gdi54O1xyXG4gICAgICAgIHRoaXMueSA9IHYueTtcclxuICAgIH1cclxuICAgICovXHJcblxyXG4gICAgYWRkKHY6IFZlY3Rvcikge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjdG9yKHRoaXMueCArIHYueCwgdGhpcy55ICsgdi55KTtcclxuICAgIH1cclxuXHJcbiAgICAvKlxyXG4gICAgYWRkU2VsZih2OiBWZWN0b3IpIHtcclxuICAgICAgICB0aGlzLnggKz0gdi54O1xyXG4gICAgICAgIHRoaXMueSArPSB2Lnk7XHJcbiAgICB9XHJcbiAgICAqL1xyXG4gICAgXHJcbiAgICBzdWIodjogVmVjdG9yKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWN0b3IodGhpcy54IC0gdi54LCB0aGlzLnkgLSB2LnkpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qXHJcbiAgICBzdWJTZWxmKHY6IFZlY3Rvcikge1xyXG4gICAgICAgIHRoaXMueCAtPSB2Lng7XHJcbiAgICAgICAgdGhpcy55IC09IHYueTtcclxuICAgIH1cclxuICAgICovXHJcbiAgICBcclxuICAgIGdldCBsZW5ndGgoKSB7XHJcbiAgICAgICAgcmV0dXJuIE1hdGguc3FydCh0aGlzLnggKiB0aGlzLnggKyB0aGlzLnkgKiB0aGlzLnkpO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBkaXN0YW5jZSh2OiBWZWN0b3IpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLnN1Yih2KS5sZW5ndGg7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHNjYWxlKHM6IG51bWJlcik6IFZlY3RvciB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWN0b3IocyAqIHRoaXMueCwgcyAqIHRoaXMueSk7XHJcbiAgICB9XHJcblxyXG4gICAgLypcclxuICAgIHNjYWxlU2VsZihzOiBudW1iZXIpIHtcclxuICAgICAgICB0aGlzLnggKj0gcztcclxuICAgICAgICB0aGlzLnkgKj0gcztcclxuICAgIH1cclxuICAgICovXHJcbn0iLCJpbXBvcnQgVmVjdG9yIGZyb20gJy4vdmVjdG9yJztcclxuXHJcbmV4cG9ydCBjb25zdCBjYW52YXMgPSA8SFRNTENhbnZhc0VsZW1lbnQ+ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NhbnZhcycpO1xyXG5leHBvcnQgY29uc3QgY29udGV4dCA9IDxDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQ+Y2FudmFzLmdldENvbnRleHQoJzJkJyk7XHJcblxyXG4vLyBnZXQgcGl4ZWxzIHBlciBjZW50aW1ldGVyLCB3aGljaCBpcyBjb25zdGFudFxyXG5jb25zdCB0ZXN0RWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xyXG50ZXN0RWxlbWVudC5zdHlsZS53aWR0aCA9ICcxY20nO1xyXG5kb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHRlc3RFbGVtZW50KTtcclxuZXhwb3J0IGNvbnN0IHBpeGVsc1BlckNNID0gdGVzdEVsZW1lbnQub2Zmc2V0V2lkdGg7XHJcbmRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQodGVzdEVsZW1lbnQpO1xyXG5cclxuLy8gdGhlc2UgcGFyYW1ldGVycyBjaGFuZ2Ugd2l0aCByZXNpemluZ1xyXG5leHBvcnQgbGV0IGNhbnZhc1JlY3QgPSBjYW52YXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcbmV4cG9ydCBsZXQgcGl4ZWxzUGVyUGVyY2VudCA9IDA7XHJcblxyXG5leHBvcnQgbGV0IHNwcml0ZVdpZHRoOiBudW1iZXI7XHJcbmV4cG9ydCBsZXQgc3ByaXRlSGVpZ2h0OiBudW1iZXI7XHJcbmV4cG9ydCBsZXQgc3ByaXRlR2FwOiBudW1iZXI7XHJcbmV4cG9ydCBsZXQgc3ByaXRlRGVja0dhcDogbnVtYmVyO1xyXG5cclxuZXhwb3J0IGxldCBzb3J0QnlTdWl0Qm91bmRzOiBbVmVjdG9yLCBWZWN0b3JdO1xyXG5leHBvcnQgbGV0IHNvcnRCeVJhbmtCb3VuZHM6IFtWZWN0b3IsIFZlY3Rvcl07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmVjYWxjdWxhdGVQYXJhbWV0ZXJzKCkge1xyXG4gICAgY2FudmFzLndpZHRoID0gd2luZG93LmlubmVyV2lkdGg7XHJcbiAgICBjYW52YXMuaGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IC0gMC41ICogcGl4ZWxzUGVyQ007XHJcbiAgICBjYW52YXNSZWN0ID0gY2FudmFzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG5cclxuICAgIHBpeGVsc1BlclBlcmNlbnQgPSBjYW52YXMuaGVpZ2h0IC8gMTAwO1xyXG4gICAgc3ByaXRlV2lkdGggPSAxMiAqIHBpeGVsc1BlclBlcmNlbnQ7XHJcbiAgICBzcHJpdGVIZWlnaHQgPSAxOCAqIHBpeGVsc1BlclBlcmNlbnQ7XHJcbiAgICBzcHJpdGVHYXAgPSAyICogcGl4ZWxzUGVyUGVyY2VudDtcclxuICAgIHNwcml0ZURlY2tHYXAgPSAwLjUgKiBwaXhlbHNQZXJQZXJjZW50O1xyXG5cclxuICAgIHNvcnRCeVN1aXRCb3VuZHMgPSBbXHJcbiAgICAgICAgbmV3IFZlY3RvcihjYW52YXMud2lkdGggLSAyLjc1ICogcGl4ZWxzUGVyQ00sIGNhbnZhcy5oZWlnaHQgLSAzLjUgKiBwaXhlbHNQZXJDTSksXHJcbiAgICAgICAgbmV3IFZlY3RvcihjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQgLSAyICogcGl4ZWxzUGVyQ00pXHJcbiAgICBdO1xyXG4gICAgc29ydEJ5UmFua0JvdW5kcyA9IFtcclxuICAgICAgICBuZXcgVmVjdG9yKGNhbnZhcy53aWR0aCAtIDIuNzUgKiBwaXhlbHNQZXJDTSwgY2FudmFzLmhlaWdodCAtIDEuNzUgKiBwaXhlbHNQZXJDTSksXHJcbiAgICAgICAgbmV3IFZlY3RvcihjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQgLSAwLjI1ICogcGl4ZWxzUGVyQ00pXHJcbiAgICBdO1xyXG59XHJcbiIsImltcG9ydCBiaW5hcnlTZWFyY2ggZnJvbSAnYmluYXJ5LXNlYXJjaCc7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gYmluYXJ5U2VhcmNoTnVtYmVyKGhheXN0YWNrOiBudW1iZXJbXSwgbmVlZGxlOiBudW1iZXIsIGxvdz86IG51bWJlciwgaGlnaD86IG51bWJlcikge1xyXG4gICAgcmV0dXJuIGJpbmFyeVNlYXJjaChoYXlzdGFjaywgbmVlZGxlLCAoYSwgYikgPT4gYSAtIGIsIGxvdywgaGlnaCk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRDb29raWUobmFtZTogc3RyaW5nKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcclxuICAgIGNvbnN0IHBhcnRzID0gYDsgJHtkb2N1bWVudC5jb29raWV9YC5zcGxpdChgOyAke25hbWV9PWApO1xyXG4gICAgaWYgKHBhcnRzLmxlbmd0aCA9PT0gMikge1xyXG4gICAgICAgIHJldHVybiBwYXJ0cy5wb3AoKT8uc3BsaXQoJzsnKS5zaGlmdCgpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0UGFyYW0obmFtZTogc3RyaW5nKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcclxuICAgIHJldHVybiB3aW5kb3cubG9jYXRpb24uc2VhcmNoLnNwbGl0KGAke25hbWV9PWApWzFdPy5zcGxpdChcIiZcIilbMF07XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBkZWxheShtczogbnVtYmVyKSB7XHJcbiAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIG1zKSk7XHJcbn1cclxuXHJcbmV4cG9ydCBlbnVtIFN1aXQge1xyXG4gICAgQ2x1YiwgLy8gMFxyXG4gICAgRGlhbW9uZCxcclxuICAgIEhlYXJ0LFxyXG4gICAgU3BhZGUsXHJcbiAgICBKb2tlciwgLy8gNFxyXG59XHJcblxyXG5leHBvcnQgZW51bSBSYW5rIHtcclxuICAgIFNtYWxsLCAvLyAwXHJcbiAgICBBY2UsXHJcbiAgICBUd28sXHJcbiAgICBUaHJlZSxcclxuICAgIEZvdXIsXHJcbiAgICBGaXZlLFxyXG4gICAgU2l4LFxyXG4gICAgU2V2ZW4sXHJcbiAgICBFaWdodCxcclxuICAgIE5pbmUsXHJcbiAgICBUZW4sXHJcbiAgICBKYWNrLFxyXG4gICAgUXVlZW4sXHJcbiAgICBLaW5nLFxyXG4gICAgQmlnLCAvLyAxNFxyXG59XHJcblxyXG5leHBvcnQgdHlwZSBDYXJkID0gW1N1aXQsIFJhbmtdO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBPdGhlclBsYXllciB7XHJcbiAgICBuYW1lOiBzdHJpbmc7XHJcbiAgICBjYXJkQ291bnQ6IG51bWJlcjtcclxuICAgIHJldmVhbGVkQ2FyZHM6IENhcmRbXTtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBHYW1lU3RhdGUge1xyXG4gICAgZGVja0NvdW50OiBudW1iZXI7XHJcbiAgICBhY3RpdmVQbGF5ZXJJbmRleDogbnVtYmVyO1xyXG4gICAgcGxheWVySW5kZXg6IG51bWJlcjtcclxuICAgIHBsYXllckNhcmRzOiBDYXJkW107XHJcbiAgICBwbGF5ZXJSZXZlYWxDb3VudDogbnVtYmVyO1xyXG4gICAgb3RoZXJQbGF5ZXJzOiBPdGhlclBsYXllcltdO1xyXG59XHJcblxyXG5leHBvcnQgdHlwZSBNZXRob2ROYW1lID0gXCJqb2luR2FtZVwiIHwgXCJkcmF3Q2FyZFwiIHwgXCJyZXR1cm5DYXJkc1RvRGVja1wiIHwgXCJyZW9yZGVyQ2FyZHNcIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgTWV0aG9kUmVzdWx0IHtcclxuICAgIG1ldGhvZE5hbWU6IE1ldGhvZE5hbWU7XHJcbiAgICBlcnJvckRlc2NyaXB0aW9uPzogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEpvaW5HYW1lTWVzc2FnZSB7XHJcbiAgICBnYW1lSWQ6IHN0cmluZztcclxuICAgIHBsYXllck5hbWU6IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBEcmF3Q2FyZE1lc3NhZ2Uge1xyXG4gICAgZHJhd0NhcmQ6IG51bGw7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgUmV0dXJuQ2FyZHNUb0RlY2tNZXNzYWdlIHtcclxuICAgIGNhcmRzVG9SZXR1cm5Ub0RlY2s6IENhcmRbXTtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBSZW9yZGVyQ2FyZHNNZXNzYWdlIHtcclxuICAgIHJlb3JkZXJlZENhcmRzOiBDYXJkW107XHJcbiAgICBuZXdSZXZlYWxDb3VudDogbnVtYmVyO1xyXG59Il19
