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

export function length(v: IVector2) {
    return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function distance(u: IVector2, v: IVector2): number {
    return length(sub(u, v));
}

export function scale(s: number, v: IVector2): IVector2 {
    return { x: s * v.x, y: s * v.y };
}