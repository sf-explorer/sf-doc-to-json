import {
    loadIndex,
    getObject,
    searchObjects,
    getObjectsByCloud,
    getAvailableClouds,
    loadCloud,
    clearCache,
    preloadClouds
} from './index.js';

/**
 * Example usage of the Salesforce Object Reference library (Async Version)
 */
async function example() {
    console.log('=== Salesforce Object Reference - Example Usage ===\n');

    // 1. Load the index
    console.log('1. Loading index...');
    const index = await loadIndex();
    if (!index) {
        console.error('❌ No data found. Please run: npm run fetch:all');
        return;
    }
    
    console.log(`✓ Loaded index`);
    console.log(`  - Version: ${index.version}`);
    console.log(`  - Total Objects: ${index.totalObjects}`);
    console.log(`  - Total Clouds: ${index.totalClouds}`);
    console.log(`  - Generated: ${new Date(index.generated).toLocaleString()}\n`);

    // 2. Get available clouds
    console.log('2. Available Clouds:');
    const clouds = await getAvailableClouds();
    clouds.forEach(cloud => console.log(`  - ${cloud}`));
    console.log();

    // 3. Preload clouds for better performance (optional)
    console.log('3. Preloading Financial Services Cloud...');
    await preloadClouds(['financial-services-cloud']);
    console.log('✓ Preloaded\n');

    // 4. Search for objects
    console.log('4. Searching for "Account" objects...');
    const accountObjects = await searchObjects(/account/i);
    console.log(`✓ Found ${accountObjects.length} objects:`);
    accountObjects.slice(0, 10).forEach(obj => {
        console.log(`  - ${obj.name} (${obj.cloud})`);
    });
    if (accountObjects.length > 10) {
        console.log(`  ... and ${accountObjects.length - 10} more`);
    }
    console.log();

    // 5. Get a specific object
    console.log('5. Getting details for "Account" object...');
    const account = await getObject('Account');
    if (account) {
        console.log(`✓ Found ${account.name}`);
        console.log(`  - Cloud: ${account.module}`);
        console.log(`  - Description: ${account.description.substring(0, 100)}...`);
        console.log(`  - Total Fields: ${Object.keys(account.properties).length}`);
        console.log(`  - Sample Fields:`);
        Object.entries(account.properties).slice(0, 5).forEach(([name, prop]) => {
            console.log(`    • ${name}: ${prop.type}`);
        });
    }
    console.log();

    // 6. Get objects by cloud
    console.log('6. Getting Financial Services Cloud objects...');
    const fscObjects = await getObjectsByCloud('Financial Services Cloud');
    console.log(`✓ Found ${fscObjects.length} objects in Financial Services Cloud`);
    console.log(`  First 10 objects:`);
    fscObjects.slice(0, 10).forEach(obj => {
        console.log(`  - ${obj.name}`);
    });
    console.log();

    // 7. Load entire cloud data
    console.log('7. Loading full cloud data...');
    const coreData = await loadCloud('core-salesforce');
    if (coreData) {
        const objectNames = Object.keys(coreData);
        console.log(`✓ Loaded ${objectNames.length} Core Salesforce objects`);
        console.log(`  Sample objects: ${objectNames.slice(0, 5).join(', ')}`);
    }
    console.log();

    // 8. Analyze object field types
    console.log('8. Analyzing object field types...');
    if (coreData) {
        const fieldTypes = new Set<string>();
        Object.values(coreData).forEach(obj => {
            Object.values(obj.properties).forEach(prop => {
                fieldTypes.add(prop.type);
            });
        });
        console.log(`✓ Found ${fieldTypes.size} unique field types in Core Salesforce:`);
        Array.from(fieldTypes).sort().slice(0, 10).forEach(type => {
            console.log(`  - ${type}`);
        });
    }
    console.log();

    // 9. Demonstrate cache clearing
    console.log('9. Cache management...');
    console.log('  - Clearing cache...');
    clearCache();
    console.log('  ✓ Cache cleared');
    console.log('  - Reloading (without cache)...');
    const freshIndex = await loadIndex(false);
    console.log(`  ✓ Reloaded ${freshIndex?.totalObjects} objects\n`);

    console.log('=== Example Complete ===');
}

// Run the example
example().catch(error => {
    console.error('Error running example:', error);
    process.exit(1);
});
