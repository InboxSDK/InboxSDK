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
import extReloader from './live/extReloader';
import Kefir from 'kefir';
import fg from 'fast-glob';
import exec from './src/build/exec';
import babelify from 'babelify';
import lazyPipe from 'lazypipe';
import concat from 'gulp-concat';
import addsrc from 'gulp-add-src';

const sdkFilename = 'inboxsdk.js';

const args = stdio.getopt({
  watch: { key: 'w', description: 'Automatic rebuild' },
  reloader: { key: 'r', description: 'Automatic extension reloader' },
  hot: { key: 'h', description: 'hot module replacement' },
  remote: {
    description: 'Remote-loading bundle with integrated pageWorld script'
  },
  integratedPageWorld: {
    description:
      'Non-remote-loading bundle with integrated pageWorld script, for testing in projects that expect the remote-loading build'
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
if (
  args.production &&
  (args.watch || args.fullPaths || args.integratedPageWorld)
) {
  throw new Error(
    '--production can not be used with --watch, --fullPaths, or --integratedPageWorld'
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

  let stream = gulp.src([
    './dist/inboxsdk.js',
    './dist/pageWorld.js',
    './packages/core/background.js'
  ]);
  for (const dir of dirs) {
    stream = stream.pipe(destAtomic(dir));
  }
  await new Promise((resolve, reject) => {
    stream.on('error', (err: any) => {
      reject(err);
    });
    stream.on('finish', () => {
      resolve(undefined);
    });
  });
  if (args.reloader) {
    await extReloader();
  }
}

gulp.task('noop', () => {
  // noop
});

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

// async function getBrowserifyHmrOptions(port: number) {
//   const HOME = process.env.HOME;
//   if (!HOME) throw new Error('HOME env variable not set');
//   const keyFile = `${HOME}/stunnel/key.pem`;
//   const certFile = `${HOME}/stunnel/cert.pem`;

//   let url, tlskey, tlscert;

//   async function checkFilesAllExistAndReadable(
//     filenames: string[]
//   ): Promise<boolean> {
//     try {
//       await Promise.all(
//         filenames.map(filename =>
//           fs.promises.access(filename, fs.constants.R_OK)
//         )
//       );
//       return true;
//     } catch (err) {
//       return false;
//     }
//   }

//   if (await checkFilesAllExistAndReadable([keyFile, certFile])) {
//     url = `https://dev.mailfoogae.appspot.com:${port}`;
//     tlskey = keyFile;
//     tlscert = certFile;
//   }
//   return { url, tlskey, tlscert, port, disableHostCheck: true };
// }

interface BrowserifyTaskOptions {
  entry: string;
  destName: string;
  standalone?: string;
  // hotPort?: number;
  disableMinification?: boolean;
  afterBuild?: () => Promise<void>;
  noSourceMapComment?: boolean;
  sourceMappingURLPrefix?: string;
  writeToPackagesCore?: boolean;
}

async function browserifyTask(options: BrowserifyTaskOptions): Promise<void> {
  const { entry, destName, disableMinification } = options;

  const willMinify = args.minify && !disableMinification;

  process.env.VERSION = await getVersion();
  // const browserifyHmrOptions = hotPort
  //   ? await getBrowserifyHmrOptions(hotPort)
  //   : null;

  let bundler = browserify({
    entries: entry,
    debug: true,
    extensions: ['.ts', '.tsx'],
    fullPaths: args.fullPaths,
    cache: {},
    packageCache: {},
    standalone: options.standalone
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

  // if (args.hot && hotPort) {
  //   // eslint-disable-next-line @typescript-eslint/no-var-requires
  //   bundler.plugin(require('browserify-hmr'), browserifyHmrOptions!);
  // }

  async function buildBundle(): Promise<void> {
    const sourcemapPipeline = lazyPipe()
      .pipe(() =>
        gulpif(
          Boolean(willMinify || args.production),
          addsrc.prepend('./src/inboxsdk-js/header.js')
        )
      )
      .pipe(sourcemaps.init, { loadMaps: true })
      .pipe(concat, destName)
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
      .pipe(sourcemaps.write, args.production ? '.' : null, {
        // don't include sourcemap comment in the inboxsdk.js file that we
        // distribute to developers since it'd always be broken.
        addComment: !options.noSourceMapComment,
        sourceMappingURLPrefix: options.sourceMappingURLPrefix
      });

    const bundle = bundler.bundle();
    let result = bundle
      .pipe(source(destName))
      .pipe(
        gulpif(
          Boolean(willMinify || args.production),
          streamify(sourcemapPipeline())
        )
      )
      .pipe(destAtomic('./dist/'));

    if (options.writeToPackagesCore) {
      result = result.pipe(destAtomic('./packages/core/'));
    }

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

gulp.task('pageWorld', () => {
  return browserifyTask({
    entry: './src/injected-js/main',
    destName: 'pageWorld.js',
    // hotPort: 3142,
    sourceMappingURLPrefix: 'https://www.inboxsdk.com/build/'
  });
});

gulp.task('clean', async () => {
  await fs.promises.rm('./dist', { force: true, recursive: true });
  for (const filename of [
    './packages/core/inboxsdk.js',
    './packages/core/pageWorld.js'
  ]) {
    await fs.promises.rm(filename, { force: true });
    await fs.promises.rm(filename + '.map', { force: true });
  }
});

if (args.remote) {
  gulp.task('sdk', () => {
    return browserifyTask({
      entry: './src/inboxsdk-js/inboxsdk-REMOTE',
      destName: sdkFilename,
      standalone: 'InboxSDK',
      disableMinification: true,
      // afterBuild: setupExamples,
      noSourceMapComment: true
    });
  });
  gulp.task(
    'remote',
    gulp.series('pageWorld', function impBundle() {
      return browserifyTask({
        entry: './src/platform-implementation-js/main-INTEGRATED-PAGEWORLD',
        destName: 'platform-implementation.js'
        // hotPort: 3141
      });
    })
  );
  gulp.task('default', gulp.parallel('sdk', 'remote'));
} else if (args.integratedPageWorld) {
  // non-remote bundle built for compatibility with remote bundle
  gulp.task(
    'sdk',
    gulp.series('pageWorld', function sdkBundle() {
      return browserifyTask({
        entry: './src/inboxsdk-js/inboxsdk-NONREMOTE-INTEGRATED-PAGEWORLD',
        destName: sdkFilename,
        standalone: 'InboxSDK',
        // hotPort: 3140,
        // afterBuild: setupExamples,
        noSourceMapComment: Boolean(args.production)
      });
    })
  );
  gulp.task('remote', () => {
    throw new Error('No separate remote bundle in non-remote bundle mode');
  });
  gulp.task('default', gulp.parallel('sdk'));
} else {
  // standard npm non-remote bundle
  gulp.task('sdk', () => {
    return browserifyTask({
      entry: './src/inboxsdk-js/inboxsdk-NONREMOTE',
      destName: sdkFilename,
      standalone: 'InboxSDK',
      // hotPort: 3140,
      afterBuild: setupExamples,
      noSourceMapComment: Boolean(args.production),
      writeToPackagesCore: true
    });
  });
  gulp.task('remote', () => {
    throw new Error('No separate remote bundle in non-remote bundle mode');
  });
  gulp.task('default', gulp.parallel('sdk', 'pageWorld'));
}

gulp.task(
  'server',
  gulp.series(!args.remote ? 'sdk' : 'remote', async function serverRun() {
    const app = await import('./live/app');
    app.run();
  })
);
