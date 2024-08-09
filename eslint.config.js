/** @type {import('eslint').Linter.Config[]} */
module.exports = [
  ...require('@js-toolkit/configs/eslint/common'),

  {
    rules: {
      'no-shadow': 'off',
      'no-use-before-define': 'off',
    },
  },
];
