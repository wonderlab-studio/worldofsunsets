# World of Sunsets

A map where people share sunset photos. Uploads go through moderation before
they appear on the public map.

## Stack

- Next.js (App Router, TypeScript) — single service for frontend + API routes
- Leaflet + OpenStreetMap tiles, marker clustering via `react-leaflet-cluster`
- SQLite (via Prisma) for data, local filesystem for photo storage
- Reverse geocoding via the public Nominatim API

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000. `.env` is already set up for local dev (SQLite
file at `data/db.sqlite`, photos under `data/uploads/`, both gitignored).

Change `ADMIN_PASSWORD` in `.env` before relying on `/preadmin` for anything
real — it defaults to `changeme`.

### Moderation

Visit http://localhost:3000/preadmin, enter `ADMIN_PASSWORD`. Pending
uploads show there with Allow/Decline actions. Declining deletes the photo
files and database row; approving makes it visible on the public map.

## Deploying to Railway

1. Create a Railway project and connect this git repository.
2. Add a **Volume**, mounted at `/data`. This holds both the SQLite database
   file and uploaded photos, so the service must stay at a single instance
   (no horizontal scaling) — consistent with what a Volume itself already
   requires.
3. Set environment variables on the service:
   - `DATABASE_URL=file:/data/db.sqlite`
   - `UPLOAD_DIR=/data/uploads`
   - `ADMIN_PASSWORD=<a real password>`
   - `SESSION_SECRET=<a long random string>`
   - `NOMINATIM_USER_AGENT=WorldOfSunsets/1.0 (you@example.com)` (per
     [Nominatim's usage policy](https://operations.osmfoundation.org/policies/nominatim/),
     use a real contact)
4. `git push` — Railway builds with `npm run build` and starts with
   `npm run start`, which runs `prisma migrate deploy` before `next start`
   (migrations only touch the Volume at runtime, not at build time).

## Notes / known limits

- Single-instance only, because both SQLite and the photo storage live on one
  Volume. Fine for a prototype; revisit (Postgres + object storage) if this
  needs to scale beyond one instance.
- Reverse geocoding uses the public Nominatim endpoint (one request per
  upload, cached on the record) — within its usage policy for this volume,
  but you'd want a self-hosted Nominatim instance at real scale.
