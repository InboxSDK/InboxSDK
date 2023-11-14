import fs from 'node:fs';
import path from 'node:path';
import gulp from 'gulp';
import destAtomic from 'gulp-dest-atomic';
import webpack from 'webpack';
import stdio from 'stdio';
import extReloader from './live/extReloader';
import fg from 'fast-glob';
import exec from './src/build/exec';

const sdkFilename = 'inboxsdk';

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
if (args.remote && args.production && !args.minify) {
  throw new Error('--remote --production requires --minify');
}

// --watch causes Browserify to use full paths in module references. We don't
// want those visible in production.
if (args.production && (args.watch || args.integratedPageWorld)) {
  throw new Error(
    '--production can not be used with --watch, or --integratedPageWorld',
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

  const packageJson = JSON.parse(
    await fs.promises.readFile(
      path.join(__dirname, 'packages/core/package.json'),
      'utf8',
    ),
  );

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
  /** Remote and npm output format for compatibility's sake */
  UMD = 'umd',
  /** Future output format */
  ESM = 'module',
}

interface WebpackTaskOptions {
  entry: webpack.Configuration['entry'];
  devtool?: webpack.Configuration['devtool'];
  disableMinification?: boolean;
  afterBuild?: () => Promise<void>;
  plugins?: webpack.Configuration['plugins'];
}

async function webpackTask({
  entry,
  disableMinification,
  ...options
}: WebpackTaskOptions): Promise<void> {
  const willMinify = (args.minify && !disableMinification) ?? false;

  const VERSION = await getVersion();

  const bundler = webpack({
    devtool: options.devtool ?? 'source-map',
    entry,
    mode: args.production ? 'production' : 'development',
    module: {
      rules: [
        {
          resourceQuery: /raw/,
          type: 'asset/source',
        },
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
                    SDK_VERSION,
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
      uniqueName: 'inboxsdk_' + VERSION,
    },
    plugins: [
      new webpack.DefinePlugin({
        SDK_VERSION: JSON.stringify(VERSION),
        /**
         * This flag would allow us to build an npm build with MV2 support.
         * We keep this off so npm builds don't trigger false-positives
         * in Chrome Web Store reviews checking for dynamically loaded code in MV3 extensions.
         * This flag has no effect for remote/non-npm builds.
         */
        NPM_MV2_SUPPORT: JSON.stringify(false),
      }),
      ...(willMinify || args.production
        ? [
            new webpack.BannerPlugin({
              banner: fs.readFileSync('./src/inboxsdk-js/header.ts', 'utf8'),
              raw: true,
              entryOnly: true,
            }),
          ]
        : []),
      // Work around for Buffer is undefined:
      // https://github.com/webpack/changelog-v5/issues/10
      new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
        // transitively from react-draggable-list -> react-motion -> performance-now uses 'process/browser'
        process: 'process/browser',
      }),
      ...(options.plugins ?? []),
    ],
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
      fallback: {
        // 'querystring' used in the SDK directly
        querystring: require.resolve('querystring-es3/'),
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

const pageWorld: webpack.EntryObject = {
  pageWorld: './src/injected-js/main',
};

gulp.task('clean', async () => {
  const folders = ['./dist', './packages/core/src', './packages/core/test'];
  await Promise.all([
    ...folders.map((folder) =>
      fs.promises.rm(folder, { force: true, recursive: true }),
    ),
    fs.promises.rm('./packages/core/inboxsdk.min.js', { force: true }),
  ]);

  const outputFiles = [
    './packages/core/inboxsdk.js',
    './packages/core/platform-implementation.js',
    './packages/core/pageWorld.js',
  ];

  outputFiles.flatMap((filename) => [
    fs.promises.rm(filename, { force: true }),
    fs.promises.rm(filename + '.LICENSE.txt', { force: true }),
    fg(filename + '*.map', { onlyFiles: true }).then((mapFiles) =>
      Promise.all(
        mapFiles.map((mapFile) => fs.promises.rm(mapFile, { force: true })),
      ),
    ),
  ]);
});

/**
 * Copy handwritten type definitions (inboxsdk.d.ts) and those generated from source.
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

let config: WebpackTaskOptions;
const remoteCompatConfig = {
  afterBuild: setupExamples,
} as const;

const sourceMapPlugin = new webpack.SourceMapDevToolPlugin({
  fileContext: '../',
  // Adds hash to the end of the sourcemap URL so that
  // remote code source maps are not cached erroneously by Sentry
  // if and when https://github.com/getsentry/sentry/issues/54819 is patched up.
  filename: '[file].[contenthash].map',
  publicPath: 'https://www.inboxsdk.com/build/',
});

if (args.remote) {
  config = {
    ...remoteCompatConfig,
    devtool: false,
    entry: {
      [sdkFilename]: {
        library: {
          export: 'default',
          name: 'InboxSDK',
          type: OutputLibraryType.UMD,
        },
        import: './src/inboxsdk-js/inboxsdk-REMOTE',
      },
      'platform-implementation':
        './src/platform-implementation-js/main-INTEGRATED-PAGEWORLD',
    },
    plugins: [sourceMapPlugin],
  };
} else if (args.integratedPageWorld) {
  // non-remote bundle built for compatibility with remote bundle
  config = {
    ...remoteCompatConfig,
    devtool: 'inline-source-map',
    entry: {
      [sdkFilename]: {
        library: {
          export: 'default',
          name: 'InboxSDK',
          type: OutputLibraryType.UMD,
        },
        import: './src/inboxsdk-js/inboxsdk-NONREMOTE-INTEGRATED-PAGEWORLD',
      },
    },
  };
} else {
  // standard npm non-remote bundle
  config = {
    devtool: args.production ? false : 'inline-source-map',
    entry: {
      ...pageWorld,
      [sdkFilename]: {
        library: {
          export: 'default',
          name: 'InboxSDK',
          type: OutputLibraryType.UMD,
        },
        import: './src/inboxsdk-js/inboxsdk-NONREMOTE',
      },
    },
    disableMinification: true,
    afterBuild: async () => {
      setupExamples();
    },
  };
}

gulp.task('sdk', async () => {
  // Only the npm build contains pageWorld as of writing.
  if (config.entry instanceof Object && !('pageWorld' in config.entry)) {
    await webpackTask({
      entry: pageWorld,
      devtool: args.remote ? false : 'inline-source-map',
      plugins: [sourceMapPlugin],
    });
  }

  return webpackTask(config);
});

gulp.task('default', gulp.parallel('sdk', 'types'));

gulp.task(
  'server',
  gulp.series('sdk', async function serverRun() {
    const app = await import('./live/app');
    app.run();
  }),
);
