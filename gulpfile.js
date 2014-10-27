var gulp = require('gulp');
var browserify = require('browserify');
var source = require('vinyl-source-stream');
var mold = require('mold-source-map');
var streamify = require('gulp-streamify');
var sourcemaps = require('gulp-sourcemaps');
var stdio = require('stdio');

var args = stdio.getopt({
  // 'watch': {key: 'w', description: 'Automatic rebuild'},
  // 'minify': {key: 'm', description: 'Minify build'},
  // 'production': {key: 'p', description: 'Production build'},
});

gulp.task('default', ['sdk', 'imp', 'examples']);

gulp.task('sdk', function() {
  var bundler = browserify({
    entries: './src/sdk/wrapper.js',
    debug: true,
    cache: {}, packageCache: {}, fullPaths: args.watch
  });

  return bundler.bundle()
    .pipe(mold.transformSourcesRelativeTo('.'))
    .pipe(source('gmailsdk.js'))
    .pipe(streamify(sourcemaps.init({loadMaps: true})))
    .pipe(streamify(sourcemaps.write('.')))
    .pipe(gulp.dest('./dist/'));
});

gulp.task('imp', function() {
  var bundler = browserify({
    entries: './src/imp/main.js',
    debug: true,
    cache: {}, packageCache: {}, fullPaths: args.watch
  });

  return bundler.bundle()
    .pipe(mold.transformSourcesRelativeTo('.'))
    .pipe(source('gmailsdk-imp.js'))
    .pipe(streamify(sourcemaps.init({loadMaps: true})))
    .pipe(streamify(sourcemaps.write('.')))
    .pipe(gulp.dest('./dist/'));
});

gulp.task('examples', ['sdk'], function() {
  return gulp.src('./dist/gmailsdk.js*')
    .pipe(gulp.dest('./examples/hello-world/'));
});
