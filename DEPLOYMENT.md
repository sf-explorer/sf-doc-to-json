# GitHub Pages Deployment

This document explains how the demo app is automatically deployed to GitHub Pages.

## Setup

The demo app is configured to automatically deploy to GitHub Pages when changes are pushed to the `main` branch.

### Prerequisites

Before the workflow can deploy, you need to configure GitHub Pages in your repository:

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Pages**
3. Under "Source", select **GitHub Actions**

That's it! The workflow will handle the rest.

## How It Works

### Workflow Triggers

The deployment workflow (`.github/workflows/deploy-demo.yml`) runs when:
- Changes are pushed to the `main` branch that affect:
  - `demo/**` (demo app files)
  - `src/**` (source package files)
  - `doc/**` (documentation/data files)
  - The workflow file itself
- Manually triggered via "Run workflow" button in GitHub Actions

### Build Process

1. **Checkout code** - Gets the latest code from the repository
2. **Setup Node.js** - Installs Node.js 18
3. **Install root dependencies** - Installs the main package dependencies
4. **Build root package** - Builds the `@sf-explorer/salesforce-object-reference` package
5. **Install demo dependencies** - Installs demo app dependencies
6. **Build demo** - Builds the demo React app with Vite
7. **Upload to GitHub Pages** - Uploads the built demo to GitHub Pages
8. **Deploy** - Makes the demo live

### Configuration

The Vite config (`demo/vite.config.js`) is configured to:
- Use `/sf-doc-to-json/` as the base path in production (GitHub Pages)
- Use `/` as the base path in development (local)
- Output to `demo/dist` directory
- Include source maps for debugging

## Accessing the Demo

Once deployed, the demo will be available at:
```
https://<your-username>.github.io/sf-doc-to-json/
```

## Local Development

To run the demo locally:
```bash
cd demo
npm install
npm run dev
```

This will start the development server at `http://localhost:3000`

## Manual Deployment

You can manually trigger a deployment:
1. Go to the **Actions** tab in your GitHub repository
2. Select the "Deploy Demo to GitHub Pages" workflow
3. Click "Run workflow"
4. Select the `main` branch
5. Click "Run workflow"

## Troubleshooting

### Demo not loading
- Check that GitHub Pages is enabled in repository settings
- Verify the workflow completed successfully in the Actions tab
- Check browser console for errors related to base path

### Changes not reflected
- Make sure your changes were committed to the `main` branch
- Check the Actions tab to see if the workflow ran
- Clear your browser cache

### Build failures
- Check the workflow logs in the Actions tab
- Verify all dependencies are correctly specified
- Ensure the build works locally first

