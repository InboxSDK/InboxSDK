/* eslint-disable flowtype/require-valid-file-annotation */

function isBabelRegister(caller) {
  return !!(caller && caller.name === '@babel/register');
}

module.exports = (api) => {
  const isRegister = api.caller(isBabelRegister);

  return {
    presets: [
      [
        '@babel/preset-env',
        {
          ...(!isRegister &&
            !api.env('test') && {
              // Until we no longer support Safari 15, prevent ReferenceError issues
              // by forcing class properties transforms
              // https://github.com/babel/babel/issues/14289
              include: [
                '@babel/plugin-proposal-class-properties',
                '@babel/plugin-proposal-private-methods',
              ],
            }),
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
  };
};
