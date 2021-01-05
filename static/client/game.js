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
define(["require", "exports", "./state", "./view-params", "./card-images", "./render"], function (require, exports, State, VP, CardImages, Render) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    State = __importStar(State);
    VP = __importStar(VP);
    CardImages = __importStar(CardImages);
    Render = __importStar(Render);
    // refreshing should rejoin the same game
    window.history.pushState(undefined, State.gameId, `/game?gameId=${State.gameId}&playerName=${State.playerName}`);
    window.onresize = VP.recalculateParameters;
    window.onscroll = VP.recalculateParameters;
    (async () => {
        console.log(`async`);
        const joinPromise = State.joinGame(State.gameId, State.playerName);
        await CardImages.load(); // concurrently
        await joinPromise;
        VP.recalculateParameters();
        // rendering must be synchronous, or else it flickers
        window.requestAnimationFrame(Render.render);
    })();
});
