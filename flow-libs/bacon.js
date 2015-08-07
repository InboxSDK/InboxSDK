// jshint ignore:start

declare module baconjs {
  declare class Event<T> {
    value(): T;
    isNext(): boolean;
    hasValue(): boolean;
    isEnd(): boolean;
    isInitial(): boolean;
    error: any;
  }

  declare class Next extends Event {}
  declare class Error extends Event {}
  declare class End extends Event {}

  // represents EventStreams and Properties. Yeah, kinda hacky that they're mixed.
  declare class Observable<T> {
    subscribe(cb: (event: Event<T>) => any): () => void;
    onValue(cb: (i: T) => void): () => void;
    onValues(cb: (value: any) => void): () => void;
    onError(cb: (e: any) => void): () => void;
    onEnd(cb: () => void): () => void;
    toPromise(PromiseConstructor?: Function): Promise<T>;
    firstToPromise(PromiseConstructor?: Function): Promise<T>;
    map<U>(cb: (i: T) => U): Observable<U>;
    mapError<U>(cb: (e: any) => U): Observable<T|U>;
    errors(): Observable<any>;
    skipErrors(): Observable<T>;
    mapEnd<U>(cb: () => U): Observable<T|U>;
    filter(cb: (i: T) => boolean|any): Observable<T>;
    takeWhile(cb: (i: T) => boolean|any): Observable<T>;
    takeUntil(other: Observable): Observable<T>;
    take(n: number): Observable<T>;
    first(): Observable<T>;
    last(): Observable<T>;
    skip(n: number): Observable<T>;
    delay(n: number): Observable<T>;
    throttle(n: number): Observable<T>;
    debounce(n: number): Observable<T>;
    debounceImmediate(n: number): Observable<T>;
    bufferingThrottle(n: number): Observable<T>;
    doAction(cb: (i: T) => void): Observable<T>;
    doError(cb: (e: any) => void): Observable<T>;
    not(): Observable<boolean>;
    flatMap<U>(cb: (i: T) => Observable<U>|Event<U>|U): Observable<U>;
    flatMapLatest<U>(cb: (i: T) => Observable<U>|Event<U>|U): Observable<U>;
    flatMapError<U>(cb: (e: any) => Observable<U>|Event<U>|U): Observable<T|U>;
    flatMapWithConcurrencyLimit<U>(n: number, cb: (i: T) => Observable<U>|Event<U>|U): Observable<U>;
    flatMapConcat<U>(cb: (i: T) => Observable<U>|Event<U>|U): Observable<U>;
    scan<U>(seed: U, cb: (last: U, current: T) => U): Observable<U>;
    fold<U>(seed: U, cb: (last: U, current: T) => U): Observable<U>;
    zip<U,V>(other: Observable<U>, cb: (a: T, b: U) => V): Observable<V>;
    slidingWindow(max: number, min?: number): Observable<T[]>;
    combine<U,V>(other: Observable<U>, cb: (a: T, b: U) => V): Observable<V>;
    log(label?: string): Observable<T>;
    withStateMachine: Function;
    decode(mapping: any): Observable<any>;
    awaiting(other: Observable): Observable<boolean>;
    endOnError(f?: (e: any) => boolean): Observable<T>;
    withHandler(cb: (i: T) => void): Observable;
    name(newName: string): Observable<T>;
    withDescription(...param: any[]): Observable<T>;
    skipDuplicates(isEqual: (a: T, b: T) => boolean): Observable<T>;

    // EventStream
    concat<U>(other: Observable<U>): Observable<T|U>;
    merge<U>(other: Observable<U>): Observable<T|U>;
    holdWhen(valve: Observable): Observable<T>;
    skipWhile(valve: any): Observable<T>;
    skipUntil(valve: any): Observable<T>;
    bufferWithTime(delay: number): Observable<T[]>;
    bufferWithCount(count: number): Observable<T[]>;
    bufferWithTimeOrCount(delay: number, count: number): Observable<T[]>;
    toProperty(): Observable<T>;
    toProperty<U>(initialValue: U): Observable<T|U>;

    // Properties
    sample(interval: number): Observable<T>;
    sampledBy(stream: Observable): Observable<T>;
    changes(): Observable<T>;
    toEventStream(): Observable<T>;
    startWith<U>(value: U): Observable<T|U>;
  }

  declare class Bus<T> extends Observable<T> {
  	push(value: T): void;
  	error(e: any): void;
    plug(s: Observable<T>): () => void;
    end(): void;
  }

  declare function fromArray<T>(items: T[]): Observable<T>;
  declare function fromPromise<T>(promise: Promise<T>): Observable<T>;
  declare function fromEvent(target: Object, eventName: string, transformer?: (event: any) => any): Observable;
  declare function fromEventTarget(target: Object, eventName: string, transformer?: (event: any) => any): Observable;
  declare function fromCallback(f: Function, ...args: any[]): Observable;
  declare function fromNodeCallback(f: Function, ...args: any[]): Observable;
  declare function fromPoll<T>(interval: number, f: () => T): Observable<T>;
  declare function once<T>(value: T): Observable<T>;
  declare function later<T>(delay: number, value: T): Observable<T>;
  declare function interval<T>(interval: number, value: T): Observable<T>;
  declare function sequentially<T>(interval: number, values: T[]): Observable<T>;
  declare function repeatedly<T>(interval: number, value: T): Observable<T>;
  declare function never(): Observable;
  declare function constant<T>(value: T): Observable<T>;
  declare function repeat<T>(fn: (i: number) => Observable<T>): Observable<T>;
  declare function fromBinder(subscribe: (sink: Function) => () => void): Observable;

  declare function combineAsArray<A,B,C,D>(streams: [Observable<A>, Observable<B>, Observable<C>, Observable<D>]): Observable<[A,B,C,D]>;
  declare function combineAsArray<T>(streams: Observable<T>[]): Observable<T[]>;
  declare function combineWith<T,U>(fn: (values: T[]) => U, ...streams: Observable<T>[]): Observable<U>;

  declare function mergeAll<A,B,C,D>(streams: [Observable<A>, Observable<B>, Observable<C>, Observable<D>]): Observable<A|B|C|D>;
  declare function mergeAll<T>(streams: Observable<T>[]): Observable<T>;
  declare function mergeAll<T>(...streams: Observable<T>[]): Observable<T>;

  declare function zipAsArray<T>(streams: Observable<T>[]): Observable<T[]>;
  declare function zipAsArray<T>(...streams: Observable<T>[]): Observable<T[]>;
  declare function zipWith<T,U>(fn: (values: T[]) => U, ...streams: Observable<T>[]): Observable<U>;

  declare var noMore: {};
}
