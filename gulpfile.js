var gulp = require('gulp');
var browserify = require('browserify');
var watchify = require('watchify');
var source = require('vinyl-source-stream');
var mold = require('mold-source-map');
var streamify = require('gulp-streamify');
var sourcemaps = require('gulp-sourcemaps');
var stdio = require('stdio');
var gutil = require('gulp-util');

var args = stdio.getopt({
  'watch': {key: 'w', description: 'Automatic rebuild'},
  // 'minify': {key: 'm', description: 'Minify build'},
  // 'production': {key: 'p', description: 'Production build'},
});

function setupExamples() {
  return gulp.src('./dist/gmailsdk.js*')
    .pipe(gulp.dest('./examples/hello-world/'));
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

gulp.task('default', ['sdk', 'imp', 'examples']);

browserifyTask('sdk', './src/sdk/wrapper.js', 'gmailsdk.js');
browserifyTask('imp', './src/imp/main.js', 'gmailsdk-imp.js');

gulp.task('examples', ['sdk'], setupExamples);

gulp.task('server', ['imp'], function() {
  require('./live/app').run();
});
