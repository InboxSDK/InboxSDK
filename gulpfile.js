var gulp = require('gulp');
var browserify = require('browserify');
var watchify = require('watchify');
var source = require('vinyl-source-stream');
var mold = require('mold-source-map');
var streamify = require('gulp-streamify');
var sourcemaps = require('gulp-sourcemaps');
var stdio = require('stdio');
var gutil = require('gulp-util');
var extReloader = require('./live/ext-reloader');
var RSVP = require('rsvp');
var globp = RSVP.denodeify(require('glob'));
var streamToPromise = require('./src/common/stream-to-promise');

var args = stdio.getopt({
  'watch': {key: 'w', description: 'Automatic rebuild'},
  'reloader': {key: 'r', description: 'Automatic extension reloader'},
  // 'minify': {key: 'm', description: 'Minify build'},
  'dev': {key: 'd', description: 'Development (single bundle) build'}
});

function setupExamples() {
  // Copy gmailsdk.js (and .map) to all subdirs under examples/
  return globp('./examples/*/').then(function(dirs) {
    return dirs.reduce(function(stream, dir) {
      return stream.pipe(gulp.dest(dir));
    }, gulp.src('./dist/gmailsdk.js*'));
  }).then(streamToPromise).then(function() {
    if (args.reloader) {
      return extReloader();
    }
  });
}

function browserifyTask(name, entry, destname) {
  gulp.task(name, function() {
    var bundler = browserify({
      entries: entry,
      debug: true,
      cache: {}, packageCache: {}, fullPaths: args.watch
    });

    if (args.watch) {
      bundler = watchify(bundler);
      bundler.on('update', buildBundle.bind(null, true));
    }

    function buildBundle(isRebuild) {
      var bundle = bundler.bundle();
      var result = bundle
        .pipe(mold.transformSourcesRelativeTo('.'))
        .pipe(source(destname))
        .pipe(streamify(sourcemaps.init({loadMaps: true})))
        .pipe(streamify(sourcemaps.write('.')))
        .pipe(gulp.dest('./dist/'));

      if (isRebuild) {
        var wasError = false;
        gutil.log("Rebuilding '"+gutil.colors.cyan(name)+"'");
        bundle.on('error', function(err) {
          wasError = true;
          gutil.log(gutil.colors.red("Error")+" rebuilding '"+gutil.colors.cyan(name)+"':", err.message);
          result.end();
        });
        result.on('end', function() {
          if (!wasError) {
            gutil.log("Finished rebuild of '"+gutil.colors.cyan(name)+"'");
            if (name == 'sdk') {
              setupExamples();
            }
          }
        });
      }

      return result;
    }

    return buildBundle();
  });
}


if (args.dev) {
  gulp.task('default', ['sdk', 'examples']);
  browserifyTask('sdk', './src/gmailsdk-js/main-DEV.js', 'gmailsdk.js');
  gulp.task('imp', function() {
    throw new Error("No separate imp bundle in dev mode");
  });
} else {
  gulp.task('default', ['sdk', 'imp', 'examples']);
  browserifyTask('sdk', './src/gmailsdk-js/main.js', 'gmailsdk.js');
  browserifyTask('imp', './src/platform-implementation-js/main.js', 'platform-implementation.js');
}

gulp.task('examples', ['sdk'], setupExamples);

gulp.task('server', ['imp'], function() {
  require('./live/app').run();
});
