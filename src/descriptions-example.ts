/**
 * Example: Using the descriptions API to retrieve object descriptions
 * without loading full object data
 */

import {
    loadAllDescriptions,
    getObjectDescription,
    searchObjectsByDescription,
    getDescriptionsByCloud
} from './index.js';

async function demonstrateDescriptionsAPI() {
    console.log('=== Salesforce Object Descriptions API Examples ===\n');

    // Example 1: Load ALL descriptions (lightweight - only ~700KB vs 100MB+ for all objects)
    console.log('1. Loading all descriptions...');
    const allDescriptions = await loadAllDescriptions();
    if (allDescriptions) {
        const count = Object.keys(allDescriptions).length;
        console.log(`   ✓ Loaded ${count} object descriptions`);
        console.log(`   Memory efficient: Only descriptions from index.json\n`);
    }

    // Example 2: Get description for a specific object
    console.log('2. Getting description for Account object...');
    const accountDesc = await getObjectDescription('Account');
    if (accountDesc) {
        console.log(`   Name: Account`);
        console.log(`   Description: ${accountDesc.description}`);
        console.log(`   Cloud: ${accountDesc.cloud}`);
        console.log(`   Field Count: ${accountDesc.fieldCount} fields\n`);
    }

    // Example 3: Search objects by description content
    console.log('3. Searching for objects related to "invoice"...');
    const invoiceObjects = await searchObjectsByDescription('invoice');
    console.log(`   Found ${invoiceObjects.length} objects:`);
    invoiceObjects.slice(0, 5).forEach(obj => {
        console.log(`   - ${obj.name} (${obj.cloud}) - ${obj.fieldCount} fields`);
        console.log(`     ${obj.description.substring(0, 100)}...`);
    });
    if (invoiceObjects.length > 5) {
        console.log(`   ... and ${invoiceObjects.length - 5} more\n`);
    } else {
        console.log();
    }

    // Example 4: Get all descriptions for a specific cloud
    console.log('4. Getting all object descriptions for Financial Services Cloud...');
    const fscDescriptions = await getDescriptionsByCloud('Financial Services Cloud');
    const fscCount = Object.keys(fscDescriptions).length;
    console.log(`   ✓ Found ${fscCount} objects in Financial Services Cloud`);
    
    // Show first 3 as examples
    const fscObjects = Object.entries(fscDescriptions).slice(0, 3);
    fscObjects.forEach(([name, info]) => {
        console.log(`   - ${name} (${info.fieldCount} fields): ${info.description.substring(0, 60)}...`);
    });
    console.log();

    // Example 5: Compare memory usage
    console.log('5. Performance comparison:');
    console.log('   Traditional approach: Load all ~3400 objects with all fields');
    console.log('   → ~100MB+ of JSON data');
    console.log('   → Thousands of file reads or one massive file');
    console.log();
    console.log('   New descriptions API: Load only index.json with descriptions');
    console.log('   → ~1MB of JSON data (100x smaller!)');
    console.log('   → Single lightweight file');
    console.log('   → Perfect for search, autocomplete, listings, etc.\n');

    // Example 6: Find objects by cloud
    console.log('6. Objects in different clouds:');
    const clouds = ['Core Salesforce', 'Health Cloud', 'Education Cloud'];
    for (const cloud of clouds) {
        const cloudDescs = await getDescriptionsByCloud(cloud);
        console.log(`   ${cloud}: ${Object.keys(cloudDescs).length} objects`);
    }
}

// Run the examples
demonstrateDescriptionsAPI().catch(console.error);

