#!/usr/bin/env node

import * as cheerio from 'cheerio';

function cleanWhitespace(text: string): string {
    return text
        .replace(/\n/g, ' ')
        .replace(/\t/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Extract description from HTML content - extracted from scrape-actions-puppeteer.ts for testing
 */
function extractDescription(html: string, actionName: string): string {
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
            'jump to'
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
        
        // Must not be mostly navigation text
        const navigationWords = ['bypass', 'welcome', 'message', 'handing', 'conversations', 
                               'handoff', 'previous', 'next', 'skip', 'jump'];
        const words = lower.split(/\s+/);
        const navigationWordCount = words.filter(w => navigationWords.some(nw => w.includes(nw))).length;
        if (navigationWordCount > words.length * 0.3) {
            return false; // More than 30% navigation words = likely navigation text
        }
        
        return true;
    };
    
    // Get h1 text (action name) for keyword matching
    const h1Text = cleanWhitespace($('h1').first().text());
    const h1Keywords = h1Text.toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 3)
        .slice(0, 3);
    
    const unrelatedWords = ['welcome', 'message', 'handing', 'conversations', 'bypass', 
                          'handoff', 'ongoing', 'previous', 'next', 'see also', 
                          'related articles', 'table of contents', 'skip to', 'jump to',
                          'navigation', 'hand off', 'handing off'];
    
    let enhancedDescription = '';
    
    console.log(`\n🔍 Testing extraction for: ${actionName}`);
    console.log(`📝 H1 text: "${h1Text}"`);
    console.log(`🔑 Keywords: ${h1Keywords.join(', ')}`);
    
    // Strategy 1: Find first paragraph after h1 in main content
    const main = $('main, article, [role="main"]').first();
    console.log(`\n📍 Strategy 1: Looking in main content`);
    console.log(`   Main element found: ${main.length > 0}`);
    
    if (main.length) {
        const h1 = main.find('h1').first();
        console.log(`   H1 found: ${h1.length > 0}`);
        
        if (h1.length) {
            // Debug: Show all paragraphs
            const allParagraphs = main.find('p');
            console.log(`   Total paragraphs in main: ${allParagraphs.length}`);
            
            allParagraphs.each((idx, p) => {
                const text = cleanWhitespace($(p).text());
                console.log(`   Paragraph ${idx}: "${text.substring(0, 60)}${text.length > 60 ? '...' : ''}"`);
            });
            
            // Use nextAll() to get all elements after h1, then filter for paragraphs
            let bestMatch: string | null = null;
            let bestScore = 0;
            let foundGoodMatch = false;
            
            console.log(`\n   Using h1.nextAll('p') to find paragraphs after h1...`);
            const nextAllParagraphs = h1.nextAll('p');
            console.log(`   Paragraphs found with nextAll('p'): ${nextAllParagraphs.length}`);
            
            // Get all paragraphs that come after the h1
            h1.nextAll('p').each((idx, p) => {
                if (foundGoodMatch) return false; // Exit if we found a good match
                
                const text = cleanWhitespace($(p).text());
                console.log(`   Checking paragraph ${idx}: "${text.substring(0, 60)}${text.length > 60 ? '...' : ''}"`);
                
                const isValid = isDescriptionParagraph(text);
                console.log(`     Valid description? ${isValid}`);
                
                if (isValid) {
                    const textLower = text.toLowerCase();
                    let score = 0;
                    
                    // Score based on keywords from action name
                    for (const keyword of h1Keywords) {
                        if (textLower.includes(keyword)) {
                            score += 10;
                            console.log(`     +10 for keyword "${keyword}"`);
                        }
                    }
                    
                    // Prefer shorter paragraphs
                    if (text.length < 300) {
                        score += 3;
                        console.log(`     +3 for short paragraph`);
                    }
                    
                    // Heavily penalize unrelated words - if any found, reject this paragraph
                    if (unrelatedWords.some(word => textLower.includes(word))) {
                        score = -100; // Strong rejection
                        console.log(`     -100 for unrelated words`);
                    }
                    
                    // Also check if text starts with navigation patterns
                    if (textLower.startsWith('bypass') || 
                        textLower.startsWith('welcome') ||
                        textLower.startsWith('handing') ||
                        textLower.startsWith('skip') ||
                        textLower.startsWith('jump')) {
                        score = -100;
                        console.log(`     -100 for navigation pattern`);
                    }
                    
                    console.log(`     Final score: ${score}`);
                    
                    // Only consider paragraphs with positive scores
                    if (score > 0 && score > bestScore) {
                        bestScore = score;
                        bestMatch = text;
                        console.log(`     ✅ New best match!`);
                        
                        // If good match found, use it immediately
                        if (score > 5) {
                            enhancedDescription = text.substring(0, 500);
                            foundGoodMatch = true;
                            console.log(`     🎯 Using immediately (score > 5)`);
                            return false; // Exit the each loop
                        }
                    }
                }
            });
            
            // Only use best match if it has a positive score (not rejected)
            if (bestMatch && bestScore > 0 && !foundGoodMatch) {
                enhancedDescription = bestMatch.substring(0, 500);
                console.log(`   ✅ Using best match with score ${bestScore}`);
            }
            
            // If still no match, check paragraphs inside divs/sections that come after h1
            if (!enhancedDescription) {
                console.log(`\n   Checking paragraphs inside divs/sections after h1...`);
                let divBestMatch: string | null = null;
                let divBestScore = 0;
                let divFoundGoodMatch = false;
                
                h1.nextAll('div, section').each((_, elem) => {
                    if (divFoundGoodMatch) return false;
                    
                    const $elem = $(elem);
                    console.log(`   Found div/section, checking paragraphs inside...`);
                    $elem.find('p').each((_, p) => {
                        if (divFoundGoodMatch) return false;
                        
                        const text = cleanWhitespace($(p).text());
                        const textLower = text.toLowerCase();
                        console.log(`     Checking paragraph in div: "${text.substring(0, 60)}${text.length > 60 ? '...' : ''}"`);
                        
                        // Aggressively reject navigation text BEFORE checking isDescriptionParagraph
                        if (textLower.includes('bypass') ||
                            textLower.includes('welcome message') ||
                            textLower.includes('handing off') ||
                            textLower.includes('ongoing conversations') ||
                            textLower.startsWith('bypass') ||
                            textLower.startsWith('welcome') ||
                            textLower.startsWith('handing') ||
                            (textLower.includes('bypass') && textLower.includes('welcome')) ||
                            (textLower.includes('bypass') && textLower.includes('handing'))) {
                            console.log(`     ❌ Rejected: navigation text`);
                            return; // Skip this paragraph completely
                        }
                        
                        if (isDescriptionParagraph(text)) {
                            let score = 0;
                            
                            // Score based on keywords
                            for (const keyword of h1Keywords) {
                                if (textLower.includes(keyword)) {
                                    score += 10;
                                    console.log(`     +10 for keyword "${keyword}"`);
                                }
                            }
                            
                            // Prefer shorter paragraphs
                            if (text.length < 300) {
                                score += 3;
                                console.log(`     +3 for short paragraph`);
                            }
                            
                            // Reject if contains navigation words
                            if (unrelatedWords.some(word => textLower.includes(word)) ||
                                textLower.startsWith('bypass') ||
                                textLower.startsWith('welcome') ||
                                textLower.startsWith('handing')) {
                                score = -100;
                                console.log(`     -100 for navigation words`);
                            }
                            
                            console.log(`     Final score: ${score}`);
                            
                            // Only consider paragraphs with positive scores
                            if (score > 0) {
                                if (score > divBestScore || !divBestMatch) {
                                    divBestScore = score;
                                    divBestMatch = text;
                                    console.log(`     ✅ New best match from div!`);
                                }
                                
                                // If good match found, use it immediately
                                if (score > 5) {
                                    enhancedDescription = text.substring(0, 500);
                                    divFoundGoodMatch = true;
                                    console.log(`     🎯 Using immediately from div (score > 5)`);
                                    return false;
                                }
                            }
                        }
                    });
                });
                
                // Use best match from divs if we found one
                if (divBestMatch && divBestScore > 0 && !divFoundGoodMatch) {
                    enhancedDescription = divBestMatch.substring(0, 500);
                    console.log(`   ✅ Using best match from div with score ${divBestScore}`);
                }
            }
            
            // If still no match, try getting the immediate next sibling paragraph
            if (!enhancedDescription) {
                console.log(`\n   Trying h1.next('p') as fallback...`);
                const nextP = h1.next('p');
                console.log(`   Next sibling paragraph found: ${nextP.length > 0}`);
                
                if (nextP.length) {
                    const text = cleanWhitespace(nextP.text());
                    console.log(`   Text: "${text.substring(0, 60)}${text.length > 60 ? '...' : ''}"`);
                    const isValid = isDescriptionParagraph(text);
                    console.log(`   Valid? ${isValid}`);
                    
                    if (isValid) {
                        const textLower = text.toLowerCase();
                        // Quick check - if it doesn't contain navigation words, use it
                        if (!unrelatedWords.some(word => textLower.includes(word)) &&
                            !textLower.startsWith('bypass') &&
                            !textLower.startsWith('welcome') &&
                            !textLower.startsWith('handing')) {
                            enhancedDescription = text.substring(0, 500);
                            console.log(`   ✅ Using next('p') result`);
                        } else {
                            console.log(`   ❌ Rejected due to navigation words`);
                        }
                    }
                }
            }
        }
    }
    
    // Strategy 2: If no good match, try all paragraphs in main content
    if (!enhancedDescription) {
        console.log(`\n📍 Strategy 2: Trying all paragraphs in main`);
        const main = $('main, article, [role="main"]').first();
        if (main.length) {
            let bestMatch: string | null = null;
            let bestScore = 0;
            
            main.find('p').each((idx, p) => {
                const text = cleanWhitespace($(p).text());
                if (isDescriptionParagraph(text)) {
                    const textLower = text.toLowerCase();
                    let score = 0;
                    
                    // Score based on keywords
                    for (const keyword of h1Keywords) {
                        if (textLower.includes(keyword)) {
                            score += 10;
                        }
                    }
                    
                    // Heavily penalize unrelated words - if any found, reject this paragraph
                    if (unrelatedWords.some(word => textLower.includes(word))) {
                        score = -100; // Strong rejection
                    }
                    
                    // Also check if text starts with navigation patterns
                    if (textLower.startsWith('bypass') || 
                        textLower.startsWith('welcome') ||
                        textLower.startsWith('handing') ||
                        textLower.startsWith('skip') ||
                        textLower.startsWith('jump')) {
                        score = -100;
                    }
                    
                    // Only consider paragraphs with positive scores
                    if (score > 0 && score > bestScore) {
                        bestScore = score;
                        bestMatch = text;
                    }
                }
            });
            
            if (bestMatch && bestScore > 0) {
                enhancedDescription = bestMatch.substring(0, 500);
                console.log(`   ✅ Found match with score ${bestScore}`);
            }
        }
    }
    
    console.log(`\n📋 Final result: "${enhancedDescription}"`);
    return enhancedDescription;
}

