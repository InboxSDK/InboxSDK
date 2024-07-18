import path from 'node:path';

import esbuild from 'esbuild';

type BuildConfig = Parameters<typeof esbuild.build>[0];

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

  const sdkEntryPoints = buildSdkFiles
    .flatMap((sdkFile) =>
      contentScriptFps.flatMap((c) => [
        {
          out: path.join(path.dirname(c), path.basename(sdkFile)),
          in: sdkFile,
        },
      ]),
    )
    .concat(
      contentScriptFps.map((c) => ({
        out: path.join(
          path.dirname(c),
          'dist',
          path.basename(c).replace(/\.[jt]s$/, ''),
        ),
        in: c,
      })),
    );

  const config: BuildConfig = {
    define: {
      // closest-ng depends on node `global`.
      global: 'globalThis',
    },
    bundle: true,
    loader: {
      '.tsx': 'tsx',
      '.ts': 'ts',
      '.js': 'js',
    },
    logLevel: 'info',
    tsconfig: './tsconfig.json',
    platform: 'browser',
    sourcemap: 'linked',
    target: 'es2022',
    minify,
    entryPoints: sdkEntryPoints,
    outbase: '.',
    outdir: '.',
    entryNames: '[dir]/[name]',
  };

  if (watch) {
    const esbuildWatch = await esbuild.context(config);
    await esbuildWatch.watch();
  } else {
    await esbuild.build(config);
  }

  console.timeEnd(TIMING_LABEL);
}
