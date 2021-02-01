export function getCookie(name: string): string | undefined {
    const parts = `; ${document.cookie}`.split(`; ${name}=`);
    if (parts.length === 2) {
        return parts.pop()?.split(';').shift();
    } else {
        return undefined;
    }
}

export function setCookie(name: string, value: string): void {
    document.cookie = `${name}=${value}; SameSite=Lax`;
}

export function getParam(name: string): string | undefined {
    return window.location.search.split(`${name}=`)[1]?.split("&")[0];
}

export function delay(ms: number): Promise<void> {
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

export type Origin = Deck | Hand;

export interface Deck {
    origin: 'Deck';
    deckIndex: number;
}

export interface Hand {
    origin: 'Hand';
    playerIndex: number;
    cardIndex: number;
}

export interface PlayerState {
    name: string;
    shareCount: number;
    revealCount: number;
    groupCount: number;
    cardsWithOrigins: [Card | null, Origin][];
}

export interface GameState {
    gameId: string;
    deckOrigins: Origin[];
    playerIndex: number;
    playerStates: (PlayerState | null)[];
}

export type Method =
    SetPlayerName |
    NewGame |
    JoinGame |
    TakeFromOtherPlayer |
    GiveToOtherPlayer |
    DrawFromDeck |
    ReturnToDeck |
    Reorder |
    ShuffleDeck;

export type MethodName =
    'SetPlayerName' |
    'NewGame' |
    'JoinGame' |
    'TakeFromOtherPlayer' |
    'GiveToOtherPlayer' |
    'DrawFromDeck' |
    'ReturnToDeck' |
    'Reorder' |
    'ShuffleDeck';

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
    numPlayers: 4 | 5 | 6;
    numDecks: number;
}

export interface JoinGame {
    methodName: 'JoinGame';
    gameId: string;
}

export interface TakeFromOtherPlayer {
    methodName: 'TakeFromOtherPlayer';
    playerIndex: number;
    cardIndex: number;
}

export interface GiveToOtherPlayer {
    methodName: 'GiveToOtherPlayer';
    playerIndex: number;
    cardIndicesToGiveToOtherPlayer: number[];
}

export interface DrawFromDeck {
    methodName: 'DrawFromDeck';
}

export interface ReturnToDeck {
    methodName: 'ReturnToDeck';
    cardIndicesToReturnToDeck: number[];
}

export interface Reorder {
    methodName: 'Reorder';
    newShareCount: number;
    newRevealCount: number;
    newGroupCount: number;
    newOriginIndices: number[];
}

export interface ShuffleDeck {
    methodName: 'ShuffleDeck';
}

export async function isDone<T>(p: Promise<T>, milliseconds?: number): Promise<boolean> {
    let done = true;
    try {
        done = await Promise.race<T | 'Timeout'>([p, (async () => {
            await delay(milliseconds ?? 0);
            return 'Timeout';
        })() as Promise<T | 'Timeout'>]) !== 'Timeout';
    } finally {
        return done;
    }
}