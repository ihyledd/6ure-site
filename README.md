# Wiki (Next.js + MySQL)

Dynamic wiki app with:

- Pages (Markdown)
- Categories
- Search
- Accounts (email/password via NextAuth Credentials)
- Comments
- Vercel Analytics

## Local setup

1) Install deps

```bash
npm i
```

2) Database: MySQL (same as requests / phpMyAdmin). Set `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (and optionally `DB_PORT`) in `.env`, or set `DATABASE_URL=mysql://...`. Then create tables:

```bash
npx prisma db push
# or: npx prisma migrate dev
```

3) Create the first admin user

```bash
export ADMIN_EMAIL="admin@example.com"
export ADMIN_PASSWORD="change-me"
export NEXTAUTH_SECRET="replace-with-a-long-random-string"

npm run db:seed
```

4) Run the dev server

```bash
npm run dev
```

Open `http://localhost:3000`.

## Password page (/password)

The password page shows the actual password only when accessed through Linkvertise. Configure your Linkvertise link so its **destination URL** is:

```
https://6ureleaks.com/password?via=linkvertise
```

(Replace with your domain as needed.) Optionally set `NEXT_PUBLIC_PASSWORD_VIA` to a custom value and use that in the URL instead of `linkvertise`.

**View count:** The page tracks unique views (once per user per 24h, via cookie) and stores the count in `SiteSetting` with key `password_view_count`. To migrate an existing count from the old PHP/YML setup, use Prisma Studio or run:

```js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
await prisma.siteSetting.upsert({
  where: { key: "password_view_count" },
  create: { key: "password_view_count", value: "25035" },
  update: { value: "25035" },
});
```

## Deploy

After deploying, if users see "Failed to find Server Action" or form/button actions fail, they should **hard-refresh** (Ctrl+Shift+R or Cmd+Shift+R) to load the new build.

### Vercel

- **Database**: MySQL. Set `DATABASE_URL` or `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` in `.env` (see `.env.example` and `docs/ENV-REFERENCE.md`).
- **Auth**: set `NEXTAUTH_SECRET` and `NEXTAUTH_URL` (or `AUTH_SECRET`). Password-protected wiki pages use this for tamper-proof unlock cookies.
- Deploy the Next.js project as usual
