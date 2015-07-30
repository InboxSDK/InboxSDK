/*jslint node: true */
'use strict';

const checkDependencies = require('./src/build/check-dependencies');

checkDependencies(require('./package.json'));

const _ = require('lodash');
const gulp = require('gulp');
const browserify = require('browserify');
const watchify = require('watchify');
const source = require('vinyl-source-stream');
const streamify = require('gulp-streamify');
const gulpif = require('gulp-if');
const uglify = require('gulp-uglify');
const sourcemaps = require('gulp-sourcemaps');
const stdio = require('stdio');
const gutil = require('gulp-util');
const rename = require("gulp-rename");
const extReloader = require('./live/ext-reloader');
const rimraf = require('rimraf');
const Kefir = require('kefir');
const RSVP = require('rsvp');
const globp = RSVP.denodeify(require('glob'));
const streamToPromise = require('./src/common/stream-to-promise');
const envify = require('envify/custom');
const exec = require('./src/build/exec');
const spawn = require('./src/build/spawn');
const escapeShellArg = require('./src/build/escape-shell-arg');
const fs = require('fs');
const dir = require('node-dir');
const sys = require('sys');
const babelify = require("babelify");
const lazyPipe = require('lazypipe');
const concat = require('gulp-concat');
const addsrc = require('gulp-add-src');

const sdkFilename = 'inboxsdk.js';

