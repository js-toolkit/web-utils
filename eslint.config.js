/** @type {import('eslint').Linter.FlatConfig[]} */
module.exports = [
  ...require('@js-toolkit/configs/eslint/common'),

  {
    rules: {
      'no-shadow': 'off',
      'no-use-before-define': 'off',
    },
  },
];
