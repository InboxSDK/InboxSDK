declare module "transducers.js" {
  declare type Transform = {
    @@transducer_init: () => any;
    @@transducer_step: (result: any, input: any) => any;
    @@transducer_result: (result: any) => any;
  };
  declare type Transducer = (xform: Transform) => Transform;

  declare var exports: {
    reduce: Function;
    transformer: Function;
    Reduced: Function;
    isReduced: Function;
    iterator: Function;
    push: Function;
    merge: Function;
    transduce: Function;
    seq: Function;
    toArray: Function;
    toObj: Function;
    toIter: Function;
    into: Function;
    compose: Function;
    map: <T,U>(fn: (value: T) => U) => Transducer;
    filter: <T>(fn: (value: T) => any) => Transducer;
    remove: Function;
    cat: Transducer;
    mapcat: <T,U>(fn: (value: T) => Array<U>|Iterable<U>) => Transducer;
    keep: Function;
    dedupe: Function;
    take: (count: number) => Transducer;
    takeWhile: <T>(fn: (value: T) => any) => Transducer;
    takeNth: Function;
    drop: Function;
    dropWhile: Function;
    partition: Function;
    partitionBy: Function;
    interpose: Function;
    repeat: Function;
    range: Function;
  };
}
