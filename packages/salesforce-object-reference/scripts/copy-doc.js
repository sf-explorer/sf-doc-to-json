#!/usr/bin/env node

import { copyFileSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const srcDoc = join(__dirname, '..', 'src', 'doc');
const distDoc = join(__dirname, '..', 'dist', 'doc');

function copyDir(src, dest) {
    mkdirSync(dest, { recursive: true });
    
    const entries = readdirSync(src);
    
    for (const entry of entries) {
        const srcPath = join(src, entry);
        const destPath = join(dest, entry);
        
        if (statSync(srcPath).isDirectory()) {
            copyDir(srcPath, destPath);
        } else if (entry.endsWith('.json')) {
            copyFileSync(srcPath, destPath);
            console.log(`Copied: ${entry}`);
        }
    }
}

console.log('📁 Copying doc files to dist...');
copyDir(srcDoc, distDoc);
console.log('✅ Done!');

