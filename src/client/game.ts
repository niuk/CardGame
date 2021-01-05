import * as State from './state';
import * as CardImages from './card-images';
import * as Render from './render';

// refreshing should rejoin the same game
window.history.pushState(undefined, State.gameId, `/game?gameId=${State.gameId}&playerName=${State.playerName}`);

window.onresize = Render.recalculateParameters;
window.onscroll = Render.recalculateParameters;
window.onload = async function() {
    const joinPromise = State.joinGame(State.gameId, State.playerName);
    await CardImages.load(); // concurrently
    await joinPromise;

    Render.recalculateParameters();

    // rendering must be synchronous, or else it flickers
    window.requestAnimationFrame(Render.render);
};
