declare module 'notp' {
  const Notp: {
    totp: {
      gen(code: string): string;
    };
  };
  export = Notp;
}
