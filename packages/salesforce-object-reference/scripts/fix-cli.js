import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fix the CLI shebang for the ESM build
const cliPath = path.join(__dirname, '../dist/cli.js');
if (fs.existsSync(cliPath)) {
    let content = fs.readFileSync(cliPath, 'utf-8');
    if (!content.startsWith('#!/usr/bin/env node')) {
        content = '#!/usr/bin/env node\n' + content;
        fs.writeFileSync(cliPath, content);
        console.log('✓ Fixed CLI shebang');
    }
}

