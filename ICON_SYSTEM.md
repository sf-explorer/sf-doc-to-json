# Icon System Documentation

## Overview

The Salesforce Object Explorer uses two icon systems:
1. **Salesforce Lightning Design System (SLDS) icons** for individual Salesforce objects (4,275 objects)
2. **Cloud-specific icons** for displaying cloud/category badges and filters

## Architecture

### Data Flow

```
doc/index.json
    ↓ (icon: "standard:account")
loadAllDescriptions()
    ↓ (returns icon property)
ObjectExplorer.jsx
    ↓ (maps icon to objectData)
ObjectList.jsx
    ↓ (passes objectData to SalesforceIcon)
SalesforceIcon.jsx
    ↓ (parses "category:name")
Icon component (react-lightning-design-system)
    ↓ (renders SVG from sprite)
Browser
```

### Cloud Icon Flow

```
src/icons/
    ↓ (fsc.png, salescloud.png, etc.)
scripts/copy-icons.js
    ↓ (copies to public/icons/)
CloudIcon.jsx
    ↓ (maps cloud name to icon file)
CategoryFilter.jsx / ObjectList.jsx
    ↓ (renders cloud badge)
Browser
```

### Key Files

**Object Icons (SLDS)**

1. **Data Source**
   - `doc/index.json` - Contains all object metadata including `icon` property
   - Format: `"icon": "category:name"` (e.g., `"standard:account"`)

2. **Package API**
   - `src/index.ts` - Exports `loadAllDescriptions()` which includes icon data
   - `src/types.ts` - TypeScript types including `icon?: string`

3. **React Components**
   - `demo/src/components/ObjectExplorer.jsx` - Loads data and passes to ObjectList
   - `demo/src/components/ObjectList.jsx` - Displays objects in table with icons
   - `demo/src/components/SalesforceIcon.jsx` - Renders individual object icons

4. **Icon Assets**
   - `demo/public/assets/icons/` - SLDS sprite sheets (copied from node_modules)

**Cloud Icons**

1. **Source Files**
   - `src/icons/` - Cloud-specific icon files (PNG/SVG)
   - Files: `fsc.png`, `salescloud.png`, `service-cloud.png`, `Healthimages.png`, etc.

2. **React Components**
   - `demo/src/components/CloudIcon.jsx` - Renders cloud-specific icons
   - `demo/src/components/CategoryFilter.jsx` - Uses CloudIcon for filter chips
   - `demo/src/components/ObjectList.jsx` - Uses CloudIcon for cloud badges

3. **Icon Assets**
   - `demo/public/icons/` - Copied cloud icons (auto-copied during build)

4. **Build Scripts**
   - `demo/scripts/copy-icons.js` - Copies both SLDS sprites AND cloud icons

## Icon Matching Strategy

### 1. Direct Mapping (Primary)
Objects are matched to SLDS icons using comprehensive keyword patterns in `describe-api/match-icons-enhanced.js`:
- 250+ keyword patterns covering all Salesforce domains
- Prioritized matching (specific patterns checked first)
- Examples: "forecast" → `forecasts`, "patient" → `patient_service`, "email" → `email`

### 2. Cloud Fallback (Secondary)
If no keyword match is found, uses cloud-specific icons:
- Health Cloud → `patient_service`
- Financial Services Cloud → `account`
- Education Cloud → `education`
- Net Zero Cloud → `water` (sustainability icon)
- etc.

### 3. Runtime Fallback (Tertiary)
`SalesforceIcon.jsx` has fallback logic for edge cases:
- Pattern matching on object name
- Cloud-based fallback
- Initials in colored box (last resort)

## Coverage

- **Total objects:** 4,275
- **With icons:** 4,275 (100%)
- **Sources:**
  - Keyword matching: ~4,100 objects
  - Cloud fallbacks: ~173 objects
  - Manual fixes: 2 objects

## Icon Categories

SLDS provides 5 icon categories:
1. **standard** - Primary object icons (account, contact, opportunity, etc.)
2. **utility** - UI action icons (settings, search, error, etc.)
3. **custom** - Custom object icons (numbered custom1-custom113)
4. **action** - Action icons (new, edit, delete, etc.)
5. **doctype** - Document type icons (pdf, excel, word, etc.)

