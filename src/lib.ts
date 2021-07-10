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
    Heart,
    Spade,
    Diamond,
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
    present: boolean;
}

export interface GameState {
    gameId: string;
    deckOrigins: Origin[];
    playerIndex: number;
    playerStates: (PlayerState | null)[];
    tick: number;
    dispensing: boolean;
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
    ShuffleDeck |
    Dispense |
    Reset |
    Kick;

export type MethodName =
    'SetPlayerName' |
    'NewGame' |
    'JoinGame' |
    'TakeFromOtherPlayer' |
    'GiveToOtherPlayer' |
    'DrawFromDeck' |
    'ReturnToDeck' |
    'Reorder' |
    'ShuffleDeck' |
    'Dispense' |
    'Reset' |
    'Kick';

export interface Result {
    methodName: MethodName;
    errorDescription?: string;
}

interface MethodBase {
    methodName: MethodName;
}

export interface SetPlayerName extends MethodBase {
    methodName: 'SetPlayerName';
    playerName: string;
}

export interface NewGame extends MethodBase {
    methodName: 'NewGame';
    numPlayers: 4 | 5 | 6;
    numDecks: 1 | 2 | 3;
}

export interface JoinGame extends MethodBase {
    methodName: 'JoinGame';
    gameId: string;
}

export interface TakeFromOtherPlayer extends MethodBase {
    methodName: 'TakeFromOtherPlayer';
    playerIndex: number;
    cardIndex: number;
    tick: number;
}

export interface GiveToOtherPlayer extends MethodBase {
    methodName: 'GiveToOtherPlayer';
    playerIndex: number;
    cardIndicesToGiveToOtherPlayer: number[];
    tick: number;
}

export interface DrawFromDeck extends MethodBase {
    methodName: 'DrawFromDeck';
    tick: number;
}

export interface ReturnToDeck extends MethodBase {
    methodName: 'ReturnToDeck';
    cardIndicesToReturnToDeck: number[];
    tick: number;
}

export interface Reorder extends MethodBase {
    methodName: 'Reorder';
    newShareCount: number;
    newRevealCount: number;
    newGroupCount: number;
    newOriginIndices: number[];
    tick: number;
}

export interface ShuffleDeck extends MethodBase {
    methodName: 'ShuffleDeck';
    tick: number;
}

export interface Dispense extends MethodBase {
    methodName: 'Dispense';
    tick: number;
}

export interface Reset extends MethodBase {
    methodName: 'Reset';
    tick: number;
}

export interface Kick extends MethodBase {
    methodName: 'Kick';
    playerIndex: number;
    tick: number;
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