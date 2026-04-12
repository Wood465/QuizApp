# Smart Quiz App

Smart Quiz app (React + Vite) z Neon PostgreSQL auth backendom.

## Hitri zagon

1. Namesti odvisnosti:

```bash
npm install
```

2. Nastavi frontend env (`.env.local`):

```env
VITE_API_URL=http://localhost:4000
VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

3. Nastavi backend env (`server/.env`):

```env
PORT=4000
DATABASE_URL=postgresql://USER:PASSWORD@HOST.neon.tech/DBNAME?sslmode=require
JWT_SECRET=very_long_random_secret
ADMIN_EMAIL=admin@example.com
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
CORS_ORIGIN=http://localhost:5173
```

4. Zaženi client + API skupaj:

```bash
npm run dev
```

## Kaj je implementirano

- `register/login` proti Neon PostgreSQL
- JWT avtentikacija
- Google login (ID token verifikacija na backendu)
- profil (posodobitev imena/email/gesla)
- admin users list + delete user endpoint

## Opombe

- Ob prvem zagonu server sam ustvari tabelo `users`.
- Admin pravice dobi uporabnik, katerega email je enak `ADMIN_EMAIL`.
- Èe Google login ne rabiš, pusti `VITE_GOOGLE_CLIENT_ID` in `GOOGLE_CLIENT_ID` prazno.
