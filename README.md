# Micah & Emily — Wedding Website

A full wedding site (Knot-style): **Home**, **About Us**, **Photos**, **Wedding Party**, **Registry**, and **RSVP** with a backend for guest responses.

## Stack

- **Next.js** (App Router)
- **Prisma + SQLite** (local dev; use Postgres in production — see below)
- **JSON files** for site copy and registry items (`src/data/site.json`, `src/data/items.json`)

## Quick start

```powershell
cd "d:\coding_project&apps\wedding_registry"
npm install
```

Create `.env` from the example:

```powershell
Copy-Item .env.example .env
```

Edit `.env` and set a strong `ADMIN_PASSWORD` (8+ characters).

Initialize the database:

```powershell
npm run db:push
npm run dev
```

`npm run dev` opens **http://localhost:3000** in your default system browser (Chrome, Edge, etc.) — not the VS Code/Cursor preview.

You can also use **Run and Debug** → **Next.js: dev (opens browser)** in the sidebar.

## Pages

| Path | Description |
|------|-------------|
| `/` | Home — date, venue, quick links |
| `/about` | Your story (`data/site.json`) |
| `/photos` | Photo gallery |
| `/wedding-party` | Wedding party bios |
| `/registry` | Gift registry with “mark purchased” (per browser) |
| `/rsvp` | Guest RSVP form |
| `/admin/rsvps` | View RSVPs (password protected) |
| `/admin/contacts` | Guest contact list + JSON import |
| `/admin/email` | Send bulk or single emails |
| `/admin/email-log` | Email send history |

## Customize content

### Site copy, photos, wedding party

Edit [`src/data/site.json`](src/data/site.json):

- `coupleNames`, `weddingDateDisplay`, `venue`
- `home`, `about.sections`
- `weddingParty` — add names, roles, bios, image paths
- `photos` — add `src`, `alt`, `caption`

Put images in:

- `public/images/photos/` — gallery
- `public/images/wedding-party/` — party members
- `public/images/` — registry product photos

### Registry gifts

Edit [`src/data/items.json`](src/data/items.json). See [`item_template.txt`](item_template.txt).

## Admin — view RSVPs

1. Set `ADMIN_PASSWORD` in `.env`
2. Visit `/admin/rsvps`
3. Sign in and review responses (counts + table)

## Email

The site can send RSVP confirmations, couple notifications, and bulk save-the-date / invitation / reminder emails via [Resend](https://resend.com).

**Full setup guide (domain purchase, DNS, Resend, env vars):** [`docs/EMAIL_SETUP.md`](docs/EMAIL_SETUP.md)

Quick env vars (see [`.env.example`](.env.example)):

- `RESEND_API_KEY`
- `EMAIL_FROM` — e.g. `Micah & Emily <hello@yourdomain.com>`
- `COUPLE_NOTIFICATION_EMAIL` — comma-separated
- `SITE_URL`

Guest list: edit [`src/data/guest-list.json`](src/data/guest-list.json), then **Admin → Contacts → Import from JSON**. Email templates: [`src/data/email-templates.json`](src/data/email-templates.json).

## Deploy (Vercel recommended)

1. Push to GitHub and import in [Vercel](https://vercel.com)
2. Add environment variables:
   - `DATABASE_URL` — Postgres connection string (e.g. [Neon](https://neon.tech) or Vercel Postgres)
   - `ADMIN_PASSWORD` — your admin password
   - `RESEND_API_KEY`, `EMAIL_FROM`, `COUPLE_NOTIFICATION_EMAIL`, `SITE_URL` — see [`docs/EMAIL_SETUP.md`](docs/EMAIL_SETUP.md)
3. Change `prisma/schema.prisma` datasource to `postgresql` for production, or use SQLite only for very small single-instance deploys
4. Run migrations on deploy: `npx prisma db push` (or `prisma migrate deploy`)

Build command: `npm run build`  
Output: Next.js default

## Registry “purchased” marks

Still stored in each guest’s **browser localStorage** (not the database). Good for casual use; upgrade later if you need shared claiming.

## Legacy static site

The original single-page registry is in [`legacy/`](legacy/) for reference.
