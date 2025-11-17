# GitHub Organisation Analyser

A React-based web application for analysing GitHub organisations to identify security, governance, and maintenance issues.

## Overview

This tool provides insights into your GitHub organisation across multiple dimensions:
- **Security & Governance** - Organisation admins, installed apps, outside collaborators, branch protection, delegated repository ownership
- **Cleanup Opportunities** - Stale branches, old pull requests
- **Repository Health** - Inactive repositories, forked repositories, repository activity patterns

The application uses GitHub's REST API with fine-grained Personal Access Tokens (PAT) and caches results in localStorage for performance.

## Tech Stack

- **React 19.2** with hooks
- **Vite** for build tooling and dev server
- **Material UI (MUI)** for components and styling
- **GitHub REST API** v3 with fine-grained PAT authentication

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run development server:**
   ```bash
   npm run dev
   ```

3. **Generate a GitHub fine-grained PAT:**
   - Navigate to GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens
   - Create token with Organisation permissions:
     - **Administration:** Read-only (for installed apps)
     - **Members:** Read-only (for org members/admins)
     - **Metadata:** Read-only (mandatory)
   - Repository permissions:
     - **Administration:** Read-only (for branch protection)
     - **Contents:** Read-only
     - **Metadata:** Read-only (mandatory)
     - **Pull requests:** Read-only

4. **Use the app:**
   - Enter your PAT in the application
   - Select an organisation
   - Navigate through the analysis tabs

## Configuration

Edit `src/config.json` to adjust:
- Display limits (max items shown per section)
- Cache TTL (default 24 hours)
- Thresholds (stale branch days, old PR days, etc.)

## Development Notes

- API calls are cached in localStorage by org name and tab identifier
- Progress indicators show current repository being processed for long-running operations
- The app filters out archived and forked repositories from most analysis (forked repos have their own dedicated tab)
- External collaborators and outside collaborators are fetched per-repository due to API limitations
