import * as State from './state';
import * as VP from './view-params';
import * as CardImages from './card-images';
import * as Render from './render';

// refreshing should rejoin the same game
window.history.pushState(undefined, State.gameId, `/game?gameId=${State.gameId}&playerName=${State.playerName}`);

window.onresize = VP.recalculateParameters;
window.onscroll = VP.recalculateParameters;

(<any>window).game = async function game() {
    const joinPromise = State.joinGame(State.gameId, State.playerName);
    await CardImages.load(); // concurrently
    await joinPromise;
    
    VP.recalculateParameters();

    // rendering must be synchronous, or else it flickers
    window.requestAnimationFrame(Render.render);
};