// Test cases
console.log('='.repeat(80));
console.log('TEST 1: Create Incident Resolution Summary (nested in div)');
console.log('='.repeat(80));
const html1 = `
    <main role="main">
        <div class="content">
            <h1>Create Incident Resolution Summary</h1>
            <div class="article-body">
                <p>Bypass the Welcome Message When Handing Off Ongoing Conversations to...</p>
                <p>This action generates a comprehensive summary of incident resolution details including root cause analysis and resolution steps taken to resolve the incident.</p>
                <p>Available in: Agentforce for Service add-on.</p>
            </div>
        </div>
    </main>
`;
const result1 = extractDescription(html1, 'Create Incident Resolution Summary');
console.log(`\n✅ Expected: "This action generates a comprehensive summary..."`);
console.log(`✅ Got: "${result1}"`);
console.log(`✅ Match: ${result1.includes('generates') && result1.includes('summary') && !result1.includes('Bypass')}`);

console.log('\n' + '='.repeat(80));
console.log('TEST 1b: Create Incident Resolution Summary (direct siblings)');
console.log('='.repeat(80));
const html1b = `
    <main>
        <h1>Create Incident Resolution Summary</h1>
        <p>Bypass the Welcome Message When Handing Off Ongoing Conversations to...</p>
        <p>This action generates a summary of the resolution details for an incident record.</p>
        <p>Available in: Agentforce for Service add-on.</p>
    </main>
`;
const result1b = extractDescription(html1b, 'Create Incident Resolution Summary');
console.log(`\n✅ Expected: "This action generates a summary..."`);
console.log(`✅ Got: "${result1b}"`);
console.log(`✅ Match: ${result1b.includes('generates a summary') && !result1b.includes('Bypass')}`);

