# CI/CD Pipeline Documentation

This monorepo uses GitHub Actions for continuous integration and deployment.

## Workflows

### 1. CI - Test & Build (`ci.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

**Jobs:**
1. **Test** (Matrix: Node 18.x, 20.x)
   - Checkout code
   - Install dependencies
   - Lint TypeScript (all packages)
   - Build all packages
   - Run tests
   - Upload coverage (Node 20.x only)

2. **Build Demo**
   - Build packages
   - Build demo app
   - Upload demo artifact

**Purpose:** Ensures all code changes pass tests and build successfully.

### 2. Deploy Demo (`deploy-demo.yml`)

**Triggers:**
- Push to `main` branch with changes to:
  - `demo/**`
  - `packages/**`
  - `.github/workflows/deploy-demo.yml`
- Manual workflow dispatch

**Jobs:**
1. **Build**
   - Install monorepo dependencies
   - Build all packages
   - Build demo
   - Upload to GitHub Pages

2. **Deploy**
   - Deploy to GitHub Pages

**Purpose:** Automatically deploys the demo app to GitHub Pages.

### 3. Publish Packages (`publish.yml`)

**Triggers:**
- Manual workflow dispatch only

**Inputs:**
- `package`: Which package(s) to publish (all, core, object-reference, metadata-reference, ssot-reference)
- `version`: Version bump type (patch, minor, major)

**Jobs:**
1. **Publish**
   - Build and test all packages
   - Version bump selected package(s)
   - Publish to NPM
   - Commit version changes

**Purpose:** Publish packages to NPM with controlled versioning.

## Required Secrets

Configure these in GitHub repository settings:

- `NPM_TOKEN` - NPM access token for publishing packages
- `GITHUB_TOKEN` - Automatically provided by GitHub Actions

## Monorepo Structure

The CI/CD pipeline is aware of the monorepo structure:

```
packages/
├── salesforce-core/
├── salesforce-object-reference/
├── salesforce-metadata-reference/
└── salesforce-object-ssot-reference/
```

All packages are built and tested together, but can be published independently.

## Running Locally

### Test Everything
```bash
npm test
```

### Build Everything
```bash
npm run build
```

### Lint TypeScript
```bash
npx tsc --project packages/salesforce-core/tsconfig.json --noEmit
npx tsc --project packages/salesforce-object-reference/tsconfig.json --noEmit
npx tsc --project packages/salesforce-metadata-reference/tsconfig.json --noEmit
npx tsc --project packages/salesforce-object-ssot-reference/tsconfig.json --noEmit
```

### Build Demo
```bash
npm run build
cd demo
npm ci
npm run build
```

## Publishing Workflow

1. Make changes and create PR
2. CI runs automatically on PR
3. Merge PR to main
4. Manually trigger "Publish Packages" workflow
5. Select package(s) and version bump type
6. Packages are published to NPM

## Best Practices

1. **Always run tests** before publishing
2. **Version packages independently** based on changes
3. **Use semantic versioning** (patch, minor, major)
4. **Review demo** after deployment
5. **Check NPM** after publishing

## Troubleshooting

### Build Fails
- Check TypeScript errors in each package
- Verify all dependencies are installed
- Ensure monorepo structure is intact

### Tests Fail
- Run tests locally: `npm test`
- Check for missing test files
- Verify test data paths

### Demo Deploy Fails
- Check if packages build successfully
- Verify demo dependencies
- Check GitHub Pages settings

### Publish Fails
- Verify NPM_TOKEN is configured
- Check package versions
- Ensure tests pass
- Verify you have publish rights


