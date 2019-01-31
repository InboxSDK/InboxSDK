/* @flow */
/* eslint-disable no-console */

import 'yarn-deps-check';

import fs from 'fs';
const packageJson = JSON.parse(
  fs.readFileSync(__dirname + '/package.json', 'utf8')
);

import _ from 'lodash';
import gulp from 'gulp';
import destAtomic from 'gulp-dest-atomic';
import browserify from 'browserify';
import watchify from 'watchify';
import source from 'vinyl-source-stream';
import streamify from 'gulp-streamify';
import gulpif from 'gulp-if';
import uglify from 'gulp-uglify';
import sourcemaps from 'gulp-sourcemaps';
import stdio from 'stdio';
import gutil from 'gulp-util';
import rename from 'gulp-rename';
import extReloader from './live/ext-reloader';
import rimraf from 'rimraf';
import Kefir from 'kefir';
import fg from 'fast-glob';
import streamToPromise from './src/common/stream-to-promise';
import exec from './src/build/exec';
import spawn from './src/build/spawn';
import escapeShellArg from './src/build/escape-shell-arg';
import dir from 'node-dir';
import babelify from 'babelify';
import lazyPipe from 'lazypipe';
import concat from 'gulp-concat';
import addsrc from 'gulp-add-src';

const sdkFilename = 'inboxsdk.js';

const args = stdio.getopt({
  watch: { key: 'w', description: 'Automatic rebuild' },
  reloader: { key: 'r', description: 'Automatic extension reloader' },
  hot: { key: 'h', description: 'hot module replacement' },
  singleBundle: {
    key: 's',
    description: 'Single bundle build (for development)'
  },
  minify: { key: 'm', description: 'Minify build' },
  production: { key: 'p', description: 'Production build' },
  copy: { key: 'c', description: 'Also copy to Streak' },
  fullPaths: {
    key: 'f',
    description:
      'Use fullPaths browserify setting (for bundle size checking; recommended to use --minify with this)'
  }
});

// Don't let production be built without minification.
// Could just make the production flag imply the minify flag, but that seems
// like it would harm discoverability.
if (args.production && !args.minify) {
  throw new Error('--production requires --minify');
}

// --watch causes Browserify to use full paths in module references. We don't
// want those visible in production.
if (args.production && (args.watch || args.singleBundle || args.fullPaths)) {
  throw new Error(
    '--production can not be used with --watch, --singleBundle, or --fullPaths'
  );
}

process.env.NODE_ENV = args.production ? 'production' : 'development';
process.env.IMPLEMENTATION_URL = args.production
  ? 'https://www.inboxsdk.com/build/platform-implementation.js'
  : 'http://localhost:4567/platform-implementation.js';

async function setupExamples() {
  // Copy inboxsdk.js (and .map) to all subdirs under examples/
  const dirs: string[] = await fg(['examples/*'], { onlyDirectories: true });
  if (args.copy) {
    dirs.push('../MailFoo/extensions/devBuilds/chrome/');
  }

  let stream = gulp.src('./dist/' + sdkFilename).pipe(rename('inboxsdk.js'));
  for (const dir of dirs) {
    stream = stream.pipe(destAtomic(dir));
  }
  await streamToPromise(stream);
  if (args.reloader) {
    await extReloader();
  }
}

gulp.task('noop', () => {});

async function getVersion(): Promise<string> {
  const results = await Promise.all([
    exec('git rev-list HEAD --max-count=1'),
    exec('git status --porcelain')
  ]);
  const commit = results[0]
    .toString()
    .trim()
    .slice(0, 16);
  const isModified = /^\s*M/m.test(results[1].toString());

  let version = `${packageJson.version}-${Date.now()}-${commit}`;
  if (isModified) {
    version += '-MODIFIED';
  }
  if (args.watch) {
    version += '-WATCH';
  }
  return version;
}

