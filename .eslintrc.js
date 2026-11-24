// https://docs.expo.dev/guides/using-eslint/
module.exports = {
  extends: 'expo',
  ignorePatterns: ['/dist/*'],
  overrides: [
    {
      files: ['scripts/**/*.mjs'],
      env: { node: true },
    },
    {
      files: [
        '**/*.{test,spec}.{js,jsx,ts,tsx}',
        '**/__tests__/**/*.{js,jsx,ts,tsx}',
        '**/__mocks__/**/*.{js,jsx,ts,tsx}',
        'jest.setup.js',
      ],
      env: { jest: true },
    },
    {
      files: [
        'api/**/*.js',
        'scripts/**/*.js',
        'evals/**/*.js',
        'docs/SAFE_DOSE_REPORT.test.js',
        'validate-*.js',
        'final-integration-test.js',
        'test-scan-again-fix.js',
      ],
      excludedFiles: ['scripts/service-worker.js'],
      env: { node: true },
    },
    {
      files: ['public/workers/**/*.js'],
      env: { worker: true },
      globals: { FileReader: 'readonly' },
    },
  ],
};