console.log('\n' + '='.repeat(80));
console.log('TEST 2: Check Incident Attributes');
console.log('='.repeat(80));
const html2 = `
    <main>
        <h1>Check Incident Attributes</h1>
        <p>Bypass the Welcome Message When Handing Off Ongoing Conversations to...</p>
        <p>This action checks the attributes of an incident record to determine its current state.</p>
    </main>
`;
const result2 = extractDescription(html2, 'Check Incident Attributes');
console.log(`\n✅ Expected: "This action checks the attributes..."`);
console.log(`✅ Got: "${result2}"`);
console.log(`✅ Match: ${result2.includes('checks the attributes') && !result2.includes('Bypass')}`);

console.log('\n' + '='.repeat(80));
console.log('TEST 3: Nested divs');
console.log('='.repeat(80));
const html3 = `
    <main>
        <h1>Associate Related Records For Incident</h1>
        <div>
            <p>Bypass the Welcome Message When Handing Off Ongoing Conversations to...</p>
        </div>
        <div>
            <p>This action associates related records with an incident.</p>
        </div>
    </main>
`;
const result3 = extractDescription(html3, 'Associate Related Records For Incident');
console.log(`\n✅ Expected: "This action associates related records..."`);
console.log(`✅ Got: "${result3}"`);
console.log(`✅ Match: ${result3.includes('associates related records') && !result3.includes('Bypass')}`);

