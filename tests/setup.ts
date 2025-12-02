// Jest setup file to handle ESM and import.meta
import { TextEncoder, TextDecoder } from 'util';

// Polyfill TextEncoder/TextDecoder for Node < 18
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock import.meta if needed
if (typeof globalThis.importMetaUrl === 'undefined') {
  globalThis.importMetaUrl = 'file://' + __dirname + '/';
}


