import React from 'react';

/**
 * CloudIcon component - displays cloud-specific icons
 * 
 * Gets emoji and iconFile from cloudMetadata prop loaded from cloud JSON files.
 * Falls back to generic cloud emoji if metadata is not available.
 */

const CloudIcon = ({ cloudName, metadata, size = 20, showLabel = false, className = '' }) => {
  if (!cloudName) return null;

  // Get emoji and iconFile from metadata if provided
  const emoji = metadata?.emoji;
  const iconFile = metadata?.iconFile;
  
  // Debug: log if metadata is missing
  if (!metadata) {
    console.warn(`CloudIcon: No metadata provided for cloud "${cloudName}"`);
  }

  // Use emoji from metadata or default to cloud emoji
  const finalEmoji = emoji || '☁️';

  // Format friendly name
  const friendlyName = cloudName
    .replace(/-/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());

  // Fixed-size container to ensure consistent dimensions
  const iconContainerStyle = {
    width: `${size}px`,
    height: `${size}px`,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  };

  const iconStyle = {
    maxWidth: '100%',
    maxHeight: '100%',
    width: 'auto',
    height: 'auto',
    objectFit: 'contain',
    display: 'block',
  };

  const containerStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  };

  // If we have an icon file, render it
  if (iconFile) {
    // Use import.meta.env.BASE_URL to respect the base path in production
    const iconPath = `${import.meta.env.BASE_URL}icons/${iconFile}`;
    
    return (
      <span style={containerStyle} className={className} title={friendlyName}>
        <span style={iconContainerStyle}>
          <img 
            src={iconPath} 
            alt={friendlyName}
            style={iconStyle}
            onError={(e) => {
              // Fallback to emoji if image fails to load
              e.target.style.display = 'none';
              const emojiSpan = e.target.parentElement.nextSibling;
              if (emojiSpan) emojiSpan.style.display = 'flex';
            }}
          />
        </span>
        <span style={{ 
          display: 'none', 
          fontSize: `${size}px`, 
          lineHeight: 1,
          width: `${size}px`,
          height: `${size}px`,
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {finalEmoji}
        </span>
        {showLabel && <span>{friendlyName}</span>}
      </span>
    );
  }

  // Fallback to emoji (no icon file available)
  return (
    <span style={containerStyle} className={className} title={friendlyName}>
      <span style={{ 
        fontSize: `${size}px`, 
        lineHeight: 1,
        width: `${size}px`,
        height: `${size}px`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}>
        {finalEmoji}
      </span>
      {showLabel && <span>{friendlyName}</span>}
    </span>
  );
};

export default CloudIcon;

