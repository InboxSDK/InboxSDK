/* eslint-disable flowtype/require-valid-file-annotation */

module.exports = (api) => ({
  presets: [
    [
      '@babel/preset-env',
      {
        ...(api.env('test') ? { targets: { node: 'current' } } : {}),
      },
    ],
    '@babel/preset-react',
  ],
  plugins: [
    [
      '@babel/plugin-transform-runtime',
      {
        regenerator: false,
      },
    ],
  ],
  overrides: [
    {
      test: ['**/*.ts', '**/*.tsx'],
      presets: [['@babel/preset-typescript', { optimizeConstEnums: true }]],
    },
    {
      test: ['**/*.js', '**/*.js.flow'],
      presets: ['@babel/preset-flow'],
      plugins: [],
    },
  ],
});
