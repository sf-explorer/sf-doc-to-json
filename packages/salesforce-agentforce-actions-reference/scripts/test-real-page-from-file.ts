#!/usr/bin/env node

import * as cheerio from 'cheerio';
import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

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
 * Test extraction from saved HTML file
 */
async function testFromFile() {
    const htmlFile = path.join(__dirname, '__tests__', 'real-page-create-incident-resolution-summary.html');
    const actionName = 'Create Incident Resolution Summary';
    
    console.log('='.repeat(80));
    console.log('🧪 TESTING EXTRACTION FROM SAVED HTML FILE');
    console.log('='.repeat(80));
    console.log(`\n📄 File: ${htmlFile}`);
    console.log(`📝 Action: ${actionName}`);
    console.log('='.repeat(80));
    
    try {
        console.log('\n⏳ Reading HTML file...');
        const html = await fs.readFile(htmlFile, 'utf8');
        console.log(`✅ Read ${html.length} characters\n`);
        
        const $ = cheerio.load(html);
        
        // Helper function to check if text is a valid description
        const isDescriptionParagraph = (text: string): boolean => {
            const lower = text.toLowerCase();
            // Skip "Available in:" patterns and sidebar text
            if (lower.startsWith('available in:') || 
                lower.includes('requires each user') ||
                lower.includes('edition') ||
                lower.includes('cookie') ||
                lower.includes('privacy') ||
                lower.includes('table of contents') ||
                lower.includes('use gen ai to create an agent') ||
                lower.includes('legacy builder')) {
                return false;
            }
            
            // Aggressively filter out navigation/sidebar text
            if (lower.includes('bypass the welcome message') ||
                lower.includes('bypass the welcome') ||
                (lower.includes('bypass') && lower.includes('welcome') && lower.includes('message')) ||
                (lower.includes('bypass') && lower.includes('handing off'))) {
                return false;
            }
            
            const navigationPatterns = [
                'bypass',
                'welcome message',
                'handing off',
                'ongoing conversations',
                'handoff',
                'previous',
                'next',
                'see also',
                'related articles',
                'related topics',
                'navigation',
                'skip to',
                'jump to',
                'handing off ongoing',
                'welcome message when'
            ];
            
            for (const pattern of navigationPatterns) {
                if (lower.includes(pattern)) {
                    return false;
                }
            }
            
            // Must be substantial
            if (text.length < 30 || text.length > 1000) {
                return false;
            }
            
            return true;
        };
        
        // Get h1 text (action name) for keyword matching
        const h1Text = cleanWhitespace($('h1').first().text());
        const h1Keywords = h1Text.toLowerCase()
            .split(/\s+/)
            .filter(word => word.length > 3)
            .slice(0, 3);
        
        console.log(`📝 H1 text: "${h1Text}"`);
        console.log(`🔑 Keywords: ${h1Keywords.join(', ')}\n`);
        
        const unrelatedWords = ['welcome', 'message', 'handing', 'conversations', 'bypass', 
                              'handoff', 'ongoing', 'previous', 'next', 'see also', 
                              'related articles', 'table of contents', 'skip to', 'jump to',
                              'navigation', 'hand off', 'handing off'];
        
        let enhancedDescription = '';
        
        // Strategy 1: Find first paragraph after h1 in main content
        console.log('📍 Strategy 1: Looking in main content');
        // Try #content first (Salesforce Help pages use this)
        let main = $('#content').first();
        console.log(`   #content div found: ${main.length > 0}`);
        
        // Fallback: try main/article if #content not found
        if (!main.length) {
            main = $('main, article, [role="main"]').first();
            console.log(`   Main/article element found: ${main.length > 0}`);
        }
        
        // Fallback: try body if nothing else found
        if (!main.length) {
            main = $('body');
            console.log(`   Using body as fallback`);
        }
        
        if (main.length) {
            const h1 = main.find('h1').first();
            console.log(`   H1 found: ${h1.length > 0}`);
            if (!h1.length) {
                // If h1 not in main, try finding it globally and then searching from there
                console.log(`   H1 not in main, searching globally...`);
                const globalH1 = $('h1').first();
                if (globalH1.length) {
                    console.log(`   Found global H1: "${cleanWhitespace(globalH1.text())}"`);
                    // Use the global h1 and search from its parent context
                    main = globalH1.parent().closest('#content, main, article, [role="main"]').length ? 
                           globalH1.parent().closest('#content, main, article, [role="main"]') : 
                           globalH1.parent();
                    console.log(`   Using parent context for search`);
                }
            }
            
            if (h1.length) {
                // First, try the immediate next sibling paragraph
                console.log(`\n   Checking h1.next('p')...`);
                const immediateNextP = h1.next('p');
                if (immediateNextP.length) {
                    const text = cleanWhitespace(immediateNextP.text());
                    const textLower = text.toLowerCase();
                    console.log(`   Found: "${text.substring(0, 80)}${text.length > 80 ? '...' : ''}"`);
                    
                    if (textLower.includes('bypass') ||
                        textLower.includes('welcome message') ||
                        textLower.includes('handing off') ||
                        textLower.startsWith('bypass') ||
                        textLower.startsWith('welcome')) {
                        console.log(`   ❌ Rejected: navigation text`);
                    } else if (isDescriptionParagraph(text)) {
                        enhancedDescription = text.substring(0, 500);
                        console.log(`   ✅ Using immediate next paragraph`);
                    }
                }
                
                // If immediate next didn't work, try all paragraphs after h1
                if (!enhancedDescription) {
                    console.log(`\n   Checking h1.nextAll('p')...`);
                    let bestMatch: string | null = null;
                    let bestScore = 0;
                    
                    h1.nextAll('p').each((idx, p) => {
                        const text = cleanWhitespace($(p).text());
                        const textLower = text.toLowerCase();
                        
                        console.log(`   Paragraph ${idx}: "${text.substring(0, 60)}${text.length > 60 ? '...' : ''}"`);
                        
                        // Aggressively reject navigation text
                        if (textLower.includes('bypass') ||
                            textLower.includes('welcome message') ||
                            textLower.includes('handing off') ||
                            textLower.startsWith('bypass') ||
                            textLower.startsWith('welcome')) {
                            console.log(`     ❌ Rejected: navigation text`);
                            return;
                        }
                        
                        if (isDescriptionParagraph(text)) {
                            let score = 0;
                            
                            // Score based on keywords
                            for (const keyword of h1Keywords) {
                                if (textLower.includes(keyword)) {
                                    score += 10;
                                }
                            }
                            
                            if (text.length < 300) {
                                score += 3;
                            }
                            
                            console.log(`     ✅ Valid, score: ${score}`);
                            
                            if (score > 0 && score > bestScore) {
                                bestScore = score;
                                bestMatch = text;
                            }
                        } else {
                            console.log(`     ❌ Not valid description`);
                        }
                    });
                    
                    if (bestMatch && bestScore > 0) {
                        enhancedDescription = bestMatch.substring(0, 500);
                        console.log(`   ✅ Using best match with score ${bestScore}`);
                    }
                }
                
                // Check paragraphs inside divs/sections
                if (!enhancedDescription) {
                    console.log(`\n   Checking h1.nextAll('div, section').find('p')...`);
                    let divBestMatch: string | null = null;
                    let divBestScore = 0;
                    
                    h1.nextAll('div, section').each((_, elem) => {
                        const $elem = $(elem);
                        $elem.find('p').each((idx, p) => {
                            const text = cleanWhitespace($(p).text());
                            const textLower = text.toLowerCase();
                            
                            console.log(`   Div paragraph ${idx}: "${text.substring(0, 60)}${text.length > 60 ? '...' : ''}"`);
                            
                            // Reject navigation text
                            if (textLower.includes('bypass') ||
                                textLower.includes('welcome message') ||
                                textLower.includes('handing off') ||
                                textLower.startsWith('bypass') ||
                                textLower.startsWith('welcome')) {
                                console.log(`     ❌ Rejected: navigation text`);
                                return;
                            }
                            
                            if (isDescriptionParagraph(text)) {
                                let score = 0;
                                
                                for (const keyword of h1Keywords) {
                                    if (textLower.includes(keyword)) {
                                        score += 10;
                                    }
                                }
                                
                                if (text.length < 300) {
                                    score += 3;
                                }
                                
                                console.log(`     ✅ Valid, score: ${score}`);
                                
                                if (score > 0 && (score > divBestScore || !divBestMatch)) {
                                    divBestScore = score;
                                    divBestMatch = text;
                                }
                            } else {
                                console.log(`     ❌ Not valid description`);
                            }
                        });
                    });
                    
                    if (divBestMatch && divBestScore > 0) {
                        enhancedDescription = divBestMatch.substring(0, 500);
                        console.log(`   ✅ Using best match from div with score ${divBestScore}`);
                    }
                }
            }
        }
        
        console.log(`\n${'='.repeat(80)}`);
        console.log('📋 EXTRACTION RESULT');
        console.log('='.repeat(80));
        console.log(`\n✅ Extracted Description: "${enhancedDescription}"`);
        console.log(`\n📊 Description Length: ${enhancedDescription.length} characters`);
        
        if (enhancedDescription) {
            const descLower = enhancedDescription.toLowerCase();
            const hasNavigation = 
                descLower.includes('bypass') ||
                descLower.includes('welcome message') ||
                descLower.includes('handing off') ||
                descLower.startsWith('available in:');
            
            console.log(`\n🚫 Contains Navigation Text: ${hasNavigation ? '❌ YES (BAD)' : '✅ NO (GOOD)'}`);
            console.log(`🚫 Starts with "Available in:": ${descLower.startsWith('available in:') ? '❌ YES (BAD)' : '✅ NO (GOOD)'}`);
            
            const hasKeywords = ['generates', 'summary', 'incident', 'resolution'].some(k => 
                descLower.includes(k)
            );
            console.log(`\n🔑 Contains Expected Keywords: ${hasKeywords ? '✅ YES' : '❌ NO'}`);
        } else {
            console.log(`\n❌ No description extracted!`);
        }
        
        console.log(`\n${'='.repeat(80)}`);
        
    } catch (error) {
        console.error(`\n❌ Error:`, error);
        if (error instanceof Error) {
            console.error(`   Message: ${error.message}`);
            if (error.message.includes('ENOENT')) {
                console.error(`\n💡 Tip: Run 'npm run save:real-page' first to fetch and save the page.`);
            }
        }
        process.exit(1);
    }
}

// Run the test
testFromFile().catch(console.error);