Most Salesforce objects use `standard` category icons.

## Build Process

The build process now handles both SLDS sprites and cloud icons:

### Development
```bash
npm run dev  # Automatically copies SLDS sprites + cloud icons via predev hook
```

### Production
```bash
npm run build  # Automatically copies SLDS sprites + cloud icons via prebuild hook
```

### Manual Icon Copy
```bash
npm run copy-icons  # Runs scripts/copy-icons.js to copy both icon types
```

The `copy-icons.js` script:
1. Copies SLDS sprite sheets from `node_modules/@salesforce-ux/design-system/assets/icons` to `public/assets/icons/`
2. Copies cloud icons from `../../src/icons/` to `public/icons/`
3. Verifies critical files exist and reports statistics

## Maintenance

### Adding New Object Icons

1. **For new Salesforce objects:**
   - Run the scraper to update `doc/index.json`
   - Run `describe-api/match-icons-enhanced.js` to match icons
   - New objects will be automatically matched based on keywords

2. **For custom mappings:**
   - Edit `describe-api/match-icons-enhanced.js`
   - Add new keyword patterns to `KEYWORD_PATTERNS`
   - Or add cloud fallbacks to `CLOUD_FALLBACKS`
   - Run the script to update `doc/index.json`

3. **For manual fixes:**
   - Edit `doc/index.json` directly
   - Set `"icon": "category:name"` for specific objects

### Adding New Cloud Icons

1. **Add icon file:**
   - Place PNG or SVG file in `src/icons/`
   - Use descriptive names (e.g., `fsc.png`, `health-cloud.png`)

2. **Update CloudIcon component:**
   - Edit `demo/src/components/CloudIcon.jsx`
   - Add mapping in `CLOUD_ICON_MAP` object:
     ```javascript
     'cloud-name': 'filename.png'
     ```

3. **Test:**
   - Run `npm run copy-icons` in demo directory
   - Verify icon appears in CategoryFilter and ObjectList

### Updating SLDS Icons

When updating to a new SLDS version:
1. Update `@salesforce-ux/design-system` in `demo/package.json`
2. Run `npm install` in demo directory
3. Run `npm run copy-icons` to copy new sprites
4. Rebuild the demo

## React Lightning Design System Integration

The demo uses `react-lightning-design-system` for icon rendering:

```jsx
import { Icon, ComponentSettings } from 'react-lightning-design-system';

// Wrap app in ComponentSettings
<ComponentSettings assetRoot="/assets">
  <Icon category="standard" icon="account" size="small" />
</ComponentSettings>
```

**Benefits:**
- Automatic SVG sprite loading
- Consistent SLDS styling
- Accessibility built-in
- Dynamic icon sizing

## File Structure

```
/Users/ndespres/sf-doc-to-json/
├── src/
│   └── icons/                              # Source cloud icons (33 files)
│       ├── fsc.png                         # Financial Services Cloud
│       ├── salescloud.png                  # Sales Cloud
│       ├── service-cloud.png               # Service Cloud
│       ├── Healthimages.png                # Health Cloud
│       ├── edu.png                         # Education Cloud
│       ├── Nonprofit.png                   # Nonprofit Cloud
│       ├── euc.png                         # Energy & Utilities
│       ├── crma.png                        # Analytics (CRMA)
│       ├── mulesoft.png                    # MuleSoft
│       ├── tableau-icon-svgrepo-com.svg    # Tableau
│       └── ... (and more)
├── doc/
│   └── index.json                          # All objects with icon property
├── describe-api/
│   └── match-icons-enhanced.js             # Icon matching script (ACTIVE)
└── demo/
    ├── public/
    │   ├── assets/icons/                   # SLDS sprites (auto-copied)
    │   │   ├── standard-sprite/
    │   │   ├── custom-sprite/
    │   │   ├── utility-sprite/
    │   │   ├── action-sprite/
    │   │   └── doctype-sprite/
    │   └── icons/                          # Cloud icons (auto-copied)
    │       ├── fsc.png
    │       ├── salescloud.png
    │       └── ... (33 files)
    ├── scripts/
    │   └── copy-icons.js                   # Copies SLDS + cloud icons
    └── src/components/
        ├── ObjectExplorer.jsx              # Loads icon data
        ├── ObjectList.jsx                  # Displays object + cloud icons
        ├── SalesforceIcon.jsx              # Renders object icons
        ├── CloudIcon.jsx                   # Renders cloud icons ⭐ NEW
        └── CategoryFilter.jsx              # Uses CloudIcon for filters
```

