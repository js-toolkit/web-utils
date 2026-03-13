/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
const common = require('@js-toolkit/configs/eslint/common');

/** @type {import('eslint').Linter.Config[]} */
module.exports = [
  ...common,

  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['*.config.ts'],
        },
      },
    },

    rules: {
      'no-shadow': 'off',
      'no-use-before-define': 'off',
    },
  },
];
