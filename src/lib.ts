import binarySearch from 'binary-search';

export function binarySearchNumber(haystack: number[], needle: number, low?: number, high?: number) {
    return binarySearch(haystack, needle, (a, b) => a - b, low, high);
}

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

export type Card = [Suit, Rank];

export type PlayerState = "Wait" | "Proceed" | "Ready" | Active;

export interface Active {
    type: "Active";
    activeTime: number;
}

export const activeCooldown = 10000; //milliseconds

export interface Player {
    name: string;
    shareCount: number;
    revealCount: number;
    totalCount: number;
    cards: Card[];
    //state: PlayerState;
}

export interface GameState {
    deckCount: number;
    playerIndex: number;
    players: (Player | null)[];
}

export type MethodName =
    "joinGame" |
    "takeCard" |
    "drawCard" |
    "returnCardsToDeck" |
    "reorderCards" |
    "wait" |
    "proceed";

export interface MethodResult {
    methodName: MethodName;
    errorDescription?: string;
}

export interface JoinGameMessage {
    gameId: string;
    playerName: string;
}

export interface TakeCardMessage {
    otherPlayerIndex: number;
    cardIndex: number;
    card: Card;
}

export interface DrawCardMessage {
    drawCard: null;
}

export interface ReturnCardsToDeckMessage {
    cardsToReturnToDeck: Card[];
}

export interface ReorderCardsMessage {
    reorderedCards: Card[];
    newShareCount: number;
    newRevealCount: number;
}
/*
export interface WaitMessage {
    wait: null;
}

export interface ProceedMessage {
    proceed: null;
}
*/