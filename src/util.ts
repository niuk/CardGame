export namespace Util {
    export function getCookie(name: string): string | undefined {
        const parts = `; ${document.cookie}`.split(`; ${name}=`);
        if (parts.length === 2) {
            return parts.pop()?.split(';').shift();
        } else {
            return undefined;
        }
    }

    export function getParam(name: string): string | undefined {
        return window.location.search.split(`${name}=`)[1]?.split("&")[0];
    }
    
    export function delay(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    export enum Suit {
        Club,
        Diamond,
        Heart,
        Spade
    }

    export enum Rank {
        Ace = 1,
        Two,
        Three,
        Four,
        Five,
        Six,
        Seven,
        Eight,
        Nine,
        Ten,
        Jack,
        Queen,
        King
    }
    
    export enum Joker {
        Big,
        Small
    }

    // because there can be duplicate cards, each card has a numerical id for easier handling
    export type Card = ([Suit, Rank] | Joker);
}
