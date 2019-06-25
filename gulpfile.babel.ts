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
import extReloader from './live/extReloader';
import rimraf from 'rimraf';
import Kefir from 'kefir';
import fg from 'fast-glob';
import exec from './src/build/exec';
import escapeShellArg from './src/build/escapeShellArg';
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
  await new Promise((resolve, reject) => {
    stream.on('error', (err: any) => {
      reject(err);
    });
    stream.on('finish', () => {
      resolve();
    });
  });
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

interface BrowserifyTaskOptions {
  entry: string;
  destName: string;
  hotPort?: number;
  disableMinification?: boolean;
  afterBuild?: () => Promise<void>;
  noSourceMapComment?: boolean;
  sourceMappingURLPrefix?: string;
}

async function browserifyTask(options: BrowserifyTaskOptions): Promise<void> {
  const { entry, destName, hotPort, disableMinification } = options;

  const willMinify = args.minify && !disableMinification;

  process.env.VERSION = await getVersion();
  const browserifyHmrOptions = hotPort
    ? await getBrowserifyHmrOptions(hotPort)
    : null;

  let bundler = browserify({
    entries: entry,
    debug: true,
    extensions: ['.ts', '.tsx'],
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
      }),
      { extensions: ['.js', '.tsx', '.ts'] }
    )
    .transform('redirectify', { global: true });

  if (args.hot && hotPort) {
    bundler.plugin(require('browserify-hmr'), browserifyHmrOptions!);
  }

  async function buildBundle(): Promise<void> {
    const sourcemapPipeline = lazyPipe()
      .pipe(() =>
        gulpif(
          Boolean(willMinify || args.production),
          addsrc.prepend('./src/inboxsdk-js/header.js')
        )
      )
      .pipe(
        sourcemaps.init,
        { loadMaps: true }
      )
      .pipe(
        concat,
        destName
      )
      .pipe(() =>
        gulpif(
          willMinify,
          uglify({
            // TODO check
            // preserveComments: 'some',
            mangle: {
              reserved: ['Generator', 'GeneratorFunction']
            }
          })
        )
      )
      .pipe(
        sourcemaps.write,
        args.production ? '.' : null,
        {
          // don't include sourcemap comment in the inboxsdk.js file that we
          // distribute to developers since it'd always be broken.
          addComment: !options.noSourceMapComment,
          sourceMappingURLPrefix: options.sourceMappingURLPrefix
        }
      );

    const bundle = bundler.bundle();
    const result = bundle
      .pipe(source(destName))
      .pipe(
        gulpif(
          Boolean(willMinify || args.production),
          streamify(sourcemapPipeline())
        )
      )
      .pipe(destAtomic('./dist/'));

    await new Promise((resolve, reject) => {
      const errCb = _.once(err => {
        reject(err);
        result.end();
      });
      bundle.on('error', errCb);
      result.on('error', errCb);
      result.on('finish', resolve);
    });

    if (options.afterBuild) {
      await options.afterBuild();
    }
  }

  if (args.watch) {
    bundler = watchify(bundler);
    Kefir.fromEvents(bundler, 'update')
      .throttle(10)
      .onValue(() => {
        (async () => {
          try {
            gutil.log("Rebuilding '" + gutil.colors.cyan(destName) + "'");
            await buildBundle();
            gutil.log(
              "Finished rebuild of '" + gutil.colors.cyan(destName) + "'"
            );
          } catch (err) {
            gutil.log(
              gutil.colors.red('Error') +
                " rebuilding '" +
                gutil.colors.cyan(destName) +
                "':",
              err.message
            );
          }
        })();
      });
  }

  return buildBundle();
}

gulp.task('injected', () => {
  return browserifyTask({
    entry: './src/injected-js/main.js',
    destName: 'injected.js',
    hotPort: 3142,
    sourceMappingURLPrefix: 'https://www.inboxsdk.com/build/'
  });
});

gulp.task('clean', cb => {
  rimraf('./dist/', cb);
});

