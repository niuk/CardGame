export namespace Lib {
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
        Club, // 0
        Diamond,
        Heart,
        Spade,
        Joker, // 4
    }

    export enum Rank {
        Small, // 0
        Ace,
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
        King,
        Big, // 14
    }

    export type Card = number;

    export function card(suit: Suit, rank: Rank): Card {
        return suit << 4 | rank;
    }

    export function getSuit(card: Card): Suit {
        return card >> 4;
    }

    export function getRank(card: Card): Rank {
        return card & 0xf;
    }
    
    export interface OtherPlayer {
        name: string;
        cardCount: number;
    }

    export interface GameStateMessage {
        deckCount: number;
        playerIndex: number;
        playerCards: Card[];
        cardsPlayed: Card[];
        otherPlayers: Record<number, OtherPlayer>;
        activePlayerIndex: number;
    }

    export interface JoinMessage {
        gameId: string;
        playerName: string;
    }

    export interface ShuffleMessage {
        cardsToShuffle: Card[];
    }

    export interface PlayMessage {
        cardsToPlay: Card[];
    }

    export interface FullGameError {
        gameId: string;
    }

    export interface NoSuchGameError {
        gameId: string;
    }

    export interface ErrorMessage {
        errorDescription: string;
    }
}