## Cloud Icon Mappings

The `CloudIcon.jsx` component maps cloud names to icon files:

### Available Cloud Icons

| Cloud Name | Icon File | Visual |
|------------|-----------|--------|
| `financial-services-cloud` | `fsc.png` | 💼 Financial Services |
| `health-cloud` | `Healthimages.png` | 🏥 Health Cloud |
| `education-cloud` | `edu.png` | 🎓 Education |
| `sales-cloud` | `salescloud.png` | 💰 Sales Cloud |
| `service-cloud` | `service-cloud.png` | 🎧 Service Cloud |
| `nonprofit-cloud` | `Nonprofit.png` | 🤝 Nonprofit |
| `energy-and-utilities-cloud` | `euc.png` | ⚡ Energy & Utilities |
| `crma` / `analytics` | `crma.png` | 📊 Analytics |
| `einstein` | `einstein.png` | 🤖 Einstein |
| `agentforce` | `einsteinAgentforce.png` | 🤖 Agentforce |
| `agents` | `agents.png` | 🤖 Agents |
| `experience-cloud` | `ExperienceCloudIcon.png` | 🌐 Experience Cloud |
| `mulesoft` | `mulesoft.png` | 🔗 MuleSoft |
| `tableau` | `tableau-icon-svgrepo-com.svg` | 📊 Tableau |

### Fallback Emojis

For clouds without specific icon files, the component uses emoji fallbacks:

| Cloud Name | Emoji |
|------------|-------|
| `automotive-cloud` | 🚗 |
| `consumer-goods-cloud` | 🛍️ |
| `manufacturing-cloud` | 🏭 |
| `public-sector-cloud` | 🏛️ |
| `loyalty` | ⭐ |
| `net-zero-cloud` | 🌱 |
| `revenue-lifecycle-management` | 💰 |
| `scheduler` | 📅 |
| `feedback-management` | 📋 |
| `field-service-lightning` | 🔧 |
| `tooling-api` | 🔧 |
| `core-salesforce` | ☁️ |

## Troubleshooting

### Object Icons Not Showing

1. **Check data flow:**
   ```javascript
   // In browser console
   const { loadAllDescriptions } = await import('@sf-explorer/salesforce-object-reference');
   const data = await loadAllDescriptions();
   console.log(data['Address'].icon); // Should print: "standard:address"
   ```

2. **Check sprite loading:**
   - Open Network tab in DevTools
   - Look for requests to `/assets/icons/standard-sprite/svg/symbols.svg`
   - Verify 200 status code

3. **Rebuild package:**
   ```bash
   npm run build              # In project root
   npm run dev                # In demo directory
   ```

### Cloud Icons Not Showing

1. **Verify icon files are copied:**
   ```bash
   ls demo/public/icons/      # Should show fsc.png, salescloud.png, etc.
   ```

2. **Check browser console:**
   - Open DevTools Console
   - Look for 404 errors for `/icons/*.png`
   - Verify icon file names match mapping in `CloudIcon.jsx`

3. **Re-copy icons:**
   ```bash
   cd demo
   npm run copy-icons
   ```

4. **Check CloudIcon mapping:**
   - Open `demo/src/components/CloudIcon.jsx`
   - Verify `CLOUD_ICON_MAP` has correct cloud name → file mapping
   - Add missing mappings if needed

### Icon Not Found

If an icon doesn't exist in SLDS:
- Component will fall back to pattern matching
- Then cloud-based fallback
- Finally, displays colored initials

## Resources

- [SLDS Icon Library](https://www.lightningdesignsystem.com/icons/)
- [react-lightning-design-system](https://github.com/mashmatrix/react-lightning-design-system)
- [Salesforce Object Reference](https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/)
