define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.cardToString = exports.getRank = exports.getSuit = exports.card = exports.Rank = exports.Suit = exports.delay = exports.getParam = exports.getCookie = void 0;
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
    function card(suit, rank) {
        return suit << 4 | rank;
    }
    exports.card = card;
    function getSuit(card) {
        return card >> 4;
    }
    exports.getSuit = getSuit;
    function getRank(card) {
        return card & 0xf;
    }
    exports.getRank = getRank;
    function cardToString(card) {
        return `[${getSuit(card)},${getRank(card)}]`;
    }
    exports.cardToString = cardToString;
});
