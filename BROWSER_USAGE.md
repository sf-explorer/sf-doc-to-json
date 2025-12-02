# Browser Usage Summary

## ✅ Browser Compatible (With Bundler)

This package works perfectly in browsers when using a bundler like Vite, Webpack, Rollup, or esbuild.

## 📦 Bundler Required

**Why?** The package uses dynamic `import()` for JSON files. Browsers don't natively support this without a build step.

**This is standard practice** for all modern web applications. If you're using React, Vue, Angular, Svelte, or any modern framework, you already have a bundler configured!

## 🚀 Quick Start

### With Vite (Recommended)

```bash
npm create vite@latest my-app
cd my-app
npm install @sf-explorer/salesforce-object-reference
```

```javascript
// src/main.js
import { loadAllDescriptions } from '@sf-explorer/salesforce-object-reference';

const descriptions = await loadAllDescriptions();
console.log(`Loaded ${Object.keys(descriptions).length} objects`);
```

```bash
npm run dev
```

### With React

```bash
npx create-react-app my-app
cd my-app
npm install @sf-explorer/salesforce-object-reference
```

```jsx
// src/App.js
import { useEffect, useState } from 'react';
import { getObjectDescription } from '@sf-explorer/salesforce-object-reference';

function App() {
  const [desc, setDesc] = useState(null);
  
  useEffect(() => {
    getObjectDescription('Account').then(setDesc);
  }, []);
  
  return desc && (
    <div>
      <h1>{desc.name}</h1>
      <p>{desc.description}</p>
      <p>{desc.fieldCount} fields</p>
    </div>
  );
}
```

## 🛠️ Supported Bundlers

| Bundler | Status | Notes |
|---------|--------|-------|
| **Vite** | ✅ Perfect | Zero config, recommended |
| **Webpack 5** | ✅ Perfect | Works out of the box |
| **Rollup** | ✅ Perfect | Native JSON support |
| **esbuild** | ✅ Perfect | Automatic handling |
| **Parcel** | ✅ Perfect | Zero configuration |
| **Next.js** | ✅ Perfect | Webpack under the hood |
| **Vue CLI** | ✅ Perfect | Webpack configured |
| **Angular CLI** | ✅ Perfect | Webpack configured |

## ❌ What Doesn't Work

- ❌ Opening HTML file directly in browser (no bundler)
- ❌ Using `<script type="module">` without bundling
- ❌ CDN imports (e.g., unpkg.com) - JSON imports need bundler

## ✅ What Works

- ✅ Any app built with a bundler
- ✅ Any modern framework (React, Vue, Angular, Svelte)
- ✅ Node.js (no bundler needed)
- ✅ Development servers (Vite dev, Webpack dev server)
- ✅ Production builds

## 🎯 Bottom Line

**If you're building a modern web app, this package will work perfectly!**

Modern web development always uses bundlers. If you're using:
- Create React App
- Vue CLI
- Vite
- Next.js
- SvelteKit
- Angular CLI
- Or any other modern tool

...you already have everything you need. Just install and use! 🎉

## 📚 Documentation

See the [README.md](./README.md) for:
- Complete API reference
- Usage examples
- Performance comparisons
- Full descriptions API documentation


