# Smart Quiz App (React + Vite)

Aplikacija uporablja React (Vite) frontend in Express API backend z Neon PostgreSQL.

## Zagon

1. Namesti odvisnosti:

```bash
npm install
```

2. Frontend env (`.env.local`):

```env
VITE_API_URL=http://localhost:4000
VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

3. Backend env (`server/.env`):

```env
PORT=4000
DATABASE_URL=postgresql://USER:PASSWORD@HOST.neon.tech/DBNAME?channel_binding=require&sslmode=require
JWT_SECRET=very_long_random_secret
ADMIN_EMAIL=admin@example.com
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:4000/api/auth/google/callback
CORS_ORIGIN=http://localhost:5173
```

4. Zaženi frontend + backend:

```bash
npm run dev
```

## Google OAuth nastavitev

- Authorized JavaScript origins: `http://localhost:5173`
- Authorized redirect URIs: `http://localhost:4000/api/auth/google/callback`

## API endpointi

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/google/start`
- `GET /api/auth/google/callback`
- `GET /api/auth/me`
- `PUT /api/auth/profile`
- `GET /api/users` (admin)
- `DELETE /api/users/:id` (admin)
