declare function describe(name: string, fn: (done: (err: any) => void) => ?Promise<any>): void;
declare function xdescribe(name: string, fn: (done: (err: any) => void) => ?Promise<any>): void;
declare function before(fn: (done: (err: any) => void) => ?Promise<any>): void;
declare function beforeEach(fn: (done: (err: any) => void) => ?Promise<any>): void;
declare function after(fn: (done: (err: any) => void) => ?Promise<any>): void;
declare function afterEach(fn: (done: (err: any) => void) => ?Promise<any>): void;
declare function it(name: string, fn: (done: (err: any) => void) => ?Promise<any>): void;
declare function xit(name: string, fn: (done: (err: any) => void) => ?Promise<any>): void;
