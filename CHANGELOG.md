# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2025-11-29

### Fixed
- **Critical bundling issue**: Removed deprecated `{ assert: { type: 'json' } }` syntax from dynamic JSON imports
  - Fixes "Failed to bundle using Rollup v2.79.2" error
  - Improves compatibility with Rollup, Webpack, Vite, esbuild, and other bundlers
  - No functionality changes - all JSON imports still work correctly
  - Affects: `src/index.ts` - lines 26, 56, and 104

### Technical Details
The deprecated `assert` syntax for JSON imports was causing bundling failures in many JavaScript bundlers, particularly Rollup v2.x. By removing the syntax entirely and relying on TypeScript's `resolveJsonModule` configuration, the package now works seamlessly with all major bundlers without any code changes for users.

## [1.0.0] - Initial Release

### Added
- Initial release of the Salesforce Object Reference package
- Dual-purpose package: generator tool and consumer library
- Support for 15 Salesforce clouds
- 3,437 Salesforce objects documented
- Split structure for optimal performance (99% smaller cloud files)
- Full TypeScript support with type definitions
- Tree-shakeable exports for minimal bundle size
- Browser and Node.js support
- Comprehensive test suite with 43 passing tests
- Both ESM and CommonJS formats

### Features
- `loadIndex()` - Load master index of all objects
- `getObject()` - Get specific object details
- `searchObjects()` - Search objects by pattern
- `getObjectsByCloud()` - Get all objects in a cloud
- `getAvailableClouds()` - List all available clouds
- `loadCloud()` - Load all objects for a cloud
- `clearCache()` - Clear cached data
- `preloadClouds()` - Preload clouds for better performance

### Documentation
- Comprehensive README with examples
- Split structure documentation (SPLIT_STRUCTURE.md)
- Multi-cloud objects guide (MULTI_CLOUD_OBJECTS.md)
- Testing guide (TESTING.md)
- Publishing guide (PUBLISHING.md)
- Architecture documentation (ARCHITECTURE.md)
- Browser examples (browser-example.html)

[1.0.1]: https://github.com/sf-explorer/sf-doc-to-json/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/sf-explorer/sf-doc-to-json/releases/tag/v1.0.0


