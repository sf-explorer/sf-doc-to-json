#!/usr/bin/env node

/**
 * Copy SLDS icon sprites and cloud icons to public/assets
 * Cross-platform script for build process
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sldsSourceDir = path.resolve(__dirname, '../node_modules/@salesforce-ux/design-system/assets/icons');
const sldsTargetDir = path.resolve(__dirname, '../public/assets/icons');
const cloudIconsSourceDir = path.resolve(__dirname, '../../src/icons');
const cloudIconsTargetDir = path.resolve(__dirname, '../public/icons');

console.log('📦 Copying SLDS icon sprites and cloud icons...\n');
console.log(`   SLDS Source: ${sldsSourceDir}`);
console.log(`   SLDS Target: ${sldsTargetDir}`);
console.log(`   Cloud Icons Source: ${cloudIconsSourceDir}`);
console.log(`   Cloud Icons Target: ${cloudIconsTargetDir}\n`);

// Verify SLDS source directory exists
if (!fs.existsSync(sldsSourceDir)) {
  console.error(`❌ SLDS source directory not found: ${sldsSourceDir}\n`);
  process.exit(1);
}

// Verify cloud icons source directory exists
if (!fs.existsSync(cloudIconsSourceDir)) {
  console.error(`❌ Cloud icons source directory not found: ${cloudIconsSourceDir}\n`);
  process.exit(1);
}

// Create target directories
if (!fs.existsSync(sldsTargetDir)) {
  fs.mkdirSync(sldsTargetDir, { recursive: true });
  console.log('✅ Created public/assets/icons/\n');
}

if (!fs.existsSync(cloudIconsTargetDir)) {
  fs.mkdirSync(cloudIconsTargetDir, { recursive: true });
  console.log('✅ Created public/icons/\n');
}

// Copy sprite directories
const spriteDirectories = [
  'standard-sprite',
  'custom-sprite',
  'utility-sprite',
  'action-sprite',
  'doctype-sprite'
];

let copiedCount = 0;

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    return;
  }
  
  const stat = fs.statSync(src);
  
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    
    const files = fs.readdirSync(src);
    for (const file of files) {
      copyRecursive(
        path.join(src, file),
        path.join(dest, file)
      );
    }
  } else {
    fs.copyFileSync(src, dest);
    copiedCount++;
  }
}

spriteDirectories.forEach(dir => {
  const srcPath = path.join(sldsSourceDir, dir);
  const destPath = path.join(sldsTargetDir, dir);
  
  if (fs.existsSync(srcPath)) {
    console.log(`   Copying ${dir}...`);
    copyRecursive(srcPath, destPath);
  } else {
    console.log(`   ⚠️  ${dir} not found at ${srcPath}`);
  }
});

console.log(`\n✅ Copied ${copiedCount} SLDS files to public/assets/icons/\n`);

// Copy cloud icons
console.log('📦 Copying cloud icons...\n');
let cloudIconsCopied = 0;

const cloudIconFiles = fs.readdirSync(cloudIconsSourceDir);
cloudIconFiles.forEach(file => {
  const srcPath = path.join(cloudIconsSourceDir, file);
  const destPath = path.join(cloudIconsTargetDir, file);
  
  // Only copy image files
  if (/\.(png|svg|jpg|jpeg)$/i.test(file)) {
    fs.copyFileSync(srcPath, destPath);
    cloudIconsCopied++;
    console.log(`   ✅ ${file}`);
  }
});

console.log(`\n✅ Copied ${cloudIconsCopied} cloud icons to public/icons/\n`);

// Verify critical files exist
const criticalFiles = [
  'standard-sprite/svg/symbols.svg',
  'custom-sprite/svg/symbols.svg'
];

let allGood = true;
console.log('🔍 Verifying critical SLDS files...\n');
criticalFiles.forEach(file => {
  const filePath = path.join(sldsTargetDir, file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    const sizeKB = (stats.size / 1024).toFixed(1);
    console.log(`   ✅ ${file} (${sizeKB} KB)`);
  } else {
    console.log(`   ❌ ${file} - MISSING!`);
    allGood = false;
  }
});

// Verify some cloud icons exist
const criticalCloudIcons = ['fsc.png', 'salescloud.png', 'service-cloud.png'];
console.log('\n🔍 Verifying cloud icons...\n');
criticalCloudIcons.forEach(file => {
  const filePath = path.join(cloudIconsTargetDir, file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    const sizeKB = (stats.size / 1024).toFixed(1);
    console.log(`   ✅ ${file} (${sizeKB} KB)`);
  } else {
    console.log(`   ⚠️  ${file} - not found (optional)`);
  }
});

if (allGood) {
  console.log('\n🎉 All icons ready!\n');
} else {
  console.error('\n❌ Some critical files are missing!\n');
  process.exit(1);
}

