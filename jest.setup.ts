import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Polyfill web APIs for Jest/Next.js
import { ReadableStream, WritableStream, TransformStream } from 'node:stream/web';

// Polyfill web APIs for Jest/Next.js
global.TextEncoder = TextEncoder as typeof global.TextEncoder;
global.TextDecoder = TextDecoder as typeof global.TextDecoder;

// Web Streams polyfill
global.ReadableStream = ReadableStream as unknown as typeof global.ReadableStream;
global.WritableStream = WritableStream as unknown as typeof global.WritableStream;
global.TransformStream = TransformStream as unknown as typeof global.TransformStream;

// Mock next/cache globally to avoid issues with TextEncoder during module evaluation
jest.mock('next/cache', () => ({
    revalidatePath: jest.fn(),
    revalidateTag: jest.fn(),
    unstable_cache: jest.fn((fn) => fn),
}));

// Mock next-auth/next globally
jest.mock('next-auth/next', () => ({
    getServerSession: jest.fn().mockResolvedValue({ user: { id: "test-user-id", name: "Test User" } }),
}));

// Mock openid-client globally
jest.mock('openid-client', () => ({
    Issuer: {
        discover: jest.fn(),
    },
    Client: jest.fn(),
}));

// Mock jose to avoid ESM issues in Jest
jest.mock('jose', () => ({
    compactDecrypt: jest.fn(),
    CompactSign: jest.fn(),
    decodeJwt: jest.fn(),
    decodeProtectedHeader: jest.fn(),
    encryptKey: jest.fn(),
    exportJWK: jest.fn(),
    exportPKCS8: jest.fn(),
    exportSPKI: jest.fn(),
    generateKeyPair: jest.fn(),
    generateSecret: jest.fn(),
    importJWK: jest.fn(),
    importPKCS8: jest.fn(),
    importSPKI: jest.fn(),
    importX509: jest.fn(),
    jwtDecrypt: jest.fn(),
    jwtVerify: jest.fn(),
    KeyAndInstrument: jest.fn(),
    SignJWT: jest.fn(),
    UnsecuredJWT: jest.fn(),
}));
