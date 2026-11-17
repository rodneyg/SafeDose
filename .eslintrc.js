// https://docs.expo.dev/guides/using-eslint/
module.exports = {
  extends: 'expo',
  ignorePatterns: ['/dist/*'],
  overrides: [
    {
      files: ['scripts/**/*.mjs'],
      env: { node: true },
    },
  ],
};
