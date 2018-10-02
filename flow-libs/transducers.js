declare module "transducers.js" {
  declare type Transform = {
    '@@transducer_init': () => any;
    '@@transducer_step': (result: any, input: any) => any;
    '@@transducer_result': (result: any) => any;
  };
  declare type Transducer = (xform: Transform) => Transform;

  declare export default {
    reduce: Function;
    transformer: Function;
    Reduced: Function;
    isReduced: Function;
    iterator: Function;
    push: Function;
    merge: Function;
    transduce: Function;
    seq: Function;
    toArray: (coll: Array<any>|Iterable<any>, xform?: Transducer) => Array<any>;
    toObj: (coll: Array<any>|Iterable<any>, xform?: Transducer) => Object;
    toIter: (coll: Array<any>|Iterable<any>, xform?: Transducer) => Iterator<any>;
    into: Function;
    compose: (...fns: Array<Function>) => Function;
    map: <T,U>(fn: (value: T) => U) => Transducer;
    filter: <T>(fn: (value: T) => any) => Transducer;
    remove: <T>(fn: (value: T) => any) => Transducer;
    cat: Transducer;
    mapcat: <T,U>(fn: (value: T) => Array<U>|Iterable<U>) => Transducer;
    keep: (() => Transducer) &
      (<T>(coll: Array<T>) => Array<$NonMaybeType<T>>) &
      (<T>(coll: Iterable<T>) => Iterator<$NonMaybeType<T>>);
    dedupe: (() => Transducer) &
      (<T>(coll: Array<T>) => Array<T>) &
      (<T>(coll: Iterable<T>) => Iterator<T>);
    take: ((count: number) => Transducer) &
      (<T>(coll: Array<T>, count: number) => Array<T>) &
      (<T>(coll: Iterable<T>, count: number) => Iterator<T>);
    takeWhile: (<T>(fn: (value: T) => any) => Transducer) &
      (<T>(coll: Array<T>, fn: (value: T) => any) => Array<T>) &
      (<T>(coll: Iterable<T>, fn: (value: T) => any) => Iterator<T>);
    takeNth: ((nth: number) => Transducer) &
      (<T>(coll: Array<T>, nth: number) => Array<T>) &
      (<T>(coll: Iterable<T>, nth: number) => Iterator<T>);
    drop: ((count: number) => Transducer) &
      (<T>(coll: Array<T>, count: number) => Array<T>) &
      (<T>(coll: Iterable<T>, count: number) => Iterator<T>);
    dropWhile: (<T>(fn: (value: T) => any) => Transducer) &
      (<T>(coll: Array<T>, fn: (value: T) => any) => Array<T>) &
      (<T>(coll: Iterable<T>, fn: (value: T) => any) => Iterator<T>);
    partition: ((count: number) => Transducer) &
      (<T>(coll: Array<T>, count: number) => Array<Array<T>>) &
      (<T>(coll: Iterable<T>, count: number) => Iterator<Array<T>>);
    partitionBy: (<T>(fn: (value: T) => any) => Transducer) &
      (<T>(coll: Array<T>, fn: (value: T) => any) => Array<Array<T>>) &
      (<T>(coll: Iterable<T>, fn: (value: T) => any) => Iterator<Array<T>>);
    interpose: Function;
    repeat: ((count: number) => Transducer) &
      (<T>(coll: Array<T>, count: number) => Array<T>) &
      (<T>(coll: Iterable<T>, count: number) => Iterator<T>);
    range: (count: number) => Array<number>;
  };
}
