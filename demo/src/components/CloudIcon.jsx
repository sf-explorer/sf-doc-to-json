import React from 'react';

/**
 * CloudIcon component - displays cloud-specific icons
 * 
 * Gets emoji and iconFile from cloudMetadata prop if provided,
 * otherwise falls back to hardcoded mappings
 */

const CloudIcon = ({ cloudName, metadata, size = 20, showLabel = false, className = '' }) => {
  if (!cloudName) return null;

  // Get emoji and iconFile from metadata if provided
  const emoji = metadata?.emoji;
  const iconFile = metadata?.iconFile;

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
          {emoji || '☁️'}
        </span>
        {showLabel && <span>{friendlyName}</span>}
      </span>
    );
  }

  // Fallback to emoji
  if (emoji) {
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
          {emoji}
        </span>
        {showLabel && <span>{friendlyName}</span>}
      </span>
    );
  }

  // Ultimate fallback - just show the label
  return showLabel ? <span className={className}>{friendlyName}</span> : null;
};

export default CloudIcon;

