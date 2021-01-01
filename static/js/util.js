"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Util = void 0;
var Util;
(function (Util) {
    function getCookie(name) {
        const parts = `; ${document.cookie}`.split(`; ${name}=`);
        if (parts.length === 2) {
            return parts.pop()?.split(';').shift();
        }
        else {
            return undefined;
        }
    }
    Util.getCookie = getCookie;
    function getParam(name) {
        return window.location.search.split(`${name}=`)[1]?.split("&")[0];
    }
    Util.getParam = getParam;
    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    Util.delay = delay;
    let Suit;
    (function (Suit) {
        Suit[Suit["Club"] = 0] = "Club";
        Suit[Suit["Diamond"] = 1] = "Diamond";
        Suit[Suit["Heart"] = 2] = "Heart";
        Suit[Suit["Spade"] = 3] = "Spade";
    })(Suit = Util.Suit || (Util.Suit = {}));
    let Rank;
    (function (Rank) {
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
    })(Rank = Util.Rank || (Util.Rank = {}));
    let Joker;
    (function (Joker) {
        Joker[Joker["Big"] = 0] = "Big";
        Joker[Joker["Small"] = 1] = "Small";
    })(Joker = Util.Joker || (Util.Joker = {}));
})(Util = exports.Util || (exports.Util = {}));
//# sourceMappingURL=util.js.map