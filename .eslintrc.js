module.exports = {
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: 'tsconfig.json',
        sourceType: 'module',
    },
    plugins: ['@typescript-eslint/eslint-plugin'],
    extends: [
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
        'prettier',
        'prettier/@typescript-eslint',
    ],
    root: true,
    env: {
        node: true,
        jest: true,
    },
    rules: {
        '@typescript-eslint/interface-name-prefix': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        'comma-dangle': ['error', 'always-multiline'],
        'complexity': ['error', 5],
        'block-scoped-var': 'error',
        'no-unused-vars': 'error',
        'indent': ['error', 4],
        'max-depth': ['error', 3],
        'no-unused-expressions': 'error',
        semi: ["error", "always", { "omitLastInOneLineBlock": true }],
    },
};
  