# Salesforce Object Explorer Demo

Interactive demo showcasing the `@sf-explorer/salesforce-object-reference` package with **pure browser-based graph visualization**.

## 🎯 Features

- **Cloud Explorer** - Browse objects by Salesforce cloud
- **Object Details** - View comprehensive object and field information
- **Graph Visualization** - Interactive relationship viewer (100% browser-based, no server required!)

## 🚀 Quick Start

No setup needed! Works entirely in the browser.

```bash
npm install
npm run dev
```

Visit http://localhost:5173 (or whatever port) and click the **"Graph View"** button in the header.

## 📦 Dependencies

- `@sf-explorer/salesforce-object-reference` - Salesforce object data
- `vis-network` - Graph visualization library
- React + Vite - UI framework

That's it! No database, no server, no complicated setup.

## 📊 Example Use Cases

### 1. Object Relationship Explorer
Show how objects connect to each other:
```jsx
<SimpleGraphVisualization objectName="Account" />
```

### 2. Impact Analysis
Visualize what's affected by changes:
```jsx
<SimpleGraphVisualization objectName="Contact" />
```

### 3. Cloud Architecture
See how objects in a cloud relate:
```jsx
// Load all FSC objects and show relationships
<SimpleGraphVisualization objectName="FinServ__FinancialAccount__c" />
```

## 🔧 Adding Graph Visualization to Your Own App

```jsx
import SimpleGraphVisualization from './components/SimpleGraphVisualization';

function MyApp() {
  return (
    <div>
      <h1>Salesforce Object Graph</h1>
      <SimpleGraphVisualization objectName="Account" />
    </div>
  );
}
```

## 🎓 Learning Resources

- [vis-network documentation](https://visjs.github.io/vis-network/docs/network/) - The graph library used
- Customize the visualization by editing `SimpleGraphVisualization.jsx`

## 🐛 Troubleshooting

### Graph not showing?
1. Check browser console for errors
2. Verify object name is valid
3. Make sure `vis-network` is installed: `npm install vis-network`

### Performance issues?
- Reduce the number of objects loaded by editing `SimpleGraphVisualization.jsx`
- Limit depth of relationship traversal (currently set to 1-2 levels)
- Filter which objects to include in the graph

## 🔒 Security Notes

All data is client-side and safe for public demos. No backend = no security concerns!

## 🚀 Production Deployment

Deploy like any React app - works everywhere! No server or database needed:
- Vercel
- Netlify  
- GitHub Pages
- Any static hosting

Just run `npm run build` and deploy the `dist` folder.

## 💡 Want More Power?

If you need advanced graph features like:
- Deep path queries (5+ levels)
- Complex graph analytics (PageRank, community detection)
- Real-time graph updates
- Graph algorithms

Check out the **Neo4j integration** in the `/neo4j` folder. But for most use cases, the browser-based version is perfect!

## 📝 License

MIT
