#!/usr/bin/env node

import * as cheerio from 'cheerio';
import { fetchActionDetailsFromUrl } from './scrape-actions-puppeteer';

function cleanWhitespace(text: string): string {
    return text
        .replace(/\n/g, ' ')
        .replace(/\t/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Test extraction with a real Salesforce help page
 */
async function testRealPageExtraction() {
    console.log('='.repeat(80));
    console.log('🧪 TESTING WITH REAL SALESFORCE HELP PAGE');
    console.log('='.repeat(80));
    
    // Test URLs from actual action files
    const testCases = [
        {
            name: 'Create Incident Resolution Summary',
            url: 'https://help.salesforce.com/s/articleView?id=ai.agent_ref_it_srvcs_createincdtresltionsumry.htm&type=5',
            expectedKeywords: ['generates', 'summary', 'incident', 'resolution']
        },
        {
            name: 'Associate Related Records For Incident',
            url: 'https://help.salesforce.com/s/articleView?id=ai.agent_ref_it_srvcs_associaterelatedrecordsforincident.htm&language=en_US&type=5',
            expectedKeywords: ['associates', 'related', 'records', 'incident']
        },
        {
            name: 'Check Incident Attributes',
            url: 'https://help.salesforce.com/s/articleView?id=ai.agent_ref_it_srvcs_checkincidentattributes.htm&language=en_US&type=5',
            expectedKeywords: ['checks', 'attributes', 'incident']
        }
    ];
    
    for (const testCase of testCases) {
        console.log(`\n${'='.repeat(80)}`);
        console.log(`📄 Testing: ${testCase.name}`);
        console.log(`🔗 URL: ${testCase.url}`);
        console.log('='.repeat(80));
        
        try {
            // Create a mock action object
            const action = {
                name: testCase.name,
                description: 'Available in: Agentforce for Service add-on.',
                category: 'Agentforce for Service',
                clouds: ['Agentforce for Service'],
                properties: {},
                sourceUrl: testCase.url,
                module: 'Agentforce',
                returnType: ''
            };
            
            console.log('\n⏳ Fetching page and extracting description...\n');
            
            // Fetch and extract using the actual scraper function
            const result = await fetchActionDetailsFromUrl(action, testCase.url);
            
            console.log(`\n📋 Original Description: "${action.description}"`);
            console.log(`\n✅ Extracted Description: "${result.description}"`);
            console.log(`\n📊 Description Length: ${result.description.length} characters`);
            
            // Check if it contains expected keywords
            const descLower = result.description.toLowerCase();
            const foundKeywords = testCase.expectedKeywords.filter(keyword => 
                descLower.includes(keyword.toLowerCase())
            );
            
            console.log(`\n🔑 Expected Keywords: ${testCase.expectedKeywords.join(', ')}`);
            console.log(`✅ Found Keywords: ${foundKeywords.join(', ')}`);
            console.log(`📈 Keyword Match: ${foundKeywords.length}/${testCase.expectedKeywords.length}`);
            
            // Check if it rejected navigation text
            const rejectedNavigation = 
                descLower.includes('bypass') ||
                descLower.includes('welcome message') ||
                descLower.includes('handing off') ||
                descLower.startsWith('available in:');
            
            console.log(`\n🚫 Contains Navigation Text: ${rejectedNavigation ? '❌ YES (BAD)' : '✅ NO (GOOD)'}`);
            console.log(`🚫 Starts with "Available in:": ${descLower.startsWith('available in:') ? '❌ YES (BAD)' : '✅ NO (GOOD)'}`);
            
            // Overall assessment
            const isGood = 
                result.description.length > 30 &&
                result.description.length < 1000 &&
                !rejectedNavigation &&
                foundKeywords.length >= 2;
            
            console.log(`\n${'='.repeat(80)}`);
            if (isGood) {
                console.log('✅ EXTRACTION SUCCESSFUL!');
            } else {
                console.log('⚠️  EXTRACTION NEEDS REVIEW');
            }
            console.log('='.repeat(80));
            
            // Show properties if any were found
            if (Object.keys(result.properties).length > 0) {
                console.log(`\n📦 Properties Found: ${Object.keys(result.properties).length}`);
                Object.entries(result.properties).slice(0, 3).forEach(([key, value]) => {
                    console.log(`   - ${key}: ${value.type || 'string'}`);
                });
            }
            
        } catch (error) {
            console.error(`\n❌ Error testing ${testCase.name}:`, error);
            if (error instanceof Error) {
                console.error(`   Message: ${error.message}`);
            }
        }
        
        // Add delay between requests to be respectful
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log(`\n${'='.repeat(80)}`);
    console.log('🏁 TESTING COMPLETE');
    console.log('='.repeat(80));
}

// Run the test
testRealPageExtraction().catch(console.error);

