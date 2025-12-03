import React from 'react';
import { Icon } from 'react-lightning-design-system';

// Smart icon fallback for unmapped objects
function findFallbackIcon(objectName, cloud) {
  const lower = objectName.toLowerCase();
  
  // Try to extract first meaningful word
  const firstWord = objectName.match(/^([A-Z][a-z]+)/)?.[1]?.toLowerCase();
  
  // Common patterns (order matters - more specific patterns first)
  const patterns = {
    'enrollment': 'enrollee_status',
    'enrollee': 'enrollee_status',
    'scoring': 'people_score',
    'score': 'people_score',
    'ai': 'bot',
    'academic': 'education',
    'education': 'education',
    'learning': 'education',
    'student': 'education',
    'appointment': 'service_appointment',
    'application': 'app',
    'app': 'app',
    'call': 'call',
    'email': 'email',
    'message': 'email',
    'template': 'template',
    'campaign': 'campaign',
    'account': 'account',
    'contact': 'contact',
    'lead': 'lead',
    'opportunity': 'opportunity',
    'case': 'case',
    'task': 'task',
    'event': 'event',
    'user': 'user',
    'group': 'groups',
    'report': 'report',
    'dashboard': 'dashboard',
    'document': 'document',
    'file': 'file',
    'note': 'note',
    'feed': 'feed',
    'flow': 'flow',
    'process': 'process',
    'product': 'product',
    'order': 'orders',
    'contract': 'contract',
    'knowledge': 'knowledge',
    'asset': 'asset_object',
    'service': 'service_contract',
    'work': 'work_order',
    'patient': 'patient_service',
    'health': 'patient_service',
  };
  
  // Check if object name contains any pattern
  for (const [key, icon] of Object.entries(patterns)) {
    if (lower.includes(key)) {
      return icon;
    }
  }
  
  // Try first word
  if (firstWord && patterns[firstWord]) {
    return patterns[firstWord];
  }
  
  // Fallback based on cloud
  if (cloud) {
    const cloudIcons = {
      'health-cloud': 'patient_service',
      'financial-services-cloud': 'account',
      'education-cloud': 'education',
      'service-cloud': 'service_contract',
      'sales-cloud': 'opportunity',
      'manufacturing-cloud': 'product',
      'consumer-goods-cloud': 'product',
      'nonprofit-cloud': 'organizations',
      'automotive-cloud': 'asset_object',
      'energy-and-utilities-cloud': 'service_contract',
      'public-sector-cloud': 'service_contract',
      'loyalty': 'rewards',
    };
    
    const cloudIcon = cloudIcons[cloud];
    if (cloudIcon) {
      return cloudIcon;
    }
  }
  
  return null;
}

const SalesforceIcon = ({ objectData, objectName, cloud }) => {
  // Get icon data from objectData if available, otherwise use objectName
  const name = objectData?.apiName || objectName;
  const iconString = objectData?.icon; // Format: "standard:account" or "custom:custom_1"
  const label = objectData?.label || name;
  const keyPrefix = objectData?.keyPrefix;
  
  let iconData = null;
  
  // If icon data exists in the object, parse it
  
  if (iconString && iconString.includes(':')) {
    const [iconType, iconName] = iconString.split(':');
    iconData = {
      icon: iconName,
      iconType: iconType,
      label: label,
      keyPrefix: keyPrefix
    };
  } else {
    // Try to find a smart fallback
    const fallbackIcon = findFallbackIcon(name, cloud || objectData?.cloud);
    if (fallbackIcon) {
      iconData = {
        icon: fallbackIcon,
        iconType: 'standard',
        label: label,
        keyPrefix: keyPrefix
      };
    }
  }
  
  const isCustom = name.endsWith('__c');

  // If we have an icon (mapped or fallback), use react-lightning-design-system Icon component
  if (iconData) {
    return (
      <div
        style={{
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
        title={`${iconData.label} (${iconData.keyPrefix || 'No prefix'})`}
      >
        <Icon 
          category={iconData.iconType} 
          icon={iconData.icon}
          size="small"
        />
      </div>
    );
  }

  // Fallback to initials for objects without SLDS icons
  const getIconColor = () => {
    if (isCustom) return '#7f8de1'; // Purple for custom objects

    // Fallback colors
    const colorMap = {
      'account': '#7f8de1',
      'contact': '#a094ed',
      'lead': '#f88962',
      'opportunity': '#fcb95b',
      'case': '#f2cf5b',
      'task': '#4bca81',
      'event': '#56aadf',
      'campaign': '#f88962',
      'product': '#fc989e',
      'default': '#5eb3f6'
    };

    const iconCategory = name.toLowerCase();
    return colorMap[iconCategory] || colorMap.default;
  };

  const getIconInitial = () => {
    if (isCustom) {
      return name.charAt(0).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div
      style={{
        width: '32px',
        height: '32px',
        borderRadius: '4px',
        backgroundColor: getIconColor(),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontWeight: 'bold',
        fontSize: '14px',
        flexShrink: 0
      }}
      title={name}
    >
      {getIconInitial()}
    </div>
  );
};

export default SalesforceIcon;
