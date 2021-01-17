import * as Lib from '../lib';
import * as State from './state';
import * as VP from './view-params';
import * as Render from './render';
import Sprite from './sprite';

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
    } finally {
        unlock();
    }
}

window.onresize = init;

window.onscroll = init;

(<any>window).game = async function game() {
    const joinPromise = State.joinGame(State.gameId, State.playerName);
    await Sprite.load(); // concurrently
    await joinPromise;
    
    // rendering must be synchronous, or else it flickers
    window.requestAnimationFrame(Render.render);

    await init();
};