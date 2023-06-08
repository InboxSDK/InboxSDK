import fs from 'fs';
import path from 'path';
const packageJson = JSON.parse(
  fs.readFileSync(__dirname + '/package.json', 'utf8')
);

import gulp from 'gulp';
import destAtomic from 'gulp-dest-atomic';
import webpack from 'webpack';
import stdio from 'stdio';
import extReloader from './live/extReloader';
import fg from 'fast-glob';
import exec from './src/build/exec';

const sdkFilename = 'inboxsdk.js';

const args = stdio.getopt({
  // --watch is a node flag that doesn't seem to work after Node 18.12 with gulp.
  // using -w seems to work though.
  watch: { key: 'w', description: 'Automatic rebuild' },
  reloader: { key: 'r', description: 'Automatic extension reloader' },
  hot: { key: 'h', description: 'hot module replacement' },
  remote: {
    description: 'Remote-loading bundle with integrated pageWorld script',
  },
  integratedPageWorld: {
    description:
      'Non-remote-loading bundle with integrated pageWorld script, for testing in projects that expect the remote-loading build',
  },
  minify: { key: 'm', description: 'Minify build' },
  production: { key: 'p', description: 'Production build' },
  copyToStreak: {
    key: 'c',
    description: 'Copy dev build to Streak dev build folder',
  },
});

// Don't let production be built without minification.
// Could just make the production flag imply the minify flag, but that seems
// like it would harm discoverability.
if (args.production && !args.minify) {
  throw new Error('--production requires --minify');
}

// --watch causes Browserify to use full paths in module references. We don't
// want those visible in production.
if (args.production && (args.watch || args.integratedPageWorld)) {
  throw new Error(
    '--production can not be used with --watch, or --integratedPageWorld'
  );
}

process.env.NODE_ENV = args.production ? 'production' : 'development';
process.env.IMPLEMENTATION_URL = args.production
  ? 'https://www.inboxsdk.com/build/platform-implementation.js'
  : 'http://localhost:4567/platform-implementation.js';

async function setupExamples() {
  // Copy inboxsdk.js (and .map) to all subdirs under examples/
  let dirs: string[] = [];
  if (args.copyToStreak) {
    dirs.push('../MailFoo/extensions/devBuilds/chrome/');
  }

  let srcs: string[] = [];
  if (!args.remote && !args.integratedPageWorld) {
    srcs = [
      './packages/core/inboxsdk.js',
      './packages/core/pageWorld.js',
      './packages/core/background.js',
    ];

    dirs = dirs.concat(await fg(['examples/*'], { onlyDirectories: true }));
  } else if (args.remote) {
    dirs.push('./dist');
    srcs = [
      './packages/core/inboxsdk.js*',
      './packages/core/platform-implementation.js*',
      './packages/core/pageWorld.js*',
    ];
  } else if (args.integratedPageWorld) {
    dirs.push('./dist');
    srcs = ['./packages/core/inboxsdk.js', './packages/core/pageWorld.js'];
  }

  let stream = gulp.src(srcs);
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
  // This task exists so we can run `yarn gulp noop` to check that this
  // script loads without any side effects.
});

async function getVersion(): Promise<string> {
  const results = await Promise.all([
    exec('git rev-list HEAD --max-count=1'),
    exec('git status --porcelain'),
  ]);
  const commit = results[0].toString().trim().slice(0, 16);
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

const enum OutputLibraryType {
  /** Used for the integrated page world build */
  Var = 'var',
  /** Remote and npm output format for compatibility's sake */
  UMD = 'umd',
  /** Future output format */
  ESM = 'module',
}

interface BrowserifyTaskOptions {
  entry: string;
  destName: string;
  devtool?: 'source-map' | 'inline-source-map' | 'remote';
  standalone?: string;
  disableMinification?: boolean;
  afterBuild?: () => Promise<void>;
  outputLibraryType?: OutputLibraryType;
}

async function webpackTask({
  entry,
  destName,
  disableMinification,
  ...options
}: BrowserifyTaskOptions): Promise<void> {
  const willMinify = args.minify && !disableMinification;

  const VERSION = await getVersion();

  const bundler = webpack({
    devtool:
      options.devtool === 'remote' ? false : options.devtool ?? 'source-map',
    entry: [
      willMinify || args.production ? './src/inboxsdk-js/header' : null,
      entry,
    ].flatMap((x) => (x != null ? [x] : [])),
    mode: args.production ? 'production' : 'development',
    module: {
      rules: [
        {
          exclude: /(node_modules|dist|packages\/core)/,
          test: /\.m?[jt]sx?$/,
          use: {
            loader: 'babel-loader',
            options: {
              plugins: [
                [
                  'transform-inline-environment-variables',
                  {
                    include: ['NODE_ENV', 'IMPLEMENTATION_URL', 'VERSION'],
                  },
                ],
              ],
            },
          },
        },
        {
          test: /\.css$/,
          use: [
            {
              loader: 'style-loader',
              options: {
                insert: (htmlElement: HTMLStyleElement) => {
                  htmlElement.setAttribute(
                    'data-inboxsdk-version',
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment -- this is injected by webpack
                    ///@ts-ignore
                    SDK_VERSION
                  );
                  document.head.append(htmlElement);
                },
              },
            },
            {
              loader: 'css-loader',
              options: {
                // importLoaders: 1,
                modules: {
                  exportLocalsConvention: 'dashesOnly',
                  localIdentName: args.production
                    ? 'inboxsdk__[hash:base64]'
                    : 'inboxsdk__[name]__[local][hash:base64]',
                  mode: (resourcePath: string) =>
                    resourcePath.endsWith('.module.css') ? 'local' : 'global',
                  namedExport: true,
                },
              },
            },
            { loader: 'postcss-loader' },
          ],
        },
      ],
    },
    optimization: {
      minimize: willMinify,
    },
    output: {
      path: path.join(__dirname, 'packages/core'),
      filename: destName,
      ...(options.standalone
        ? {
            library: {
              export: 'default',
              name: options.standalone,
              type: options.outputLibraryType ?? OutputLibraryType.UMD,
            },
          }
        : {}),
      uniqueName: 'inboxsdk_' + VERSION,
    },
    plugins: [
      new webpack.DefinePlugin({
        SDK_VERSION: JSON.stringify(VERSION),
      }),
      // Work around for Buffer is undefined:
      // https://github.com/webpack/changelog-v5/issues/10
      new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
        // https://github.com/algolia/places/issues/847#issuecomment-748202652 For Algolia
        process: 'process/browser',
      }),
      ...(options.devtool === 'remote'
        ? [
            new webpack.SourceMapDevToolPlugin({
              fileContext: '../',
              filename: '[file].map',
              publicPath: 'https://www.inboxsdk.com/build/',
            }),
          ]
        : []),
    ],
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
      fallback: {
        buffer: require.resolve('buffer'),
      },
    },
    stats: {
      errorDetails: true,
    },
  } satisfies webpack.Configuration);

  if (args.watch) {
    bundler.watch({}, (err, stats) => {
      if (err) {
        console.error(err);
        return;
      }
      console.log(stats?.toString({ colors: true }));

      options.afterBuild?.();
    });
  } else {
    await new Promise<void>((resolve, reject) => {
      bundler.run((err, stats) => {
        if (err) {
          console.error(err);
          reject(err);
          return;
        }
        console.log(stats?.toString({ colors: true }));
        resolve();
      });
    });
    return options.afterBuild?.();
  }
}

