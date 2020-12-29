"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("./util");
if (document !== null) {
    const playerNameElement = document.getElementById('playerName');
    const playerNameValue = util_1.Util.getCookie('playerName');
    if (playerNameElement !== null && playerNameValue !== undefined) {
        playerNameElement.value = playerNameValue;
    }
    const gameIdElement = document.getElementById('gameId');
    const gameIdValue = util_1.Util.getCookie('gameId');
    if (gameIdElement !== null && gameIdValue !== undefined) {
        gameIdElement.value = gameIdValue;
    }
}
