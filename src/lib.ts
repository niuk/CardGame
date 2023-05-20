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

export function pick<T, K extends keyof T>(obj: T, ...keys: K[]): Pick<T, K> {
    const ret: any = {};
    keys.forEach(key => {
        ret[key] = obj[key];
    })
    return ret;
}

export function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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
    handCardIds: number[];
    present: boolean;
    notes: string;
}

export interface GameState {
    gameId: string;
    deckCardIds: number[];
    scoreCardIds: number[];
    cardsById: [number, Card][];
    nextCardId: number;
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
    SetPlayerNotes |
    AddToScore |
    TakeFromScore;

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
    'SetPlayerNotes' |
    'AddToScore' |
    'TakeFromScore';

export interface ServerResponse {
    newGameState?: GameState;
    methodResult?: MethodResult;
}

export interface MethodResult {
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
    cardId: number;
}

export interface GiveToOtherPlayer extends MethodBase {
    methodName: 'GiveToOtherPlayer';
    playerIndex: number;
    cardIds: number[];
}

export interface DrawFromDeck extends MethodBase {
    methodName: 'DrawFromDeck';
}

export interface ReturnToDeck extends MethodBase {
    methodName: 'ReturnToDeck';
    cardIds: number[];
}

export interface Reorder extends MethodBase {
    methodName: 'Reorder';
    newShareCount: number;
    newRevealCount: number;
    newGroupCount: number;
    newCardIds: number[];
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

export interface AddToScore extends MethodBase {
    methodName: 'AddToScore';
    cardIds: number[];
}

export interface TakeFromScore extends MethodBase {
    methodName: 'TakeFromScore';
    cardId: number;
}

export class Bijection<A, B> {
    aToB = new Map<A, B>();
    bToA = new Map<B, A>();

    constructor(...pairs: [A, B][]) {
        pairs.forEach(([a, b]) => {
            this.aToB.set(a, b);
            this.bToA.set(b, a);
        });
    }

    getA(b: B): A | undefined {
        return this.bToA.get(b);
    }

    getB(a: A): B | undefined {
        return this.aToB.get(a);
    }

    set(a: A, b: B): void {
        this.aToB.set(a, b);
        this.bToA.set(b, a);
    }

    deleteA(a: A): void {
        const b = this.aToB.get(a);
        if (b === undefined) {
            throw new Error('No such A');
        }

        this.aToB.delete(a);
        this.bToA.delete(b);
    }

    deleteB(b: B): void {
        const a = this.bToA.get(b);
        if (a === undefined) {
            throw new Error('No such B');
        }

        this.aToB.delete(a);
        this.bToA.delete(b);
    }

    get size(): number {
        return this.aToB.size;
    }
}
