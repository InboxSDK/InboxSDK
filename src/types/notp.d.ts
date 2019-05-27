declare module 'notp' {
  var Notp: {
    totp: {
      gen(code: string): string;
    };
  };
  export = Notp;
}
