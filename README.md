# GitHub Organisation Analyser

Client-side React app for analysing GitHub organisations. Identifies security, governance, and maintenance issues across repos. Uses GitHub REST API with fine-grained PATs; all API calls made from browser (no backend). Token setup instructions are in the app's FAQ tab.

## Tech Stack

- React with Vite
- Material UI (MUI)
- TypeScript (ESM, not CJS)
- Vitest for testing
- ESLint + Prettier with Husky pre-commit hooks

## Development

```bash
npm install
npm run dev      # Start dev server
npm run build    # Production build
npm run lint     # Lint with auto-fix
npm run format   # Format with Prettier
npm run test     # Run tests (watch mode)
npm run test:run # Run tests once
```

## Configuration

User-adjustable settings (thresholds, cache TTL, display limits) are in `src/utils/config.ts` with defaults in `src/config.json`. Users can modify these via the Settings tab.

## Design

- Each tab manages its own data fetching and state - no global store
- Tabs lazy-load on first visit via `isActive` prop; `hasLoaded` prevents re-fetching on tab switches
- Caching: localStorage with TTL, keys follow `github-org-analyser-{org}-{dataType}` pattern; each tab's refresh button bypasses cache via `skipCache=true`
- Token stored in sessionStorage (cleared on browser close); settings and cache in localStorage (persists)
- Per-tab caching is intentional: tabs call different API endpoints with minimal overlap, so global caching would add complexity without meaningful performance benefit
- TypeScript: `module: ESNext` and `moduleResolution: bundler` for Vite/bundler-based frontends (as opposed to `NodeNext` for Node.js backends); `lib` includes DOM types since this runs in browser; strict mode enabled
- Types: component-specific types live in the component file; shared types (API responses, common props) live in `src/types/index.ts`

## Known Issues

- Console shows 404 errors in Governance tabs - GitHub API provides no way to check availability beforehand, so we must call these endpoints and handle 404s; browser network errors can't be suppressed:
  - `/apps/{slug}` - private/internal GitHub Apps
  - `/vulnerability-alerts` - repos where Dependabot alerts are not available
  - `/branches/{branch}/protection` - branch protection not configured
