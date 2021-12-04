export default class Hand<TKey, TValue> {
    stationary: Map<TKey, TValue>;
    moving: Map<TKey, TValue>;
    array: TKey[] = [];
    indicesByKey = new Map<TKey, number>();

    public get length() {
        return this.array.length;
    }

    public slice(start?: number, end?: number): TKey[] {
        return this.array.slice(start, end);
    }

    public indexOf(key: TKey) {
        return this.indicesByKey.get(key);
    }

    constructor(stationary: Map<TKey, TValue>, moving: Map<TKey, TValue>) {
        for (const key of stationary.keys()) {
            if (moving.has(key)) {
                throw new Error(`Item ${key} can't be both moving and stationary.`);
            }
        }

        for (const key of moving.keys()) {
            if (stationary.has(key)) {
                throw new Error(`Item ${key} can't be both moving and stationary.`);
            }
        }

        this.stationary = stationary;
        this.moving = moving;
    }

    public add(key: TKey, value: TValue): void {
        if (this.stationary.has(key) || this.moving.has(key)) {
            throw new Error(`Key ${key} already exists.`);
        }

        this.stationary.set(key, value);
        this.indicesByKey.set(key, this.array.length);
        this.array.push(key);
        console.log('added', this);
    }

    public remove(key: TKey): void {
        if (!this.stationary.delete(key)) {
            throw new Error(`Key ${key} is moving or doesn't exist.`);
        }

        const index = this.indicesByKey.get(key);
        if (index === undefined) {
            throw new Error();
        }

        this.array.splice(index, 1);
        this.indicesByKey.delete(key);
    }

    public splice(start: number, deleteCount: number, ...items: TKey[]): TKey[] {
        //console.log('splice start', this.array, start, deleteCount, JSON.stringify(items));

        for (const item of items) {
            if (!this.moving.has(item)) {
                throw new Error(`Item ${item} isn't moving.`);
            }

            if (this.stationary.has(item)) {
                throw new Error(`Item ${item} is already stationary.`);
            }
        }

        const removedItems = this.array.slice(start, start + deleteCount);
        for (const item of removedItems) {
            if (this.moving.has(item)) {
                throw new Error(`Item ${item} is already moving.`);
            }

            if (!this.stationary.has(item)) {
                throw new Error(`Item ${item} isn't stationary.`);
            }
        }

        this.array.splice(start, deleteCount);
        for (const item of removedItems) {
            const value = this.stationary.get(item);
            if (!value) {
                throw new Error();
            }

            if (!this.stationary.delete(item)) {
                throw new Error();
            }

            this.moving.set(item, value);

            if (!this.indicesByKey.delete(item)) {
                throw new Error();
            }
        }

        this.array.splice(start, 0, ...items);

        let i = 0;
        for (const item of items) {
            const value = this.moving.get(item);
            if (value === undefined) {
                throw new Error();
            }

            if (!this.moving.delete(item)) {
                throw new Error();
            }

            this.stationary.set(item, value);
            if (!this.indicesByKey.set(item, start + i++)) {
                throw new Error();
            }
        }

        /*console.log('splice end',
            this.array,
            JSON.stringify(new Array(...this.moving)),
            JSON.stringify(new Array(...this.stationary)),
            JSON.stringify(items),
            removedItems
        );*/
        return removedItems;
    }

    public push(...items: TKey[]): number {
        this.splice(this.array.length, 0, ...items);
        return this.array.length;
    }

    public unshift(...items: TKey[]): number {
        this.splice(0, 0, ...items);
        return this.array.length;
    }

    public [Symbol.iterator]() {
        return this.array[Symbol.iterator]();
    }
}