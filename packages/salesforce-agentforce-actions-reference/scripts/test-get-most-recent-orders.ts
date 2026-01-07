/**
 * Test script to debug why "Get Most Recent Orders" action is missing
 */

import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';
import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testGetMostRecentOrders() {
    console.log('='.repeat(80));
    console.log('🧪 TESTING "Get Most Recent Orders" ACTION');
    console.log('='.repeat(80));
    
    const testUrl = 'https://help.salesforce.com/s/articleView?id=ai.copilot_actions_ref_commerce_get_most_recent_orders.htm&language=en_US&type=5';
    
    console.log(`\n📄 Testing: B2B Commerce | Get Most Recent Orders`);
    console.log(`🔗 URL: ${testUrl}`);
    console.log('='.repeat(80));
    
    const browser = await puppeteer.launch({ headless: true });
    
    try {
        console.log('\n⏳ Fetching page with Puppeteer...');
        const page = await browser.newPage();
        await page.goto(testUrl, { waitUntil: 'networkidle0', timeout: 60000 });
        
        // Wait for content to render
        await page.waitForSelector('h1', { timeout: 30000 });
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const html = await page.content();
        console.log(`✅ Fetched ${html.length} characters of HTML\n`);
        
        // Save HTML for inspection
        const outputPath = path.join(__dirname, 'get-most-recent-orders-page.html');
        await fs.writeFile(outputPath, html, 'utf-8');
        console.log(`💾 Saved HTML to: ${outputPath}\n`);
        
        const $ = cheerio.load(html);
        
        // Extract title
        const title = $('h1').first().text().trim();
        console.log(`📋 Title: ${title}\n`);
        
        // Look for all tables
        console.log('='.repeat(80));
        console.log('📊 ANALYZING TABLES');
        console.log('='.repeat(80));
        const tables = $('table');
        console.log(`Found ${tables.length} tables\n`);
        
        tables.each((i, table) => {
            const $table = $(table);
            console.log(`\n--- Table ${i + 1} ---`);
            
            // Get headers
            const headers: string[] = [];
            $table.find('thead th, thead td, tr:first-child th, tr:first-child td').each((_, el) => {
                headers.push($(el).text().trim());
            });
            console.log(`Headers: ${headers.join(' | ')}`);
            
            // Get all rows
            const rows: string[][] = [];
            $table.find('tbody tr, tr').each((_, row) => {
                const cells: string[] = [];
                $(row).find('td, th').each((_, cell) => {
                    cells.push($(cell).text().trim());
                });
                if (cells.length > 0) {
                    rows.push(cells);
                }
            });
            
            console.log(`Rows: ${rows.length}`);
            
            // Check for API Name
            let foundApiName = false;
            rows.forEach((row, rowIdx) => {
                if (row.length >= 2) {
                    const firstCell = row[0].toLowerCase().trim();
                    if (firstCell.includes('api name') || firstCell === 'api name' || firstCell === 'api name:') {
                        foundApiName = true;
                        console.log(`\n✅ FOUND API NAME in row ${rowIdx + 1}:`);
                        console.log(`   Row: ${row.join(' | ')}`);
                        console.log(`   API Name value: "${row[1]}"`);
                    }
                }
            });
            
            if (!foundApiName && rows.length > 0) {
                console.log(`\n⚠️  No API Name found in this table`);
                console.log(`   First few rows:`);
                rows.slice(0, 5).forEach((row, idx) => {
                    console.log(`   Row ${idx + 1}: ${row.join(' | ')}`);
                });
            }
        });
        
        // Look for definition lists
        console.log('\n' + '='.repeat(80));
        console.log('📋 ANALYZING DEFINITION LISTS');
        console.log('='.repeat(80));
        const dls = $('dl');
        console.log(`Found ${dls.length} definition lists\n`);
        
        dls.each((i, dl) => {
            const $dl = $(dl);
            const terms: string[] = [];
            const definitions: string[] = [];
            
            $dl.find('dt').each((_, dt) => {
                terms.push($(dt).text().trim());
            });
            
            $dl.find('dd').each((_, dd) => {
                definitions.push($(dd).text().trim());
            });
            
            console.log(`\n--- Definition List ${i + 1} ---`);
            console.log(`Terms: ${terms.join(', ')}`);
            
            // Check for API Name
            const apiNameIdx = terms.findIndex(t => t.toLowerCase().includes('api name'));
            if (apiNameIdx >= 0) {
                console.log(`\n✅ FOUND API NAME:`);
                console.log(`   Term: "${terms[apiNameIdx]}"`);
                console.log(`   Definition: "${definitions[apiNameIdx] || 'N/A'}"`);
            }
        });
        
        // Look for any text containing "API Name"
        console.log('\n' + '='.repeat(80));
        console.log('🔍 SEARCHING FOR "API Name" TEXT');
        console.log('='.repeat(80));
        
        const apiNameMatches: string[] = [];
        $('*').each((_, el) => {
            const text = $(el).text();
            if (text.toLowerCase().includes('api name') && $(el).children().length === 0) {
                // Leaf node with API Name text
                const parent = $(el).parent();
                const context = parent.text().substring(0, 200);
                if (!apiNameMatches.includes(context)) {
                    apiNameMatches.push(context);
                }
            }
        });
        
        if (apiNameMatches.length > 0) {
            console.log(`\nFound ${apiNameMatches.length} occurrences of "API Name":`);
            apiNameMatches.slice(0, 5).forEach((match, idx) => {
                console.log(`\n${idx + 1}. ${match}`);
            });
        } else {
            console.log(`\n⚠️  No occurrences of "API Name" found in the page`);
        }
        
        console.log('\n' + '='.repeat(80));
        console.log('✅ ANALYSIS COMPLETE');
        console.log('='.repeat(80));
        console.log(`\n💡 Check the saved HTML file for more details: ${outputPath}`);
        
    } catch (error) {
        console.error(`\n❌ Error:`, error);
        if (error instanceof Error) {
            console.error(`   Message: ${error.message}`);
            console.error(`   Stack: ${error.stack}`);
        }
    } finally {
        await browser.close();
    }
}

// Run
testGetMostRecentOrders().catch(console.error);

