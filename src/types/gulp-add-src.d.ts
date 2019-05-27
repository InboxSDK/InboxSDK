declare module 'gulp-add-src' {
  var addsrc: {
    (filename: string): any;
    prepend(filename: string): any;
  };
  export default addsrc;
}
