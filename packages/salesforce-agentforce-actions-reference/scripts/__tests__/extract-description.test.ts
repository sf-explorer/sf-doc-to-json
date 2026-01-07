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
    
    // Strategy 1: Find first paragraph after h1 in main content
    const main = $('main, article, [role="main"]').first();
    if (main.length) {
        const h1 = main.find('h1').first();
        if (h1.length) {
            // Use nextAll() to get all elements after h1, then filter for paragraphs
            let bestMatch: string | null = null;
            let bestScore = 0;
            let foundGoodMatch = false;
            
            // Get all paragraphs that come after the h1
            h1.nextAll('p').each((_, p) => {
                if (foundGoodMatch) return false; // Exit if we found a good match
                
                const text = cleanWhitespace($(p).text());
                if (isDescriptionParagraph(text)) {
                    const textLower = text.toLowerCase();
                    let score = 0;
                    
                    // Score based on keywords from action name
                    for (const keyword of h1Keywords) {
                        if (textLower.includes(keyword)) {
                            score += 10;
                        }
                    }
                    
                    // Prefer shorter paragraphs
                    if (text.length < 300) {
                        score += 3;
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
                        
                        // If good match found, use it immediately
                        if (score > 5) {
                            enhancedDescription = text.substring(0, 500);
                            foundGoodMatch = true;
                            return false; // Exit the each loop
                        }
                    }
                }
            });
            
            // Only use best match if it has a positive score (not rejected)
            if (bestMatch && bestScore > 0 && !foundGoodMatch) {
                enhancedDescription = bestMatch.substring(0, 500);
            }
            
            // If still no match, try getting the immediate next sibling paragraph
            if (!enhancedDescription) {
                const nextP = h1.next('p');
                if (nextP.length) {
                    const text = cleanWhitespace(nextP.text());
                    if (isDescriptionParagraph(text)) {
                        const textLower = text.toLowerCase();
                        // Quick check - if it doesn't contain navigation words, use it
                        if (!unrelatedWords.some(word => textLower.includes(word)) &&
                            !textLower.startsWith('bypass') &&
                            !textLower.startsWith('welcome') &&
                            !textLower.startsWith('handing')) {
                            enhancedDescription = text.substring(0, 500);
                        }
                    }
                }
            }
        }
    }
    
    // Strategy 2: If no good match, try all paragraphs in main content
    if (!enhancedDescription) {
        const main = $('main, article, [role="main"]').first();
        if (main.length) {
            let bestMatch: string | null = null;
            let bestScore = 0;
            
            main.find('p').each((_, p) => {
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
            }
        }
    }
    
    return enhancedDescription;
}

describe('Description Extraction', () => {
    test('should extract description after h1 for Create Incident Resolution Summary', () => {
        const html = `
            <main>
                <h1>Create Incident Resolution Summary</h1>
                <p>Bypass the Welcome Message When Handing Off Ongoing Conversations to...</p>
                <p>This action generates a summary of the resolution details for an incident record.</p>
                <p>Available in: Agentforce for Service add-on.</p>
            </main>
        `;
        
        const description = extractDescription(html, 'Create Incident Resolution Summary');
        
        expect(description).toBe('This action generates a summary of the resolution details for an incident record.');
        expect(description).not.toContain('Bypass');
        expect(description).not.toContain('Available in');
    });
    
    test('should extract description for Check Incident Attributes', () => {
        const html = `
            <main>
                <h1>Check Incident Attributes</h1>
                <p>Bypass the Welcome Message When Handing Off Ongoing Conversations to...</p>
                <p>This action checks the attributes of an incident record to determine its current state.</p>
            </main>
        `;
        
        const description = extractDescription(html, 'Check Incident Attributes');
        
        expect(description).toBe('This action checks the attributes of an incident record to determine its current state.');
        expect(description).not.toContain('Bypass');
    });
    
    test('should handle description in div after h1', () => {
        const html = `
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
        
        const description = extractDescription(html, 'Associate Related Records For Incident');
        
        expect(description).toBe('This action associates related records with an incident.');
        expect(description).not.toContain('Bypass');
    });
    
    test('should use next() when nextAll() finds nothing', () => {
        const html = `
            <article>
                <h1>Test Action</h1>
                <p>This is the correct description that should be extracted.</p>
            </article>
        `;
        
        const description = extractDescription(html, 'Test Action');
        
        expect(description).toBe('This is the correct description that should be extracted.');
    });
    
    test('should filter out navigation text even if it comes first', () => {
        const html = `
            <main>
                <h1>Some Action</h1>
                <p>Bypass the Welcome Message When Handing Off Ongoing Conversations to another agent.</p>
                <p>This action does something useful for the user.</p>
            </main>
        `;
        
        const description = extractDescription(html, 'Some Action');
        
        expect(description).toBe('This action does something useful for the user.');
        expect(description).not.toContain('Bypass');
    });
    
    test('should handle real-world HTML structure with nested elements', () => {
        const html = `
            <main role="main">
                <div class="content">
                    <h1>Create Incident Resolution Summary</h1>
                    <div class="article-body">
                        <p>Bypass the Welcome Message When Handing Off Ongoing Conversations to...</p>
                        <p>Generates a comprehensive summary of incident resolution details including root cause analysis and resolution steps.</p>
                    </div>
                </div>
            </main>
        `;
        
        const description = extractDescription(html, 'Create Incident Resolution Summary');
        
        expect(description).toBe('Generates a comprehensive summary of incident resolution details including root cause analysis and resolution steps.');
        expect(description).not.toContain('Bypass');
    });
});

