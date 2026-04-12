# Smart Quiz App (Next.js)

Aplikacija je migrirana na Next.js (App Router) in uporablja Neon PostgreSQL bazo prek Next API route endpointov.

## Zagon

1. Namesti odvisnosti:

```bash
npm install
```

2. Nastavi `.env.local` v root projekta:

```env
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com

DATABASE_URL=postgresql://USER:PASSWORD@HOST.neon.tech/DBNAME?channel_binding=require&sslmode=require
JWT_SECRET=very_long_random_secret
ADMIN_EMAIL=admin@example.com
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

Opomba: `NEXT_PUBLIC_API_URL` pusti prazno za isti origin (priporočeno v Next). Če rabiš ločen API host, nastavi cel URL.

3. Zaženi development:

```bash
npm run dev
```

4. Production build:

```bash
npm run build
npm run start
```

## Google OAuth nastavitev

- `Authorized JavaScript origins`: `http://localhost:3000`
- `Authorized redirect URIs`: `http://localhost:3000/api/auth/google/callback`

## API endpointi

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/google/start`
- `GET /api/auth/google/callback`
- `GET /api/auth/me`
- `PUT /api/auth/profile`
- `GET /api/users` (admin)
- `DELETE /api/users/:id` (admin)

## Opombe

- Tabela `users` se ustvari samodejno ob prvem requestu.
- Uporabnik z emailom enakim `ADMIN_EMAIL` dobi vlogo `admin`.
