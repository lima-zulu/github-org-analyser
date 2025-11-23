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

## Known Issues

### Backlog

- TypeScript `strict` mode disabled - enabling requires fixing type errors across the codebase
- `@typescript-eslint/no-explicit-any` disabled - enabling requires replacing `any` types with proper definitions
- tsconfig review needed - review `module`, `moduleResolution`, `lib` and other compiler options
- Repo Governance: skip Dependabot check for forked repos
- Repo Governance: new table showing non-forked repos with Dependabot disabled
- Repo Governance: skip Dependabot check for repos identified as having Dependabot disabled

### Won't Fix

- Console shows 404 errors for private GitHub Apps - the `/apps/{slug}` endpoint returns 404 for internal apps and there's no way to know beforehand; browser network errors can't be suppressed
