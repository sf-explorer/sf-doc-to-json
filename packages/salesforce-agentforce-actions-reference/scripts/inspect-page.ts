/**
 * Temporary script to inspect the page structure
 */

import * as cheerio from 'cheerio';
import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function inspectPage() {
    const url = 'https://help.salesforce.com/s/articleView?id=ai.copilot_actions_ref.htm&type=5';
    
    console.log('Fetching page...');
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Save raw HTML for inspection
    const outputPath = path.join(__dirname, 'page-output.html');
    await fs.writeFile(outputPath, html, 'utf-8');
    console.log(`Saved HTML to: ${outputPath}`);
    
    // Try to find action-related content
    console.log('\n=== Looking for tables ===');
    const tables = $('table');
    console.log(`Found ${tables.length} tables`);
    
    tables.each((i, table) => {
        const $table = $(table);
        const headers: string[] = [];
        $table.find('thead th, thead td, tr:first-child th, tr:first-child td').each((_, el) => {
            headers.push($(el).text().trim());
        });
        console.log(`Table ${i + 1} headers:`, headers);
        
        if (headers.length > 0) {
            const firstRow: string[] = [];
            $table.find('tbody tr:first-child td, tr:not(:first-child):first td').each((_, el) => {
                firstRow.push($(el).text().trim().substring(0, 100));
            });
            console.log(`  First row sample:`, firstRow);
        }
    });
    
    console.log('\n=== Looking for definition lists ===');
    const dls = $('dl');
    console.log(`Found ${dls.length} definition lists`);
    
    console.log('\n=== Looking for headings ===');
    const headings = $('h1, h2, h3, h4');
    console.log(`Found ${headings.length} headings`);
    headings.slice(0, 10).each((_, el) => {
        console.log(`  ${$(el).prop('tagName')}: ${$(el).text().trim().substring(0, 80)}`);
    });
    
    console.log('\n=== Looking for lists ===');
    const lists = $('ul, ol');
    console.log(`Found ${lists.length} lists`);
    
    console.log('\n=== Looking for divs with class/id containing "action" ===');
    const actionDivs = $('[class*="action" i], [id*="action" i]');
    console.log(`Found ${actionDivs.length} divs with action-related classes/ids`);
    
    console.log('\n=== Sample of main content ===');
    const mainContent = $('main, article, [role="main"], .content, #content').first();
    if (mainContent.length) {
        console.log(`Found main content area`);
        const text = mainContent.text().substring(0, 500);
        console.log(text);
    } else {
        console.log('No main content area found, trying body...');
        const bodyText = $('body').text().substring(0, 500);
        console.log(bodyText);
    }
}

inspectPage().catch(console.error);

