#!/usr/bin/env node

import { copyFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Source: packages' dist/doc folders
const objectRefDoc = join(__dirname, '..', '..', 'packages', 'salesforce-object-reference', 'dist', 'doc');
const metadataDoc = join(__dirname, '..', '..', 'packages', 'salesforce-metadata-reference', 'dist', 'doc');
const ssotDoc = join(__dirname, '..', '..', 'packages', 'salesforce-object-ssot-reference', 'dist', 'doc');

// Dest: demo's public/doc
const destDoc = join(__dirname, '..', 'public', 'doc');

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

console.log('📁 Copying doc files from packages to demo public folder...\n');

let totalCopied = 0;

// Copy from salesforce-object-reference (standard objects)
if (existsSync(objectRefDoc)) {
    console.log('📦 Copying from salesforce-object-reference...');
    totalCopied += copyDir(objectRefDoc, destDoc);
    console.log(`   ✅ Copied files from object-reference\n`);
} else {
    console.error('❌ salesforce-object-reference/dist/doc not found');
    console.error('   Run: npm run build --workspace=@sf-explorer/salesforce-object-reference\n');
}

// Copy from salesforce-metadata-reference
if (existsSync(metadataDoc)) {
    console.log('📦 Copying from salesforce-metadata-reference...');
    const metadataDestDir = join(destDoc, 'metadata-api');
    totalCopied += copyDir(metadataDoc, metadataDestDir);
    console.log(`   ✅ Copied files from metadata-reference\n`);
} else {
    console.warn('⚠️  salesforce-metadata-reference/dist/doc not found (optional)\n');
}

// Copy from salesforce-object-ssot-reference  
if (existsSync(ssotDoc)) {
    console.log('📦 Copying from salesforce-object-ssot-reference...');
    const ssotDestDir = join(destDoc, 'ssot');
    totalCopied += copyDir(ssotDoc, ssotDestDir);
    console.log(`   ✅ Copied files from ssot-reference\n`);
} else {
    console.warn('⚠️  salesforce-object-ssot-reference/dist/doc not found (optional)\n');
}

console.log(`✅ Total: Copied ${totalCopied} JSON files to public/doc/`);

