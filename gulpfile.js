/*jslint node: true */
'use strict';

var _ = require('lodash');
var gulp = require('gulp');
var browserify = require('browserify');
var watchify = require('watchify');
var source = require('vinyl-source-stream');
var mold = require('mold-source-map');
var streamify = require('gulp-streamify');
var gulpif = require('gulp-if');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var stdio = require('stdio');
var gutil = require('gulp-util');
var rename = require("gulp-rename");
var extReloader = require('./live/ext-reloader');
var rimraf = require('rimraf');
var RSVP = require('rsvp');
var globp = RSVP.denodeify(require('glob'));
var streamToPromise = require('./src/common/stream-to-promise');
var envify = require('envify/custom');
var exec = RSVP.denodeify(require('child_process').exec);
var dox = require('dox');
var fs = require('fs');
var dir = require('node-dir');

var sdkFilename = 'inboxsdk-'+require('./package.json').version+'.js';

var args = stdio.getopt({
  'watch': {key: 'w', description: 'Automatic rebuild'},
  'reloader': {key: 'r', description: 'Automatic extension reloader'},
  'single': {key: 's', description: 'Single bundle build (for development)'},
  'minify': {key: 'm', description: 'Minify build'},
  'production': {key: 'p', description: 'Production build'}
});

// Don't let production be built without minification.
// Could just make the production flag imply the minify flag, but that seems
// like it would harm discoverability.
if (args.production && !args.minify) {
  throw new Error("--production requires --minify");
}

// --watch causes Browserify to use full paths in module references. We don't
// want those visible in production.
if (args.production && (args.watch || args.single)) {
  throw new Error("--production can not be used with --watch or --single");
}

function setupExamples() {
  // Copy inboxsdk.js (and .map) to all subdirs under examples/
  return globp('./examples/*/').then(function(dirs) {
    return dirs.reduce(
      function(stream, dir) {
        return stream.pipe(gulp.dest(dir));
      },
      gulp.src('./dist/'+sdkFilename)
        .pipe(rename('inboxsdk.js'))
    );
  }).then(streamToPromise).then(function() {
    if (args.reloader) {
      return extReloader();
    }
  });
}

var getVersion = function() {
  throw new Error("Can't access before task has run");
};

gulp.task('version', function() {
  return RSVP.Promise.all([
    exec('git rev-list HEAD --max-count=1'),
    exec('git status --porcelain')
  ]).then(function(results) {
    var commit = results[0].toString().trim().slice(0, 16);
    var isModified = /^\s*M/m.test(results[1].toString());

    var version = require('./package.json').version+'-'+commit;
    if (isModified) {
      version += '-MODIFIED';
    }
    getVersion = _.constant(version);
  });
});

function browserifyTask(name, entry, destname) {
  gulp.task(name, ['version'], function() {
    var bundler = browserify({
      entries: entry,
      debug: true,
      cache: {}, packageCache: {}, fullPaths: args.watch
    }).transform(envify({
      IMPLEMENTATION_URL: args.production ?
        'https://www.inboxsdk.com/build/platform-implementation.js' :
        'http://localhost:4567/platform-implementation.js',
      VERSION: getVersion()
    }));

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
        .pipe(gulpif(args.minify, streamify(uglify({
          preserveComments: 'some'
        }))))
        .pipe(streamify(sourcemaps.write(args.production ? '.' : null, {
          // don't include sourcemap comment in the inboxsdk-x.js file that we
          // distribute to developers since it'd always be broken.
          addComment: !args.production || name != 'sdk'
        })))
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


if (args.single) {
  gulp.task('default', ['sdk', 'examples']);
  browserifyTask('sdk', './src/inboxsdk-js/main-DEV.js', sdkFilename);
  gulp.task('imp', function() {
    throw new Error("No separate imp bundle in single bundle mode");
  });
} else {
  gulp.task('default', ['sdk', 'imp', 'examples']);
  browserifyTask('sdk', './src/inboxsdk-js/main.js', sdkFilename);
  browserifyTask('imp', './src/platform-implementation-js/main.js', 'platform-implementation.js');
}

gulp.task('examples', ['sdk'], setupExamples);

gulp.task('server', ['imp'], function() {
  require('./live/app').run();
});

gulp.task('clean', function(cb) {
  rimraf('./dist/', cb);
});

gulp.task('docs', function(cb) {
  // console.log(dox);
  dir.paths(__dirname, function(err, paths) {
    if (err) throw err;
    var fileToParsedComments = {};

    paths.files.filter(function(file) {
      return isFileEligbleForDocs(file);
    })
    .forEach(function(file) {
      var code = fs.readFileSync(file, {encoding:"utf8"});
      var parsedComponents = dox.parseComments(code);
      var validComponents = parsedComponents.filter(function(el) {
        return isComponentEligble(el);
      })
      .forEach(function(el) {
        el.code = null;
      });

      if (validComponents) {
        fileToParsedComments[file] = validComponents;
      }
    });

    fs.writeFile('dist/docs.json', JSON.stringify(fileToParsedComments));
  });

});

function isComponentEligble(component) {
  return !!component.tags;
}

function isFileEligbleForDocs(filename) {
  return endsWith(filename, ".js") && filename.indexOf('node_modules') == -1;
}

function endsWith(str, suffix) {
  return str.indexOf(suffix, str.length - suffix.length) !== -1;
}
