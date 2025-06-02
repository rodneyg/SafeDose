module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node', // Keep as node since doseUtils is logic-based
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
    // Mock react-native to prevent errors when lib/utils.tsx (imported by doseUtils) tries to import Platform
    '^react-native$': '<rootDir>/__mocks__/react-native.js',
    // Handle path aliases used in the project
    '^@/(.*)$': '<rootDir>/$1',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  // transformIgnorePatterns might not be needed if react-native is properly mocked
};