gulp.task('docs', async () => {
  const paths: dir.PathsResult = await new Promise((resolve, reject) => {
    dir.paths(__dirname + '/src', (err, paths) => {
      if (err) reject(err);
      else resolve(paths);
    });
  });

  const files = await Promise.all(
    _.chain(paths.files)
      .filter(isFileEligbleForDocs)
      .sort()
      .map(parseCommentsInFile)
      .value()
  );
  const classes = _.chain(files)
    .filter(Boolean)
    .map((x: any) => x.classes)
    .flatten()
    .filter(Boolean)
    .map(transformClass)
    .forEach(checkForDocIssues)
    .value();

  const docsJson = {
    classes: _.chain(classes)
      .map(ele => [ele.name, ele])
      .fromPairs()
      .value()
  };

  const outDir = './dist';
  try {
    await fs.promises.stat(outDir);
  } catch (err) {
    await fs.promises.mkdir(outDir);
  }

  await fs.promises.writeFile(
    'dist/docs.json',
    JSON.stringify(docsJson, null, 2)
  );
});

function checkForDocIssues(c: any) {
  if (c.functions) {
    for (const func of c.functions) {
      if (!func.returns) {
        throw new Error(
          'WARNING: ' +
            func.name +
            ' in ' +
            c.name +
            " doesn't have a return tag"
        );
      }
    }
  }
}

async function parseCommentsInFile(file: string): Promise<any> {
  gutil.log('Parsing: ' + gutil.colors.cyan(file));
  const { stdout, stderr } = await exec(
    'node_modules/.bin/jsdoc ' +
      escapeShellArg(file) +
      ' -t templates/haruki -d console -q format=json',
    { passStdErr: true }
  );
  if (stderr) {
    process.stderr.write(stderr);
    throw new Error('Got stderr');
  }
  try {
    const comments = JSON.parse(stdout);
    comments['filename'] = file;
    return comments;
  } catch (err) {
    console.error('error in file', file, err);
    console.error('char count:', stdout.length);
    throw err;
  }
}

function transformClass(c: any) {
  (c.functions || []).forEach((func: any) => {
    func.description = (func.description as string).replace(
      /\n\^(\S+)/g,
      (m, rule) => {
        if (rule === 'gmail' || rule === 'inbox') {
          if (!func.environments) func.environments = [];
          func.environments.push(rule);
          return '';
        }
        throw new Error(`Unknown rule ^${rule}`);
      }
    );
  });

  (c.properties || []).forEach((prop: any) => {
    prop.optional = false;

    prop.description = (prop.description as string).replace(
      /\n\^(\S+)/g,
      (m, rule) => {
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
      }
    );
  });

  return c;
}

function isFileEligbleForDocs(filename: string): boolean {
  return (
    filename.endsWith('.js') &&
    (filename.includes('src/docs/') ||
      filename.endsWith(
        'src/platform-implementation-js/constants/nav-item-types.js'
      ))
  );
}

if (args.singleBundle) {
  gulp.task(
    'sdk',
    gulp.series('injected', function sdkBundle() {
      return browserifyTask({
        entry: './src/inboxsdk-js/main-DEV.js',
        destName: sdkFilename,
        hotPort: 3140,
        afterBuild: setupExamples
      });
    })
  );
  gulp.task('imp', () => {
    throw new Error('No separate imp bundle in singleBundle bundle mode');
  });
  gulp.task('default', gulp.parallel('sdk'));
} else {
  gulp.task('sdk', () => {
    return browserifyTask({
      entry: './src/inboxsdk-js/main.js',
      destName: sdkFilename,
      disableMinification: true,
      afterBuild: setupExamples,
      noSourceMapComment: true
    });
  });
  gulp.task(
    'imp',
    gulp.series('injected', function impBundle() {
      return browserifyTask({
        entry: './src/platform-implementation-js/main.js',
        destName: 'platform-implementation.js',
        hotPort: 3141
      });
    })
  );
  gulp.task('default', gulp.parallel('sdk', 'imp'));
}

gulp.task(
  'server',
  gulp.series(args.singleBundle ? 'sdk' : 'imp', function serverRun() {
    return require('./live/app').run();
  })
);
