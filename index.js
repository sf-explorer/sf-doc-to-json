const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const CHUNK_SIZE = 50;

const CONFIGURATION = {
    'atlas.en-us.object_reference.meta': {
        label: 'Core Salesforce'
    },
    'atlas.en-us.salesforce_feedback_management_dev_guide.meta': {
        label: 'Feedback Management'
    },
    'atlas.en-us.salesforce_scheduler_developer_guide.meta': {
        label: 'Scheduler'
    },
    'atlas.en-us.field_service_dev.meta': {
        label: 'Field Service Lightning'
    },
    'atlas.en-us.loyalty.meta': {
        label: 'Loyalty'
    },
    'atlas.en-us.psc_api.meta': {
        label: 'Public Sector Cloud'
    },
    'atlas.en-us.netzero_cloud_dev_guide.meta': {
        label: 'Net Zero Cloud'
    },
    'atlas.en-us.edu_cloud_dev_guide.meta': {
        label: 'Education Cloud'
    },
    'atlas.en-us.automotive_cloud.meta': {
        label: 'Automotive Cloud'
    },
    'atlas.en-us.eu_developer_guide.meta': {
        label: 'Energy and Utilities Cloud'
    },
    'atlas.en-us.health_cloud_object_reference.meta': {
        label: 'Health Cloud'
    },
    'atlas.en-us.retail_api.meta': {
        label: 'Consumer Goods Cloud'
    },
    'atlas.en-us.financial_services_cloud_object_reference.meta': {
        label: 'Financial Services Cloud'
    },
    'atlas.en-us.mfg_api_devguide.meta': {
        label: 'Manufacturing Cloud'
    },
    'atlas.en-us.nonprofit_cloud.meta': {
        label: 'Nonprofit Cloud'
    }
};

// Get version from command line or use latest
const version = process.argv[2] || '265.0'; // Updated to latest version
const documentMapping = {};

function removeDuplicates(arr, prop) {
    const unique = new Set();
    const result = arr.filter((item) => {
        const val = item[prop];
        const isPresent = unique.has(val);
        unique.add(val);//always add
        return !isPresent;
    });
    return result;
}

const fetchDocuments = async () => {
    console.log(`Fetching documents for version ${version}...`);
    
    // Filter to specific documentation if provided in command line
    const specificDoc = process.argv[3];
    const documentsToFetch = specificDoc 
        ? [specificDoc]
        : Object.keys(CONFIGURATION);
    
    console.log(`Fetching ${documentsToFetch.length} documentation(s)...`);
    
    for (const item of documentsToFetch) {
        if (!CONFIGURATION[item]) {
            console.error(`Unknown documentation ID: ${item}`);
            continue;
        }
        await fetchDocuments_single(item);
    }
    
    // Group items
    const items = Object.keys(documentMapping)
        .reduce((acc, documentationId) => {
            if (documentMapping[documentationId]?.items) {
                return acc.concat(
                    documentMapping[documentationId].items.map(x => ({ ...x, documentationId }))
                );
            }
            return acc;
        }, []);

    console.log(`\nTotal objects found: ${items.length}`);
    await loadAllDocuments(items);
};

