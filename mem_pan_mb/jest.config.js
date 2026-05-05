module.exports = {
  // No preset — avoid both react-native (Flow types) and jest-expo (WinterCG runtime).
  // We only need to test pure TS utility modules; no RN rendering needed.
  testEnvironment: 'node',
  transform: {
    '\\.[jt]sx?$': [
      'babel-jest',
      {
        presets: [
          ['@babel/preset-env', { targets: { node: 'current' } }],
          '@babel/preset-typescript',
        ],
      },
    ],
  },
  testMatch: ['**/__tests__/**/*.(test|spec).(ts|tsx|js|jsx)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
};