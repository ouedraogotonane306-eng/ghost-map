# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ghost Map is a haunted location mapping application built with React + Vite (using rolldown-vite). Users can browse an interactive map of haunted places, view dossier-style detail pages, and (when authenticated) upload new locations and submit investigation logs. The backend is entirely Supabase (PostgreSQL, Auth, Storage). UI text is in Chinese.

## Commands

```bash
npm run dev       # Start dev server with HMR
npm run build     # Production build to dist/
npm run lint      # ESLint (flat config, JS/JSX)
npm run preview   # Preview production build locally
```

No test framework is configured.

## Environment Variables

Required in `.env` with `VITE_` prefix (exposes to client via Vite):

```
VITE_SUPABASE_URL=<supabase-project-url>
VITE_SUPABASE_KEY=<supabase-anon-key>
```

## Architecture

**Single-page app with two routes** (React Router DOM):
- `/` — MapPage: interactive Leaflet map with markers, search (Nominatim geocoding), sidebar of nearest places, login/upload modals
- `/place/:id` — PlaceDetails: dossier view with investigation logs

**All source lives in `src/`:**
- `App.jsx` — Contains routing setup AND the entire MapPage component (map, sidebar, login modal, upload modal, search). This is the largest file.
- `PlaceDetails.jsx` — Detail/dossier page with investigation log submission
- `supabase.js` — Supabase client initialization
- `App.css` / `PlaceDetails.css` / `index.css` — Styles with CSS custom properties for theming

**No separate components directory** — the app is structured as two main page-level files rather than decomposed into small components.

## Supabase Data Model

**`haunted_places` table:** id, name, type (enum: haunted_location/apparition/cryptid/yokai/poltergeist/evp/anomaly/ufo/cursed_object/ritual/urban_legend), summary, details, address, latitude, longitude, level (1-5 threat), image_url, status, country_code, created_at, occurred_at

**`investigation_logs` table:** id, place_id (FK), agent_name, content, image_url, created_at

**Storage bucket:** `evidence-files` — paths: `places/{filename}` for place images, `{place_id}/{filename}` for log images

## Key Patterns

- **No TypeScript** — pure JavaScript/JSX throughout
- **Functional components** with hooks (useState, useEffect, useRef)
- **Direct Supabase calls** from the frontend — no API layer or server functions
- **Map state persistence** via sessionStorage (center coordinates, zoom level)
- **Marker colors** defined by place type (11 categories, each with color + emoji)
- **Haversine formula** used for distance calculations in sidebar sorting
- **ESLint flat config** (v9+) — `no-unused-vars` ignores names starting with uppercase or underscore
- **Deployed on Vercel** — `vercel.json` rewrites all routes to `index.html` for SPA routing

## Utility Script

`fix_address.js` — standalone Node script for batch reverse-geocoding haunted_places records via Nominatim. Uses a Supabase service key (not the anon key). Run manually for data migration, not part of the build.