const fetchDocuments_single = async (documentationId) => {
    try {
        console.log(`Fetching ${CONFIGURATION[documentationId]?.label} (${documentationId})...`);
        
        const response = await fetch(`https://developer.salesforce.com/docs/get_document/${documentationId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        const items = removeDuplicates(extraDataFromJson(documentationId, result.toc, []), 'id')
            .sort((a, b) => (a.text || '').localeCompare(b.text));
        
        documentMapping[documentationId] = {
            items: items,
            header: result
        };
        
        console.log(`  Found ${items.length} objects`);
    } catch (e) {
        console.error(`Error fetching ${documentationId}:`, e.message);
    }
};

const extraDataFromJson = (documentationId, items, result) => {
    for (const x of (items || [])) {
        const itemId = x.id || '';
        if (x.children) {
            result = result.concat(extraDataFromJson(documentationId, x.children, []));
        } else {
            if (itemId.startsWith('sforce_api_objects_')) {
                result.push(x);
            }
        }
    }
    return result;
};

const fetchContentDocument = async (documentationId, url) => {
    try {
        const header = documentMapping[documentationId].header;
        const contentUrl = `https://developer.salesforce.com/docs/get_document_content/${header.deliverable}/${url}/en-us/${header.version.doc_version}`;
        
        const response = await fetch(contentUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const res = await response.text();
        const data = JSON.parse(res);
        
        const $ = cheerio.load(data.content);
        const desc = $('[id="summary"]');
        let headers = $('[data-title="Field Name"]');
        
        if (headers.length === 0) {
            headers = $('[data-title="Field"]');
        }

        const header_names = [];
        const header_desc = [];

        headers.each((index, el) => {
            header_names.push($(el).text().replaceAll("\n", "").replaceAll("\t", ""));
        });

        const details = $('[data-title="Details"]');
        const header_types = [];
        
        details.each((index, el) => {
            header_types.push($(el).find('dd').first().text().replaceAll("\n", "").replaceAll("\t", ""));
            header_desc.push($(el).find('dd').eq(2)?.text().replaceAll("\n           ", " ").replaceAll("\t", "").replaceAll("\n", " "));
        });

        const properties = {};
        header_names.forEach((name, i) => {
            properties[name] = {
                type: header_types[i],
                description: header_desc[i],
            };
        });
        
        return { 
            name: data.title, 
            description: desc?.text().replaceAll("\n", " ").replaceAll("\t", ""), 
            properties, 
            module: CONFIGURATION[documentationId]?.label,
        };
    } catch (e) {
        console.error(`Error fetching content for ${url}:`, e.message);
        return {};
    }
};


const loadAllDocuments = async (items) => {
    // Helper function to chunk the URL list
    const chunkList = (list, size) => {
        const chunks = [];
        for (let i = 0; i < list.length; i += size) {
            chunks.push(list.slice(i, i + size));
        }
        return chunks;
    };

    // Create doc folder if it doesn't exist
    const docFolder = './doc';
    if (!fs.existsSync(docFolder)) {
        fs.mkdirSync(docFolder, { recursive: true });
        console.log(`Created ${docFolder} directory`);
    }

    // Chunk the URLs
    const itemChunks = chunkList(items.map(x => ({ url: x.a_attr.href, ...x })), CHUNK_SIZE);
    let finalResult = [];
    
    console.log(`\nProcessing ${items.length} objects in ${itemChunks.length} chunks...`);
    
    // Process each chunk
    for (let i = 0; i < itemChunks.length; i++) {
        const chunk = itemChunks[i];
        const promises = chunk.map(x => fetchContentDocument(x.documentationId, x.url));
        const results = (await Promise.all(promises)).filter(item => item.name);
        finalResult = [].concat(finalResult, results);
        
        const progress = Math.round((finalResult.length / items.length) * 100);
        console.log(`Progress: ${finalResult.length}/${items.length} (${progress}%) - Chunk ${i + 1}/${itemChunks.length}`);
    }

    // Group results by cloud/module
    const resultsByCloud = finalResult.reduce((acc, item) => {
        const module = item.module || 'Unknown';
        if (!acc[module]) {
            acc[module] = [];
        }
        acc[module].push(item);
        return acc;
    }, {});

    // Save separate JSON file for each cloud
    console.log('\n');
    let totalObjects = 0;
    const objectIndex = {};
    
    for (const [cloudName, cloudItems] of Object.entries(resultsByCloud)) {
        const fileName = cloudName
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '');
        
        const filePath = `${docFolder}/${fileName}.json`;
        
        const formattedData = cloudItems.reduce((prev, cur) => {
            if (cur?.name) {
                prev[cur.name] = cur;
                // Add to index
                objectIndex[cur.name] = {
                    cloud: cloudName,
                    file: `${fileName}.json`
                };
            }
            return prev;
        }, {});
        
        fs.writeFileSync(filePath, JSON.stringify(formattedData, null, 2), 'utf-8');
        totalObjects += Object.keys(formattedData).length;
        console.log(`✓ Saved ${Object.keys(formattedData).length} objects for ${cloudName} to ${filePath}`);
    }
    
    // Save index file
    const indexPath = `${docFolder}/index.json`;
    const sortedIndex = Object.keys(objectIndex)
        .sort()
        .reduce((acc, key) => {
            acc[key] = objectIndex[key];
            return acc;
        }, {});
    
    fs.writeFileSync(indexPath, JSON.stringify({
        generated: new Date().toISOString(),
        version: version,
        totalObjects: totalObjects,
        totalClouds: Object.keys(resultsByCloud).length,
        objects: sortedIndex
    }, null, 2), 'utf-8');
    
    console.log(`\n✓ Created index with ${totalObjects} objects: ${indexPath}`);
    console.log(`✓ Total: ${totalObjects} objects saved across ${Object.keys(resultsByCloud).length} cloud(s)`);
};

// Main execution with error handling
(async () => {
    try {
        await fetchDocuments();
    } catch (error) {
        console.error('\n✗ Fatal error:', error.message);
        process.exit(1);
    }
})();