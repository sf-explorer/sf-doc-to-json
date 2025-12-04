/**
 * Validates Salesforce object structure for graph visualization
 * 
 * Checks:
 * - Object exists and has properties
 * - Reference fields have proper x-object or referenceTo
 * - Referenced objects exist in the dataset
 */

export const validateObjectForGraph = async (objectName, objectData, getObjectDescription) => {
  const issues = [];
  const warnings = [];
  const stats = {
    totalFields: 0,
    referenceFields: 0,
    validReferences: 0,
    invalidReferences: 0,
    missingTargets: []
  };

  // Check if object exists
  if (!objectData) {
    return {
      valid: false,
      issues: [`Object "${objectName}" not found in dataset`],
      warnings: [],
      stats
    };
  }

  // Check if object has properties
  if (!objectData.properties || typeof objectData.properties !== 'object') {
    return {
      valid: false,
      issues: [`Object "${objectName}" has no properties field`],
      warnings: [],
      stats
    };
  }

  stats.totalFields = Object.keys(objectData.properties).length;

  // Validate reference fields
  for (const [fieldName, fieldData] of Object.entries(objectData.properties)) {
    if (fieldData.type === 'reference') {
      stats.referenceFields++;

      // Check if reference has explicit target
      const hasReferenceTo = fieldData.referenceTo && Array.isArray(fieldData.referenceTo);
      const hasXObject = fieldData['x-object'];

      if (!hasReferenceTo && !hasXObject) {
        // Silently skip references without explicit data - these won't be graphed
        stats.invalidReferences++;
        // No warning - this is expected for incomplete scraper data
      } else {
        stats.validReferences++;

        // Validate that referenced objects exist
        const targets = hasReferenceTo ? fieldData.referenceTo : [fieldData['x-object']];
        for (const targetObject of targets) {
          try {
            const targetDesc = await getObjectDescription(targetObject);
            if (!targetDesc) {
              stats.missingTargets.push(targetObject);
              warnings.push(`Referenced object "${targetObject}" (via ${fieldName}) not found in dataset`);
            }
          } catch (err) {
            // Silently ignore lookup errors - object might not be in our dataset
            stats.missingTargets.push(targetObject);
          }
        }
      }
    }
  }

  // Determine if valid overall
  const valid = issues.length === 0 && stats.totalFields > 0;

  return {
    valid,
    issues,
    warnings,
    stats
  };
};

export const validateCloudForGraph = async (cloudName, cloudObjects, getObject, getObjectDescription) => {
  const issues = [];
  const warnings = [];
  const stats = {
    totalObjects: cloudObjects.length,
    validObjects: 0,
    objectsWithReferences: 0,
    totalReferences: 0,
    crossCloudReferences: 0,
    missingObjects: []
  };

  for (const objectName of cloudObjects) {
    try {
      const obj = await getObject(objectName);
      if (!obj || !obj.properties) {
        stats.missingObjects.push(objectName);
        warnings.push(`Object "${objectName}" in ${cloudName} has no data`);
        continue;
      }

      stats.validObjects++;
      let hasReferences = false;

      for (const [fieldName, fieldData] of Object.entries(obj.properties)) {
        if (fieldData.type === 'reference') {
          const targets = fieldData.referenceTo || (fieldData['x-object'] ? [fieldData['x-object']] : []);
          
          if (targets.length > 0) {
            hasReferences = true;
            stats.totalReferences += targets.length;

            // Check if reference is to object outside this cloud
            for (const target of targets) {
              if (!cloudObjects.includes(target)) {
                stats.crossCloudReferences++;
              }
            }
          }
        }
      }

      if (hasReferences) {
        stats.objectsWithReferences++;
      }
    } catch (err) {
      warnings.push(`Error loading object "${objectName}": ${err.message}`);
    }
  }

  const valid = stats.validObjects > 0 && issues.length === 0;

  return {
    valid,
    issues,
    warnings,
    stats
  };
};

export const formatValidationReport = (validation, objectOrCloudName) => {
  const lines = [];
  
  lines.push(`📋 Validation Report: ${objectOrCloudName}`);
  lines.push('='.repeat(50));
  
  if (validation.valid) {
    lines.push('✅ Status: VALID');
  } else {
    lines.push('❌ Status: INVALID');
  }
  
  lines.push('');
  lines.push('📊 Statistics:');
  Object.entries(validation.stats).forEach(([key, value]) => {
    const label = key.replace(/([A-Z])/g, ' $1').trim();
    const formattedLabel = label.charAt(0).toUpperCase() + label.slice(1);
    if (Array.isArray(value)) {
      lines.push(`  ${formattedLabel}: ${value.length} items`);
      if (value.length > 0 && value.length <= 5) {
        value.forEach(item => lines.push(`    - ${item}`));
      }
    } else {
      lines.push(`  ${formattedLabel}: ${value}`);
    }
  });
  
  // Add a note about skipped references
  if (validation.stats.invalidReferences > 0) {
    lines.push('');
    lines.push(`ℹ️  Note: ${validation.stats.invalidReferences} reference field(s) skipped (missing target data)`);
  }
  
  if (validation.issues.length > 0) {
    lines.push('');
    lines.push('❌ Issues:');
    validation.issues.forEach((issue, i) => {
      lines.push(`  ${i + 1}. ${issue}`);
    });
  }
  
  if (validation.warnings.length > 0) {
    lines.push('');
    lines.push('⚠️  Warnings:');
    const displayWarnings = validation.warnings.slice(0, 10);
    displayWarnings.forEach((warning, i) => {
      lines.push(`  ${i + 1}. ${warning}`);
    });
    if (validation.warnings.length > 10) {
      lines.push(`  ... and ${validation.warnings.length - 10} more warnings`);
    }
  }
  
  return lines.join('\n');
};

