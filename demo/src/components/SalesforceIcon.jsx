import React from 'react';

const SalesforceIcon = ({ category, objectName }) => {
  // Map object names to icon categories
  const getIconCategory = () => {
    if (objectName.endsWith('__c')) {
      return 'custom';
    }

    // Map common standard objects to their icon categories
    const iconMap = {
      'Account': 'account',
      'Contact': 'contact',
      'Lead': 'lead',
      'Opportunity': 'opportunity',
      'Case': 'case',
      'Task': 'task',
      'Event': 'event',
      'Campaign': 'campaign',
      'Product2': 'product',
      'Pricebook2': 'pricebook',
      'Quote': 'quote',
      'Contract': 'contract',
      'Order': 'orders',
      'User': 'user',
      'Group': 'groups',
      'Profile': 'profile',
      'PermissionSet': 'permission_set',
      'Report': 'report',
      'Dashboard': 'dashboard',
      'Document': 'document',
      'Folder': 'folder',
      'EmailTemplate': 'email',
      'Attachment': 'attach',
      'Note': 'note',
      'ContentDocument': 'file',
      'Asset': 'asset',
      'Solution': 'solution'
    };

    return iconMap[objectName] || category || 'custom';
  };

  const iconCategory = getIconCategory();
  const isCustom = objectName.endsWith('__c');

  // Define color schemes for different icon categories
  const getIconColor = () => {
    if (isCustom) return '#7f8de1'; // Purple for custom objects

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

    return colorMap[iconCategory] || colorMap.default;
  };

  const getIconInitial = () => {
    if (isCustom) {
      return objectName.charAt(0).toUpperCase();
    }
    return objectName.substring(0, 2).toUpperCase();
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
    >
      {getIconInitial()}
    </div>
  );
};

export default SalesforceIcon;

