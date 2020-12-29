import { Util } from "./util";

if (document !== null) {
    const playerNameElement = document.getElementById('playerName');
    const playerNameValue = Util.getCookie('playerName');
    if (playerNameElement !== null && playerNameValue !== undefined) {
        (<HTMLInputElement>playerNameElement).value = playerNameValue;
    }

    const gameIdElement = document.getElementById('gameId');
    const gameIdValue = Util.getCookie('gameId');
    if (gameIdElement !== null && gameIdValue !== undefined) {
        (<HTMLInputElement>gameIdElement).value = gameIdValue;
    }
}