# Salesforce Object Reference

**Two Tools in One Package**

## 🎯 Purpose

This repository serves dual purposes:

### 1️⃣ Generator (Development Tool)
A **TypeScript-based web scraper** that fetches Salesforce object documentation and converts it to structured JSON files.

- Scrapes from developer.salesforce.com
- Supports 15+ Salesforce clouds
- Generates clean, structured JSON
- Updates with latest Salesforce releases

### 2️⃣ Consumer Library (NPM Package)
A **programmatic API** for accessing Salesforce object schemas in your applications.

- Pre-generated JSON files included
- TypeScript definitions
- Tree-shakeable and async
- Works in Node.js and browsers

---

## 📦 For Package Users

If you just want to use the Salesforce object data:

```bash
npm install @sf-explorer/salesforce-object-reference
```

```typescript
import { getObject } from '@sf-explorer/salesforce-object-reference';

const account = await getObject('Account');
console.log(account?.properties);
```

**See full consumer documentation in [README.md](./README.md)**

---

## 🔧 For Contributors & Advanced Users

If you want to generate/update the documentation:

### Prerequisites

- Node.js >= 18.0.0
- Internet connection
- Git

### Setup

```bash
git clone https://github.com/sf-explorer/sf-doc-to-json.git
cd sf-doc-to-json
npm install
npm run build
```

### Generate Documentation

```bash
# Fetch all Salesforce clouds (~5-10 minutes)
npm run fetch:all

# Or fetch specific clouds
npm run fetch:fsc    # Financial Services Cloud
npm run fetch:core   # Core Salesforce
npm run fetch:health # Health Cloud
```

### Project Structure

```
sf-doc-to-json/
├── src/
│   ├── index.ts         # Consumer API (exported in package)
│   ├── scraper.ts       # Generator logic (scrapes Salesforce)
│   ├── cli.ts           # CLI tool for generation
│   ├── config.ts        # Cloud configurations
│   └── types.ts         # TypeScript definitions
│
├── doc/                 # Generated JSON files (included in package)
│   ├── index.json       # Master index
│   └── *.json           # Cloud-specific files
│
├── dist/                # Compiled output (included in package)
│   ├── index.js         # ES modules
│   └── cjs/             # CommonJS
│
├── tests/               # Test files
└── scripts/             # Build scripts
```

### Development Workflow

```bash
# 1. Make changes to src/
npm run build

# 2. Generate fresh docs
npm run fetch:all

# 3. Test
npm test

# 4. Publish (maintainers only)
npm version patch
npm publish --access public
```

---

## 🏗️ Architecture

### Generator Component

**Files:**
- `src/scraper.ts` - Web scraping logic
- `src/cli.ts` - Command-line interface
- `src/config.ts` - Cloud configurations

**Dependencies:**
- `cheerio` - HTML parsing
- `fs/promises` - File operations
- Native `fetch` - HTTP requests

**Process:**
1. Fetches TOC from Salesforce docs API
2. Extracts object IDs
3. Fetches detailed content for each object
4. Parses HTML to extract fields and types
5. Writes structured JSON files

### Consumer Component

**Files:**
- `src/index.ts` - Public API
- `src/types.ts` - TypeScript definitions

**Features:**
- Async functions for lazy loading
- In-memory caching
- Dynamic imports for tree-shaking
- Works in Node.js and browsers

---

## 🔄 When to Regenerate

Regenerate documentation when:

1. **Salesforce releases** (3x per year: Spring, Summer, Winter)
   ```bash
   npm run fetch:all
   npm version minor
   npm publish
   ```

2. **Bug fixes in documentation**
   ```bash
   npm run fetch:all
   npm version patch
   npm publish
   ```

3. **New cloud support added**
   - Update `src/config.ts`
   - Run `npm run fetch:all`
   - Publish

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

**Test structure:**
- `tests/index.test.ts` - API tests
- `tests/config.test.ts` - Configuration tests
- `tests/types.test.ts` - TypeScript type tests

---

## 📤 Publishing Workflow

See [PUBLISHING.md](./PUBLISHING.md) for complete details.

**Quick checklist:**
1. ✅ Fetch latest docs: `npm run fetch:all`
2. ✅ Build: `npm run build`
3. ✅ Test: `npm test`
4. ✅ Preview: `npm run pack:preview`
5. ✅ Version: `npm version patch|minor|major`
6. ✅ Publish: `npm publish --access public`

**Package includes:**
- `dist/` - Compiled code (~500 KB)
- `doc/` - JSON files (~20 MB)
- `README.md`, `LICENSE`, `package.json`

---

## 🎓 Key Concepts

### Separation of Concerns

| Aspect | Generator | Consumer |
|--------|-----------|----------|
| **Purpose** | Create data | Use data |
| **Audience** | Maintainers | Developers |
| **Frequency** | Quarterly | Every install |
| **Dependencies** | scraper deps | Runtime deps |
| **Environment** | Node.js only | Node.js + Browser |

### File Organization

- **Source (`src/`)** - Not published, development only
- **Build (`dist/`)** - Published, consumer entry points
- **Data (`doc/`)** - Published, the actual object data
- **Tests (`tests/`)** - Not published, development only

---

## 🤝 Contributing

### For Generator Improvements

```bash
# 1. Fork and clone
git clone https://github.com/YOUR_USERNAME/sf-doc-to-json.git

# 2. Create branch
git checkout -b feature/improve-scraper

# 3. Make changes to src/scraper.ts or src/config.ts

# 4. Test generation
npm run build
npm run fetch:fsc  # Test with one cloud first

# 5. Submit PR
```

### For Consumer API Improvements

```bash
# 1. Make changes to src/index.ts or src/types.ts

# 2. Update tests in tests/

# 3. Build and test
npm run build
npm test

# 4. Submit PR
```

### Adding New Clouds

1. Update `src/config.ts`:
   ```typescript
   'atlas.en-us.NEW_CLOUD.meta': {
       label: 'New Cloud Name'
   }
   ```

2. Test fetching:
   ```bash
   npm run build
   node dist/cli.js 265.0 atlas.en-us.NEW_CLOUD.meta
   ```

3. Verify output in `doc/new-cloud-name.json`

4. Update README and submit PR

---

## 📊 Metrics

Current package stats:
- **15 clouds** supported
- **~1500+ objects** total
- **~20 MB** package size
- **28 tests** with >80% coverage

---

## 🔗 Resources

### Consumer Resources
- [NPM Package](https://www.npmjs.com/package/@sf-explorer/salesforce-object-reference)
- [API Documentation](./README.md)
- [Browser Example](./browser-example.html)

### Developer Resources
- [Contributing Guide](./CONTRIBUTING.md)
- [Publishing Guide](./PUBLISHING.md)
- [Testing Guide](./TESTING.md)
- [Salesforce Docs API](https://developer.salesforce.com/docs)

---

## 📝 License

MIT - see [LICENSE](./LICENSE)

---

**Questions?** Open an [issue](https://github.com/sf-explorer/sf-doc-to-json/issues) or start a [discussion](https://github.com/sf-explorer/sf-doc-to-json/discussions).

