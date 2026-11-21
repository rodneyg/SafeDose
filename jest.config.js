module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      // Disable type checking during transformation for speed,
      // type checking was done in a previous step anyway.
      isolatedModules: true,
      babelConfig: true, // Tell ts-jest to use babel.config.js
    }],
  },
  moduleNameMapper: {
    // Jest runs in CommonJS. Resolve Lucide's public require entry.
    '^lucide-react-native$': require.resolve('lucide-react-native'),
    // Handle path aliases used in the project
    '^@/(.*)$': '<rootDir>/$1',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testPathIgnorePatterns: [
    '<rootDir>/e2e/',
    '/node_modules/',
    '<rootDir>/.eval-cache/',
    '<rootDir>/.verify/',
    // Upstream dependency tests copied into the root, not SafeDose suites.
    '<rootDir>/(index|filesystem|config-loader|tsconfig-loader|mapping-entry|match-path-async|match-path-sync)\\.test\\.ts$',
  ],
  collectCoverageFrom: ['lib/dosing/**/*.ts', '!lib/dosing/**/__tests__/**'],
  coverageReporters: ['json', 'json-summary', 'lcov', 'text', 'clover'],
  coverageThreshold: {
    './lib/dosing/': { branches: 100, lines: 100, functions: 100, statements: 100 },
  },
};
