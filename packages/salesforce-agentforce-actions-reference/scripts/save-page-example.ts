#!/usr/bin/env node

import puppeteer from 'puppeteer';
import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function savePageExample() {
    const url = 'https://help.salesforce.com/s/articleView?id=ai.agent_ref_it_srvcs_createincdtresltionsumry.htm&type=5';
    
    console.log(`Fetching page: ${url}`);
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    try {
        const page = await browser.newPage();
        page.setDefaultNavigationTimeout(60000);
        page.setDefaultTimeout(60000);
        
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await delay(5000); // Wait for page to fully load
        
        // Get the HTML content
        const html = await page.content();
        
        // Save to file
        const outputPath = path.join(__dirname, 'page-example-create-incident-resolution-summary.html');
        await fs.writeFile(outputPath, html, 'utf8');
        
        console.log(`\n✅ Saved HTML to: ${outputPath}`);
        console.log(`📄 HTML size: ${(html.length / 1024).toFixed(2)} KB`);
        
        // Also extract and show the structure for debugging
        const mainContent = await page.evaluate(() => {
            const main = document.querySelector('main, article, [role="main"]');
            if (!main) return null;
            
            const h1 = main.querySelector('h1');
            const h1Text = h1?.textContent?.trim() || '';
            
            // Get all paragraphs
            const paragraphs: Array<{ text: string; isAfterH1: boolean }> = [];
            const allP = main.querySelectorAll('p');
            
            allP.forEach((p) => {
                const text = p.textContent?.trim() || '';
                if (text.length > 0) {
                    // Check if this paragraph comes after h1
                    let isAfterH1 = false;
                    if (h1) {
                        // Simple check: if paragraph's position in DOM is after h1
                        const h1Index = Array.from(main.children).indexOf(h1);
                        const pParent = p.closest('div, section, main, article');
                        if (pParent) {
                            const pIndex = Array.from(main.children).indexOf(pParent as Element);
                            isAfterH1 = pIndex > h1Index || pParent.contains(h1);
                        }
                    }
                    paragraphs.push({ text: text.substring(0, 200), isAfterH1 });
                }
            });
            
            return {
                h1Text,
                h1Found: !!h1,
                paragraphCount: paragraphs.length,
                paragraphs: paragraphs.slice(0, 10) // First 10 paragraphs
            };
        });
        
        if (mainContent) {
            console.log(`\n📋 Page Structure:`);
            console.log(`   H1: "${mainContent.h1Text}"`);
            console.log(`   H1 Found: ${mainContent.h1Found}`);
            console.log(`   Total Paragraphs: ${mainContent.paragraphCount}`);
            console.log(`\n   First paragraphs:`);
            mainContent.paragraphs.forEach((p, idx) => {
                console.log(`   ${idx + 1}. [After H1: ${p.isAfterH1}] "${p.text}${p.text.length >= 200 ? '...' : ''}"`);
            });
        }
        
    } finally {
        await browser.close();
    }
}

savePageExample().catch(console.error);