async function getBrowserifyHmrOptions(port: number) {
  const HOME = process.env.HOME;
  if (!HOME) throw new Error('HOME env variable not set');
  const keyFile = `${HOME}/stunnel/key.pem`;
  const certFile = `${HOME}/stunnel/cert.pem`;

  let url, tlskey, tlscert;
  if ((await fg([keyFile])).length && (await fg([certFile])).length) {
    url = `https://dev.mailfoogae.appspot.com:${port}`;
    tlskey = keyFile;
    tlscert = certFile;
  }
  return { url, tlskey, tlscert, port };
}

function browserifyTask(name, deps, entry, destname, port: ?number) {
  var willMinify = args.minify && (args.singleBundle || name !== 'sdk');

  gulp.task(name, deps, async function() {
    process.env.VERSION = await getVersion();
    const browserifyHmrOptions = port && (await getBrowserifyHmrOptions(port));

    let bundler = browserify({
      entries: entry,
      debug: true,
      fullPaths: args.fullPaths,
      cache: {},
      packageCache: {}
    })
      .transform(
        babelify.configure({
          plugins: [
            [
              'transform-inline-environment-variables',
              {
                include: ['NODE_ENV', 'IMPLEMENTATION_URL', 'VERSION']
              }
            ]
          ]
        })
      )
      .transform('redirectify', { global: true });

    if (args.hot && port) {
      bundler.plugin(require('browserify-hmr'), browserifyHmrOptions);
    }

    function buildBundle(): Promise<void> {
      const sourcemapPipeline = lazyPipe()
        .pipe(
          addsrc.prepend,
          willMinify || args.production ? ['./src/inboxsdk-js/header.js'] : []
        )
        .pipe(
          sourcemaps.init,
          { loadMaps: true }
        )
        .pipe(
          concat,
          destname
        )
        .pipe(() => gulpif(willMinify, uglify({ preserveComments: 'some' })))
        .pipe(
          sourcemaps.write,
          args.production ? '.' : null,
          {
            // don't include sourcemap comment in the inboxsdk.js file that we
            // distribute to developers since it'd always be broken.
            addComment: !args.production || name != 'sdk',
            sourceMappingURLPrefix:
              name == 'injected' ? 'https://www.inboxsdk.com/build/' : null
          }
        );

      const bundle = bundler.bundle();
      const result = bundle
        .pipe(source(destname))
        .pipe(
          gulpif(willMinify || args.production, streamify(sourcemapPipeline()))
        )
        .pipe(destAtomic('./dist/'));

      return new Promise((resolve, reject) => {
        const errCb = _.once(err => {
          reject(err);
          result.end();
        });
        bundle.on('error', errCb);
        result.on('error', errCb);
        result.on('finish', resolve);
      });
    }

    if (args.watch) {
      bundler = watchify(bundler);
      Kefir.fromEvents(bundler, 'update')
        .throttle(10)
        .onValue(() => {
          (async () => {
            try {
              gutil.log("Rebuilding '" + gutil.colors.cyan(name) + "'");
              await buildBundle();
              if (name === 'sdk') {
                await setupExamples();
              }
              gutil.log(
                "Finished rebuild of '" + gutil.colors.cyan(name) + "'"
              );
            } catch (err) {
              gutil.log(
                gutil.colors.red('Error') +
                  " rebuilding '" +
                  gutil.colors.cyan(name) +
                  "':",
                err.message
              );
            }
          })();
        });
    }

    return buildBundle();
  });
}

if (args.singleBundle) {
  gulp.task('default', ['sdk', 'examples']);
  browserifyTask(
    'sdk',
    ['injected'],
    './src/inboxsdk-js/main-DEV.js',
    sdkFilename,
    3140
  );
  gulp.task('imp', () => {
    throw new Error('No separate imp bundle in singleBundle bundle mode');
  });
} else {
  gulp.task('default', ['sdk', 'imp', 'examples']);
  browserifyTask('sdk', [], './src/inboxsdk-js/main.js', sdkFilename);
  browserifyTask(
    'imp',
    ['injected'],
    './src/platform-implementation-js/main.js',
    'platform-implementation.js',
    3141
  );
}

