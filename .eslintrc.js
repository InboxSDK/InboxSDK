module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  env: {
    browser: true,
    node: true,
    es2022: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    sourceType: 'module',
  },
  plugins: ['deprecate', '@typescript-eslint'],
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
    'keyword-spacing': ['off'], //["error"],
    '@typescript-eslint/ban-types': ['off'],
    '@typescript-eslint/explicit-member-accessibility': [
      'error',
      { accessibility: 'no-public' },
    ],
    '@typescript-eslint/explicit-module-boundary-types': ['off'],
    '@typescript-eslint/indent': ['off'],
    '@typescript-eslint/explicit-function-return-type': ['off'],
    '@typescript-eslint/no-explicit-any': ['off'],
    '@typescript-eslint/no-use-before-define': ['off'],
    '@typescript-eslint/no-non-null-assertion': ['off'],
    '@typescript-eslint/array-type': ['off'],
    'no-unused-vars': ['off'],

    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
      },
    ],

    // TODO maybe remove these
    '@typescript-eslint/no-inferrable-types': ['off'],
    '@typescript-eslint/no-this-alias': ['off'],
  },

  overrides: [
    {
      files: ['src/**'],
      excludedFiles: ['*.test.*', '*.d.ts'],
      rules: {
        'deprecate/import': ['error', 'lodash', 'crypto'],
      },
    },
    {
      files: ['__tests__/**', '**/*.test.*', 'test/**'],
      env: {
        jest: true,
        node: true,
      },
      rules: {
        '@typescript-eslint/no-var-requires': ['off'],
      },
    },
    {
      files: ['*.js'],
      rules: {
        '@typescript-eslint/no-var-requires': ['off'],
      },
    },
    {
      files: ['test/chrome/**'],
      rules: {
        'no-console': ['off'],
      },
      globals: {
        page: 'readonly',
        browser: 'readonly',
        context: 'readonly',
      },
    },
    {
      files: ['src/platform-implementation-js/**'],
      globals: { Observable: 'readonly' },
    },
  ],
  settings: {
    react: {
      version: '16.8',
    },
  },
};
