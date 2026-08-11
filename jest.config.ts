import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/tests'],
    testMatch: ['**/*.test.ts', '**/*.spec.ts'],
    moduleFileExtensions: ['ts', 'js', 'json'],
    setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
    clearMocks: true,
    transform: {
        '^.+\\.ts$': ['ts-jest', { diagnostics: { ignoreCodes: [151002] } }],
    },
    moduleNameMapper: {
        '^(\\..*)\\.js$': '$1',
    },
};

export default config;


