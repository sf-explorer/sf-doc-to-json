/**
 * Script to manually add missing actions when pages fail to load
 * This creates action files with inferred API Names based on action name patterns
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface AgentforceAction {
    name: string;
    description: string;
    category: string;
    clouds: string[];
    properties: Record<string, any>;
    sourceUrl: string;
    module?: string;
}

/**
 * Convert action name to API Name (PascalCase)
 * Example: "Get Most Recent Orders" -> "GetMostRecentOrders"
 */
function actionNameToApiName(actionName: string): string {
    return actionName
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');
}

/**
 * Add a missing action manually
 */
async function addMissingAction(
    actionName: string,
    description: string,
    category: string,
    clouds: string[],
    sourceUrl: string,
    referenceActionType?: string
): Promise<void> {
    const srcDocDir = path.join(__dirname, '..', 'src', 'doc');
    const actionsFolder = path.join(srcDocDir, 'actions');
    const indexPath = path.join(srcDocDir, 'index.json');
    
    // Infer API Name from action name
    const apiName = actionNameToApiName(actionName);
    
    console.log(`\n📝 Adding missing action: "${actionName}"`);
    console.log(`   Inferred API Name: "${apiName}"`);
    console.log(`   Category: ${category}`);
    console.log(`   Clouds: ${clouds.join(', ')}`);
    
    // Create action object
    const properties: Record<string, any> = {
        "API Name": {
            type: apiName,
            description: apiName,
            required: false
        }
    };
    
    if (referenceActionType) {
        properties["Reference Action Type"] = {
            type: "string",
            description: referenceActionType,
            required: false
        };
    }
    
    const action: AgentforceAction = {
        name: actionName,
        description: description,
        category: category,
        clouds: clouds,
        properties: properties,
        sourceUrl: sourceUrl,
        module: "Agentforce"
    };
    
    // Determine file path based on API Name
    const firstLetter = apiName[0].toUpperCase();
    const fileName = `${apiName.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
    const letterFolder = path.join(actionsFolder, firstLetter);
    const filePath = path.join(letterFolder, fileName);
    
    // Create directory if it doesn't exist
    await fs.mkdir(letterFolder, { recursive: true });
    
    // Check if file already exists
    try {
        await fs.access(filePath);
        console.log(`   ⚠️  File already exists: ${firstLetter}/${fileName}`);
        console.log(`   Skipping to avoid overwriting existing data.`);
        return;
    } catch (e) {
        // File doesn't exist, proceed
    }
    
    // Save action file
    await fs.writeFile(filePath, JSON.stringify(action, null, 2), 'utf-8');
    console.log(`   ✅ Saved: ${firstLetter}/${fileName}`);
    
    // Update index
    const indexContent = await fs.readFile(indexPath, 'utf-8');
    const index = JSON.parse(indexContent);
    
    const cleanProperties = { ...properties };
    delete cleanProperties["API Name"];
    const propertyCount = Object.keys(cleanProperties).length;
    
    const indexEntry: any = {
        name: actionName,
        file: `actions/${firstLetter}/${fileName}`,
        description: description,
        propertyCount: propertyCount,
        category: category,
        clouds: clouds,
        sourceUrl: sourceUrl,
        apiName: apiName
    };
    
    if (referenceActionType) {
        indexEntry.referenceActionType = referenceActionType;
    }
    
    index.actions[actionName] = indexEntry;
    index.totalActions = Object.values(index.actions).filter((entry: any) => 
        entry.apiName && entry.apiName.trim() !== ''
    ).length;
    index.generatedAt = new Date().toISOString();
    
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');
    console.log(`   ✅ Updated index (total: ${index.totalActions} actions)`);
}

/**
 * Add "Get Most Recent Orders" action
 */
async function addGetMostRecentOrders(): Promise<void> {
    await addMissingAction(
        "Get Most Recent Orders",
        "Retrieves the most recent orders for a B2B Commerce account.",
        "Commerce",
        ["Core Salesforce"],
        "https://help.salesforce.com/s/articleView?id=ai.copilot_actions_ref_commerce_get_most_recent_orders.htm&language=en_US&type=5",
        "Standard Action"
    );
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    addGetMostRecentOrders()
        .then(() => {
            console.log('\n✅ Done!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Error:', error);
            process.exit(1);
        });
}

export { addMissingAction, actionNameToApiName };

