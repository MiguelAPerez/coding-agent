import { TextEncoder, TextDecoder } from 'node:util';
import { ReadableStream, WritableStream, TransformStream } from 'node:stream/web';
import Module from 'node:module';
import path from 'node:path';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.ReadableStream = ReadableStream;
global.WritableStream = WritableStream;
global.TransformStream = TransformStream;

// Force jose to resolve to the CJS version even in node_modules
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function(request, parent, isMain, options) {
    if (request === 'jose') {
        const target = path.join(process.cwd(), 'node_modules/jose/dist/node/cjs/index.js');
        return originalResolveFilename(target, parent, isMain, options);
    }
    if (request.startsWith('jose/')) {
        const subpath = request.replace('jose/', '');
        const target = path.join(process.cwd(), 'node_modules/jose/dist/node/cjs/', subpath);
        return originalResolveFilename(target, parent, isMain, options);
    }
    return originalResolveFilename(request, parent, isMain, options);
};
