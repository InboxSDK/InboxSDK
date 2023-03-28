module.exports = {
  root: true,
  parser: '@babel/eslint-parser',
  env: {
    browser: true,
    node: true,
    es2022: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:@typescript-eslint/eslint-recommended',
  ],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    sourceType: 'module',
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
    'keyword-spacing': ['off'], //["error"],
  },
  overrides: [
    // Flow config
    {
      files: ['*.js', '*.js.flow'],
      plugins: ['flowtype'],
      rules: {
        'flowtype/define-flow-type': 1,
        'flowtype/require-valid-file-annotation': ['error', 'always'],
        'no-unused-vars': ['off'],
      },
    },
    // Start typescript config. We commit some atrocities here because we want to use
    // ESLint for Flow too, not just Typescript.
    {
      files: ['*.ts', '*.tsx'],
      ...(() => {
        const result = {
          ...require('@typescript-eslint/eslint-plugin/dist/configs/base'),
          ...require('@typescript-eslint/eslint-plugin/dist/configs/recommended'),
        };
        delete result.extends;
        return result;
      })(),
    },
    {
      files: ['*.ts', '*.tsx'],
      rules: {
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
    },
    // End typescript config

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
      files: ['packages/core/background.js'],
      globals: {
        chrome: 'readonly',
      },
      rules: {
        'flowtype/define-flow-type': ['off'],
        'flowtype/require-valid-file-annotation': ['off'],
      },
    },
    {
      files: [
        '.eslintrc.js',
        'jest.config.js',
        'jest-puppeteer.config.js',
        'tools/**',
        'packages/core/**',
      ],
      rules: {
        'flowtype/require-valid-file-annotation': ['off'],
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
