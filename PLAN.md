# CurateTV — Build Plan

## What We're Building

A web app where users connect their Xtream IPTV credentials, pick the channels and groups
they want to keep, and get two clean URLs — one for their playlist (M3U) and one for their
TV guide (EPG). Credentials are never exposed. Everything updates automatically.

---

## How It Works (End to End)

```
User signs up
    ↓
Enters Xtream credentials → encrypted + stored in DB
    ↓
We fetch their full channel list from provider
    ↓
They pick groups + channels to keep
    ↓
We generate two URLs:
    • curate.tv/p/TOKEN/playlist.m3u  ← paste into TiviMate/Smarters/VLC
    • curate.tv/p/TOKEN/epg.xml       ← paste alongside for TV guide
    ↓
EPG auto-refreshes every 24 hours
    ↓
They can come back anytime to edit channels/groups
    → URLs stay the same, content updates automatically
```

---

## Credential Privacy (How We Hide Them)

Stream URLs normally look like:
  `http://provider.com/USERNAME/PASSWORD/12345.ts`  ← credentials exposed

We replace them with:
  `https://curate.tv/s/TOKEN/12345`  ← no credentials

When a player requests that URL, our server:
1. Looks up the TOKEN → finds the real credentials
2. Sends a redirect (302) to the real stream URL
3. Player connects directly to provider — we never touch the video data

Result: credentials never appear in any shared file or URL.

---

## Tech Stack

| Tool        | Role                              | Cost       |
|-------------|-----------------------------------|------------|
| Next.js     | Frontend + API routes             | Free       |
| Supabase    | Database, auth, storage           | Free tier  |
| Vercel      | Hosting + cron jobs (auto-refresh)| Free tier  |
| DaisyUI     | UI components                     | Free       |

---

## Database Schema

### `credentials`
Stores encrypted Xtream login info per user.

| Column        | Type    | Notes                          |
|---------------|---------|--------------------------------|
| id            | uuid    | Primary key                    |
| user_id       | uuid    | FK → auth.users                |
| server_url    | text    | e.g. http://provider.com       |
| port          | text    | e.g. 80                        |
| username_enc  | text    | AES-256 encrypted              |
| password_enc  | text    | AES-256 encrypted              |
| status        | text    | 'active' / 'error'             |
| last_tested   | timestamp                               |
| created_at    | timestamp                               |

### `channels`
Cached channel list fetched from provider.

| Column        | Type    | Notes                          |
|---------------|---------|--------------------------------|
| id            | uuid    | Primary key                    |
| credential_id | uuid    | FK → credentials               |
| stream_id     | integer | Provider's stream ID           |
| name          | text    | Channel name                   |
| category_id   | text    | Provider's category ID         |
| category_name | text    | e.g. "US| SPORT"               |
| logo_url      | text    | Channel logo                   |
| epg_id        | text    | tvg-id for EPG matching        |
| created_at    | timestamp                               |

### `selections`
Which channels the user has chosen to keep.

| Column        | Type    | Notes                          |
|---------------|---------|--------------------------------|
| id            | uuid    | Primary key                    |
| user_id       | uuid    | FK → auth.users                |
| credential_id | uuid    | FK → credentials               |
| stream_id     | integer | Provider's stream ID           |
| created_at    | timestamp                               |

### `playlists`
One per user (MVP). Holds their token and EPG cache.

| Column        | Type    | Notes                          |
|---------------|---------|--------------------------------|
| id            | uuid    | Primary key                    |
| user_id       | uuid    | FK → auth.users                |
| credential_id | uuid    | FK → credentials               |
| token         | uuid    | Used in public URLs            |
| epg_cache     | text    | Cached + filtered XMLTV data   |
| epg_updated   | timestamp | Last EPG refresh             |
| created_at    | timestamp                               |

---

## API Routes

| Route                              | Method | Auth     | What it does                        |
|------------------------------------|--------|----------|-------------------------------------|
| `/api/credentials`                 | POST   | Required | Save encrypted credentials          |
| `/api/credentials/test`            | POST   | Required | Test Xtream connection              |
| `/api/channels/sync`               | POST   | Required | Fetch + cache channels from provider|
| `/api/selections`                  | POST   | Required | Save user's channel selections      |
| `/api/selections`                  | GET    | Required | Get user's current selections       |
| `/api/epg/refresh`                 | POST   | Required | Manually trigger EPG refresh        |
| `/api/playlist/[token]/playlist.m3u` | GET  | Public   | Serve curated M3U playlist          |
| `/api/playlist/[token]/epg.xml`    | GET    | Public   | Serve filtered EPG (XMLTV)          |
| `/api/s/[token]/[streamId]`        | GET    | Public   | Redirect to real stream URL         |

---

## Build Phases

### Phase 1 — Supabase Setup
- Create Supabase project
- Run SQL to create all 4 tables
- Set up Row Level Security (users can only see their own data)
- Add Supabase env vars to Next.js

### Phase 2 — Auth
- Wire Supabase auth to sign up / login pages
- Session management (middleware to protect dashboard routes)
- Redirect after login → onboarding (first time) or dashboard (returning)

### Phase 3 — Credentials
- Onboarding form → encrypt credentials → store in DB
- `/api/credentials/test` → hit Xtream player_api.php → return success/fail
- Show live feedback: "✓ Connected — 847 categories found"

### Phase 4 — Channel Sync + Picker
- On connect → call `/api/channels/sync` → fetch all categories + channels → store in DB
- Channel picker page pulls from DB (not Xtream directly)
- Save selections → store in `selections` table
- Create playlist record with unique token

### Phase 5 — M3U Generator + Stream Proxy
- `/api/playlist/[token]/playlist.m3u`
  - Look up token → get credential_id + user selections
  - Build M3U where each stream URL = `curate.tv/s/TOKEN/STREAM_ID`
  - Return as text/plain with correct M3U headers
- `/api/s/[token]/[streamId]`
  - Look up token → decrypt credentials → build real stream URL
  - 302 redirect to real stream URL
  - Player streams directly from provider

### Phase 6 — EPG Proxy + Auto-Refresh
- `/api/epg/refresh`
  - Fetch `http://server:port/xmltv.php?username=X&password=Y`
  - Parse XMLTV XML
  - Filter to only channels in user's selections (match by epg_id)
  - Store filtered XML in `playlists.epg_cache`
- `/api/playlist/[token]/epg.xml`
  - Return cached EPG from DB
  - Content-Type: application/xml
- Vercel cron job: hit `/api/epg/refresh` every 24 hours for all playlists

### Phase 7 — Dashboard Wired Up
- Replace all mock data with real Supabase queries
- Groups/channels management (add/remove live)
- EPG sync status (last updated, next update, manual refresh button)
- Copy-to-clipboard for M3U and EPG URLs
- Changes to selections → playlist updates immediately on next M3U request

---

## What We Need Before Starting

1. Supabase account (free) → supabase.com
2. Vercel account (free) → vercel.com
3. Encryption secret key (we generate this — a random 32-char string)

---

## MVP Limitations (Intentional)

- 1 IPTV credential per user
- 1 playlist per user
- EPG refresh every 24 hours (not real-time)
- No custom channel ordering yet (Phase 2 of product)
- No payment/tiers yet (add after testing with friends)