gulp.task('pageWorld', () => {
  return webpackTask({
    devtool: args.remote ? 'remote' : undefined,
    entry: './src/injected-js/main',
    destName: 'pageWorld.js',
  });
});

gulp.task('clean', async () => {
  await fs.promises.rm('./dist', { force: true, recursive: true });
  await fs.promises.rm('./packages/core/src', {
    force: true,
    recursive: true,
  });
  await fs.promises.rm('./packages/core/test', {
    force: true,
    recursive: true,
  });
  for (const filename of [
    './packages/core/inboxsdk.js',
    './packages/core/pageWorld.js',
  ]) {
    await fs.promises.rm(filename, { force: true });
    await fs.promises.rm(filename + '.map', { force: true });
  }
});

/**
 * Copy handwritten type definitions and plain js to a appease tsc in our TS setup.
 */
gulp.task('types', async () => {
  const files = await fg(['./src/**/*.d.ts'], {
    onlyFiles: true,
    ignore: ['packages/core'],
  });
  for (const f of files) {
    const newPath = path.join('./packages/core', f);
    await fs.promises.mkdir(path.dirname(newPath), { recursive: true });
    await fs.promises.copyFile(f, newPath);
  }
  await exec('yarn typedefs');
});

if (args.remote) {
  gulp.task('sdk', () => {
    return webpackTask({
      devtool: 'remote',
      disableMinification: true,
      entry: './src/inboxsdk-js/inboxsdk-REMOTE',
      destName: sdkFilename,
      standalone: 'InboxSDK',
    });
  });
  gulp.task(
    'remote',
    gulp.series('pageWorld', function impBundle() {
      return webpackTask({
        devtool: 'remote',
        entry: './src/platform-implementation-js/main-INTEGRATED-PAGEWORLD',
        destName: 'platform-implementation.js',
        afterBuild: setupExamples,
      });
    })
  );
  gulp.task('default', gulp.series('sdk', 'remote'));
} else if (args.integratedPageWorld) {
  // non-remote bundle built for compatibility with remote bundle
  gulp.task(
    'sdk',
    gulp.series('pageWorld', function sdkBundle() {
      return webpackTask({
        devtool: 'inline-source-map',
        entry: './src/inboxsdk-js/inboxsdk-NONREMOTE-INTEGRATED-PAGEWORLD',
        destName: sdkFilename,
        standalone: 'InboxSDK',
        afterBuild: setupExamples,
        outputLibraryType: OutputLibraryType.Var,
      });
    })
  );
  gulp.task('remote', () => {
    throw new Error('No separate remote bundle in non-remote bundle mode');
  });
  gulp.task('default', gulp.parallel('sdk', 'types'));
} else {
  // standard npm non-remote bundle
  gulp.task('sdk', async () => {
    return webpackTask({
      entry: './src/inboxsdk-js/inboxsdk-NONREMOTE',
      destName: sdkFilename,
      standalone: 'InboxSDK',
      afterBuild: setupExamples,
    });
  });
  gulp.task('remote', () => {
    throw new Error('No separate remote bundle in non-remote bundle mode');
  });
  gulp.task('default', gulp.parallel('sdk', 'pageWorld', 'types'));
}

gulp.task(
  'server',
  gulp.series(!args.remote ? 'sdk' : 'remote', async function serverRun() {
    const app = await import('./live/app');
    app.run();
  })
);
