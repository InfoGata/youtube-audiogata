# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Build both options page and plugin
npm run build

# Build only options page
npm run build:options

# Build only plugin
npm run build:plugin

# Run tests
npm run test

# Run tests with coverage
npm run test:coverage
```

## Architecture Overview

This is an AudioGata plugin for YouTube that provides audio streaming capabilities through multiple backends. The plugin has a dual-build system:

1. **Options UI** (built with Vite + Preact): `src/options.tsx` → `dist/options.html`
2. **Plugin Core** (built with Vite): `src/index.ts` → `dist/index.js`

### Multi-Backend Architecture

The plugin uses three different YouTube backends for redundancy and reliability:

- **Piped** (`src/piped.ts`): Primary backend for search and streaming
- **Invidious** (`src/invidious.ts`): Secondary backend for track metadata
- **YouTube API** (`src/youtube.ts`): Official API for authenticated features

### Key Components

- `src/index.ts`: Main plugin entry point, implements AudioGata plugin interface
- `src/shared.ts`: Common storage utilities and message types
- `src/App.tsx`: Options page UI component
- `manifest.json`: Plugin manifest with authentication config

### Data Flow

1. Search requests → Piped API for video discovery
2. Track metadata → Invidious API for detailed info
3. Audio streaming → Piped API for stream URLs
4. User playlists → YouTube API (requires authentication)

### Testing

Tests use Vitest with JSDOM environment. Mock implementations are in `test/mock-application.ts` for the AudioGata application interface.

## Configuration Files

- `vite.config.ts`: Options page build config (uses @preact/preset-vite and @tailwindcss/vite)
- `plugin.vite.config.ts`: Plugin core build config
- `vitest.config.ts`: Test configuration with JSDOM setup
- `components.json`: shadcn/ui configuration

## Authentication

The plugin supports YouTube authentication through OAuth2 for accessing user playlists. API keys and tokens are stored using the plugin's storage system.