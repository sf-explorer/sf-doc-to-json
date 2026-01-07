# @sf-explorer/salesforce-agentforce-actions-reference

Salesforce Agentforce standard actions reference from official documentation.

## 📦 Installation

```bash
npm install @sf-explorer/salesforce-agentforce-actions-reference
```

## 🚀 Usage

### Basic Usage

```typescript
import { getAction, getAllActionNames, searchActions } from '@sf-explorer/salesforce-agentforce-actions-reference';

// Get a specific action
const action = await getAction('CreateRecord');

// Get all action names
const allNames = await getAllActionNames();

// Search for actions
const results = await searchActions(/create/i);
```

### Available Functions

- `loadIndex()` - Load master index
- `getAction(name)` - Get full action details
- `searchActions(pattern)` - Search by name
- `getAllActionNames()` - Get all action names
- `loadAllDescriptions()` - Get all descriptions (lightweight)
- `getActionDescription(name)` - Get single description (lightweight)
- `searchActionsByDescription(pattern)` - Search by description
- `loadAllActions()` - Load all actions (heavy)
- `clearCache()` - Clear cached data

### Backward Compatibility

For consistency with other packages, these aliases are also available:
- `getObject()` - Alias for `getAction()`
- `searchObjects()` - Alias for `searchActions()`
- `getAllObjectNames()` - Alias for `getAllActionNames()`
- `getObjectDescription()` - Alias for `getActionDescription()`
- `searchObjectsByDescription()` - Alias for `searchActionsByDescription()`
- `loadAllObjects()` - Alias for `loadAllActions()`

## 📚 Data Source

Actions are scraped from:
- [Salesforce Agentforce Standard Actions Reference](https://help.salesforce.com/s/articleView?id=ai.copilot_actions_ref.htm&type=5)

## 🔧 Development

### Fetch Fresh Data

```bash
npm run fetch:actions
```

### Rebuild Index

```bash
npm run rebuild-index
```

### Build

```bash
npm run build
```

## 📄 License

MIT License

