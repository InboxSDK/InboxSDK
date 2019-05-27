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
  plugins: ['deprecate'],
  rules: {
    'linebreak-style': ['error', 'unix'],
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
    // Flow config
    {
      files: ['*.js'],
      plugins: ['flowtype'],
      rules: {
        'flowtype/define-flow-type': 1,
        'flowtype/require-valid-file-annotation': ['error', 'always'],
        'no-unused-vars': ['off']
      }
    },

    // Start typescript config
    ...require('@typescript-eslint/eslint-plugin/dist/configs/eslint-recommended')
      .default.overrides,
    {
      files: ['*.ts', '*.tsx'],
      ...require('@typescript-eslint/eslint-plugin/dist/configs/recommended.json')
    },
    {
      files: ['*.ts', '*.tsx'],
      rules: {
        'no-undef': ['error'],
        '@typescript-eslint/indent': ['off'],
        '@typescript-eslint/explicit-function-return-type': ['off'],
        '@typescript-eslint/no-explicit-any': ['off'],
        '@typescript-eslint/no-use-before-define': ['off'],
        '@typescript-eslint/no-non-null-assertion': ['off']
      }
    },
    // End typescript config

    {
      files: ['src/**'],
      excludedFiles: '*.test.*',
      rules: {
        'deprecate/import': ['error', 'lodash', 'crypto']
      }
    },
    {
      files: ['__tests__/**', '**/*.test.*', 'test/**'],
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
