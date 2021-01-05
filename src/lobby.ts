import * as Lib from "./lib";

if (document !== null) {
    const playerNameElement = document.getElementById('playerName');
    const playerNameValue = Lib.getCookie('playerName');
    if (playerNameElement !== null && playerNameValue !== undefined) {
        (<HTMLInputElement>playerNameElement).value = playerNameValue;
    }

    const gameIdElement = document.getElementById('gameId');
    const gameIdValue = Lib.getCookie('gameId');
    if (gameIdElement !== null && gameIdValue !== undefined) {
        (<HTMLInputElement>gameIdElement).value = gameIdValue;
    }
}