const args = stdio.getopt({
  'watch': {key: 'w', description: 'Automatic rebuild'},
  'reloader': {key: 'r', description: 'Automatic extension reloader'},
  'single': {key: 's', description: 'Single bundle build (for development)'},
  'minify': {key: 'm', description: 'Minify build'},
  'production': {key: 'p', description: 'Production build'},
  'copy': {key: 'c', description: 'Also copy to Streak'}
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
  return globp('./examples/*/').then(function(dirs){
    if(args.copy){
      dirs.push('../MailFoo/extensions/devBuilds/chrome/');
    }
    return dirs;
  }).then(function(dirs) {
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

let getVersion = function() {
  throw new Error("Can't access before task has run");
};

gulp.task('noop', _.noop);

gulp.task('version', function() {
  return RSVP.Promise.all([
    exec('git rev-list HEAD --max-count=1'),
    exec('git status --porcelain')
  ]).then(function(results) {
    const commit = results[0].toString().trim().slice(0, 16);
    const isModified = /^\s*M/m.test(results[1].toString());

    let version = require('./package.json').version+'-'+commit;
    if (isModified) {
      version += '-MODIFIED';
    }
    getVersion = _.constant(version);
  });
});

function browserifyTask(name, deps, entry, destname) {
  const willMinify = args.minify && (args.single || name !== "sdk");

  gulp.task(name, ['version'].concat(deps), function() {
    let bundler = browserify({
      entries: entry,
      debug: true,
      cache: {}, packageCache: {}, fullPaths: args.watch
    }).transform(babelify).transform(envify({
      NODE_ENV: args.production ? 'production' : 'development',
      IMPLEMENTATION_URL: args.production ?
        'https://www.inboxsdk.com/build/platform-implementation.js' :
        'http://localhost:4567/platform-implementation.js',
      VERSION: getVersion()
    }));

    function buildBundle() {
      const sourcemapPipeline = lazyPipe()
        .pipe(addsrc.prepend, (willMinify || args.production) ? ["./src/inboxsdk-js/header.js"] : [])
        .pipe(sourcemaps.init, {loadMaps: true})
        .pipe(concat, destname)
        .pipe(() => gulpif(willMinify, uglify({preserveComments: 'some'})))
        .pipe(sourcemaps.write, args.production ? '.' : null, {
          // don't include sourcemap comment in the inboxsdk.js file that we
          // distribute to developers since it'd always be broken.
          addComment: !args.production || name != 'sdk',
          sourceMappingURLPrefix: name == 'injected' ?
            'https://www.inboxsdk.com/build/' : null
        });

      const bundle = bundler.bundle();
      const result = bundle
        .pipe(source(destname))
        .pipe(gulpif(willMinify || args.production, streamify(sourcemapPipeline())))
        .pipe(gulp.dest('./dist/'));

      return new RSVP.Promise(function(resolve, reject) {
        const errCb = _.once(function(err) {
          reject(err);
          result.end();
        });
        bundle.on('error', errCb);
        result.on('error', errCb);
        result.on('end', resolve);
      });
    }

    if (args.watch) {
      bundler = watchify(bundler);
      Kefir
        .fromEvents(bundler, 'update')
        .throttle(10)
        .onValue(function() {
          gutil.log("Rebuilding '"+gutil.colors.cyan(name)+"'");
          buildBundle().then(function() {
            if (name === 'sdk') {
              return setupExamples();
            }
          }).then(function() {
            gutil.log("Finished rebuild of '"+gutil.colors.cyan(name)+"'");
          }, function(err) {
            gutil.log(
              gutil.colors.red("Error")+" rebuilding '"+
              gutil.colors.cyan(name)+"':", err.message
            );
          });
        });
    }

    return buildBundle();
  });
}

if (args.single) {
  gulp.task('default', ['sdk', 'examples']);
  browserifyTask('sdk', ['injected'], './src/inboxsdk-js/main-DEV.js', sdkFilename);
  gulp.task('imp', function() {
    throw new Error("No separate imp bundle in single bundle mode");
  });
} else {
  gulp.task('default', ['sdk', 'imp', 'examples']);
  browserifyTask('sdk', [], './src/inboxsdk-js/main.js', sdkFilename);
  browserifyTask('imp', ['injected'],
    './src/platform-implementation-js/main.js', 'platform-implementation.js');
}

browserifyTask('injected', [], './src/injected-js/main.js', 'injected.js');

gulp.task('examples', ['sdk'], setupExamples);

gulp.task('server', ['imp'], function() {
  require('./live/app').run();
});

gulp.task('clean', function(cb) {
  rimraf('./dist/', cb);
});

gulp.task('test', ['test-unit', 'test-jsdom']);

gulp.task('test-unit', function() {
  return spawn('node_modules/.bin/mocha');
});

gulp.task('test-jsdom', [
  'test-jsdom-inboxsdk-gmail',
  'test-jsdom-inboxsdk-inbox',
  'test-jsdom-iti'
]);

gulp.task('test-jsdom-inboxsdk-gmail', function() {
  return spawn('node_modules/.bin/babel-node', ['test/jsdom/inboxsdk-gmail.js']);
});

gulp.task('test-jsdom-inboxsdk-inbox', function() {
  return spawn('node_modules/.bin/babel-node', ['test/jsdom/inboxsdk-inbox.js']);
});

gulp.task('test-jsdom-iti', function() {
  return spawn('node_modules/.bin/babel-node', ['test/jsdom/injected-thread-identifier.js']);
});

gulp.task('docs', function(cb) {
  dir.paths(__dirname + '/src', function(err, paths) {
    if (err) throw err;

    Promise.all(_.chain(paths.files)
      .filter(isFileEligbleForDocs)
      .map(logFiles)
      .map(parseCommentsInFile)
      .value()
    ).then(files => {
      const classes = _.chain(files)
        .filter(Boolean)
        .pluck('classes')
        .flatten(true)
        .filter(isNonEmptyClass)
        .map(transformClass)
        .forEach(checkForDocIssues)
        .value();

      const docsJson = {
        classes: _.chain(classes)
          .map(function(ele) {
            return [ele.name, ele];
          })
          .object()
          .value()
      };

      fs.writeFile('dist/docs.json', JSON.stringify(docsJson, null, 2), cb);
    }).catch(err => cb(err));
  });

});

function checkForDocIssues(c) {
  if (c.functions) {
    c.functions.forEach(function(func){
      if (!func.returns) {
        console.error("WARNING: " + func.name + " in " + c.name + " doesn't have a return tag");
      }
    });
  }

}

function parseCommentsInFile(file) {
  gutil.log("Parsing: " + gutil.colors.cyan(file));
  return exec('node_modules/.bin/jsdoc ' + escapeShellArg(file) + ' -t templates/haruki -d console -q format=json', {passStdErr: true})
    .then(({stdout, stderr}) => {
      const filteredStderr = stderr.replace(/^WARNING:.*(ArrowFunctionExpression|TemplateLiteral|TemplateElement|ExportDeclaration|ImportSpecifier|ImportDeclaration).*\n?/gm, '');
      if (filteredStderr) {
        process.stderr.write(filteredStderr);
      }
      const comments = JSON.parse(stdout);
      comments['filename'] = file;
      return comments;
    }, err => {
      console.error(err);
      return null;
    });
}

function transformClass(c) {
  if (!c.properties) {
    return c;
  }

  c.properties.forEach(function(prop){
    var optionalMarker = '\n^optional';
    var defaultRegex = /\n\^default=(.*)/;

    prop.optional = false;
    if (prop.description.indexOf(optionalMarker) > -1) {
      prop.optional = true;
      prop.description = prop.description.replace(optionalMarker, '');
    }

    prop.description = prop.description.replace(defaultRegex, function(m, c) {
      prop.default = c;
      return '';
    });
  });

  return c;
}

function isNonEmptyClass(c) {
  // its going to have one property with the filename at minimum because we added it
  return c != null;
}

function logFiles(filename) {
  return filename;
}

function isFileEligbleForDocs(filename) {
  return  filename.endsWith(".js") &&
          filename.indexOf("src/platform-implementation-js/platform-implementation.js") == -1 &&
          (
            filename.indexOf('src/platform-implementation-js/dom-driver/gmail/views/gmail-compose-view/add-status-bar.js') > -1 ||
            filename.indexOf('src/platform-implementation-js/platform-implementation') > -1 ||
            filename.indexOf('src/platform-implementation-js/views') > -1 ||
            filename.indexOf('src/platform-implementation-js/widgets') > -1 ||
            filename.indexOf('src/common/constants') > -1 ||
            (filename.indexOf('src/inboxsdk-js/') > -1 && filename.indexOf('src/inboxsdk-js/loading') == -1)
          );
}

function endsWith(str, suffix) {
  return str.indexOf(suffix, str.length - suffix.length) !== -1;
}
