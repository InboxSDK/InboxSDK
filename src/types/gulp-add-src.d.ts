declare module 'gulp-add-src' {
  const addsrc: {
    (filename: string): any;
    prepend(filename: string): any;
  };
  export = addsrc;
}
