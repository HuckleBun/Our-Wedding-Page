# Email setup guide

This guide walks you through buying a domain, connecting it to your wedding site, and configuring [Resend](https://resend.com) so the site can send:

- RSVP confirmation emails to guests
- RSVP notifications to you
- Save-the-date, invitation, and reminder emails (bulk send from admin)

---

## Part 1 — Buy a domain

You do not need a domain yet to develop locally, but you **do** need one before sending email to real guests from a custom address like `hello@yourdomain.com`.

### 1. Pick a registrar

Recommended registrars (good pricing, straightforward DNS):

- [Cloudflare Registrar](https://www.cloudflare.com/products/registrar/)
- [Porkbun](https://porkbun.com)
- [Namecheap](https://www.namecheap.com)

### 2. Search and purchase

Examples:

- `micahandemily.com`
- `micahandemily.wedding`

Tips:

- `.com` is the most familiar to guests
- Enable **WHOIS privacy** if it is free
- Save your registrar login — you will need DNS access

### 3. What you are buying

You are buying the **right to use a domain name** and control its **DNS records** (where the website and email authentication live). You are not buying email hosting itself — Resend handles sending.

---

## Part 2 — Connect the domain to your wedding site (Vercel)

Your site is deployed on [Vercel](https://vercel.com). The domain should point visitors to Vercel.

### 1. Deploy the site

Follow the main [README](../README.md) deploy section: push to GitHub, import the repo in Vercel.

### 2. Add the domain in Vercel

1. Open your Vercel project
2. Go to **Settings → Domains**
3. Add `yourdomain.com`
4. Add `www.yourdomain.com` (optional but recommended)

Vercel shows DNS records to create, typically:

- **A record** for `@` (root domain) → Vercel IP
- **CNAME** for `www` → `cname.vercel-dns.com`

### 3. Add DNS records at your registrar

1. Log in to your domain registrar
2. Open **DNS** or **DNS Management**
3. Add the records Vercel provided
4. Save and wait for propagation (often 5–30 minutes, sometimes up to 48 hours)

Vercel will show **Valid Configuration** when it works.

### 4. Set production site URL

In Vercel → **Settings → Environment Variables**, set:

```
SITE_URL=https://yourdomain.com
```

Use the same value in local `.env` when testing production-like links.

---

## Part 3 — Set up Resend for sending email

### 1. Create a Resend account

Sign up at [resend.com](https://resend.com).

### 2. Add your domain in Resend

1. Resend dashboard → **Domains → Add Domain**
2. Enter `yourdomain.com` (without `www`)

Resend shows DNS records to add. You will typically add:

| Type | Purpose |
|------|---------|
| TXT (DKIM) | Proves emails are authorized by your domain (often 3 records) |
| TXT (SPF) | Lists which servers may send mail for your domain |
| TXT (DMARC) | Recommended policy record (`_dmarc.yourdomain.com`) |

### 3. Add records at your registrar

1. Go back to your registrar DNS panel
2. Add **every** record Resend shows exactly as written
3. Do not delete Vercel’s website records — email and website DNS records coexist

### 4. Verify the domain

Click **Verify** in Resend. Status should become **Verified** once DNS propagates.

Check propagation globally: [dnschecker.org](https://dnschecker.org)

### 5. Create an API key

1. Resend → **API Keys → Create API Key**
2. Copy the key (shown once)
3. Store it in:
   - Local `.env` as `RESEND_API_KEY`
   - Vercel environment variables for production

### 6. Set email environment variables

Copy [`.env.example`](../.env.example) to `.env` and fill in:

```env
RESEND_API_KEY="re_xxxxxxxx"
EMAIL_FROM="Micah & Emily <hello@yourdomain.com>"
COUPLE_NOTIFICATION_EMAIL="you@example.com,partner@example.com"
SITE_URL="http://localhost:3000"
```

Notes:

- `EMAIL_FROM` must use your **verified** domain
- `COUPLE_NOTIFICATION_EMAIL` can be comma-separated
- Until your domain is verified, Resend may only deliver to addresses on your Resend account (fine for testing)

---

## Part 4 — Local development

```powershell
cd "d:\coding_project&apps\wedding_registry"
Copy-Item .env.example .env
# Edit .env with your values
npm install
npm run db:push
npm run dev
```

### Test the flow

1. Submit a test RSVP at `/rsvp`
2. Check **Admin → Email log** at `/admin/email-log`
3. Check the Resend dashboard → **Emails**
4. Import contacts from [`src/data/guest-list.json`](../src/data/guest-list.json) via **Admin → Contacts → Import from JSON**
5. Send a test bulk email from **Admin → Send email**

### Edit email copy

Templates live in [`src/data/email-templates.json`](../src/data/email-templates.json).

Supported placeholders:

- `{{firstName}}`, `{{lastName}}`
- `{{coupleNames}}`, `{{weddingDate}}`, `{{venueCity}}`
- `{{siteUrl}}`, `{{rsvpUrl}}`, `{{adminRsvpUrl}}`
- `{{guestEmail}}`, `{{guestCount}}`, `{{guestMessage}}` (notification template)

---

## Part 5 — Admin email features

| Page | URL | Purpose |
|------|-----|---------|
| Contacts | `/admin/contacts` | Manage invitees, import JSON, RSVP status |
| Send email | `/admin/email` | Bulk save-the-date, invitation, reminder |
| Email log | `/admin/email-log` | Sent/failed history |
| RSVPs | `/admin/rsvps` | View responses; email individual guests |

### Guest list workflow (JSON + admin)

1. Add guests to [`src/data/guest-list.json`](../src/data/guest-list.json)
2. **Admin → Contacts → Import from JSON**
3. Existing emails are **updated**; new emails are **created**
4. Manage contacts directly in admin afterward

### Bulk send limits

- Maximum **50 recipients per send** (safety cap)
- For larger lists, send in batches

---

## Part 6 — Production checklist

- [ ] Domain purchased
- [ ] Website DNS points to Vercel (`Valid Configuration`)
- [ ] Resend domain verified (green check)
- [ ] `RESEND_API_KEY`, `EMAIL_FROM`, `COUPLE_NOTIFICATION_EMAIL`, `SITE_URL` set on Vercel
- [ ] `ADMIN_PASSWORD` set on Vercel
- [ ] Test RSVP confirmation received
- [ ] Test couple notification received
- [ ] Import guest list and send one bulk test
- [ ] Review `/admin/email-log`

---

## Part 7 — Troubleshooting

### Emails go to spam

- Confirm DKIM, SPF, and DMARC are verified in Resend
- Use a friendly `EMAIL_FROM` display name
- Ask a few guests to mark the first message as “Not spam”

### “Domain not verified” in Resend

- DNS can take time — wait and re-check with [dnschecker.org](https://dnschecker.org)
- Ensure TXT records match Resend exactly (no extra quotes in DNS values)

### RSVP saves but no email

- Check `/admin/email-log` for errors
- Confirm `RESEND_API_KEY` and `EMAIL_FROM` are set
- Restart the dev server after changing `.env`

### Prisma errors after schema changes

- Run `npm run db:push`
- Restart `npm run dev` (the dev server caches an old Prisma client)

### Bulk send says “Too many recipients”

- Split your list into batches of 50 or fewer

---

## Part 8 — Costs (typical)

| Service | Typical cost |
|---------|----------------|
| Domain | ~$10–15/year (.com) |
| Vercel (hobby) | Free for personal projects |
| Resend | Free tier (~3,000 emails/month) |
| Neon Postgres (optional prod DB) | Free tier available |

For a wedding guest list, the free tiers are usually sufficient.
