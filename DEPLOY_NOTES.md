# CyprusGuard deploy notes

## What changed in this package

- `database.rules.json` now denies broad anonymous reads/writes.
- `client.js` loads client data with narrow Firebase queries instead of downloading full collections.
- `landing.html` has a stronger visual hero, simple anti-spam honeypot, one-minute local submit throttle, and lead field trimming.
- `_headers` adds security headers for Netlify, including no-store/no-referrer for `client.html`.
- `robots.txt` and `sitemap.xml` expose only the marketing landing page to search engines.

## Required deployment steps

1. Upload the site files to Netlify as usual.
2. Deploy the new Firebase Realtime Database rules from `database.rules.json`.
3. Keep Anonymous Auth enabled in Firebase because the client portal and lead form still use it.
4. Keep Railway bot variables as they are; this package does not replace Railway.

## Important note

This is a safer version within the current frontend + Firebase architecture. The strongest security model is still to move client-token verification, Telegram token usage, and AI calls behind a backend or serverless function later.
