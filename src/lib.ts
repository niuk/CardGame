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
    cardIds: number[];
    present: boolean;
    notes: string;
}

export interface GameState {
    gameId: string;
    deckCardIds: number[];
    playerIndex: number;
    playerStates: (PlayerState | null)[];
    dispensing: boolean;
}

export type Method =
    SetPlayerName |
    NewGame |
    JoinGame |
    AddDeck |
    RemoveDeck |
    TakeFromOtherPlayer |
    GiveToOtherPlayer |
    DrawFromDeck |
    ReturnToDeck |
    Reorder |
    ShuffleDeck |
    Dispense |
    Reset |
    Kick |
    SetPlayerNotes;

export type MethodName =
    'SetPlayerName' |
    'NewGame' |
    'JoinGame' |
    'AddDeck' |
    'RemoveDeck' |
    'TakeFromOtherPlayer' |
    'GiveToOtherPlayer' |
    'DrawFromDeck' |
    'ReturnToDeck' |
    'Reorder' |
    'ShuffleDeck' |
    'Dispense' |
    'Reset' |
    'Kick' |
    'SetPlayerNotes';

export interface ServerResponse {
    newGameState?: GameState;
    methodResult?: Result;
}

export interface Result {
    index: number;
    errorDescription?: string;
}

interface MethodBase {
    methodName: MethodName;
    index: number;
}

export interface SetPlayerName extends MethodBase {
    methodName: 'SetPlayerName';
    playerName: string;
}

export interface NewGame extends MethodBase {
    methodName: 'NewGame';
}

export interface JoinGame extends MethodBase {
    methodName: 'JoinGame';
    gameId: string;
}

export interface AddDeck extends MethodBase {
    methodName: 'AddDeck';
}

export interface RemoveDeck extends MethodBase {
    methodName: 'RemoveDeck';
}

export interface TakeFromOtherPlayer extends MethodBase {
    methodName: 'TakeFromOtherPlayer';
    playerIndex: number;
    card: number;
}

export interface GiveToOtherPlayer extends MethodBase {
    methodName: 'GiveToOtherPlayer';
    playerIndex: number;
    cardsToGiveToOtherPlayer: number[];
}

export interface DrawFromDeck extends MethodBase {
    methodName: 'DrawFromDeck';
}

export interface ReturnToDeck extends MethodBase {
    methodName: 'ReturnToDeck';
    cardsToReturnToDeck: number[];
}

export interface Reorder extends MethodBase {
    methodName: 'Reorder';
    newShareCount: number;
    newRevealCount: number;
    newGroupCount: number;
    newOriginIndices: number[];
}

export interface ShuffleDeck extends MethodBase {
    methodName: 'ShuffleDeck';
}

export interface Dispense extends MethodBase {
    methodName: 'Dispense';
}

export interface Reset extends MethodBase {
    methodName: 'Reset';
}

export interface Kick extends MethodBase {
    methodName: 'Kick';
    playerIndex: number;
}

export interface SetPlayerNotes extends MethodBase {
    methodName: 'SetPlayerNotes';
    notes: string;
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