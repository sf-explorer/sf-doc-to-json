#!/usr/bin/env node
import { fetchDocuments } from './scraper.js';

const version = process.argv[2] || '264.0';
const specificDoc = process.argv[3];

(async () => {
    try {
        await fetchDocuments(version, specificDoc);
    } catch (error) {
        console.error('\n✗ Fatal error:', (error as Error).message);
        process.exit(1);
    }
})();
