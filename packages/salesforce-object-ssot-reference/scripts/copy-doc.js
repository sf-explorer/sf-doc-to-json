import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDocDir = path.join(__dirname, '..', 'src', 'doc');
const distDocDir = path.join(__dirname, '..', 'dist', 'doc');

// Create dist/doc directory
if (!fs.existsSync(distDocDir)) {
  fs.mkdirSync(distDocDir, { recursive: true });
}

// Copy all JSON files and directories from src/doc to dist/doc
function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`Source directory does not exist: ${src}`);
    return;
  }

  const stats = fs.statSync(src);
  
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    
    const items = fs.readdirSync(src);
    items.forEach(item => {
      copyRecursive(path.join(src, item), path.join(dest, item));
    });
  } else if (stats.isFile() && src.endsWith('.json')) {
    fs.copyFileSync(src, dest);
    console.log(`Copied: ${path.relative(path.join(__dirname, '..'), dest)}`);
  }
}

console.log('Copying SSOT documentation files to dist...');
copyRecursive(srcDocDir, distDocDir);
console.log('Done copying documentation files.');


