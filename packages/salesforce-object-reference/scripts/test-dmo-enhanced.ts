/**
 * Enhanced DMO scraper - Test with single object (Account)
 * This script tests fetching detailed DMO information including API name, category, and fields
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function cleanWhitespace(text: string): string {
    return text
        .replace(/\n/g, ' ')
        .replace(/\t/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Fetch detailed DMO information from individual DMO page
 */
async function fetchDMODetails(dmoName: string, url: string) {
    console.log(`\nFetching details for: ${dmoName}`);
    console.log(`URL: ${url}`);
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const html = await response.text();
        const $ = cheerio.load(html);
        
        // Extract API Name (should be in a code block near the top)
        let apiName = '';
        $('code').each((_, el) => {
            const text = $(el).text().trim();
            if (text.includes('ssot__') && text.includes('__dlm')) {
                apiName = text;
                return false; // break
            }
        });
        
        // Extract categories (text before API name)
        const categories: string[] = [];
        const headerText = $('h1, h2').first().parent().text();
        // Categories are typically listed after description and before API name
        
        // Extract Primary Key (field with primary key indication)
        let primaryKey = '';
        
        // Extract fields table
        const fields: Array<{
            fieldName: string;
            fieldApiName: string;
            description: string;
            dataType: string;
            dataBundle: string;
        }> = [];
        
        // Find the fields table - look for table with headers that match DMO structure
        $('table').each((_, table) => {
            const $table = $(table);
            const headers: string[] = [];
            
            // Get headers
            $table.find('thead th, thead td').each((_, th) => {
                headers.push(cleanWhitespace($(th).text()));
            });
            
            // Check if this is the fields table
            if (headers.some(h => h.toLowerCase().includes('field name')) && 
                headers.some(h => h.toLowerCase().includes('field api name'))) {
                
                console.log(`  Found fields table with headers: ${headers.join(', ')}`);
                
                // Extract rows
                $table.find('tbody tr').each((_, row) => {
                    const cells: string[] = [];
                    $(row).find('td').each((_, cell) => {
                        cells.push(cleanWhitespace($(cell).text()));
                    });
                    
                    if (cells.length >= 4) {
                        fields.push({
                            fieldName: cells[0] || '',
                            fieldApiName: cells[1] || '',
                            description: cells[2] || '',
                            dataType: cells[3] || '',
                            dataBundle: cells[4] || ''
                        });
                    }
                });
            }
        });
        
        console.log(`  API Name: ${apiName || 'NOT FOUND'}`);
        console.log(`  Fields found: ${fields.length}`);
        if (fields.length > 0) {
            console.log(`  First few fields:`);
            fields.slice(0, 3).forEach(f => {
                console.log(`    - ${f.fieldName} (${f.fieldApiName}) - ${f.dataType}`);
            });
        }
        
        return {
            apiName,
            categories,
            primaryKey,
            fields,
            fieldsCount: fields.length
        };
        
    } catch (error) {
        console.error(`  Error: ${error}`);
        return null;
    }
}

async function main() {
    console.log('🧪 Testing Enhanced DMO Scraper with Account DMO\n');
    
    const testUrl = 'https://developer.salesforce.com/docs/data/data-cloud-dmo-mapping/guide/c360dm-account-dmo.html';
    const result = await fetchDMODetails('Account', testUrl);
    
    if (result) {
        console.log('\n✅ Test Result:');
        console.log(JSON.stringify(result, null, 2));
        
        // Save to test file
        const testFile = path.join(__dirname, '../src/doc/ssot__objects/A/Account-test.json');
        await fs.writeFile(testFile, JSON.stringify({
            Account: {
                name: 'Account',
                apiName: result.apiName,
                description: 'The Account DMO represents how a party wants to interact with your company.',
                categories: result.categories,
                primaryKey: result.primaryKey,
                fields: result.fields,
                fieldsCount: result.fieldsCount,
                sourceUrl: testUrl,
                module: 'Data Cloud',
                clouds: ['Data Cloud']
            }
        }, null, 2), 'utf-8');
        
        console.log(`\n💾 Saved test file to: ${testFile}`);
    } else {
        console.log('\n❌ Test failed');
    }
}

main().catch(console.error);

