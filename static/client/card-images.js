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
define(["require", "exports", "../lib"], function (require, exports, Lib) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.get = exports.load = void 0;
    Lib = __importStar(Lib);
    const suits = ['Clubs', 'Dmnds', 'Hearts', 'Spades', 'Joker'];
    const ranks = ['Small', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'Big'];
    const cardImages = new Map();
    async function load() {
        // load card images asynchronously
        for (let suit = 0; suit <= 4; ++suit) {
            for (let rank = 0; rank <= 14; ++rank) {
                if (suit === Lib.Suit.Joker) {
                    if (0 < rank && rank < 14) {
                        continue;
                    }
                }
                else {
                    if (rank < 1 || 13 < rank) {
                        continue;
                    }
                }
                const image = new Image();
                image.src = `PaperCards/${suits[suit]}/${ranks[rank]}of${suits[suit]}.png`;
                image.onload = () => {
                    console.log(`loaded '${image.src}'`);
                    cardImages.set(JSON.stringify([suit, rank]), image);
                };
            }
        }
        for (let i = 0; i < 4; ++i) {
            const image = new Image();
            image.src = `PaperCards/CardBack${i}.png`;
            image.onload = () => {
                console.log(`loaded '${image.src}'`);
                cardImages.set(`Back${i}`, image);
            };
        }
        const blankImage = new Image();
        blankImage.src = 'PaperCards/Blank Card.png';
        blankImage.onload = () => {
            console.log(`loaded '${blankImage.src}'`);
            cardImages.set('Blank', blankImage);
        };
        while (cardImages.size < 4 * 13 + 7) {
            await Lib.delay(10);
        }
        console.log('all card images loaded');
    }
    exports.load = load;
    function get(stringFromCard) {
        const image = cardImages.get(stringFromCard);
        if (image === undefined) {
            throw new Error(`couldn't find image: ${stringFromCard}`);
        }
        return image;
    }
    exports.get = get;
});