browserifyTask(
  'injected',
  [],
  './src/injected-js/main.js',
  'injected.js',
  3142
);

gulp.task('examples', ['sdk'], setupExamples);

gulp.task('server', [args.singleBundle ? 'sdk' : 'imp'], () => {
  return require('./live/app').run();
});

gulp.task('clean', cb => {
  rimraf('./dist/', cb);
});

gulp.task('docs', function(cb) {
  dir.paths(__dirname + '/src', function(err, paths) {
    if (err) throw err;

    Promise.all(
      _.chain(paths.files)
        .filter(isFileEligbleForDocs)
        .sort()
        .map(parseCommentsInFile)
        .value()
    )
      .then(files => {
        var classes = _.chain(files)
          .filter(Boolean)
          .map(x => x.classes)
          .flatten()
          .filter(Boolean)
          .map(transformClass)
          .forEach(checkForDocIssues)
          .value();

        var docsJson = {
          classes: _.chain(classes)
            .map(ele => [ele.name, ele])
            .fromPairs()
            .value()
        };

        const outDir = './dist';
        try {
          fs.statSync(outDir);
        } catch (err) {
          fs.mkdirSync(outDir);
        }

        fs.writeFile('dist/docs.json', JSON.stringify(docsJson, null, 2), cb);
      })
      .catch(err => cb(err));
  });
});

function checkForDocIssues(c) {
  if (c.functions) {
    c.functions.forEach(function(func) {
      if (!func.returns) {
        console.error(
          'WARNING: ' +
            func.name +
            ' in ' +
            c.name +
            " doesn't have a return tag"
        );
      }
    });
  }
}

function parseCommentsInFile(file) {
  gutil.log('Parsing: ' + gutil.colors.cyan(file));
  return exec(
    'node_modules/.bin/jsdoc ' +
      escapeShellArg(file) +
      ' -t templates/haruki -d console -q format=json',
    { passStdErr: true }
  ).then(
    ({ stdout, stderr }) => {
      var filteredStderr = stderr.replace(
        /^WARNING:.*(ArrowFunctionExpression|TemplateLiteral|TemplateElement|ExportDeclaration|ImportSpecifier|ImportDeclaration).*\n?/gm,
        ''
      );
      if (filteredStderr) {
        process.stderr.write(filteredStderr);
        throw new Error('Got stderr');
      }
      try {
        var comments = JSON.parse(stdout);
        comments['filename'] = file;
        return comments;
      } catch (err) {
        console.error('error in file', file, err);
        console.error('char count:', stdout.length);
        throw err;
      }
    },
    err => {
      console.error(err);
      throw err;
    }
  );
}

function transformClass(c) {
  (c.functions || []).forEach(func => {
    func.description = func.description.replace(/\n\^(\S+)/g, (m, rule) => {
      if (rule === 'gmail' || rule === 'inbox') {
        if (!func.environments) func.environments = [];
        func.environments.push(rule);
        return '';
      }
      throw new Error(`Unknown rule ^${rule}`);
    });
  });

  (c.properties || []).forEach(prop => {
    prop.optional = false;

    prop.description = prop.description.replace(/\n\^(\S+)/g, (m, rule) => {
      if (rule === 'optional') {
        prop.optional = true;
        return '';
      }
      const defaultM = /^default=(.*)$/.exec(rule);
      if (defaultM) {
        prop.default = defaultM[1];
        return '';
      }
      throw new Error(`Unknown property rule ^${rule}`);
    });
  });

  return c;
}

function isFileEligbleForDocs(filename) {
  return (
    filename.endsWith('.js') &&
    (filename.includes('src/docs/') ||
      filename.endsWith(
        'src/platform-implementation-js/constants/nav-item-types.js'
      ))
  );
}
