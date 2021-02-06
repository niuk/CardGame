export interface IVector2 {
    x: number;
    y: number;
}

export function add(u: IVector2, v: IVector2): IVector2 {
    return { x: u.x + v.x, y: u.y + v.y };
}

export function sub(u: IVector2, v: IVector2): IVector2 {
    return { x: u.x - v.x, y: u.y - v.y };
}

export function length(v: IVector2): number {
    return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function distance(u: IVector2, v: IVector2): number {
    return length(sub(u, v));
}

export function scale(s: number, v: IVector2): IVector2 {
    return { x: s * v.x, y: s * v.y };
}

export function rotateClockwise(a: number, v: IVector2): IVector2 {
    return {
        x: Math.cos(a) * v.x - Math.sin(a) * v.y,
        y: Math.sin(a) * v.x + Math.cos(a) * v.y
    };
}

export function rotateCounterclockwise(a: number, v: IVector2): IVector2 {
    return {
        x: Math.sin(a) * v.y + Math.cos(a) * v.x,
        y: Math.cos(a) * v.y - Math.sin(a) * v.x
    };
}