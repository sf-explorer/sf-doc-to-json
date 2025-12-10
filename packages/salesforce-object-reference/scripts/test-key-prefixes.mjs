import { loadAllDescriptions, getObjectDescription } from '../dist/index.js';

async function testKeyPrefixes() {
    console.log('Testing key prefix functionality...\n');
    
    // Test 1: Load all descriptions and check for key prefixes
    console.log('Test 1: Loading all descriptions...');
    const allDescriptions = await loadAllDescriptions();
    
    if (!allDescriptions) {
        console.error('❌ Failed to load descriptions');
        return;
    }
    
    // Count how many have key prefixes
    let withPrefix = 0;
    let withoutPrefix = 0;
    let exampleWithPrefix = null;
    
    for (const [name, metadata] of Object.entries(allDescriptions)) {
        if (metadata.keyPrefix) {
            withPrefix++;
            if (!exampleWithPrefix) {
                exampleWithPrefix = { name, metadata };
            }
        } else {
            withoutPrefix++;
        }
    }
    
    console.log(`✅ Total objects: ${Object.keys(allDescriptions).length}`);
    console.log(`   - With key prefix: ${withPrefix}`);
    console.log(`   - Without key prefix: ${withoutPrefix}`);
    
    if (exampleWithPrefix) {
        console.log(`\nExample object with prefix:`);
        console.log(`   Name: ${exampleWithPrefix.name}`);
        console.log(`   Key Prefix: ${exampleWithPrefix.metadata.keyPrefix}`);
        console.log(`   Description: ${exampleWithPrefix.metadata.description.substring(0, 80)}...`);
        console.log(`   Cloud: ${exampleWithPrefix.metadata.cloud}`);
    }
    
    // Test 2: Get specific object description
    console.log('\n\nTest 2: Testing getObjectDescription for Account...');
    const accountDesc = await getObjectDescription('Account');
    
    if (accountDesc) {
        console.log(`✅ Account object found:`);
        console.log(`   Key Prefix: ${accountDesc.keyPrefix || 'N/A'}`);
        console.log(`   Description: ${accountDesc.description.substring(0, 80)}...`);
        console.log(`   Cloud: ${accountDesc.cloud}`);
        console.log(`   Field Count: ${accountDesc.fieldCount}`);
    } else {
        console.error('❌ Failed to get Account description');
    }
    
    // Test 3: Test another well-known object
    console.log('\n\nTest 3: Testing getObjectDescription for Contact...');
    const contactDesc = await getObjectDescription('Contact');
    
    if (contactDesc) {
        console.log(`✅ Contact object found:`);
        console.log(`   Key Prefix: ${contactDesc.keyPrefix || 'N/A'}`);
        console.log(`   Description: ${contactDesc.description.substring(0, 80)}...`);
        console.log(`   Cloud: ${contactDesc.cloud}`);
        console.log(`   Field Count: ${contactDesc.fieldCount}`);
    } else {
        console.error('❌ Failed to get Contact description');
    }
    
    console.log('\n\n✅ All tests completed!');
}

testKeyPrefixes().catch(console.error);

