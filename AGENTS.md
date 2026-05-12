# Agents

## Cursor Cloud specific instructions

This is a Next.js 16 (App Router) single-service application with no external dependencies (no database, no Redis, no Docker). All data is hardcoded in `lib/data.ts`.

### Quick reference

| Task | Command |
|------|---------|
| Install deps | `npm install` |
| Dev server | `npm run dev` (serves on port 3000) |
| Lint | `npm run lint` |
| Build | `npm run build` |

See `README.md` for full details.

### Notes

- The dev server uses Turbopack by default (Next.js 16).
- No `.env` file or environment variables are required.
- The `/api/discovery` route accepts `location`, `genre`, and `interest` query parameters and returns scored creator results.
- The page uses hash-based navigation (`#feed`, `#artists`, `#streams`, `#store`, etc.) for section switching within a single-page layout.
