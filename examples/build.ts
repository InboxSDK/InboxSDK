import path from 'node:path';

import esbuild from 'esbuild';

type BuildConfig = Parameters<typeof esbuild.build>[0];
type Watcher = ReturnType<typeof esbuild.context>;

let watchingContentScripts: undefined | Watcher;
let watchingSdkOutput: undefined | Watcher;
const TIMING_LABEL = 'building ./examples took';

const buildSdkFiles = ['@inboxsdk/core/pageWorld', '@inboxsdk/core/background'];

// for each folder in examples, build and output the example with esbuild
export async function buildExamples({
  contentScriptFps,
  minify,
  watch,
}: {
  contentScriptFps: string[];
  minify: boolean;
  watch: boolean;
}) {
  console.time(TIMING_LABEL);

  const sharedConfig: BuildConfig = {
    define: {
      // closest-ng depends on node `global`.
      global: 'globalThis',
    },
    entryNames: '[name]',
    bundle: true,
    loader: {
      '.tsx': 'tsx',
      '.ts': 'ts',
      '.js': 'js',
    },
    tsconfig: './tsconfig.json',
    platform: 'browser',
    sourcemap: 'linked',
    target: 'es2022',
    minify,
  };

  const sdkEntryPoints = buildSdkFiles.flatMap((sdkFile) =>
    contentScriptFps.flatMap((c) => [
      {
        out: path.join(path.dirname(c), path.basename(sdkFile)),
        in: sdkFile,
      },
    ]),
  );

  const sdkBuildConfig: BuildConfig = {
    ...sharedConfig,
    entryPoints: sdkEntryPoints,
    outbase: '.',
    outdir: '.',
    entryNames: '[dir]/[name]',
  };

  const sdkFileBuild = watchOrBuild({
    awaitRebuild: true,
    config: sdkBuildConfig,
    state: watchingSdkOutput,
    watch,
  });

  const contentScriptOpts = {
    ...sharedConfig,
    entryPoints: contentScriptFps,
    entryNames: '[dir]/dist/[name]',
    outdir: 'examples',
  } as const;

  const contentScriptBuild = watchOrBuild({
    config: contentScriptOpts,
    awaitRebuild: false,
    state: watchingContentScripts,
    watch,
  });

  await Promise.all([sdkFileBuild, contentScriptBuild]);
  console.timeEnd(TIMING_LABEL);
}

async function watchOrBuild({
  awaitRebuild,
  config,
  state,
  watch,
}: {
  awaitRebuild: boolean;
  config: BuildConfig;
  state: Promise<esbuild.BuildContext<esbuild.BuildOptions>> | undefined;
  watch: boolean;
}) {
  if (watch) {
    const watcher = await state;
    if (watcher == null) {
      state = esbuild.context({
        logLevel: 'info',
        ...config,
      });

      (await state).watch();
    } else {
      if (awaitRebuild) {
        await watcher.cancel();
        await watcher.rebuild();
      }
    }
  } else {
    await esbuild.build(config);
  }
}
