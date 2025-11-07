# Dual Package Strategy

This repository uses a **single package.json** that serves both purposes:

## 📦 Single Package, Two Modes

### Development Mode (Generator)
When you clone the repo and run `npm install`:
- All `devDependencies` are installed (cheerio, TypeScript, etc.)
- You can run the generator: `npm run fetch:all`
- You can build and test: `npm run build && npm test`

### Published Package (Consumer)
When users `npm install @sf-explorer/salesforce-object-reference`:
- **Zero runtime dependencies** 
- Only gets: `dist/`, `doc/`, `README.md`, `LICENSE`
- `devDependencies` are NOT installed
- Users can import and use the API immediately

## 🎯 Why This Works

### Benefits
✅ **Simple** - One package.json to maintain  
✅ **Lightweight** - Published package has no dependencies  
✅ **Flexible** - Generator deps are dev-only  
✅ **Clean** - Clear separation via devDependencies  

### Key Configuration

```json
{
  "dependencies": {},           // Empty! No runtime deps
  "devDependencies": {
    "cheerio": "...",          // Only for generation
    "typescript": "...",       // Only for building
    "@types/*": "..."          // Only for development
  },
  "files": [
    "dist",                     // Compiled code
    "doc",                      // Pre-generated JSON
    "README.md",
    "LICENSE"
  ]
}
```

## 🔄 How It Works

### For Maintainers (Development)

```bash
# Clone repo
git clone https://github.com/sf-explorer/sf-doc-to-json.git
cd sf-doc-to-json

# Install ALL dependencies (including devDependencies)
npm install

# Use generator
npm run fetch:all

# Build
npm run build

# Test
npm test

# Publish
npm publish
```

**Installed:**
- cheerio (scraper)
- TypeScript (compiler)
- Jest (testing)
- All type definitions

### For Users (Consumption)

```bash
# Install package
npm install @sf-explorer/salesforce-object-reference

# Use API
import { getObject } from '@sf-explorer/salesforce-object-reference';
```

**Installed:**
- dist/ (compiled JS)
- doc/ (JSON files)
- NO dependencies!

## 📊 Package Size Comparison

| Type | Size | Contains |
|------|------|----------|
| **Repository** | ~30 MB | Source, tests, all deps |
| **Published Package** | ~25 MB | dist/, doc/, no deps |
| **User node_modules** | ~25 MB | Just the package |

## 🎨 Alternative: Separate Packages

If we wanted truly separate packages, we could use:

### Option A: Monorepo
```
sf-doc-to-json/
├── packages/
│   ├── generator/          # Generator tool
│   │   └── package.json    # With cheerio
│   └── library/            # Consumer library
│       └── package.json    # No dependencies
└── package.json            # Workspace root
```

### Option B: Separate Repos
```
sf-doc-generator/           # Private or public tool
└── package.json            # With cheerio

salesforce-object-reference/  # Published library
└── package.json            # No dependencies
```

## 🤔 Why Single Package?

We chose single package because:

1. **Simplicity** - One repo, one package.json
2. **Unified Versioning** - Generator and library stay in sync
3. **Easy Updates** - Generate and publish in one workflow
4. **Zero Dependencies** - Consumers get clean package anyway
5. **Both Use Cases** - Users can generate fresh docs if needed

## 📝 Best Practices

### ✅ DO

- Keep `dependencies` empty
- Put scraper deps in `devDependencies`
- Use `files` field to control what's published
- Test published package with `npm pack`

### ❌ DON'T

- Put cheerio in `dependencies`
- Include src/ in published package
- Forget to run `npm run fetch:all` before publishing

## 🔍 Verify Package Contents

Before publishing:

```bash
# See what will be published
npm run pack:preview

# Or actually create tarball
npm pack

# Extract and inspect
tar -xzf sf-explorer-salesforce-object-reference-1.0.0.tgz
ls package/
```

Should see:
```
package/
├── dist/
├── doc/
├── README.md
├── LICENSE
└── package.json
```

Should NOT see:
```
❌ src/
❌ tests/
❌ node_modules/
❌ cheerio anywhere
```

## 🎯 Summary

**One package.json, two modes:**
- 🔧 **Development:** Full dependencies for generation
- 📦 **Published:** Zero dependencies for consumption

**Result:** Clean, simple, maintainable package that serves both needs perfectly!

