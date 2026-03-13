import nextJest from 'next/jest.js'

const createJestConfig = nextJest({
  dir: './',
})

/** @type {import('jest').Config} */
const config = {
  setupFiles: ['<rootDir>/jest.polyfill.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jest-environment-jsdom',
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons'],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^jose/(.*)$': '<rootDir>/node_modules/jose/dist/node/cjs/$1',
    '^jose$': '<rootDir>/node_modules/jose/dist/node/cjs/index.js',
  },
  testMatch: ['**/__tests__/**/*.[jt]s?(x)'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/index.{js,jsx,ts,tsx}',
  ],
  coverageReporters: ['json', 'lcov', 'text', 'clover', 'json-summary'],
}

const jestConfig = await createJestConfig(config)()

// Add transformIgnorePatterns after next/jest has had its way with it
// This is a known workaround for next/jest ignoring node_modules transformation
jestConfig.transformIgnorePatterns = [
  '/node_modules/(?!(jose|openid-client|preact|@auth/drizzle-adapter|next-auth|next|drizzle-orm)/)',
]

export default jestConfig
