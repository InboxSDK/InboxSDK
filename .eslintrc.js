module.exports = {
  root: true,
  parser: 'babel-eslint',
  env: {
    browser: true,
    node: true,
    es6: true
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:no-dupe-class-fields/recommended'
  ],
  parserOptions: {
    ecmaFeatures: {
      experimentalObjectRestSpread: true,
      jsx: true
    },
    sourceType: 'module'
  },
  plugins: ['flowtype', 'deprecate'],
  rules: {
    'flowtype/define-flow-type': 1,
    'flowtype/require-valid-file-annotation': ['error', 'always'],

    'no-unused-vars': ['off'],
    // "indent": ["error", 2],
    'linebreak-style': ['error', 'unix'],
    // "quotes": ["error", "single", "avoid-escape"],
    semi: ['error', 'always'],
    'no-var': ['off'], //["error"],
    'brace-style': ['off'], //["error"],
    'array-bracket-spacing': ['off'], // prettier handles this
    'block-spacing': ['off'], //["error", "always"],
    'no-spaced-func': ['error'],
    'no-whitespace-before-property': ['error'],
    'space-before-blocks': ['off'], //["error", "always"],
    'keyword-spacing': ['off'] //["error"],
  },
  overrides: [
    {
      files: ['src/**'],
      excludedFiles: '*.test.js',
      rules: {
        'deprecate/import': ['error', 'lodash', 'crypto']
      }
    },
    {
      files: ['__tests__/**', '**/*.test.js', 'test/**'],
      env: {
        jest: true
      }
    },
    {
      files: ['test/chrome/**'],
      rules: {
        'no-console': ['off']
      },
      globals: {
        page: 'readonly',
        browser: 'readonly',
        context: 'readonly',
        jestPuppeteer: 'readonly'
      }
    },
    {
      files: ['jest.config.js', 'jest-puppeteer.config.js'],
      rules: {
        'flowtype/require-valid-file-annotation': ['off']
      }
    }
  ],
  settings: {
    react: {
      version: '16.8'
    }
  }
};
