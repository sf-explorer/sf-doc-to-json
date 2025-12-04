#!/usr/bin/env node

import { copyFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Source: parent package's dist/doc
const srcDoc = join(__dirname, '..', '..', 'dist', 'doc');
// Dest: demo's public/doc
const destDoc = join(__dirname, '..', 'public', 'doc');

if (!existsSync(srcDoc)) {
    console.error('❌ Source doc folder not found:', srcDoc);
    console.error('   Make sure to build the parent package first: npm run build');
    process.exit(1);
}

function copyDir(src, dest) {
    mkdirSync(dest, { recursive: true });
    
    const entries = readdirSync(src);
    let copiedCount = 0;
    
    for (const entry of entries) {
        const srcPath = join(src, entry);
        const destPath = join(dest, entry);
        
        if (statSync(srcPath).isDirectory()) {
            copyDir(srcPath, destPath);
        } else if (entry.endsWith('.json')) {
            copyFileSync(srcPath, destPath);
            copiedCount++;
        }
    }
    
    return copiedCount;
}

console.log('📁 Copying doc files from package to demo public folder...');
const count = copyDir(srcDoc, destDoc);
console.log(`✅ Copied ${count} JSON files to public/doc/`);

