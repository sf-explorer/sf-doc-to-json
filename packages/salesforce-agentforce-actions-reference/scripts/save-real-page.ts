#!/usr/bin/env node

import puppeteer from 'puppeteer';
import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Save a real Salesforce help page to a file for testing (using Puppeteer to wait for JS to render)
 */
async function saveRealPage() {
    const testUrl = 'https://help.salesforce.com/s/articleView?id=ai.agent_ref_it_srvcs_createincdtresltionsumry.htm&type=5';
    const outputFile = path.join(__dirname, '__tests__', 'real-page-create-incident-resolution-summary.html');
    
    console.log('='.repeat(80));
    console.log('💾 SAVING REAL SALESFORCE HELP PAGE (with Puppeteer)');
    console.log('='.repeat(80));
    console.log(`\n📄 URL: ${testUrl}`);
    console.log(`💾 Saving to: ${outputFile}\n`);
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    try {
        const page = await browser.newPage();
        page.setDefaultNavigationTimeout(60000);
        page.setDefaultTimeout(60000);
        
        console.log('⏳ Loading page and waiting for content to render...');
        await page.goto(testUrl, { waitUntil: 'networkidle0', timeout: 60000 });
        
        // Wait for h1 to appear (content is loaded)
        await page.waitForSelector('h1', { timeout: 30000 });
        console.log('✅ H1 found, waiting a bit more for all content...');
        await delay(3000);
        
        // Get the fully rendered HTML
        const html = await page.content();
        console.log(`✅ Got ${html.length} characters of rendered HTML`);
        
        // Ensure directory exists
        const dir = path.dirname(outputFile);
        await fs.mkdir(dir, { recursive: true });
        
        // Save to file
        await fs.writeFile(outputFile, html, 'utf8');
        console.log(`✅ Saved to ${outputFile}`);
        
        // Verify h1 is in the saved file
        const savedContent = await fs.readFile(outputFile, 'utf8');
        if (savedContent.includes('<h1')) {
            console.log('✅ Verified: H1 tag found in saved file');
        } else {
            console.log('⚠️  Warning: H1 tag not found in saved file');
        }
        
        console.log(`\n${'='.repeat(80)}`);
        console.log('✅ PAGE SAVED SUCCESSFULLY');
        console.log('='.repeat(80));
        console.log(`\nYou can now test extraction with:`);
        console.log(`  npm run test:real-page:from-file`);
        console.log(`\nOr:`);
        console.log(`  npx tsx scripts/test-real-page-from-file.ts`);
        
    } catch (error) {
        console.error(`\n❌ Error:`, error);
        if (error instanceof Error) {
            console.error(`   Message: ${error.message}`);
            console.error(`   Stack: ${error.stack}`);
        }
        process.exit(1);
    } finally {
        await browser.close();
    }
}

// Run
saveRealPage().catch(console.error);

