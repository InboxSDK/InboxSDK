module.exports = (api) => {
  return {
    presets: [
      [
        '@babel/preset-env',
        {
          ...(api.env('test') ? { targets: { node: 'current' } } : {}),
        },
      ],
      '@babel/preset-react',
      ['@babel/preset-typescript', { optimizeConstEnums: true }],
    ],
    plugins: [
      [
        '@babel/plugin-transform-runtime',
        {
          regenerator: false,
        },
      ],
    ],
  };
};
