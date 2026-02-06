# Tech Stack

## Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.0 | UI framework |
| Vite | 7.3.1 | Build tool and dev server |
| Tailwind CSS | 3.4.x | Utility-first styling |
| Lucide React | 0.562.0 | Icon library |
| Recharts | 3.7.0 | Charts for analytics |

## Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Supabase | 2.90.1 | Database, Auth, Realtime |
| PostgreSQL | (Supabase managed) | Primary database |

## Mobile

| Technology | Version | Purpose |
|------------|---------|---------|
| Capacitor Core | 8.0.2 | Native bridge |
| Capacitor CLI | 8.0.2 | Build tooling |
| Capacitor iOS | 8.0.2 | iOS native wrapper |
| Capacitor Android | 8.0.2 | Android native wrapper |

## Development Tools

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 24.13.0 | Runtime |
| npm | 11.6.2 | Package manager |
| ESLint | 9.x | Linting (flat config) |
| Vitest | 3.x | Unit testing |

## Deployment

| Service | Purpose |
|---------|---------|
| Cloudflare Pages | Web hosting, CDN |
| Supabase Cloud | Backend services |
| Apple App Store | iOS distribution (pending) |
| Google Play Store | Android distribution (pending) |

## Configuration Files

- `vite.config.js` - Vite bundler config
- `tailwind.config.js` - Tailwind customization
- `eslint.config.js` - ESLint rules (flat config)
- `vitest.config.js` - Test runner config
- `capacitor.config.json` - Mobile app config
- `package.json` - Dependencies and scripts

## Environment

- JavaScript only (no TypeScript)
- Path alias: `@` → `./src`
- Dark mode: class-based via Tailwind
- Dev server: localhost:5176
