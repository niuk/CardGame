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

export function setCookie(name: string, value: string) {
    document.cookie = `${name}=${value}`;
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

export interface PlayerState {
    name: string;
    shareCount: number;
    revealCount: number;
    groupCount: number;
    totalCount: number;
    cards: Card[];
}

export interface GameState {
    gameId: string;
    deckCount: number;
    playerIndex: number;
    playerStates: (PlayerState | null)[];
}

export type Method =
    SetPlayerName |
    NewGame |
    JoinGame |
    TakeCard |
    DrawCard |
    ReturnCardsToDeck |
    ReorderCards;

export type MethodName =
    'SetPlayerName' |
    'NewGame' |
    'JoinGame' |
    'TakeCard' |
    'DrawCard' |
    'ReturnCardsToDeck' |
    'ReorderCards';

export interface Result {
    methodName: MethodName;
    errorDescription?: string;
}

export interface SetPlayerName {
    methodName: 'SetPlayerName';
    playerName: string;
}

export interface NewGame {
    methodName: 'NewGame';
}

export interface JoinGame {
    methodName: 'JoinGame';
    gameId: string;
}

export interface TakeCard {
    methodName: 'TakeCard';
    otherPlayerIndex: number;
    cardIndex: number;
    card: Card;
}

export interface DrawCard {
    methodName: 'DrawCard';
}

export interface ReturnCardsToDeck {
    methodName: 'ReturnCardsToDeck'
    cardsToReturnToDeck: Card[];
}

export interface ReorderCards {
    methodName: 'ReorderCards';
    newShareCount: number;
    newRevealCount: number;
    newGroupCount: number;
    reorderedCards: Card[];
}