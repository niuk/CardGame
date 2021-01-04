import * as Lib from './lib';
import * as State from './state';
import * as CardImages from './card-images';
import * as Render from './render';
import * as Input from './input';

const playerName = Lib.getCookie('playerName');
if (playerName === undefined) {
    throw new Error('No player name!');
}

const gameId = Lib.getCookie('gameId');
if (gameId === undefined) {
    throw new Error('No game id!');
}

// refreshing should rejoin the same game
window.history.pushState(undefined, gameId, `/game?gameId=${gameId}&playerName=${playerName}`);

window.onmousedown = Input.onMouseDown;
window.onmousemove = Input.onMouseMove;
window.onmouseup = Input.onMouseUp;
window.onresize = Render.recalculateParameters;
window.onscroll = Render.recalculateParameters;
window.onload = async function() {
    const joinPromise = State.joinGame(gameId, playerName);
    await CardImages.load(); // concurrently
    await joinPromise;
    
    Render.recalculateParameters();

    // rendering must be synchronous, or else it flickers
    window.requestAnimationFrame(Render.render);
};