// Summary of extracted descriptions
console.log('\n' + '='.repeat(80));
console.log('📊 EXTRACTION SUMMARY');
console.log('='.repeat(80));
console.log('\nTEST 1 - Create Incident Resolution Summary (nested):');
console.log(`  Extracted: "${result1}"`);
console.log(`  ✅ Correct: ${result1.includes('generates') && result1.includes('summary') && !result1.includes('Bypass')}`);

console.log('\nTEST 1b - Create Incident Resolution Summary (direct):');
console.log(`  Extracted: "${result1b}"`);
console.log(`  ✅ Correct: ${result1b.includes('generates a summary') && !result1b.includes('Bypass')}`);

console.log('\nTEST 2 - Check Incident Attributes:');
console.log(`  Extracted: "${result2}"`);
console.log(`  ✅ Correct: ${result2.includes('checks the attributes') && !result2.includes('Bypass')}`);

console.log('\nTEST 3 - Associate Related Records For Incident:');
console.log(`  Extracted: "${result3}"`);
console.log(`  ✅ Correct: ${result3.includes('associates related records') && !result3.includes('Bypass')}`);

// Verify all tests passed
const allTestsPassed = 
    (result1.includes('generates') && result1.includes('summary') && !result1.includes('Bypass')) &&
    (result1b.includes('generates a summary') && !result1b.includes('Bypass')) &&
    (result2.includes('checks the attributes') && !result2.includes('Bypass')) &&
    (result3.includes('associates related records') && !result3.includes('Bypass'));

console.log('\n' + '='.repeat(80));
if (allTestsPassed) {
    console.log('✅ ALL TESTS PASSED!');
} else {
    console.log('❌ SOME TESTS FAILED');
}
console.log('='.repeat(80));

