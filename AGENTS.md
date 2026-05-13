# Agents

## Cursor Cloud specific instructions

**Artbook** is a single Next.js 16 (App Router) application with no external service dependencies. All data is hardcoded in `lib/data.ts`.

### Commands

See `README.md` "Run locally" and "Useful commands" sections. Key commands:

- **Dev server:** `npm run dev` (port 3000)
- **Lint:** `npm run lint`
- **Build:** `npm run build`

### Notes

- No databases, Docker, or third-party API keys are required.
- The `/api/discovery` route returns the scored creator feed as JSON and is useful for verifying the API layer.
- The app uses `package-lock.json` (npm). Do not switch to another package manager.
- TypeScript 6 and ESLint 9 flat config are used; the ESLint config is in `eslint.config.mjs`.
